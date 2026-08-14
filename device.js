const os = require("os");
const crypto = require("crypto");

function getDeviceId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "",
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = { getDeviceId };