import { getDb, flushPendingWrites } from "../../lib/serverDb.js";
import { apiRouter } from "./apiRouter.js";

import { registerPersistenceAdapter, createSqlAdapterStub, closePersistenceAdapter } from "../../lib/dbAdapter.js";
import { createPrismaAdapter } from "../../lib/prismaAdapter.js";

const initialDb = getDb();

// Try to register a real Prisma adapter if available; otherwise fallback to file-backed stub.
try {
  const adapter = createPrismaAdapter();
  await registerPersistenceAdapter(adapter, initialDb);
} catch (err) {
  console.warn("Failed to register Prisma adapter, falling back to stub:", err);
  try {
    await registerPersistenceAdapter(createSqlAdapterStub("prisma"), initialDb);
  } catch (err2) {
    console.warn("Failed to register persistence adapter stub:", err2);
  }
}

// Simple in-memory rate limiter and active request guard to improve robustness under bursty traffic
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // per IP
const ipWindows = new Map(); // ip -> {count, windowStart}
let activeRequests = 0;
const MAX_ACTIVE_REQUESTS = 250; // throttle concurrent handlers

// Import all sub-router modules to boot their declarative route registrations
import "./auth.js";
import "./posts.js";
import "./releases.js";
import "./swagger.js";
import "./docs.js";
import "./security.js";
import "./analytics.js";
import "./chats.js";
import "./announcements.js";
import "./system.js";
import "./admin_db.js";

export async function action({ request, params }) {
  return handleApiRequest(request, params);
}

export async function loader({ request, params }) {
  return handleApiRequest(request, params);
}

async function handleApiRequest(request, params) {
  const db = getDb();
  db.announcements = db.announcements || [];
  db.chats = db.chats || [];
  db.cves = db.cves || [];
  const url = new URL(request.url);
  const pathPart = params["*"];
  const method = request.method;
  // basic active request throttle
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    return Response.json({ detail: "Server busy, try again" }, { status: 503 });
  }

  // derive client ip from headers if present; fall back to unknown-local
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const win = ipWindows.get(ip) || { count: 0, windowStart: now };
  if (now - win.windowStart > RATE_WINDOW_MS) {
    win.count = 0;
    win.windowStart = now;
  }
  win.count++;
  ipWindows.set(ip, win);
  if (win.count > MAX_REQUESTS_PER_WINDOW) {
    return Response.json({ detail: "Rate limit exceeded" }, { status: 429 });
  }

  activeRequests++;
  try {
    const res = await apiRouter.handleRequest(request, pathPart, method, db, url);
    if (res) return res;

    return Response.json({ detail: "Endpoint not found" }, { status: 404 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("API Server Error:", err);
    return Response.json({ detail: "Internal Server Error", error: err.message }, { status: 500 });
  } finally {
    activeRequests--;
  }
}

// flush pending writes on graceful shutdown hooks if available
if (typeof process !== "undefined" && process && typeof process.on === "function") {
  process.on("beforeExit", () => {
    flushPendingWrites().catch(() => {});
  });
  process.on("SIGINT", () => {
    flushPendingWrites().then(() => closePersistenceAdapter().then(() => process.exit(0))).catch(() => process.exit(1));
  });
}
