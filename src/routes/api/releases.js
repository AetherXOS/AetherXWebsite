import { apiRouter } from "./apiRouter.js";
import { requireAdminMiddleware, logAdminAction } from "./helpers.js";
import { DISTRO_BODY, RELEASE_BODY } from "../../lib/requestBodies.js";
import { withDb } from "../../lib/dbAdapter.js";
import { createRequire } from "module";

let fs, path, crypto, UPLOAD_DIR;

if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  fs = require("fs");
  path = require("path");
  crypto = require("crypto");

  UPLOAD_DIR = path.resolve(process.cwd(), "public/uploads");
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (err) {
    UPLOAD_DIR = "/tmp/uploads";
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("Upload dizini oluşturulamadı:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// DISTROS ROUTES
// ---------------------------------------------------------------------------
apiRouter.get("/distros", (ctx) => {
  return ctx.db.distros || [];
}, {
  summary: "List all custom dynamic OS distribution wrappers",
  tags: ["Distributions"]
});

apiRouter.post("/admin/distros", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  const newDistro = {
    id: "distro-" + Date.now(),
    name: body.name || "Untitled Distro",
    status: body.status || "Active",
    status_color: body.status_color || "cyan",
    description: body.description || "",
    doc_url: body.doc_url || "/docs",
    command: body.command || "cargo xtask distro-iso"
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("distros", newDistro);
    const log = { id: "log-" + Date.now(), action: "distro.create", actor: user.email, meta: { name: newDistro.name }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return newDistro;
}, {
  summary: "Publish a custom OS distribution wrapper (Admin only)",
  tags: ["Distributions"],
  secured: true,
  body: DISTRO_BODY
});

apiRouter.put("/admin/distros/:id", requireAdminMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  ctx.db.distros = ctx.db.distros || [];
  const idx = ctx.db.distros.findIndex((d) => d.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Distro not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = ctx.body || {};
  const updated = {
    ...ctx.db.distros[idx],
    ...body,
  };
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("distros", idx, updated);
    const log = { id: "log-" + Date.now(), action: "distro.update", actor: user.email, meta: { id, name: updated.name }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return updated;
}, {
  summary: "Update an OS distribution wrapper metadata (Admin only)",
  tags: ["Distributions"],
  secured: true,
  body: DISTRO_BODY
});

apiRouter.delete("/admin/distros/:id", requireAdminMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  ctx.db.distros = ctx.db.distros || [];
  const idx = ctx.db.distros.findIndex((d) => d.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Distro not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = ctx.db.distros[idx].name;
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.removeWhere("distros", (d) => d.id === id);
    const log = { id: "log-" + Date.now(), action: "distro.delete", actor: user.email, meta: { id, name }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return { ok: true };
}, {
  summary: "Remove an OS distribution wrapper configuration (Admin only)",
  tags: ["Distributions"],
  secured: true
});

// ---------------------------------------------------------------------------
// RELEASES ROUTES
// ---------------------------------------------------------------------------
apiRouter.get("/releases", (ctx) => {
  let items = [...ctx.db.releases];
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const channel = ctx.query.channel;
  if (channel) {
    items = items.filter((r) => r.channel === channel);
  }

  return { items };
}, {
  summary: "List all kernel and alpine ISO releases",
  tags: ["Releases"],
  query: {
    channel: "Filter by channel (e.g. stable, beta)"
  }
});

apiRouter.get("/releases/:id", (ctx) => {
  const id = ctx.params.id;
  const release = ctx.db.releases.find((r) => r.id === id);
  if (!release) {
    throw new Response(JSON.stringify({ detail: "Release not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return release;
}, {
  summary: "Get specific kernel release metadata",
  tags: ["Releases"]
});

apiRouter.put("/releases/:id", requireAdminMiddleware, async (ctx) => {
  const id = ctx.params.id;
  const user = ctx.user;
  const idx = ctx.db.releases.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Release not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = ctx.body || {};
  const updated = {
    ...ctx.db.releases[idx],
    ...body,
  };
  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("releases", idx, updated);
    const log = { id: "log-" + Date.now(), action: "release.update", actor: user.email, meta: { id, version: updated.version }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return updated;
}, {
  summary: "Update release details (Admin only)",
  tags: ["Releases"],
  secured: true,
  body: RELEASE_BODY
});

apiRouter.post("/releases", requireAdminMiddleware, async (ctx) => {
  const body = ctx.body || {};
  const user = ctx.user;

  const newRelease = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "rel-" + Date.now(),
    version: body.version || "0.8.0",
    channel: body.channel || "stable",
    title: body.title || "Untitled Release",
    notes: body.notes || "",
    file_url: body.file_url || null,
    file_name: body.file_name || null,
    file_size: body.file_size || null,
    sha256: body.sha256 || null,
    arch: body.arch || "x86_64",
    min_ram_gb: body.min_ram_gb || 2,
    min_disk_gb: body.min_disk_gb || 4,
    storage_kind: body.storage_kind || "external",
    downloads: 0,
    signature_url: body.signature_url || null,
    signing_key_fingerprint: body.signing_key_fingerprint || null,
    created_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("releases", newRelease);
    const log = { id: "log-" + Date.now(), action: "release.create", actor: user.email, meta: { version: body.version, channel: body.channel }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return newRelease;
}, {
  summary: "Publish a standard release record (Admin only)",
  tags: ["Releases"],
  secured: true,
  body: RELEASE_BODY
});

apiRouter.post("/releases/upload", requireAdminMiddleware, async (ctx) => {
  const user = ctx.user;
  const formData = await ctx.request.formData();

  const version = formData.get("version") || "0.8.0";
  const channel = formData.get("channel") || "beta";
  const title = formData.get("title") || "Autobuild Release";
  const notes = formData.get("notes") || "";
  const arch = formData.get("arch") || "x86_64";
  const min_ram_gb = parseInt(formData.get("min_ram_gb") || "2");
  const min_disk_gb = parseInt(formData.get("min_disk_gb") || "4");

  const file = formData.get("file");
  let file_name = "aetherxos_build.iso";
  let file_size = 0;
  let sha256 = "";
  let file_url = null;

  if (file && typeof file.arrayBuffer === "function") {
    file_name = file.name;
    file_size = file.size;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = path.join(UPLOAD_DIR, file_name);
    fs.writeFileSync(filePath, buffer);

    sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    file_url = `/uploads/${file_name}`;
  }

  const newRelease = {
    id: crypto ? crypto.randomUUID().substring(0, 8) : "rel-" + Date.now(),
    version,
    channel,
    title,
    notes,
    file_url,
    file_name,
    file_size,
    sha256,
    arch,
    min_ram_gb,
    min_disk_gb,
    storage_kind: "local",
    downloads: 0,
    created_at: new Date().toISOString(),
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.insert("releases", newRelease);
    const log = { id: "log-" + Date.now(), action: "release.upload", actor: user.email, meta: { version, size: file_size }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return newRelease;
}, {
  summary: "Upload and flash a local ISO binary to the release portal (Admin only)",
  tags: ["Releases"],
  secured: true
});

apiRouter.post("/releases/:id/signature", requireAdminMiddleware, async (ctx) => {
  const user = ctx.user;
  const id = ctx.params.id;

  const idx = ctx.db.releases.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Response(JSON.stringify({ detail: "Release not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await ctx.request.formData();
  const file = formData.get("file");

  let file_name = "signature.asc";
  let file_size = 0;
  let content = `-----BEGIN PGP SIGNATURE-----\nSigned locally via exokernel portals.\n-----END PGP SIGNATURE-----`;

  if (file && typeof file.arrayBuffer === "function") {
    file_name = file.name;
    file_size = file.size;

    const buffer = Buffer.from(await file.arrayBuffer());
    content = buffer.toString("utf8");

    const filePath = path.join(UPLOAD_DIR, file_name);
    fs.writeFileSync(filePath, buffer);
  }

  const updated = {
    ...ctx.db.releases[idx],
    signature_file_name: file_name,
    signature_file_size: file_size,
    signature_content: content,
    signature_url: `/uploads/${file_name}`,
    signing_key_fingerprint: ctx.db.security_key?.fingerprint || "8F8A 2B5D E9C6 7A14 3D02 9F5C E6B3 1A8D D5E4 9C20",
  };

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.updateAt("releases", idx, updated);
    const log = { id: "log-" + Date.now(), action: "release.signature", actor: user.email, meta: { id, size: file_size }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return { ok: true, name: file_name, size: file_size };
}, {
  summary: "Bind a PGP detached GPG signature to an active release ISO (Admin only)",
  tags: ["Releases"],
  secured: true
});

apiRouter.delete("/releases/:id", requireAdminMiddleware, async (ctx) => {
  const user = ctx.user;
  const id = ctx.params.id;

  const release = ctx.db.releases.find((r) => r.id === id);
  if (!release) {
    throw new Response(JSON.stringify({ detail: "Release not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (release.file_name) {
    try {
      const filePath = path.join(UPLOAD_DIR, release.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) { }
  }
  if (release.signature_file_name) {
    try {
      const signaturePath = path.join(UPLOAD_DIR, release.signature_file_name);
      if (fs.existsSync(signaturePath)) fs.unlinkSync(signaturePath);
    } catch (_) { }
  }

  await withDb(ctx.db).transaction(async (trx) => {
    await trx.removeWhere("releases", (r) => r.id === id);
    const log = { id: "log-" + Date.now(), action: "release.delete", actor: user.email, meta: { id }, ts: new Date().toISOString() };
    await trx.insert("admin_logs", log);
  });
  return { ok: true };
}, {
  summary: "Delete release ISO and files from workspace disk (Admin only)",
  tags: ["Releases"],
  secured: true
});
