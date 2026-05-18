import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { saveDb } from "./serverDb.js";

import { fileURLToPath } from "url";

const adapterFilename = fileURLToPath(import.meta.url);
const adapterDirname = path.dirname(adapterFilename);
const PROJECT_ROOT = path.resolve(adapterDirname, "../../");

const DEFAULT_DATABASE_URL = `file:${path.resolve(PROJECT_ROOT, "prisma", "prisma", "dev.db")}`;
const DEFAULT_SCHEMA = path.resolve(PROJECT_ROOT, "prisma", "schema.prisma");

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  } else if (process.env.DATABASE_URL.startsWith("file:")) {
    const rawPath = process.env.DATABASE_URL.replace("file:", "");
    if (!path.isAbsolute(rawPath)) {
      process.env.DATABASE_URL = `file:${path.resolve(PROJECT_ROOT, rawPath)}`;
    }
  }
  return process.env.DATABASE_URL;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDate(value) {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toNullableDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function serializeJson(value, fallback = "{}") {
  if (value == null) return fallback;
  return JSON.stringify(value);
}

function toInt(value, fallback = 0) {
  const num = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(num) ? fallback : num;
}

function getPrismaBin() {
  const binName = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.resolve(process.cwd(), "node_modules", ".bin", binName);
}

function pushSchema() {
  ensureDatabaseUrl();
  if (!fs.existsSync(DEFAULT_SCHEMA)) {
    throw new Error(`Prisma schema not found at ${DEFAULT_SCHEMA}`);
  }

  const result = spawnSync(
    getPrismaBin(),
    ["db", "push", "--schema", DEFAULT_SCHEMA, "--accept-data-loss", "--skip-generate"],
    {
      stdio: "pipe",
      env: process.env,
      shell: false,
      windowsHide: true,
    }
  );

  if (result.status !== 0) {
    throw new Error(`Prisma db push failed: ${result.stderr?.toString() || result.stdout?.toString() || "unknown error"}`);
  }
}

async function readState(prisma) {
  const [users, posts, docs, changelogs, releases, distros, announcements, chats, cves, analytics, adminLogs, loginAttempts, adminTokens, kv] = await Promise.all([
    prisma.user.findMany(),
    prisma.post.findMany(),
    prisma.doc.findMany(),
    prisma.changelog.findMany(),
    prisma.release.findMany(),
    prisma.distro.findMany(),
    prisma.announcement.findMany(),
    prisma.chat.findMany(),
    prisma.cve.findMany(),
    prisma.analyticsEvent.findMany(),
    prisma.adminLog.findMany(),
    prisma.loginAttempt.findMany(),
    prisma.adminToken.findMany(),
    prisma.keyValue.findMany(),
  ]);

  const keyValues = Object.fromEntries(kv.map((row) => [row.key, row.value]));

  return {
    users: users.map((row) => ({ ...row, created_at: toIso(row.created_at) })),
    posts: posts.map((row) => ({
      ...row,
      tags: parseJson(row.tags, []),
      published: !!row.published,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    })),
    docs: docs.map((row) => ({
      ...row,
      published: !!row.published,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    })),
    changelogs: changelogs.map((row) => ({ ...row, released_at: toIso(row.released_at), created_at: toIso(row.created_at) })),
    releases: releases.map((row) => ({ ...row, created_at: toIso(row.created_at) })),
    distros,
    announcements: announcements.map((row) => ({ ...row, active: !!row.active, dismissible: !!row.dismissible, created_at: toIso(row.created_at) })),
    chats: chats.map((row) => ({ ...row, messages: parseJson(row.messages, []), created_at: toIso(row.created_at), updated_at: toIso(row.updated_at) })),
    cves: cves.map((row) => ({ ...row, published_at: toIso(row.published_at) })),
    analytics: analytics.map((row) => ({ ...row, meta: parseJson(row.meta, {}), ts: toIso(row.ts) })),
    admin_logs: adminLogs.map((row) => ({ ...row, meta: parseJson(row.meta, {}), ts: toIso(row.ts) })),
    login_attempts: loginAttempts.map((row) => ({ ...row, ts: toIso(row.ts) })),
    admin_tokens: adminTokens.map((row) => ({ ...row, created_at: toIso(row.created_at), last_used_at: toIso(row.last_used_at) })),
    security_key: parseJson(keyValues.security_key, null),
    github_stats: parseJson(keyValues.github_stats, null),
    system_metrics: parseJson(keyValues.system_metrics, {}),
    settings: parseJson(keyValues.settings, {}),
    started_at: keyValues.started_at || new Date().toISOString(),
  };
}

async function writeState(prisma, state) {
  const snapshot = state || {};

  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany();
    await tx.post.deleteMany();
    await tx.doc.deleteMany();
    await tx.changelog.deleteMany();
    await tx.release.deleteMany();
    await tx.distro.deleteMany();
    await tx.announcement.deleteMany();
    await tx.chat.deleteMany();
    await tx.cve.deleteMany();
    await tx.analyticsEvent.deleteMany();
    await tx.adminLog.deleteMany();
    await tx.loginAttempt.deleteMany();
    await tx.adminToken.deleteMany();
    await tx.keyValue.deleteMany();

    const users = Array.isArray(snapshot.users) ? snapshot.users : [];
    const posts = Array.isArray(snapshot.posts) ? snapshot.posts : [];
    const docs = Array.isArray(snapshot.docs) ? snapshot.docs : [];
    const changelogs = Array.isArray(snapshot.changelogs) ? snapshot.changelogs : [];
    const releases = Array.isArray(snapshot.releases) ? snapshot.releases : [];
    const distros = Array.isArray(snapshot.distros) ? snapshot.distros : [];
    const announcements = Array.isArray(snapshot.announcements) ? snapshot.announcements : [];
    const chats = Array.isArray(snapshot.chats) ? snapshot.chats : [];
    const cves = Array.isArray(snapshot.cves) ? snapshot.cves : [];
    const analytics = Array.isArray(snapshot.analytics) ? snapshot.analytics : [];
    const adminLogs = Array.isArray(snapshot.admin_logs) ? snapshot.admin_logs : [];
    const loginAttempts = Array.isArray(snapshot.login_attempts) ? snapshot.login_attempts : [];
    const adminTokens = Array.isArray(snapshot.admin_tokens) ? snapshot.admin_tokens : [];

    if (users.length) await tx.user.createMany({ data: users.map((row) => ({
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      role: row.role,
      created_at: toDate(row.created_at),
    })) });

    if (posts.length) await tx.post.createMany({ data: posts.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || "",
      content: row.content || "",
      category: row.category || "General",
      tags: serializeJson(row.tags || [], "[]"),
      cover_image: row.cover_image || null,
      published: row.published !== false,
      author: row.author || "",
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at || row.created_at),
    })) });

    if (docs.length) await tx.doc.createMany({ data: docs.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      section: row.section || "Introduction",
      order: toInt(row.order, 0),
      body: row.body || "",
      published: row.published !== false,
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at || row.created_at),
    })) });

    if (changelogs.length) await tx.changelog.createMany({ data: changelogs.map((row) => ({
      id: row.id,
      version: row.version || "0.0.0",
      title: row.title || "Untitled Changelog",
      content: row.content || "",
      type: row.type || "feature",
      released_at: toDate(row.released_at || row.created_at),
      created_at: toDate(row.created_at || row.released_at),
    })) });

    if (releases.length) await tx.release.createMany({ data: releases.map((row) => ({
      id: row.id,
      version: row.version || "0.0.0",
      channel: row.channel || "stable",
      title: row.title || "Untitled Release",
      notes: row.notes || "",
      file_url: row.file_url || null,
      file_name: row.file_name || null,
      file_size: row.file_size == null ? null : toInt(row.file_size, 0),
      sha256: row.sha256 || null,
      arch: row.arch || "x86_64",
      min_ram_gb: toInt(row.min_ram_gb, 2),
      min_disk_gb: toInt(row.min_disk_gb, 4),
      storage_kind: row.storage_kind || "external",
      downloads: toInt(row.downloads, 0),
      signature_url: row.signature_url || null,
      signing_key_fingerprint: row.signing_key_fingerprint || null,
      created_at: toDate(row.created_at || new Date()),
    })) });

    if (distros.length) await tx.distro.createMany({ data: distros.map((row) => ({
      id: row.id,
      name: row.name || "",
      status: row.status || "Active",
      status_color: row.status_color || "cyan",
      description: row.description || "",
      doc_url: row.doc_url || "/docs",
      command: row.command || "",
    })) });

    if (announcements.length) await tx.announcement.createMany({ data: announcements.map((row) => ({
      id: row.id,
      title: row.title || "",
      content: row.content || "",
      type: row.type || "banner",
      active: row.active !== false,
      dismissible: row.dismissible !== false,
      created_at: toDate(row.created_at || new Date()),
    })) });

    if (chats.length) await tx.chat.createMany({ data: chats.map((row) => ({
      id: row.id,
      session_id: row.session_id || row.id,
      status: row.status || "active",
      messages: serializeJson(row.messages || [], "[]"),
      created_at: toDate(row.created_at || new Date()),
      updated_at: toNullableDate(row.updated_at),
    })) });

    if (cves.length) await tx.cve.createMany({ data: cves.map((row) => ({
      id: row.id,
      title: row.title || "",
      description: row.description || "",
      severity: row.severity || "low",
      module: row.module || "",
      status: row.status || "open",
      published_at: toDate(row.published_at || new Date()),
    })) });

    if (analytics.length) await tx.analyticsEvent.createMany({ data: analytics.map((row) => ({
      id: row.id,
      type: row.type || "pageview",
      path: row.path || "/",
      referrer: row.referrer || "",
      ip: row.ip || "",
      country: row.country || "",
      ua: row.ua || "",
      meta: serializeJson(row.meta || {}, "{}"),
      ts: toDate(row.ts || new Date()),
    })) });

    if (adminLogs.length) await tx.adminLog.createMany({ data: adminLogs.map((row) => ({
      id: row.id,
      action: row.action || "",
      actor: row.actor || "",
      meta: serializeJson(row.meta || {}, "{}"),
      ts: toDate(row.ts || new Date()),
    })) });

    if (loginAttempts.length) await tx.loginAttempt.createMany({ data: loginAttempts.map((row) => ({
      id: row.id,
      email: row.email || "",
      success: !!row.success,
      ip: row.ip || "",
      reason: row.reason || null,
      ts: toDate(row.ts || new Date()),
    })) });

    if (adminTokens.length) await tx.adminToken.createMany({ data: adminTokens.map((row) => ({
      id: row.id,
      name: row.name || "Unnamed Token",
      token: row.token || "",
      created_at: toDate(row.created_at || new Date()),
      last_used_at: toNullableDate(row.last_used_at),
    })) });

    const kvRows = [];
    if (snapshot.security_key != null) kvRows.push({ key: "security_key", value: serializeJson(snapshot.security_key, "null") });
    if (snapshot.github_stats != null) kvRows.push({ key: "github_stats", value: serializeJson(snapshot.github_stats, "null") });
    if (snapshot.system_metrics != null) kvRows.push({ key: "system_metrics", value: serializeJson(snapshot.system_metrics, "{}") });
    if (snapshot.settings != null) kvRows.push({ key: "settings", value: serializeJson(snapshot.settings, "{}") });
    if (snapshot.started_at != null) kvRows.push({ key: "started_at", value: String(snapshot.started_at) });

    const known = new Set(["users", "posts", "docs", "changelogs", "releases", "distros", "announcements", "chats", "cves", "analytics", "admin_logs", "login_attempts", "admin_tokens", "security_key", "github_stats", "system_metrics", "settings", "started_at"]);
    Object.entries(snapshot).forEach(([key, value]) => {
      if (known.has(key)) return;
      if (value === undefined) return;
      kvRows.push({ key, value: serializeJson(value, "null") });
    });

    if (kvRows.length) await tx.keyValue.createMany({ data: kvRows });
  });
}

