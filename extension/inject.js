// ═══════════════════════════════════════════════════════════════
// GOODLIFE BULK ENROLLMENT — DOM Injection Automation Engine
// Runs in the page's DOM context to interact with Angular forms.
// ═══════════════════════════════════════════════════════════════
(function() {
  // ─── INSTANCE GUARD ───────────────────────────────────────────
  const INSTANCE_ID = Date.now() + '_' + Math.random().toString(36).slice(2);
  window.__JOYRIDE_ENROLLOR_INSTANCE__ = INSTANCE_ID;
  console.log('[Goodlife Enrollor] Engine initialized. Instance:', INSTANCE_ID);

  // ─── SPEED & ADAPTIVE ENGINE ──────────────────────────────────
  let speedMultiplier = 1.0;
  let maxRetries = 1;
  let speedMode = 'auto';  // 'auto' or 'manual'
  let skipRenewals = true;
  let skipCurrentRequested = false;

  // ── Adaptive Speed State ──
  const adaptiveState = {
    responseTimes: [],        // Rolling window of last 10 operation durations (ms)
    maxHistorySize: 10,
    currentMultiplier: 1.0,   // Auto-calculated speed multiplier
    minMultiplier: 0.15,      // Fastest allowed (near-instant)
    maxMultiplier: 1.8,       // Slowest allowed
    baseDelay: 100,           // Base delay between operations (ms)
    minDelay: 50,             // Absolute floor (prevent DOM thrashing)
    maxDelay: 2500,           // Absolute ceiling
    healthScore: 50,          // 0-100 (higher = healthier/faster site)
    lastMetricsReport: 0,
    consecutiveErrors: 0,
    consecutiveSuccesses: 0
  };

  // Record an operation's response time and recalculate adaptive speed
  function recordOperationTime(durationMs, operationName = '') {
    if (speedMode !== 'auto') return;
    const s = adaptiveState;
    s.responseTimes.push(durationMs);
    if (s.responseTimes.length > s.maxHistorySize) s.responseTimes.shift();

    // Calculate average response time
    const avg = s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length;

    // Calculate health score (0-100): fast responses = high score
    // < 200ms = 100, 200-500ms = 80, 500-1000ms = 60, 1000-2000ms = 40, > 2000ms = 20
    if (avg < 200) s.healthScore = Math.min(100, 85 + (200 - avg) / 200 * 15);
    else if (avg < 500) s.healthScore = 70 + (500 - avg) / 300 * 15;
    else if (avg < 1000) s.healthScore = 50 + (1000 - avg) / 500 * 20;
    else if (avg < 2000) s.healthScore = 30 + (2000 - avg) / 1000 * 20;
    else s.healthScore = Math.max(10, 30 - (avg - 2000) / 1000 * 10);

    // Boost score for consecutive successes, penalize for errors
    s.healthScore = Math.min(100, s.healthScore + s.consecutiveSuccesses * 2);
    s.healthScore = Math.max(5, s.healthScore - s.consecutiveErrors * 10);

    // Calculate multiplier from health score
    // healthScore 100 → multiplier 0.15 (fastest)
    // healthScore 0   → multiplier 1.8  (slowest)
    s.currentMultiplier = s.maxMultiplier - ((s.healthScore / 100) * (s.maxMultiplier - s.minMultiplier));
    s.currentMultiplier = Math.max(s.minMultiplier, Math.min(s.maxMultiplier, s.currentMultiplier));

    // Report metrics to popup (throttled: max every 500ms)
    if (Date.now() - s.lastMetricsReport > 500) {
      s.lastMetricsReport = Date.now();
      window.postMessage({
        type: 'JOYRIDE_SPEED_METRICS',
        metrics: {
          currentMultiplier: s.currentMultiplier,
          avgResponseMs: avg,
          healthScore: s.healthScore,
          operationName
        }
      }, '*');
    }
  }

  function markOperationSuccess() {
    adaptiveState.consecutiveSuccesses++;
    adaptiveState.consecutiveErrors = 0;
  }

  function markOperationError() {
    adaptiveState.consecutiveErrors++;
    adaptiveState.consecutiveSuccesses = 0;
  }

  // ─── DELAY UTILITY (Adaptive-aware & Network-aware) ───────────
  function delay(ms) {
    if (skipCurrentRequested) return Promise.reject(new Error('SKIPPED_BY_USER'));
    const effectiveMultiplier = (speedMode === 'auto') ? adaptiveState.currentMultiplier : speedMultiplier;
    const calculated = Math.round(ms * effectiveMultiplier);
    const clamped = Math.max(adaptiveState.minDelay, Math.min(adaptiveState.maxDelay, calculated));
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (skipCurrentRequested) return reject(new Error('SKIPPED_BY_USER'));
        try {
          await ensureNetworkOnline();
          resolve();
        } catch (e) {
          reject(e);
        }
      }, clamped);
    });
  }

  function fixedDelay(ms) {
    if (skipCurrentRequested) return Promise.reject(new Error('SKIPPED_BY_USER'));
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (skipCurrentRequested) return reject(new Error('SKIPPED_BY_USER'));
        try {
          await ensureNetworkOnline();
          resolve();
        } catch (e) {
          reject(e);
        }
      }, ms);
    });
  }

  // ─── TIMED OPERATION WRAPPER ────────────────────────────────────
  // Wraps any async operation to measure its duration for the adaptive engine
  async function timedOperation(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      recordOperationTime(duration, name);
      markOperationSuccess();
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      recordOperationTime(duration, name);
      markOperationError();
      throw err;
    }
  }

  // ─── SKIP CURRENT LISTENER ─────────────────────────────────────
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'JOYRIDE_SKIP_CURRENT') {
      skipCurrentRequested = true;
      logMessage('Skip signal received. Aborting current VIN...', 'warning');
    }
  });

  // ─── INTELLIGENT DOM WAIT (MutationObserver) ──────────────────
  function waitForDOMStable(timeoutMs = 5000, settleMs = 300) {
    if (skipCurrentRequested) return Promise.resolve();
    return new Promise(resolve => {
      let timer;
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => { observer.disconnect(); resolve(); }, settleMs);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      timer = setTimeout(() => { observer.disconnect(); resolve(); }, timeoutMs);
    });
  }

  // ─── MESSAGE LISTENER ────────────────────────────────────────
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === 'JOYRIDE_PROCESS_ROW') {
      // Only the latest instance should process
      if (window.__JOYRIDE_ENROLLOR_INSTANCE__ !== INSTANCE_ID) {
        console.warn('[Goodlife Enrollor] Stale instance, ignoring.');
        return;
      }
      const payload = event.data.payload;
      const jobType = event.data.jobType || 'joyride';
      try {
        if (jobType === 'goodlife') {
          await processGoodLifeRow(payload);
        } else {
          await processRow(payload);
        }
      } catch (err) {
        console.error('[Goodlife Enrollor] Process row failed:', err);
        sendResponse(payload.vin, 'Error', err.message);
      }
    }
  });

  // ─── LOGGING & RESPONSE ───────────────────────────────────────
  function logMessage(message, level = 'info') {
    window.postMessage({ type: 'JOYRIDE_LOG_MESSAGE', message, level }, '*');
  }

  function sendResponse(vin, status, errorDetails = '') {
    window.postMessage({
      type: 'JOYRIDE_RECORD_PROCESSED',
      payload: { vin, status, errorDetails }
    }, '*');
  }

  // ─── ERROR CLASSIFICATION (Enhanced) ────────────────────────────
  function classifyError(errorMessage) {
    const msg = (errorMessage || '').toLowerCase();
    // Non-retryable: data/business logic errors — skip immediately
    if (msg.includes('already enrolled') || msg.includes('already exist') || msg.includes('duplicate') ||
        msg.includes('invalid vin') || msg.includes('vin not found') || msg.includes('no data found') ||
        msg.includes('not eligible') || msg.includes('already active') ||
        msg.includes('expired membership') || msg.includes('not found in system') ||
        msg.includes('incorrect') || msg.includes('mismatch') ||
        msg.includes('portal alert error') || msg.includes('portal modal error') ||
        msg.includes('already done') || msg.includes('vin is required') ||
        msg.includes('joyride card number is required') || msg.includes('discount is required') ||
        msg.includes('date of birth is required') || msg.includes('city is required') ||
        msg.includes('nominee name is required') || msg.includes('nominee relationship is required') ||
        msg.includes('timeout waiting for element') || msg.includes('timed out') ||
        msg.includes('validation failed') || msg.includes('failed to advance') ||
        msg.includes('final submit blocked') || msg.includes('enrollment failed') ||
        msg.includes('preview error') || msg.includes('form invalid') ||
        msg.includes('no confirmation received') || msg.includes('failed to set dob') ||
        msg.includes('failed to set city'))
      return 'NON_RETRYABLE';
    // Fatal: session/auth errors — stop automation
    if (msg.includes('session') || msg.includes('login') || msg.includes('unauthorized') ||
        msg.includes('token') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403') ||
        msg.includes('session_expired'))
      return 'FATAL';
    return 'RETRYABLE';
  }

  // ─── NETWORK CONNECTION MONITOR ──────────────────────────────
  async function ensureNetworkOnline() {
    if (typeof navigator !== 'undefined' && navigator.onLine) return true;

    logMessage('🌐 Internet connection lost! Automation paused. Waiting for internet connection to restore...', 'warning');

    while (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (skipCurrentRequested) throw new Error('SKIPPED_BY_USER');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logMessage('🌐 Internet connection restored! Resuming automation...', 'success');
    return true;
  }

  // ─── SESSION HEALTH CHECK ─────────────────────────────────────
  async function checkSessionHealth() {
    await ensureNetworkOnline();
    const loginIndicators = document.querySelector('app-login, .login-form, #loginBtn, input[type="password"]:not([style*="display:none"])');
    if (loginIndicators) {
      logMessage('Session expired! Login page detected. Pausing automation.', 'error');
      throw new Error('SESSION_EXPIRED: Please log in and resume.');
    }
    const sessionExpiredAlert = document.querySelector('.swal2-popup');
    if (sessionExpiredAlert) {
      const text = (sessionExpiredAlert.textContent || '').toLowerCase();
      if (text.includes('session') || text.includes('login') || text.includes('expired') || text.includes('timeout')) {
        logMessage('Session expired alert detected! Pausing.', 'error');
        const btn = document.querySelector('button.swal2-confirm');
        if (btn) btn.click();
        throw new Error('SESSION_EXPIRED: Session timed out. Please log in and resume.');
      }
    }
  }

  function formatToYYYYMMDD(dateStr) {
    if (!dateStr) return '';
    let clean = String(dateStr).trim();

    // Strip time portion if present (e.g. "1986-01-01T00:00:00" or "01-01-1986 00:00:00")
    if (clean.includes('T')) clean = clean.split('T')[0].trim();
    if (clean.includes(' ')) clean = clean.split(' ')[0].trim();

    // Normalize separators (. and / to -)
    const normalized = clean.replace(/[\.\/]/g, '-');

    // 1. Check YYYY-MM-DD format (or YYYY-M-D)
    const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. Check DD-MM-YYYY format (or D-M-YYYY)
    const dmyMatch = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // 3. Month names (e.g. 01-Jan-1986, 1/Jan/1986, 1 Jan 1986)
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const monthNameMatch = clean.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3,9})[\s\-\/](\d{4})$/);
    if (monthNameMatch) {
      const day = monthNameMatch[1].padStart(2, '0');
      const mStr = monthNameMatch[2].toLowerCase().substring(0, 3);
      const year = monthNameMatch[3];
      if (months[mStr]) return `${year}-${months[mStr]}-${day}`;
    }

    // 4. Excel Serial Date Number (e.g. 31412)
    if (/^\d{5}$/.test(clean)) {
      const excelEpoch = new Date(1899, 11, 30);
      const targetDate = new Date(excelEpoch.getTime() + Number(clean) * 86400000);
      if (!isNaN(targetDate.getTime())) {
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // Fallback: JS Date parser
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return clean;
  }

  // ═══════════════════════════════════════════════════════════════
  // ELEMENT LOCK & FILLED HELPERS
  // Respect user rule: NEVER touch locked columns (disabled or readonly).
  // NEVER overwrite already-filled fields — skip them.
  // ═══════════════════════════════════════════════════════════════

  function isElementLocked(element) {
    if (!element) return true;
    if (element.disabled || element.hasAttribute('disabled') || element.getAttribute('disabled') !== null) return true;
    if (element.readOnly || element.hasAttribute('readonly') || element.getAttribute('readonly') !== null) return true;
    if (element.getAttribute('aria-disabled') === 'true') return true;
    if (element.classList && (element.classList.contains('disabled') || element.classList.contains('readonly'))) return true;
    if (element.closest && (element.closest('fieldset[disabled]') || element.closest('[disabled]'))) return true;
    try {
      const style = window.getComputedStyle(element);
      if (style && style.pointerEvents === 'none') return true;
    } catch (e) {}
    return false;
  }

  function isFieldFilled(element) {
    if (!element) return false;
    if (element.type === 'checkbox') {
      return !!element.checked;
    }
    if (element.tagName === 'SELECT') {
      if (element.selectedIndex <= 0) return false;
      const val = (element.value || '').trim();
      if (!val || val === '?' || val === '-1' || val === '0') return false;
      const optText = (element.options && element.options[element.selectedIndex]?.textContent || '').trim().toLowerCase();
      if (!optText || optText === 'select' || optText === '-- select --' || optText === 'choose' || optText.startsWith('select ')) return false;
      return true;
    }
    const val = (element.value || '').trim();
    if (!val) return false;
    const lower = val.toLowerCase();
    if (lower === 'na' || lower === 'n/a' || lower === 'null' || lower === 'none' || lower === 'undefined') return false;
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANGULAR-COMPATIBLE VALUE SETTER
  // Angular 18 uses reactive forms. We must dispatch proper events
  // so Angular picks up the value change.
  // ═══════════════════════════════════════════════════════════════

  function setAngularInputValue(element, value) {
    if (!element) return false;

    // Ignore locked columns (disabled or readonly) — do NOT unlock or write
    if (isElementLocked(element)) {
      logMessage(`Skipping locked column (${element.getAttribute('formcontrolname') || element.name || element.id || 'input'}) — field is disabled/readonly.`, 'info');
      return false;
    }

    // Skip if already filled with identical value
    const targetStr = value !== undefined && value !== null ? String(value).trim() : '';
    const currentStr = (element.value || '').trim();
    if (currentStr && targetStr && currentStr === targetStr) {
      logMessage(`Field (${element.getAttribute('formcontrolname') || element.name || element.id || 'input'}) already has value "${currentStr}" — skipping.`, 'info');
      return true;
    }

    // Focus the element first
    try {
      element.focus();
      element.click();
    } catch(e) {}

    // Use native input value setter to bypass Angular's property descriptor
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, value);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Dispatch events Angular listens to
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    // Also dispatch keyboard events for validators
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    return element.value === value;
  }

  // ─── DATE INPUT SETTER (type="date" & text fallback) ──────────
  async function setDateInputValue(element, dateValue, maxRetries = 3) {
    if (!element) return false;

    const formattedIso = formatToYYYYMMDD(dateValue); // YYYY-MM-DD
    if (!formattedIso) {
      logMessage(`Invalid date value: ${dateValue}`, 'error');
      return false;
    }

    const parts = formattedIso.split('-');
    const formattedSlash = `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    const formattedDash = `${parts[2]}-${parts[1]}-${parts[0]}`;  // DD-MM-YYYY

    const isDateInput = element.type === 'date';
    // For HTML5 type="date", ONLY YYYY-MM-DD is permitted by browser specs. Text inputs accept alternate formats.
    const candidateFormats = isDateInput ? [formattedIso] : [formattedIso, formattedSlash, formattedDash];

    // Ignore locked date inputs (disabled or readonly)
    if (isElementLocked(element)) {
      logMessage(`Date input is locked (disabled/readonly) — ignoring.`, 'info');
      return false;
    }

    // Skip already filled date inputs
    if (isFieldFilled(element)) {
      logMessage(`Date input already filled ("${element.value}") — skipping.`, 'info');
      return true;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const valToTry of candidateFormats) {
        element.focus();
        element.click();
        await fixedDelay(50);

        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;

        try {
          if (nativeSetter) {
            nativeSetter.call(element, valToTry);
          } else {
            element.value = valToTry;
          }
        } catch (err) {
          // Fallback if browser rejects non-ISO format
          if (nativeSetter) {
            nativeSetter.call(element, formattedIso);
          } else {
            element.value = formattedIso;
          }
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Try setting valueAsDate for type="date"
        if (isDateInput) {
          try {
            const [y, m, d] = formattedIso.split('-').map(Number);
            // CRITICAL FIX: Use Date.UTC to prevent local timezone offset shift (+5:30 IST shifting date back by 1 day)
            element.valueAsDate = new Date(Date.UTC(y, m - 1, d));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) { /* ignore */ }
        }

        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
        element.dispatchEvent(new Event('focusout', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        await fixedDelay(150);

        if (element.value && element.value.length >= 8 && !element.classList.contains('ng-invalid')) {
          logMessage(`DOB set successfully & Angular valid: "${element.value}" (attempt ${attempt})`, 'info');
          return true;
        }
      }

      // Method 3: Simulate key-by-key typing (only for text-based inputs)
      if (attempt >= 2 && !isDateInput) {
        try {
          element.focus();
          element.click();
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await fixedDelay(50);

          // Type DD/MM/YYYY character by character
          for (let i = 0; i < formattedSlash.length; i++) {
            const char = formattedSlash[i];
            element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
          }

          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          await fixedDelay(200);

          if (element.value && element.value.length >= 8) {
            logMessage(`DOB set via character typing fallback: "${element.value}" (attempt ${attempt})`, 'info');
            return true;
          }
        } catch (e) { /* ignore */ }
      }

      logMessage(`DOB set attempt ${attempt} failed. Retrying...`, 'warning');
      await fixedDelay(200);
    }

    logMessage(`DOB could not be verified. Current element value: "${element.value}"`, 'warning');
    return element.value && element.value.length >= 8;
  }

  function setAngularSelectValue(selectElement, value) {
    if (!selectElement) return;

    if (isElementLocked(selectElement)) {
      logMessage(`Skipping locked dropdown (${selectElement.getAttribute('formcontrolname') || selectElement.name || selectElement.id || 'select'}) — disabled.`, 'info');
      return;
    }

    try {
      selectElement.focus();
      selectElement.click();
    } catch (e) {}

    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype, 'value'
    )?.set;

    if (nativeSelectValueSetter) {
      nativeSelectValueSetter.call(selectElement, value);
    } else {
      selectElement.value = value;
    }

    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    selectElement.dispatchEvent(new Event('input', { bubbles: true }));
    selectElement.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // ─── LOCATION NAME NORMALIZER & ALIAS MATCHING ────────────────
  function normalizeLocation(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/[\.\,\-\/\'\"\(\)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const LOCATION_ALIASES = {
    'gurugram': 'gurgaon',
    'gurgaon': 'gurugram',
    'bengaluru': 'bangalore',
    'bangalore': 'bengaluru',
    'prayagraj': 'allahabad',
    'allahabad': 'prayagraj',
    'varanasi': 'banaras',
    'banaras': 'varanasi',
    'puducherry': 'pondicherry',
    'pondicherry': 'puducherry',
    'mumbai': 'bombay',
    'bombay': 'mumbai',
    'kolkata': 'calcutta',
    'calcutta': 'kolkata',
    'chennai': 'madras',
    'madras': 'chennai',
    'ayodhya': 'faizabad',
    'faizabad': 'ayodhya'
  };

  async function selectDropdownValueWhenReady(selectElement, value, description, timeoutMs = 8000) {
    if (!selectElement) {
      logMessage(`Cannot select value for ${description}: element not found`, 'error');
      return false;
    }

    if (isElementLocked(selectElement)) {
      logMessage(`Skipping locked dropdown ${description} — field is disabled/readonly.`, 'info');
      return false;
    }
    
    logMessage(`Waiting for options of ${description} to load...`, 'info');
    const start = Date.now();
    let optionsLoaded = false;
    while (Date.now() - start < timeoutMs) {
      const options = Array.from(selectElement.options).filter(opt => opt.value !== '');
      if (options.length > 0) {
        optionsLoaded = true;
        break;
      }
      await delay(200);
    }

    if (!optionsLoaded) {
      logMessage(`Timed out waiting for options of ${description} to load. Trying to set anyway...`, 'warning');
    }

    const valueStr = String(value).trim();
    const normValue = normalizeLocation(valueStr);
    const aliasValue = LOCATION_ALIASES[normValue] || normValue;

    // Check if dropdown already has matching value selected — skip if already filled
    if (isFieldFilled(selectElement)) {
      const curOpt = selectElement.options[selectElement.selectedIndex];
      const curText = (curOpt?.textContent || '').trim().toLowerCase();
      const curVal = (curOpt?.value || '').trim().toLowerCase();
      const targetLower = valueStr.toLowerCase();
      if ((curVal && curVal === targetLower) || (curText && curText === targetLower) ||
          (normValue && (normalizeLocation(curText) === normValue || normalizeLocation(curVal) === normValue)) ||
          (aliasValue && (normalizeLocation(curText) === aliasValue || normalizeLocation(curVal) === aliasValue))) {
        logMessage(`${description} already has "${curOpt?.textContent.trim()}" selected — skipping.`, 'info');
        return true;
      }
    }
    
    let matchedOption = null;

    // Stage 1: Exact Value or Text match
    for (const opt of Array.from(selectElement.options)) {
      const optVal = opt.value.trim();
      const optText = opt.textContent.trim();
      if (optVal.toLowerCase() === valueStr.toLowerCase() || optText.toLowerCase() === valueStr.toLowerCase()) {
        matchedOption = opt;
        break;
      }
    }

    // Stage 2: Normalized match (ignoring punctuation & case)
    if (!matchedOption) {
      for (const opt of Array.from(selectElement.options)) {
        const normOptVal = normalizeLocation(opt.value);
        const normOptText = normalizeLocation(opt.textContent);
        if (normOptVal === normValue || normOptText === normValue) {
          matchedOption = opt;
          break;
        }
      }
    }

    // Stage 3: Alias match (e.g. Gurugram <-> Gurgaon)
    if (!matchedOption) {
      for (const opt of Array.from(selectElement.options)) {
        const normOptVal = normalizeLocation(opt.value);
        const normOptText = normalizeLocation(opt.textContent);
        if (normOptVal === aliasValue || normOptText === aliasValue) {
          matchedOption = opt;
          break;
        }
      }
    }

    // Stage 4: Substring / Prefix match
    if (!matchedOption) {
      for (const opt of Array.from(selectElement.options)) {
        const normOptText = normalizeLocation(opt.textContent);
        if (normOptText.startsWith(normValue) || normValue.startsWith(normOptText) ||
            normOptText.includes(normValue) || normValue.includes(normOptText)) {
          matchedOption = opt;
          break;
        }
      }
    }

    if (matchedOption) {
      logMessage(`Found matching option for ${description}: value="${matchedOption.value}", text="${matchedOption.textContent.trim()}"`, 'info');
      
      selectElement.focus();
      selectElement.click();
      
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype, 'value'
      )?.set;

      if (nativeSelectValueSetter) {
        nativeSelectValueSetter.call(selectElement, matchedOption.value);
      } else {
        selectElement.value = matchedOption.value;
      }

      selectElement.selectedIndex = Array.from(selectElement.options).indexOf(matchedOption);
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      selectElement.dispatchEvent(new Event('input', { bubbles: true }));
      selectElement.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    } else {
      logMessage(`No matching option found for value "${value}" in ${description}. Setting directly.`, 'warning');
      setAngularSelectValue(selectElement, value);
      return selectElement.value === value || selectElement.selectedIndex > 0;
    }
  }

  async function waitForPricingToLoad(timeoutMs = 15000) {
    logMessage('Waiting for pricing details to calculate and load...', 'info');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const feeSpan = findElementByLabel('Fee (In INR)', 'span') || 
                      document.querySelector('app-online-enrolment span.form-control');
      const totalFeeSpan = findElementByLabel('Total Fee to be collected', 'span');
      
      const feeText = feeSpan ? feeSpan.textContent.trim() : '';
      const totalFeeText = totalFeeSpan ? totalFeeSpan.textContent.trim() : '';

      logMessage(`Pricing check - Fee: "${feeText}", Total Fee: "${totalFeeText}"`, 'debug');

      if (feeText && /\d+/.test(feeText) && totalFeeText && /\d+/.test(totalFeeText) && totalFeeText !== '0.00' && totalFeeText !== '0') {
        logMessage(`Pricing loaded successfully: Fee = ${feeText}, Total Fee = ${totalFeeText}`, 'info');
        return true;
      }
      await delay(500);
    }
    logMessage('Timed out waiting for pricing to load, proceeding anyway...', 'warning');
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // ELEMENT FINDERS WITH RETRY
  // ═══════════════════════════════════════════════════════════════

  function findElementByLabel(labelText, elementTag = 'select') {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
        if (label.htmlFor) {
          const el = document.getElementById(label.htmlFor);
          if (el && el.tagName.toLowerCase() === elementTag.toLowerCase()) return el;
        }
        
        // Traverse up to find form-group or row or col container
        let parent = label.parentElement;
        for (let i = 0; i < 4; i++) { // limit traversal to 4 levels
          if (!parent) break;
          const el = parent.querySelector(elementTag);
          if (el) return el;
          parent = parent.parentElement;
        }
      }
    }
    return null;
  }

  function waitForElement(selectorOrFn, timeoutMs = 15000, description = '') {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = async () => {
        if (skipCurrentRequested) {
          return reject(new Error('SKIPPED_BY_USER'));
        }
        try {
          await ensureNetworkOnline();
        } catch (netErr) {
          return reject(netErr);
        }
        let el;
        if (typeof selectorOrFn === 'function') {
          el = selectorOrFn();
        } else {
          el = document.querySelector(selectorOrFn);
        }
        if (el) {
          resolve(el);
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for element: ${description || selectorOrFn}`));
        } else {
          setTimeout(check, 300);
        }
      };
      check();
    });
  }

  function waitForElementGone(selector, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (!el || el.offsetParent === null) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          resolve(); // Don't reject — just continue
        } else {
          setTimeout(check, 300);
        }
      };
      check();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ANGULAR FORM VALIDATION ERROR CHECKER
  // Scans an Angular form container for inline validation error messages
  // and required fields that are still ng-invalid.
  // ═══════════════════════════════════════════════════════════════

  function checkAngularFormErrors(containerSelector) {
    const errors = [];
    const container = document.querySelector(containerSelector);
    if (!container) return errors;

    // 1. Check for visible Angular validation error messages
    //    Angular typically shows validation text in small/span/div near invalid inputs
    const errorTexts = container.querySelectorAll('.text-danger, .invalid-feedback, .error-message, .validation-error');
    for (const el of errorTexts) {
      const text = el.textContent.trim();
      // Only capture visible leaf elements with actual error text (not containers)
      if (text && text.length > 3 && text.length < 200 && el.offsetParent !== null && el.children.length <= 2) {
        // Skip elements that are just CSS class containers without meaningful error text
        if (!text.includes('Select') && !text.includes('form-control') && !text.includes('Owner Details') && !text.includes('GoodLife')) {
          errors.push(text);
        }
      }
    }

    // 2. Check for required fields that are still ng-invalid
    const invalidRequiredFields = container.querySelectorAll('.ng-invalid[required], .ng-invalid.ng-touched');
    for (const field of invalidRequiredFields) {
      if (field.tagName === 'FORM' || field.tagName === 'DIV') continue; // Skip form-level containers
      // Get the label for this field
      let fieldName = '';
      const label = field.closest('.col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6')?.querySelector('label');
      if (label) {
        fieldName = label.textContent.trim().replace(/\s*\*\s*$/, '');
      } else {
        fieldName = field.getAttribute('formcontrolname') || field.name || field.id || 'Unknown field';
      }
      
      // Only report if field is empty or has an invalid value
      const value = field.value;
      if (!value || value === '' || value === 'Select') {
        errors.push(`Missing required: ${fieldName}`);
      }
    }

    // 3. Check for visible "Please enter..." / "Please select..." messages  
    // IMPORTANT: Exclude static form labels (<label> elements, .col-form-label, .ms-2, and static declaration questions)
    const allTextNodes = container.querySelectorAll('div, span, small, p');
    for (const el of allTextNodes) {
      if (el.tagName === 'LABEL' || el.classList.contains('col-form-label') || el.classList.contains('ms-2')) continue;
      const text = el.textContent.trim().toLowerCase();
      if (el.offsetParent !== null && el.children.length === 0 && // leaf nodes only
          (text.startsWith('please enter') || text.startsWith('please select') || 
           text.includes('is required') || text.includes('must be') || 
           text.includes('digits') || text.includes('characters'))) {
        // Exclude static Hero MotoCorp employee question label text
        if (text.includes('employee of the hero motocorp') || text.includes('employee of hero motocorp')) continue;
        errors.push(el.textContent.trim());
      }
    }

    // Deduplicate
    return [...new Set(errors)];
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB CHANGE VERIFIER
  // After clicking "Next", verify that the active tab actually changed
  // by checking which tab container has the 'active' class.
  // ═══════════════════════════════════════════════════════════════

  async function verifyTabChanged(expectedTabId, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const tab = document.getElementById(expectedTabId);
      if (tab) {
        // Primary check: Angular adds 'active' or 'show' class to the active tab pane
        const hasActiveClass = tab.classList.contains('active') || tab.classList.contains('show');
        // Secondary check: tab content is rendered and visible (has height)
        const isVisible = tab.offsetHeight > 50; // Must have substantial height, not just a hidden container
        // Tertiary check: the tab's link/button is marked as active
        const tabLink = document.querySelector(`a[href*="${expectedTabId}"].active, li.active a[href*="${expectedTabId}"]`);
        
        if (hasActiveClass || (isVisible && tabLink)) {
          logMessage(`Tab ${expectedTabId} is now active.`, 'info');
          return true;
        }
        
        // Also check: can we find form controls specific to this tab that are visible?
        const tabInputs = tab.querySelectorAll('input, select, textarea');
        const visibleInputs = Array.from(tabInputs).filter(el => el.offsetParent !== null);
        if (visibleInputs.length > 0) {
          logMessage(`Tab ${expectedTabId} has ${visibleInputs.length} visible form controls — treating as active.`, 'info');
          return true;
        }
      }
      await fixedDelay(300);
    }
    logMessage(`Tab ${expectedTabId} did NOT become active within ${timeoutMs}ms`, 'error');
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // SWEETALERT2 HANDLER
  // The site uses SweetAlert2 for confirmations and alerts.
  // ═══════════════════════════════════════════════════════════════

  async function waitForSweetAlert(timeoutMs = 8000) {
    return waitForElement(() => {
      const popup = document.querySelector('.swal2-popup');
      if (popup && popup.offsetParent !== null) return popup;
      const container = document.querySelector('.swal2-container');
      if (container && container.style.display !== 'none') {
        return container.querySelector('.swal2-popup');
      }
      return null;
    }, timeoutMs, 'SweetAlert2 popup');
  }

  async function dismissSweetAlert(timeoutMs = 8000) {
    try {
      await waitForSweetAlert(timeoutMs);
      await fixedDelay(500); // Let animation complete

      // Get alert text for logging
      const titleEl = document.querySelector('.swal2-title');
      const contentEl = document.querySelector('.swal2-html-container');
      const alertText = (titleEl?.textContent || '') + ' ' + (contentEl?.textContent || '');
      logMessage(`SweetAlert: ${alertText.trim().substring(0, 100)}`, 'info');

      // Check if it's an error/warning alert based on text or icon
      const lowerText = alertText.toLowerCase();
      const isSuccess = lowerText.includes('success') || lowerText.includes('successfully') || lowerText.includes('data loaded');
      const hasErrorIcon = !!document.querySelector('.swal2-icon.swal2-error');
      
      if (hasErrorIcon || (!isSuccess && (
        lowerText.includes('already') ||
        lowerText.includes('invalid') ||
        lowerText.includes('not found') ||
        lowerText.includes('cannot') ||
        lowerText.includes('failed') ||
        lowerText.includes('error') ||
        lowerText.includes('warning') ||
        lowerText.includes('incorrect')
      ))) {
        const confirmBtn = document.querySelector('button.swal2-confirm');
        if (confirmBtn) confirmBtn.click();
        await fixedDelay(500);
        throw new Error(`Portal Alert Error: ${alertText.trim()}`);
      }

      // Click OK/Confirm button
      const confirmBtn = document.querySelector('button.swal2-confirm');
      if (confirmBtn) {
        confirmBtn.click();
        logMessage('SweetAlert dismissed (OK clicked).', 'info');
        await fixedDelay(500);
      }
    } catch (err) {
      if (err.message.includes('Portal Alert Error')) throw err;
      logMessage(`SweetAlert not found or timed out: ${err.message}`, 'warning');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP MODAL HANDLER
  // Used for validation result modals on the enrollment form.
  // ═══════════════════════════════════════════════════════════════

  async function waitForModal(timeoutMs = 5000) {
    return waitForElement(() => {
      const modal = document.querySelector('.modal.show, .modal.in, .modal[style*="display: block"]');
      if (modal) return modal;
      const footer = document.querySelector('div.modal-footer > button');
      if (footer && footer.offsetParent !== null) return footer.closest('.modal') || footer;
      return null;
    }, timeoutMs, 'Bootstrap modal');
  }

  async function dismissModal(timeoutMs = 5000) {
    try {
      await waitForModal(timeoutMs);
      await fixedDelay(500);

      // Get modal text for logging
      const modalBody = document.querySelector('.modal-body, .modal .modal-content');
      const modalText = modalBody ? modalBody.textContent.trim().substring(0, 150) : 'Unknown';
      logMessage(`Modal: ${modalText}`, 'info');

      // Check if the modal contains an error message
      const lowerText = modalText.toLowerCase();
      const isSuccess = lowerText.includes('success') || lowerText.includes('successfully') || lowerText.includes('validated') || lowerText.includes('data loaded');
      if (!isSuccess && (
        lowerText.includes('failed') ||
        lowerText.includes('error') ||
        lowerText.includes('invalid') ||
        lowerText.includes('already') ||
        lowerText.includes('not found') ||
        lowerText.includes('cannot') ||
        lowerText.includes('incorrect')
      )) {
        let okBtn = document.querySelector('.modal-footer button, div.modal-footer > button') ||
                   document.querySelector('.modal button');
        if (okBtn) {
          okBtn.click();
          await fixedDelay(500);
        }
        throw new Error(`Portal Modal Error: ${modalText}`);
      }

      // Click OK/Confirm button in modal
      let okBtn = null;
      
      // Look for a button with text "Ok" or "Confirm" or "Yes" inside any active modal
      const buttons = document.querySelectorAll('.modal button, .modal-content button, div[class*="modal"] button');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'ok' || text === 'confirm' || text === 'yes') {
          okBtn = btn;
          break;
        }
      }

      // Fallback 1: any button in modal-footer
      if (!okBtn) {
        okBtn = document.querySelector('.modal-footer button, div.modal-footer > button');
      }

      // Fallback 2: first button in the modal actions
      if (!okBtn) {
        okBtn = document.querySelector('.modal button');
      }

      if (okBtn) {
        okBtn.click();
        logMessage('Modal dismissed (OK clicked).', 'info');
        await fixedDelay(800);
        // Wait for modal to fully close
        await waitForElementGone('.modal.show, .modal.in, .modal[style*="display: block"]', 5000);
        await fixedDelay(300);
      } else {
        logMessage('No OK/Confirm button found in modal', 'warning');
      }
    } catch (err) {
      if (err.message.includes('Portal Modal Error')) throw err;
      logMessage(`Modal not found: ${err.message}`, 'warning');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION HELPER
  // ═══════════════════════════════════════════════════════════════

  async function navigateToEnrollmentPage() {
    const currentUrl = window.location.href;
    if (currentUrl.includes('joyride/online-enrolment')) {
      logMessage('Already on enrollment page.', 'info');
      return;
    }

    logMessage('Navigating to Joyride enrollment page...', 'info');

    // Try clicking the nav link first
    const navLink = document.querySelector('a[href*="joyride/online-enrolment"]');
    if (navLink) {
      navLink.click();
      await delay(2000);
      return;
    }

    // Fallback: direct hash navigation
    window.location.hash = '#/joyride/online-enrolment';
    await delay(2000);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: ENTER VIN AND CLICK GO
  // ═══════════════════════════════════════════════════════════════

  async function enterVINAndSearch(vin) {
    logMessage(`Step 1: Entering VIN ${vin}...`, 'info');

    // Wait for the VIN input field to be available
    // Selector from workflow: div > div > div > div input (the main VIN input)
    const vinInput = await waitForElement(() => {
      // Try the specific Angular selector
      const inputs = document.querySelectorAll('app-online-enrolment input[type="text"]');
      for (const inp of inputs) {
        if (inp.maxLength === 17 || inp.minLength === 10 ||
            (inp.pattern && inp.pattern.includes('A-Za-z'))) {
          return inp;
        }
      }
      // Fallback: first text input in the tabs-container
      const container = document.querySelector('.tabs-container');
      if (container) {
        const firstInput = container.querySelector('input[type="text"]');
        if (firstInput) return firstInput;
      }
      // Final fallback: xpath from workflow
      return document.querySelector('app-online-enrolment div div div div input[type="text"]');
    }, 10000, 'VIN input field');

    // Clear existing value and enter new VIN
    vinInput.value = '';
    setAngularInputValue(vinInput, vin);

    // Tab out to trigger validation
    vinInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
    vinInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
    await delay(500);

    logMessage(`VIN ${vin} entered. Clicking Go...`, 'info');

    // Click "Go" button
    const goBtn = await waitForElement(() => {
      // Try text match first
      const buttons = document.querySelectorAll('app-online-enrolment button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Go') return btn;
      }
      // Fallback: primary button near VIN input
      return document.querySelector('app-online-enrolment .tabs-container button.btn-primary');
    }, 5000, 'Go button');

    goBtn.click();
    logMessage('Go button clicked. Waiting for data...', 'info');
    await delay(2000);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: DISMISS DATA LOAD SWEETALERT
  // After Go, the site shows a SweetAlert2 popup confirming data load.
  // ═══════════════════════════════════════════════════════════════

  async function handleDataLoadAlert() {
    logMessage('Step 2: Handling data load alert...', 'info');
    await dismissSweetAlert(15000);
    await delay(1000);
    logMessage('Data load alert handled.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2b: HANDLE JOYRIDE OWNER DETAILS (Mobile, Email, District, City)
  // Ensures all required owner details fields are populated and valid,
  // preventing validation errors like "District is required",
  // "City is required", and "Invalid email format" (e.g. when DMS puts "na").
  // ═══════════════════════════════════════════════════════════════

  async function handleJoyrideOwnerDetails({ mobile, email, district, city, vin }) {
    logMessage('Step 2b: Checking Owner Details (Mobile, Email, District, City)...', 'info');

    // 1. Mobile Number — skip if locked or already filled
    try {
      const mobileInput = document.querySelector('input[formcontrolname="mobile"]') ||
                          findElementByLabel('Mobile', 'input') ||
                          document.querySelector('#mobile');
      if (mobileInput) {
        if (isElementLocked(mobileInput)) {
          logMessage(`Mobile input is locked (disabled/readonly) — ignoring.`, 'info');
        } else if (isFieldFilled(mobileInput)) {
          logMessage(`Mobile already filled ("${mobileInput.value}") — skipping.`, 'info');
        } else if (mobile && String(mobile).trim() !== '') {
          const rawMobile = String(mobile).trim();
          const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
          if (cleanMobile.length === 10) {
            logMessage(`Setting Mobile No to "${cleanMobile}" for VIN ${vin}...`, 'info');
            setAngularInputValue(mobileInput, cleanMobile);
            mobileInput.dispatchEvent(new Event('input', { bubbles: true }));
            mobileInput.dispatchEvent(new Event('change', { bubbles: true }));
            mobileInput.dispatchEvent(new Event('blur', { bubbles: true }));
            await fixedDelay(300);
          }
        }
      }
    } catch (e) {
      logMessage(`Mobile update error: ${e.message}`, 'warning');
    }

    // 2. Email — skip if locked or already filled with valid email
    try {
      const emailInput = document.querySelector('input[formcontrolname="email"]') ||
                         document.querySelector('input[formcontrolname="ownerEmail"]') ||
                         findElementByLabel('Email', 'input') ||
                         document.querySelector('#email');
      if (emailInput) {
        if (isElementLocked(emailInput)) {
          logMessage(`Email input is locked (disabled/readonly) — ignoring.`, 'info');
        } else {
          const curVal = (emailInput.value || '').trim();
          const curLower = curVal.toLowerCase();
          const curIsValid = curVal.includes('@') && curVal.includes('.') && curVal.length >= 5;

          if (curIsValid) {
            logMessage(`Email already filled with valid email ("${curVal}") — skipping.`, 'info');
          } else if (curLower === 'na' || curLower === 'n/a' || curLower === 'none' || curLower === 'null' || (curVal.length > 0 && !curIsValid)) {
            // Portal loaded "na" or invalid DMS placeholder which fails Angular validator
            const cleanEmail = email ? String(email).trim() : '';
            const isPayloadValid = cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5;
            if (isPayloadValid) {
              logMessage(`Replacing invalid DMS email ("${curVal}") with "${cleanEmail}" for VIN ${vin}...`, 'info');
              setAngularInputValue(emailInput, cleanEmail);
            } else {
              logMessage(`Clearing invalid DMS email "${curVal}" to fix format error...`, 'info');
              setAngularInputValue(emailInput, '');
            }
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
            await fixedDelay(300);
          } else if (!curVal && email) {
            const cleanEmail = String(email).trim();
            if (cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5) {
              logMessage(`Setting Email to "${cleanEmail}" for VIN ${vin}...`, 'info');
              setAngularInputValue(emailInput, cleanEmail);
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
              emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
              await fixedDelay(300);
            }
          }
        }
      }
    } catch (e) {
      logMessage(`Email update error: ${e.message}`, 'warning');
    }

    // 3. District & City — skip if locked or already selected
    try {
      const districtSelect = document.querySelector('#district') || document.querySelector('select[formcontrolname="district"]');
      const stateSelect = document.querySelector('#state') || document.querySelector('select[formcontrolname="state"]');
      const citySelect = document.querySelector('#city') || document.querySelector('select[formcontrolname="city"]');

      if (districtSelect) {
        if (isElementLocked(districtSelect)) {
          logMessage('District dropdown is locked — ignoring.', 'info');
        } else if (isFieldFilled(districtSelect)) {
          logMessage(`District already filled ("${districtSelect.options[districtSelect.selectedIndex]?.text.trim()}") — skipping.`, 'info');
          // Re-fire change event to cascade to city if city is not filled
          if (citySelect && !isElementLocked(citySelect) && !isFieldFilled(citySelect)) {
            districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
            districtSelect.dispatchEvent(new Event('input', { bubbles: true }));
            await fixedDelay(600);
          }
        } else {
          // District is empty / "Select" — need to set it!
          let districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');

          // If district has no options, re-trigger state change to load them
          if (districtOptions.length === 0 && stateSelect && stateSelect.value && stateSelect.selectedIndex > 0) {
            logMessage(`District options empty. Re-triggering state change to load districts...`, 'info');
            stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
            stateSelect.dispatchEvent(new Event('input', { bubbles: true }));
            await fixedDelay(800);

            const pollStart = Date.now();
            while (Date.now() - pollStart < 6000) {
              districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
              if (districtOptions.length > 0) break;
              await fixedDelay(300);
            }
          }

          const targetDistrict = district || city || '';
          if (targetDistrict) {
            logMessage(`Setting District to "${targetDistrict}" for VIN ${vin}...`, 'info');
            if (districtOptions.length === 0) {
              const pollStart2 = Date.now();
              while (Date.now() - pollStart2 < 5000) {
                districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
                if (districtOptions.length > 0) break;
                await fixedDelay(300);
              }
            }

            if (districtOptions.length > 0) {
              await selectDropdownValueWhenReady(districtSelect, targetDistrict, 'District', 5000);
              await fixedDelay(600);

              if (!districtSelect.value || districtSelect.value === '' || districtSelect.selectedIndex <= 0) {
                if (district && city && district !== city) {
                  logMessage(`District mismatch, trying city fallback "${city}"...`, 'warning');
                  await selectDropdownValueWhenReady(districtSelect, city, 'District (city fallback)', 3000);
                  await fixedDelay(500);
                }
              }
            }
          }

          // Fire change event on district to cascade to city dropdown
          if (districtSelect.value && districtSelect.value !== '' && districtSelect.selectedIndex > 0) {
            districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
            districtSelect.dispatchEvent(new Event('input', { bubbles: true }));
            await fixedDelay(600);
          }
        }
      }

      // 4. City — skip if locked or already selected
      if (citySelect) {
        if (isElementLocked(citySelect)) {
          logMessage('City dropdown is locked — ignoring.', 'info');
        } else if (isFieldFilled(citySelect)) {
          logMessage(`City already filled ("${citySelect.options[citySelect.selectedIndex]?.text.trim()}") — skipping.`, 'info');
        } else {
          // City is empty / "Select" — need to set it!
          const targetCity = city || district || '';
          if (targetCity) {
            logMessage(`Setting City to "${targetCity}" for VIN ${vin}...`, 'info');
            let cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');

            if (cityOptions.length === 0 && districtSelect && districtSelect.value) {
              districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
              districtSelect.dispatchEvent(new Event('input', { bubbles: true }));
              await fixedDelay(800);
              const pollStart = Date.now();
              while (Date.now() - pollStart < 6000) {
                cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                if (cityOptions.length > 0) break;
                await fixedDelay(300);
              }
            }

            let citySuccess = false;
            for (let cityAttempt = 1; cityAttempt <= 3; cityAttempt++) {
              cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
              if (cityOptions.length === 0) {
                await fixedDelay(1000);
                continue;
              }

              await selectDropdownValueWhenReady(citySelect, targetCity, `City (attempt ${cityAttempt})`, 5000);
              await fixedDelay(300);

              if (citySelect.value && citySelect.value !== '' && citySelect.selectedIndex > 0) {
                citySuccess = true;
                logMessage(`City confirmed set: "${citySelect.options[citySelect.selectedIndex]?.text}"`, 'info');
                break;
              }
              await fixedDelay(800);
            }

            if (!citySuccess) {
              logMessage(`Could not match City "${targetCity}". Available: ${Array.from(citySelect.options).map(o => o.text.trim()).join(', ')}`, 'warning');
            }
          }
        }
      }

      // Final District check
      if (districtSelect && !isElementLocked(districtSelect) && !isFieldFilled(districtSelect)) {
        const fallbackDist = district || city || '';
        if (fallbackDist) {
          await selectDropdownValueWhenReady(districtSelect, fallbackDist, 'District (rescue)', 3000);
          await fixedDelay(300);
        }
      }
    } catch (e) {
      logMessage(`District/City update error: ${e.message}`, 'warning');
    }

    logMessage('Owner details verification complete.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: CHECK "MEMBER INTERESTED FOR JOYRIDE" CHECKBOX
  // ═══════════════════════════════════════════════════════════════

  async function checkJoyrideCheckbox() {
    logMessage('Step 3: Checking Joyride interest checkbox...', 'info');

    const checkbox = await waitForElement(() => {
      // Find by id (there might be multiple toggleAddress checkboxes)
      const checkboxes = document.querySelectorAll('input[type="checkbox"]#toggleAddress');
      for (const cb of checkboxes) {
        // Get the label next to it
        const label = cb.parentElement?.querySelector('label');
        if (label && label.textContent.includes('Joyride')) return cb;
      }
      // Fallback: first toggleAddress checkbox
      return document.querySelector('#toggleAddress');
    }, 10000, 'Joyride checkbox');

    if (isElementLocked(checkbox)) {
      logMessage('Joyride checkbox is locked (disabled/readonly) — ignoring.', 'info');
      return;
    }

    if (checkbox.checked) {
      logMessage('Joyride checkbox already checked — skipping.', 'info');
      return;
    }

    checkbox.click();
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(500);

    logMessage('Joyride checkbox checked.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: SELECT TRANSACTION TYPE DROPDOWN
  // ═══════════════════════════════════════════════════════════════

  async function selectTransactionType(value) {
    logMessage(`Step 4: Setting transaction type to "${value}"...`, 'info');

    const select = await waitForElement('#transactionType', 10000, 'Transaction Type dropdown');
    if (isElementLocked(select)) {
      logMessage('Transaction Type dropdown is locked — ignoring.', 'info');
      return;
    }
    if (isFieldFilled(select)) {
      const curOpt = select.options[select.selectedIndex];
      const curText = (curOpt?.textContent || '').trim().toLowerCase();
      const curVal = (select.value || '').trim().toLowerCase();
      const targetVal = String(value || '').trim().toLowerCase();
      if (curVal === targetVal || curText === targetVal || (targetVal === 'n' && curText.includes('new')) || (targetVal === 'r' && curText.includes('renewal'))) {
        logMessage(`Transaction Type already filled ("${curOpt?.textContent.trim()}") — skipping.`, 'info');
        return;
      }
    }
    await selectDropdownValueWhenReady(select, value, 'Transaction Type');
    await delay(800);

    logMessage('Transaction type set.', 'info');
  }

  async function checkIfTransactionTypeIsRenewal(select) {
    if (!select) return false;

    const val = select.value || '';
    const selectedOption = select.options[select.selectedIndex];
    const text = selectedOption ? selectedOption.textContent.trim().toLowerCase() : '';

    if (val === 'R' || val.toLowerCase().includes('renewal') || text.includes('renewal')) {
      return true;
    }

    const options = Array.from(select.options).filter(o => o.value && o.value !== '' && o.value !== '?');
    if (options.length === 1) {
      const onlyOptText = options[0].textContent.trim().toLowerCase();
      const onlyOptVal = options[0].value;
      if (onlyOptVal === 'R' || onlyOptText.includes('renewal')) {
        return true;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: SELECT JOYRIDE YEAR (1st dropdown after transaction type)
  // ═══════════════════════════════════════════════════════════════

  async function selectJoyrideYear(value) {
    logMessage(`Step 5: Setting Joyride year to "${value}"...`, 'info');

    const yearSelect = await waitForElement(() => {
      return findElementByLabel('Duration', 'select') ||
             findElementByLabel('Year', 'select') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) div:nth-of-type(2) > select') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) select');
    }, 10000, 'Joyride Year dropdown');

    if (isElementLocked(yearSelect)) {
      logMessage('Joyride Year dropdown is locked — ignoring.', 'info');
      return;
    }
    if (isFieldFilled(yearSelect)) {
      const curOpt = yearSelect.options[yearSelect.selectedIndex];
      const curText = (curOpt?.textContent || '').trim().toLowerCase();
      const curVal = (yearSelect.value || '').trim().toLowerCase();
      const targetVal = String(value || '').trim().toLowerCase();
      if (curVal === targetVal || curText === targetVal || curText.startsWith(targetVal)) {
        logMessage(`Joyride Year already filled ("${curOpt?.textContent.trim()}") — skipping.`, 'info');
        return;
      }
    }
    await selectDropdownValueWhenReady(yearSelect, value, 'Joyride Year');
    await delay(800);

    logMessage('Joyride year selected.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: SELECT JOYRIDE PACKAGE (2nd dropdown)
  // ═══════════════════════════════════════════════════════════════

  async function selectJoyridePackage(value) {
    logMessage(`Step 6: Setting Joyride package to "${value}"...`, 'info');

    const pkgSelect = await waitForElement(() => {
      return findElementByLabel('Package', 'select') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) > div:nth-of-type(3) select');
    }, 10000, 'Joyride Package dropdown');

    if (isElementLocked(pkgSelect)) {
      logMessage('Joyride Package dropdown is locked — ignoring.', 'info');
      return;
    }
    if (isFieldFilled(pkgSelect)) {
      const curOpt = pkgSelect.options[pkgSelect.selectedIndex];
      const curText = (curOpt?.textContent || '').trim().toLowerCase();
      const curVal = (pkgSelect.value || '').trim().toLowerCase();
      const targetVal = String(value || '').trim().toLowerCase();
      if (curVal === targetVal || curText === targetVal || curText.includes(targetVal)) {
        logMessage(`Joyride Package already filled ("${curOpt?.textContent.trim()}") — skipping.`, 'info');
        return;
      }
    }
    await selectDropdownValueWhenReady(pkgSelect, value, 'Joyride Package');
    await delay(800);

    logMessage('Joyride package selected.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: ENTER PAYMENT DETAILS (Joyride Card Number + Discount)
  // ═══════════════════════════════════════════════════════════════

  async function enterPaymentDetails(paymentNumber, paymentAmount) {
    logMessage(`Step 7: Entering payment details...`, 'info');

    // Payment Number input (labeled Card No)
    const paymentNumInput = await waitForElement(() => {
      return findElementByLabel('Card No', 'input') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) > div:nth-of-type(4) > div:nth-of-type(1) > input');
    }, 10000, 'Joyride Card Number input');

    if (isElementLocked(paymentNumInput)) {
      logMessage('Joyride Card Number input is locked — ignoring.', 'info');
    } else if (isFieldFilled(paymentNumInput) && paymentNumInput.value.trim() === String(paymentNumber || '').trim()) {
      logMessage(`Joyride Card Number already filled ("${paymentNumInput.value}") — skipping.`, 'info');
    } else {
      setAngularInputValue(paymentNumInput, paymentNumber);
      paymentNumInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
      paymentNumInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
      await delay(500);
    }

    // Payment Amount input (labeled Joyride Discount / Discount)
    const paymentAmtInput = await waitForElement(() => {
      return findElementByLabel('Discount', 'input') ||
             findElementByLabel('Joyride Discount', 'input') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) > div:nth-of-type(4) > div:nth-of-type(2) input') ||
             document.querySelector('app-online-enrolment form div:nth-of-type(11) div:nth-of-type(4) div:nth-of-type(2) div input');
    }, 10000, 'Discount input');

    if (isElementLocked(paymentAmtInput)) {
      logMessage('Joyride Discount input is locked — ignoring.', 'info');
    } else if (isFieldFilled(paymentAmtInput) && paymentAmtInput.value.trim() === String(paymentAmount || '').trim()) {
      logMessage(`Joyride Discount already filled ("${paymentAmtInput.value}") — skipping.`, 'info');
    } else {
      setAngularInputValue(paymentAmtInput, paymentAmount);
      paymentAmtInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
      paymentAmtInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
      await delay(500);
    }

    logMessage(`Card#: ${paymentNumber}, Discount: ₹${paymentAmount}`, 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: CLICK VALIDATE (twice — the workflow does it twice)
  // ═══════════════════════════════════════════════════════════════

  async function clickValidate() {
    logMessage('Step 8: Clicking Validate...', 'info');

    // Find Validate button
    const validateBtn = await waitForElement(() => {
      const buttons = document.querySelectorAll('app-online-enrolment button');
      for (const btn of buttons) {
        if (btn.textContent.trim().includes('Validate') && btn.classList.contains('btn-info')) {
          return btn;
        }
      }
      return document.querySelector('button.btn-info');
    }, 10000, 'Validate button');

    // First validation pass
    validateBtn.click();
    logMessage('Validate clicked (1st pass). Waiting for modal...', 'info');
    await delay(2000);

    // Dismiss the validation result modal
    await dismissModal(15000);
    await delay(1000);

    // Second validation pass (as per workflow — clicked twice)
    logMessage('Clicking Validate (2nd pass)...', 'info');
    const validateBtn2 = document.querySelector('button.btn-info') ||
      Array.from(document.querySelectorAll('app-online-enrolment button'))
        .find(b => b.textContent.trim().includes('Validate'));

    if (validateBtn2) {
      validateBtn2.click();
      await delay(2000);
      await dismissModal(15000);
      await delay(1000);
    }

    logMessage('Validation complete.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 9: SUBMIT JOYRIDE
  // ═══════════════════════════════════════════════════════════════

  async function submitJoyride() {
    logMessage('Step 9: Submitting Joyride enrollment...', 'info');

    // Find Submit Joyride button
    const submitBtn = await waitForElement(() => {
      const buttons = document.querySelectorAll('app-online-enrolment button');
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        if (text.includes('Submit Joyride') || text.includes('Submit')) {
          if (btn.classList.contains('btn-primary') && !btn.classList.contains('btn-info')) {
            return btn;
          }
        }
      }
      return document.querySelector('form button.btn-primary');
    }, 10000, 'Submit Joyride button');

    if (submitBtn.disabled) {
      logMessage('Submit button is disabled — checking form errors...', 'warning');
      const errors = checkAngularFormErrors('app-online-enrolment');
      if (errors.length > 0) {
        throw new Error(`Submit Joyride disabled due to validation errors: ${errors.join('; ')}`);
      }
    }

    submitBtn.click();
    logMessage('Submit clicked. Waiting for confirmation...', 'info');
    await delay(2000);

    // Require explicit SweetAlert success confirmation for Joyride too
    let joyrideSubmitSuccess = false;
    let joyrideSubmitError = '';
    try {
      await waitForSweetAlert(20000);
      await fixedDelay(500);

      const titleEl = document.querySelector('.swal2-title');
      const contentEl = document.querySelector('.swal2-html-container');
      const alertText = ((titleEl?.textContent || '') + ' ' + (contentEl?.textContent || '')).trim();
      const lowerText = alertText.toLowerCase();
      const hasSuccessIcon = !!document.querySelector('.swal2-icon.swal2-success');
      const hasErrorIcon = !!document.querySelector('.swal2-icon.swal2-error');

      logMessage(`Joyride Submit SweetAlert: ${alertText.substring(0, 120)}`, 'info');

      const confirmBtn = document.querySelector('button.swal2-confirm');
      if (confirmBtn) confirmBtn.click();
      await fixedDelay(500);

      if (hasErrorIcon) {
        joyrideSubmitError = alertText;
      } else if (hasSuccessIcon || lowerText.includes('success') || lowerText.includes('successfully') || lowerText.includes('saved') || lowerText.includes('enrolled')) {
        joyrideSubmitSuccess = true;
      } else if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('invalid') || lowerText.includes('already') || lowerText.includes('not found') || lowerText.includes('cannot') || lowerText.includes('incorrect')) {
        joyrideSubmitError = alertText;
      } else {
        logMessage(`Unknown Joyride SweetAlert, treating as success: "${alertText.substring(0, 80)}"`, 'warning');
        joyrideSubmitSuccess = true;
      }
    } catch (swalErr) {
      logMessage('No SweetAlert appeared after Joyride Submit — submit likely failed.', 'error');
      joyrideSubmitError = 'No confirmation received after Submit. Form may have validation errors.';
    }

    if (!joyrideSubmitSuccess) {
      throw new Error(`Joyride enrollment failed: ${joyrideSubmitError || 'Unknown error after Submit'}`);
    }

    await delay(1000);
    logMessage('Joyride submitted successfully!', 'success');
  }

  // ═══════════════════════════════════════════════════════════════
  // FORM RESET — Clear the form for next VIN
  // After submission, we need to reset for the next record.
  // ═══════════════════════════════════════════════════════════════

  async function resetFormForNextVIN() {
    logMessage('Resetting form for next VIN...', 'info');

    // Check if we're still on the enrollment page
    if (!window.location.href.includes('joyride/online-enrolment')) {
      // Navigate back
      window.location.hash = '#/joyride/online-enrolment';
      await delay(2000);
    }

    // Clear the VIN input if it still has value
    const vinInput = document.querySelector('app-online-enrolment input[type="text"][maxlength="17"]') ||
                     document.querySelector('app-online-enrolment .tabs-container input[type="text"]');
    if (vinInput) {
      vinInput.value = '';
      vinInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await delay(500);
    logMessage('Form ready for next VIN.', 'info');
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN ORCHESTRATION — processRow
  // ═══════════════════════════════════════════════════════════════

  async function processRow(payload) {
    const {
      vin,
      mobile,
      email,
      district,
      city,
      transaction_type = 'N',
      joyride_year = '1',
      joyride_package = '2',
      joyride_card_number,
      discount,
      speed_multiplier,
      max_retries: payloadRetries,
      speed_mode: payloadSpeedMode,
      skip_renewals: payloadSkipRenewals
    } = payload;

    // Apply speed and retry settings
    if (speed_multiplier !== undefined) speedMultiplier = speed_multiplier;
    if (payloadRetries !== undefined) maxRetries = payloadRetries;
    if (payloadSpeedMode !== undefined) speedMode = payloadSpeedMode;
    if (payloadSkipRenewals !== undefined) skipRenewals = payloadSkipRenewals;

    // Reset skip flag for new row
    skipCurrentRequested = false;

    // Fast skip if transaction is Renewal and skip_renewals setting is enabled
    const transTypeStr = String(transaction_type).trim().toUpperCase();
    if (skipRenewals && (transTypeStr === 'R' || transTypeStr.includes('RENEWAL'))) {
      logMessage(`VIN ${vin} transaction_type is Renewal ("${transaction_type}"). Auto-skipping per Skip Renewals setting...`, 'warning');
      sendResponse(vin, 'Skipped', 'Renewal VIN auto-skipped per settings.');
      return;
    }

    // Validate required fields — fast-fail with response
    if (!vin) { sendResponse('UNKNOWN', 'Error', 'VIN is required.'); return; }
    if (!joyride_card_number) { sendResponse(vin, 'Error', 'Joyride card number is required.'); return; }
    if (!discount) { sendResponse(vin, 'Error', 'Discount is required.'); return; }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (skipCurrentRequested) {
          logMessage(`Skip in progress for VIN ${vin}`, 'warning');
          sendResponse(vin, 'Skipped', 'Skipped by user request');
          return;
        }

        if (attempt > 1) {
          logMessage(`Retry ${attempt}/${maxRetries} for VIN ${vin}`, 'warning');
          await fixedDelay(3000);
          // Re-navigate on retry
          await navigateToEnrollmentPage();
          await delay(1500);
        }

        // Session health check
        await checkSessionHealth();

        // Step 0: Ensure we're on the enrollment page
        await timedOperation('navigate', () => navigateToEnrollmentPage());
        await waitForDOMStable(3000);

        // Step 1: Enter VIN and search
        await timedOperation('enterVIN', () => enterVINAndSearch(vin));

        // Step 2: Handle data load SweetAlert
        await timedOperation('dataLoadAlert', () => handleDataLoadAlert());

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // Wait for Angular form to stabilize after data load
        await waitForDOMStable(2000, 300);

        // Step 2b: Handle Owner Details (Mobile, Email, District, City)
        await timedOperation('ownerDetails', () => handleJoyrideOwnerDetails({ mobile, email, district, city, vin }));

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // Step 3: Check Joyride checkbox
        await checkJoyrideCheckbox();

        // Check if transaction type shows Renewal and skip if setting is ON
        const transTypeSelect = await waitForElement('#transactionType', 10000, 'Transaction Type dropdown');
        const isRenewal = await checkIfTransactionTypeIsRenewal(transTypeSelect);
        if (isRenewal && skipRenewals) {
          logMessage(`Skipped VIN ${vin}: Transaction type is Renewal (auto-skip enabled).`, 'warning');
          sendResponse(vin, 'Skipped', 'Skipped: Transaction type is Renewal');
          await resetFormForNextVIN();
          return;
        } else if (isRenewal && !skipRenewals) {
          logMessage(`VIN ${vin}: Transaction type is Renewal — processing anyway (skip disabled).`, 'info');
        }

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // Step 4: Select transaction type
        await timedOperation('selectTransType', () => selectTransactionType(transaction_type));

        // Step 5: Select Joyride year
        await timedOperation('selectYear', () => selectJoyrideYear(joyride_year));

        // Step 6: Select Joyride package
        await timedOperation('selectPackage', () => selectJoyridePackage(joyride_package));

        // Wait for pricing details to calculate and load
        await timedOperation('pricingLoad', () => waitForPricingToLoad(15000));

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // Step 7: Enter payment details
        await timedOperation('paymentDetails', () => enterPaymentDetails(joyride_card_number, discount));

        // Step 8: Validate (twice)
        await timedOperation('validate', () => clickValidate());

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // Step 9: Submit
        await timedOperation('submit', () => submitJoyride());

        // Reset for next VIN
        await resetFormForNextVIN();

        // Success!
        sendResponse(vin, 'Success');
        return;

      } catch (err) {
        console.error(`[Joyride Enrollor] Error (attempt ${attempt}/${maxRetries}):`, err);
        lastError = err;

        if (err.message === 'SKIPPED_BY_USER' || skipCurrentRequested) {
          logMessage(`VIN ${vin} skipped by user request.`, 'warning');
          sendResponse(vin, 'Skipped', 'Skipped by user request');
          return;
        }

        // Smart error classification
        const errClass = classifyError(err.message);
        if (errClass === 'FATAL') {
          logMessage(`FATAL: ${err.message}. Stopping automation.`, 'error');
          sendResponse(vin, 'Error', err.message);
          return;
        }
        if (errClass === 'NON_RETRYABLE') {
          logMessage(`Non-retryable error for VIN ${vin}: ${err.message}`, 'warning');
          sendResponse(vin, 'Error', err.message);
          return;
        }

        // Try to dismiss any lingering popups and reset form
        try {
          const swalBtn = document.querySelector('button.swal2-confirm');
          if (swalBtn) swalBtn.click();
        } catch (e) { /* ignore */ }
        try {
          const modalBtn = document.querySelector('div.modal-footer > button');
          if (modalBtn) modalBtn.click();
        } catch (e) { /* ignore */ }
        // Quick form reset on error for clean next attempt
        try { await resetFormForNextVIN(); } catch (e) { /* ignore */ }
      }
    }

    // All retries exhausted
    sendResponse(vin, 'Error', lastError ? lastError.message : 'Unknown error after all retries.');
  }

  // ═══════════════════════════════════════════════════════════════
  // GOODLIFE AUTOMATION FLOW
  // ═══════════════════════════════════════════════════════════════

  async function navigateToGoodLifePage() {
    const currentUrl = window.location.href;
    if (currentUrl.includes('profile/profilegl')) {
      return;
    }
    logMessage('Navigating to GoodLife Apply Online page...', 'info');
    
    const navLink = document.querySelector('a[href*="profile/profilegl"]');
    if (navLink) {
      navLink.click();
      await delay(1500);
      return;
    }
    
    window.location.hash = '#/profile/profilegl';
    await delay(1500);
  }

  async function enterGoodLifeVINAndSearch(vin) {
    logMessage(`Entering VIN: ${vin}`, 'info');
    
    const vinInput = await waitForElement(() => {
      const c1 = document.getElementById('c1');
      return c1 ? c1.querySelector('input[type="text"]') : null;
    }, 8000, 'GoodLife VIN input field');
    
    vinInput.value = '';
    setAngularInputValue(vinInput, vin);
    await delay(300);

    const goBtn = await waitForElement(() => {
      const c1 = document.getElementById('c1');
      if (c1) {
        const buttons = c1.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim().toLowerCase() === 'go') return btn;
        }
      }
      return null;
    }, 5000, 'GoodLife Go button');

    goBtn.click();
    logMessage('Go button clicked. Waiting for details...', 'info');
    await delay(1500);
  }

  async function checkAndDismissPopups(timeoutMs = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const swal = document.querySelector('.swal2-popup');
      if (swal && swal.offsetParent !== null) {
        logMessage('SweetAlert popup detected. Dismissing...', 'info');
        await dismissSweetAlert(2000);
        return true;
      }
      const modal = document.querySelector('.modal.show, .modal.in, .modal[style*="display: block"]');
      if (modal && modal.offsetParent !== null) {
        logMessage('Modal popup detected. Dismissing...', 'info');
        await dismissModal(2000);
        return true;
      }
      await fixedDelay(200);
    }
    return false;
  }

  async function resetGoodLifeFormForNextVIN() {
    logMessage('Resetting GoodLife form for next VIN...', 'info');

    if (!window.location.href.includes('profile/profilegl')) {
      window.location.hash = '#/profile/profilegl';
      await delay(1500);
    } else {
      const tab1Btn = document.querySelector('a[href*="profile/profilegl"]');
      if (tab1Btn) {
        tab1Btn.click();
      } else {
        window.location.hash = '';
        await delay(300);
        window.location.hash = '#/profile/profilegl';
      }
      await delay(1500);
    }

    const vinInput = await waitForElement(() => {
      const c1 = document.getElementById('c1');
      return c1 ? c1.querySelector('input[type="text"]') : null;
    }, 5000, 'GoodLife VIN input field');
    
    if (vinInput) {
      vinInput.value = '';
      vinInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await delay(300);
    logMessage('GoodLife Form ready for next VIN.', 'info');
  }

  async function processGoodLifeRow(payload) {
    const {
      vin,
      dob,
      district,
      city,
      mobile,
      email,
      transaction_type = 'N',
      card_mode = 'e-Card',
      membership_type = '1',
      variant = '299',
      declaration_relation = 'WIFE OF',
      declaration_relation_name,
      nominee_name,
      nominee_relation,
      nominee_contact = '0000000000',
      nominee_address,
      speed_multiplier,
      max_retries: payloadRetries,
      speed_mode: payloadSpeedMode,
      skip_renewals: payloadSkipRenewals
    } = payload;

    if (speed_multiplier !== undefined) speedMultiplier = speed_multiplier;
    if (payloadRetries !== undefined) maxRetries = payloadRetries;
    if (payloadSpeedMode !== undefined) speedMode = payloadSpeedMode;
    if (payloadSkipRenewals !== undefined) skipRenewals = payloadSkipRenewals;

    // Reset skip flag for new row
    skipCurrentRequested = false;

    // Fast skip if transaction is Renewal and skip_renewals setting is enabled
    const transTypeStr = String(transaction_type).trim().toUpperCase();
    if (skipRenewals && (transTypeStr === 'R' || transTypeStr.includes('RENEWAL'))) {
      logMessage(`VIN ${vin} transaction_type is Renewal ("${transaction_type}"). Auto-skipping per Skip Renewals setting...`, 'warning');
      sendResponse(vin, 'Skipped', 'Renewal VIN auto-skipped per settings.');
      return;
    }

    // Validate required fields — fast-fail with response
    if (!vin) { sendResponse('UNKNOWN', 'Error', 'VIN is required.'); return; }
    if (!dob) { sendResponse(vin, 'Error', 'Date of Birth is required.'); return; }
    if (!city) { sendResponse(vin, 'Error', 'City is required.'); return; }
    if (!nominee_name) { sendResponse(vin, 'Error', 'Nominee name is required.'); return; }
    if (!nominee_relation) { sendResponse(vin, 'Error', 'Nominee relationship is required.'); return; }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (skipCurrentRequested) {
          logMessage(`Skip in progress for VIN ${vin}`, 'warning');
          sendResponse(vin, 'Skipped', 'Skipped by user request');
          return;
        }

        if (attempt > 1) {
          logMessage(`Retry ${attempt}/${maxRetries} for VIN ${vin}`, 'warning');
          await fixedDelay(2000);
          await navigateToGoodLifePage();
          await delay(1000);
        }

        // Session health check
        await checkSessionHealth();

        // Step 0: Ensure we're on the GoodLife page
        await timedOperation('navigateGL', () => navigateToGoodLifePage());
        await waitForDOMStable(2000);

        // Step 1: Enter VIN
        await timedOperation('enterGLVIN', () => enterGoodLifeVINAndSearch(vin));

        // Step 2: Handle initial data load popups
        await timedOperation('dataLoadGL', () => checkAndDismissPopups(2000));

        if (skipCurrentRequested) { sendResponse(vin, 'Skipped', 'Skipped by user request'); return; }

        // ── CRITICAL: Wait for Angular form to stabilize after data load ──
        // The VIN search + SweetAlert dismissal triggers Angular async rendering.
        // Without this wait, DOB/City fields may not be ready or may be re-rendered.
        await waitForDOMStable(4000, 500);
        await fixedDelay(500);

        // Update Mobile & Email if provided or clean invalid DMS email
        try {
          const mobileInp = document.querySelector('#c1 input[formcontrolname="mobile"]');
          if (mobileInp) {
            if (isElementLocked(mobileInp)) {
              logMessage('GoodLife mobile input is locked — ignoring.', 'info');
            } else if (isFieldFilled(mobileInp)) {
              logMessage(`GoodLife mobile already filled ("${mobileInp.value}") — skipping.`, 'info');
            } else if (mobile && String(mobile).trim() !== '') {
              const cleanMob = String(mobile).replace(/\D/g, '').slice(-10);
              if (cleanMob.length === 10) {
                setAngularInputValue(mobileInp, cleanMob);
                mobileInp.dispatchEvent(new Event('input', { bubbles: true }));
                mobileInp.dispatchEvent(new Event('change', { bubbles: true }));
                mobileInp.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }
          }
          const glEmailInp = document.querySelector('#c1 input[formcontrolname="ownerEmail"]');
          if (glEmailInp) {
            if (isElementLocked(glEmailInp)) {
              logMessage('GoodLife email input is locked — ignoring.', 'info');
            } else {
              const curVal = (glEmailInp.value || '').trim();
              const curLower = curVal.toLowerCase();
              const curIsValid = curVal.includes('@') && curVal.includes('.') && curVal.length >= 5;
              if (curIsValid) {
                logMessage(`GoodLife email already filled ("${curVal}") — skipping.`, 'info');
              } else if (curLower === 'na' || curLower === 'n/a' || (curVal.length > 0 && !curIsValid)) {
                const cleanEmail = email ? String(email).trim() : '';
                if (cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5) {
                  setAngularInputValue(glEmailInp, cleanEmail);
                } else {
                  setAngularInputValue(glEmailInp, '');
                }
                glEmailInp.dispatchEvent(new Event('input', { bubbles: true }));
                glEmailInp.dispatchEvent(new Event('change', { bubbles: true }));
                glEmailInp.dispatchEvent(new Event('blur', { bubbles: true }));
              } else if (!curVal && email) {
                const cleanEmail = String(email).trim();
                if (cleanEmail.includes('@') && cleanEmail.includes('.') && cleanEmail.length >= 5) {
                  setAngularInputValue(glEmailInp, cleanEmail);
                  glEmailInp.dispatchEvent(new Event('input', { bubbles: true }));
                  glEmailInp.dispatchEvent(new Event('change', { bubbles: true }));
                  glEmailInp.dispatchEvent(new Event('blur', { bubbles: true }));
                }
              }
            }
          }
        } catch (e) {
          logMessage(`GoodLife mobile/email notice: ${e.message}`, 'warning');
        }

        // Step 3: Fill DOB — Robust multi-strategy with Angular validation check
        if (dob) {
          logMessage(`Setting DOB: "${dob}" for VIN ${vin}...`, 'info');

          // Find DOB input with longer timeout (form may still be rendering)
          const dobInput = await waitForElement(() => {
            return document.querySelector('input[formcontrolname="birth_dt"]') ||
                   document.querySelector('#c1 input[type="date"]') ||
                   document.querySelector('#c1 div:nth-of-type(4) > input') ||
                   document.querySelector('#c1 input[placeholder*="DOB"]');
          }, 10000, 'DOB date input');

          if (isElementLocked(dobInput)) {
            logMessage('GoodLife DOB input is locked — ignoring.', 'info');
          } else if (isFieldFilled(dobInput)) {
            logMessage(`GoodLife DOB already filled ("${dobInput.value}") — skipping.`, 'info');
          } else {
            let dobSuccess = false;
            for (let dobAttempt = 1; dobAttempt <= 3; dobAttempt++) {
            // Strategy 1: Use the comprehensive setDateInputValue
            const dobOk = await setDateInputValue(dobInput, dob, 3);

            // Verify Angular actually accepted the value:
            // Check the element still has a value AND Angular removed ng-invalid class
            const hasValue = dobInput.value && dobInput.value.length >= 8;
            const angularAccepted = !dobInput.classList.contains('ng-invalid');

            if (hasValue && angularAccepted) {
              dobSuccess = true;
              logMessage(`DOB confirmed set & valid: "${dobInput.value}" (attempt ${dobAttempt})`, 'info');
              break;
            }

            if (hasValue && !angularAccepted) {
              logMessage(`DOB has value "${dobInput.value}" but Angular control remains ng-invalid. Re-firing event sequence...`, 'warning');
              // Force Angular form control to register change
              setAngularInputValue(dobInput, dobInput.value);
              dobInput.dispatchEvent(new Event('change', { bubbles: true }));
              dobInput.dispatchEvent(new Event('blur', { bubbles: true }));
              await fixedDelay(200);

              if (!dobInput.classList.contains('ng-invalid')) {
                dobSuccess = true;
                logMessage(`DOB registered as valid after re-firing events: "${dobInput.value}"`, 'info');
                break;
              }
            }

            logMessage(`DOB attempt ${dobAttempt} failed. Value: "${dobInput.value}", angularValid: ${angularAccepted}. Retrying...`, 'warning');

            // Strategy 2: Clear field completely then re-set with direct valueAsDate (UTC)
            if (dobAttempt >= 2) {
              try {
                const formattedIso = formatToYYYYMMDD(dob);
                if (formattedIso) {
                  // Clear the field first
                  dobInput.value = '';
                  dobInput.dispatchEvent(new Event('input', { bubbles: true }));
                  await fixedDelay(200);

                  // Focus and click to ensure field is active
                  dobInput.focus();
                  dobInput.click();
                  await fixedDelay(100);

                  // Try valueAsDate with Date.UTC to prevent timezone shift
                  const [y, m, d] = formattedIso.split('-').map(Number);
                  try {
                    dobInput.valueAsDate = new Date(Date.UTC(y, m - 1, d));
                  } catch(e) {
                    // Fallback to native setter
                    const nativeSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype, 'value'
                    )?.set;
                    if (nativeSetter) nativeSetter.call(dobInput, formattedIso);
                    else dobInput.value = formattedIso;
                  }

                  // Fire ALL Angular-relevant events
                  dobInput.dispatchEvent(new Event('input', { bubbles: true }));
                  dobInput.dispatchEvent(new Event('change', { bubbles: true }));
                  dobInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
                  dobInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', keyCode: 9, bubbles: true }));
                  dobInput.dispatchEvent(new Event('focusout', { bubbles: true }));
                  dobInput.dispatchEvent(new Event('blur', { bubbles: true }));
                  await fixedDelay(300);

                  if (dobInput.value && dobInput.value.length >= 8 && !dobInput.classList.contains('ng-invalid')) {
                    dobSuccess = true;
                    logMessage(`DOB set via valueAsDate fallback: "${dobInput.value}"`, 'info');
                    break;
                  }
                }
              } catch (e) {
                logMessage(`DOB valueAsDate strategy error: ${e.message}`, 'warning');
              }
            }

            await fixedDelay(500);
          }

          if (!dobSuccess) {
            // Final check — if input has valid format date value, fire blur one last time
            if (dobInput.value && dobInput.value.length >= 8) {
              logMessage(`DOB set value: "${dobInput.value}", forcing final blur event...`, 'warning');
              dobInput.dispatchEvent(new Event('blur', { bubbles: true }));
              await fixedDelay(200);
            } else {
              throw new Error(`Failed to set DOB field (${dob}) for VIN ${vin}. Input value: "${dobInput.value}"`);
            }
          }
          }
          await delay(300);
        }

        // Step 3b: Ensure District is set — Required field that cascades to City
        {
          const districtSelect = document.querySelector('#district');
          const stateSelect = document.querySelector('#state');
          
          if (districtSelect) {
            if (isElementLocked(districtSelect)) {
              logMessage('GoodLife District dropdown is locked — ignoring.', 'info');
            } else if (isFieldFilled(districtSelect)) {
              logMessage(`GoodLife District already set: "${districtSelect.options[districtSelect.selectedIndex]?.text}" — skipping.`, 'info');
            } else {
              let districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
            
              // If district has no options, try re-triggering state change to load them
              if (districtOptions.length === 0 && stateSelect) {
                logMessage(`District options empty. Re-triggering state change to load districts...`, 'info');
                
                if (stateSelect.value && stateSelect.value !== '' && stateSelect.selectedIndex > 0) {
                  logMessage(`State is set to "${stateSelect.options[stateSelect.selectedIndex]?.text}". Re-firing change...`, 'info');
                  stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  stateSelect.dispatchEvent(new Event('input', { bubbles: true }));
                  await fixedDelay(1000);
                  
                  // Poll for district options to load
                  const pollStart = Date.now();
                  while (Date.now() - pollStart < 8000) {
                    districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
                    if (districtOptions.length > 0) break;
                    await fixedDelay(300);
                  }
                }
              }
              
              const districtValue = district || city || '';
              if (districtValue) {
                logMessage(`District not set. Setting to "${districtValue}"...`, 'info');
                
                // Wait for district options if still empty
                if (districtOptions.length === 0) {
                  const pollStart2 = Date.now();
                  while (Date.now() - pollStart2 < 5000) {
                    districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
                    if (districtOptions.length > 0) break;
                    await fixedDelay(300);
                  }
                }
                
                if (districtOptions.length > 0) {
                  await selectDropdownValueWhenReady(districtSelect, districtValue, 'District', 5000);
                  await fixedDelay(800);
                  
                  // Verify district was set
                  if (!districtSelect.value || districtSelect.value === '' || districtSelect.selectedIndex <= 0) {
                    logMessage(`District could not be matched to "${districtValue}". Trying city value...`, 'warning');
                    if (district && city && district !== city) {
                      await selectDropdownValueWhenReady(districtSelect, city, 'District (city fallback)', 3000);
                      await fixedDelay(500);
                    }
                  }
                } else {
                  logMessage(`District dropdown has no options loaded. Cannot set district.`, 'error');
                }
              }
            }
            
            // After setting district, re-fire change to cascade to city dropdown
            if (districtSelect.value && districtSelect.value !== '' && districtSelect.selectedIndex > 0) {
              districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
              districtSelect.dispatchEvent(new Event('input', { bubbles: true }));
              await fixedDelay(800);
            }
          }
        }

        // Step 3c: Fill City — Robust cascade with district re-trigger
        if (city) {
          logMessage(`Setting City: "${city}" for VIN ${vin}...`, 'info');
          const citySelect = await waitForElement('#city', 10000, 'City dropdown');
          if (isElementLocked(citySelect)) {
            logMessage('GoodLife City dropdown is locked — ignoring.', 'info');
          } else if (isFieldFilled(citySelect)) {
            logMessage(`GoodLife City already filled ("${citySelect.options[citySelect.selectedIndex]?.text}") — skipping.`, 'info');
          } else {
            const districtSelect = document.querySelector('#district');

            // Check if City options are already loaded
            let cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');

            // If city options are empty, we need to trigger district change to load them
            if (cityOptions.length === 0) {
              logMessage(`City options empty. Triggering district change to load cities...`, 'info');

              if (districtSelect) {
                // Case 1: District value already set — re-fire change event
                if (districtSelect.value && districtSelect.value !== '' && districtSelect.selectedIndex > 0) {
                  logMessage(`District already set to "${districtSelect.options[districtSelect.selectedIndex]?.text}". Re-triggering change...`, 'info');
                  districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  districtSelect.dispatchEvent(new Event('input', { bubbles: true }));
                  await fixedDelay(1000);

                  // Poll for city options to load
                  const pollStart1 = Date.now();
                  while (Date.now() - pollStart1 < 5000) {
                    cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                    if (cityOptions.length > 0) break;
                    await fixedDelay(300);
                  }
                }

                // Case 2: Still empty — try setting district from payload
                cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                if (cityOptions.length === 0 && (district || city)) {
                  const distVal = district || city;
                  logMessage(`City still empty. Setting District "${distVal}" explicitly...`, 'info');
                  await selectDropdownValueWhenReady(districtSelect, distVal, 'District', 5000);
                  await fixedDelay(800);

                  // Poll for city options with longer timeout
                  const pollStart2 = Date.now();
                  while (Date.now() - pollStart2 < 8000) {
                    cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                    if (cityOptions.length > 0) break;
                    await fixedDelay(300);
                  }
                }

                // Case 3: Still empty — try clearing district and re-setting to force Angular reload
                cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                if (cityOptions.length === 0 && (district || city)) {
                  const distVal = district || city;
                  logMessage(`City still empty. Clearing district and re-setting to force reload...`, 'warning');
                  setAngularSelectValue(districtSelect, '');
                  districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  await fixedDelay(500);

                  await selectDropdownValueWhenReady(districtSelect, distVal, 'District (reset)', 5000);
                  await fixedDelay(1000);

                  // Final poll
                  const pollStart3 = Date.now();
                  while (Date.now() - pollStart3 < 8000) {
                    cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
                    if (cityOptions.length > 0) break;
                    await fixedDelay(300);
                  }
                }
              } else {
                logMessage(`District dropdown not found! Cannot cascade to city.`, 'error');
              }
            }

            // Now attempt to select City — with 3 retry rounds
            let citySuccess = false;
            for (let cityAttempt = 1; cityAttempt <= 3; cityAttempt++) {
              cityOptions = Array.from(citySelect.options).filter(opt => opt.value !== '');
              if (cityOptions.length === 0) {
                logMessage(`City attempt ${cityAttempt}: No options available. Waiting...`, 'warning');
                await fixedDelay(2000);
                continue;
              }

              const cityOk = await selectDropdownValueWhenReady(citySelect, city, `City (attempt ${cityAttempt})`, 5000);
              await fixedDelay(300);

              if (citySelect.value && citySelect.value !== '' && citySelect.selectedIndex > 0) {
                citySuccess = true;
                logMessage(`City confirmed set: "${citySelect.options[citySelect.selectedIndex]?.text}" (attempt ${cityAttempt})`, 'info');
                break;
              }

              logMessage(`City attempt ${cityAttempt} failed. selectedIndex: ${citySelect.selectedIndex}, value: "${citySelect.value}"`, 'warning');
              await fixedDelay(1000);
            }

            if (!citySuccess) {
              throw new Error(`Failed to set City field (${city}) for VIN ${vin}. Available options: ${Array.from(citySelect.options).map(o => o.text.trim()).join(', ')}`);
            }
          }
        }

        // Step 3d: Final District verification before advancing
        {
          const districtSelect = document.querySelector('#district');
          if (districtSelect && (!districtSelect.value || districtSelect.value === '' || districtSelect.selectedIndex <= 0)) {
            logMessage(`District is still empty after city setup. Attempting final rescue...`, 'warning');
            const distVal = district || city || '';
            if (distVal) {
              const districtOptions = Array.from(districtSelect.options).filter(opt => opt.value && opt.value !== '');
              if (districtOptions.length > 0) {
                await selectDropdownValueWhenReady(districtSelect, distVal, 'District (final)', 3000);
                await fixedDelay(300);
              }
            }
            // If still empty, log the error but let the form validation catch it
            if (!districtSelect.value || districtSelect.value === '' || districtSelect.selectedIndex <= 0) {
              logMessage(`District could not be set. Available: ${Array.from(districtSelect.options).map(o => o.text.trim()).join(', ')}`, 'error');
              throw new Error(`District is required but could not be set for VIN ${vin}. District value: "${district || city || 'none'}". Available options: ${Array.from(districtSelect.options).map(o => o.text.trim()).join(', ')}`);
            }
          }
        }

        // Step 4: Click Next on Owner Details — with validation check
        const ownerFormErrors = checkAngularFormErrors('#c1');
        if (ownerFormErrors.length > 0) {
          throw new Error(`Owner Details validation failed: ${ownerFormErrors.join('; ')}`);
        }

        const nextBtn1 = await waitForElement(() => {
          const c1 = document.getElementById('c1');
          if (c1) {
            const buttons = c1.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim().toLowerCase() === 'next') return btn;
            }
          }
          return null;
        }, 5000, 'Tab 1 Next button');
        nextBtn1.click();
        await delay(1200);

        // Check for any popup/alert that appeared after clicking Next
        await checkAndDismissPopups(1500);

        // Verify tab actually changed to c2 (GoodLife Details)
        const c2Visible = await verifyTabChanged('c2', 5000);
        if (!c2Visible) {
          const errors = checkAngularFormErrors('#c1');
          throw new Error(`Owner Details tab failed to advance. Validation errors: ${errors.length > 0 ? errors.join('; ') : 'Form rejected by Angular (check required fields)'}`);
        }

        // Step 5: GoodLife Details (Transaction, Card Mode, Membership Type, Variant)
        const transSelect = await waitForElement('#transaction', 5000, 'Transaction Type dropdown');
        await selectDropdownValueWhenReady(transSelect, transaction_type, 'Transaction Type', 3000);
        await delay(300);

        const currentTransVal = transSelect.value;
        const currentTransText = (transSelect.options[transSelect.selectedIndex]?.textContent || '').trim();
        if (skipRenewals && (currentTransVal === 'R' || currentTransText.toLowerCase().includes('renewal'))) {
          logMessage(`Transaction Type is Renewal ("${currentTransText}"). Auto-skipping VIN ${vin} per Skip Renewals setting...`, 'warning');
          sendResponse(vin, 'Skipped', 'Renewal VIN auto-skipped per settings.');
          return;
        }

        const cardModeSelect = await waitForElement('select[formcontrolname="cardMode"]', 5000, 'Card Mode dropdown');
        await selectDropdownValueWhenReady(cardModeSelect, card_mode, 'Card Mode', 3000);
        await delay(300);

        if (card_mode !== 'e-Card' && payload.card_no) {
          const cardNoInput = document.querySelector('input[formcontrolname="cardNo"]');
          if (cardNoInput) {
            setAngularInputValue(cardNoInput, payload.card_no);
            await delay(500);
          }
        }

        const memberSelect = await waitForElement('#mainSelect', 5000, 'Membership Type dropdown');
        await selectDropdownValueWhenReady(memberSelect, membership_type, 'Membership Type', 3000);
        await delay(1000); // wait for dynamic variant dropdown to load

        const variantSelect = await waitForElement('#variantSelect', 8000, 'Variant (Buying for) dropdown');
        await selectDropdownValueWhenReady(variantSelect, variant, 'Variant', 5000);
        await delay(300);

        // Step 6: Click Next on GoodLife Details — with validation check
        const glFormErrors = checkAngularFormErrors('#c2');
        if (glFormErrors.length > 0) {
          throw new Error(`GoodLife Details validation failed: ${glFormErrors.join('; ')}`);
        }

        const nextBtn2 = await waitForElement(() => {
          const c2 = document.getElementById('c2');
          if (c2) {
            const buttons = c2.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim().toLowerCase() === 'next') return btn;
            }
          }
          return null;
        }, 5000, 'Tab 2 Next button');
        nextBtn2.click();
        await delay(1200);

        // Check for any popup/alert that appeared after clicking Next
        await checkAndDismissPopups(1500);

        // Verify tab actually changed to c3 (Insurance Details)
        const c3Visible = await verifyTabChanged('c3', 5000);
        if (!c3Visible) {
          const errors = checkAngularFormErrors('#c2');
          throw new Error(`GoodLife Details tab failed to advance. Validation errors: ${errors.length > 0 ? errors.join('; ') : 'Form rejected by Angular (check required fields)'}`);
        }

        // Step 7: Nominee & Insurance details
        const declRelationSelect = await waitForElement('select[formcontrolname="declarationRelation"]', 5000, 'Declaration Relation dropdown');
        if (isElementLocked(declRelationSelect)) {
          logMessage('Declaration Relation dropdown is locked — ignoring.', 'info');
        } else if (isFieldFilled(declRelationSelect)) {
          logMessage('Declaration Relation already filled — skipping.', 'info');
        } else {
          await selectDropdownValueWhenReady(declRelationSelect, declaration_relation, 'Declaration Relation', 3000);
          await delay(300);
        }

        const declRelationNameInput = await waitForElement('input[formcontrolname="declarationRelationName"]', 3000, 'Declaration Relation Name');
        if (isElementLocked(declRelationNameInput)) {
          logMessage('Declaration Relation Name input is locked — ignoring.', 'info');
        } else if (isFieldFilled(declRelationNameInput)) {
          logMessage('Declaration Relation Name already filled — skipping.', 'info');
        } else {
          const relNameVal = (declaration_relation_name && declaration_relation_name.trim() !== '') ? declaration_relation_name : (nominee_name || payload.name || 'NA');
          setAngularInputValue(declRelationNameInput, relNameVal);
          await delay(300);
        }

        const nomineeNameInput = await waitForElement('input[formcontrolname="nomineeNameInsurance"]', 5000, 'Nominee Name');
        if (isElementLocked(nomineeNameInput)) {
          logMessage('Nominee Name input is locked — ignoring.', 'info');
        } else if (isFieldFilled(nomineeNameInput)) {
          logMessage('Nominee Name already filled — skipping.', 'info');
        } else {
          setAngularInputValue(nomineeNameInput, nominee_name);
          await delay(300);
        }

        const nomineeRelInput = await waitForElement('input[formcontrolname="relationshipInsurance"]', 5000, 'Nominee Relationship');
        if (isElementLocked(nomineeRelInput)) {
          logMessage('Nominee Relationship input is locked — ignoring.', 'info');
        } else if (isFieldFilled(nomineeRelInput)) {
          logMessage('Nominee Relationship already filled — skipping.', 'info');
        } else {
          setAngularInputValue(nomineeRelInput, nominee_relation);
          await delay(300);
        }

        const nomineeContactInput = await waitForElement('input[formcontrolname="nomineecontactnumberInsurance"]', 5000, 'Nominee Contact Number');
        if (isElementLocked(nomineeContactInput)) {
          logMessage('Nominee Contact Number input is locked — ignoring.', 'info');
        } else if (isFieldFilled(nomineeContactInput)) {
          logMessage('Nominee Contact Number already filled — skipping.', 'info');
        } else {
          setAngularInputValue(nomineeContactInput, nominee_contact);
          await delay(300);
        }

        logMessage(`Handling nominee address. nominee_address value: "${nominee_address}"`, 'info');
        // Helper to safely set a checkbox to checked state for Angular Reactive Forms
        const safeCheckCheckbox = (cb, name) => {
          if (!cb) return false;
          if (!cb.checked) {
            cb.click();
          }
          if (!cb.checked) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            cb.dispatchEvent(new Event('input', { bubbles: true }));
          }
          logMessage(`Checkbox "${name}" is now checked: ${cb.checked}`, 'info');
          return cb.checked;
        };

        if (nominee_address && nominee_address.trim() !== '') {
          logMessage(`Entering nominee address: ${nominee_address}`, 'info');
          const nomineeAddressTextarea = document.querySelector('textarea[formcontrolname="add1Insurance"]');
          if (nomineeAddressTextarea) {
            setAngularInputValue(nomineeAddressTextarea, nominee_address);
            await delay(500);
          }
        } else {
          logMessage('No nominee address provided. Checking "Address Same as Applicant" checkbox...', 'info');
          const toggleAddressCheckbox = document.getElementById('toggleAddress');
          if (toggleAddressCheckbox) {
            safeCheckCheckbox(toggleAddressCheckbox, 'Address Same as Applicant');
            await delay(300);
          } else {
            logMessage('Error: "Address Same as Applicant" checkbox element not found!', 'error');
          }
        }

        // Step 7b: Hero MotoCorp Employee/Family Declaration checkbox — MUST ALWAYS REMAIN UNCHECKED
        logMessage('Ensuring Hero MotoCorp employee/family declaration checkbox is UNCHECKED...', 'info');
        {
          const safeUncheckCheckbox = (cb, name) => {
            if (!cb) return false;
            if (cb.checked) {
              cb.click();
            }
            if (cb.checked) {
              cb.checked = false;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              cb.dispatchEvent(new Event('input', { bubbles: true }));
            }
            logMessage(`Checkbox "${name}" is now unchecked: ${!cb.checked}`, 'info');
            return !cb.checked;
          };

          const ownerFamilyCheckbox = document.querySelector('#c3 input[type="checkbox"][formcontrolname="ownerFamilyCheckbox"]');
          if (ownerFamilyCheckbox) {
            safeUncheckCheckbox(ownerFamilyCheckbox, 'ownerFamilyCheckbox');
          } else {
            const c3 = document.getElementById('c3');
            if (c3) {
              const allCheckboxes = c3.querySelectorAll('input[type="checkbox"]');
              for (const cb of allCheckboxes) {
                const parent = cb.parentElement;
                const siblingLabel = parent ? parent.querySelector('label') : null;
                const labelText = (siblingLabel?.textContent || parent?.textContent || '').toLowerCase();
                if (labelText.includes('employee') && (labelText.includes('hero') || labelText.includes('motocorp') || labelText.includes('dealer'))) {
                  safeUncheckCheckbox(cb, 'Hero employee checkbox (fallback)');
                  break;
                }
              }
            }
          }
          await delay(300);
        }

        const commsConsent = document.querySelector('input[type="checkbox"][formcontrolname="communicationCheckboxIns"]');
        if (commsConsent) {
          safeCheckCheckbox(commsConsent, 'communicationCheckboxIns');
          await delay(200);
        }
        
        const termsConsent = document.querySelector('input[type="checkbox"][formcontrolname="termConditionCheckboxIns"]');
        if (termsConsent) {
          safeCheckCheckbox(termsConsent, 'termConditionCheckboxIns');
          await delay(200);
        }

        const confirmVinInput = await waitForElement('input[formcontrolname="VinChasisNo"]', 5000, 'Confirm VIN input');
        setAngularInputValue(confirmVinInput, vin);
        await delay(300);

        // Step 8: Preview — Check form validity first, then dismiss modal
        const insuranceFormErrors = checkAngularFormErrors('#c3');
        if (insuranceFormErrors.length > 0) {
          throw new Error(`Insurance Details validation failed: ${insuranceFormErrors.join('; ')}`);
        }

        const previewBtn = await waitForElement(() => {
          const c3 = document.getElementById('c3');
          if (c3) {
            const buttons = c3.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim().toLowerCase() === 'preview') return btn;
            }
          }
          return null;
        }, 5000, 'Preview button');
        previewBtn.click();
        await delay(1200);

        // Check for any error popup before the modal
        const previewSwalError = document.querySelector('.swal2-popup');
        if (previewSwalError && previewSwalError.offsetParent !== null) {
          const swalTitle = document.querySelector('.swal2-title')?.textContent || '';
          const swalContent = document.querySelector('.swal2-html-container')?.textContent || '';
          const swalText = (swalTitle + ' ' + swalContent).trim();
          const hasErrorIcon = !!document.querySelector('.swal2-icon.swal2-error');
          const lowerSwalText = swalText.toLowerCase();
          if (hasErrorIcon || lowerSwalText.includes('error') || lowerSwalText.includes('failed') || lowerSwalText.includes('invalid') || lowerSwalText.includes('required') || lowerSwalText.includes('please')) {
            const confirmBtn = document.querySelector('button.swal2-confirm');
            if (confirmBtn) confirmBtn.click();
            await fixedDelay(500);
            throw new Error(`Preview error: ${swalText.substring(0, 150)}`);
          }
        }

        await dismissModal(8000);
        await delay(500);

        // Step 9: Final Submit — DO NOT force-enable if disabled
        const finalSubmitBtn = await waitForElement(() => {
          const c3 = document.getElementById('c3');
          if (c3) {
            const buttons = c3.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim().toLowerCase() === 'final submit') return btn;
            }
          }
          return null;
        }, 5000, 'Final Submit button');
        
        // If Final Submit is still disabled after Preview, the form is invalid
        if (finalSubmitBtn.disabled) {
          logMessage('Final Submit button is disabled — form has validation errors.', 'error');
          const allErrors = [
            ...checkAngularFormErrors('#c1'),
            ...checkAngularFormErrors('#c2'),
            ...checkAngularFormErrors('#c3')
          ];
          throw new Error(`Final Submit blocked — form invalid. Errors: ${allErrors.length > 0 ? allErrors.join('; ') : 'Unknown validation failure'}`);
        }

        finalSubmitBtn.click();
        logMessage('Final Submit clicked. Waiting for confirmation...', 'info');
        await delay(2000);

        // Step 10: SweetAlert — REQUIRE explicit success confirmation
        // If no SweetAlert appears, the submit failed silently
        let submitSuccess = false;
        let submitErrorReason = '';
        try {
          await waitForSweetAlert(15000);
          await fixedDelay(500);

          // Read the SweetAlert content
          const titleEl = document.querySelector('.swal2-title');
          const contentEl = document.querySelector('.swal2-html-container');
          const alertText = ((titleEl?.textContent || '') + ' ' + (contentEl?.textContent || '')).trim();
          const lowerText = alertText.toLowerCase();
          const hasSuccessIcon = !!document.querySelector('.swal2-icon.swal2-success');
          const hasErrorIcon = !!document.querySelector('.swal2-icon.swal2-error');
          const hasWarningIcon = !!document.querySelector('.swal2-icon.swal2-warning');

          logMessage(`Final Submit SweetAlert: ${alertText.substring(0, 120)}`, 'info');

          // Click the OK/Confirm button
          const confirmBtn = document.querySelector('button.swal2-confirm');
          if (confirmBtn) confirmBtn.click();
          await fixedDelay(500);

          // Determine if this was a SUCCESS or ERROR alert
          if (hasErrorIcon || hasWarningIcon) {
            submitErrorReason = alertText;
          } else if (hasSuccessIcon || lowerText.includes('success') || lowerText.includes('successfully') || lowerText.includes('enrolled') || lowerText.includes('saved')) {
            submitSuccess = true;
          } else if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('invalid') || lowerText.includes('already') || lowerText.includes('not found') || lowerText.includes('cannot') || lowerText.includes('incorrect') || lowerText.includes('required') || lowerText.includes('please fill') || lowerText.includes('please enter')) {
            submitErrorReason = alertText;
          } else {
            // Unknown alert — treat as success if no error indicators
            logMessage(`Unknown SweetAlert content, treating as success: "${alertText.substring(0, 80)}"`, 'warning');
            submitSuccess = true;
          }
        } catch (swalErr) {
          // SweetAlert never appeared — Final Submit failed silently
          logMessage('No SweetAlert appeared after Final Submit — submit likely failed.', 'error');
          submitErrorReason = 'No confirmation received after Final Submit. Form may have validation errors.';
        }

        if (!submitSuccess) {
          throw new Error(`Enrollment failed: ${submitErrorReason || 'Unknown error after Final Submit'}`);
        }

        await delay(500);

        // Reset for next
        await resetGoodLifeFormForNextVIN();

        // Success!
        logMessage(`VIN ${vin} enrolled successfully!`, 'success');
        sendResponse(vin, 'Success');
        return;

      } catch (err) {
        console.error(`[GoodLife Enrollor] Error (attempt ${attempt}/${maxRetries}):`, err);
        lastError = err;

        if (err.message === 'SKIPPED_BY_USER' || skipCurrentRequested) {
          logMessage(`VIN ${vin} skipped by user request.`, 'warning');
          sendResponse(vin, 'Skipped', 'Skipped by user request');
          return;
        }

        // Smart error classification
        const errClass = classifyError(err.message);
        if (errClass === 'FATAL') {
          logMessage(`FATAL: ${err.message}. Stopping automation.`, 'error');
          sendResponse(vin, 'Error', err.message);
          return;
        }
        if (errClass === 'NON_RETRYABLE') {
          logMessage(`Non-retryable error for VIN ${vin}: ${err.message}`, 'warning');
          sendResponse(vin, 'Error', err.message);
          return;
        }

        // Try to dismiss any lingering popups and reset form
        try {
          const swalBtn = document.querySelector('button.swal2-confirm');
          if (swalBtn) swalBtn.click();
        } catch (e) { /* ignore */ }
        try {
          const modalBtn = document.querySelector('div.modal-footer > button');
          if (modalBtn) modalBtn.click();
        } catch (e) { /* ignore */ }
        // Quick form reset on error for clean next attempt
        try { await resetGoodLifeFormForNextVIN(); } catch (e) { /* ignore */ }
      }
    }

    // All retries exhausted
    sendResponse(vin, 'Error', lastError ? lastError.message : 'Unknown error after all retries.');
  }

})();
