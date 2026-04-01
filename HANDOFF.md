# Handoff: Oxygen ERP Browser Automation Scripts

**Generated**: 2026-04-01T16:20Z
**Branch**: main
**Status**: In Progress — core architecture works, debugging Tampermonkey injection reliability

## Goal

Build a suite of 10-15 browser automation scripts for Oxygen ERP (app.pelatologio.gr) that inject UI buttons and automate repetitive multi-click workflows. The user (Antonis) processes 30-40 notices/day and needs one-click conversion of notices to receipts, auto-selection of product units, and more sequences to come.

## Completed

- [x] Explored the Oxygen ERP UI with Playwright to understand DOM structure
- [x] Mapped the full Notice → Receipt conversion workflow (≡ menu → Δημιουργία → Απόδειξης → modal → Μετατροπή)
- [x] Mapped the product unit re-selection workflow (Μ/Μ column dropdown click → re-select same unit)
- [x] Built the Tampermonkey-based architecture: loader → utils → router → page scripts
- [x] Created `src/pages/notices.js` — injects ΑΠ button on each notice row, clicks Απόδειξης link directly via `data-action` attribute
- [x] Created `src/pages/receipt-new.js` — auto re-selects units for all product rows
- [x] Created `src/lib/utils.js` — shared helpers (sleep, findVisibleLink, waitForVisibleLink, injectCSS, log)
- [x] Pushed to GitHub: https://github.com/rizopoulos/oxygen-scripts
- [x] User installed Tampermonkey and configured the loader script
- [x] Buttons successfully inject on the notices page
- [x] Fixed: menu dropdown is `display:none` — now clicks the hidden `<a>` link directly via `data-action="notices-converte_to_invoice"` attribute
- [x] Fixed: `this.findVisibleLink` error — replaced `this` references with `OxygenUtils` in utils.js
- [x] Fixed: `<script src>` fails with raw.githubusercontent.com (wrong MIME type) — switched to fetch + inline `<script textContent>` injection

## Not Yet Done

- [ ] **Debug current issue**: Buttons sometimes don't appear after hard refresh (timing/race condition with Tampermonkey `@run-at document-idle` vs table rendering)
- [ ] **Verify the full Sequence 1 flow end-to-end**: ΑΠ button click → modal → Μετατροπή → redirect to receipt page
- [ ] **Verify Sequence 2 auto-runs** on receipt page after redirect
- [ ] **Build remaining 8-13 sequences** the user needs (not yet specified)
- [ ] **Documentation for adding new sequences** (docs/setup.md exists but needs validation)
- [ ] Consider a visual indicator (badge/status bar) showing Oxygen Scripts are active

## Failed Approaches (Don't Repeat These)

| Approach | Why It Failed | Current Solution |
|----------|--------------|-----------------|
| `<script src="raw.githubusercontent.com/...">` tag injection | raw.github serves `text/plain` MIME type, browsers refuse to execute | `fetch()` + `document.createElement('script').textContent = code` |
| `eval(code)` inside Tampermonkey | `'use strict'` + Tampermonkey sandboxing caused scoping issues, `OxygenUtils` not accessible | Inline `<script>` element injection runs in page's global scope |
| Click ≡ menu → find visible "Δημιουργία" link → click "Απόδειξης" | Menu uses `.cMenuBox.hidden` with `display:none`, so `getBoundingClientRect()` returns 0 for all links | Directly find `<a data-action="notices-converte_to_invoice" data-action2="receipt">` in the row's hidden menu, temporarily unhide, click, re-hide |
| Chrome DevTools Snippets | Lost when hard disk died, not synced to Google account, no version control | Tampermonkey + GitHub repo |
| Bookmarklets | Can't survive page reloads/navigation | Tampermonkey runs on every page load |
| `this.findVisibleLink()` in utils.js methods | When destructured (`const { waitForVisibleLink } = OxygenUtils`), `this` becomes undefined | Use `OxygenUtils.findVisibleLink()` explicitly |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Tampermonkey + GitHub + jsdelivr CDN | User wanted version control (Git), auto-injection (no manual snippet running), and persistence across page reloads |
| Currently using raw.githubusercontent.com | jsdelivr caches for 24h, raw.github updates instantly. Switch back to jsdelivr once scripts are stable |
| Inline `<script>` injection instead of eval | Runs in page's global scope, no sandboxing issues |
| Direct `data-action` attribute click instead of menu navigation | Skips 2 intermediate clicks (≡ menu → Δημιουργία), faster and more reliable since we don't need the menu to be visible |
| Single loader script in Tampermonkey, all logic on GitHub | User only touches Tampermonkey once; all updates are git push |
| Separate page scripts (notices.js, receipt-new.js) | Clean separation for 10-15 future sequences |

