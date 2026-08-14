  const db = require("./database");

  function enqueue(session) {
    db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, application, windowTitle, startTime, endTime, durationSeconds,
      category, project, client, activity, uploaded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      session.id,
      session.application,
      session.windowTitle,
      session.startTime,
      session.endTime,
      session.durationSeconds,
      session.category,
      session.project,
      session.client,
      session.activity
    );
  }

function reserveBatch(size = 100) {
    return db.prepare(`
      SELECT * FROM sessions
      WHERE uploaded = 0
      ORDER BY startTime
      LIMIT ?
    `).all(size);
  }

  function commitBatch(ids) {
  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  const tx = db.transaction((list) => {
    for (const id of list) stmt.run(id);
  });
  tx(ids);
}

  module.exports = {
    enqueue,
    reserveBatch,
    commitBatch,
  };