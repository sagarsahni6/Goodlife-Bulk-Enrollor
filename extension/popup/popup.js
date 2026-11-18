// ═══════════════════════════════════════════════════════════════
// POPUP.JS — Goodlife Bulk Enrollor Side Panel UI Logic
// ═══════════════════════════════════════════════════════════════

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const statusBadge = document.getElementById('status-badge');
const statTotal = document.getElementById('stat-total');
const statSuccess = document.getElementById('stat-success');
const statError = document.getElementById('stat-error');
const statPending = document.getElementById('stat-pending');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressCurrent = document.getElementById('progress-current');
const btnStart = document.getElementById('btn-start');
const btnSkip = document.getElementById('btn-skip');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnClearLogs = document.getElementById('btn-clear-logs');
const logConsole = document.getElementById('log-console');
const metricSpeed = document.getElementById('metric-speed');
const metricEtr = document.getElementById('metric-etr');
const metricRate = document.getElementById('metric-rate');
const btnExportReport = document.getElementById('btn-export-report');
const resultsCount = document.getElementById('results-count');
const resultsList = document.getElementById('results-list');
const logSearch = document.getElementById('log-search');
const filterTabs = document.querySelectorAll('.filter-tab');
const linkDownloadTemplate = document.getElementById('link-download-template');
const previewSection = document.getElementById('preview-section');
const previewCount = document.getElementById('preview-count');
const previewTbody = document.getElementById('preview-tbody');
const btnTogglePreview = document.getElementById('btn-toggle-preview');
const previewTableWrap = document.getElementById('preview-table-wrap');

let uploadedRecords = [];
let currentLogs = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let activeTab = 'joyride';

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // ── LICENSE CHECK FIRST ──
  checkLicenseStatus();

  chrome.storage.local.get(['activeTab'], (data) => {
    if (data.activeTab) {
      activeTab = data.activeTab;
      document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
      });
    }
    updateBodyTabClass();
    requestState();
    setupEventListeners();
    initSpeedControls();
    initSessionControls();
    refreshSessionBadge();
    initLicenseUI();
  });
});

function updateBodyTabClass() {
  document.body.className = activeTab === 'goodlife' ? 'tab-goodlife' : 'tab-joyride';
  updateCsvFormatGuide();
}

function requestState() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    updateUI(response);
  });
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupEventListeners() {
  // Tab Navigation Buttons
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === activeTab) return;

      activeTab = targetTab;
      document.querySelectorAll('.tab-nav-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
      });
      chrome.storage.local.set({ activeTab });
      updateBodyTabClass();

      // Reset local file upload state on tab switch
      previewSection.style.display = 'none';
      uploadedRecords = [];
      fileInfo.textContent = activeTab === 'goodlife' 
        ? 'Required: VIN, DOB, City, Nominee Name/Relation/Contact' 
        : 'Required: VIN, District, City, Card Number, Discount';
      fileInfo.style.color = 'var(--text-dim)';

      chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tab: activeTab }, () => {
        requestState();
        refreshSessionBadge();
      });
    });
  });

  // Drag & Drop
  dropZone.addEventListener('click', (e) => {
    if (e.target.id === 'link-download-template' || e.target.closest('#link-download-template')) return;
    fileInput.click();
  });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  // Control Buttons
  btnStart.addEventListener('click', () => {
    // Filter to selected rows only if not all selected
    let queueToSend = uploadedRecords;
    if (selectedRows.size > 0 && selectedRows.size < uploadedRecords.length) {
      queueToSend = uploadedRecords.filter((_, i) => selectedRows.has(i));
      addLog(`Processing ${queueToSend.length} of ${uploadedRecords.length} selected records.`, 'info');
    }
    chrome.runtime.sendMessage({ type: 'START_QUEUE', queue: queueToSend });
  });
  btnSkip.addEventListener('click', () => {
    if (confirm('Skip current VIN? (It will be marked as Skipped)')) {
      chrome.runtime.sendMessage({ type: 'SKIP_CURRENT' });
      addLog('Skip requested for current VIN.', 'warning');
    }
  });
  btnPause.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_QUEUE' });
  });
  btnReset.addEventListener('click', () => {
    if (confirm('Reset queue and clear all results?')) {
      chrome.runtime.sendMessage({ type: 'RESET_QUEUE' });
      previewSection.style.display = 'none';
      uploadedRecords = [];
    }
  });
  btnClearLogs.addEventListener('click', () => {
    logConsole.innerHTML = '';
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
  });

  // Log Search & Filter
  logSearch.addEventListener('input', (e) => { currentSearchQuery = e.target.value; renderLogs(); });
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderLogs();
    });
  });

  // Preview Toggle
  btnTogglePreview.addEventListener('click', () => {
    const isHidden = previewTableWrap.style.display === 'none';
    previewTableWrap.style.display = isHidden ? '' : 'none';
    btnTogglePreview.textContent = isHidden ? 'Collapse' : 'Expand';
  });

  // Excel Template Download (formatted as Text to prevent Excel truncation)
  linkDownloadTemplate.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTab === 'goodlife') {
      const headers = ['vin','dob','district','city','transaction_type','card_mode','membership_type','variant','declaration_relation','declaration_relation_name','nominee_name','nominee_relation','nominee_contact','nominee_address'];
      const rows = [
        ['MBLHAW473THFK8490','1986-01-01','GURGAON','GURGAON','N','e-Card','1','299','WIFE OF','JALESHWAR YADAV','LALITA DEVI','WIFE','0000000000','']
      ];
      downloadExcelTemplate(headers, rows, 'goodlife_enrollment_template.xls');
    } else {
      const headers = ['vin','mobile','email','district','city','transaction_type','joyride_year','joyride_package','joyride_card_number','discount'];
      const rows = [
        ['MBLHAW33XSHG04476','9996910724','customer@gmail.com','PATNA','PATNA','N','1','2','1136526720002513','25'],
        ['MBLKCU121RHF00048','9876543210','hero.owner@gmail.com','GURGAON','GURGAON','N','1','2','9988776655443322','30']
      ];
      downloadExcelTemplate(headers, rows, 'joyride_enrollment_template.xls');
    }
  });

  // CSV Format Guide Toggle
  const formatToggle = document.getElementById('csv-format-toggle');
  const formatBody = document.getElementById('csv-format-body');
  const formatArrow = document.getElementById('csv-format-arrow');
  if (formatToggle && formatBody && formatArrow) {
    formatToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = formatBody.classList.contains('collapsed');
      formatBody.classList.toggle('collapsed', !isCollapsed);
      formatArrow.classList.toggle('open', isCollapsed);
    });
  }
}

function updateCsvFormatGuide() {
  const glContent = document.getElementById('csv-format-goodlife');
  const jrContent = document.getElementById('csv-format-joyride');
  if (glContent && jrContent) {
    glContent.style.display = activeTab === 'goodlife' ? 'block' : 'none';
    jrContent.style.display = activeTab === 'joyride' ? 'block' : 'none';
  }
}

  // Export Report — handled by new export dropdown section below


// ═══════════════════════════════════════════════════════════════
// XML SPREADSHEET PARSING (for .xls templates generated by this extension)
// ═══════════════════════════════════════════════════════════════

