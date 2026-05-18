import { apiRouter } from "./apiRouter.js";
import { requireAdminMiddleware, logAdminAction } from "./helpers.js";
import { withDb, registerPersistenceAdapter, closePersistenceAdapter, createSqlAdapterStub, getPersistenceAdapterInfo } from "../../lib/dbAdapter.js";
import { createPrismaAdapter } from "../../lib/prismaAdapter.js";

// Export full DB JSON for backup/export
apiRouter.get("/admin/db/export", requireAdminMiddleware, (ctx) => {
  // return full DB state safely
  const copy = JSON.parse(JSON.stringify(ctx.db || {}));
  return copy;
}, {
  summary: "Export full DB JSON (Admin only)",
  tags: ["System"],
  secured: true
});

// Import/replace DB (dangerous, admin-only)
apiRouter.post("/admin/db/import", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  if (!body.db || typeof body.db !== "object") {
    throw new Response(JSON.stringify({ detail: "Missing 'db' object in request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const imported = body.db;
  // Replace top-level keys in memory and persist
  Object.keys(imported).forEach((k) => { ctx.db[k] = imported[k]; });
  await withDb(ctx.db).save();
  logAdminAction(ctx.db, "db.import", "admin", { keys: Object.keys(imported).length });
  return { success: true };
}, {
  summary: "Import full DB JSON (Admin only)",
  tags: ["System"],
  secured: true,
  body: { db: { type: "object" } }
});

// Get persistence adapter status
apiRouter.get("/admin/db/status", requireAdminMiddleware, (ctx) => {
  return getPersistenceAdapterInfo();
}, {
  summary: "Get persistence adapter status",
  tags: ["System"],
  secured: true
});

// Switch persistence adapter at runtime. body: { target: "prisma"|"file" }
apiRouter.post("/admin/db/switch", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const target = (body.target || "file").toLowerCase();

  if (target === "prisma") {
    const adapter = createPrismaAdapter();
    await registerPersistenceAdapter(adapter, ctx.db);
    logAdminAction(ctx.db, "db.switch", "admin", { target: "prisma" });
    return { success: true, target: "prisma" };
  }

  if (target === "file") {
    // Switch back to file-backed persistence
    await closePersistenceAdapter();
    // Immediately flush to disk
    await withDb(ctx.db).save();
    logAdminAction(ctx.db, "db.switch", "admin", { target: "file" });
    return { success: true, target: "file" };
  }

  // unknown target -> try stub
  try {
    const stub = createSqlAdapterStub(target || "prisma");
    await registerPersistenceAdapter(stub, ctx.db);
    logAdminAction(ctx.db, "db.switch", "admin", { target: target, stub: true });
    return { success: true, target, stub: true };
  } catch (err) {
    throw new Response(JSON.stringify({ detail: "Unsupported target adapter" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}, {
  summary: "Switch persistence adapter at runtime (Admin only)",
  tags: ["System"],
  secured: true,
  body: {
    target: { type: "string" },
  }
});
