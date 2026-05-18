// Bağımsız Netlify Function v2 API - catchall /api/*
import { getDb, flushPendingWrites } from "../src/lib/serverDb.js";
import { apiRouter } from "../src/routes/api/apiRouter.js";

import { registerPersistenceAdapter, createSqlAdapterStub, closePersistenceAdapter } from "../src/lib/dbAdapter.js";
import { createPrismaAdapter } from "../src/lib/prismaAdapter.js";

import path from "path";

// Alt rota tanımlamalarını ayağa kaldırmak için tüm modülleri yüklüyoruz
import "../src/routes/api/auth.js";
import "../src/routes/api/posts.js";
import "../src/routes/api/releases.js";
import "../src/routes/api/swagger.js";
import "../src/routes/api/docs.js";
import "../src/routes/api/security.js";
import "../src/routes/api/analytics.js";
import "../src/routes/api/chats.js";
import "../src/routes/api/announcements.js";
import "../src/routes/api/system.js";
import "../src/routes/api/admin_db.js";

const initialDb = getDb();
let isDbInitialized = false;

async function ensureDbInitialized() {
  if (isDbInitialized) return;
  
  // Convert relative SQLite path to absolute path for serverless compatibility
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith("file:")) {
    const rawPath = dbUrl.replace("file:", "");
    if (!path.isAbsolute(rawPath)) {
      process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), rawPath)}`;
    }
  } else if (!dbUrl) {
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "prisma", "dev.db")}`;
  }

  // Try to register a real Prisma adapter if available; otherwise fallback to file-backed stub.
  try {
    const adapter = createPrismaAdapter();
    await registerPersistenceAdapter(adapter, initialDb);
  } catch (err) {
    console.warn("Failed to register Prisma adapter inside Netlify Function, falling back to stub:", err);
    try {
      await registerPersistenceAdapter(createSqlAdapterStub("prisma"), initialDb);
    } catch (err2) {
      console.warn("Failed to register persistence adapter stub inside Netlify Function:", err2);
    }
  }
  isDbInitialized = true;
}

// In-memory rate limiter ve aktif istek limitleyici
const RATE_WINDOW_MS = 60 * 1000; // 1 dakika
const MAX_REQUESTS_PER_WINDOW = 300; // IP başına
const ipWindows = new Map(); // ip -> {count, windowStart}
let activeRequests = 0;
const MAX_ACTIVE_REQUESTS = 250;

export default async (request, context) => {
  await ensureDbInitialized();
  const db = getDb();
  db.announcements = db.announcements || [];
  db.chats = db.chats || [];
  db.cves = db.cves || [];
  
  const url = new URL(request.url);
  // Netlify Function v2'de "/api/posts" gibi gelen istekten "/api" kısmını temizleyip rotayı eşleştiriyoruz
  const pathPart = url.pathname.replace(/^\/api\/?/, "");
  const method = request.method;

  // Aşırı yük koruması
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    return new Response(JSON.stringify({ detail: "Server busy, try again" }), { 
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  // IP adresi tespiti
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
    return new Response(JSON.stringify({ detail: "Rate limit exceeded" }), { 
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }

  activeRequests++;
  try {
    const res = await apiRouter.handleRequest(request, pathPart, method, db, url);
    if (res) return res;

    return new Response(JSON.stringify({ detail: "Endpoint not found" }), { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Netlify Function API Error:", err);
    return new Response(JSON.stringify({ detail: "Internal Server Error", error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } finally {
    activeRequests--;
  }
};

// Netlify'a tüm "/api/*" isteklerini bu fonksiyona yönlendirmesini söylüyoruz
export const config = {
  path: "/api/*"
};