// Helper to get 1-based column index from XML Spreadsheet Cell (handles ss:Index, Index, etc.)
function getSpreadsheetCellIndex(cell, ns) {
  if (!cell) return null;
  let val = null;
  if (cell.getAttributeNS) {
    val = cell.getAttributeNS(ns, 'Index');
  }
  if (!val && cell.getAttribute) {
    val = cell.getAttribute('ss:Index') || cell.getAttribute('Index') || cell.getAttribute('ss:index') || cell.getAttribute('index');
  }
  if (!val && cell.attributes) {
    for (let i = 0; i < cell.attributes.length; i++) {
      const a = cell.attributes[i];
      const name = (a.localName || a.name || '').toLowerCase();
      if (name === 'index' || name.endsWith(':index')) {
        val = a.value;
        break;
      }
    }
  }
  if (val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

// Helper to extract text from XML Spreadsheet Cell
function getSpreadsheetCellText(cell, ns) {
  if (!cell) return '';
  let dataEl = null;
  if (cell.getElementsByTagNameNS) {
    dataEl = cell.getElementsByTagNameNS(ns, 'Data')[0];
  }
  if (!dataEl && cell.getElementsByTagName) {
    dataEl = cell.getElementsByTagName('Data')[0] || cell.getElementsByTagName('ss:Data')[0];
  }
  if (dataEl) return (dataEl.textContent || '').trim();
  return (cell.textContent || '').trim();
}

function parseXMLSpreadsheet(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML Spreadsheet: ' + parseError.textContent.slice(0, 100));
  }

  // Handle namespace — XML Spreadsheet uses urn:schemas-microsoft-com:office:spreadsheet
  const ns = 'urn:schemas-microsoft-com:office:spreadsheet';
  let rows = doc.getElementsByTagNameNS(ns, 'Row');
  if (rows.length === 0) rows = doc.getElementsByTagName('Row');
  if (rows.length < 2) throw new Error('No data rows found in spreadsheet.');

  // Extract headers from first row
  const headerRow = rows[0];
  let headerCells = headerRow.getElementsByTagNameNS(ns, 'Cell');
  if (headerCells.length === 0) headerCells = headerRow.getElementsByTagName('Cell');
  
  const headers = [];
  let hCol = 0;
  for (let i = 0; i < headerCells.length; i++) {
    const cell = headerCells[i];
    const idx = getSpreadsheetCellIndex(cell, ns);
    if (idx !== null) {
      hCol = idx - 1; // 1-based to 0-based
    }
    const val = getSpreadsheetCellText(cell, ns).toLowerCase().replace(/['"]/g, '').replace(/[^\x20-\x7E]/g, '');
    headers[hCol] = val;
    hCol++;
  }

  // Ensure headers array has no empty holes
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === undefined) headers[i] = '';
  }

  const totalCols = headers.length;
  const csvLines = [headers.join(',')];

  for (let r = 1; r < rows.length; r++) {
    let cells = rows[r].getElementsByTagNameNS(ns, 'Cell');
    if (cells.length === 0) cells = rows[r].getElementsByTagName('Cell');
    if (cells.length === 0) continue;

    const rowVals = new Array(totalCols).fill('');
    let cCol = 0;

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const idx = getSpreadsheetCellIndex(cell, ns);
      if (idx !== null) {
        cCol = idx - 1; // 1-based to 0-based
      }
      const val = getSpreadsheetCellText(cell, ns);
      if (cCol < rowVals.length) {
        rowVals[cCol] = val;
      } else {
        rowVals.push(val);
      }
      cCol++;
    }

    // Escape CSV values
    const escapedRow = rowVals.map(val => {
      const s = String(val !== undefined && val !== null ? val : '').trim();
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });

    if (rowVals.some(v => v !== '')) {
      csvLines.push(escapedRow.join(','));
    }
  }

  return parseCSV(csvLines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const trimmed = (text || '').trimStart();
      if (file.name.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        uploadedRecords = JSON.parse(text);
      } else if (trimmed.startsWith('<?xml') || trimmed.startsWith('<Workbook') || trimmed.includes('urn:schemas-microsoft-com:office:spreadsheet')) {
        uploadedRecords = parseXMLSpreadsheet(text);
      } else {
        uploadedRecords = parseCSV(text);
      }
      if (uploadedRecords.length === 0) throw new Error('No valid records found.');

      // Duplicate VIN detection
      const vinSet = new Set();
      const dupes = [];
      uploadedRecords = uploadedRecords.filter(r => {
        if (vinSet.has(r.vin)) { dupes.push(r.vin); return false; }
        vinSet.add(r.vin);
        return true;
      });
      if (dupes.length > 0) {
        showValidationAlert(`${dupes.length} duplicate VIN(s) removed: ${dupes.slice(0,3).join(', ')}${dupes.length > 3 ? '...' : ''}`, 'warning');
      }

      // Smart validation
      let invalidCount = 0;
      uploadedRecords.forEach(r => {
        r._errors = [];
        r.vin = String(r.vin || '').toUpperCase().trim();
        if (!r.vin || r.vin.length < 10 || r.vin.length > 17) r._errors.push('Invalid VIN length');
        if (!/^[A-Z0-9]+$/i.test(r.vin || '')) r._errors.push('VIN has invalid chars');
        
        if (activeTab === 'joyride') {
          if (r.joyride_card_number) {
            r.joyride_card_number = String(r.joyride_card_number).replace(/[\s\-]/g, '').trim();
          }
          if (!r.joyride_card_number) {
            r._errors.push('Missing card #');
          } else if (/[eE]\+/.test(r.joyride_card_number)) {
            r._errors.push('Sci. notation in card #');
          }

          const rawDisc = String(r.discount !== undefined && r.discount !== null ? r.discount : '').trim();
          const cleanDisc = rawDisc.replace(/[^\d.]/g, '');
          if (cleanDisc === '' || isNaN(Number(cleanDisc))) {
            r._errors.push('Invalid discount');
          } else {
            r.discount = cleanDisc;
          }
        } else {
          if (!r.dob) r._errors.push('Missing DOB');
          if (!r.city) r._errors.push('Missing city');
          if (!r.nominee_name) r._errors.push('Missing nominee');
          if (!r.nominee_relation) r._errors.push('Missing nominee relation');
        }
        if (r._errors.length > 0) invalidCount++;
      });
      if (invalidCount > 0) {
        showValidationAlert(`${invalidCount} record(s) have validation issues. Check preview table.`, 'warning');
      }

      fileInfo.textContent = `${file.name} — ${uploadedRecords.length} records loaded`;
      fileInfo.style.color = 'var(--success)';
      btnStart.disabled = false;
      btnReset.disabled = false;
      statTotal.textContent = uploadedRecords.length;
      statPending.textContent = uploadedRecords.length;

      renderPreviewTable(uploadedRecords);
      
      if (activeTab === 'joyride') {
        const hasSciNotation = uploadedRecords.some(r => /[eE]\+/.test(r.joyride_card_number || ''));
        if (hasSciNotation) {
          addLog(`Warning: Scientific notation detected in Joyride Card Number. Excel truncates 16-digit numbers when saved this way. Please format column as Text in Excel.`, 'warning');
        }
      }
      
      addLog(`File loaded: ${file.name} (${uploadedRecords.length} records)`, 'info');
      chrome.runtime.sendMessage({ type: 'SET_QUEUE', queue: uploadedRecords });
    } catch (err) {
      addLog(`File error: ${err.message}`, 'error');
      fileInfo.textContent = 'Error parsing file. Check format.';
      fileInfo.style.color = 'var(--danger)';
      btnStart.disabled = true;
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════
// SESSION PERSISTENCE CONTROLS
// ═══════════════════════════════════════════════════════════════

function refreshSessionBadge() {
  chrome.runtime.sendMessage({ type: 'GET_COMPLETED_VINS', tab: activeTab }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    const badge = document.getElementById('session-count-badge');
    if (badge) {
      const count = response.count || 0;
      badge.textContent = count > 0 ? `${count} VINs saved` : 'No saved VINs';
      badge.className = 'session-count-badge' + (count > 0 ? ' has-data' : '');
    }
  });
}

function initSessionControls() {
  const clearBtn = document.getElementById('btn-clear-session');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm(`Clear all saved session data for ${activeTab === 'goodlife' ? 'GoodLife' : 'Joyride'}?\n\nThis will allow previously completed VINs to be processed again.`)) {
        chrome.runtime.sendMessage({ type: 'CLEAR_COMPLETED_VINS', tab: activeTab }, () => {
          refreshSessionBadge();
          addLog('Session history cleared. All VINs will be processed fresh on next run.', 'info');
        });
      }
    });
  }
}

