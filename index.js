const express = require("express");
const cors = require("cors");

const { loadConfig } = require("./configLoader");
const { registerAgent } = require("./register");
const { installScheduledTask } = require("./taskScheduler");
const { getDeviceId } = require("./device");

console.log("Loading tracker...");
const tracker = require("./tracker");

console.log("Loading uploader...");
const uploader = require("./uploader");

console.log("Loading heartbeat...");
const heartbeat = require("./heartbeat");

console.log("All modules loaded.");

const app = express();

/*
|--------------------------------------------------------------------------
| LOCAL BROWSER -> AGENT ACCESS
|--------------------------------------------------------------------------
|
| The React application running in the employee's browser will call:
|
|   http://127.0.0.1:4500/login
|   http://127.0.0.1:4500/logout
|
| The agent itself will listen ONLY on 127.0.0.1.
| Therefore another computer on the LAN cannot directly control this agent.
|
*/

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

let trackingStarted = false;
let autoLogoutTimer = null;

/*
|--------------------------------------------------------------------------
| STOP TRACKING
|--------------------------------------------------------------------------
*/

async function stopTracking(reason = "Auto logout") {
  if (!trackingStarted) return;

  console.log(`${reason}. Stopping tracking...`);

  try {
    await tracker.stop();
  } catch (e) {
    console.error("Tracker stop failed:", e.message);
  }

  try {
    // tracker.stop() has already saved the employee's
    // final active-window session into SQLite.
    //
    // Try one final upload before stopping.
    await uploader.flushNow();

    uploader.stopUploader();
  } catch (e) {
    console.error(
      "Uploader stop failed:",
      e.message
    );
  }

  try {
    heartbeat.stopHeartbeat();
  } catch (e) {
    console.error(
      "Heartbeat stop failed:",
      e.message
    );
  }

  trackingStarted = false;

  // Cancel scheduled auto logout
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }
}

/*
|--------------------------------------------------------------------------
| AUTO LOGOUT
|--------------------------------------------------------------------------
*/

function scheduleAutoLogout() {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
  }

  const now = new Date();
  const logoutTime = new Date();

  // Auto logout at 11:59 PM
  logoutTime.setHours(23, 59, 0, 0);

  // If already past 11:59 PM,
  // schedule for tomorrow.
  if (logoutTime <= now) {
    logoutTime.setDate(
      logoutTime.getDate() + 1
    );
  }

  const delay = logoutTime - now;

  console.log(
    `Auto logout scheduled for ${logoutTime.toLocaleString()} (${Math.round(
      delay / 1000 / 60
    )} minutes from now)`
  );

  autoLogoutTimer = setTimeout(
    async () => {
      await stopTracking(
        "Automatic end of day (11:59 PM)"
      );

      // Keep existing behavior
      scheduleAutoLogout();
    },
    delay
  );
}

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
|
| Allows the React application to check whether
| ClientConnect Agent is installed/running.
|
*/

app.get("/health", (req, res) => {
  const config = loadConfig();

  let deviceId = null;

  try {
    deviceId = getDeviceId();
  } catch (error) {
    console.error(
      "Unable to read agent device ID:",
      error.message
    );
  }

  return res.json({
    success: true,
    agent: "ClientConnectAgent",
    running: true,
    tracking: trackingStarted,

    employeeCode:
      config.employeeCode || null,

    pcName:
      config.pcName || null,

    // Registered machine identity.
    // Browser will forward this to the backend,
    // but backend MUST verify it against AgentDevice.
    deviceId,

    registered:
      Boolean(config.deviceToken),
  });
});

/*
|--------------------------------------------------------------------------
| EMPLOYEE LOGIN
|--------------------------------------------------------------------------
|
| Called by the React application AFTER the backend
| successfully authenticates an employee.
|
*/

