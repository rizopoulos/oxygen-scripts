# Handoff: Oxygen ERP Browser Automation Scripts v2

**Generated**: 2026-04-02T12:55Z
**Branch**: main
**Status**: In Progress — core architecture solid, UI polished, expanding sequences

## Goal

Build a suite of browser automation scripts for Oxygen ERP (app.pelatologio.gr) that inject UI buttons and automate repetitive multi-click workflows. The user (Antonis) processes 30-40 notices/day and needs one-click conversion of notices to receipts/invoices, auto-selection of product units, payment shortcuts, and a customer search & duplicate feature.

## Completed

- [x] Tampermonkey-based architecture: loader → utils → panel → router → page scripts
- [x] **Notices page** (`notices.js`): ΑΠ (receipt) and ΤΙΜ (invoice) buttons on each row
- [x] Notice conversion via direct POST (not modal clicks) — opens in new tab
- [x] **Receipt/Invoice page** (`receipt-new.js`): auto re-selects Μ/Μ (unit) dropdowns
- [x] Payment buttons: Card (value=8) and COD (value=1) — sets select2, clicks paid, clicks create
- [x] Warehouse warning modal auto-click (ΠΡΟΣΟΧΗ + "δεν είναι διαθέσιμα" → ΝΑΙ, Δημιουργία)
- [x] **Duplicate dialog** (`duplicate.js`): search customer via AJAX, show recent invoices, duplicate with one click
- [x] Arrow key navigation + Enter to select in duplicate dialog
- [x] **Floating control panel** (`panel.js`): red background, 2x2 grid (auto 1-col for single button), Rizopoulos logo, click to collapse
- [x] Panel + duplicate available on ALL ERP pages
- [x] receipt-new.js also loads on invoices_new.php (same DOM structure)
- [x] Cache-busting via `?v=VERSION&_=Date.now()` on all fetches
- [x] Auto-commit & push hook on every file edit (PostToolUse on Write|Edit)
- [x] **Design system**: only 5 colors (#D35155, #008582, #815f88, #000, #fff), 4px border-radius everywhere
- [x] Demo page (`demo.html`) showcasing all components on white background
- [x] Pushed to GitHub: https://github.com/rizopoulos/oxygen-scripts
- [x] Version: 2.2.0

## Not Yet Done

- [ ] **Build remaining sequences** the user needs (not yet specified — ask)
- [ ] **Port demo styles fully** — the demo HTML has polished styles (DM Sans font, stagger animations, glass sheen on buttons) that haven't been ported to the actual JS files yet. The production scripts use simpler CSS.
- [ ] **Visual indicator** showing Oxygen Scripts version/status on the page
- [ ] **Switch to jsdelivr CDN** once scripts are stable (raw.githubusercontent.com is used for instant updates during development)
- [ ] **Documentation** for adding new sequences

## Failed Approaches (Don't Repeat These)

| Approach | Why It Failed | Current Solution |
|----------|--------------|-----------------|
| `<script src="raw.githubusercontent.com/...">` | Wrong MIME type, browser refuses to execute | `fetch()` + `document.createElement('script').textContent = code` |
| `eval(code)` in Tampermonkey | Sandboxing issues, `OxygenUtils` not accessible | Inline `<script>` element injection runs in page scope |
| Click ≡ menu → Δημιουργία → Απόδειξης (modal flow) | 3 clicks, timing-dependent, modal waits | Direct POST to `receipts_new.php` / `invoices_new.php` with form params |
| `this.method()` in utils.js | Breaks when destructured | Always use `OxygenUtils.method()` |
| `[style*="cursor: pointer"]` for Μ/Μ dropdowns | Actual DOM uses `span.sauto` with `data-action` | `span.sauto[data-action="element-unitmList"]` + `.sautoTitle` |
| Hover to expand panel | User wanted explicit toggle | Click header to toggle collapsed/expanded |
| Enter key to trigger search + select first result | Race condition: search debounce not fired yet when Enter pressed | Arrow keys to navigate list, Enter to confirm selection |
| `?v=VERSION` only cache bust | Browser cached responses across version bumps within same version string | Added `&_=Date.now()` for guaranteed fresh fetch |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Red (#D35155) panel background | User's explicit request — matches brand |
| 2x2 button grid (auto 1-col for ≤1 button) | Compact square layout, auto-adapts to page context |
| 4px border-radius everywhere | User's explicit request — no exceptions |
| Rizopoulos logo from CDN in panel header | Brand identity, hidden when collapsed |
| `Date.now()` in cache bust | Version-only bust wasn't enough; browser aggressively cached raw.githubusercontent responses |
| Panel + duplicate on ALL ERP pages | User wants duplicate feature available everywhere, not just notices |
| POST with `form.target='_blank'` for conversions | Opens in new tab, doesn't lose current page state |
| `invoice_temp_id` (not `notice_temp_id`) for duplicate | Duplicating from existing invoice uses different param name than notice conversion |
| Arrow keys + Enter for dialog navigation | Enter-only approach had race conditions with async search |

## Current State

**Working**:
- All scripts load and run on the ERP
- ΑΠ/ΤΙΜ buttons appear on notices page, convert via POST in new tab
- Panel appears on all pages with correct buttons per context
- Duplicate dialog: search → customer list → invoice list → duplicate in new tab
- Arrow key navigation in duplicate dialog
- Auto unit re-selection on receipt/invoice pages
- Payment shortcuts (Card/COD) + warehouse warning auto-click

**Broken/Unreliable**:
- Nothing currently known broken

**Uncommitted Changes**: None — working tree clean

## Files to Know

| File | Why It Matters |
|------|----------------|
| `tampermonkey-loader.js` | The ONLY file pasted into Tampermonkey. Contains route table, version, and fetch+inject logic. User must update this manually when it changes (only version number usually). |
| `src/lib/utils.js` | Shared utilities (sleep, findVisibleLink, waitForElement, injectCSS, log). NEVER use `this` — use `OxygenUtils.method()`. |
| `src/lib/panel.js` | Floating control panel. Red background, 2x2 grid. Page scripts register buttons via `OxygenPanel.addButton(icon, label, onClick)`. |
| `src/pages/notices.js` | Notice list page: injects ΑΠ and ΤΙΜ buttons per row. POSTs to receipts_new.php or invoices_new.php. |
| `src/pages/receipt-new.js` | Receipt AND invoice new pages: auto re-selects units, payment buttons (Card=8, COD=1), warehouse warning auto-click. |
| `src/pages/duplicate.js` | Search & duplicate dialog. AJAX to `loads/fasts.php` for customer search and recent invoices. Arrow key navigation. |
| `demo.html` | Standalone UI preview of all components. Served locally for design review. |
| `.claude/settings.local.json` | PostToolUse hook that auto-commits and pushes on every Write/Edit. |
| `snippets/` | Old standalone scripts, kept for reference only. NOT used by Tampermonkey. |

## Code Context

### AJAX endpoints used by duplicate.js
```js
// Search customers
POST /loads/fasts.php
body: option=global_search&sterm=searchTerm
// Returns HTML with .hSearchLine[data-link] rows, contact ID in URL param &i=

// Get recent invoices for a customer
POST /loads/fasts.php
body: option=show_recent_invoices&docid=contactId
// Returns HTML with .hSearchLine[data-action="invoices-preview_invoice"] rows

// Duplicate as template (both receipt and invoice use same params)
POST /receipts_new.php  OR  /invoices_new.php
body: invoice_temp_id=docId&use_template=yes&same_products=yes&same_customer=yes&same_category=yes&same_rules=yes
```

### Notice conversion (different param name!)
```js
POST /receipts_new.php  OR  /invoices_new.php
body: notice_temp_id=docId&use_template=yes&same_products=yes&same_customer=yes&same_category=yes&same_rules=yes&mark_notice_complete=yes
```

### Panel button registration pattern
```js
if (window.OxygenPanel) {
  OxygenPanel.addButton('💳', 'Card', async (btn) => {
    OxygenPanel.setButtonState(btn, 'running');
    await doWork();
    OxygenPanel.setButtonState(btn, 'active');  // active = done (faded purple)
  });
}
```

### Unit dropdown DOM (receipt/invoice pages)
```html
<span class="sauto" data-action="element-unitmList" data-id="1">
  <span id="unitm_title1" class="sautoTitle">κιλ</span>
  <div class="sdialog" style="display: none;">
    <a data-action="set-unitm" data-set="κιλ">κιλ - kg</a>
    <a data-action="set-unitm" data-set="τεμ">τεμ - pc</a>
  </div>
</span>
```

### Payment method select2
```js
// Set value and trigger both native + jQuery change
el.value = value;
el.dispatchEvent(new Event('change', { bubbles: true }));
if (window.jQuery) jQuery(el).val(value).trigger('change');
// Values: 1=Μετρητά (COD), 3=Κάρτα POS, 8=Web Banking
```

### Warehouse warning modal detection
```js
// div#wdialog appears 200ms-2s after clicking Create Invoice
// Must contain BOTH "ΠΡΟΣΟΧΗ" AND "δεν είναι διαθέσιμα"
// Then click a#btn_savePlace
```

## Resume Instructions

1. **Ask user about remaining sequences** — they mentioned 10-15 total workflows. Only 4 are built (notice conversion, unit re-selection, payment shortcuts, duplicate). Get specifics on the next ones.

2. **If porting demo styles to production** — the `demo.html` has polished CSS (DM Sans font, gradient sheens, stagger animations) that the actual JS files don't use. Compare demo CSS vs panel.js/duplicate.js CSS and port the differences.

3. **If adding a new page script**:
   - Create `src/pages/newpage.js`
   - Add route to `tampermonkey-loader.js` routes array (or globalScripts if it should run on all pages)
   - Register panel buttons via `OxygenPanel.addButton()`
   - Bump VERSION in loader
   - The auto-push hook handles commit+push

4. **To test changes**: bump VERSION in tampermonkey-loader.js, push, tell user to update the version in Tampermonkey (2 places: @version header and const VERSION), then hard refresh the ERP page.

5. **Design constraints**: ONLY colors #D35155, #008582, #815f88, #000, #fff. ONLY 4px border-radius. Logo: `https://cdn.rizopouloscoffee.gr/www/logos/rizopoulos--white.png`

## Setup Required

- **Tampermonkey** Chrome extension with the loader script (user updates version number only)
- **GitHub repo**: https://github.com/rizopoulos/oxygen-scripts (public)
- **Auto-push hook**: `.claude/settings.local.json` has PostToolUse hook on Write|Edit that auto-commits and pushes. Show git log proof after every change.
- **Demo server**: `node -e "..."` on any free port, or open demo.html directly as file://

## Warnings

- **Never use `this` in OxygenUtils methods** — they get destructured. Always `OxygenUtils.method()`.
- **`data-action` typo**: `notices-converte_to_invoice` (not "convert") — matches Oxygen's source, don't fix it.
- **`notice_temp_id` vs `invoice_temp_id`**: notice conversion uses `notice_temp_id`, duplicate uses `invoice_temp_id`. Different param names for different flows!
- **The user's ERP data is real business data** (ΡΙΖΟΠΟΥΛΟΣ ΚΑΦΕΣ 1901 Ε.Ε.). Don't click "Δημιουργία Απόδειξης" — that creates a real tax document.
- **User expects git push proof** after every file change — always run `git log --oneline` and show it.
- **User expects version bump** with every change that needs to be visible — bump VERSION in loader, tell user to update Tampermonkey.
- **raw.githubusercontent.com** can cache for 5 minutes. The `&_=Date.now()` cache bust in the loader handles this.
- **Panel auto-sizes**: 1 column for 1 button, 2 columns for 2+ buttons. Width is `auto`.
