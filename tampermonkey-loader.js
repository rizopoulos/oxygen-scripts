// ==UserScript==
// @name         Oxygen ERP Scripts
// @namespace    https://github.com/rizopoulos/oxygen-scripts
// @version      2.0.0
// @description  Automates repetitive workflows in Oxygen ERP (Pelatologio.gr)
// @match        https://app.pelatologio.gr/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  const VERSION = '2.0.0';
  const BASE = 'https://raw.githubusercontent.com/rizopoulos/oxygen-scripts/main/src';
  const CACHE_BUST = '?v=' + VERSION + '&t=' + Date.now();

  // Route table: URL pattern → script path
  const routes = [
    { pattern: 'notices.php',      script: 'pages/notices.js' },
    { pattern: 'receipts_new.php', script: 'pages/receipt-new.js' },
    { pattern: 'invoices_new.php', script: 'pages/receipt-new.js' },
  ];

  // Scripts loaded on ALL pages that have the panel
  const globalScripts = [
    'pages/duplicate.js',
  ];

  async function loadAndRun(path) {
    const resp = await fetch(BASE + '/' + path + CACHE_BUST);
    if (!resp.ok) { console.error('[Oxygen] Failed to load ' + path + ': ' + resp.status); return; }
    const code = await resp.text();
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
    document.head.removeChild(script);
  }

  async function init() {
    try {
      console.log('[Oxygen] v' + VERSION + ' loading...');

      // Load shared utils
      await loadAndRun('lib/utils.js');

      // Set version on utils for control panel
      if (window.OxygenUtils) window.OxygenUtils.VERSION = VERSION;

      // Find matching page scripts
      var url = window.location.href;
      var matched = routes.filter(function(r) { return url.indexOf(r.pattern) !== -1; });

      // Load control panel and global scripts on pages with routes OR on any ERP page
      if (matched.length > 0 || url.indexOf('app.pelatologio.gr') !== -1) {
        await loadAndRun('lib/panel.js');

        for (var g = 0; g < globalScripts.length; g++) {
          console.log('[Oxygen] Loading ' + globalScripts[g]);
          await loadAndRun(globalScripts[g]);
        }
      }

      for (var i = 0; i < matched.length; i++) {
        console.log('[Oxygen] Loading ' + matched[i].script);
        await loadAndRun(matched[i].script);
      }

      console.log('[Oxygen] v' + VERSION + ' ready');
    } catch (err) {
      console.error('[Oxygen] Error: ' + err.message);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 300);
  } else {
    window.addEventListener('load', function() { setTimeout(init, 300); });
  }
})();
