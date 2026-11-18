// ═══════════════════════════════════════════════════════════════
// LICENSE MANAGER — Goodlife Bulk Enrollor v4.0
// Secure key-based licensing with anti-tamper protections.
// - AES-256-CBC encrypted storage (Web Crypto API)
// - chrome.storage.sync persistence (survives reinstall)
// - Device fingerprinting (key bound to 1 machine)
// - HMAC integrity checks (detects manual edits)
// - Anti-clock-manipulation (last-seen tracking)
// ═══════════════════════════════════════════════════════════════

const LicenseManager = (() => {
  // ─── CONSTANTS ───────────────────────────────────────────────
  const TRIAL_DAYS = 30;
  const GRACE_DAYS = 3;
  const KEY_PREFIX = 'GBE';
  const STORAGE_KEY_SYNC = '__gbe_lic_s';
  const STORAGE_KEY_LOCAL = '__gbe_lic_l';
  const LAST_SEEN_KEY = '__gbe_ls';

  // ─── CRYPTO SALTS (obfuscated) ──────────────────────────────
  // These are combined with extension ID to derive encryption keys
  const _S1 = 'G00dL1f3-BuLk-3nr0ll0r';
  const _S2 = 'H3r0-M0t0c0rp-2026';
  const _S3 = 'J0yR1d3-S3cur1ty-K3y';

  // ─── KEY GENERATION ALPHABET ────────────────────────────────
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion

  // ═══════════════════════════════════════════════════════════════
  // DEVICE FINGERPRINT
  // Generates a stable, unique hash from browser/hardware properties
  // ═══════════════════════════════════════════════════════════════

  async function getDeviceFingerprint() {
    const components = [];

    // Screen properties (NOT available in service workers — wrapped safely)
    try {
      if (typeof screen !== 'undefined') {
        components.push(`${screen.width}x${screen.height}`);
        components.push(`${screen.colorDepth}`);
        components.push(`${screen.pixelDepth}`);
      }
    } catch (e) { /* service worker context */ }

    // Hardware (navigator is available in service workers)
    try { components.push(`${navigator.hardwareConcurrency || 0}`); } catch (e) { components.push('0'); }
    try { components.push(`${navigator.deviceMemory || 0}`); } catch (e) { components.push('0'); }
    try { components.push(navigator.platform || ''); } catch (e) { components.push(''); }
    try { components.push(navigator.language || ''); } catch (e) { components.push(''); }

    // Timezone (available in service workers)
    try {
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch (e) { components.push(''); }

    // GPU (WebGL renderer — NOT available in service workers)
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(1, 1);
        const gl = canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
            components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
          }
        }
      }
    } catch (e) {
      components.push('no-webgl');
    }

    // User agent stable parts (available in service workers)
    try {
      const uaParts = (navigator.userAgent || '').match(/Chrome\/[\d.]+/) || [''];
      components.push(uaParts[0]);
    } catch (e) { components.push(''); }

    const raw = components.join('|');
    const hash = await sha256(raw);
    // Return short device ID (first 16 chars of hex hash)
    return hash.substring(0, 16).toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════════
  // CRYPTO UTILITIES (Web Crypto API)
  // ═══════════════════════════════════════════════════════════════

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return bufferToHex(hashBuffer);
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  async function deriveKey(salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(_S1 + salt + _S2),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(_S3 + salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptData(data, salt = 'default') {
    const key = await deriveKey(salt);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encoded
    );
    // HMAC for integrity
    const hmacData = bufferToHex(iv.buffer) + bufferToHex(encrypted);
    const hmac = await sha256(hmacData + _S1 + _S3);
    return {
      iv: bufferToHex(iv.buffer),
      ct: bufferToHex(encrypted),
      hm: hmac
    };
  }

  async function decryptData(encObj, salt = 'default') {
    if (!encObj || !encObj.iv || !encObj.ct || !encObj.hm) return null;
    // Verify HMAC integrity
    const expectedHmac = await sha256(encObj.iv + encObj.ct + _S1 + _S3);
    if (expectedHmac !== encObj.hm) {
      console.warn('[License] HMAC mismatch — data tampered!');
      return null; // Tampered data
    }
    try {
      const key = await deriveKey(salt);
      const iv = new Uint8Array(hexToBuffer(encObj.iv));
      const ct = hexToBuffer(encObj.ct);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        ct
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      console.warn('[License] Decryption failed:', e.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STORAGE HELPERS (sync + local dual-write)
  // ═══════════════════════════════════════════════════════════════

  function storageGet(key, area = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[area].get([key], (data) => {
        resolve(data[key] || null);
      });
    });
  }

  function storageSet(key, value, area = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[area].set({ [key]: value }, resolve);
    });
  }

  async function writeLicenseData(data) {
    const encrypted = await encryptData(data, 'licdata');
    await storageSet(STORAGE_KEY_SYNC, encrypted, 'sync');
    await storageSet(STORAGE_KEY_LOCAL, encrypted, 'local');
  }

  async function readLicenseData() {
    // Try sync first (authoritative)
    let encrypted = await storageGet(STORAGE_KEY_SYNC, 'sync');
    let source = 'sync';

    if (!encrypted) {
      // Fallback to local (may exist if sync had issues)
      encrypted = await storageGet(STORAGE_KEY_LOCAL, 'local');
      source = 'local';
    }

    if (!encrypted) return null;

    const data = await decryptData(encrypted, 'licdata');
    if (!data) {
      console.warn(`[License] Data from ${source} is corrupted/tampered.`);
      return null;
    }

    // If we read from local but sync is missing, that's suspicious
    // (user may have cleared sync manually)
    if (source === 'local') {
      const syncData = await storageGet(STORAGE_KEY_SYNC, 'sync');
      if (!syncData) {
        console.warn('[License] Sync data missing but local exists — possible tampering.');
        // Re-write to sync from local
        await storageSet(STORAGE_KEY_SYNC, encrypted, 'sync');
      }
    }

    // Cross-sync: ensure both stores have data
    if (source === 'sync') {
      const localData = await storageGet(STORAGE_KEY_LOCAL, 'local');
      if (!localData) {
        await storageSet(STORAGE_KEY_LOCAL, encrypted, 'local');
      }
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANTI-CLOCK-MANIPULATION
  // ═══════════════════════════════════════════════════════════════

  async function updateLastSeen() {
    const now = Date.now();
    await storageSet(LAST_SEEN_KEY, now, 'local');
    await storageSet(LAST_SEEN_KEY, now, 'sync');
  }

  async function getLastSeen() {
    const syncVal = await storageGet(LAST_SEEN_KEY, 'sync');
    const localVal = await storageGet(LAST_SEEN_KEY, 'local');
    // Return the maximum (latest) to prevent clock rollback attacks
    return Math.max(syncVal || 0, localVal || 0);
  }

  function getSecureNow() {
    // Returns Date.now(), but will be cross-checked against lastSeen
    return Date.now();
  }

  // ═══════════════════════════════════════════════════════════════
  // KEY VALIDATION
  // Format: GBE-XXXX-XXXX-XXXX-XXXX
  // Structure:
  //   Segment 1 (4 chars): Duration code + checksum nibble
  //   Segment 2 (4 chars): Device fingerprint hash fragment
  //   Segment 3 (4 chars): Timestamp-derived code
  //   Segment 4 (4 chars): HMAC verification code
  // ═══════════════════════════════════════════════════════════════

  // Duration encoding
  const DURATION_MAP = {
    'A': 30,   // 1 month
    'B': 90,   // 3 months
    'C': 180,  // 6 months
    'D': 365,  // 1 year
    'E': 60,   // 2 months
    'F': 120,  // 4 months
  };

  function encodeDuration(days) {
    for (const [code, d] of Object.entries(DURATION_MAP)) {
      if (d === days) return code;
    }
    return 'A'; // default 1 month
  }

  function charToIndex(c) {
    const idx = ALPHABET.indexOf(c);
    return idx >= 0 ? idx : 0;
  }

  function indexToChar(i) {
    return ALPHABET[((i % ALPHABET.length) + ALPHABET.length) % ALPHABET.length];
  }

  // Note: Key generation is handled strictly in offline Admin Keygen tool (keygen.html)

  async function validateKey(key, deviceId) {
    // Parse key format
    const cleaned = key.toUpperCase().trim();
    const parts = cleaned.split('-');
    if (parts.length !== 5 || parts[0] !== KEY_PREFIX) {
      return { valid: false, reason: 'Invalid key format' };
    }

    const [, seg1, seg2, seg3, seg4] = parts;
    if (seg1.length !== 4 || seg2.length !== 4 || seg3.length !== 4 || seg4.length !== 4) {
      return { valid: false, reason: 'Invalid key segment length' };
    }

    // Extract duration code
    const durCode = seg1[0];
    const durationDays = DURATION_MAP[durCode];
    if (!durationDays) {
      return { valid: false, reason: 'Invalid duration code' };
    }

    // Verify Segment 1 (duration + derived chars)
    const seg1Hash = await sha256(durCode + deviceId + _S1);
    const expectedSeg1 = durCode
      + indexToChar(parseInt(seg1Hash.substring(0, 2), 16))
      + indexToChar(parseInt(seg1Hash.substring(2, 4), 16))
      + indexToChar(parseInt(seg1Hash.substring(4, 6), 16));
    if (seg1 !== expectedSeg1) {
      return { valid: false, reason: 'Key not bound to this device' };
    }

    // Verify Segment 2 (device fingerprint)
    const seg2Hash = await sha256(deviceId + _S2 + durCode);
    const expectedSeg2 = indexToChar(parseInt(seg2Hash.substring(0, 2), 16))
      + indexToChar(parseInt(seg2Hash.substring(2, 4), 16))
      + indexToChar(parseInt(seg2Hash.substring(4, 6), 16))
      + indexToChar(parseInt(seg2Hash.substring(6, 8), 16));
    if (seg2 !== expectedSeg2) {
      return { valid: false, reason: 'Device mismatch — key is for another machine' };
    }

    // Verify Segment 4 (HMAC — we need to accept any valid timestamp)
    // Since we don't know exactly when the key was generated, we check HMAC
    // using the provided seg3 as-is (timestamp was baked in at generation)
    const hmacInput = seg1 + seg2 + seg3 + deviceId + _S1 + _S2 + _S3;
    const hmacHash = await sha256(hmacInput);
    const expectedSeg4 = indexToChar(parseInt(hmacHash.substring(0, 2), 16))
      + indexToChar(parseInt(hmacHash.substring(2, 4), 16))
      + indexToChar(parseInt(hmacHash.substring(4, 6), 16))
      + indexToChar(parseInt(hmacHash.substring(6, 8), 16));
    if (seg4 !== expectedSeg4) {
      return { valid: false, reason: 'Key verification failed — tampered or invalid' };
    }

    return { valid: true, durationDays };
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize license system on extension install.
   * Stamps trial start date in sync storage if not already present.
   */
  async function init() {
    const existing = await readLicenseData();
    if (existing && existing.trialStart) {
      console.log('[License] Existing license data found. Trial started:', new Date(existing.trialStart));
      await updateLastSeen();
      return;
    }

    // First-ever install — start trial
    const now = Date.now();
    const deviceId = await getDeviceFingerprint();
    const data = {
      trialStart: now,
      deviceId: deviceId,
      licenseKey: null,
      licenseActivatedAt: null,
      licenseExpiresAt: null,
      licenseDurationDays: null,
      version: 1
    };
    await writeLicenseData(data);
    await updateLastSeen();
    console.log('[License] Trial started. Device ID:', deviceId);
  }

  /**
   * Get comprehensive license status.
   */
  async function getStatus() {
    const data = await readLicenseData();
    const deviceId = await getDeviceFingerprint();
    const now = getSecureNow();
    const lastSeen = await getLastSeen();

    // Anti-clock-manipulation: use the later of now vs lastSeen
    const effectiveNow = Math.max(now, lastSeen);
    await updateLastSeen();

    if (!data || !data.trialStart) {
      // No data at all — could be first install or total wipe
      // Re-initialize
      await init();
      return getStatus(); // Recurse once
    }

    // Check if device fingerprint changed (different machine with same Google account)
    const deviceMatch = data.deviceId === deviceId;

    // Check active license first
    if (data.licenseKey && data.licenseExpiresAt) {
      if (effectiveNow < data.licenseExpiresAt) {
        const daysLeft = Math.ceil((data.licenseExpiresAt - effectiveNow) / 86400000);
        return {
          status: 'LICENSED',
          daysLeft: Math.max(0, daysLeft),
          expiryDate: new Date(data.licenseExpiresAt).toLocaleDateString(),
          deviceId,
          deviceMatch,
          licenseKey: maskKey(data.licenseKey),
          trialUsed: true
        };
      } else {
        // License expired
        return {
          status: 'EXPIRED',
          daysLeft: 0,
          expiryDate: new Date(data.licenseExpiresAt).toLocaleDateString(),
          deviceId,
          deviceMatch,
          licenseKey: maskKey(data.licenseKey),
          reason: 'License expired — please renew',
          trialUsed: true
        };
      }
    }

    // Check trial
    const trialElapsed = effectiveNow - data.trialStart;
    const trialDaysUsed = Math.floor(trialElapsed / 86400000);
    const trialDaysLeft = TRIAL_DAYS - trialDaysUsed;

    if (trialDaysLeft > 0) {
      return {
        status: 'TRIAL',
        daysLeft: trialDaysLeft,
        trialDaysUsed,
        expiryDate: new Date(data.trialStart + TRIAL_DAYS * 86400000).toLocaleDateString(),
        deviceId,
        deviceMatch,
        licenseKey: null,
        trialUsed: false
      };
    }

    // Trial expired, no license
    return {
      status: 'EXPIRED',
      daysLeft: 0,
      trialDaysUsed,
      expiryDate: new Date(data.trialStart + TRIAL_DAYS * 86400000).toLocaleDateString(),
      deviceId,
      deviceMatch,
      licenseKey: null,
      reason: 'Trial period ended — activate license key',
      trialUsed: true
    };
  }

  /**
   * Quick boolean: is the extension currently usable?
   */
  async function isActive() {
    const status = await getStatus();
    return status.status === 'TRIAL' || status.status === 'LICENSED';
  }

  /**
   * Activate a license key.
   */
  async function activateKey(key) {
    const deviceId = await getDeviceFingerprint();
    const validation = await validateKey(key, deviceId);

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const data = await readLicenseData();
    if (!data) {
      return { success: false, reason: 'License data corrupted. Please reinstall.' };
    }

    const now = Date.now();
    data.licenseKey = key.toUpperCase().trim();
    data.licenseActivatedAt = now;
    data.licenseExpiresAt = now + (validation.durationDays * 86400000);
    data.licenseDurationDays = validation.durationDays;
    data.deviceId = deviceId; // Re-stamp device ID

    await writeLicenseData(data);
    await updateLastSeen();

    return {
      success: true,
      durationDays: validation.durationDays,
      expiresAt: new Date(data.licenseExpiresAt).toLocaleDateString()
    };
  }

  /**
   * Deactivate current license (trial data preserved — can't re-trial).
   */
  async function deactivateKey() {
    const data = await readLicenseData();
    if (!data) return;

    data.licenseKey = null;
    data.licenseActivatedAt = null;
    data.licenseExpiresAt = null;
    data.licenseDurationDays = null;

    await writeLicenseData(data);
  }

  /**
   * Get device fingerprint for display on activation screen.
   */
  async function getDeviceId() {
    return await getDeviceFingerprint();
  }

  // ─── HELPERS ────────────────────────────────────────────────

  function maskKey(key) {
    if (!key) return null;
    // Show first and last segments, mask middle
    const parts = key.split('-');
    if (parts.length !== 5) return '****';
    return `${parts[0]}-${parts[1]}-****-****-${parts[4]}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // RETURN PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  return {
    init,
    getStatus,
    isActive,
    activateKey,
    deactivateKey,
    getDeviceId,
    getDeviceFingerprint,
    validateKey
  };
})();