export function createPrismaAdapter(options = {}) {
  const databaseUrl = options.databaseUrl || ensureDatabaseUrl();
  let prisma = null;
  let connected = false;
  let lastSnapshot = null;

  function ensureClient() {
    if (prisma) return prisma;
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaClient();
    return prisma;
  }

  return {
    kind: "prisma",
    connect: async (initialState = null) => {
      const client = ensureClient();
      try {
        await client.user.count();
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : null;
        if (code === "P2021" || String(err).includes("does not exist") || String(err).includes("table")) {
          pushSchema();
        } else {
          throw err;
        }
      }

      let snapshot = await readState(client);
      const isEmpty = !snapshot.users.length && !snapshot.posts.length && !snapshot.docs.length && !snapshot.changelogs.length && !snapshot.releases.length && !snapshot.announcements.length && !snapshot.chats.length && !snapshot.cves.length;
      if (isEmpty && initialState) {
        await writeState(client, initialState);
        snapshot = await readState(client);
      }

      lastSnapshot = snapshot;
      connected = true;
      saveDb(snapshot);
      return snapshot;
    },
    save: async (state) => {
      const client = ensureClient();
      await writeState(client, state);
      const snapshot = await readState(client);
      lastSnapshot = snapshot;
      saveDb(snapshot);
      return snapshot;
    },
    load: async () => {
      const client = ensureClient();
      const snapshot = await readState(client);
      lastSnapshot = snapshot;
      return snapshot;
    },
    status: async () => ({ connected, hasSnapshot: !!lastSnapshot, databaseUrl: databaseUrl.replace(/:(.*)@/, ":***@").replace(/file:.*/, "file:./prisma/dev.db") }),
    disconnect: async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
      prisma = null;
      connected = false;
      lastSnapshot = null;
    },
  };
}

export const createSqlAdapter = createPrismaAdapter;
