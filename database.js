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
  uploaded INTEGER DEFAULT 0
);
`);

console.log("Agent database:", dbPath);

module.exports = db;