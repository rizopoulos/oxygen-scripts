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

  // Use fetch + eval to load scripts. This works with both jsdelivr
  // (proper MIME type) and raw.githubusercontent.com (text/plain).
  async function loadScript(path) {
    const url = `${BASE}/${path}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`[Oxygen] Failed to load ${path}: ${resp.status}`);
    const code = await resp.text();
    eval(code);
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
