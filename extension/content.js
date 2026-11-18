// ═══════════════════════════════════════════════════════════════
// CONTENT SCRIPT — Bridge between Extension context and Page DOM
// Injects inject.js into the page and relays messages.
// ═══════════════════════════════════════════════════════════════

// Inject the inject.js script into the webpage DOM context
try {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove(); // Clean up script tag after execution
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('[Goodlife Enrollor] inject.js successfully injected.');
} catch (err) {
  console.error('[Goodlife Enrollor] Injection failed:', err);
}

// ═══════════════════════════════════════════════════════════════
// EXTENSION → PAGE: Relay commands from background to inject.js
// ═══════════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }
  if (message.type === 'PROCESS_ROW') {
    window.postMessage({
      type: 'JOYRIDE_PROCESS_ROW',
      payload: message.payload,
      jobType: message.jobType
    }, '*');
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'SKIP_CURRENT') {
    window.postMessage({ type: 'JOYRIDE_SKIP_CURRENT' }, '*');
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'NAVIGATE_TO_ENROLLMENT') {
    window.postMessage({
      type: 'JOYRIDE_NAVIGATE',
      payload: message.payload
    }, '*');
    sendResponse({ success: true });
    return true;
  }
});

// ═══════════════════════════════════════════════════════════════
// PAGE → EXTENSION: Relay results from inject.js to background
// ═══════════════════════════════════════════════════════════════
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === 'JOYRIDE_LOG_MESSAGE') {
    const { message: logMsg, level } = event.data;
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'LOG_MESSAGE', message: logMsg, level });
      }
    } catch (err) {
      console.debug('[Joyride Enrollor] Extension context invalidated.');
    }
  }

  if (event.data && event.data.type === 'JOYRIDE_RECORD_PROCESSED') {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: 'ROW_PROCESSED',
          payload: event.data.payload
        });
      }
    } catch (err) {
      console.debug('[Joyride Enrollor] Extension context invalidated. Reload the page.');
    }
  }

  if (event.data && event.data.type === 'JOYRIDE_SPEED_METRICS') {
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: 'SPEED_METRICS',
          metrics: event.data.metrics
        });
      }
    } catch (err) {
      console.debug('[Joyride Enrollor] Extension context invalidated.');
    }
  }
});
