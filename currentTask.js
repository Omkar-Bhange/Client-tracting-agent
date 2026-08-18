let activeTask = null;

function setCurrentTask(task) {
  activeTask = task || null;
}

function getCurrentTask() {
  return activeTask;
}

function clearCurrentTask() {
  activeTask = null;
}

// Kept temporarily so existing tracker code does not break.
function startCurrentTaskWatcher() {
  // No polling anymore.
  // Heartbeat updates the current task.
}

function stopCurrentTaskWatcher() {
  activeTask = null;
}

module.exports = {
  getCurrentTask,
  setCurrentTask,
  clearCurrentTask,
  startCurrentTaskWatcher,
  stopCurrentTaskWatcher,
};