const axios = require("axios");
const fs = require("fs");
const { loadConfig } = require("./configLoader");
const { reserveBatch, commitBatch } = require("./queue");

const UPLOAD_INTERVAL_MS = 30000; // 30 seconds
const BATCH_SIZE = 100;

async function uploadBatch() {
  const config = loadConfig();
  const batch = reserveBatch(BATCH_SIZE);

  if (batch.length === 0) return;

  try {
    const response = await axios.post(
      config.serverUrl + '/api/agent/events',
      {
        employeeCode: config.employeeCode,
        pcName: config.pcName,
        sessions: batch,
      },
      {
        headers: {
          Authorization: `Bearer ${config.deviceToken}`,
        },
        timeout: 10000,
      }
    );

    const result = response.data || {};
    const processedIds = Array.isArray(result.processedIds)
      ? result.processedIds
      : [];

    const failed = Array.isArray(result.failed)
      ? result.failed
      : [];

    if (processedIds.length > 0) {
      commitBatch(processedIds);
    }

    if (processedIds.length !== batch.length) {
      console.warn(
        `Server acknowledged ${processedIds.length}/${batch.length} sessions`
      );
    }

    if (failed.length > 0) {
      console.log(
        `Uploaded ${processedIds.length} sessions, ${failed.length} failed`
      );
    } else {
      console.log(`Uploaded ${processedIds.length} sessions`);
    }
  } catch (err) {
    console.log('Server unavailable, events retained locally');
  }
}

let uploadTimer = null;

function startUploader() {
  if (uploadTimer) return;

  console.log(
    `Uploader started (every ${UPLOAD_INTERVAL_MS / 1000}s, batch ${BATCH_SIZE})...`
  );

  // Try immediately on startup
  uploadBatch();

  // Then keep syncing in the background
  uploadTimer = setInterval(uploadBatch, UPLOAD_INTERVAL_MS);
}

function stopUploader() {
  if (uploadTimer) {
    clearInterval(uploadTimer);
    uploadTimer = null;
    console.log("Uploader stopped.");
  }
}

module.exports = {
  startUploader,
  stopUploader,
};