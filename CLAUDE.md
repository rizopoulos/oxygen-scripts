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
  ├─ src/pages/duplicate.js     ← Global: search customer → find invoice → duplicate in new tab
  └─ src/router.js              ← LIVE route table, loaded by panel.js (no loader reinstall)
       └─ src/pages/invoices.js ← Route: invoices.php — Shire `shire_open` → open document modal
```

**Load order**: loader fetches `utils.js` → `panel.js` → global scripts (`duplicate.js`) → route-matched page scripts.

Scripts are fetched from `raw.githubusercontent.com` and injected as `<script>` elements (not `eval`) to run in page scope.

`src/router.js` is the **live route table**: `panel.js` (loaded by the installed loader on every page) fetches it from GitHub, so a route added there needs **no reinstall** of the loader. The loader's own inline table is frozen in each browser. A page is routed in ONE place only (never both). Routed there today: `invoices.php` → `pages/invoices.js`.
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
2. Add the route to `src/router.js` (live, no reinstall). Only the loader's `routes`/`globalScripts` need a loader edit, and that means every browser re-pastes the loader.
3. Register panel buttons via `OxygenPanel.addButton(icon, label, onClick)` with state management via `OxygenPanel.setButtonState(btn, 'running'|'active')`
4. Bump `version.json` (the loader `@version` only changes when the loader itself changes)

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

## Shire Hand-off Params

Shire (the cashier, `shire.rizopouloscoffee.gr`) cannot POST into Oxygen: Oxygen's cookies are `SameSite=Lax`, so a cross-site POST arrives logged out. A top-level GET link does carry them, so Shire opens Oxygen pages with a query param and the userscript, running same-origin, does the work. Every param is validated by a strict regex, matched against the page as text (never `innerHTML` or selectors), acted on once, and removed with `history.replaceState`. Failures show a sticky red toast and do nothing.

| Param | Page | Sent by | Does |
|---|---|---|---|
| `shire_receipt=<notice no>` | `notices.php?m=303` | Shire cashier, card notice | Finds the row by notice number, same POST as **ΑΠ**, same tab. Lands on the prefilled receipt; the human presses Δημιουργία (the POS fires there). |
| `shire_invoice=<notice no>` | `notices.php?m=303` | Shire cashier | Same, as **ΤΙΜ** (`invoices_new.php`). |
| `shire_open=<SERIES>-<NO>` (e.g. `TAM-6372`) | `invoices.php?m=301` | Shire cashier, issued receipt | Finds the row (TAM and ΤΑΜ compare equal) and clicks the row's own viewer to open Oxygen's document modal. **DOM of this page is unverified**; the console logs the row's `data-action`/`data-docid`. Only the first page of the list is searched (open TODO). |
| `shire_cancel=<notice no>` | `notices.php?m=303` | Shire wholesale orders, superseded notice | **Cancels immediately, no confirm** (irreversible). Exactly one pending row (has the convert link, does not read cancelled), docid = the convert link's `data-docid`, which must appear in the list form's `search_array`. Same POST as Oxygen's own UI: `POST /loads/notices_actions.php` `option=notice_status_change&option2=cancel&docid=…` + `jqPost[i][name]/[value]` = jQuery `serializeArray()` of the form holding `search_array` (fallback `pin1`). Then toast, reload; after the reload a sessionStorage flash re-checks the row. **Never tested on the real ERP**; first use: read the `shire_cancel:` console lines. |

Decisions: Shire repo, `grill-sessions/cashier-url-state.md` D6 and D7; `shire_cancel`: `grill-sessions/wholesale-order-step2-and-document-viewer.md` D11, D12, D30.
