const { execSync } = require("child_process");

function installScheduledTask() {
  const taskName = "CRM-Agent";
  const scriptPath = "C:\\Program Files\\ClientConnectAgent\\run-agent.bat";

  try {
    // Check if the task already exists
    execSync(`schtasks /Query /TN "${taskName}"`, { stdio: "ignore" });
    console.log("Task Scheduler: CRM-Agent already exists.");
    return;
  } catch (_) {
    // Task does not exist; continue creating it
  }

  const command =
    `schtasks /Create /F /RL HIGHEST /SC ONLOGON ` +
    `/TN "${taskName}" ` +
    `/TR "${scriptPath}"`;

  try {
    execSync(command, { stdio: "ignore" });
    console.log("Task Scheduler: CRM-Agent installed.");
  } catch (err) {
    console.error("Failed to install scheduled task:", err.message);
  }
}

module.exports = { installScheduledTask };