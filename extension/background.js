// ═══════════════════════════════════════════════════════════════
// BACKGROUND SERVICE WORKER — Goodlife Bulk Enrollor v4.0
// Orchestrates row-by-row enrollment processing.
// Session persistence, skip-done, fast error-skip.
// Integrated license management with anti-tamper protections.
// ═══════════════════════════════════════════════════════════════

// Import license manager
importScripts('license.js');

let state = {
  activeTab: 'joyride',
  joyride: {
    status: 'IDLE', // IDLE, RUNNING, PAUSED
    queue: [],
    index: 0,
    results: [],
    logs: [],
    currentRowStartTime: null,
    speed_multiplier: 1.0,
    max_retries: 1,
    record_timeout: 90,
    speed_mode: 'auto',
    skip_renewals: true
  },
  goodlife: {
    status: 'IDLE', // IDLE, RUNNING, PAUSED
    queue: [],
    index: 0,
    results: [],
    logs: [],
    currentRowStartTime: null,
    speed_multiplier: 1.0,
    max_retries: 1,
    record_timeout: 90,
    speed_mode: 'auto',
    skip_renewals: true
  }
};

let processingTimeout = null;

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  saveState();
  // Initialize license system on fresh install
  try {
    await LicenseManager.init();
    console.log('[License] License system initialized.');
  } catch (err) {
    console.error('[License] Init failed:', err);
  }
  // Set up daily license check alarm
  chrome.alarms.create('license-check', { periodInMinutes: 720 }); // Every 12 hours
});

// Also init on service worker startup (covers restarts)
(async () => {
  try {
    await LicenseManager.init();
    chrome.alarms.create('license-check', { periodInMinutes: 720 });
  } catch (err) {
    console.error('[License] Startup init failed:', err);
  }
})();

// ═══════════════════════════════════════════════════════════════
// LICENSE EXPIRY ALARM
// ═══════════════════════════════════════════════════════════════
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'license-check') {
    try {
      const licStatus = await LicenseManager.getStatus();
      if (licStatus.status === 'TRIAL' && licStatus.daysLeft <= 3 && licStatus.daysLeft > 0) {
        sendNotification('Trial Expiring Soon!', `Your free trial ends in ${licStatus.daysLeft} day(s). Activate a license key to continue using Goodlife Bulk Enrollor.`);
      } else if (licStatus.status === 'LICENSED' && licStatus.daysLeft <= 3 && licStatus.daysLeft > 0) {
        sendNotification('License Expiring Soon!', `Your license expires in ${licStatus.daysLeft} day(s). Please renew to avoid interruption.`);
      } else if (licStatus.status === 'EXPIRED') {
        // Auto-pause if running
        const sub = getActiveSubstate();
        if (sub.status === 'RUNNING') {
          sub.status = 'PAUSED';
          clearTimeout(processingTimeout);
          addLog('Automation paused — license/trial expired.', 'error');
          saveState();
          broadcastState();
        }
        sendNotification('License Expired', 'Your trial/license has expired. Please activate a license key to continue.');
      }
    } catch (err) {
      console.error('[License] Alarm check failed:', err);
    }
  }
});

// Configure SidePanel to open when extension icon is clicked
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Joyride Enrollor] SidePanel config failed:', error));
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function getActiveSubstate() {
  const tab = state.activeTab || 'joyride';
  if (!state[tab]) {
    state[tab] = {
      status: 'IDLE',
      queue: [],
      index: 0,
      results: [],
      logs: [],
      currentRowStartTime: null,
      speed_multiplier: 1.0,
      max_retries: 1,
      record_timeout: 90,
      speed_mode: 'auto',
      skip_renewals: true
    };
  }
  return state[tab];
}

