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

  // All buttons are on the control panel now — no inline CSS needed

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

  // Set select2 value and trigger change so select2 updates its UI
  function setSelect2Value(selector, value) {
    const el = document.querySelector(selector);
    if (!el) { error(`${selector} not found`); return false; }
    el.value = value;
    // Trigger change for both native and jQuery/select2
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) jQuery(el).val(value).trigger('change');
    log(`Set ${selector} = ${value}`);
    return true;
  }

  // Set payment method, click "paid yes", then create invoice
  async function payAndCreate(methodValue, methodLabel) {
    log(`${methodLabel}: setting payment method to ${methodValue}...`);

    if (!setSelect2Value('#invoice_payment_method', methodValue)) return;
    await sleep(300);

    const paidBtn = document.querySelector('#btnCheckPayed_yes');
    if (!paidBtn) { error('#btnCheckPayed_yes not found'); return; }
    paidBtn.click();
    log('Clicked "Paid Yes"');
    await sleep(300);

    const createBtn = document.querySelector('#btnCreateInvoice');
    if (!createBtn) { error('#btnCreateInvoice not found'); return; }
    createBtn.click();
    log('Clicked "Create Invoice"');

    // Watch for the warehouse warning modal (div#wdialog)
    // It may appear 200ms-2s later with "ΠΡΟΣΟΧΗ" + "δεν είναι διαθέσιμα"
    // If all 3 conditions met: modal visible, contains both texts, has the button → click it
    watchForWarningModal();
  }

  function watchForWarningModal() {
    const observer = new MutationObserver(async () => {
      const modal = document.querySelector('div#wdialog');
      if (!modal || modal.style.display === 'none') return;

      const text = modal.textContent;
      const hasWarning = text.includes('ΠΡΟΣΟΧΗ');
      const hasUnavailable = text.includes('δεν είναι διαθέσιμα');
      if (!hasWarning || !hasUnavailable) return;

      const confirmBtn = modal.querySelector('a#btn_savePlace');
      if (!confirmBtn) return;

      // All 3 conditions met — stop observing and click
      observer.disconnect();
      await sleep(100);
      confirmBtn.click();
      log('Warehouse warning modal: clicked "ΝΑΙ, Δημιουργία"');
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    // Stop watching after 5s if modal never appears
    setTimeout(() => observer.disconnect(), 5000);
  }

  // Register buttons on control panel
  if (window.OxygenPanel) {
    OxygenPanel.addButton('⚖', 'Units', async (btn) => {
      OxygenPanel.setButtonState(btn, 'running');
      await reselectAllUnits();
      OxygenPanel.setButtonState(btn, 'active');
    });

    OxygenPanel.addButton('💳', 'Card', async (btn) => {
      OxygenPanel.setButtonState(btn, 'running');
      await payAndCreate(8, 'Κάρτα');
      OxygenPanel.setButtonState(btn, 'active');
    });

    OxygenPanel.addButton('💵', 'COD', async (btn) => {
      OxygenPanel.setButtonState(btn, 'running');
      await payAndCreate(1, 'Αντικαταβολή');
      OxygenPanel.setButtonState(btn, 'active');
    });

    OxygenPanel.addButton('📅', 'Next Day', async (btn) => {
      OxygenPanel.setButtonState(btn, 'running');
      const input = document.querySelector('#shipping_date');
      if (!input) { error('#shipping_date not found'); OxygenPanel.setButtonState(btn, null); return; }

      // Calculate tomorrow as DD/MM/YYYY (Oxygen's date format)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const yyyy = tomorrow.getFullYear();
      const formatted = dd + '/' + mm + '/' + yyyy;

      // Set value and trigger datepicker/change events
      input.value = formatted;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) {
        jQuery(input).val(formatted).trigger('change');
        // If jQuery UI datepicker is attached, update it
        if (jQuery(input).datepicker) {
          try { jQuery(input).datepicker('setDate', formatted); } catch (_) {}
        }
      }
      log('Shipping date set to ' + formatted);
      OxygenPanel.setButtonState(btn, 'active');
    });
  }

  // Scroll to products table on page load
  function scrollToProducts() {
    const firstUnit = document.querySelector('span.sauto[data-action="element-unitmList"]');
    const target = firstUnit ? firstUnit.closest('table') || firstUnit : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Auto-run on page load
  scrollToProducts();
  reselectAllUnits();

  // Expose globally
  window.oxygenReselectUnits = reselectAllUnits;

})();
