const axios = require("axios");
const fs = require("fs");
const { loadConfig } = require("./configLoader");

let activeTask = null;

async function refreshCurrentTask() {
  const config = loadConfig();
  try {
    const response = await axios.get(
    config.serverUrl + "/api/agent/current-task",
      {
        headers: {
          Authorization: `Bearer ${config.deviceToken}`,
        },
        timeout: 5000,
      }
    );

    activeTask = response.data?.data || null;
  } catch (err) {
    console.log("Unable to fetch current task");
  }
}

function getCurrentTask() {
  return activeTask;
}

function startCurrentTaskWatcher() {
  refreshCurrentTask();
  setInterval(refreshCurrentTask, 30000);
}

module.exports = {
  getCurrentTask,
  startCurrentTaskWatcher,
};