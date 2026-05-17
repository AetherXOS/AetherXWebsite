import { createRequire } from "module";
import { withDb } from "../../lib/dbAdapter.js";

let crypto = null;
if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  crypto = require("crypto");
}

export function getAuthenticatedUser(request, db) {
  let token = null;

  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => c.trim().split("="))
  );
  if (cookies.access_token) {
    token = cookies.access_token;
  }

  if (!token) {
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  let customToken = request.headers.get("X-Admin-Token");
  if (!customToken && token && token.startsWith("aether_tok_")) {
    customToken = token;
  }

  if (customToken && db.admin_tokens) {
    const foundToken = db.admin_tokens.find((t) => t.token === customToken);
    if (foundToken) {
      const adminUser = db.users.find((u) => u.role === "admin");
      if (adminUser) {
        foundToken.last_used_at = new Date().toISOString();
        // persist token last-used timestamp without blocking caller
        try {
          withDb(db).save().catch(() => {});
        } catch (_) {}
        return adminUser;
      }
    }
  }

  if (!token) return null;

  const user = db.users.find((u) => u.id === token || u.email === token);
  return user || null;
}

export function requireAuth(request, db) {
  const user = getAuthenticatedUser(request, db);
  if (!user) {
    throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export function requireStaff(request, db) {
  const user = requireAuth(request, db);
  if (user.role !== "admin" && user.role !== "editor") {
    throw new Response(JSON.stringify({ detail: "Staff access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export function requireAdmin(request, db) {
  const user = requireAuth(request, db);
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ detail: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export function logAdminAction(db, action, actor, meta = {}) {
  db.admin_logs = db.admin_logs || [];
  db.admin_logs.push({
    id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
    action,
    actor,
    meta,
    ts: new Date().toISOString(),
  });
  // persist via adapter if available; do not block caller
  try {
    withDb(db).save().catch(() => {});
  } catch (_) {}
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function authenticateMiddleware(ctx, next) {
  const user = getAuthenticatedUser(ctx.request, ctx.db);
  ctx.user = user || null;
  return next();
}

export async function requireAuthMiddleware(ctx, next) {
  if (!ctx.user) {
    throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return next();
}

export async function requireStaffMiddleware(ctx, next) {
  if (!ctx.user) {
    throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (ctx.user.role !== "admin" && ctx.user.role !== "editor") {
    throw new Response(JSON.stringify({ detail: "Staff access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return next();
}

export async function requireAdminMiddleware(ctx, next) {
  if (!ctx.user) {
    throw new Response(JSON.stringify({ detail: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (ctx.user.role !== "admin") {
    throw new Response(JSON.stringify({ detail: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return next();
}