## Current State

**Working**:
- ΑΠ buttons inject on notices page (confirmed in Playwright and user's browser)
- Clicking ΑΠ opens the conversion modal correctly
- Scripts load from raw.githubusercontent.com via fetch + inline script injection
- Git repo pushed and synced: https://github.com/rizopoulos/oxygen-scripts

**Broken/Unreliable**:
- After hard refresh (`Ctrl+Shift+R`), buttons sometimes don't appear — likely timing issue between Tampermonkey's `@run-at document-idle` and the table rendering. The loader uses `window.addEventListener('load', ...)` with 300ms delay but the table might be loaded dynamically after that.
- The full Sequence 1 flow (ΑΠ → modal → Μετατροπή → redirect) has not been confirmed end-to-end in the user's browser yet (was blocked by the `this.findVisibleLink` bug, now fixed)

**Uncommitted Changes**: None — working tree clean

## Files to Know

| File | Why It Matters |
|------|----------------|
| `tampermonkey-loader.js` | The ONLY file pasted into Tampermonkey. Contains route table and fetch+inject logic. User must update this manually when it changes. |
| `src/lib/utils.js` | Shared utilities. All page scripts destructure from `OxygenUtils`. NEVER use `this` — use `OxygenUtils.method()` explicitly. |
| `src/router.js` | Currently UNUSED — the loader handles routing directly now. Keep for potential future use. |
| `src/pages/notices.js` | Sequence 1: Injects ΑΠ buttons, clicks hidden Απόδειξης link, waits for modal, clicks Μετατροπή |
| `src/pages/receipt-new.js` | Sequence 2: Auto re-selects Μ/Μ (unit) dropdowns for all product rows |
| `snippets/` | Old standalone scripts, kept for reference only. NOT used by Tampermonkey system. |
| `docs/workflows.md` | Full documentation of sequences, DOM details, timing |
| `docs/setup.md` | One-time setup guide for Tampermonkey installation |

## Code Context

### DOM structure of the notices table (critical for notices.js)
```html
<!-- Each notice row -->
<tr>
  <td><input type="checkbox"></td>
  <td><a href="javascript:void(0);">EIΔ 3753</a></td>
  <td>ΚΩΝΣΤΑΝΤΙΝΟΣ ΒΛΑΝΤΗΣ</td>
  <!-- ... more cells ... -->
  <td>
    <div class="conOptions cMenu cssMenu">
      <i class="fa fa-bars fa-lg"></i>
      <div class="cMenuBox right hidden">  <!-- display:none when hidden -->
        <a href="javascript:void(0);" class="bauto"
           data-action="notices-converte_to_invoice"
           data-action2="receipt"
           data-docid="450381"
           data-width="650">
          <i class="fa fa-file-alt fa-lg txt-blue3"></i>Απόδειξης
        </a>
        <!-- ... more menu links ... -->
      </div>
    </div>
  </td>
</tr>
```

### How notices.js clicks the Απόδειξης link
```js
// Find directly by data attributes — no menu navigation needed
const apodeixisLink = row.querySelector('a[data-action="notices-converte_to_invoice"][data-action2="receipt"]');
const menuBox = row.querySelector('.cMenuBox');
if (menuBox) menuBox.classList.remove('hidden');  // temporarily show
apodeixisLink.click();  // triggers modal
if (menuBox) menuBox.classList.add('hidden');  // re-hide
```

### Product unit dropdown structure (receipt page)
```html
<!-- Μ/Μ cell in products table -->
<td>
  <span style="cursor: pointer">
    κιλ  <!-- visible text -->
    <div class="...">  <!-- dropdown popup, appears on click -->
      <div>Μονάδες μέτρησης</div>
      <a href="javascript:void(0);"> κιλ - kg</a>
      <a href="javascript:void(0);"> τεμ - pc</a>
      <a href="javascript:void(0);"> κιβ - pk</a>
    </div>
  </span>
</td>
```

### Unit mapping (receipt-new.js)
```js
const UNIT_MAP = { 'κιλ': 'κιλ - kg', 'τεμ': 'τεμ - pc', 'κιβ': 'κιβ - pk' };
```

### Tampermonkey loader flow
```
Tampermonkey fires (@run-at document-idle)
  → setTimeout or window.load + 300ms
    → fetch('lib/utils.js') → inject as <script textContent>
      → window.OxygenUtils is now set
    → check URL against route table
    → fetch('pages/notices.js') → inject as <script textContent>
      → buttons appear
```

## Resume Instructions

1. **First, fix the timing issue**. The buttons don't always appear. Investigate by opening DevTools Console (F12) on `notices.php?m=303` and checking for `[Oxygen]` messages. If no messages at all → Tampermonkey didn't fire. If `[Oxygen] Loading pages/notices.js` appears but no buttons → the table wasn't rendered yet when `injectButtons()` ran.

   Likely fix: In `notices.js`, add a retry loop or MutationObserver that waits for `table tr td input[type="checkbox"]` to exist before injecting buttons. The current MutationObserver only watches for changes after initial injection.

2. **Test the full Sequence 1 end-to-end**: Click ΑΠ button → modal should appear → Μετατροπή should be clicked automatically → should redirect to `receipts_new.php`.
   - Expected: Lands on receipt page with products pre-filled
   - If modal doesn't appear: increase `DELAY_MODAL` in notices.js (currently 800ms)
   - If Μετατροπή click fails: check `waitForVisibleLink` timeout (currently 3000ms)

3. **Test Sequence 2**: On the receipt page, verify units are auto-re-selected.
   - Expected: Console shows `[Oxygen] Row 1: κιλ → κιλ - kg` for each product
   - If no output: receipt-new.js may not have loaded (check route matching)

4. **Ask user about remaining sequences** (they mentioned 10-15 total). Document each one with Playwright exploration before coding.

5. **Once stable, switch BASE URL** in tampermonkey-loader.js from `raw.githubusercontent.com` to `cdn.jsdelivr.net/gh/rizopoulos/oxygen-scripts@main/src` for better performance.

## Setup Required

- **Tampermonkey** Chrome extension installed
- **Tampermonkey script** must contain the latest `tampermonkey-loader.js` content (user has to paste manually when this file changes)
- **GitHub repo**: https://github.com/rizopoulos/oxygen-scripts (public, for jsdelivr access)
- **Oxygen ERP login**: User logs in manually at app.pelatologio.gr, scripts run after authentication

## Warnings

- **Never use `this` in OxygenUtils methods** — they get destructured. Always use `OxygenUtils.method()`.
- **The Tampermonkey loader is the ONE file users must manually update** when it changes. All other files auto-update from GitHub.
- **jsdelivr caches for ~24 hours**. During active development, use `raw.githubusercontent.com` as BASE URL.
- **The `data-action` attribute value has a typo in Oxygen's source**: `notices-converte_to_invoice` (not "convert"). Don't "fix" this — it must match exactly.
- **`receipts_new.php`** is the URL for new receipts (not `receipt_new.php`). Check the route table matches exactly.
- **The MutationObserver in notices.js** can cause infinite loops if it triggers button injection which itself mutates the DOM. The `if (row.querySelector('.oxygen-btn')) continue` guard prevents this but be careful when modifying.
- **The user's ERP data is real business data** (ΡΙΖΟΠΟΥΛΟΣ ΚΑΦΕΣ 1901 Ε.Ε.). Notices are safe to convert (not tax documents), but don't click "Δημιουργία Απόδειξης" (the final submit button on the receipt page) as that creates a real tax document.
