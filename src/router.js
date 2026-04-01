// ===========================================================================
// Oxygen Scripts - Router
// ===========================================================================
// Maps URL patterns to page modules. The loader calls this after loading utils.
// ===========================================================================

(function () {
  'use strict';

  const BASE_URL = window.OXYGEN_SCRIPTS_BASE;
  const url = window.location.href;

  // Route table: URL pattern → script file
  const routes = [
    { pattern: 'notices.php',       script: 'pages/notices.js' },
    { pattern: 'receipts_new.php',  script: 'pages/receipt-new.js' },
    // Future sequences:
    // { pattern: 'invoices_new.php',  script: 'pages/invoice-new.js' },
    // { pattern: 'delivery_new.php',  script: 'pages/delivery-new.js' },
    // { pattern: 'contacts.php',      script: 'pages/contacts.js' },
  ];

  async function loadScript(path) {
    const url = `${BASE_URL}/${path}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
    const code = await resp.text();
    eval(code);
  }

  async function route() {
    const matched = routes.filter(r => url.includes(r.pattern));
    if (matched.length === 0) {
      OxygenUtils.log(`No scripts for this page (${window.location.pathname})`);
      return;
    }

    for (const match of matched) {
      try {
        OxygenUtils.log(`Loading ${match.script}...`);
        await loadScript(match.script);
      } catch (err) {
        OxygenUtils.error(err.message);
      }
    }
  }

  route();

})();
