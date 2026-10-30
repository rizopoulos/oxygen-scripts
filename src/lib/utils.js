// ===========================================================================
// Oxygen Scripts - Shared Utilities
// ===========================================================================

window.OxygenUtils = {

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Find a visible link by its text content (exact or partial match)
  findVisibleLink(text, exact = false) {
    const links = document.querySelectorAll('a[href="javascript:void(0);"]');
    for (const link of links) {
      const linkText = link.textContent.trim();
      const match = exact ? linkText === text : linkText.includes(text);
      if (match) {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return link;
        }
      }
    }
    return null;
  },

  // Wait for an element to appear in the DOM (polling)
  async waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await OxygenUtils.sleep(100);
    }
    return null;
  },

  // Wait for a visible link with specific text
  async waitForVisibleLink(text, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const link = OxygenUtils.findVisibleLink(text);
      if (link) return link;
      await OxygenUtils.sleep(100);
    }
    return null;
  },

  // Inject CSS into the page (idempotent - won't duplicate)
  injectCSS(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  },

  // Read one query param from the current URL (raw string, or null).
  readParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // Remove query params from the address bar without reloading, so a refresh
  // does not repeat a one-shot action (Shire hand-off params).
  stripParams(names) {
    const u = new URL(window.location.href);
    let changed = false;
    for (const n of names) {
      if (u.searchParams.has(n)) { u.searchParams.delete(n); changed = true; }
    }
    if (changed) history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  },

  // Resolve with predicate()'s first truthy value, re-checking on every DOM
  // mutation (lists that render late / via AJAX). Resolves null on timeout.
  waitForMatch(predicate, timeout = 8000) {
    return new Promise((resolve) => {
      const first = predicate();
      if (first) { resolve(first); return; }
      let done = false;
      let timer = null;
      const observer = new MutationObserver(() => {
        const v = predicate();
        if (v) finish(v);
      });
      function finish(v) {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(v);
      }
      observer.observe(document.body, { childList: true, subtree: true });
      timer = setTimeout(() => finish(predicate() || null), timeout);
    });
  },

  // Comparable key for a document label: "ΤΑΜ 6372", "TAM-6372", "tam6372" → "TAM6372".
  // Greek capitals that look like Latin ones are folded to Latin (Oxygen and the API
  // disagree on TAM vs ΤΑΜ), accents and separators are dropped. Text only, never HTML.
  docKey(text) {
    const fold = { 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
      'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X' };
    return String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[\s\-./#:]/g, '')
      .replace(/[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, (c) => fold[c]);
  },

  // Fetch a script from the repo (GitHub main) and run it in page scope, exactly
  // like the installed loader does. Lets src/router.js add routes with NO reinstall
  // of tampermonkey-loader.js.
  async loadScript(path) {
    if (!/^[a-z0-9_\/-]+\.js$/.test(path) || path.indexOf('..') !== -1) {
      throw new Error('Refusing to load script path: ' + path);
    }
    const base = 'https://raw.githubusercontent.com/rizopoulos/oxygen-scripts/main/src/';
    const bust = '?v=' + encodeURIComponent(OxygenUtils.VERSION || 'unknown') + '&_=' + Date.now();
    const resp = await fetch(base + path + bust);
    if (!resp.ok) throw new Error('Failed to load ' + path + ': ' + resp.status);
    const script = document.createElement('script');
    script.textContent = await resp.text();
    document.head.appendChild(script);
    document.head.removeChild(script);
  },

  // Log with prefix
  log(msg) {
    console.log(`[Oxygen] ${msg}`);
  },

  warn(msg) {
    console.warn(`[Oxygen] ${msg}`);
  },

  error(msg) {
    console.error(`[Oxygen] ${msg}`);
  }
};
