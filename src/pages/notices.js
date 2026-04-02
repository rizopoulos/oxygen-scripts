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
      border: none;
      background: #D35155;
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 700;
      margin-right: 4px;
      vertical-align: middle;
      transition: background 0.15s ease, transform 0.1s ease;
      line-height: 1;
    }
    .oxygen-btn:hover {
      background: #000;
      transform: scale(1.1);
    }
    .oxygen-btn:active {
      transform: scale(0.95);
    }
    .oxygen-btn.running {
      background: #815f88;
      color: #fff;
      pointer-events: none;
      opacity: 0.7;
    }
    .oxygen-btn.tim {
      background: #008582;
    }
    .oxygen-btn.tim:hover {
      background: #000;
    }
  `);

  // Get the notice_temp_id from a row's conversion link
  function getTempId(row) {
    const link = row.querySelector('a[data-action="notices-converte_to_invoice"]');
    return link ? link.getAttribute('data-docid') : null;
  }

  // POST to create a receipt or invoice from a notice in a new tab
  // action: 'receipts_new.php' for receipt, 'invoices_new.php' for invoice
  function convertRow(row, btn, targetPage) {
    const idLink = row.querySelector('a');
    const noticeId = idLink ? idLink.textContent.trim() : 'unknown';
    const tempId = getTempId(row);

    if (!tempId) {
      error(`${noticeId}: no data-docid found`);
      alert('Conversion failed: no document ID found');
      return;
    }

    log(`Converting ${noticeId} (temp_id=${tempId}) → ${targetPage}...`);
    btn.classList.add('running');
    btn.textContent = '...';

    // POST directly via hidden form in a new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://app.pelatologio.gr/' + targetPage;
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

      // ΑΠ = Απόδειξη (receipt)
      const btnAP = document.createElement('span');
      btnAP.className = 'oxygen-btn';
      btnAP.title = 'Μετατροπή σε Απόδειξη';
      btnAP.textContent = 'ΑΠ';
      btnAP.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        convertRow(row, btnAP, 'receipts_new.php');
      });

      // ΤΙΜ = Τιμολόγιο (invoice)
      const btnTIM = document.createElement('span');
      btnTIM.className = 'oxygen-btn tim';
      btnTIM.title = 'Μετατροπή σε Τιμολόγιο';
      btnTIM.textContent = 'ΤΙΜ';
      btnTIM.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        convertRow(row, btnTIM, 'invoices_new.php');
      });

      cell.insertBefore(btnTIM, checkbox);
      cell.insertBefore(btnAP, btnTIM);
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
