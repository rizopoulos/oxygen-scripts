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
  // Returns true only if the whole chain fired — the copy-print flow depends on it.
  async function payAndCreate(methodValue, methodLabel) {
    log(`${methodLabel}: setting payment method to ${methodValue}...`);

    if (!setSelect2Value('#invoice_payment_method', methodValue)) return false;
    await sleep(300);

    const paidBtn = document.querySelector('#btnCheckPayed_yes');
    if (!paidBtn) { error('#btnCheckPayed_yes not found'); return false; }
    paidBtn.click();
    log('Clicked "Paid Yes"');
    await sleep(300);

    const createBtn = document.querySelector('#btnCreateInvoice');
    if (!createBtn) { error('#btnCreateInvoice not found'); return false; }
    createBtn.click();
    log('Clicked "Create Invoice"');

    // Watch for the warehouse warning modal (div#wdialog)
    // It may appear 200ms-2s later with "ΠΡΟΣΟΧΗ" + "δεν είναι διαθέσιμα"
    // If all 3 conditions met: modal visible, contains both texts, has the button → click it
    watchForWarningModal();
    return true;
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

  // =========================================================================
  // Copy print (Εκτύπωση αντιγράφου)
  // =========================================================================
  // After the document is created Oxygen prints once on its own. When the
  // "Αντίγραφο" checkbox is on, we wait for that first print to finish, then
  // drive a second print through the orange Εκτύπωση/PDF button.
  //
  // Modals are matched by TEXT, not by selector — Oxygen's modal markup is not
  // stable and we already do this for the warehouse warning above.
  // =========================================================================

  const PRINTER_NAME = 'Brother MFC-L2860DW';
  const TXT_PRINT_MODAL = 'εκτυπωση παραστατικου';
  const TXT_WAITING     = 'αναμονη εκτυπωσης';
  const TXT_CONNECTING  = 'συνδεση με εκτυπωτη';
  const PRINT_TEXTS = [TXT_PRINT_MODAL, TXT_WAITING, TXT_CONNECTING];

  // Lowercase + strip Greek accents so matching survives ΑΝΑΜΟΝΉ / Αναμονή / αναμονη
  function norm(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Deepest visible <div> whose text contains `needle` (already normalised)
  function findVisibleByText(needle) {
    const divs = document.querySelectorAll('div');
    let best = null;
    for (const d of divs) {
      if (norm(d.textContent).indexOf(needle) === -1) continue;
      const rect = d.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // querySelectorAll is in document order, so descendants overwrite ancestors
      if (!best || best.contains(d)) best = d;
    }
    return best;
  }

  function anyPrintModalVisible() {
    return PRINT_TEXTS.some(t => findVisibleByText(t) !== null);
  }

  // Poll `check` until it returns truthy. Resolves to the value, or null on timeout.
  async function waitUntil(check, timeout, interval = 200) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = check();
      if (v) return v;
      await sleep(interval);
    }
    return null;
  }

  // The orange Εκτύπωση/PDF link — only valid once it carries a real docid
  function findPrintButton() {
    const links = document.querySelectorAll('a[data-action="invoices-print"][data-docid]');
    for (const a of links) {
      const docid = (a.getAttribute('data-docid') || '').trim();
      if (!docid) continue;
      const rect = a.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return a;
    }
    return null;
  }

  // #output is a select2. Several options can share value="direct_print" (one per
  // printer), so select the OPTION object rather than assigning select.value.
  function selectPrinter(sel) {
    const opts = Array.from(sel.options);
    const target =
      opts.find(o => (o.getAttribute('data-printer') || '') === PRINTER_NAME) ||
      opts.find(o => norm(o.textContent).indexOf(norm(PRINTER_NAME)) !== -1) ||
      opts.find(o => o.value === 'direct_print');
    if (!target) return false;

    opts.forEach(o => { o.selected = false; });
    target.selected = true;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) jQuery(sel).trigger('change');
    log(`Printer selected: ${target.textContent.trim()}`);
    return true;
  }

  let copyPrintRunning = false;

  async function printCopy() {
    if (copyPrintRunning) { warn('Copy print already running'); return; }
    copyPrintRunning = true;

    const fail = (msg) => {
      error(`Copy print: ${msg}`);
      if (window.OxygenPanel) OxygenPanel.toast('Αντίγραφο: ' + msg, 'fail');
    };

    try {
      // 1. First print starts
      log('Copy print: waiting for the first print modal...');
      if (!await waitUntil(anyPrintModalVisible, 20000)) {
        return fail('δεν άνοιξε το modal εκτύπωσης');
      }

      // 2. First print finishes — every print modal gone
      log('Copy print: waiting for the first print to finish...');
      if (!await waitUntil(() => !anyPrintModalVisible(), 120000)) {
        return fail('η πρώτη εκτύπωση δεν ολοκληρώθηκε');
      }
      await sleep(600);

      // 3. Orange Εκτύπωση / PDF
      const printBtn = await waitUntil(findPrintButton, 15000);
      if (!printBtn) return fail('δεν βρέθηκε το κουμπί Εκτύπωση/PDF');
      printBtn.click();
      log(`Copy print: clicked Εκτύπωση/PDF (docid ${printBtn.getAttribute('data-docid')})`);

      // 4. Printer dropdown
      const sel = await waitUntil(() => {
        const s = document.querySelector('select#output');
        return s && s.options.length ? s : null;
      }, 15000);
      if (!sel) return fail('δεν άνοιξε το modal επιλογής εκτυπωτή');
      await sleep(400);

      // 5. Pick the Brother
      if (!selectPrinter(sel)) return fail(`δεν βρέθηκε ο εκτυπωτής ${PRINTER_NAME}`);
      await sleep(400);

      // 6. Εκτέλεση
      const runBtn = document.querySelector('#btnPrintInvoice');
      if (!runBtn) return fail('δεν βρέθηκε το κουμπί Εκτέλεση');
      runBtn.click();
      log('Copy print: clicked Εκτέλεση');

      // 7. Αναμονή εκτύπωσης → Σύνδεση με εκτυπωτή → both close
      const spinnerSeen = await waitUntil(
        () => findVisibleByText(TXT_WAITING) || findVisibleByText(TXT_CONNECTING),
        10000
      );
      if (spinnerSeen) {
        const done = await waitUntil(
          () => !findVisibleByText(TXT_WAITING) && !findVisibleByText(TXT_CONNECTING),
          90000
        );
        if (!done) return fail('ο εκτυπωτής δεν απάντησε');
        if (window.OxygenPanel) OxygenPanel.toast('✓ Εκτυπώθηκε το αντίγραφο');
      } else {
        // Printer answered faster than we could poll — report honestly.
        warn('Copy print: never saw the printer spinners');
        if (window.OxygenPanel) OxygenPanel.toast('Το αντίγραφο στάλθηκε στον εκτυπωτή');
      }

      log('Copy print: done');
    } catch (err) {
      fail(err.message);
    } finally {
      copyPrintRunning = false;
    }
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
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      jQuery('#shipping_date').datepicker('setDate', tomorrow).trigger('change');
      log('Shipping date set to tomorrow');
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
