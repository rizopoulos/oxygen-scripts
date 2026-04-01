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
