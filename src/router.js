// ===========================================================================
// Oxygen Scripts - Live Router
// ===========================================================================
// Route table that does NOT live in the installed Tampermonkey loader.
//
// The loader (tampermonkey-loader.js) is pasted into each browser by hand and is
// never auto-updated, so its inline `routes` array is frozen per machine. This file
// is fetched from GitHub main on every ERP page (panel.js loads it, and panel.js is
// loaded everywhere), so a route added HERE reaches every browser with no reinstall.
//
// Rule: a page must be routed in ONE place only. Never list here a script that the
// loader already routes (notices.js, receipt-new.js), or it would run twice.
// ===========================================================================

(function () {
  'use strict';

  if (window.__oxygenLiveRouter) return;
  window.__oxygenLiveRouter = true;

  const { log, error, loadScript } = OxygenUtils;

  // test() gets location.pathname. Exact page match, unlike the loader's indexOf,
  // so invoices.php never fires on invoices_new.php.
  const routes = [
    { test: (p) => /\/invoices\.php$/.test(p), script: 'pages/invoices.js' },
  ];

  const path = window.location.pathname;
  for (const r of routes) {
    if (!r.test(path)) continue;
    log('Live router: loading ' + r.script);
    loadScript(r.script).catch((err) => error('Live router: ' + err.message));
  }

})();
