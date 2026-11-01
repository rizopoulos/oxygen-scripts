// ==UserScript==
// @name         Oxygen ERP Scripts
// @namespace    https://github.com/rizopoulos/oxygen-scripts
// @version      2.9.0
// @description  Automates repetitive workflows in Oxygen ERP (Pelatologio.gr)
// @match        https://app.pelatologio.gr/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

// Starts at document-start and downloads every script in parallel right away.
// It injects them the moment the HTML has been parsed (readyState "interactive"),
// so it never waits for Oxygen's images, iframes or third-party scripts (the old
// window "load" wait, which could take tens of seconds).

(function () {
  const REPO = 'https://raw.githubusercontent.com/rizopoulos/oxygen-scripts/main';
  const BASE = REPO + '/src';

  // Route table: URL pattern → script path
  const routes = [
    { pattern: 'notices.php',      script: 'pages/notices.js' },
    { pattern: 'receipts_new.php', script: 'pages/receipt-new.js' },
    { pattern: 'invoices_new.php', script: 'pages/receipt-new.js' },
  ];

  // Scripts loaded on ALL ERP pages
  const globalScripts = [
    'pages/duplicate.js',
  ];

  const t0 = performance.now();
  function stamp() {
    const d = new Date();
    const p = (n, w) => String(n).padStart(w || 2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3)
      + ' +' + Math.round(performance.now() - t0) + 'ms';
  }
  function log(msg) { console.log('[Oxygen ' + stamp() + '] ' + msg); }

  const bust = '?_=' + Date.now();

  function get(url) {
    return fetch(url + bust, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.text();
    });
  }

  // Resolves as soon as the whole HTML is parsed. "interactive" comes before
  // DOMContentLoaded and long before window "load"; nothing else is awaited.
  const domParsed = new Promise(function (resolve) {
    if (document.readyState !== 'loading') return resolve();
    document.addEventListener('readystatechange', function onChange() {
      if (document.readyState === 'loading') return;
      document.removeEventListener('readystatechange', onChange);
      resolve();
    });
  });

  function inject(path, code) {
    const script = document.createElement('script');
    script.textContent = code + '\n//# sourceURL=oxygen/' + path;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  const url = window.location.href;
  const matched = routes.filter(function (r) { return url.indexOf(r.pattern) !== -1; }).map(function (r) { return r.script; });
  const order = ['lib/utils.js', 'lib/panel.js'].concat(globalScripts, matched);

  log('start, readyState=' + document.readyState);

  // Every download starts now, in parallel.
  const versionP = get(REPO + '/version.json')
    .then(function (t) { return JSON.parse(t).version; })
    .catch(function () { return 'unknown'; });
  const codeP = order.map(function (path) {
    return get(BASE + '/' + path).catch(function (err) { console.error('[Oxygen] Failed to load ' + path + ': ' + err.message); return null; });
  });

  Promise.all([versionP, Promise.all(codeP), domParsed.then(function () { log('HTML parsed'); })])
    .then(function (res) {
      const VERSION = res[0];
      const codes = res[1];
      log('v' + VERSION + ' downloaded, injecting');
      for (let i = 0; i < order.length; i++) {
        if (codes[i] === null) continue;
        inject(order[i], codes[i]);
        if (order[i] === 'lib/utils.js' && window.OxygenUtils) window.OxygenUtils.VERSION = VERSION;
      }
      log('v' + VERSION + ' ready');
    })
    .catch(function (err) { console.error('[Oxygen] Error: ' + err.message); });
})();
