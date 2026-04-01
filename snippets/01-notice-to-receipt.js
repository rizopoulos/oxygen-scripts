// ===========================================================================
// Oxygen ERP - Sequence 1: Convert Notice to Receipt (Απόδειξη)
// ===========================================================================
// USE: Run from anywhere - it navigates to the notices page automatically.
//
// This script automates the multi-click workflow of converting a notice (ειδοποίηση)
// into a retail receipt (απόδειξη λιανικής). Normally requires:
//   0. Navigate to the notices page
//   1. Click ≡ menu icon on the notice row
//   2. Hover/click "Δημιουργία" submenu
//   3. Click "Απόδειξης"
//   4. Wait for modal to appear
//   5. Click "Μετατροπή" button
//
// With this script: run it, enter the notice ID, and everything happens automatically.
// ===========================================================================

(function () {
  'use strict';

  const NOTICES_URL = 'https://app.pelatologio.gr/notices.php?m=303';
  const DELAY_PAGE_LOAD = 1500; // ms to wait after navigating to notices page
  const DELAY_MENU = 400;      // ms to wait for the dropdown menu to render
  const DELAY_SUBMENU = 400;   // ms to wait for the submenu to render
  const DELAY_MODAL = 800;     // ms to wait for the modal to render

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Find the notice row's ≡ menu button by notice ID
  // The notice ID appears as a link like "EIΔ 3753" in the row
  function findMenuButton(noticeId) {
    const links = document.querySelectorAll('table a');
    for (const link of links) {
      if (link.textContent.trim().replace(/\s+/g, ' ').includes(noticeId)) {
        // Found the notice link, now find the ≡ menu in the same row
        const row = link.closest('tr');
        if (row) {
          // The menu button is the last cell's clickable span
          const lastCell = row.querySelector('td:last-child');
          if (lastCell) {
            const menuBtn = lastCell.querySelector('span[class*="dropdown"], span[style*="cursor"], div[class*="dropdown"]')
              || lastCell.querySelector('[style*="cursor: pointer"]')
              || lastCell.querySelector('span');
            return menuBtn;
          }
        }
      }
    }
    return null;
  }

  // Find a link in the currently visible dropdown by its text content
  function findDropdownLink(text) {
    const links = document.querySelectorAll('a[href="javascript:void(0);"]');
    for (const link of links) {
      const linkText = link.textContent.trim();
      if (linkText === text || linkText.includes(text)) {
        // Check if the link is visible (part of an open dropdown)
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return link;
        }
      }
    }
    return null;
  }

  // Find the Μετατροπή button in the modal
  function findMetatropiButton() {
    const links = document.querySelectorAll('a[href="javascript:void(0);"]');
    for (const link of links) {
      if (link.textContent.trim().includes('Μετατροπή')) {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return link;
        }
      }
    }
    return null;
  }

  // Navigate to the notices page and wait for it to load
  function navigateToNotices() {
    return new Promise((resolve) => {
      if (window.location.href.includes('notices.php')) {
        resolve(); // Already on the notices page
        return;
      }
      // Navigate and wait for the page to fully load
      window.location.href = NOTICES_URL;
      // This promise won't resolve because the page reloads.
      // The script must be re-triggered after navigation.
      // See the entry point below for how this is handled.
    });
  }

  async function convertNoticeToReceipt(noticeId) {
    console.log(`[Oxygen Script] Starting conversion for notice ${noticeId}...`);

    // Step 0: Make sure we're on the notices page
    if (!window.location.href.includes('notices.php')) {
      // Store the notice ID so we can pick it up after page load
      sessionStorage.setItem('oxygen_convert_notice_id', noticeId);
      console.log('[Oxygen Script] Navigating to notices page...');
      window.location.href = NOTICES_URL;
      return; // Page will reload, script re-runs via sessionStorage check
    }

    // Step 1: Click the ≡ menu button
    const menuBtn = findMenuButton(noticeId);
    if (!menuBtn) {
      alert(`Notice ${noticeId} not found on this page!`);
      return;
    }
    menuBtn.click();
    console.log('[Oxygen Script] Clicked ≡ menu');
    await sleep(DELAY_MENU);

    // Step 2: Click "Δημιουργία" to open submenu
    const dimiourgiaLink = findDropdownLink('Δημιουργία');
    if (!dimiourgiaLink) {
      alert('Could not find "Δημιουργία" in the dropdown menu!');
      return;
    }
    dimiourgiaLink.click();
    console.log('[Oxygen Script] Clicked Δημιουργία');
    await sleep(DELAY_SUBMENU);

    // Step 3: Click "Απόδειξης" in the submenu
    const apodeixisLink = findDropdownLink('Απόδειξης');
    if (!apodeixisLink) {
      alert('Could not find "Απόδειξης" in the submenu!');
      return;
    }
    apodeixisLink.click();
    console.log('[Oxygen Script] Clicked Απόδειξης');
    await sleep(DELAY_MODAL);

    // Step 4: Click "Μετατροπή" in the modal
    const metatropiBtn = findMetatropiButton();
    if (!metatropiBtn) {
      alert('Could not find "Μετατροπή" button in the modal!');
      return;
    }
    metatropiBtn.click();
    console.log('[Oxygen Script] Clicked Μετατροπή - redirecting to receipt form...');
  }

  // =========================================================================
  // USAGE: Call this function with the notice number (just the number)
  // =========================================================================
  // Example: convertNoticeToReceipt('3753')
  //
  // To make it even easier, you can add a keyboard shortcut or
  // prompt for the notice ID:

  // Auto-detect: find the first "Εκκρεμεί" (pending) notice and convert it
  function convertFirstPending() {
    const cells = document.querySelectorAll('td');
    for (const cell of cells) {
      if (cell.textContent.trim() === 'Εκκρεμεί') {
        const row = cell.closest('tr');
        if (row) {
          const idLink = row.querySelector('a');
          if (idLink) {
            const idMatch = idLink.textContent.match(/\d+/);
            if (idMatch) {
              convertNoticeToReceipt(idMatch[0]);
              return;
            }
          }
        }
      }
    }
    alert('No pending notices found!');
  }

  // Prompt mode: ask which notice to convert
  function promptAndConvert() {
    const noticeId = prompt('Enter notice number to convert to receipt (e.g., 3753):');
    if (noticeId) {
      convertNoticeToReceipt(noticeId.trim());
    }
  }

  // Expose functions globally so you can call them from console too
  window.oxygenConvertNotice = convertNoticeToReceipt;
  window.oxygenConvertFirst = convertFirstPending;

  // =========================================================================
  // ENTRY POINT
  // =========================================================================
  // Check if we were redirected here with a pending conversion
  const pendingNoticeId = sessionStorage.getItem('oxygen_convert_notice_id');
  if (pendingNoticeId && window.location.href.includes('notices.php')) {
    sessionStorage.removeItem('oxygen_convert_notice_id');
    console.log(`[Oxygen Script] Resuming conversion for notice ${pendingNoticeId} after navigation...`);
    // Wait for the page to fully render
    sleep(DELAY_PAGE_LOAD).then(() => convertNoticeToReceipt(pendingNoticeId));
  } else {
    // Fresh run: prompt for notice ID
    promptAndConvert();
  }

})();