function loadState(callback) {
  chrome.storage.local.get([
    'status', 'queue', 'index', 'results', 'logs',
    'currentRowStartTime', 'speed_multiplier', 'max_retries', 'record_timeout',
    'activeTab', 'joyride', 'goodlife'
  ], (data) => {
    if (data.activeTab) state.activeTab = data.activeTab;
    if (data.joyride) state.joyride = data.joyride;
    if (data.goodlife) state.goodlife = data.goodlife;

    // Migrate old flat state to joyride sub-state
    if (!data.joyride && data.queue) {
      state.joyride = {
        status: data.status || 'IDLE',
        queue: data.queue || [],
        index: data.index || 0,
        results: data.results || [],
        logs: data.logs || [],
        currentRowStartTime: data.currentRowStartTime !== undefined ? data.currentRowStartTime : null,
        speed_multiplier: data.speed_multiplier !== undefined ? data.speed_multiplier : 1.0,
        max_retries: data.max_retries !== undefined ? data.max_retries : 1,
        record_timeout: data.record_timeout !== undefined ? data.record_timeout : 90
      };
    }

    // Ensure structures exist
    const defaultSub = {
      status: 'IDLE', queue: [], index: 0, results: [], logs: [],
      currentRowStartTime: null, speed_multiplier: 1.0, max_retries: 1, record_timeout: 90,
      speed_mode: 'auto', skip_renewals: true
    };
    if (!state.joyride) {
      state.joyride = { ...defaultSub };
    } else {
      if (state.joyride.speed_mode === undefined) state.joyride.speed_mode = 'auto';
      if (state.joyride.skip_renewals === undefined) state.joyride.skip_renewals = true;
    }
    if (!state.goodlife) {
      state.goodlife = { ...defaultSub };
    } else {
      if (state.goodlife.speed_mode === undefined) state.goodlife.speed_mode = 'auto';
      if (state.goodlife.skip_renewals === undefined) state.goodlife.skip_renewals = true;
    }

    if (callback) callback();
  });
}

function saveState() {
  chrome.storage.local.set(state);
}

// ═══════════════════════════════════════════════════════════════
// COMPLETED VINS REGISTRY — Persists across sessions
// ═══════════════════════════════════════════════════════════════

function loadCompletedVins(tabName, callback) {
  const key = `completedVins_${tabName}`;
  chrome.storage.local.get([key], (data) => {
    callback(data[key] || {});
  });
}

function saveCompletedVin(tabName, vin, resultData) {
  const key = `completedVins_${tabName}`;
  chrome.storage.local.get([key], (data) => {
    const registry = data[key] || {};
    registry[vin.toUpperCase()] = {
      status: resultData.status,
      errorDetails: resultData.errorDetails || '',
      timestamp: Date.now(),
      duration: resultData.duration || 0
    };
    chrome.storage.local.set({ [key]: registry });
  });
}

function clearCompletedVins(tabName, callback) {
  const key = `completedVins_${tabName}`;
  chrome.storage.local.set({ [key]: {} }, () => {
    if (callback) callback();
  });
}

function broadcastState() {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATED', state });
}

function addLog(message, level = 'info') {
  const sub = getActiveSubstate();
  sub.logs.push({ message, level, timestamp: Date.now() });
  if (sub.logs.length > 500) sub.logs.shift();
  saveState();
}

// ═══════════════════════════════════════════════════════════════
// CONTENT SCRIPT INJECTION
// ═══════════════════════════════════════════════════════════════

function ensureContentScriptInjected(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      if (chrome.runtime.lastError || !response || response.type !== 'PONG') {
        addLog('Content script not active. Injecting...', 'info');
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            addLog(`Injection failed: ${chrome.runtime.lastError.message}`, 'error');
            resolve(false);
          } else {
            addLog('Content script injected. Waiting to settle...', 'info');
            setTimeout(() => resolve(true), 1000);
          }
        });
      } else {
        resolve(true);
      }
    });
  });
}

function waitTabComplete(tabId) {
  return new Promise((resolve) => {
    const check = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) { resolve(); return; }
        if (tab.status === 'complete') { resolve(); }
        else { setTimeout(check, 500); }
      });
    };
    check();
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN QUEUE PROCESSOR
// ═══════════════════════════════════════════════════════════════