function parseCSV(text) {
  // Strip UTF-8 BOM that Excel adds to CSV files
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Auto-detect delimiter from header line: comma, semicolon, tab
  const firstLine = lines[0];
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const rawHeaders = parseCSVLine(firstLine, delimiter);
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/['"]/g, '').replace(/[^\x20-\x7E]/g, ''));
  
  const findCol = (...names) => {
    // 1. Exact match
    const exact = headers.findIndex(h => names.some(n => h === n));
    if (exact !== -1) return exact;
    // 2. Normalized match (without whitespace, underscores, hyphens)
    const normHeaders = headers.map(h => h.replace(/[\s_\-]+/g, ''));
    const normNames = names.map(n => n.replace(/[\s_\-]+/g, ''));
    const normMatch = normHeaders.findIndex(h => normNames.some(n => h === n));
    if (normMatch !== -1) return normMatch;
    // 3. Substring match
    return headers.findIndex(h => names.some(n => h.includes(n)));
  };

  const vinIdx = findCol('vin');
  if (vinIdx === -1) throw new Error('CSV must have a "vin" column.');

  const records = [];
  
  if (activeTab === 'goodlife') {
    const dobIdx = findCol('dob', 'birth_dt', 'birth');
    const districtIdx = findCol('district', 'dist');
    const cityIdx = findCol('city');
    const mobileIdx = findCol('mobile', 'mobile_no', 'mobile_number', 'phone', 'contact', 'customer_mobile', 'owner_mobile');
    const emailIdx = findCol('email', 'email_id', 'mail', 'customer_email', 'owner_email');
    const typeIdx = findCol('transaction_type', 'type', 'transaction');
    const cardModeIdx = findCol('card_mode', 'cardmode', 'mode');
    const memberTypeIdx = findCol('membership_type', 'membershiptype');
    const variantIdx = findCol('variant', 'buying_for', 'buyingfor');
    const declRelationIdx = findCol('declaration_relation', 'decl_relation', 'relation_type', 'relation_of', 'declaration_relation_of', 'relation');
    const declRelNameIdx = findCol('declaration_relation_name', 'decl_relation_name', 'relation_name');
    const nomineeNameIdx = findCol('nominee_name', 'nominee');
    const nomineeRelIdx = findCol('nominee_relation', 'nominee_relationship');
    const nomineeContactIdx = findCol('nominee_contact', 'nominee_phone');
    const nomineeAddressIdx = findCol('nominee_address');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line, delimiter);
      if (!cols[vinIdx]) continue;
      records.push({
        vin: cols[vinIdx].toUpperCase(),
        dob: dobIdx !== -1 ? cols[dobIdx] : '',
        district: districtIdx !== -1 ? cols[districtIdx] : '',
        city: cityIdx !== -1 ? cols[cityIdx] : '',
        mobile: mobileIdx !== -1 ? cols[mobileIdx] : '',
        email: emailIdx !== -1 ? cols[emailIdx] : '',
        transaction_type: typeIdx !== -1 ? (cols[typeIdx] || 'N') : 'N',
        card_mode: cardModeIdx !== -1 ? (cols[cardModeIdx] || 'e-Card') : 'e-Card',
        membership_type: memberTypeIdx !== -1 ? (cols[memberTypeIdx] || '1') : '1',
        variant: variantIdx !== -1 ? (cols[variantIdx] || '299') : '299',
        declaration_relation: declRelationIdx !== -1 ? (cols[declRelationIdx] || 'WIFE OF') : 'WIFE OF',
        declaration_relation_name: declRelNameIdx !== -1 ? cols[declRelNameIdx] : '',
        nominee_name: nomineeNameIdx !== -1 ? cols[nomineeNameIdx] : '',
        nominee_relation: nomineeRelIdx !== -1 ? cols[nomineeRelIdx] : '',
        nominee_contact: nomineeContactIdx !== -1 ? (cols[nomineeContactIdx] || '0000000000') : '0000000000',
        nominee_address: nomineeAddressIdx !== -1 ? cols[nomineeAddressIdx] : ''
      });
    }
  } else {
    const mobileIdx = findCol('mobile', 'mobile_no', 'mobile_number', 'phone', 'contact', 'customer_mobile', 'owner_mobile');
    const emailIdx = findCol('email', 'email_id', 'mail', 'customer_email', 'owner_email');
    const districtIdx = findCol('district', 'dist');
    const cityIdx = findCol('city');
    const typeIdx = findCol('transaction_type', 'trans_type', 'transaction', 'type');
    const yearIdx = findCol('joyride_year', 'year', 'duration');
    const pkgIdx = findCol('joyride_package', 'package', 'package_type', 'pkg');
    const payNumIdx = findCol('joyride_card_number', 'payment_number', 'payment_no', 'pay_number', 'pay_no', 'card_number', 'card_no', 'card#', 'card');
    const payAmtIdx = findCol('discount', 'joyride_discount', 'payment_amount', 'amount', 'pay_amount', 'pay_amt');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line, delimiter);
      if (!cols[vinIdx]) continue;
      records.push({
        vin: cols[vinIdx].toUpperCase(),
        mobile: mobileIdx !== -1 ? cols[mobileIdx] : '',
        email: emailIdx !== -1 ? cols[emailIdx] : '',
        district: districtIdx !== -1 ? cols[districtIdx] : '',
        city: cityIdx !== -1 ? cols[cityIdx] : '',
        transaction_type: typeIdx !== -1 ? (cols[typeIdx] || 'N') : 'N',
        joyride_year: yearIdx !== -1 ? (cols[yearIdx] || '1') : '1',
        joyride_package: pkgIdx !== -1 ? (cols[pkgIdx] || '2') : '2',
        joyride_card_number: payNumIdx !== -1 ? (cols[payNumIdx] || '') : '',
        discount: payAmtIdx !== -1 ? (cols[payAmtIdx] || '') : ''
      });
    }
  }
  return records;
}

function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^['"]+|['"]+$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^['"]+|['"]+$/g, ''));
  return result;
}

// ═══════════════════════════════════════════════════════════════
// DATA PREVIEW TABLE
// ═══════════════════════════════════════════════════════════════

