function classifySession(session) {
  const app = (session.application || "").toLowerCase();
  const title = session.windowTitle || "";

  const result = {
    category: "Other",
    project: "",
    client: "",
    activity: "",
  };

  // Visual Studio Code
  if (app.includes("visual studio code")) {
    result.category = "Development";
    result.activity = "Coding";

    // Example: tracker.js - agent-core - Visual Studio Code
    const parts = title.split(" - ");
    if (parts.length >= 2) {
      result.project = parts[1].trim();
    }
  }

  // Google Chrome
  else if (app.includes("chrome")) {
    result.category = "Browser";
    result.activity = "Web work";

    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes("client-connect-track")) {
      result.project = "ClientConnectTrack";
    }

    if (lowerTitle.includes("ticket")) {
      result.activity = "Ticket work";
    }

    if (lowerTitle.includes("dashboard")) {
      result.activity = "Dashboard review";
    }
  }

  // MongoDB Compass
  else if (app.includes("mongodb")) {
    result.category = "Database";
    result.activity = "Database work";
    result.project = "ClientConnectTrack";
  }

  // Windows Explorer
  else if (app.includes("explorer")) {
    result.category = "File System";
    result.activity = "File management";
  }

  return result;
}

module.exports = { classifySession };