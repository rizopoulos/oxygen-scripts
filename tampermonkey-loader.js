// ==UserScript==
// @name         Oxygen ERP Scripts
// @namespace    https://github.com/rizopoulos/oxygen-scripts
// @version      1.1
// @description  Automates repetitive workflows in Oxygen ERP (Pelatologio.gr)
// @match        https://app.pelatologio.gr/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  const BASE = 'https://raw.githubusercontent.com/rizopoulos/oxygen-scripts/main/src';

  // Route table: URL pattern → script path
  const routes = [
    { pattern: 'notices.php',      script: 'pages/notices.js' },
    { pattern: 'receipts_new.php', script: 'pages/receipt-new.js' },
  ];

  async function loadAndRun(path) {
    const resp = await fetch(BASE + '/' + path);
    if (!resp.ok) { console.error('[Oxygen] Failed to load ' + path + ': ' + resp.status); return; }
    const code = await resp.text();
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
    document.head.removeChild(script);
  }

  async function init() {
    try {
      // Load shared utils
      await loadAndRun('lib/utils.js');

      // Find matching page scripts
      const url = window.location.href;
      const matched = routes.filter(function(r) { return url.indexOf(r.pattern) !== -1; });

      for (var i = 0; i < matched.length; i++) {
        console.log('[Oxygen] Loading ' + matched[i].script);
        await loadAndRun(matched[i].script);
      }

      if (matched.length > 0) console.log('[Oxygen] Ready');
    } catch (err) {
      console.error('[Oxygen] Error: ' + err.message);
    }
  }

  setTimeout(init, 500);
})();
