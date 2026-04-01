# Oxygen ERP Automation Scripts

## Overview

These scripts automate repetitive multi-click workflows in the Oxygen ERP (Pelatologio.gr) web application. They are loaded automatically via Tampermonkey on every page of the ERP.

**Target URL**: `https://app.pelatologio.gr/*`  
**Architecture**: Tampermonkey loader → GitHub (jsdelivr CDN) → router → page-specific scripts  
**See also**: [Setup Guide](setup.md)

## Architecture

```
tampermonkey-loader.js    ← Installed once in Tampermonkey, fetches from GitHub
  └─ src/lib/utils.js     ← Shared utilities (sleep, findElement, CSS injection)
  └─ src/router.js        ← Checks URL, loads the right page script
      ├─ src/pages/notices.js       ← Sequence 1: Notice → Receipt buttons
      ├─ src/pages/receipt-new.js   ← Sequence 2: Auto re-select units
      ├─ src/pages/invoice-new.js   ← (future)
      └─ ...                        ← 10-15 more page scripts
```

Old standalone snippets are kept in `snippets/` for reference but are **not used** by the Tampermonkey system.

---

## Sequence 1: Notice to Receipt Conversion

**File**: `src/pages/notices.js`  
**Active on**: `notices.php`  
**UI**: Injects an **ΑΠ** button next to the checkbox on each notice row

### What it does

Converts a pending notice (ειδοποίηση) into a retail receipt (απόδειξη λιανικής) with a single action instead of 5+ manual clicks.

### Manual workflow (before automation)

1. On the notices list page, find the target notice row
2. Click the **≡ menu icon** (hamburger, far-right column)
3. In the dropdown, hover/click **Δημιουργία** (Create)
4. In the submenu, click **Απόδειξης** (Receipt)
5. Wait for the modal to appear with checkboxes:
   - Τα ίδια προϊόντα (Same products) ✓
   - Τον ίδιο πελάτη (Same customer) ✓
   - Την ίδια κατηγορία (Same category) ✓
   - Τους ίδιους όρους & σχόλια (Same terms & comments) ✓
   - Μάρκαρε αυτή την ειδοποίηση ως "Ολοκληρωμένη" (Mark as completed) ✓
6. Click **Μετατροπή** (Convert)
7. Gets redirected to `receipts_new.php` with the receipt form pre-filled

### Automated workflow

1. Open the notices page → **ΑΠ** buttons are already injected on every row
2. Click **ΑΠ** on the notice you want to convert
3. Script clicks through all steps automatically (≡ → Δημιουργία → Απόδειξης → Μετατροπή)
4. You land on the receipt creation page (where Sequence 2 auto-runs)

### DOM details (for maintenance)

- **Notice rows**: `<table>` rows containing links with text like "EIΔ 3753"
- **Menu button**: Last `<td>` in each row, contains a `<span>` with `cursor: pointer`
- **Dropdown links**: `<a href="javascript:void(0);">` with text content
- **Submenu**: "Δημιουργία" opens a nested menu with "Τιμολογίου", "Απόδειξης", "Δ. Αποστολής", "Δ.Παραλαβής"
- **Modal**: Contains heading "Δημιουργία Απόδειξης Λιανικής από ειδοποίηση" with checkboxes and Μετατροπή/Κλείσιμο buttons

### Timing

- Menu render: ~400ms
- Submenu render: ~400ms
- Modal render: ~800ms
- Total: ~1.6s (vs 5-7s manual)

---

## Sequence 2: Re-select Product Units (Μ/Μ)

**File**: `src/pages/receipt-new.js`  
**Active on**: `receipts_new.php`  
**UI**: Injects a **Re-select Units** button + auto-runs on page load

### What it does

After converting a notice to a receipt, the products table carries over the products but the unit of measurement (Μ/Μ column) must be "confirmed" by clicking each dropdown and re-selecting the same unit. This script does it for all rows automatically.

### Manual workflow (before automation)

For **each product row** in the Αναλυτικές Γραμμές table:
1. Click the unit cell (shows "κιλ", "τεμ", etc.)
2. Wait for dropdown popup to appear
3. Click the matching option (e.g., "κιλ - kg")

With 3 products: ~6 clicks, ~3 seconds  
With 20 products: ~40 clicks, ~20 seconds  
With 50 products: ~100 clicks, ~50+ seconds

### Automated workflow

1. Navigate to the receipt creation page (after Sequence 1)
2. Run the script
3. All units are re-selected automatically

### DOM details (for maintenance)

- **Products table**: Contains a header row with "Μ/Μ" column
- **Unit cell**: 3rd column in each product row, contains a `<span>` with `cursor: pointer`
- **Unit text**: Direct text node of the span (e.g., "κιλ", "τεμ", "κιβ")
- **Dropdown popup**: Rendered inside the span as nested `<div>` with links
- **Unit options**: `<a href="javascript:void(0);">` with text like " κιλ - kg", " τεμ - pc", " κιβ - pk"

### Unit mapping

| Displayed | Dropdown option | Meaning |
|-----------|----------------|---------|
| κιλ | κιλ - kg | Kilograms |
| τεμ | τεμ - pc | Pieces |
| κιβ | κιβ - pk | Boxes/packages |

---

## How to Use

### Option A: Chrome DevTools Snippets

1. Open Chrome DevTools (F12)
2. Go to **Sources** tab → **Snippets** (in the left sidebar)
3. Click **+ New snippet**
4. Paste the script content
5. Name it (e.g., "Notice to Receipt")
6. To run: right-click the snippet → **Run**, or press `Ctrl+Enter`

### Option B: Browser Console

1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Paste the script and press Enter

### Option C: Tampermonkey / Greasemonkey

Create a userscript that runs on `app.pelatologio.gr` pages and adds keyboard shortcuts or toolbar buttons to trigger each sequence.

---

## Time Savings

| Task | Manual | Automated | Savings per task |
|------|--------|-----------|-----------------|
| Notice → Receipt | 5-7s | ~1.6s | ~4-5s |
| Unit re-selection (3 products) | ~3s | <1s | ~2s |
| Unit re-selection (20 products) | ~20s | ~6s | ~14s |
| Unit re-selection (50 products) | ~50s | ~15s | ~35s |

With 30-40 notices per day:
- **Sequence 1**: saves ~2-3 minutes/day
- **Sequence 2**: saves ~5-10 minutes/day (depending on product count)
- **Combined**: saves ~7-13 minutes/day