async function processNext() {
  loadState(async () => {
    const sub = getActiveSubstate();
    if (sub.status !== 'RUNNING' && sub.status !== 'PAUSED_NETWORK') return;

    // ── NETWORK CONNECTION CHECK ──
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      sub.status = 'PAUSED_NETWORK';
      addLog('🌐 Internet connection lost! Automation paused. Waiting for connection to restore...', 'warning');
      saveState();
      broadcastState();
      scheduleNetworkCheck();
      return;
    }

    // ── LICENSE GATE: Check license before processing ──
    try {
      const licStatus = await LicenseManager.getStatus();
      if (licStatus.status === 'EXPIRED') {
        sub.status = 'PAUSED';
        clearTimeout(processingTimeout);
        addLog('LICENSE EXPIRED — Automation stopped. Please activate a license key to continue.', 'error');
        saveState();
        broadcastState();
        sendNotification('License Required', 'Your trial/license has expired. Automation paused.');
        return;
      }
    } catch (err) {
      console.error('[License] Gate check failed:', err);
      // Allow processing to continue if license check fails (don't block on errors)
    }

    if (sub.index >= sub.queue.length) {
      sub.status = 'IDLE';
      const tabLabel = state.activeTab === 'goodlife' ? 'GoodLife' : 'Joyride';
      const successCount = sub.results.filter(r => r.status === 'Success').length;
      const errorCount = sub.results.filter(r => r.status === 'Error').length;
      addLog(`All ${tabLabel} enrollments processed! Batch complete.`, 'success');
      saveState();
      broadcastState();
      // Desktop notification
      sendNotification(`${tabLabel} Batch Complete!`, `${successCount} success, ${errorCount} failed out of ${sub.queue.length} total.`);
      // Save to session history
      saveSessionToHistory(sub, state.activeTab);
      return;
    }

    const row = sub.queue[sub.index];
    addLog(`Processing VIN: ${row.vin} (${sub.index + 1}/${sub.queue.length})`, 'info');
    broadcastState();

    // Find the Hero GoodLife tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let targetTab = tabs.find(t => t.url && t.url.includes('hmclgoodlife.heromotocorp.biz'));
    if (!targetTab) {
      const allTabs = await chrome.tabs.query({});
      targetTab = allTabs.find(t => t.url && t.url.includes('hmclgoodlife.heromotocorp.biz'));
    }

    if (!targetTab) {
      addLog('Hero GoodLife tab not found. Please open the website first.', 'error');
      sub.status = 'PAUSED';
      saveState();
      broadcastState();
      sendNotification('Automation Paused', 'Hero GoodLife tab not found. Please open the website and resume.');
      return;
    }

    const targetTabId = targetTab.id;
    await waitTabComplete(targetTabId);

    const injected = await ensureContentScriptInjected(targetTabId);
    if (!injected) {
      sub.status = 'PAUSED';
      saveState();
      broadcastState();
      return;
    }

    // Set start time for duration tracking
    sub.currentRowStartTime = Date.now();
    saveState();

    // Enrich payload with speed/retry settings
    const enrichedRow = {
      ...row,
      speed_multiplier: sub.speed_multiplier,
      max_retries: sub.max_retries,
      speed_mode: sub.speed_mode || 'auto',
      skip_renewals: sub.skip_renewals !== undefined ? sub.skip_renewals : true
    };

    chrome.tabs.sendMessage(targetTabId, { 
      type: 'PROCESS_ROW', 
      payload: enrichedRow,
      jobType: state.activeTab
    }, (response) => {
      if (chrome.runtime.lastError) {
        addLog('GoodLife page not responding. Please check the tab.', 'error');
        sub.status = 'PAUSED';
        saveState();
        broadcastState();
      }
    });

    // Fallback timeout for hung records
    const timeoutMs = (sub.record_timeout || 90) * 1000;
    clearTimeout(processingTimeout);
    processingTimeout = setTimeout(() => {
      handleRowResult({
        vin: row.vin,
        status: 'Error',
        errorDetails: `Timeout: No response in ${sub.record_timeout || 90}s.`
      });
    }, timeoutMs);
  });
}

// ═══════════════════════════════════════════════════════════════
// ROW RESULT HANDLER
// ═══════════════════════════════════════════════════════════════

