import { apiRouter } from "./apiRouter.js";
import { requireAuthMiddleware, requireAdminMiddleware, logAdminAction } from "./helpers.js";
import { withDb } from "../../lib/dbAdapter.js";

// ---------------------------------------------------------------------------
// SECURITY CVE ADVISORIES ROUTES (PUBLIC & ADMIN)
// ---------------------------------------------------------------------------
apiRouter.get("/security/cves", (ctx) => {
  return ctx.db.cves || [];
}, {
  summary: "List all exokernel security CVE advisories",
  tags: ["Security"]
});

apiRouter.post("/admin/security/cves", requireAuthMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const { title, description, severity, module: modName, status } = body;
  if (!title || !description || !severity || !modName || !status) {
    throw new Response(JSON.stringify({ detail: "All CVE fields are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const newCve = {
    id: "CVE-2026-" + Math.floor(1000 + Math.random() * 9000),
    title,
    description,
    severity,
    module: modName,
    status,
    published_at: new Date().toISOString()
  };

  const db = withDb(ctx.db);
  await db.insert("cves", newCve);
  logAdminAction(ctx.db, "cve.create", "admin", { id: newCve.id });
  return newCve;
}, {
  summary: "Create a new security advisory record (Staff only)",
  tags: ["Security"],
  secured: true,
  body: {
    title: { type: "string" },
    description: { type: "string" },
    severity: { type: "string" },
    module: { type: "string" },
    status: { type: "string" }
  }
});

apiRouter.put("/admin/security/cves/:id", requireAuthMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const body = ctx.body || {};
  ctx.db.cves = ctx.db.cves || [];
  const cveIndex = ctx.db.cves.findIndex(c => c.id === id);
  if (cveIndex === -1) {
    throw new Response(JSON.stringify({ detail: "CVE not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existing = ctx.db.cves[cveIndex];
  const updated = {
    ...existing,
    title: body.title || existing.title,
    description: body.description || existing.description,
    severity: body.severity || existing.severity,
    module: body.module || existing.module,
    status: body.status || existing.status
  };

  const db = withDb(ctx.db);
  await db.updateAt("cves", cveIndex, updated);
  logAdminAction(ctx.db, "cve.update", "admin", { id });
  return updated;
}, {
  summary: "Update an existing security advisory (Staff only)",
  tags: ["Security"],
  secured: true,
  body: {
    title: { type: "string" },
    description: { type: "string" },
    severity: { type: "string" },
    module: { type: "string" },
    status: { type: "string" }
  }
});

apiRouter.delete("/admin/security/cves/:id", requireAuthMiddleware, async (ctx) => {
  const id = ctx.params.id;
  ctx.db.cves = ctx.db.cves || [];
  const cveIndex = ctx.db.cves.findIndex(c => c.id === id);
  if (cveIndex === -1) {
    throw new Response(JSON.stringify({ detail: "CVE not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const db = withDb(ctx.db);
  await db.removeWhere("cves", (c) => c.id === id);
  logAdminAction(ctx.db, "cve.delete", "admin", { id });
  return { ok: true };
}, {
  summary: "Delete a security advisory record (Staff only)",
  tags: ["Security"],
  secured: true
});

// ---------------------------------------------------------------------------
// SECURITY KEY GPG ROUTES
// ---------------------------------------------------------------------------
apiRouter.get("/security/key", (ctx) => {
  return ctx.db.security_key || { fingerprint: "", public_key: "", notes: "" };
}, {
  summary: "Get current exokernel release GPG signing key details",
  tags: ["Security"]
});

apiRouter.put("/security/key", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  const updated = {
    fingerprint: body.fingerprint || "",
    public_key: body.public_key || "",
    notes: body.notes || "",
    updated_at: new Date().toISOString(),
  };
  ctx.db.security_key = updated;
  const db = withDb(ctx.db);
  await db.save();
  logAdminAction(ctx.db, "security.key", user.email, { fingerprint: (body.fingerprint || "").slice(-16) });
  return { ok: true };
}, {
  summary: "Rotate the exokernel GPG signing key registry (Admin only)",
  tags: ["Security"],
  secured: true,
  body: {
    fingerprint: { type: "string" },
    public_key: { type: "string" },
    notes: { type: "string" }
  }
});
