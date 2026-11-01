// ===========================================================================
// Oxygen Scripts - Notices Page (notices.php?m=303)
// ===========================================================================
// Injects a quick-convert button on each notice row.
// Click the button → notice is converted to receipt automatically.
//
// Shire hand-off (cashier, grill-session D6):
//   notices.php?m=303&shire_receipt=<notice number>   → same POST as ΑΠ
//   notices.php?m=303&shire_invoice=<notice number>   → same POST as ΤΙΜ
//   notices.php?m=303&shire_cancel=<notice number>    → cancels that notice NOW
//     (Shire wholesale orders, grill D11/D12/D30: no confirm, refuses on any doubt)
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

    const allKeys = Object.keys(SHIRE_PARAMS).concat([CANCEL_PARAM]);
    const keys = allKeys.filter((k) => readParam(k) !== null);
    if (keys.length === 0) return;

    if (keys.length > 1) {
      stripParams(allKeys);
      shireSay('Shire: το link ζητά δύο ενέργειες μαζί (' + keys.join(', ') + '). Δεν έγινε τίποτα.', 'fail');
      return;
    }

    const key = keys[0];
    const number = readParam(key);
    if (!NOTICE_NUMBER_RE.test(number)) {
      stripParams(allKeys);
      shireSay('Shire: μη έγκυρος αριθμός ειδοποίησης στο link. Δεν έγινε τίποτα.', 'fail');
      return;
    }
    if (key === CANCEL_PARAM) {
      await handleShireCancel(number, allKeys);
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

  // ---- Shire cancel (wholesale orders, grill D11 / D12 / D30) ------------
  // notices.php?m=303&shire_cancel=<notice number>
  // Cancels the notice IMMEDIATELY, no confirm (Antonis, D12): Shire sends this link
  // after it created the replacement notice. Cancelling is IRREVERSIBLE in Oxygen, so
  // every doubt refuses and does nothing:
  //   - 0 or 2+ rows with that number on the list
  //   - the row reads cancelled, or is not pending (no convert link: completed)
  //   - the row does not yield exactly one internal docid
  //   - the docid is not in the list form's own search_array (wrong kind of id)
  //   - the list's search form cannot be found (we send what Oxygen's UI sends)
  // The request is Oxygen's own UI call, captured by Antonis 2026-11-01:
  //   POST /loads/notices_actions.php
  //   option=notice_status_change&option2=cancel&docid=550586
  //   &jqPost[0][name]=pin1&jqPost[0][value]=&...&jqPost[21][name]=search_array&...
  // jqPost is jQuery's serializeArray() of the list's filter form, built here from
  // the live form, never hard-coded.
  // NOT tested against the real Oxygen (irreversible). First real use: read the
  // console lines starting "shire_cancel:".
  const CANCEL_PARAM = 'shire_cancel';
  const DOCID_RE = /^\d{1,12}$/;
  const FLASH_KEY = 'oxygenShireCancelFlash';
  const CANCELLED_TEXT_RE = /ακυρωμ|ακυρώθ|cancel/i;

  // Every distinct data-docid inside the row (the convert link carries it). Exactly
  // one distinct value, or nothing.
  function rowDocid(row) {
    const ids = new Set();
    for (const el of row.querySelectorAll('[data-docid]')) {
      const v = (el.getAttribute('data-docid') || '').trim();
      if (v) ids.add(v);
    }
    if (ids.size !== 1) {
      log('shire_cancel: row data-docid values: ' + JSON.stringify(Array.from(ids)));
      return null;
    }
    return Array.from(ids)[0];
  }

  function rowLooksCancelled(row) {
    return CANCELLED_TEXT_RE.test(row.textContent || '') || /cancel/i.test(row.className || '');
  }

  // The list's filter form: the one holding search_array (jqPost's last field in the
  // capture). Fallback: the form holding pin1 (jqPost's first field).
  function findSearchForm() {
    const byArray = document.querySelector('form [name="search_array"]');
    if (byArray && byArray.form) return byArray.form;
    const byPin = document.querySelector('form [name="pin1"]');
    if (byPin && byPin.form) return byPin.form;
    return null;
  }

  // jQuery serializeArray() when jQuery is on the page (what Oxygen itself uses);
  // otherwise the same rules by hand: named, enabled, non-button controls, checked
  // boxes and radios only, every selected option.
  function serializeForm(form) {
    if (window.jQuery) {
      return window.jQuery(form).serializeArray().map((f) => ({ name: f.name, value: f.value }));
    }
    const out = [];
    for (const el of form.elements) {
      if (!el.name || el.disabled) continue;
      const type = (el.type || '').toLowerCase();
      if (['submit', 'button', 'reset', 'image', 'file'].includes(type)) continue;
      if ((type === 'checkbox' || type === 'radio') && !el.checked) continue;
      if (el.tagName === 'SELECT') {
        for (const opt of el.options) if (opt.selected) out.push({ name: el.name, value: opt.value });
        continue;
      }
      out.push({ name: el.name, value: (el.value || '').replace(/\r?\n/g, '\r\n') });
    }
    return out;
  }

  function buildCancelBody(docid, fields) {
    const body = new URLSearchParams();
    body.append('option', 'notice_status_change');
    body.append('option2', 'cancel');
    body.append('docid', docid);
    fields.forEach((f, i) => {
      body.append('jqPost[' + i + '][name]', f.name);
      body.append('jqPost[' + i + '][value]', f.value);
    });
    return body;
  }

  async function handleShireCancel(number, allKeys) {
    if (window.__oxygenShireCancelSent) return; // never twice per page load
    shireSay('Shire: αναζήτηση ειδοποίησης ' + number + ' για ακύρωση…');
    const rows = await waitForMatch(() => {
      const r = findNoticeRows(number);
      return r.length ? r : null;
    }, 8000);

    // Strip before anything else happens, so a refresh or Back never repeats it.
    stripParams(allKeys);

    if (!rows) {
      shireSay('Shire: η ειδοποίηση ' + number + ' δεν βρέθηκε σε αυτή τη σελίδα. Δεν ακυρώθηκε τίποτα.', 'fail');
      return;
    }
    if (rows.length > 1) {
      shireSay('Shire: ' + rows.length + ' ειδοποιήσεις με αριθμό ' + number + '. Δεν ακυρώθηκε τίποτα, ακύρωσέ τη χειροκίνητα.', 'fail');
      return;
    }
    const row = rows[0];
    if (rowLooksCancelled(row)) {
      shireSay('Shire: η ειδοποίηση ' + number + ' είναι ήδη ακυρωμένη. Δεν έγινε τίποτα.', 'fail');
      return;
    }
    if (!getTempId(row)) {
      shireSay('Shire: η ειδοποίηση ' + number + ' δεν είναι σε εκκρεμότητα (ίσως έχει ολοκληρωθεί). Δεν ακυρώθηκε.', 'fail');
      return;
    }
    const form = findSearchForm();
    if (!form) {
      log('shire_cancel: forms on page: ' + JSON.stringify(Array.from(document.forms).map((f) => f.id || f.name || f.getAttribute('action'))));
      shireSay('Shire: δεν βρέθηκε η φόρμα αναζήτησης της λίστας. Δεν ακυρώθηκε τίποτα.', 'fail');
      return;
    }
    const fields = serializeForm(form);
    const searchArray = fields.find((f) => f.name === 'search_array');
    // The convert link's data-docid (same id the ΑΠ/ΤΙΜ POST uses). With search_array
    // present it must be one of the listed ids; without it, every data-docid in the
    // row must agree.
    const docid = searchArray ? getTempId(row) : rowDocid(row);
    if (!docid || !DOCID_RE.test(docid)) {
      shireSay('Shire: δεν βρέθηκε το εσωτερικό id της ειδοποίησης ' + number + '. Δεν ακυρώθηκε τίποτα.', 'fail');
      return;
    }
    if (searchArray && searchArray.value.split(',').map((v) => v.trim()).indexOf(docid) === -1) {
      log('shire_cancel: docid ' + docid + ' not in search_array "' + searchArray.value + '"');
      shireSay('Shire: το id ' + docid + ' δεν ανήκει στη λίστα. Δεν ακυρώθηκε τίποτα.', 'fail');
      return;
    }

    warnIfOddSeries(row, number);
    window.__oxygenShireCancelSent = true;
    log('shire_cancel: notice ' + number + ' docid=' + docid + ', jqPost fields=' + fields.length);
    shireSay('Shire: ακύρωση ειδοποίησης ' + number + '…');

    const resp = await fetch(ORIGIN + '/loads/notices_actions.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: buildCancelBody(docid, fields).toString(),
    });
    const text = await resp.text();
    log('shire_cancel: HTTP ' + resp.status + ', response: ' + text.slice(0, 300));
    if (!resp.ok) {
      shireSay('Shire: το Oxygen απάντησε ' + resp.status + ' στην ακύρωση της ' + number + '. Έλεγξε τη λίστα.', 'fail');
      return;
    }

    // The toast must survive the reload, and the reload checks that it took.
    try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ number: number, at: Date.now() })); } catch (e) { /* storage blocked */ }
    shireSay('Η ειδοποίηση Νο ' + number + ' ακυρώθηκε');
    setTimeout(() => window.location.reload(), 1200);
  }

  // After the reload: show the result once, and warn if the row does not read cancelled.
  async function showCancelFlash() {
    let flash = null;
    try {
      flash = JSON.parse(sessionStorage.getItem(FLASH_KEY) || 'null');
      sessionStorage.removeItem(FLASH_KEY);
    } catch (e) { return; }
    if (!flash || !NOTICE_NUMBER_RE.test(String(flash.number)) || Date.now() - flash.at > 60000) return;
    const number = String(flash.number);
    const rows = await waitForMatch(() => {
      const r = findNoticeRows(number);
      return r.length ? r : null;
    }, 5000);
    if (rows && rows.length === 1 && getTempId(rows[0]) && !rowLooksCancelled(rows[0])) {
      shireSay('Shire: η ειδοποίηση ' + number + ' ΔΕΝ φαίνεται ακυρωμένη στη λίστα. Έλεγξέ τη.', 'fail');
      return;
    }
    shireSay('Η ειδοποίηση Νο ' + number + ' ακυρώθηκε');
  }

  waitAndInject();
  showCancelFlash().catch(() => {});
  handleShireHandoff().catch((err) =>
    shireSay('Shire: σφάλμα (' + err.message + '). Δεν έγινε τίποτα.', 'fail'));

})();
