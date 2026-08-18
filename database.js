const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Use current user profile instead of ProgramData
const dataDir = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, "AppData", "Local"),
  "ClientConnectAgent"
);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "agent.db");

// Open in read/write mode
const db = new Database(dbPath);

// Better concurrency
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  application TEXT,
  windowTitle TEXT,
  startTime TEXT,
  endTime TEXT,
  durationSeconds INTEGER,
  category TEXT,
  project TEXT,
  client TEXT,
  activity TEXT,

  taskId TEXT,
  taskCode TEXT,
  taskTitle TEXT,
  taskStatus TEXT,

  uploaded INTEGER DEFAULT 0
);
`);
function ensureColumn(columnName, definition) {
  const columns = db
    .prepare(`PRAGMA table_info(sessions)`)
    .all();

  const exists = columns.some(
    (column) => column.name === columnName
  );

  if (!exists) {
    db.exec(
      `ALTER TABLE sessions ADD COLUMN ${columnName} ${definition}`
    );

    console.log(
      `Database migration: added sessions.${columnName}`
    );
  }
}

ensureColumn("taskId", "TEXT");
ensureColumn("taskCode", "TEXT");
ensureColumn("taskTitle", "TEXT");
ensureColumn("taskStatus", "TEXT");

console.log("Agent database:", dbPath);

module.exports = db;