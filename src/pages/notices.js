// ===========================================================================
// Oxygen Scripts - Notices Page (notices.php?m=303)
// ===========================================================================
// Injects a quick-convert button on each notice row.
// Click the button → notice is converted to receipt automatically.
// ===========================================================================

(function () {
  'use strict';

  const { injectCSS, log, error } = OxygenUtils;

  // Inject styles for our custom buttons
  injectCSS('oxygen-notices-css', `
    .oxygen-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid #D35155;
      background: #fff;
      color: #D35155;
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
      background: #D35155;
      color: #fff;
    }
    .oxygen-btn.running {
      background: #815f88;
      border-color: #815f88;
      color: #fff;
      pointer-events: none;
      opacity: 0.7;
    }
  `);

  // Convert a notice to receipt by navigating directly to the receipt URL.
  // The notice's data-docid attribute holds the notice_temp_id needed for the URL.
  function convertRow(row, btn) {
    const idLink = row.querySelector('a');
    const noticeId = idLink ? idLink.textContent.trim() : 'unknown';

    // Get the notice_temp_id from the Απόδειξης link's data-docid attribute
    const apodeixisLink = row.querySelector('a[data-action="notices-converte_to_invoice"][data-action2="receipt"]');
    if (!apodeixisLink) {
      error(`${noticeId}: "Απόδειξης" link not found in row`);
      alert('Conversion failed: link not found in row');
      return;
    }

    const tempId = apodeixisLink.getAttribute('data-docid');
    if (!tempId) {
      error(`${noticeId}: no data-docid found`);
      alert('Conversion failed: no document ID found');
      return;
    }

    log(`Converting ${noticeId} (temp_id=${tempId}) to receipt...`);
    btn.classList.add('running');
    btn.textContent = '...';

    // POST directly via hidden form in a new tab — no modal, no clicks
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://app.pelatologio.gr/receipts_new.php';
    form.target = '_blank';
    const fields = {
      notice_temp_id: tempId,
      use_template: 'yes',
      same_products: 'yes',
      same_customer: 'yes',
      same_category: 'yes',
      same_rules: 'yes',
      mark_notice_complete: 'yes',
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
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

  // Wait for table rows to exist, then inject buttons.
  // Handles both immediate rendering and dynamic/late table loading.
  function waitAndInject() {
    // Try immediately
    injectButtons();

    // Also observe for dynamic updates (pagination, filtering, late rendering)
    const target = document.querySelector('table')?.parentElement || document.body;
    const observer = new MutationObserver(() => {
      injectButtons();
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  waitAndInject();

})();
