const express = require("express");
const { loadConfig } = require("./configLoader");
const { registerAgent } = require("./register");


const { installScheduledTask } = require("./taskScheduler");

console.log("Loading tracker...");
const tracker = require("./tracker");

console.log("Loading uploader...");
const uploader = require("./uploader");

console.log("Loading heartbeat...");
const heartbeat = require("./heartbeat");


console.log("All modules loaded.");
const app = express();
app.use(express.json());

let trackingStarted = false;
let autoLogoutTimer = null;

async function stopTracking(reason = "Auto logout") {
  if (!trackingStarted) return;

  console.log(`${reason}. Stopping tracking...`);

  try {
    await tracker.stop();
  } catch (e) {
    console.error("Tracker stop failed:", e.message);
  }

  try {
    uploader.stopUploader();
  } catch (e) {
    console.error("Uploader stop failed:", e.message);
  }

  try {
    heartbeat.stopHeartbeat();
  } catch (e) {
    console.error("Heartbeat stop failed:", e.message);
  }

  trackingStarted = false;

  // Cancel the scheduled auto-logout timer
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }
}

function scheduleAutoLogout() {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
  }

  const now = new Date();
  const logoutTime = new Date();

  // Set auto logout time: 11:59 PM
  logoutTime.setHours(23, 59, 0, 0);

  // If already past 11:59 PM, schedule for tomorrow
  if (logoutTime <= now) {
    logoutTime.setDate(logoutTime.getDate() + 1);
  }

  const delay = logoutTime - now;

  console.log(
    `Auto logout scheduled for ${logoutTime.toLocaleString()} (${Math.round(
      delay / 1000 / 60
    )} minutes from now)`
  );

  autoLogoutTimer = setTimeout(async () => {
    await stopTracking("Automatic end of day (11:59 PM)");

    // Schedule the next day's auto logout
    scheduleAutoLogout();
  }, delay);
}
app.post("/login", (req, res) => {
  if (trackingStarted) {
    return res.json({ message: "Tracking already started" });
  }

  console.log("Employee logged in. Starting tracking...");

  tracker.start();
  uploader.startUploader();
  heartbeat.startHeartbeat();

  trackingStarted = true;
  scheduleAutoLogout();

  res.json({ message: "Tracking started successfully" });
});
app.post("/logout", async (req, res) => {
  if (!trackingStarted) {
    return res.json({ message: "Tracking already stopped" });
  }

  console.log("Employee logged out. Stopping tracking...");

await stopTracking("Employee logged out");

  res.json({ message: "Tracking stopped successfully" });
});
(async () => {
  try {
    console.log("====================================");
    console.log("   CRM Independent Agent");
    console.log("====================================");

   installScheduledTask();

const config = loadConfig();
const agentPort = config.agentApiPort || 4500;

// Start local API FIRST
app.listen(agentPort, () => {
  console.log(`Local agent API running on http://localhost:${agentPort}`);
});

console.log("Waiting for employee login...");
// scheduleAutoLogout();
// Try registration, but do not stop the agent if it fails
try {
  console.log("Registering agent...");
  await registerAgent();
  console.log("Agent registered successfully.");
} catch (err) {
  console.warn("Registration skipped (server offline):", err.message);
}

// Do NOT start tracker, uploader, or heartbeat automatically.
  } catch (err) {
    console.error("AGENT STARTUP FAILED:", err);
  }
})();