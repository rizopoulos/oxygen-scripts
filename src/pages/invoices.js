// ===========================================================================
// Oxygen Scripts - Receipts/Invoices list (invoices.php?m=301)
// ===========================================================================
// Shire hand-off (cashier, grill-session D7):
//   invoices.php?m=301&shire_open=TAM-6372
// finds that document's row on the list and opens Oxygen's own document modal
// (Oxygen opens it with an AJAX POST option=show_invoice&id=<numeric UI id>,
// an id Shire does not have, hence the hop through this script).
//
// Routed by src/router.js (live), NOT by the installed loader.
//
// The DOM of this page is UNVERIFIED (no capture exists in this repo). The row is
// found by its visible document label and the modal is opened by clicking the row's
// own opener, so nothing here posts on Oxygen's behalf. Every decision is logged to
// the console with the row's data-action / data-docid attributes, to confirm the DOM.
// ===========================================================================

(function () {
  'use strict';

  if (window.__oxygenInvoicesPage) return;
  window.__oxygenInvoicesPage = true;

  const { log, warn, error, readParam, stripParams, waitForMatch, docKey } = OxygenUtils;
  // docKey folds the series from the URL param; fold() below does the same to page text.

  const ORIGIN = 'https://app.pelatologio.gr';
  const PARAM = 'shire_open';
  const DOC_RE = /^[A-Za-zΑ-Ωα-ω]{1,10}-\d{1,10}$/;
  // data-action values that only VIEW a document (Oxygen elsewhere uses
  // "invoices-preview_invoice"). Anything that prints, sends or changes is excluded.
  const OPEN_ACTION_RE = /(show|preview|view)/i;
  const DANGER_ACTION_RE = /(delete|cancel|remove|print|send|email|sms|pay|credit|void|edit|copy|convert)/i;

  function say(message, type) {
    if (type === 'fail') error(message); else log(message);
    if (window.OxygenPanel) OxygenPanel.toast(message, type, type === 'fail');
    else if (type === 'fail') alert(message);
  }

  // Body rows only (they have td cells).
  function listRows() {
    return Array.from(document.querySelectorAll('table tr')).filter((r) => r.querySelector('td'));
  }

  // Same fold as docKey (accents off, upper case, Greek look-alikes to Latin) but
  // separators kept, so word boundaries still exist.
  const FOLD = { 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
    'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X' };
  function fold(text) {
    return String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, (c) => FOLD[c])
      .replace(/\s+/g, ' ');
  }

  // The series and the number must sit together in ONE cell or link text:
  // "ΤΑΜ 6372", "TAM-6372", "ΤΑΜ Νο 6372", "ΤΑΜ6372". Bounded on both sides, so a
  // customer "ΣΤΑΜΑΤΗΣ" (folds to ...TAM...) or a number 63720 never matches.
  function docRegex(seriesKey, number) {
    return new RegExp('(?:^|[^0-9A-ZΑ-Ω])' + seriesKey + '[\\s\\-./#:]*(?:NO[.:]?[\\s\\-./#:]*)?' + number + '(?![0-9])');
  }

  // Links first, so the matched element is the clickable one when there is one.
  function matchRow(row, re) {
    for (const el of row.querySelectorAll('a, td')) {
      if (re.test(fold(el.textContent))) return el;
    }
    return null;
  }

  function findMatches(seriesKey, number) {
    const re = docRegex(seriesKey, number);
    const found = [];
    for (const row of listRows()) {
      const el = matchRow(row, re);
      if (el) found.push({ row, el });
    }
    return found;
  }

  // Attributes of the row and its descendants, for confirming the real DOM.
  function domFacts(row) {
    const els = [row].concat(Array.from(row.querySelectorAll('[data-action], [data-docid], [data-id]')));
    return els
      .filter((el) => el.hasAttribute('data-action') || el.hasAttribute('data-docid') || el.hasAttribute('data-id'))
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        action: el.getAttribute('data-action'),
        docid: el.getAttribute('data-docid'),
        id: el.getAttribute('data-id'),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      }));
  }

  // The row's own way of opening the document modal, safest first.
  function findOpener(row, matchedEl) {
    const viewers = [row].concat(Array.from(row.querySelectorAll('[data-action]')))
      .filter((el) => {
        const a = el.getAttribute('data-action');
        return a && OPEN_ACTION_RE.test(a) && !DANGER_ACTION_RE.test(a);
      });
    const numeric = viewers.find((el) => /^\d{1,12}$/.test(el.getAttribute('data-docid') || ''));
    if (numeric) return { el: numeric, how: 'data-action=' + numeric.getAttribute('data-action') + ' (numeric data-docid)' };
    if (viewers.length) return { el: viewers[0], how: 'data-action=' + viewers[0].getAttribute('data-action') };
    // What a human does: click the document number link.
    if (matchedEl && matchedEl.tagName === 'A') return { el: matchedEl, how: 'document number link' };
    return null;
  }

  async function handleShireOpen() {
    if (window.location.origin !== ORIGIN) return;
    const raw = readParam(PARAM);
    if (raw === null) return;

    if (!DOC_RE.test(raw)) {
      stripParams([PARAM]);
      say('Shire: μη έγκυρο παραστατικό στο link. Δεν έγινε τίποτα.', 'fail');
      return;
    }

    const dash = raw.lastIndexOf('-');
    const seriesKey = docKey(raw.slice(0, dash));
    const number = raw.slice(dash + 1);

    say('Shire: αναζήτηση ' + raw + '…');
    const matches = await waitForMatch(() => {
      const m = findMatches(seriesKey, number);
      return m.length ? m : null;
    }, 8000);
    stripParams([PARAM]);

    if (!matches) {
      // TODO(D7): a document not on the list's first page is not reachable yet.
      // Needs Oxygen's own list search (a same-origin request this script can make,
      // then the row or its numeric id from the response). Not captured; do not guess.
      say('Shire: το ' + raw + ' δεν βρέθηκε σε αυτή τη σελίδα της λίστας. Αναζήτησέ το χειροκίνητα.', 'fail');
      return;
    }
    if (matches.length > 1) {
      warn('shire_open ' + raw + ': ' + matches.length + ' rows match');
      matches.forEach((m) => console.info('[Oxygen] candidate row', domFacts(m.row)));
      say('Shire: ' + matches.length + ' γραμμές ταιριάζουν με ' + raw + '. Δεν άνοιξε τίποτα.', 'fail');
      return;
    }

    const { row, el } = matches[0];
    console.info('[Oxygen] shire_open ' + raw + ' row, DOM facts:', domFacts(row));

    const opener = findOpener(row, el);
    if (!opener) {
      say('Shire: βρέθηκε το ' + raw + ' αλλά όχι τρόπος να ανοίξει. Άνοιξέ το χειροκίνητα.', 'fail');
      return;
    }

    log('shire_open ' + raw + ': clicking ' + opener.how);
    row.scrollIntoView({ block: 'center' });
    opener.el.click();
    say('Shire: άνοιγμα ' + raw);
  }

  handleShireOpen().catch((err) => say('Shire: σφάλμα (' + err.message + '). Δεν έγινε τίποτα.', 'fail'));

})();
