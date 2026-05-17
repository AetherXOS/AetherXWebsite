import { saveDb } from "./serverDb.js";

// Lightweight adapter that wraps a plain DB object and centralizes mutation+save
// Provides a simple transaction API and a global commit lock to serialize commits.
let commitLock = Promise.resolve();

// Optional pluggable persistence adapter (e.g. SQLite/Postgres stub)
let persistenceAdapter = null;

function ensureCollection(d, coll) {
  d[coll] = Array.isArray(d[coll]) ? d[coll] : [];
}

async function callSave(db) {
  if (persistenceAdapter && typeof persistenceAdapter.save === "function") {
    try {
      return await persistenceAdapter.save(db);
    } catch (err) {
      console.error("Persistence adapter save error, falling back:", err);
    }
  }
  return saveDb(db);
}

export function registerPersistenceAdapter(adapter, initialState = null) {
  persistenceAdapter = adapter;
  if (persistenceAdapter && typeof persistenceAdapter.connect === "function") {
    return persistenceAdapter.connect(initialState).catch((err) => console.error("Adapter connect error:", err));
  }
  return Promise.resolve();
}

export function getPersistenceAdapterInfo() {
  return {
    kind: (persistenceAdapter && persistenceAdapter.kind) || "file",
    hasAdapter: !!persistenceAdapter,
  };
}

export async function closePersistenceAdapter() {
  if (persistenceAdapter && typeof persistenceAdapter.disconnect === "function") {
    try {
      await persistenceAdapter.disconnect();
    } catch (err) {
      console.error("Adapter disconnect error:", err);
    }
  }
  persistenceAdapter = null;
}

export function createSqlAdapterStub(kind = "sqlite") {
  return {
    kind,
    connect: async () => console.warn(`${kind} adapter: connect() stub`),
    save: async (db) => {
      console.warn(`${kind} adapter: save() stub — delegating to file-backed save`);
      return saveDb(db);
    },
    disconnect: async () => console.warn(`${kind} adapter: disconnect() stub`),
  };
}

export function withDb(db) {
  function ensure(coll) {
    ensureCollection(db, coll);
  }

  return {
    get(collection) {
      if (!collection) return db;
      ensure(collection);
      return db[collection];
    },
    find(collection, predicate) {
      ensure(collection);
      return db[collection].find(predicate);
    },
    findIndex(collection, predicate) {
      ensure(collection);
      return db[collection].findIndex(predicate);
    },
    insert(collection, item) {
      ensure(collection);
      db[collection].push(item);
      // If this is a transactional working copy, don't persist here — commit will persist
      if (db && db.__isTransaction) return Promise.resolve();
      return callSave(db);
    },
    updateAt(collection, idx, item) {
      ensure(collection);
      db[collection][idx] = item;
      if (db && db.__isTransaction) return Promise.resolve();
      return callSave(db);
    },
    removeWhere(collection, predicate) {
      ensure(collection);
      const before = db[collection].length;
      db[collection] = db[collection].filter((i) => !predicate(i));
      const changed = db[collection].length !== before;
      if (changed) return callSave(db);
      return Promise.resolve();
    },
    save() {
      if (db && db.__isTransaction) return Promise.resolve();
      return callSave(db);
    },
    // run a callback with a transactional copy of the DB; commit applies changes atomically
    async transaction(cb) {
      // shallow deep clone via JSON for our JSON-backed DB
      const working = JSON.parse(JSON.stringify(db || {}));
      // mark working copy so its methods skip intermediate saves
      working.__isTransaction = true;
      const trx = withDb(working);
      await cb(trx);

      // serialize commits to avoid races
      commitLock = commitLock.then(async () => {
        // merge top-level keys from working into main db
        Object.keys(working).forEach((k) => {
          db[k] = working[k];
        });
        await callSave(db);
      });
      return commitLock;
    }
  };
}

export default withDb;
