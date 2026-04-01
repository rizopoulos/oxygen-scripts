// ===========================================================================
// Oxygen ERP - Sequence 2: Re-select Units (Μ/Μ) on All Products
// ===========================================================================
// USE: Run on the receipt/invoice creation page (e.g., receipts_new.php)
//
// When converting a notice to a receipt, Oxygen carries over the products
// but the unit of measurement (Μ/Μ) column needs to be "confirmed" by
// clicking the dropdown and re-selecting the same unit for each product row.
//
// Without this script, you must manually:
//   1. Click the unit cell (e.g., "κιλ") for each product
//   2. Wait for dropdown to appear
//   3. Click the matching unit option (e.g., "κιλ - kg")
//   4. Repeat for every product row
//
// With 20-50 products, this wastes 2+ minutes. This script does it instantly.
// ===========================================================================

(function () {
  'use strict';

  const DELAY_BETWEEN_ROWS = 300; // ms between processing each row
  const DELAY_DROPDOWN = 300;     // ms to wait for dropdown to render

  // Map of displayed unit text to the dropdown option text
  // The dropdown shows "κιλ - kg", "τεμ - pc", etc.
  const UNIT_MAP = {
    'κιλ': 'κιλ - kg',
    'τεμ': 'τεμ - pc',
    'κιβ': 'κιβ - pk'
  };

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Find all product rows in the Αναλυτικές Γραμμές table
  function getProductRows() {
    // The products table has rows with textbox inputs for product codes
    // Each product row has a cell with the unit dropdown (Μ/Μ column)
    const tables = document.querySelectorAll('table');
    let productTable = null;

    for (const table of tables) {
      const headers = table.querySelectorAll('th, td');
      for (const header of headers) {
        if (header.textContent.trim() === 'Μ/Μ') {
          productTable = table;
          break;
        }
      }
      if (productTable) break;
    }

    if (!productTable) {
      console.error('[Oxygen Script] Could not find the products table!');
      return [];
    }

    // Get all data rows (skip header row and ΣΥΝΟΛΟ row)
    const rows = productTable.querySelectorAll('tr');
    const productRows = [];
    for (const row of rows) {
      const inputs = row.querySelectorAll('input[type="text"]');
      // Product rows have input fields (code, description, quantity, price, etc.)
      if (inputs.length >= 3) {
        productRows.push(row);
      }
    }

    return productRows;
  }

  // Find the unit cell (Μ/Μ) in a product row and get its current value
  function getUnitCell(row) {
    const cells = row.querySelectorAll('td');
    // The Μ/Μ column is typically the 3rd column (index 2)
    // It contains a clickable span with the unit text
    for (const cell of cells) {
      const span = cell.querySelector('span[style*="cursor"], span[class*="cursor"], [style*="cursor: pointer"]');
      if (span) {
        const text = span.childNodes[0]?.textContent?.trim() || span.textContent.trim();
        // Check if it's a known unit
        if (text in UNIT_MAP || text === 'Χωρίς Μ.Μ.' || text === '') {
          return { cell, span, currentUnit: text };
        }
      }
    }
    return null;
  }

  // Click the unit dropdown and select the matching unit
  async function reselectUnit(row, rowIndex) {
    const unitInfo = getUnitCell(row);
    if (!unitInfo) {
      console.warn(`[Oxygen Script] Row ${rowIndex + 1}: Could not find unit cell, skipping`);
      return false;
    }

    const { span, currentUnit } = unitInfo;

    if (!currentUnit || currentUnit === 'Χωρίς Μ.Μ.' || !(currentUnit in UNIT_MAP)) {
      console.log(`[Oxygen Script] Row ${rowIndex + 1}: Unit "${currentUnit}" - no action needed`);
      return false;
    }

    const targetOptionText = UNIT_MAP[currentUnit];

    // Step 1: Click the unit cell to open dropdown
    span.click();
    console.log(`[Oxygen Script] Row ${rowIndex + 1}: Clicked unit "${currentUnit}"`);
    await sleep(DELAY_DROPDOWN);

    // Step 2: Find and click the matching option in the dropdown
    const links = span.querySelectorAll('a[href="javascript:void(0);"]');
    let found = false;
    for (const link of links) {
      if (link.textContent.trim().includes(targetOptionText)) {
        link.click();
        console.log(`[Oxygen Script] Row ${rowIndex + 1}: Selected "${targetOptionText}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      // Fallback: search more broadly
      const allLinks = document.querySelectorAll('a[href="javascript:void(0);"]');
      for (const link of allLinks) {
        if (link.textContent.trim().includes(targetOptionText)) {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            link.click();
            console.log(`[Oxygen Script] Row ${rowIndex + 1}: Selected "${targetOptionText}" (fallback)`);
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      console.error(`[Oxygen Script] Row ${rowIndex + 1}: Could not find option "${targetOptionText}"!`);
    }

    return found;
  }

  async function reselectAllUnits() {
    const rows = getProductRows();
    if (rows.length === 0) {
      alert('No product rows found! Make sure you are on a receipt/invoice creation page.');
      return;
    }

    console.log(`[Oxygen Script] Found ${rows.length} product rows. Re-selecting units...`);

    let successCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const result = await reselectUnit(rows[i], i);
      if (result) successCount++;
      await sleep(DELAY_BETWEEN_ROWS);
    }

    console.log(`[Oxygen Script] Done! Re-selected units for ${successCount}/${rows.length} products.`);
  }

  // Expose globally
  window.oxygenReselectUnits = reselectAllUnits;

  // Run immediately
  reselectAllUnits();

})();
