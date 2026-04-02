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
  const DELAY_DROPDOWN = 400;

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

  // DOM structure per Μ/Μ cell:
  //   <span class="sauto" data-action="element-unitmList" data-id="1">
  //     <span id="unitm_title1" class="sautoTitle">κιλ</span>
  //     <div class="sdialog" style="display: none;">
  //       <a data-action="set-unitm" data-set="κιλ">κιλ - kg</a>
  //       <a data-action="set-unitm" data-set="τεμ">τεμ - pc</a>
  //       ...
  //     </div>
  //   </span>
  // Hidden inputs: #unitmid1 (ID), #unitm1 (text value)

  // Re-select the unit for a single row by index (1-based, matches data-id)
  async function reselectUnit(sautoSpan, index) {
    const titleSpan = sautoSpan.querySelector('.sautoTitle');
    if (!titleSpan) return false;

    const currentUnit = titleSpan.textContent.trim();
    if (!currentUnit || currentUnit === '---' || currentUnit === 'Χωρίς Μ.Μ.') {
      return false;
    }

    // Click to open dropdown
    sautoSpan.click();
    await sleep(DELAY_DROPDOWN);

    // Find the option matching current unit via data-set attribute
    const option = sautoSpan.querySelector(`a[data-action="set-unitm"][data-set="${currentUnit}"]`);
    if (option) {
      option.click();
      log(`Row ${index}: ${currentUnit} → re-selected`);
      return true;
    }

    // Fallback: search by text content
    const allOptions = sautoSpan.querySelectorAll('a[data-action="set-unitm"]');
    for (const opt of allOptions) {
      if (opt.textContent.includes(currentUnit)) {
        opt.click();
        log(`Row ${index}: ${currentUnit} → re-selected (fallback)`);
        return true;
      }
    }

    warn(`Row ${index}: could not find option for "${currentUnit}"`);
    return false;
  }

  async function reselectAllUnits(btn) {
    const sautoSpans = document.querySelectorAll('span.sauto[data-action="element-unitmList"]');
    if (sautoSpans.length === 0) {
      warn('No unit dropdowns found');
      return;
    }

    if (btn) {
      btn.classList.add('running');
      btn.textContent = 'Working...';
    }

    log(`Re-selecting units for ${sautoSpans.length} rows...`);
    let count = 0;

    for (let i = 0; i < sautoSpans.length; i++) {
      if (await reselectUnit(sautoSpans[i], i + 1)) count++;
      await sleep(DELAY_BETWEEN_ROWS);
    }

    log(`Done: ${count}/${sautoSpans.length} units re-selected`);

    if (btn) {
      btn.classList.remove('running');
      btn.classList.add('done');
      btn.textContent = `Units set (${count}/${sautoSpans.length})`;
    }
  }

  // Register button on control panel
  if (window.OxygenPanel) {
    OxygenPanel.addButton('⚖', 'Re-select Units', async (btn) => {
      OxygenPanel.setButtonState(btn, 'running');
      await reselectAllUnits();
      OxygenPanel.setButtonState(btn, 'active');
    });
  }

  // Auto-run on page load
  reselectAllUnits();

  // Expose globally
  window.oxygenReselectUnits = reselectAllUnits;

})();
