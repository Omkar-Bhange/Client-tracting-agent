const fs = require("fs");
const path = require("path");

// Always store config in ProgramData
const dataDir = path.join(process.env.ProgramData || "C:\\ProgramData", "ClientConnectAgent");
const configPath = path.join(dataDir, "config.json");

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      serverUrl: "http://192.168.0.229:5000",
      employeeCode: "",
      pcName: "",
      deviceToken: ""
    };

    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  console.log("Loading config from:", configPath);
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig, configPath };