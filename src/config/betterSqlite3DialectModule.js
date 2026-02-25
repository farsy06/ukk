"use strict";

const BetterSqlite3 = require("better-sqlite3");

class Statement {
  constructor(lastID, changes) {
    this.lastID = lastID;
    this.changes = changes;
  }
}

class Database {
  constructor(filename, _mode, callback) {
    this.filename = filename;

    try {
      this._db = new BetterSqlite3(filename);
      if (typeof callback === "function") {
        process.nextTick(() => callback(null));
      }
    } catch (error) {
      if (typeof callback === "function") {
        process.nextTick(() => callback(error));
      } else {
        throw error;
      }
    }
  }

  serialize(fn) {
    if (typeof fn === "function") {
      fn();
    }
  }

  run(sql, params, callback) {
    let boundParams = params;
    let cb = callback;

    if (typeof params === "function") {
      cb = params;
      boundParams = undefined;
    }

    try {
      const stmt = this._db.prepare(sql);
      const result = executeStatement(stmt, "run", boundParams);

      if (typeof cb === "function") {
        const meta = new Statement(result.lastInsertRowid, result.changes);
        process.nextTick(() => cb.call(meta, null));
      }
    } catch (error) {
      if (typeof cb === "function") {
        process.nextTick(() => cb(error));
      } else {
        throw error;
      }
    }
  }

  all(sql, params, callback) {
    let boundParams = params;
    let cb = callback;

    if (typeof params === "function") {
      cb = params;
      boundParams = undefined;
    }

    try {
      const stmt = this._db.prepare(sql);
      if (!stmt.reader) {
        executeStatement(stmt, "run", boundParams);
        if (typeof cb === "function") {
          process.nextTick(() => cb(null, []));
        }
        return;
      }

      const rows = executeStatement(stmt, "all", boundParams);

      if (typeof cb === "function") {
        process.nextTick(() => cb(null, rows));
      }
    } catch (error) {
      if (typeof cb === "function") {
        process.nextTick(() => cb(error));
      } else {
        throw error;
      }
    }
  }

  close(callback) {
    try {
      this._db.close();
      if (typeof callback === "function") {
        process.nextTick(() => callback(null));
      }
    } catch (error) {
      if (typeof callback === "function") {
        process.nextTick(() => callback(error));
      } else {
        throw error;
      }
    }
  }
}

function executeStatement(stmt, method, boundParams) {
  if (typeof boundParams === "undefined" || boundParams === null) {
    return stmt[method]();
  }

  if (Array.isArray(boundParams)) {
    if (boundParams.length === 0) {
      return stmt[method]();
    }
    return stmt[method](...boundParams.map(normalizeSqliteValue));
  }

  if (typeof boundParams === "object") {
    if (Object.keys(boundParams).length === 0) {
      return stmt[method]();
    }
    return stmt[method](normalizeNamedParams(boundParams));
  }

  return stmt[method](normalizeSqliteValue(boundParams));
}

function normalizeNamedParams(boundParams) {
  const normalized = {};

  for (const [key, value] of Object.entries(boundParams)) {
    if (!key) {
      continue;
    }

    if (["$", ":", "@"].includes(key[0])) {
      normalized[key.slice(1)] = normalizeSqliteValue(value);
    } else {
      normalized[key] = normalizeSqliteValue(value);
    }
  }

  return normalized;
}

function normalizeSqliteValue(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "undefined") {
    return null;
  }

  return value;
}

module.exports = {
  Database,
  OPEN_READONLY: 0x00000001,
  OPEN_READWRITE: 0x00000002,
  OPEN_CREATE: 0x00000004,
};
