// ===========================================================================
// Oxygen Scripts - Notices Page (notices.php?m=303)
// ===========================================================================
// Injects a quick-convert button on each notice row.
// Click the button → notice is converted to receipt automatically.
// ===========================================================================

(function () {
  'use strict';

  const { sleep, findVisibleLink, waitForVisibleLink, injectCSS, log, error } = OxygenUtils;

  const DELAY_MENU = 400;
  const DELAY_SUBMENU = 400;
  const DELAY_MODAL = 800;

  // Inject styles for our custom buttons
  injectCSS('oxygen-notices-css', `
    .oxygen-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid #e0a800;
      background: #fff3cd;
      color: #856404;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      font-weight: bold;
      margin-right: 4px;
      vertical-align: middle;
      transition: all 0.15s;
      line-height: 1;
    }
    .oxygen-btn:hover {
      background: #e0a800;
      color: #fff;
    }
    .oxygen-btn.running {
      background: #007bff;
      border-color: #007bff;
      color: #fff;
      pointer-events: none;
      opacity: 0.7;
    }
  `);

  // Find the ≡ menu button in a notice row
  function findMenuButton(row) {
    const lastCell = row.querySelector('td:last-child');
    if (!lastCell) return null;
    return lastCell.querySelector('[style*="cursor: pointer"]')
      || lastCell.querySelector('span');
  }

  // Run the full conversion sequence for a specific row
  async function convertRow(row, btn) {
    const idLink = row.querySelector('a');
    const noticeId = idLink ? idLink.textContent.trim() : 'unknown';
    log(`Converting ${noticeId} to receipt...`);
    btn.classList.add('running');
    btn.textContent = '...';

    try {
      // Step 1: Click ≡ menu
      const menuBtn = findMenuButton(row);
      if (!menuBtn) throw new Error('Menu button not found');
      menuBtn.click();
      await sleep(DELAY_MENU);

      // Step 2: Click "Δημιουργία"
      const dimiourgiaLink = findVisibleLink('Δημιουργία');
      if (!dimiourgiaLink) throw new Error('"Δημιουργία" not found in dropdown');
      dimiourgiaLink.click();
      await sleep(DELAY_SUBMENU);

      // Step 3: Click "Απόδειξης"
      const apodeixisLink = findVisibleLink('Απόδειξης');
      if (!apodeixisLink) throw new Error('"Απόδειξης" not found in submenu');
      apodeixisLink.click();
      await sleep(DELAY_MODAL);

      // Step 4: Click "Μετατροπή" in the modal
      const metatropiBtn = await waitForVisibleLink('Μετατροπή', 3000);
      if (!metatropiBtn) throw new Error('"Μετατροπή" not found in modal');
      metatropiBtn.click();
      log(`${noticeId} → Μετατροπή clicked, redirecting to receipt form...`);

    } catch (err) {
      error(`Failed: ${err.message}`);
      btn.classList.remove('running');
      btn.textContent = 'ΑΠ';
      alert(`Conversion failed: ${err.message}`);
    }
  }

  // Inject buttons into each notice row
  function injectButtons() {
    const table = document.querySelector('table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    let injected = 0;

    for (const row of rows) {
      const checkbox = row.querySelector('td input[type="checkbox"]');
      if (!checkbox) continue; // Skip header/total rows

      // Don't inject twice
      if (row.querySelector('.oxygen-btn')) continue;

      const cell = checkbox.closest('td');
      const btn = document.createElement('span');
      btn.className = 'oxygen-btn';
      btn.title = 'Μετατροπή σε Απόδειξη (Oxygen Script)';
      btn.textContent = 'ΑΠ';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        convertRow(row, btn);
      });

      cell.insertBefore(btn, checkbox);
      injected++;
    }

    if (injected > 0) {
      log(`Injected ${injected} convert buttons on notices page`);
    }
  }

  // Run
  injectButtons();

  // Also re-inject if the table updates dynamically (e.g., filtering/pagination)
  const observer = new MutationObserver(() => {
    injectButtons();
  });
  const tableContainer = document.querySelector('table')?.parentElement;
  if (tableContainer) {
    observer.observe(tableContainer, { childList: true, subtree: true });
  }

})();
