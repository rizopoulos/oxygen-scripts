// ==UserScript==
// @name         Oxygen ERP Scripts
// @namespace    https://github.com/rizopoulos/oxygen-scripts
// @version      1.0
// @description  Automates repetitive workflows in Oxygen ERP (Pelatologio.gr)
// @match        https://app.pelatologio.gr/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================================
  // CONFIGURATION - Change this after pushing to GitHub
  // =========================================================================
  // Replace rizopoulos/oxygen-scripts with your actual GitHub path.
  // jsdelivr automatically serves files from any public GitHub repo.
  //
  // For local development, you can point this to your ServBay local URL:
  //   const BASE = 'http://oxygen-scripts.servbay.demo/src';
  //
  const BASE = 'https://cdn.jsdelivr.net/gh/rizopoulos/oxygen-scripts@main/src';
  // =========================================================================

  window.OXYGEN_SCRIPTS_BASE = BASE;

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${BASE}/${path}`;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`[Oxygen] Failed to load: ${path}`));
      document.head.appendChild(s);
    });
  }

  async function init() {
    try {
      await loadScript('lib/utils.js');
      await loadScript('router.js');
      console.log('[Oxygen] Scripts loaded successfully');
    } catch (err) {
      console.error(err.message);
    }
  }

  // Wait a moment for the page to fully render, then init
  setTimeout(init, 500);
})();
