// ===========================================================================
// Oxygen Scripts - Notices Page (notices.php?m=303)
// ===========================================================================
// Injects a quick-convert button on each notice row.
// Click the button → notice is converted to receipt automatically.
//
// Shire hand-off (cashier, grill-session D6):
//   notices.php?m=303&shire_receipt=<notice number>   → same POST as ΑΠ
//   notices.php?m=303&shire_invoice=<notice number>   → same POST as ΤΙΜ
// but in the SAME tab. Lands on the prefilled form; the human presses Δημιουργία
// (that is where the POS fires). Shire cannot POST here itself: Oxygen's cookies
// are SameSite=Lax, so only a top-level GET from Shire arrives logged in.
// ===========================================================================

(function () {
  'use strict';

  const { injectCSS, log, warn, error, readParam, stripParams, waitForMatch, docKey } = OxygenUtils;

  const ORIGIN = 'https://app.pelatologio.gr';

  // Inject styles for our custom buttons
  injectCSS('oxygen-notices-css', `
    .oxygen-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      background: #D35155;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 700;
      margin-right: 4px;
      vertical-align: middle;
      transition: background 0.15s ease, transform 0.1s ease;
      line-height: 1;
    }
    .oxygen-btn:hover {
      background: #000;
      transform: scale(1.1);
    }
    .oxygen-btn:active {
      transform: scale(0.95);
    }
    .oxygen-btn.running {
      background: #815f88;
      color: #fff;
      pointer-events: none;
      opacity: 0.7;
    }
    .oxygen-btn.tim {
      background: #008582;
    }
    .oxygen-btn.tim:hover {
      background: #000;
    }
  `);

  // Get the notice_temp_id from a row's conversion link
  function getTempId(row) {
    const link = row.querySelector('a[data-action="notices-converte_to_invoice"]');
    return link ? link.getAttribute('data-docid') : null;
  }

  // The notice number shown in the row's first link ("EIΔ 3771" → "3771").
  function noticeNumberOf(row) {
    const link = row.querySelector('a');
    if (!link) return null;
    const m = link.textContent.replace(/\s+/g, ' ').trim().match(/(\d+)$/);
    return m ? m[1] : null;
  }

  // POST the notice→document conversion via a hidden form.
  // targetPage: 'receipts_new.php' | 'invoices_new.php'; target: '_blank' | '_self'
  function postConversion(tempId, targetPage, target) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ORIGIN + '/' + targetPage;
    form.target = target;
    const fields = {
      notice_temp_id: tempId,
      use_template: 'yes',
      same_products: 'yes',
      same_customer: 'yes',
      same_category: 'yes',
      same_rules: 'yes',
      mark_notice_complete: 'yes',
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  // POST to create a receipt or invoice from a notice in a new tab
  // action: 'receipts_new.php' for receipt, 'invoices_new.php' for invoice
  function convertRow(row, btn, targetPage) {
    const idLink = row.querySelector('a');
    const noticeId = idLink ? idLink.textContent.trim() : 'unknown';
    const tempId = getTempId(row);

    if (!tempId) {
      error(`${noticeId}: no data-docid found`);
      alert('Conversion failed: no document ID found');
      return;
    }

    log(`Converting ${noticeId} (temp_id=${tempId}) → ${targetPage}...`);
    btn.classList.add('running');
    btn.textContent = '...';

    // POST directly via hidden form in a new tab
    postConversion(tempId, targetPage, '_blank');
  }

  // Inject buttons into each notice row
  function injectButtons() {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    let injected = 0;

    for (const row of rows) {
      const checkbox = row.querySelector('td input[type="checkbox"]');
      if (!checkbox) continue; // Skip header/total rows

      // Don't inject twice
      if (row.querySelector('.oxygen-btn')) continue;

      const cell = checkbox.closest('td');

      // ΑΠ = Απόδειξη (receipt)
      const btnAP = document.createElement('span');
      btnAP.className = 'oxygen-btn';
      btnAP.title = 'Μετατροπή σε Απόδειξη';
      btnAP.textContent = 'ΑΠ';
      btnAP.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        convertRow(row, btnAP, 'receipts_new.php');
      });

      // ΤΙΜ = Τιμολόγιο (invoice)
      const btnTIM = document.createElement('span');
      btnTIM.className = 'oxygen-btn tim';
      btnTIM.title = 'Μετατροπή σε Τιμολόγιο';
      btnTIM.textContent = 'ΤΙΜ';
      btnTIM.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        convertRow(row, btnTIM, 'invoices_new.php');
      });

      cell.insertBefore(btnTIM, checkbox);
      cell.insertBefore(btnAP, btnTIM);
      injected++;
    }

    if (injected > 0) {
      log(`Injected ${injected} convert buttons on notices page`);
    }
  }

  // Wait for table rows to exist, then inject buttons.
  // Handles both immediate rendering and dynamic/late table loading.
  function waitAndInject() {
    // Try immediately
    injectButtons();

    // Also observe for dynamic updates (pagination, filtering, late rendering)
    const target = document.querySelector('table')?.parentElement || document.body;
    const observer = new MutationObserver(() => {
      injectButtons();
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  // ---- Shire hand-off (D6) ----------------------------------------------
  const SHIRE_PARAMS = { shire_receipt: 'receipts_new.php', shire_invoice: 'invoices_new.php' };
  const NOTICE_NUMBER_RE = /^\d{1,10}$/;
  // Sanity bound for Oxygen's data-docid (format not documented); goes into input.value only.
  const TEMP_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

  function shireSay(message, type) {
    if (type === 'fail') error(message); else log(message);
    if (window.OxygenPanel) OxygenPanel.toast(message, type, type === 'fail');
    else if (type === 'fail') alert(message);
  }

  // Series of a notice row ("EIΔ 3771" → docKey "EIΔ"), for a sanity warning only.
  function noticeSeriesOf(row) {
    const link = row.querySelector('a');
    return link ? docKey(link.textContent.replace(/\d+\s*$/, '')) : '';
  }

  // Warn (console only) when the matched row's series is not the page's usual one:
  // a notice number shared with another document type would land here.
  function warnIfOddSeries(row, number) {
    const counts = {};
    for (const r of document.querySelectorAll('table tr')) {
      if (!r.querySelector('td input[type="checkbox"]')) continue;
      const s = noticeSeriesOf(r);
      if (s) counts[s] = (counts[s] || 0) + 1;
    }
    const common = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const mine = noticeSeriesOf(row);
    if (common && mine !== common) {
      warn('Shire hand-off: notice ' + number + ' has series "' + mine + '", the page mostly shows "' + common + '"');
    }
  }

  function findNoticeRows(number) {
    return Array.from(document.querySelectorAll('table tr')).filter((row) =>
      row.querySelector('td input[type="checkbox"]') && noticeNumberOf(row) === number);
  }

  async function handleShireHandoff() {
    if (window.__oxygenShireNoticeHandled) return; // once per page load
    window.__oxygenShireNoticeHandled = true;
    if (window.location.origin !== ORIGIN) return;

    const keys = Object.keys(SHIRE_PARAMS).filter((k) => readParam(k) !== null);
    if (keys.length === 0) return;
    const allKeys = Object.keys(SHIRE_PARAMS);

    if (keys.length > 1) {
      stripParams(allKeys);
      shireSay('Shire: το link ζητά και απόδειξη και τιμολόγιο. Δεν έγινε τίποτα.', 'fail');
      return;
    }

    const key = keys[0];
    const number = readParam(key);
    if (!NOTICE_NUMBER_RE.test(number)) {
      stripParams(allKeys);
      shireSay('Shire: μη έγκυρος αριθμός ειδοποίησης στο link. Δεν έγινε τίποτα.', 'fail');
      return;
    }
    const targetPage = SHIRE_PARAMS[key];
    const label = key === 'shire_receipt' ? 'απόδειξη' : 'τιμολόγιο';

    shireSay('Shire: αναζήτηση ειδοποίησης ' + number + '…');
    const rows = await waitForMatch(() => {
      const r = findNoticeRows(number);
      return r.length ? r : null;
    }, 8000);

    // Strip before anything else happens, so a refresh or Back never repeats it.
    stripParams(allKeys);

    if (!rows) {
      shireSay('Shire: η ειδοποίηση ' + number + ' δεν βρέθηκε σε αυτή τη σελίδα. Δεν έγινε τίποτα.', 'fail');
      return;
    }
    if (rows.length > 1) {
      shireSay('Shire: ' + rows.length + ' ειδοποιήσεις με αριθμό ' + number + '. Δεν έγινε τίποτα, άνοιξέ τη χειροκίνητα.', 'fail');
      return;
    }

    const tempId = getTempId(rows[0]);
    if (!tempId || !TEMP_ID_RE.test(tempId)) {
      shireSay('Shire: η ειδοποίηση ' + number + ' δεν μετατρέπεται (ίσως έχει ήδη ολοκληρωθεί). Δεν έγινε τίποτα.', 'fail');
      return;
    }

    warnIfOddSeries(rows[0], number);
    log('Shire hand-off: notice ' + number + ' (temp_id=' + tempId + ') → ' + targetPage + ', same tab');
    shireSay('Shire: μετατροπή ειδοποίησης ' + number + ' σε ' + label + '…');
    // Lands on the prefilled form. Never press Δημιουργία here: the human issues it.
    postConversion(tempId, targetPage, '_self');
  }

  waitAndInject();
  handleShireHandoff().catch((err) =>
    shireSay('Shire: σφάλμα (' + err.message + '). Δεν έγινε τίποτα.', 'fail'));

})();
