// ==UserScript==
// @name         Oxygen ERP Scripts
// @namespace    https://github.com/rizopoulos/oxygen-scripts
// @version      2.5.2
// @description  Automates repetitive workflows in Oxygen ERP (Pelatologio.gr)
// @match        https://app.pelatologio.gr/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  const REPO = 'https://raw.githubusercontent.com/rizopoulos/oxygen-scripts/main';
  const BASE = REPO + '/src';

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

  // Fetch current version from GitHub (always fresh via Date.now())
  async function fetchVersion() {
    try {
      const resp = await fetch(REPO + '/version.json?_=' + Date.now());
      if (!resp.ok) throw new Error(resp.status);
      const data = await resp.json();
      return data.version;
    } catch (err) {
      console.warn('[Oxygen] Could not fetch version, using fallback cache bust');
      return 'unknown';
    }
  }

  async function loadAndRun(path, cacheBust) {
    const resp = await fetch(BASE + '/' + path + cacheBust);
    if (!resp.ok) { console.error('[Oxygen] Failed to load ' + path + ': ' + resp.status); return; }
    const code = await resp.text();
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
    document.head.removeChild(script);
  }

  async function init() {
    try {
      // Fetch version dynamically from GitHub
      var VERSION = await fetchVersion();
      var CACHE_BUST = '?v=' + VERSION + '&_=' + Date.now();

      console.log('[Oxygen] v' + VERSION + ' loading...');

      // Load shared utils
      await loadAndRun('lib/utils.js', CACHE_BUST);

      // Set version on utils for control panel
      if (window.OxygenUtils) window.OxygenUtils.VERSION = VERSION;

      // Find matching page scripts
      var url = window.location.href;
      var matched = routes.filter(function(r) { return url.indexOf(r.pattern) !== -1; });

      // Load control panel and global scripts on pages with routes OR on any ERP page
      if (matched.length > 0 || url.indexOf('app.pelatologio.gr') !== -1) {
        await loadAndRun('lib/panel.js', CACHE_BUST);

        for (var g = 0; g < globalScripts.length; g++) {
          console.log('[Oxygen] Loading ' + globalScripts[g]);
          await loadAndRun(globalScripts[g], CACHE_BUST);
        }
      }

      for (var i = 0; i < matched.length; i++) {
        console.log('[Oxygen] Loading ' + matched[i].script);
        await loadAndRun(matched[i].script, CACHE_BUST);
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
