const axios = require("axios");
const { loadConfig } = require("./configLoader");

const {
  reserveBatch,
  commitBatch,
  getPendingCount,
} = require("./queue");

// ========================================================
// UPLOADER CONFIGURATION
// ========================================================

// Maximum sessions sent in one HTTP request
const BATCH_SIZE = 100;

// Normal upload interval: 2 minutes
const NORMAL_INTERVAL_MS = 120000;

// When a large backlog exists, drain it quickly
const BACKLOG_INTERVAL_MS = 5000;

// Initial retry after server/network failure
const INITIAL_RETRY_MS = 120000;

// Maximum retry delay: 15 minutes
const MAX_RETRY_MS = 15 * 60 * 1000;

let uploadTimer = null;
let uploaderRunning = false;
let uploadInProgress = false;
let retryDelay = INITIAL_RETRY_MS;


// ========================================================
// UPLOAD ONE BATCH
// ========================================================

async function uploadBatch() {
  // Prevent overlapping HTTP requests
  if (uploadInProgress) {
    return {
      success: false,
      skipped: true,
    };
  }

  const batch = reserveBatch(BATCH_SIZE);

  // Important:
  // no queued sessions = NO backend request
  if (batch.length === 0) {
    return {
      success: true,
      empty: true,
      uploaded: 0,
    };
  }

  uploadInProgress = true;

  try {
    const config = loadConfig();

    const response = await axios.post(
      config.serverUrl + "/api/agent/events",
      {
        employeeCode: config.employeeCode,
        pcName: config.pcName,
        sessions: batch,
      },
      {
        headers: {
          Authorization: `Bearer ${config.deviceToken}`,
        },
        timeout: 15000,
      }
    );

    const result = response.data || {};

    const processedIds = Array.isArray(result.processedIds)
      ? result.processedIds
      : [];

    const failed = Array.isArray(result.failed)
      ? result.failed
      : [];

    // Only allow deletion of IDs that were actually sent
    const batchIds = new Set(
      batch.map((item) => String(item.id))
    );

    const safeProcessedIds = processedIds.filter(
      (id) =>
        id &&
        batchIds.has(String(id))
    );

    if (safeProcessedIds.length > 0) {
      commitBatch(safeProcessedIds);
    }

    if (failed.length > 0) {
      console.log(
        `Uploaded ${safeProcessedIds.length} sessions, ${failed.length} failed`
      );
    } else {
      console.log(
        `Uploaded ${safeProcessedIds.length} sessions`
      );
    }

    const remaining = getPendingCount();

    console.log(
      `Agent queue remaining: ${remaining}`
    );

    // Successful request resets retry delay
    retryDelay = INITIAL_RETRY_MS;

    return {
      success: true,
      uploaded: safeProcessedIds.length,
      failed: failed.length,
      remaining,
      batchSize: batch.length,
    };
  } catch (err) {
    console.log(
      `Upload failed: ${err.message}`
    );

    console.log(
      `Sessions retained locally. Retry in ${Math.round(
        retryDelay / 60000
      )} minute(s).`
    );

    return {
      success: false,
      error: err.message,
    };
  } finally {
    uploadInProgress = false;
  }
}


// ========================================================
// SCHEDULE NEXT UPLOAD
// ========================================================

function scheduleNextUpload(delay) {
  if (!uploaderRunning) {
    return;
  }

  if (uploadTimer) {
    clearTimeout(uploadTimer);
  }

  uploadTimer = setTimeout(
    runUploaderCycle,
    delay
  );
}


// ========================================================
// SMART UPLOADER LOOP
// ========================================================

async function runUploaderCycle() {
  if (!uploaderRunning) {
    return;
  }

  const pendingBefore = getPendingCount();

  // Nothing waiting.
  // Do not contact backend.
  if (pendingBefore === 0) {
    scheduleNextUpload(
      NORMAL_INTERVAL_MS
    );

    return;
  }

  const result = await uploadBatch();

  if (!uploaderRunning) {
    return;
  }

  // ------------------------------------------------------
  // SERVER / NETWORK FAILURE
  // ------------------------------------------------------

  if (!result.success) {
    const delay = retryDelay;

    retryDelay = Math.min(
      retryDelay * 2,
      MAX_RETRY_MS
    );

    scheduleNextUpload(delay);

    return;
  }

  // ------------------------------------------------------
  // LARGE BACKLOG
  // ------------------------------------------------------

  const remaining = getPendingCount();

  if (remaining >= BATCH_SIZE) {
    console.log(
      `Large queue detected (${remaining}). Continuing fast sync...`
    );

    scheduleNextUpload(
      BACKLOG_INTERVAL_MS
    );

    return;
  }

  // ------------------------------------------------------
  // NORMAL OPERATION
  // ------------------------------------------------------

  scheduleNextUpload(
    NORMAL_INTERVAL_MS
  );
}


// ========================================================
// START UPLOADER
// ========================================================

function startUploader() {
  if (uploaderRunning) {
    return;
  }

  uploaderRunning = true;
  retryDelay = INITIAL_RETRY_MS;

  console.log(
    `Smart uploader started (normal interval ${NORMAL_INTERVAL_MS / 60000} min, batch ${BATCH_SIZE})...`
  );

  // Allow tracker/heartbeat to initialize first.
  scheduleNextUpload(5000);
}


// ========================================================
// FINAL LOGOUT FLUSH
// ========================================================

async function flushNow() {
  const pending = getPendingCount();

  if (pending === 0) {
    return;
  }

  console.log(
    `Final upload: ${pending} queued session(s)...`
  );

  await uploadBatch();
}


// ========================================================
// STOP UPLOADER
// ========================================================

function stopUploader() {
  uploaderRunning = false;

  if (uploadTimer) {
    clearTimeout(uploadTimer);
    uploadTimer = null;
  }

  console.log(
    "Uploader stopped."
  );
}


module.exports = {
  startUploader,
  stopUploader,
  flushNow,
  uploadBatch,
};