app.post("/login", (req, res) => {
  try {
    const config = loadConfig();

    const requestedEmployeeCode =
      req.body?.employeeCode;

    /*
    |--------------------------------------------------------------------------
    | EMPLOYEE VALIDATION
    |--------------------------------------------------------------------------
    |
    | Browser login employee must match the employee
    | configured for this installed agent.
    |
    */

    if (!config.employeeCode) {
      return res.status(400).json({
        success: false,
        message:
          "Employee code is not configured in ClientConnect Agent.",
      });
    }

    if (!requestedEmployeeCode) {
      return res.status(400).json({
        success: false,
        message:
          "employeeCode is required.",
      });
    }

    if (
      String(requestedEmployeeCode)
        .trim()
        .toUpperCase() !==
      String(config.employeeCode)
        .trim()
        .toUpperCase()
    ) {
      console.warn(
        `Agent login rejected. Browser employee=${requestedEmployeeCode}, Agent employee=${config.employeeCode}`
      );

      return res.status(403).json({
        success: false,
        message:
          "Logged-in employee does not match this agent installation.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ALREADY TRACKING
    |--------------------------------------------------------------------------
    */

    if (trackingStarted) {
      return res.json({
        success: true,
        tracking: true,
        message:
          "Tracking already started",
      });
    }

    console.log(
      `Employee ${config.employeeCode} logged in. Starting tracking...`
    );

    /*
    |--------------------------------------------------------------------------
    | START EXISTING AGENT COMPONENTS
    |--------------------------------------------------------------------------
    */

    tracker.start();
    uploader.startUploader();
    heartbeat.startHeartbeat();

    trackingStarted = true;

    scheduleAutoLogout();

    return res.json({
      success: true,
      tracking: true,
      employeeCode: config.employeeCode,
      message:
        "Tracking started successfully",
    });
  } catch (err) {
    console.error(
      "Local agent login failed:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to start ClientConnect Agent.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| EMPLOYEE LOGOUT
|--------------------------------------------------------------------------
*/

app.post("/logout", async (req, res) => {
  try {
    if (!trackingStarted) {
      return res.json({
        success: true,
        tracking: false,
        message:
          "Tracking already stopped",
      });
    }

    console.log(
      "Employee logged out. Stopping tracking..."
    );

    await stopTracking(
      "Employee logged out"
    );

    return res.json({
      success: true,
      tracking: false,
      message:
        "Tracking stopped successfully",
    });
  } catch (err) {
    console.error(
      "Local agent logout failed:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to stop ClientConnect Agent.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| AGENT STARTUP
|--------------------------------------------------------------------------
*/

(async () => {
  try {
    console.log(
      "===================================="
    );
    console.log(
      "   CRM Independent Agent"
    );
    console.log(
      "===================================="
    );

    installScheduledTask();

    const config = loadConfig();

    const agentPort =
      config.agentApiPort || 4500;

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | Listen ONLY on loopback.
    |
    | Browser on THIS computer:
    |     CAN access 127.0.0.1:4500
    |
    | Another computer on LAN:
    |     CANNOT access this agent through its LAN IP.
    |
    */

    app.listen(
      agentPort,
      "127.0.0.1",
      () => {
        console.log(
          `Local agent API running on http://127.0.0.1:${agentPort}`
        );
      }
    );

    console.log(
      "Waiting for employee browser login..."
    );

    /*
    |--------------------------------------------------------------------------
    | REGISTER AGENT
    |--------------------------------------------------------------------------
    |
    | Registration failure should not stop the local
    | agent API from running.
    |
    */

    try {
      console.log(
        "Registering agent..."
      );

      await registerAgent();

      console.log(
        "Agent registered successfully."
      );
    } catch (err) {
      console.warn(
        "Registration skipped (server offline):",
        err.message
      );
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | Tracker/uploader/heartbeat are intentionally
    | NOT started here.
    |
    | They start only when:
    |
    | POST http://127.0.0.1:4500/login
    |
    */
  } catch (err) {
    console.error(
      "AGENT STARTUP FAILED:",
      err
    );
  }
})();