// ===========================================================================
// Oxygen Scripts - New Receipt Page (receipts_new.php)
// ===========================================================================
// Auto re-selects the unit of measurement (Μ/Μ) for all product rows.
// Also injects a manual "Re-select Units" button above the products table.
// ===========================================================================

(function () {
  'use strict';

  const { sleep, injectCSS, log, warn, error } = OxygenUtils;

  const DELAY_BETWEEN_ROWS = 300;
  const DELAY_DROPDOWN = 300;

  // Map of displayed unit text → dropdown option text
  const UNIT_MAP = {
    'κιλ': 'κιλ - kg',
    'τεμ': 'τεμ - pc',
    'κιβ': 'κιβ - pk'
  };

  injectCSS('oxygen-receipt-css', `
    .oxygen-unit-btn {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border: 1px solid #28a745;
      background: #d4edda;
      color: #155724;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
      transition: all 0.15s;
    }
    .oxygen-unit-btn:hover {
      background: #28a745;
      color: #fff;
    }
    .oxygen-unit-btn.running {
      background: #007bff;
      border-color: #007bff;
      color: #fff;
      pointer-events: none;
      opacity: 0.7;
    }
    .oxygen-unit-btn.done {
      background: #28a745;
      border-color: #28a745;
      color: #fff;
    }
  `);

  // Find the products table (the one with a Μ/Μ header)
  function getProductsTable() {
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const cells = table.querySelectorAll('th, td');
      for (const cell of cells) {
        if (cell.textContent.trim() === 'Μ/Μ') return table;
      }
    }
    return null;
  }

  // Get product rows (rows with input fields, excluding header/total)
  function getProductRows(table) {
    const rows = [];
    for (const row of table.querySelectorAll('tr')) {
      const inputs = row.querySelectorAll('input[type="text"]');
      if (inputs.length >= 3) rows.push(row);
    }
    return rows;
  }

  // Get the unit cell info for a product row
  function getUnitInfo(row) {
    for (const cell of row.querySelectorAll('td')) {
      const span = cell.querySelector('[style*="cursor: pointer"], [style*="cursor"]');
      if (span) {
        const text = (span.childNodes[0]?.textContent || span.textContent).trim();
        if (text in UNIT_MAP || text === 'Χωρίς Μ.Μ.' || text === '') {
          return { span, currentUnit: text };
        }
      }
    }
    return null;
  }

  // Re-select the unit for a single row
  async function reselectUnit(row, index) {
    const info = getUnitInfo(row);
    if (!info || !info.currentUnit || !(info.currentUnit in UNIT_MAP)) {
      return false;
    }

    const target = UNIT_MAP[info.currentUnit];

    // Open dropdown
    info.span.click();
    await sleep(DELAY_DROPDOWN);

    // Find and click the matching option
    const links = info.span.querySelectorAll('a[href="javascript:void(0);"]');
    for (const link of links) {
      if (link.textContent.trim().includes(target)) {
        link.click();
        log(`Row ${index + 1}: ${info.currentUnit} → ${target}`);
        return true;
      }
    }

    // Fallback: search all visible links
    const allLinks = document.querySelectorAll('a[href="javascript:void(0);"]');
    for (const link of allLinks) {
      if (link.textContent.trim().includes(target)) {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          link.click();
          log(`Row ${index + 1}: ${info.currentUnit} → ${target} (fallback)`);
          return true;
        }
      }
    }

    warn(`Row ${index + 1}: could not find "${target}"`);
    return false;
  }

  async function reselectAllUnits(btn) {
    const table = getProductsTable();
    if (!table) {
      error('Products table not found!');
      return;
    }

    const rows = getProductRows(table);
    if (rows.length === 0) {
      warn('No product rows found');
      return;
    }

    if (btn) {
      btn.classList.add('running');
      btn.textContent = 'Working...';
    }

    log(`Re-selecting units for ${rows.length} products...`);
    let count = 0;

    for (let i = 0; i < rows.length; i++) {
      if (await reselectUnit(rows[i], i)) count++;
      await sleep(DELAY_BETWEEN_ROWS);
    }

    log(`Done: ${count}/${rows.length} units re-selected`);

    if (btn) {
      btn.classList.remove('running');
      btn.classList.add('done');
      btn.textContent = `Units set (${count}/${rows.length})`;
    }
  }

  // Inject a "Re-select Units" button near the products table header
  function injectButton() {
    const header = document.querySelector('*');
    // Find the "Αναλυτικές Γραμμές" section heading
    const headings = document.querySelectorAll('div, span');
    let target = null;
    for (const el of headings) {
      if (el.textContent.trim() === 'Αναλυτικές Γραμμές' && el.childNodes.length <= 2) {
        target = el.closest('div');
        break;
      }
    }

    if (!target || target.querySelector('.oxygen-unit-btn')) return;

    const btn = document.createElement('span');
    btn.className = 'oxygen-unit-btn';
    btn.textContent = 'Re-select Units (Μ/Μ)';
    btn.title = 'Oxygen Script: Re-select measurement units for all products';
    btn.addEventListener('click', () => reselectAllUnits(btn));
    target.appendChild(btn);
    log('Injected "Re-select Units" button');
  }

  // Auto-run on page load
  injectButton();
  reselectAllUnits();

  // Expose globally
  window.oxygenReselectUnits = reselectAllUnits;

})();