function handleRowResult(payload) {
  loadState(() => {
    const sub = getActiveSubstate();
    if (sub.status !== 'RUNNING') return;

    const currentItem = sub.queue[sub.index];
    if (currentItem && currentItem.vin === payload.vin) {
      clearTimeout(processingTimeout);

      const durationSeconds = sub.currentRowStartTime
        ? Math.round((Date.now() - sub.currentRowStartTime) / 1000) : 0;

      const resultPayload = {
        ...payload,
        vin: currentItem.vin,
        timestamp: Date.now(),
        duration: durationSeconds
      };

      if (state.activeTab === 'goodlife') {
        resultPayload.dob = currentItem.dob || '';
        resultPayload.district = currentItem.district || '';
        resultPayload.city = currentItem.city || '';
        resultPayload.mobile = currentItem.mobile || '';
        resultPayload.email = currentItem.email || '';
        resultPayload.nominee_name = currentItem.nominee_name || '';
        resultPayload.nominee_relation = currentItem.nominee_relation || '';
        resultPayload.nominee_contact = currentItem.nominee_contact || '';
      } else {
        resultPayload.mobile = currentItem.mobile || '';
        resultPayload.email = currentItem.email || '';
        resultPayload.district = currentItem.district || '';
        resultPayload.city = currentItem.city || '';
        resultPayload.transaction_type = currentItem.transaction_type || 'N';
        resultPayload.joyride_card_number = currentItem.joyride_card_number || '';
        resultPayload.discount = currentItem.discount || '';
      }

      sub.results.push(resultPayload);

      // ── Save to completed VINs registry for session persistence ──
      if (payload.status === 'Success') {
        saveCompletedVin(state.activeTab, currentItem.vin, resultPayload);
        addLog(`VIN ${payload.vin} enrolled successfully. (${durationSeconds}s)`, 'success');
      } else if (payload.status === 'Skipped') {
        addLog(`VIN ${payload.vin} skipped: ${payload.errorDetails}`, 'warning');
      } else {
        addLog(`VIN ${payload.vin} failed: ${payload.errorDetails} (${durationSeconds}s)`, 'error');
      }

      sub.index++;
      saveState();

      // ── FAST ERROR SKIP: Use minimal delay for errors/skips ──
      let interDelay;
      if (payload.status === 'Error' || payload.status === 'Skipped') {
        interDelay = 500; // Fast skip — no need to wait
      } else {
        interDelay = Math.max(500, Math.round(2000 * (sub.speed_multiplier || 1.0)));
      }
      setTimeout(() => processNext(), interDelay);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    loadState(() => sendResponse(state));
    return true;
  }

  if (message.type === 'SWITCH_TAB') {
    loadState(() => {
      state.activeTab = message.tab;
      addLog(`Selected tab: ${state.activeTab === 'goodlife' ? 'GoodLife Enrolment' : 'Joyride'}`, 'info');
      saveState();
      broadcastState();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SET_QUEUE') {
    loadState(() => {
      const sub = getActiveSubstate();
      const incomingQueue = message.queue || [];

      // ── SKIP ALREADY-DONE: Filter out VINs completed in previous sessions ──
      loadCompletedVins(state.activeTab, (completedRegistry) => {
        const alreadyDone = [];
        const freshQueue = [];

        incomingQueue.forEach(row => {
          const vinKey = (row.vin || '').toUpperCase();
          if (completedRegistry[vinKey] && completedRegistry[vinKey].status === 'Success') {
            alreadyDone.push(row);
          } else {
            freshQueue.push(row);
          }
        });

        sub.queue = freshQueue;
        sub.index = 0;
        sub.results = [];

        // Auto-mark already-done VINs as Skipped in results
        alreadyDone.forEach(row => {
          sub.results.push({
            vin: row.vin,
            status: 'Skipped',
            errorDetails: `Already enrolled (session: ${new Date(completedRegistry[row.vin.toUpperCase()].timestamp).toLocaleDateString()})`,
            timestamp: Date.now(),
            duration: 0
          });
        });

        if (alreadyDone.length > 0) {
          addLog(`⚡ ${alreadyDone.length} VIN(s) auto-skipped — already enrolled in previous session.`, 'warning');
        }
        addLog(`Queue loaded: ${freshQueue.length} new records ready (${alreadyDone.length} already done).`, 'info');

        saveState();
        broadcastState();
        sendResponse({ success: true, skipped: alreadyDone.length, queued: freshQueue.length });
      });
    });
    return true;
  }

  if (message.type === 'START_QUEUE') {
    loadState(() => {
      const sub = getActiveSubstate();
      if (message.queue && message.queue.length > 0 && sub.queue.length === 0) {
        sub.queue = message.queue;
        sub.index = 0;
        sub.results = [];
      }
      if (sub.queue.length === 0) {
        addLog('Cannot start: No queue loaded. All VINs may be already enrolled.', 'warning');
        broadcastState();
        return;
      }
      // Prevent starting if already at end
      if (sub.index >= sub.queue.length) {
        addLog('All records already processed. Reset to start again.', 'info');
        broadcastState();
        return;
      }
      sub.status = 'RUNNING';
      addLog(`${state.activeTab === 'goodlife' ? 'GoodLife' : 'Joyride'} enrollment started! ${sub.queue.length} records queued.`, 'info');
      saveState();
      broadcastState();
      processNext();
    });
  }

  if (message.type === 'PAUSE_QUEUE') {
    loadState(() => {
      const sub = getActiveSubstate();
      sub.status = 'PAUSED';
      clearTimeout(processingTimeout);
      addLog('Automation paused.', 'warning');
      saveState();
      broadcastState();
    });
  }

  if (message.type === 'RESUME_QUEUE') {
    loadState(() => {
      const sub = getActiveSubstate();
      if (sub.queue.length === 0) {
        addLog('Nothing to resume — queue is empty.', 'warning');
        broadcastState();
        return;
      }
      // ── FIX: Bounds check — prevent resuming a completed batch ──
      if (sub.index >= sub.queue.length) {
        addLog('All records already processed. Reset to start a new batch.', 'info');
        sub.status = 'IDLE';
        saveState();
        broadcastState();
        return;
      }
      sub.status = 'RUNNING';
      addLog(`Automation resumed. Continuing from record ${sub.index + 1}/${sub.queue.length}.`, 'info');
      saveState();
      broadcastState();
      processNext();
    });
  }

  if (message.type === 'RESET_QUEUE') {
    loadState(() => {
      const sub = getActiveSubstate();
      sub.status = 'IDLE';
      sub.queue = [];
      sub.index = 0;
      sub.results = [];
      sub.logs = [];
      clearTimeout(processingTimeout);
      addLog('Queue reset. Upload a new CSV file.', 'info');
      saveState();
      broadcastState();
    });
  }

  if (message.type === 'CLEAR_LOGS') {
    loadState(() => {
      const sub = getActiveSubstate();
      sub.logs = [];
      saveState();
      broadcastState();
    });
  }

  if (message.type === 'ROW_PROCESSED') {
    handleRowResult(message.payload);
  }

  if (message.type === 'UPDATE_SPEED_SETTINGS') {
    loadState(() => {
      const sub = getActiveSubstate();
      if (message.speed_multiplier !== undefined) sub.speed_multiplier = message.speed_multiplier;
      if (message.max_retries !== undefined) sub.max_retries = message.max_retries;
      if (message.record_timeout !== undefined) sub.record_timeout = message.record_timeout;
      if (message.speed_mode !== undefined) sub.speed_mode = message.speed_mode;
      if (message.skip_renewals !== undefined) {
        state.joyride.skip_renewals = message.skip_renewals;
        state.goodlife.skip_renewals = message.skip_renewals;
      }
      saveState();
      broadcastState();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SKIP_CURRENT') {
    loadState(() => {
      const sub = getActiveSubstate();
      if (sub.status !== 'RUNNING') {
        addLog('Cannot skip: Automation is not running.', 'warning');
        broadcastState();
        return;
      }
      const currentItem = sub.queue[sub.index];
      if (currentItem) {
        clearTimeout(processingTimeout);
        const durationSeconds = sub.currentRowStartTime
          ? Math.round((Date.now() - sub.currentRowStartTime) / 1000) : 0;
        sub.results.push({
          vin: currentItem.vin,
          status: 'Skipped',
          errorDetails: 'Manually skipped by user (duplicate/skip)',
          timestamp: Date.now(),
          duration: durationSeconds
        });
        addLog(`VIN ${currentItem.vin} skipped by user.`, 'warning');
        sub.index++;
        saveState();
        broadcastState();
        // Notify inject.js to abort current processing
        chrome.tabs.query({}, (tabs) => {
          const targetTab = tabs.find(t => t.url && t.url.includes('hmclgoodlife.heromotocorp.biz'));
          if (targetTab) {
            chrome.tabs.sendMessage(targetTab.id, { type: 'SKIP_CURRENT' });
          }
        });
        // Move to next record
        const interDelay = Math.max(500, Math.round(2000 * (sub.speed_multiplier || 1.0)));
        setTimeout(() => processNext(), interDelay);
      }
    });
  }

  if (message.type === 'SPEED_METRICS') {
    // Relay adaptive speed metrics from inject.js to popup
    chrome.runtime.sendMessage({ type: 'SPEED_METRICS_UPDATED', metrics: message.metrics });
  }

  if (message.type === 'LOG_MESSAGE') {
    addLog(message.message, message.level || 'info');
    broadcastState();
    sendResponse({ success: true });
    return true;
  }

  // ── SESSION MANAGEMENT: Get/Clear completed VINs ──
  if (message.type === 'GET_COMPLETED_VINS') {
    const tabName = message.tab || state.activeTab;
    loadCompletedVins(tabName, (registry) => {
      sendResponse({ completedVins: registry, count: Object.keys(registry).length });
    });
    return true;
  }

  if (message.type === 'CLEAR_COMPLETED_VINS') {
    const tabName = message.tab || state.activeTab;
    clearCompletedVins(tabName, () => {
      addLog(`Session history cleared for ${tabName === 'goodlife' ? 'GoodLife' : 'Joyride'}. All VINs will be processed fresh.`, 'info');
      saveState();
      broadcastState();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'RETRY_SINGLE') {
    loadState(() => {
      const sub = getActiveSubstate();
      const failedResult = sub.results.find(r => r.vin === message.vin && r.status === 'Error');
      if (!failedResult) return;
      const originalRow = sub.queue.find(r => r.vin === message.vin);
      if (!originalRow) return;
      // Remove from results
      sub.results = sub.results.filter(r => !(r.vin === message.vin && r.status === 'Error'));
      // Re-add to end of queue and adjust
      sub.queue.push({...originalRow});
      addLog(`Re-queued VIN ${message.vin} for retry.`, 'info');
      if (sub.status === 'IDLE') {
        sub.index = sub.queue.length - 1;
        sub.status = 'RUNNING';
        saveState();
        broadcastState();
        processNext();
      } else {
        saveState();
        broadcastState();
      }
    });
  }

  if (message.type === 'RETRY_ALL_FAILED') {
    loadState(() => {
      const sub = getActiveSubstate();
      const failedVins = sub.results.filter(r => r.status === 'Error').map(r => r.vin);
      if (failedVins.length === 0) { addLog('No failed records to retry.', 'warning'); broadcastState(); return; }
      const failedRows = failedVins.map(vin => sub.queue.find(r => r.vin === vin)).filter(Boolean);
      sub.results = sub.results.filter(r => r.status !== 'Error');
      failedRows.forEach(row => sub.queue.push({...row}));
      sub.index = sub.queue.length - failedRows.length;
      sub.status = 'RUNNING';
      addLog(`Re-queued ${failedRows.length} failed VINs for retry.`, 'info');
      saveState();
      broadcastState();
      processNext();
    });
  }
  // ═══════════════════════════════════════════════════════════════
  // LICENSE MESSAGE HANDLERS
  // ═══════════════════════════════════════════════════════════════

  if (message.type === 'GET_LICENSE_STATUS') {
    (async () => {
      try {
        const status = await LicenseManager.getStatus();
        sendResponse(status);
      } catch (err) {
        sendResponse({ status: 'ERROR', reason: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'ACTIVATE_LICENSE_KEY') {
    (async () => {
      try {
        const result = await LicenseManager.activateKey(message.key);
        if (result.success) {
          addLog(`License activated! Valid for ${result.durationDays} days. Expires: ${result.expiresAt}`, 'success');
          saveState();
          broadcastState();
        }
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, reason: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'DEACTIVATE_LICENSE') {
    (async () => {
      try {
        await LicenseManager.deactivateKey();
        addLog('License deactivated. Trial data preserved.', 'warning');
        saveState();
        broadcastState();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, reason: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'GET_DEVICE_ID') {
    (async () => {
      try {
        const deviceId = await LicenseManager.getDeviceId();
        sendResponse({ deviceId });
      } catch (err) {
        sendResponse({ deviceId: 'ERROR' });
      }
    })();
    return true;
  }
});

// ═══════════════════════════════════════════════════════════════
// DESKTOP NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function sendNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message,
      priority: 2
    });
  } catch(e) { console.error('[Notification]', e); }
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════
chrome.commands.onCommand.addListener((command) => {
  loadState(() => {
    const sub = getActiveSubstate();
    if (command === 'start-resume') {
      if (sub.status === 'PAUSED' || (sub.status === 'IDLE' && sub.queue.length > 0)) {
        sub.status = 'RUNNING';
        addLog('Automation started via keyboard shortcut.', 'info');
        saveState();
        broadcastState();
        processNext();
      }
    } else if (command === 'pause') {
      if (sub.status === 'RUNNING') {
        sub.status = 'PAUSED';
        clearTimeout(processingTimeout);
        addLog('Paused via keyboard shortcut.', 'warning');
        saveState();
        broadcastState();
      }
    } else if (command === 'reset') {
      sub.status = 'IDLE';
      sub.queue = []; sub.index = 0; sub.results = []; sub.logs = [];
      clearTimeout(processingTimeout);
      addLog('Reset via keyboard shortcut.', 'info');
      saveState();
      broadcastState();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SESSION HISTORY (last 10 batches)
// ═══════════════════════════════════════════════════════════════
function saveSessionToHistory(sub, tabName) {
  chrome.storage.local.get(['sessionHistory'], (data) => {
    const history = data.sessionHistory || [];
    const successCount = sub.results.filter(r => r.status === 'Success').length;
    const errorCount = sub.results.filter(r => r.status === 'Error').length;
    const skippedCount = sub.results.filter(r => r.status === 'Skipped').length;
    history.unshift({
      tab: tabName,
      timestamp: Date.now(),
      total: sub.queue.length,
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      results: sub.results.slice(0, 200) // cap stored results
    });
    if (history.length > 10) history.length = 10;
    chrome.storage.local.set({ sessionHistory: history });
  });
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC NETWORK RECOVERY MONITOR
// ═══════════════════════════════════════════════════════════════
let networkCheckTimer = null;

function scheduleNetworkCheck() {
  if (networkCheckTimer) return;
  networkCheckTimer = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      clearInterval(networkCheckTimer);
      networkCheckTimer = null;
      loadState(() => {
        let resumed = false;
        ['joyride', 'goodlife'].forEach(key => {
          if (state[key] && state[key].status === 'PAUSED_NETWORK') {
            state[key].status = 'RUNNING';
            resumed = true;
          }
        });
        if (resumed) {
          addLog('🌐 Internet connection restored! Auto-resuming batch execution...', 'success');
          saveState();
          broadcastState();
          processNext();
        }
      });
    }
  }, 3000);
}

if (typeof self !== 'undefined') {
  self.addEventListener('online', () => {
    console.log('[Network] Online event received.');
    if (networkCheckTimer) {
      clearInterval(networkCheckTimer);
      networkCheckTimer = null;
    }
    loadState(() => {
      let resumed = false;
      ['joyride', 'goodlife'].forEach(key => {
        if (state[key] && state[key].status === 'PAUSED_NETWORK') {
          state[key].status = 'RUNNING';
          resumed = true;
        }
      });
      if (resumed) {
        addLog('🌐 Internet connection restored! Auto-resuming batch execution...', 'success');
        saveState();
        broadcastState();
        processNext();
      }
    });
  });

  self.addEventListener('offline', () => {
    console.log('[Network] Offline event received.');
    loadState(() => {
      const sub = getActiveSubstate();
      if (sub.status === 'RUNNING') {
        sub.status = 'PAUSED_NETWORK';
        clearTimeout(processingTimeout);
        addLog('🌐 Internet connection lost! Automation paused. Waiting for connection to restore...', 'error');
        saveState();
        broadcastState();
        scheduleNetworkCheck();
      }
    });
  });
}
