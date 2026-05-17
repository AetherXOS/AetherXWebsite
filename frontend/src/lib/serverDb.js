import { createRequire } from "module";
import { createDefaultSettings, normalizeSettings } from "./settings.js";

let fs, path, crypto, DB_PATH;

if (typeof window === "undefined") {
  const require = createRequire(import.meta.url);
  fs = require("fs");
  path = require("path");
  crypto = require("crypto");
  DB_PATH = path.resolve(process.cwd(), "db.json");
}

let dbCache = null;
let writeQueue = Promise.resolve();
let pendingSnapshot = null;
let flushTimer = null;
const FLUSH_DEBOUNCE_MS = 200; // coalesce frequent saves into one write

function normalizeDbShape(db) {
  let changed = false;

  const nextSettings = normalizeSettings(db.settings || {});
  if (JSON.stringify(nextSettings) !== JSON.stringify(db.settings || {})) {
    db.settings = nextSettings;
    changed = true;
  }

  const legacyDemoSeed =
    Array.isArray(db.docs) && db.docs.length >= 5 &&
    Array.isArray(db.changelogs) && db.changelogs.length >= 2 &&
    Array.isArray(db.releases) && db.releases.length >= 2 &&
    Array.isArray(db.analytics) && db.analytics.length > 1000 &&
    Array.isArray(db.announcements) && db.announcements.length >= 2;

  if (legacyDemoSeed) {
    db.docs = [];
    db.posts = [];
    db.changelogs = [];
    db.releases = [];
    db.analytics = [];
    db.announcements = [];
    db.github_stats = null;
    db.system_metrics = null;
    changed = true;
  }

  db.users = Array.isArray(db.users) ? db.users : [];
  db.posts = Array.isArray(db.posts) ? db.posts : [];
  db.docs = Array.isArray(db.docs) ? db.docs : [];
  db.changelogs = Array.isArray(db.changelogs) ? db.changelogs : [];
  db.releases = Array.isArray(db.releases) ? db.releases : [];
  db.analytics = Array.isArray(db.analytics) ? db.analytics : [];
  db.admin_logs = Array.isArray(db.admin_logs) ? db.admin_logs : [];
  db.login_attempts = Array.isArray(db.login_attempts) ? db.login_attempts : [];
  db.announcements = Array.isArray(db.announcements) ? db.announcements : [];
  db.distros = Array.isArray(db.distros) ? db.distros : [];
  db.chats = Array.isArray(db.chats) ? db.chats : [];
  db.cves = Array.isArray(db.cves) ? db.cves : [];

  if (!db.started_at) {
    db.started_at = new Date().toISOString();
    changed = true;
  }

  return changed;
}

function persistDbSnapshot(db) {
  const content = JSON.stringify(db, null, 2);
  fs.writeFileSync(DB_PATH, content, "utf8");
}

export function getDb() {
  if (dbCache) {
    return dbCache;
  }
  if (!fs.existsSync(DB_PATH)) {
    bootstrapDb();
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    dbCache = JSON.parse(data);

    if (normalizeDbShape(dbCache)) {
      persistDbSnapshot(dbCache);
    }

    return dbCache;
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    bootstrapDb();
    const data = fs.readFileSync(DB_PATH, "utf8");
    dbCache = JSON.parse(data);

    if (normalizeDbShape(dbCache)) {
      persistDbSnapshot(dbCache);
    }

    return dbCache;
  }
}

export function saveDb(data) {
  // update in-memory cache immediately
  dbCache = data;

  // schedule a debounced flush so many rapid mutations coalesce into one disk write
  pendingSnapshot = JSON.stringify(data, null, 2);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const content = pendingSnapshot;
    pendingSnapshot = null;
    // serialize writes using the promise chain to avoid concurrent file writes
    writeQueue = writeQueue.then(async () => {
      try {
        const tempPath = DB_PATH + ".tmp";
        await fs.promises.writeFile(tempPath, content, "utf8");
        await fs.promises.rename(tempPath, DB_PATH);
      } catch (err) {
        console.error("Concurrent DB Write Error:", err);
      }
    });
  }, FLUSH_DEBOUNCE_MS);

  return writeQueue;
}

export async function flushPendingWrites() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingSnapshot) {
    const content = pendingSnapshot;
    pendingSnapshot = null;
    writeQueue = writeQueue.then(async () => {
      try {
        const tempPath = DB_PATH + ".tmp";
        await fs.promises.writeFile(tempPath, content, "utf8");
        await fs.promises.rename(tempPath, DB_PATH);
      } catch (err) {
        console.error("Flush DB Write Error:", err);
      }
    });
  }
  return writeQueue;
}

export function hashPassword(password) {
  // Use Node's built-in crypto for robust, compile-free SHA-256 password hashing
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password, hashedPassword) {
  const hash = hashPassword(password);
  return hash === hashedPassword;
}

function bootstrapDb() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@aetherxos.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "aether123";
  const includeDemoData = String(process.env.SEED_DEMO_DATA || "").toLowerCase() === "true";

  const initialUsers = [
    {
      id: "admin-id-123",
      email: adminEmail,
      password_hash: hashPassword(adminPassword), // Securely hash the admin password
      name: "AetherXOS Admin",
      role: "admin",
      created_at: new Date().toISOString(),
    },
  ];

  // Remove large demo seed payloads by default. Keep bootstrap minimal.
  const initialDocs = [];
  const initialChangelogs = [];
  const initialReleases = [];
  const initialAnalytics = [];
  const initialAnnouncements = [];

  const db = {
    users: initialUsers,
    docs: includeDemoData ? initialDocs : [],
    posts: [],
    changelogs: includeDemoData ? initialChangelogs : [],
    releases: includeDemoData ? initialReleases : [],
    security_key: null,
    analytics: initialAnalytics,
    admin_logs: [],
    login_attempts: [],
    announcements: includeDemoData ? initialAnnouncements : [],
    distros: [],
    chats: [],
    cves: [],
    settings: createDefaultSettings(),
    started_at: new Date().toISOString(),
  };

  normalizeDbShape(db);

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
