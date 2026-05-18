import { apiRouter } from "./apiRouter.js";
import { requireAdminMiddleware, logAdminAction } from "./helpers.js";
import { withDb } from "../../lib/dbAdapter.js";

apiRouter.get("/announcements", (ctx) => {
  const activeAnn = (ctx.db.announcements || []).filter(a => a.active);
  return activeAnn;
}, {
  summary: "Get only active alert announcements",
  tags: ["Announcements"]
});

apiRouter.get("/admin/announcements", requireAdminMiddleware, (ctx) => {
  return ctx.db.announcements || [];
}, {
  summary: "List all alert announcements and drafts (Admin only)",
  tags: ["Announcements"],
  secured: true
});

apiRouter.post("/admin/announcements", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const newAnn = {
    id: "ann-" + Date.now(),
    title: body.title || "Untitled Announcement",
    content: body.content || "",
    type: body.type || "banner",
    active: body.active !== false,
    dismissible: body.dismissible !== false,
    created_at: new Date().toISOString(),
  };
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("announcements", newAnn);
    const log = {
      id: "log-" + Date.now(),
      action: "announcements.create",
      actor: "admin",
      meta: { id: newAnn.id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return newAnn;
}, {
  summary: "Publish a new alert announcement (Admin only)",
  tags: ["Announcements"],
  secured: true,
  body: {
    title: { type: "string" },
    content: { type: "string" },
    type: { type: "string" },
    active: { type: "boolean" },
    dismissible: { type: "boolean" }
  }
});

apiRouter.put("/admin/announcements/:id", requireAdminMiddleware, async (ctx) => {
  const id = ctx.params.id;
  ctx.db.announcements = ctx.db.announcements || [];
  const index = ctx.db.announcements.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Response(JSON.stringify({ detail: "Announcement not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const body = ctx.body || {};
  const updated = {
    ...ctx.db.announcements[index],
    title: body.title || ctx.db.announcements[index].title,
    content: body.content || ctx.db.announcements[index].content,
    type: body.type || ctx.db.announcements[index].type,
    active: body.active !== undefined ? body.active : ctx.db.announcements[index].active,
    dismissible: body.dismissible !== undefined ? body.dismissible : ctx.db.announcements[index].dismissible,
  };
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("announcements", index, updated);
    const log = {
      id: "log-" + Date.now(),
      action: "announcements.update",
      actor: "admin",
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return updated;
}, {
  summary: "Update an existing alert announcement (Admin only)",
  tags: ["Announcements"],
  secured: true,
  body: {
    title: { type: "string" },
    content: { type: "string" },
    type: { type: "string" },
    active: { type: "boolean" },
    dismissible: { type: "boolean" }
  }
});

apiRouter.delete("/admin/announcements/:id", requireAdminMiddleware, async (ctx) => {
  const id = ctx.params.id;
  ctx.db.announcements = ctx.db.announcements || [];
  const index = ctx.db.announcements.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Response(JSON.stringify({ detail: "Announcement not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.removeWhere("announcements", (a) => a.id === id);
    const log = {
      id: "log-" + Date.now(),
      action: "announcements.delete",
      actor: "admin",
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return { ok: true };
}, {
  summary: "Delete an alert announcement (Admin only)",
  tags: ["Announcements"],
  secured: true
});
