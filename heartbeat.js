const axios = require("axios");
const os = require("os");
const fs = require("fs");
const { loadConfig } = require("./configLoader");
const { getDeviceId } = require("./device");



let currentStatus = "Working";
let currentApp = "";
let currentTask = "";

function updatePresence(data = {}) {
  if (data.status) currentStatus = data.status;
  if (data.application !== undefined) currentApp = data.application;
  if (data.task !== undefined) currentTask = data.task;
}

async function sendHeartbeat() {
  try {
    const config = loadConfig();
    await axios.post(
      config.serverUrl + "/api/agent/heartbeat",
      {
        deviceId: getDeviceId(),
        employeeCode: config.employeeCode,
        pcName: config.pcName || os.hostname(),
        status: currentStatus,
        application: currentApp,
        task: currentTask,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${config.deviceToken}`,
        },
        timeout: 5000,
      }
    );

    console.log(`Heartbeat: ${currentStatus} | ${currentApp}`);
  } catch (err) {
    console.log("Heartbeat failed:", err.message);
  }
}

let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;

  console.log("Heartbeat service started...");

  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 30000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log("Heartbeat service stopped.");
  }
}

module.exports = {
  startHeartbeat,
  stopHeartbeat,
  updatePresence,
};