function renderPreviewTable(records) {
  previewSection.style.display = '';
  previewCount.textContent = `${records.length} records`;
  previewTbody.innerHTML = '';
  selectedRows.clear();
  records.forEach((_, i) => selectedRows.add(i));
  const selectAll = document.getElementById('select-all-rows');
  if (selectAll) selectAll.checked = true;
  updateSelectedCount();
  
  const headTr = document.getElementById('preview-thead-tr');
  if (activeTab === 'goodlife') {
    headTr.innerHTML = `<th></th><th>#</th><th>VIN</th><th>DOB</th><th>City</th><th>Nominee</th><th>Status</th>`;
    records.forEach((r, i) => {
      const errors = r._errors || [];
      const statusHtml = errors.length === 0
        ? '<span class="row-valid">Valid</span>'
        : `<span class="row-invalid" title="${errors.join(', ')}">${errors[0]}</span>`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" data-idx="${i}" checked></td>
        <td>${i + 1}</td>
        <td style="font-family:'Courier New',monospace;font-weight:600;">${r.vin}</td>
        <td>${r.dob || '—'}</td>
        <td>${r.city || '—'}</td>
        <td>${r.nominee_name || '—'}</td>
        <td>${statusHtml}</td>
      `;
      tr.querySelector('.row-checkbox').addEventListener('change', (e) => {
        if (e.target.checked) selectedRows.add(i); else selectedRows.delete(i);
        updateSelectedCount();
      });
      previewTbody.appendChild(tr);
    });
  } else {
    headTr.innerHTML = `<th></th><th>#</th><th>VIN</th><th>City</th><th>Card #</th><th>Discount</th><th>Status</th>`;
    records.forEach((r, i) => {
      const errors = r._errors || [];
      const isSci = /[eE]\+/.test(r.joyride_card_number || '');
      let statusHtml = '';
      if (errors.length > 0) {
        statusHtml = `<span class="row-invalid" title="${errors.join(', ')}">${errors[0]}</span>`;
      } else if (isSci) {
        statusHtml = '<span class="row-invalid" style="color:var(--warning);" title="Scientific notation detected">Sci. Notation</span>';
      } else {
        statusHtml = '<span class="row-valid">Valid</span>';
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" data-idx="${i}" checked></td>
        <td>${i + 1}</td>
        <td style="font-family:'Courier New',monospace;font-weight:600;">${r.vin}</td>
        <td>${r.city || r.district || (r.transaction_type === 'N' ? 'New' : r.transaction_type)}</td>
        <td style="${isSci ? 'color:var(--warning);font-weight:600;' : ''}">${r.joyride_card_number || '—'}</td>
        <td>₹${r.discount || '—'}</td>
        <td>${statusHtml}</td>
      `;
      tr.querySelector('.row-checkbox').addEventListener('change', (e) => {
        if (e.target.checked) selectedRows.add(i); else selectedRows.delete(i);
        updateSelectedCount();
      });
      previewTbody.appendChild(tr);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// UI STATE SYNC
// ═══════════════════════════════════════════════════════════════

function updateUI(state) {
  const currentTab = state.activeTab || 'joyride';
  activeTab = currentTab;

  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === currentTab);
  });

  const tabState = state[currentTab] || { status: 'IDLE', queue: [], index: 0, results: [], logs: [] };
  const { status, queue, index, results, logs } = tabState;

  // Badge
  statusBadge.textContent = status;
  statusBadge.className = 'badge';
  if (status === 'RUNNING') statusBadge.classList.add('running');
  if (status === 'PAUSED') statusBadge.classList.add('paused');

  // Stats
  const total = queue ? queue.length : 0;
  const successCount = results ? results.filter(r => r.status === 'Success').length : 0;
  const errorCount = results ? results.filter(r => r.status === 'Error').length : 0;
  const pendingCount = total - (index || 0);

  statTotal.textContent = total;
  statSuccess.textContent = successCount;
  statError.textContent = errorCount;
  statPending.textContent = pendingCount > 0 ? pendingCount : 0;

  // Analytics
  const withDuration = results ? results.filter(r => r.duration !== undefined) : [];
  let avgSpeed = 0;
  if (withDuration.length > 0) {
    avgSpeed = Math.round(withDuration.reduce((a, r) => a + r.duration, 0) / withDuration.length * 10) / 10;
    metricSpeed.textContent = `${avgSpeed}s/VIN`;
  } else {
    metricSpeed.textContent = '--';
  }

  if (status === 'RUNNING' && avgSpeed > 0 && index < total) {
    const remSec = (total - index) * avgSpeed;
    const m = Math.floor(remSec / 60);
    const s = Math.round(remSec % 60);
    metricEtr.textContent = `${m}m ${s}s`;
  } else {
    metricEtr.textContent = '--';
  }

  if (results && results.length > 0) {
    const rate = Math.round((successCount / results.length) * 100);
    metricRate.textContent = `${rate}%`;
  } else {
    metricRate.textContent = '--';
  }

  btnExportReport.disabled = !results || results.length === 0;

  // Restore queue data
  if (total > 0 && uploadedRecords.length === 0) {
    uploadedRecords = queue;
    fileInfo.textContent = `Active queue: ${total} records`;
    fileInfo.style.color = 'var(--info)';
    renderPreviewTable(queue);
  } else if (total === 0 && uploadedRecords.length === 0) {
      fileInfo.textContent = activeTab === 'goodlife'
        ? 'Required: VIN, DOB, City, Nominee Name/Relation/Contact'
        : 'Required: VIN, District, City, Card Number, Discount';
    fileInfo.style.color = 'var(--text-dim)';
  }

  // Progress
  if (total > 0) {
    const pct = Math.round((index / total) * 100);
    progressPercent.textContent = `${pct}%`;
    progressBarFill.style.width = `${pct}%`;
    if (status === 'RUNNING' && queue[index]) {
      progressCurrent.textContent = `Processing: ${queue[index].vin}`;
    } else if (status === 'PAUSED_NETWORK') {
      progressCurrent.textContent = '🌐 Internet connection lost! Waiting for connection to restore...';
    } else if (status === 'IDLE' && index >= total && total > 0) {
      progressCurrent.textContent = 'All records processed!';
    } else {
      progressCurrent.textContent = '';
    }
  } else {
    progressPercent.textContent = '0%';
    progressBarFill.style.width = '0%';
    progressCurrent.textContent = '';
  }

  // Buttons
  if (status === 'RUNNING' || status === 'PAUSED_NETWORK') {
    btnStart.disabled = true;
    btnSkip.disabled = false;
    btnPause.disabled = false;
    btnReset.disabled = false;
    dropZone.style.pointerEvents = 'none';
    dropZone.style.opacity = '0.5';
  } else if (status === 'PAUSED') {
    btnStart.disabled = false;
    btnSkip.disabled = true;
    btnPause.disabled = true;
    btnReset.disabled = false;
    dropZone.style.pointerEvents = 'none';
    dropZone.style.opacity = '0.5';
  } else {
    btnStart.disabled = uploadedRecords.length === 0;
    btnSkip.disabled = true;
    btnPause.disabled = true;
    btnReset.disabled = total === 0 && uploadedRecords.length === 0;
    dropZone.style.pointerEvents = 'auto';
    dropZone.style.opacity = '1';
  }

  // Render results & logs
  renderResults(results, total);
  if (logs) { currentLogs = logs; renderLogs(); }

  // Donut chart
  const skippedCount = results ? results.filter(r => r.status === 'Skipped').length : 0;
  const statSkipped = document.getElementById('stat-skipped');
  if (statSkipped) statSkipped.textContent = skippedCount;
  updateDonutChart(successCount, errorCount, skippedCount, pendingCount > 0 ? pendingCount : 0);

  // Retry all failed button
  const retryAllBtn = document.getElementById('btn-retry-all-failed');
  if (retryAllBtn) retryAllBtn.disabled = errorCount === 0 || status === 'RUNNING';

  // Refresh session badge
  refreshSessionBadge();

  // Completion check
  checkForCompletion(state);
}

// ═══════════════════════════════════════════════════════════════
// RESULTS (AUDIT TRAIL)
// ═══════════════════════════════════════════════════════════════

function renderResults(results, total) {
  resultsCount.textContent = `${results ? results.length : 0} / ${total}`;
  if (!results || results.length === 0) {
    resultsList.innerHTML = '<div class="results-empty">No vehicles enrolled yet. Upload CSV to begin.</div>';
    return;
  }
  resultsList.innerHTML = '';
  [...results].reverse().forEach(res => {
    const item = document.createElement('div');
    item.className = `result-item ${res.status === 'Success' ? 'success' : res.status === 'Skipped' ? 'warning' : 'error'}`;

    const left = document.createElement('div');
    left.className = 'result-left';
    const vin = document.createElement('span');
    vin.className = 'result-vin';
    vin.textContent = res.vin;
    left.appendChild(vin);
    if (res.status !== 'Success' && res.errorDetails) {
      const hint = document.createElement('span');
      hint.className = 'result-error-hint';
      hint.textContent = res.errorDetails;
      hint.title = res.errorDetails;
      left.appendChild(hint);
    }
    item.appendChild(left);

    const right = document.createElement('div');
    right.className = 'result-details';
    const st = document.createElement('span');
    st.className = 'result-status';
    st.textContent = res.status === 'Success' ? 'OK' : res.status === 'Skipped' ? 'SKIP' : 'FAIL';
    right.appendChild(st);
    if (res.duration !== undefined) {
      const dur = document.createElement('span');
      dur.className = 'result-duration';
      dur.textContent = `${res.duration}s`;
      right.appendChild(dur);
    }
    // Retry & Copy buttons for failed rows
    if (res.status === 'Error') {
      const acts = document.createElement('div');
      acts.style.cssText = 'display:flex;gap:4px;margin-top:3px;';
      const retryB = document.createElement('button');
      retryB.className = 'retry-btn';
      retryB.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Retry`;
      retryB.addEventListener('click', () => retrySingle(res.vin));
      acts.appendChild(retryB);
      if (res.errorDetails) {
        const copyB = document.createElement('button');
        copyB.className = 'copy-err-btn';
        copyB.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy`;
        copyB.addEventListener('click', () => { navigator.clipboard.writeText(res.errorDetails); copyB.textContent = 'Copied'; });
        acts.appendChild(copyB);
      }
      right.appendChild(acts);
    }
    item.appendChild(right);
    resultsList.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════
// LOG CONSOLE
// ═══════════════════════════════════════════════════════════════

function renderLogs() {
  logConsole.innerHTML = '';
  const filtered = currentLogs.filter(log => {
    if (currentFilter !== 'all' && log.level !== currentFilter) return false;
    if (currentSearchQuery && !log.message.toLowerCase().includes(currentSearchQuery.toLowerCase())) return false;
    return true;
  });
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'log-item info';
    empty.style.fontStyle = 'italic';
    empty.style.borderLeft = 'none';
    empty.textContent = 'No matching logs.';
    logConsole.appendChild(empty);
    return;
  }
  filtered.forEach(log => {
    const item = document.createElement('div');
    item.className = `log-item ${log.level}`;
    const time = new Date(log.timestamp).toLocaleTimeString();
    item.textContent = `[${time}] ${log.message}`;
    logConsole.appendChild(item);
  });
  logConsole.scrollTop = logConsole.scrollHeight;
}

function addLog(message, level = 'info') {
  currentLogs.push({ message, level, timestamp: Date.now() });
  renderLogs();
}

// ═══════════════════════════════════════════════════════════════
// STATE UPDATE LISTENER
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATED') updateUI(message.state);
  if (message.type === 'SPEED_METRICS_UPDATED') updateAutoSpeedDisplay(message.metrics);
});

// ═══════════════════════════════════════════════════════════════
// SPEED & SAFETY CONTROLS (Auto/Manual Dual Mode)
// ═══════════════════════════════════════════════════════════════

const SPEED_PRESETS = [
  { label: 'Turbo',  multiplier: 0.4, cssClass: 'turbo',  badgeText: 'Turbo' },
  { label: 'Fast',   multiplier: 0.7, cssClass: 'fast',   badgeText: 'Fast' },
  { label: 'Normal', multiplier: 1.0, cssClass: 'normal', badgeText: 'Normal' },
  { label: 'Safe',   multiplier: 1.5, cssClass: 'safe',   badgeText: 'Safe' },
  { label: 'Ultra',  multiplier: 2.0, cssClass: 'ultra',  badgeText: 'Ultra Safe' }
];

let currentSpeedMode = 'auto';

function initSpeedControls() {
  const speedToggle = document.getElementById('speed-toggle');
  const speedBody = document.getElementById('speed-control-body');
  const speedArrow = document.getElementById('speed-toggle-arrow');
  const speedSlider = document.getElementById('speed-slider');
  const speedBadge = document.getElementById('speed-value-badge');
  const retrySelect = document.getElementById('retry-select');
  const timeoutSelect = document.getElementById('timeout-select');
  const autoPanel = document.getElementById('auto-speed-panel');
  const manualPanel = document.getElementById('manual-speed-panel');
  const modeAutoBtn = document.getElementById('speed-mode-auto');
  const modeManualBtn = document.getElementById('speed-mode-manual');
  const skipRenewalsToggle = document.getElementById('skip-renewals-toggle');
  if (!speedToggle || !speedSlider) return;

  // Collapse/expand toggle
  speedToggle.addEventListener('click', () => {
    const collapsed = speedBody.classList.toggle('collapsed');
    speedArrow.classList.toggle('open', !collapsed);
  });

  // Speed mode badge updater (for manual mode)
  function updateBadge(val) {
    const preset = SPEED_PRESETS[val] || SPEED_PRESETS[2];
    speedBadge.textContent = preset.badgeText;
    speedBadge.className = 'speed-value-badge ' + preset.cssClass;
  }

  // Switch Auto/Manual panels
  function setSpeedMode(mode) {
    currentSpeedMode = mode;
    modeAutoBtn.classList.toggle('active', mode === 'auto');
    modeManualBtn.classList.toggle('active', mode === 'manual');
    autoPanel.style.display = mode === 'auto' ? '' : 'none';
    manualPanel.style.display = mode === 'manual' ? '' : 'none';
    chrome.runtime.sendMessage({ type: 'UPDATE_SPEED_SETTINGS', speed_mode: mode });
    chrome.storage.local.set({ speed_mode: mode });
  }

  modeAutoBtn.addEventListener('click', () => setSpeedMode('auto'));
  modeManualBtn.addEventListener('click', () => setSpeedMode('manual'));

  // Restore saved settings
  chrome.storage.local.get(['speed_multiplier', 'max_retries', 'record_timeout', 'speed_mode', 'skip_renewals'], (data) => {
    // Speed mode
    if (data.speed_mode) {
      currentSpeedMode = data.speed_mode;
      modeAutoBtn.classList.toggle('active', currentSpeedMode === 'auto');
      modeManualBtn.classList.toggle('active', currentSpeedMode === 'manual');
      autoPanel.style.display = currentSpeedMode === 'auto' ? '' : 'none';
      manualPanel.style.display = currentSpeedMode === 'manual' ? '' : 'none';
    }
    // Manual slider
    if (data.speed_multiplier !== undefined) {
      const idx = SPEED_PRESETS.findIndex(p => Math.abs(p.multiplier - data.speed_multiplier) < 0.05);
      speedSlider.value = idx >= 0 ? idx : 2;
    }
    updateBadge(parseInt(speedSlider.value));
    if (data.max_retries !== undefined) retrySelect.value = String(data.max_retries);
    if (data.record_timeout !== undefined) timeoutSelect.value = String(data.record_timeout);
    // Renewal skip
    if (data.skip_renewals !== undefined) skipRenewalsToggle.checked = data.skip_renewals;
  });

  // Manual speed slider
  speedSlider.addEventListener('input', () => {
    const val = parseInt(speedSlider.value);
    updateBadge(val);
    chrome.runtime.sendMessage({ type: 'UPDATE_SPEED_SETTINGS', speed_multiplier: SPEED_PRESETS[val].multiplier });
  });
  retrySelect.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'UPDATE_SPEED_SETTINGS', max_retries: parseInt(retrySelect.value) });
  });
  timeoutSelect.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'UPDATE_SPEED_SETTINGS', record_timeout: parseInt(timeoutSelect.value) });
  });

  // Renewal skip toggle
  skipRenewalsToggle.addEventListener('change', () => {
    const val = skipRenewalsToggle.checked;
    chrome.runtime.sendMessage({ type: 'UPDATE_SPEED_SETTINGS', skip_renewals: val });
    chrome.storage.local.set({ skip_renewals: val });
    addLog(val ? 'Renewal skip ENABLED — renewals will be auto-skipped.' : 'Renewal skip DISABLED — renewals will be processed.', 'info');
  });
}

// ═══════════════════════════════════════════════════════════════
// AUTO SPEED DISPLAY UPDATER
// ═══════════════════════════════════════════════════════════════
function updateAutoSpeedDisplay(metrics) {
  if (!metrics) return;
  const multiplierEl = document.getElementById('auto-speed-multiplier');
  const responseEl = document.getElementById('auto-speed-response');
  const healthEl = document.getElementById('auto-speed-health');
  const barEl = document.getElementById('auto-speed-bar');

  if (multiplierEl) {
    const m = metrics.currentMultiplier || 1.0;
    multiplierEl.textContent = m.toFixed(2) + 'x';
    multiplierEl.className = 'auto-metric-value ' + (m < 0.5 ? 'speed-fast' : m < 1.0 ? 'speed-normal' : 'speed-slow');
  }
  if (responseEl) {
    const r = metrics.avgResponseMs || 0;
    responseEl.textContent = r > 0 ? Math.round(r) + 'ms' : '--ms';
    responseEl.className = 'auto-metric-value ' + (r < 500 ? 'speed-fast' : r < 1500 ? 'speed-normal' : 'speed-slow');
  }
  if (healthEl) {
    const score = metrics.healthScore || 50;
    let healthClass = 'health-excellent';
    let healthText = '●';
    if (score >= 80) { healthClass = 'health-excellent'; healthText = '● Great'; }
    else if (score >= 60) { healthClass = 'health-good'; healthText = '● Good'; }
    else if (score >= 40) { healthClass = 'health-fair'; healthText = '● Fair'; }
    else { healthClass = 'health-poor health-pulsing'; healthText = '● Slow'; }
    healthEl.textContent = healthText;
    healthEl.className = 'auto-metric-value ' + healthClass;
  }
  if (barEl) {
    const score = metrics.healthScore || 50;
    barEl.style.width = Math.max(5, Math.min(100, score)) + '%';
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate and download an Excel XML Spreadsheet with all cells formatted as Text
function downloadExcelTemplate(headers, dataRows, filename) {
  const escXml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';

  // Define a Text style so all cells are formatted as plain text
  xml += '<Styles>\n';
  xml += '  <Style ss:ID="Default" ss:Name="Normal"><NumberFormat ss:Format="@"/></Style>\n';
  xml += '  <Style ss:ID="sHeader"><Font ss:Bold="1"/><NumberFormat ss:Format="@"/></Style>\n';
  xml += '  <Style ss:ID="sText"><NumberFormat ss:Format="@"/></Style>\n';
  xml += '</Styles>\n';

  xml += '<Worksheet ss:Name="Template">\n';
  xml += '<Table>\n';

  // Column widths (auto)
  headers.forEach(() => { xml += '<Column ss:AutoFitWidth="1"/>\n'; });

  // Header row
  xml += '<Row>\n';
  headers.forEach(h => {
    xml += `  <Cell ss:StyleID="sHeader"><Data ss:Type="String">${escXml(h)}</Data></Cell>\n`;
  });
  xml += '</Row>\n';

  // Data rows — all as String type to preserve text formatting
  dataRows.forEach(row => {
    xml += '<Row>\n';
    row.forEach(val => {
      xml += `  <Cell ss:StyleID="sText"><Data ss:Type="String">${escXml(val)}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
  });

  xml += '</Table>\n';
  xml += '</Worksheet>\n';
  xml += '</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION ALERT
// ═══════════════════════════════════════════════════════════════
function showValidationAlert(text, type = 'warning') {
  const el = document.getElementById('validation-alert');
  const textEl = document.getElementById('validation-alert-text');
  if (!el || !textEl) return;
  textEl.textContent = text;
  el.className = 'validation-alert show ' + type;
}
(function() {
  const dismissBtn = document.getElementById('dismiss-validation-alert');
  if (dismissBtn) dismissBtn.addEventListener('click', () => {
    document.getElementById('validation-alert').classList.remove('show');
  });
})();

// ═══════════════════════════════════════════════════════════════
// COMPLETION MODAL
// ═══════════════════════════════════════════════════════════════
let lastKnownStatus = 'IDLE';

function checkForCompletion(state) {
  const tabState = state[state.activeTab || activeTab] || {};
  const newStatus = tabState.status || 'IDLE';
  const total = tabState.queue ? tabState.queue.length : 0;
  const idx = tabState.index || 0;
  if (lastKnownStatus === 'RUNNING' && newStatus === 'IDLE' && idx >= total && total > 0) {
    showCompletionModal(tabState);
    playSound('success');
  }
  lastKnownStatus = newStatus;
}

function showCompletionModal(tabState) {
  const results = tabState.results || [];
  const successCount = results.filter(r => r.status === 'Success').length;
  const errorCount = results.filter(r => r.status === 'Error').length;
  const skippedCount = results.filter(r => r.status === 'Skipped').length;
  const durations = results.filter(r => r.duration !== undefined).map(r => r.duration);
  const totalTime = durations.reduce((a, b) => a + b, 0);
  const m = Math.floor(totalTime / 60), s = totalTime % 60;

  const overlay = document.getElementById('completion-overlay');
  const grid = document.getElementById('completion-stats-grid');
  const retryBtn = document.getElementById('completion-retry');
  if (!overlay || !grid) return;

  grid.innerHTML = `
    <div class="completion-stat s-success"><span class="cs-value">${successCount}</span><span class="cs-label">Success</span></div>
    <div class="completion-stat s-error"><span class="cs-value">${errorCount}</span><span class="cs-label">Failed</span></div>
    <div class="completion-stat s-skipped"><span class="cs-value">${skippedCount}</span><span class="cs-label">Skipped</span></div>
    <div class="completion-stat s-time"><span class="cs-value">${m}m ${s}s</span><span class="cs-label">Total Time</span></div>
  `;
  retryBtn.style.display = errorCount > 0 ? '' : 'none';
  overlay.classList.add('show');
}

(function() {
  const closeBtn = document.getElementById('completion-close');
  const exportBtn = document.getElementById('completion-export');
  const retryBtn = document.getElementById('completion-retry');
  const overlay = document.getElementById('completion-overlay');
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
  if (exportBtn) exportBtn.addEventListener('click', () => { document.getElementById('btn-export-report').click(); overlay.classList.remove('show'); });
  if (retryBtn) retryBtn.addEventListener('click', () => { retryAllFailed(); overlay.classList.remove('show'); });
})();

// ═══════════════════════════════════════════════════════════════
// RETRY FAILED
// ═══════════════════════════════════════════════════════════════
function retryAllFailed() {
  chrome.runtime.sendMessage({ type: 'RETRY_ALL_FAILED' });
}

function retrySingle(vin) {
  chrome.runtime.sendMessage({ type: 'RETRY_SINGLE', vin });
}

(function() {
  const btn = document.getElementById('btn-retry-all-failed');
  if (btn) btn.addEventListener('click', retryAllFailed);
})();

// ═══════════════════════════════════════════════════════════════
// EXPORT DROPDOWN (CSV / JSON / Clipboard)
// ═══════════════════════════════════════════════════════════════
(function() {
  const exportBtn = document.getElementById('btn-export-report');
  const menu = document.getElementById('export-menu');
  if (!exportBtn || !menu) return;

  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });
  document.addEventListener('click', () => menu.classList.remove('show'));

  function getExportData(cb) {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      const as = response[activeTab] || response;
      cb(as.results || []);
    });
  }

  function buildCSV(results) {
    let csv = activeTab === 'goodlife'
      ? 'VIN,DOB,District,City,Nominee,Status,Error,Duration,Timestamp\n'
      : 'VIN,Mobile,Email,District,City,Transaction,Card#,Discount,Status,Error,Duration,Timestamp\n';
    results.forEach(r => {
      const ts = new Date(r.timestamp || Date.now()).toLocaleString();
      const err = r.errorDetails ? `"${r.errorDetails.replace(/"/g, '""')}"` : '';
      if (activeTab === 'goodlife') {
        csv += `"${r.vin}","${r.dob||''}","${r.district||''}","${r.city||''}","${r.nominee_name||''}","${r.status}",${err},"${r.duration||''}","${ts}"\n`;
      } else {
        csv += `"${r.vin}","${r.mobile||''}","${r.email||''}","${r.district||''}","${r.city||''}","${r.transaction_type||'N'}","${r.joyride_card_number||''}","${r.discount||''}","${r.status}",${err},"${r.duration||''}","${ts}"\n`;
      }
    });
    return csv;
  }

  document.getElementById('export-csv').addEventListener('click', () => {
    getExportData(results => {
      if (!results.length) return alert('No data');
      downloadCSV(buildCSV(results), `${activeTab}_audit_${Date.now()}.csv`);
    });
    menu.classList.remove('show');
  });

  document.getElementById('export-json').addEventListener('click', () => {
    getExportData(results => {
      if (!results.length) return alert('No data');
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${activeTab}_audit_${Date.now()}.json`;
      a.click(); URL.revokeObjectURL(url);
    });
    menu.classList.remove('show');
  });

  document.getElementById('export-clipboard').addEventListener('click', () => {
    getExportData(results => {
      if (!results.length) return alert('No data');
      const text = buildCSV(results).replace(/,/g, '\t');
      navigator.clipboard.writeText(text).then(() => addLog('Data copied to clipboard!', 'success'));
    });
    menu.classList.remove('show');
  });
})();

// ═══════════════════════════════════════════════════════════════
// SOUND ALERTS
// ═══════════════════════════════════════════════════════════════
function playSound(type) {
  const toggle = document.getElementById('sound-toggle');
  if (toggle && !toggle.checked) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    if (type === 'success') {
      osc.frequency.value = 880; osc.type = 'sine';
      osc.start(); osc.stop(ctx.currentTime + 0.12);
      setTimeout(() => {
        const o2 = ctx.createOscillator(); o2.connect(gain);
        o2.frequency.value = 1100; o2.type = 'sine';
        o2.start(); o2.stop(ctx.currentTime + 0.15);
      }, 130);
    } else {
      osc.frequency.value = 440; osc.type = 'triangle';
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// DONUT CHART
// ═══════════════════════════════════════════════════════════════
function updateDonutChart(successCount, errorCount, skippedCount, pendingCount) {
  const section = document.getElementById('donut-section');
  const total = successCount + errorCount + skippedCount + pendingCount;
  if (total === 0) { if (section) section.style.display = 'none'; return; }
  if (section) section.style.display = '';
  const C = 2 * Math.PI * 16; // circumference
  const sArc = (successCount / total) * C;
  const eArc = (errorCount / total) * C;
  const kArc = (skippedCount / total) * C;
  const pArc = (pendingCount / total) * C;

  let offset = 0;
  const sEl = document.getElementById('donut-success');
  const eEl = document.getElementById('donut-error');
  const kEl = document.getElementById('donut-skipped');
  const pEl = document.getElementById('donut-pending');
  if (sEl) { sEl.setAttribute('stroke-dasharray', `${sArc} ${C - sArc}`); sEl.setAttribute('stroke-dashoffset', `-${offset}`); offset += sArc; }
  if (eEl) { eEl.setAttribute('stroke-dasharray', `${eArc} ${C - eArc}`); eEl.setAttribute('stroke-dashoffset', `-${offset}`); offset += eArc; }
  if (kEl) { kEl.setAttribute('stroke-dasharray', `${kArc} ${C - kArc}`); kEl.setAttribute('stroke-dashoffset', `-${offset}`); offset += kArc; }
  if (pEl) { pEl.setAttribute('stroke-dasharray', `${pArc} ${C - pArc}`); pEl.setAttribute('stroke-dashoffset', `-${offset}`); }

  const pctEl = document.getElementById('donut-pct');
  if (pctEl) pctEl.textContent = total > 0 ? Math.round(((successCount + errorCount + skippedCount) / total) * 100) + '%' : '0%';

  const ls = document.getElementById('legend-success');
  const le = document.getElementById('legend-error');
  const lk = document.getElementById('legend-skipped');
  const lp = document.getElementById('legend-pending');
  if (ls) ls.textContent = `${successCount} Success`;
  if (le) le.textContent = `${errorCount} Failed`;
  if (lk) lk.textContent = `${skippedCount} Skipped`;
  if (lp) lp.textContent = `${pendingCount} Pending`;
}

// ═══════════════════════════════════════════════════════════════
// SELECT ALL / ROW CHECKBOXES
// ═══════════════════════════════════════════════════════════════
let selectedRows = new Set();

function updateSelectedCount() {
  const label = document.getElementById('select-all-label');
  if (label) label.textContent = `${selectedRows.size}/${uploadedRecords.length}`;
}

(function() {
  const selectAll = document.getElementById('select-all-rows');
  if (selectAll) selectAll.addEventListener('change', () => {
    selectedRows.clear();
    if (selectAll.checked) uploadedRecords.forEach((_, i) => selectedRows.add(i));
    document.querySelectorAll('.row-checkbox').forEach((cb, i) => cb.checked = selectAll.checked);
    updateSelectedCount();
  });
})();

// ═══════════════════════════════════════════════════════════════
// LICENSE SYSTEM — UI Integration
// ═══════════════════════════════════════════════════════════════

let currentLicenseStatus = null;

function checkLicenseStatus() {
  chrome.runtime.sendMessage({ type: 'GET_LICENSE_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      console.warn('[License] Could not fetch license status');
      return;
    }
    currentLicenseStatus = response;
    updateLicenseBanner(response);
    updateLicenseOverlay(response);
    updateLicenseInfoSection(response);
    applyLicenseLock(response);
  });
}

function updateLicenseBanner(lic) {
  const banner = document.getElementById('license-banner');
  const text = document.getElementById('license-banner-text');
  const badge = document.getElementById('license-banner-badge');
  if (!banner || !text || !badge) return;

  // Remove all state classes
  banner.classList.remove('trial', 'trial-warning', 'licensed', 'expired');

  if (lic.status === 'TRIAL') {
    if (lic.daysLeft <= 5) {
      banner.classList.add('trial-warning');
      text.textContent = `Trial expiring soon! ${lic.daysLeft} day(s) left`;
      badge.textContent = `${lic.daysLeft}d LEFT`;
    } else {
      banner.classList.add('trial');
      text.textContent = `Free trial active — ${lic.daysLeft} day(s) remaining`;
      badge.textContent = 'TRIAL';
    }
  } else if (lic.status === 'LICENSED') {
    banner.classList.add('licensed');
    text.textContent = `Licensed ✓ — ${lic.daysLeft} day(s) remaining`;
    badge.textContent = 'LICENSED';
  } else if (lic.status === 'EXPIRED') {
    banner.classList.add('expired');
    text.textContent = lic.reason || 'License expired — activate to continue';
    badge.textContent = 'EXPIRED';
  } else {
    text.textContent = 'Checking license...';
    badge.textContent = '';
  }
}

function updateLicenseOverlay(lic) {
  const overlay = document.getElementById('license-overlay');
  if (!overlay) return;

  if (lic.status === 'EXPIRED') {
    overlay.classList.add('show');
    // Populate device ID
    const deviceEl = document.getElementById('lic-overlay-device-id');
    if (deviceEl && lic.deviceId) {
      deviceEl.textContent = lic.deviceId;
    }
  } else {
    overlay.classList.remove('show');
  }
}

function updateLicenseInfoSection(lic) {
  const statusEl = document.getElementById('lic-detail-status');
  const deviceEl = document.getElementById('lic-detail-device');
  const keyEl = document.getElementById('lic-detail-key');
  const expiryEl = document.getElementById('lic-detail-expiry');
  const daysEl = document.getElementById('lic-detail-days');
  const deactBtn = document.getElementById('btn-deactivate-license');

  if (statusEl) {
    const statusLabels = { TRIAL: '🔵 Free Trial', LICENSED: '🟢 Licensed', EXPIRED: '🔴 Expired' };
    statusEl.textContent = statusLabels[lic.status] || lic.status;
  }
  if (deviceEl) deviceEl.textContent = lic.deviceId || '--';
  if (keyEl) keyEl.textContent = lic.licenseKey || 'None';
  if (expiryEl) expiryEl.textContent = lic.expiryDate || '--';
  if (daysEl) {
    daysEl.textContent = lic.daysLeft !== undefined ? `${lic.daysLeft} days` : '--';
    daysEl.style.color = lic.daysLeft <= 5 ? 'var(--danger)' : lic.daysLeft <= 10 ? 'var(--warning)' : 'var(--success)';
  }
  if (deactBtn) {
    deactBtn.style.display = lic.status === 'LICENSED' ? '' : 'none';
  }
}

function applyLicenseLock(lic) {
  if (lic.status === 'EXPIRED') {
    document.body.classList.add('license-locked');
    // Disable all action buttons
    [btnStart, btnPause, btnReset, btnSkip].forEach(btn => {
      if (btn) btn.disabled = true;
    });
  } else {
    document.body.classList.remove('license-locked');
  }
}

function initLicenseUI() {
  // ── License Info Toggle ──
  const licToggle = document.getElementById('license-info-toggle');
  const licBody = document.getElementById('license-info-body');
  const licArrow = document.getElementById('license-info-arrow');
  if (licToggle && licBody && licArrow) {
    licToggle.addEventListener('click', () => {
      const isCollapsed = licBody.classList.contains('collapsed');
      licBody.classList.toggle('collapsed', !isCollapsed);
      licArrow.classList.toggle('open', isCollapsed);
    });
  }

  // ── Copy Device ID ──
  const copyBtn = document.getElementById('btn-copy-device-id');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const deviceEl = document.getElementById('lic-overlay-device-id');
      if (deviceEl) {
        navigator.clipboard.writeText(deviceEl.textContent).then(() => {
          copyBtn.innerHTML = '<span style="font-size:12px;">✓</span>';
          setTimeout(() => {
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }, 2000);
        });
      }
    });
  }

  // ── Key Input Auto-Formatting ──
  const keyInput = document.getElementById('lic-key-input');
  if (keyInput) {
    keyInput.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Add dashes after prefix and every 4 chars
      let formatted = '';
      if (val.length > 0) {
        // First 3 chars = GBE prefix
        formatted = val.substring(0, 3);
        val = val.substring(3);
        // Then groups of 4
        while (val.length > 0) {
          formatted += '-' + val.substring(0, 4);
          val = val.substring(4);
        }
      }
      e.target.value = formatted.substring(0, 23); // GBE-XXXX-XXXX-XXXX-XXXX = 23 chars

      // Clear error on type
      const errorEl = document.getElementById('lic-key-error');
      if (errorEl) errorEl.textContent = '';
      keyInput.classList.remove('error', 'success');
    });
  }

  // ── Activate Button ──
  const activateBtn = document.getElementById('btn-activate-license');
  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      const keyInput = document.getElementById('lic-key-input');
      const errorEl = document.getElementById('lic-key-error');
      const key = (keyInput ? keyInput.value : '').trim();

      if (!key || key.length < 23) {
        if (errorEl) errorEl.textContent = 'Please enter a complete license key';
        if (keyInput) keyInput.classList.add('error');
        return;
      }

      // Loading state
      activateBtn.classList.add('loading');
      activateBtn.textContent = 'Validating...';

      chrome.runtime.sendMessage({ type: 'ACTIVATE_LICENSE_KEY', key }, (response) => {
        activateBtn.classList.remove('loading');
        activateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Activate License';

        if (chrome.runtime.lastError || !response) {
          if (errorEl) errorEl.textContent = 'Activation failed. Please try again.';
          if (keyInput) keyInput.classList.add('error');
          return;
        }

        if (response.success) {
          if (keyInput) keyInput.classList.add('success');
          if (errorEl) {
            errorEl.style.color = '#00b5a3';
            errorEl.textContent = `✓ License activated! Valid for ${response.durationDays} days.`;
          }
          // Refresh license state after a short delay
          setTimeout(() => {
            checkLicenseStatus();
          }, 1000);
        } else {
          if (errorEl) {
            errorEl.style.color = '#d9241c';
            errorEl.textContent = response.reason || 'Invalid license key';
          }
          if (keyInput) keyInput.classList.add('error');
        }
      });
    });
  }

  // ── Deactivate Button ──
  const deactBtn = document.getElementById('btn-deactivate-license');
  if (deactBtn) {
    deactBtn.addEventListener('click', () => {
      if (confirm('Deactivate your license? You will need to re-enter a key to continue using the extension.')) {
        chrome.runtime.sendMessage({ type: 'DEACTIVATE_LICENSE' }, () => {
          checkLicenseStatus();
        });
      }
    });
  }

  // ── Buy License Button (pre-filled email via Gmail Web / OS Mail) ──
  const buyBtn = document.getElementById('btn-buy-license');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const deviceId = document.getElementById('lic-overlay-device-id')?.textContent || 'N/A';
      const rawSubject = 'License Key Request — Goodlife Bulk Enrollor';
      const rawBody = 
`Dear CalcLabz Support,

I would like to purchase a license key for Goodlife Bulk Enrollor (₹1,999/month).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEVICE ID: ${deviceId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: [Your Full Name]
Dealer Name: [Your Dealership Name]
Contact Number: [Your Phone Number]
Subscription Period: [1 Month / 3 Months / 6 Months / 1 Year]

Please share the license key and payment details.

Thank you.`;

      const subject = encodeURIComponent(rawSubject);
      const body = encodeURIComponent(rawBody);

      // Open Gmail web compose directly (prevents blank tab issue in Chrome extensions)
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@calclabz.com&su=${subject}&body=${body}`;
      chrome.tabs.create({ url: gmailUrl });

      // Also trigger OS mail client silently via hidden link as fallback
      try {
        const mailtoUrl = `mailto:support@calclabz.com?subject=${subject}&body=${body}`;
        const a = document.createElement('a');
        a.href = mailtoUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 1000);
      } catch (e) {
        console.warn('Mailto fallback failed:', e);
      }
    });
  }
}

// Re-check license on state updates
const _origUpdateUI = updateUI;
updateUI = function(state) {
  _origUpdateUI(state);
  // Periodically refresh license banner (not overlay — that's aggressive)
  if (currentLicenseStatus) {
    updateLicenseBanner(currentLicenseStatus);
    applyLicenseLock(currentLicenseStatus);
  }
};

// Check license every 5 minutes while popup is open
setInterval(() => {
  checkLicenseStatus();
}, 300000);
