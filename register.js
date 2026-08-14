const axios = require("axios");
const os = require("os");
const { getDeviceId } = require("./device");
const { loadConfig, saveConfig } = require("./configLoader");

const config = loadConfig();

async function registerAgent() {
  if (config.deviceToken) {
    console.log("Agent already registered.");
    return config.deviceToken;
  }
console.log("Register payload:", {
  employeeCode: config.employeeCode,
  pcName: config.pcName,
  deviceId: getDeviceId()
});
  const res = await axios.post(config.serverUrl + "/api/agent/register", {
    employeeCode: config.employeeCode,
    pcName: config.pcName || os.hostname(),
    deviceId: getDeviceId(),
    deviceName: os.hostname(),
    platform: os.platform(),
    appVersion: "1.0.0",
  });

  config.deviceToken = res.data.deviceToken;

  saveConfig(config);

  console.log("Agent registered successfully.");

  return config.deviceToken;
}

module.exports = { registerAgent };