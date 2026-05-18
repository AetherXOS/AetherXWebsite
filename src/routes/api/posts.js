import { apiRouter } from "./apiRouter.js";
import { requireStaffMiddleware, logAdminAction, slugify } from "./helpers.js";
import { POST_BODY } from "../../lib/requestBodies.js";
import { withDb } from "../../lib/dbAdapter.js";
import { createRequire } from "module";

let crypto = null;
if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  crypto = require("crypto");
}

apiRouter.get("/posts", (ctx) => {
  let items = [...ctx.db.posts];
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const includeUnpublished = ctx.query.include_unpublished === "true";
  if (!includeUnpublished) {
    items = items.filter((p) => p.published);
  }

  const category = ctx.query.category;
  if (category) {
    items = items.filter((p) => p.category === category);
  }

  const tag = ctx.query.tag;
  if (tag) {
    items = items.filter((p) => p.tags && p.tags.includes(tag));
  }

  const q = ctx.query.q;
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.excerpt.toLowerCase().includes(query)
    );
  }

  const page = parseInt(ctx.query.page || "1");
  const pageSize = parseInt(ctx.query.page_size || "9");
  const skip = (page - 1) * pageSize;
  const paginated = items.slice(skip, skip + pageSize);

  const publishedPosts = ctx.db.posts.filter((p) => p.published);
  const categories = [...new Set(publishedPosts.map((p) => p.category).filter(Boolean))];
  const tags = [...new Set(publishedPosts.flatMap((p) => p.tags || []).filter(Boolean))];

  return {
    items: paginated,
    total: items.length,
    page,
    page_size: pageSize,
    categories,
    tags,
  };
}, {
  summary: "List all news articles paginated",
  tags: ["Articles"],
  query: {
    page: "Page index (default 1)",
    page_size: "Articles per page (default 9)",
    category: "Filter by category name",
    tag: "Filter by tags list",
    q: "Fulltext query in titles and excerpts",
    include_unpublished: "Include drafts (admin only)"
  }
});

apiRouter.post("/posts", requireStaffMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  const slugBase = slugify(body.title || "untitled");
  let slug = slugBase;
  let i = 1;
  while (ctx.db.posts.find((p) => p.slug === slug)) {
    i++;
    slug = `${slugBase}-${i}`;
  }

  const newPost = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "post-" + Date.now(),
    slug,
    title: body.title || "Untitled Article",
    excerpt: body.excerpt || "",
    content: body.content || "",
    category: body.category || "General",
    tags: body.tags || [],
    cover_image: body.cover_image || null,
    published: body.published !== false,
    author: user.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("posts", newPost);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "post.create",
      actor: user.email,
      meta: { slug },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });

  return newPost;
}, {
  summary: "Create a new news article (Staff only)",
  tags: ["Articles"],
  secured: true,
  body: POST_BODY
});

apiRouter.get("/posts/:slugOrId", (ctx) => {
  const slugOrId = ctx.params.slugOrId;
  const post = ctx.db.posts.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!post) {
    throw new Response(JSON.stringify({ detail: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return post;
}, {
  summary: "Get specific news article by ID or Slug",
  tags: ["Articles"]
});

apiRouter.put("/posts/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const idx = ctx.db.posts.findIndex((p) => p.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = ctx.body || {};
  const updated = {
    ...ctx.db.posts[idx],
    ...body,
    updated_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("posts", idx, updated);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "post.update",
      actor: ctx.user.email,
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });

  return updated;
}, {
  summary: "Update news article metadata or content (Staff only)",
  tags: ["Articles"],
  secured: true,
  body: POST_BODY
});

apiRouter.delete("/posts/:id", requireStaffMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const exists = ctx.db.posts.some((p) => p.id === id);
  if (!exists) {
    throw new Response(JSON.stringify({ detail: "Post not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.removeWhere("posts", (p) => p.id === id);
    const log = {
      id: crypto ? crypto.randomUUID().substring(0, 8) : "log-" + Date.now(),
      action: "post.delete",
      actor: ctx.user.email,
      meta: { id },
      ts: new Date().toISOString(),
    };
    await trx.insert("admin_logs", log);
  });

  return { ok: true };
}, {
  summary: "Delete news article record (Staff only)",
  tags: ["Articles"],
  secured: true
});
