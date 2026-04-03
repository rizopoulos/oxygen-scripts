# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Browser automation scripts for **Oxygen ERP** (app.pelatologio.gr) injected via Tampermonkey. The user processes 30-40 notices/day in a Greek coffee business ERP and needs one-click automations for repetitive workflows.

## Architecture

```
tampermonkey-loader.js          ← Only file in Tampermonkey. Fetches all other scripts from GitHub.
  ├─ src/lib/utils.js           ← Shared utilities (sleep, waitForElement, injectCSS, log)
  ├─ src/lib/panel.js           ← Floating control panel (right-side, red #D35155)
  ├─ src/pages/notices.js       ← Route: notices.php — ΑΠ/ΤΙΜ convert buttons per row
  ├─ src/pages/receipt-new.js   ← Route: receipts_new.php + invoices_new.php — unit reselect, payment, warehouse warning
  └─ src/pages/duplicate.js     ← Global: search customer → find invoice → duplicate in new tab
```

**Load order**: loader fetches `utils.js` → `panel.js` → global scripts (`duplicate.js`) → route-matched page scripts.

Scripts are fetched from `raw.githubusercontent.com` and injected as `<script>` elements (not `eval`) to run in page scope.

`src/router.js` exists but is **not used** — the loader has its own inline route table.
`snippets/` contains old standalone scripts kept for reference only.

## Key Constraints

- **Never use `this` in OxygenUtils methods** — they get destructured. Always use `OxygenUtils.method()`.
- **`notice_temp_id` vs `invoice_temp_id`**: Notice conversion uses `notice_temp_id`, duplicate uses `invoice_temp_id`. Different param names for different flows.
- **Typo is intentional**: `data-action="notices-converte_to_invoice"` matches Oxygen's actual DOM.
- **Design system**: Only 5 colors: `#D35155` (berry-red), `#008582` (leafy-green), `#815f88` (deep-purple), `#000`, `#fff`. Border-radius is always `4px`.
- **Logo**: `https://cdn.rizopouloscoffee.gr/www/logos/rizopoulos--white.png`
- **Real business data**: Never trigger document creation (clicking "Δημιουργία Απόδειξης" creates real tax documents).
- **Payment values**: Card=8, COD=1 (for `#invoice_payment_method` select2).

## Git Workflow (Mandatory)

**On every code change, you MUST commit and push to GitHub.** Do not ask for permission — just do it.

After every push, run `git log --oneline -3` and show the output in chat as proof.

## Version Bumping (Mandatory)

**On every change, bump the version** in `version.json` (the single source of truth). The loader fetches this dynamically from GitHub — the user never edits Tampermonkey.

Use **semantic versioning**:
- **Patch** (2.4.0 → 2.4.1): bug fixes, CSS tweaks, minor adjustments
- **Minor** (2.4.1 → 2.5.0): new features, new page scripts, new panel buttons
- **Major** (2.5.0 → 3.0.0): breaking changes to architecture or loader

Also keep `@version` in `tampermonkey-loader.js` line 4 in sync (for Tampermonkey's UI) but the user does NOT need to update their copy — it's cosmetic only.

Always bump the version as the **last edit** before committing, so the push includes it.

## Adding a New Page Script

1. Create `src/pages/newpage.js` as an IIFE
2. Add route to the `routes` array in `tampermonkey-loader.js` (or `globalScripts` if it should run everywhere)
3. Register panel buttons via `OxygenPanel.addButton(icon, label, onClick)` with state management via `OxygenPanel.setButtonState(btn, 'running'|'active')`
4. Bump VERSION in loader

## AJAX Endpoints

All AJAX goes through `POST /loads/fasts.php` with `option=` parameter:
- `option=global_search&sterm=X` — customer search (returns HTML with `.hSearchLine[data-link]`)
- `option=show_recent_invoices&docid=X` — recent invoices for a contact

## Cache Busting

Scripts are fetched with `?v=VERSION&_=Date.now()`. The `Date.now()` suffix is necessary because `raw.githubusercontent.com` aggressively caches even across version bumps.

## Failed Approaches (Do Not Retry)

- `<script src="raw.githubusercontent.com">` — wrong MIME type, browser blocks execution
- `eval(code)` in Tampermonkey — sandboxing breaks `OxygenUtils` access
- Modal click flow for notice conversion — timing-dependent, use direct POST instead
- Enter key for search + select — race condition with debounce; use Arrow keys + Enter
- Hover-to-expand panel — user wants explicit click toggle
