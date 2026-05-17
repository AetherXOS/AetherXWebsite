import { apiRouter } from "./apiRouter.js";
import { requireStaffMiddleware, logAdminAction } from "./helpers.js";
import { DOC_BODY, CHANGELOG_BODY } from "../../lib/requestBodies.js";
import { withDb } from "../../lib/dbAdapter.js";
import { createRequire } from "module";

let crypto = null;
if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  crypto = require("crypto");
}

// ---------------------------------------------------------------------------
// CHANGELOGS ROUTES
// ---------------------------------------------------------------------------
apiRouter.get("/changelogs", (ctx) => {
  const items = [...ctx.db.changelogs];
  items.sort((a, b) => new Date(b.released_at || b.created_at) - new Date(a.released_at || a.created_at));
  return { items };
}, {
  summary: "List all kernel changelog version tags",
  tags: ["Changelog"]
});

apiRouter.post("/changelogs", requireStaffMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  const newChangelog = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "chg-" + Date.now(),
    version: body.version || "0.8.0",
    title: body.title || "Untitled Changelog",
    content: body.content || "",
    type: body.type || "feature",
    released_at: body.released_at || new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("changelogs", newChangelog);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "changelog.create",
      actor: user.email,
      meta: { version: body.version },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return newChangelog;
}, {
  summary: "Publish a new changelog release notes entry (Staff only)",
  tags: ["Changelog"],
  secured: true,
  body: CHANGELOG_BODY
});

apiRouter.put("/changelogs/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  const idx = ctx.db.changelogs.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Changelog not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = ctx.body || {};
  const updated = {
    ...ctx.db.changelogs[idx],
    ...body,
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("changelogs", idx, updated);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "changelog.update",
      actor: user.email,
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return updated;
}, {
  summary: "Update an existing changelog entry (Staff only)",
  tags: ["Changelog"],
  secured: true,
  body: {
    title: { type: "string" },
    content: { type: "string" },
    type: { type: "string" }
  }
});

apiRouter.delete("/changelogs/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  const filtered = ctx.db.changelogs.filter((c) => c.id !== id);
  if (filtered.length === ctx.db.changelogs.length) {
    throw new Response(JSON.stringify({ detail: "Changelog not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  await withDb(ctx.db).transaction(async (trx) => {
    // replace collection
    trx.save = () => Promise.resolve();
    trx.removeWhere("changelogs", (c) => c.id === id);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "changelog.delete",
      actor: user.email,
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return { ok: true };
}, {
  summary: "Delete a changelog entry (Staff only)",
  tags: ["Changelog"],
  secured: true
});

// ---------------------------------------------------------------------------
// DOCS ROUTES
// ---------------------------------------------------------------------------
apiRouter.get("/docs", (ctx) => {
  let items = [...ctx.db.docs];
  const includeUnpublished = ctx.query.include_unpublished === "true";

  if (!includeUnpublished) {
    items = items.filter((d) => d.published);
  }

  items.sort((a, b) => {
    const secComp = (a.section || "").localeCompare(b.section || "");
    if (secComp !== 0) return secComp;
    return (a.order || 0) - (b.order || 0);
  });

  return { items };
}, {
  summary: "List all exokernel architectural documentation articles",
  tags: ["Documentation"],
  query: {
    include_unpublished: "Include drafts (admin only)"
  }
});

apiRouter.post("/docs", requireStaffMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  if (ctx.db.docs.find((d) => d.slug === body.slug)) {
    throw new Response(JSON.stringify({ detail: "Slug already exists" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const newDoc = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "doc-" + Date.now(),
    slug: body.slug,
    title: body.title || "Untitled Document",
    section: body.section || "Introduction",
    order: parseInt(body.order || "0"),
    body: body.body || "",
    published: body.published !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("docs", newDoc);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "doc.create",
      actor: user.email,
      meta: { slug: body.slug },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return newDoc;
}, {
  summary: "Create a new documentation article (Staff only)",
  tags: ["Documentation"],
  secured: true,
  body: DOC_BODY
});

apiRouter.get("/docs/:slug", (ctx) => {
  const slug = ctx.params.slug;
  const doc = ctx.db.docs.find((d) => d.slug === slug);
  if (!doc) {
    throw new Response(JSON.stringify({ detail: "Doc not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    ...doc,
    html: doc.body,
  };
}, {
  summary: "Get specific documentation article by slug",
  tags: ["Documentation"]
});

apiRouter.put("/docs/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  const idx = ctx.db.docs.findIndex((d) => d.id === id || d.slug === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Doc not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = ctx.body || {};
  if (body.slug && body.slug !== ctx.db.docs[idx].slug) {
    const clash = ctx.db.docs.find((d) => d.slug === body.slug && d.id !== ctx.db.docs[idx].id);
    if (clash) {
      throw new Response(JSON.stringify({ detail: "Slug already used" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const updated = {
    ...ctx.db.docs[idx],
    ...body,
    updated_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("docs", idx, updated);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "doc.update",
      actor: user.email,
      meta: { id: ctx.db.docs[idx].id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return updated;
}, {
  summary: "Update documentation article content or settings (Staff only)",
  tags: ["Documentation"],
  secured: true,
  body: DOC_BODY
});

apiRouter.delete("/docs/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  const doc = ctx.db.docs.find((d) => d.id === id || d.slug === id);
  if (!doc) {
    throw new Response(JSON.stringify({ detail: "Doc not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.removeWhere("docs", (d) => d.id === doc.id);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "doc.delete",
      actor: user.email,
      meta: { id: doc.id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });
  return { ok: true };
}, {
  summary: "Delete a documentation article (Staff only)",
  tags: ["Documentation"],
  secured: true
});
