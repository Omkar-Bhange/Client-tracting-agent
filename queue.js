  const db = require("./database");
function enqueue(session) {
  db.prepare(`
    INSERT OR IGNORE INTO sessions
    (
      id,
      application,
      windowTitle,
      startTime,
      endTime,
      durationSeconds,
      category,
      project,
      client,
      activity,

      taskId,
      taskCode,
      taskTitle,
      taskStatus,

      uploaded
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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
    session.activity,

    session.taskId || null,
    session.taskCode || null,
    session.taskTitle || null,
    session.taskStatus || null
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
function getPendingCount() {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sessions
    WHERE uploaded = 0
  `).get();

  return Number(row?.count || 0);
}
function commitBatch(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return;
  }

  const stmt = db.prepare(`
    DELETE FROM sessions
    WHERE id = ?
  `);

  const tx = db.transaction((list) => {
    for (const id of list) {
      if (id) {
        stmt.run(id);
      }
    }
  });

  tx(ids);
}
module.exports = {
  enqueue,
  reserveBatch,
  commitBatch,
  getPendingCount,
};