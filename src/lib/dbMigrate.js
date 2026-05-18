import { createRequire } from "module";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);

function getBetterSqlite3() {
  try {
    return require("better-sqlite3");
  } catch (err) {
    return null;
  }
}

// Simple relational mapping: top-level collections -> tables with JSON payload per row
// For small datasets this provides queryability while keeping migration simple.
export function migrateJsonToSql(dbFile, state) {
  const BetterSqlite3 = getBetterSqlite3();
  if (!BetterSqlite3) throw new Error("better-sqlite3 not installed; cannot migrate to sqlite relational schema");

  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // backup existing sqlite file if present
  if (fs.existsSync(dbFile)) {
    const bak = dbFile + ".bak-" + Date.now();
    fs.copyFileSync(dbFile, bak);
  }

  const db = new BetterSqlite3(dbFile);
  try {
    // Create normalized tables for main collections
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS changelogs (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);

    const insertUser = db.prepare("INSERT OR REPLACE INTO users (id, json) VALUES (?, ?)");
    const insertPost = db.prepare("INSERT OR REPLACE INTO posts (id, json) VALUES (?, ?)");
    const insertDoc = db.prepare("INSERT OR REPLACE INTO docs (id, json) VALUES (?, ?)");
    const insertChangelog = db.prepare("INSERT OR REPLACE INTO changelogs (id, json) VALUES (?, ?)");
    const insertRelease = db.prepare("INSERT OR REPLACE INTO releases (id, json) VALUES (?, ?)");
    const insertAnnouncement = db.prepare("INSERT OR REPLACE INTO announcements (id, json) VALUES (?, ?)");
    const insertChat = db.prepare("INSERT OR REPLACE INTO chats (id, json) VALUES (?, ?)");
    const insertKv = db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)");

    const trx = db.transaction(() => {
      // collections map; for items without id, generate a synthetic id
      const pushCollection = (col, insertStmt) => {
        const arr = Array.isArray(state[col]) ? state[col] : [];
        for (const item of arr) {
          const id = item && (item.id || item._id || item.uid) ? (item.id || item._id || item.uid) : ("gen-" + Math.random().toString(36).slice(2));
          insertStmt.run(id, JSON.stringify({ ...item, id }));
        }
      };

      pushCollection("users", insertUser);
      pushCollection("posts", insertPost);
      pushCollection("docs", insertDoc);
      pushCollection("changelogs", insertChangelog);
      pushCollection("releases", insertRelease);
      pushCollection("announcements", insertAnnouncement);
      pushCollection("chats", insertChat);

      // store remaining top-level as kv
      const others = { ...state };
      delete others.users; delete others.posts; delete others.docs; delete others.changelogs;
      delete others.releases; delete others.announcements; delete others.chats;
      insertKv.run("meta", JSON.stringify(others));
    });

    trx();
  } finally {
    try { db.close(); } catch (e) {}
  }
}

export function migrateSqlToJson(dbFile) {
  const BetterSqlite3 = getBetterSqlite3();
  if (!BetterSqlite3) throw new Error("better-sqlite3 not installed; cannot migrate from sqlite relational schema");
  if (!fs.existsSync(dbFile)) throw new Error("sqlite file not found: " + dbFile);

  const db = new BetterSqlite3(dbFile, { readonly: true });
  try {
    const readAll = (table) => {
      try {
        const rows = db.prepare(`SELECT json FROM ${table}`).all();
        return rows.map((r) => {
          try { return JSON.parse(r.json); } catch (e) { return null; }
        }).filter(Boolean);
      } catch (err) {
        return [];
      }
    };

    const result = {};
    result.users = readAll("users");
    result.posts = readAll("posts");
    result.docs = readAll("docs");
    result.changelogs = readAll("changelogs");
    result.releases = readAll("releases");
    result.announcements = readAll("announcements");
    result.chats = readAll("chats");

    // read meta kv
    try {
      const row = db.prepare("SELECT value FROM kv WHERE key = ?").get("meta");
      if (row && row.value) {
        const meta = JSON.parse(row.value);
        Object.assign(result, meta);
      }
    } catch (err) {
      // ignore
    }

    return result;
  } finally {
    try { db.close(); } catch (e) {}
  }
}
