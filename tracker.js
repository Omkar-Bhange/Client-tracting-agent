const activeWin = require("active-win");
const { classifySession } = require("./classifier");
const heartbeat = require("./heartbeat");
const { enqueue } = require("./queue");
const currentTask = require("./currentTask");
const crypto = require("crypto");

let currentApp = null;
let currentTitle = null;
let sessionStart = null;
let trackerTimer = null;
let trackerRunning = false;

async function flushCurrentSession() {
  if (!currentApp || !sessionStart) return;

  const endTime = new Date();
  const durationSeconds = Math.max(
    1,
    Math.floor((endTime - sessionStart) / 1000)
  );
const metadata = classifySession({
  application: currentApp,
  windowTitle: currentTitle,
});

const task = currentTask.getCurrentTask();

enqueue({
  id: crypto.randomUUID(),
  application: currentApp,
  windowTitle: currentTitle,
  startTime: sessionStart.toISOString(),
  endTime: endTime.toISOString(),
  durationSeconds,
  taskId: task?._id || null,
  taskCode: task?.taskCode || null,
  taskTitle: task?.title || null,
  taskStatus: task?.status || null,
  ...metadata,
});

  console.log(`Saved session: ${currentApp} | ${durationSeconds}s`);
}

async function checkWindow() {
  try {
    const win = await activeWin();
    console.log("RAW WINDOW:", {
  app: win?.owner?.name,
  path: win?.owner?.path,
  title: win?.title,
});

    const app = win?.owner?.name || "Unknown";
    const title = win?.title || "";

    // First launch
    if (currentApp === null) {
      currentApp = app;
      currentTitle = title;
      sessionStart = new Date();

      // UPDATE HEARTBEAT HERE
      heartbeat.updatePresence({
        status: "Working",
        application: currentApp,
      });

      console.log(`Started: ${app}`);
      return;
    }

    // Window changed
    if (app !== currentApp || title !== currentTitle) {
      await flushCurrentSession();

      currentApp = app;
      currentTitle = title;
      sessionStart = new Date();

      // UPDATE HEARTBEAT HERE
      heartbeat.updatePresence({
        status: "Working",
        application: currentApp,
      });

      console.log(`Started: ${app}`);
    }
  } catch (err) {
    console.error("Tracker error:", err.message);
  }
}

async function start() {
  if (trackerRunning) return;

  trackerRunning = true;
  console.log("Tracker started...");

  // Capture first window immediately
  currentTask.startCurrentTaskWatcher();
  await checkWindow();

  // Check every 5 seconds for a window switch
  trackerTimer = setInterval(checkWindow, 5000);
}

async function stop() {
  if (!trackerRunning) return;

  trackerRunning = false;

  if (trackerTimer) {
    clearInterval(trackerTimer);
    trackerTimer = null;
  }

  await flushCurrentSession();

  currentApp = null;
  currentTitle = null;
  sessionStart = null;

  console.log("Tracker stopped.");
}

// Flush when agent exits
process.on("SIGINT", async () => {
  await stop();
  process.exit();
});

process.on("SIGTERM", async () => {
  await stop();
  process.exit();
});

module.exports = {
  start,
  stop,
};