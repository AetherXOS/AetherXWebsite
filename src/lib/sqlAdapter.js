import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { saveDb } from "./serverDb.js";

let BetterSqlite3 = null;
try {
  const require = createRequire(import.meta.url);
  BetterSqlite3 = require("better-sqlite3");
} catch (err) {
  // dependency not installed; we'll fallback to file-backed save
  BetterSqlite3 = null;
}

export function createSqlAdapter(options = {}) {
  const dbFile = options.file || path.resolve(process.cwd(), "db.sqlite");
  let db = null;

  return {
    kind: "sqlite",
    connect: async () => {
      if (!BetterSqlite3) {
        console.warn("better-sqlite3 not installed; sqlite adapter will fallback to file-backed save");
        return;
      }
      try {
        const dir = path.dirname(dbFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        db = new BetterSqlite3(dbFile);
        db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
      } catch (err) {
        console.error("SQLite adapter connect error:", err);
        db = null;
      }
    },
    autoMigrateFromJson: async (state) => {
      if (!BetterSqlite3) return { migrated: false, reason: "better-sqlite3 not installed" };
      try {
        // reopen DB to inspect tables
        const tmpDb = new BetterSqlite3(dbFile);
        let usersCount = 0;
        try {
          const row = tmpDb.prepare("SELECT COUNT(*) as c FROM users").get();
          usersCount = row ? row.c : 0;
        } catch (_) {
          usersCount = 0;
        }
        tmpDb.close();

        // If relational tables appear empty but JSON state has users, migrate
        if (usersCount === 0 && Array.isArray(state.users) && state.users.length > 0) {
          const req = createRequire(import.meta.url);
          const { migrateJsonToSql } = req("./dbMigrate.js");
          // run migration to populate relational tables
          migrateJsonToSql(dbFile, state);
          return { migrated: true };
        }
        return { migrated: false };
      } catch (err) {
        return { migrated: false, reason: String(err) };
      }
    },
    save: async (state) => {
      if (!BetterSqlite3 || !db) {
        console.warn("sqlite adapter fallback: delegating save to file-backed saveDb");
        return saveDb(state);
      }
      try {
        const json = JSON.stringify(state);
        const insert = db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)");
        const trx = db.transaction((k, v) => insert.run(k, v));
        trx("db", json);
      } catch (err) {
        console.error("SQLite adapter save error:", err);
        // fallback
        return saveDb(state);
      }
    },
    disconnect: async () => {
      if (db && typeof db.close === "function") {
        try {
          db.close();
        } catch (err) {
          console.error("Error closing sqlite db:", err);
        }
      }
      db = null;
    }
  };
}
