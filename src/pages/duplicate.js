// ===========================================================================
// Oxygen Scripts - Duplicate Last Invoice/Receipt
// ===========================================================================
// Search for a customer, find their last invoice/receipt, and duplicate it
// as a new receipt or invoice with the same products and customer.
// ===========================================================================

(function () {
  'use strict';

  const { sleep, injectCSS, log, warn, error } = OxygenUtils;

  injectCSS('oxygen-duplicate-css', `
    .o-dup-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 100000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
    }
    .o-dup-dialog {
      background: #fff;
      border-radius: 12px;
      width: 500px;
      max-height: 70vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .o-dup-header {
      background: #000;
      color: #fff;
      padding: 14px 18px;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .o-dup-close {
      color: #D35155;
      cursor: pointer;
      font-size: 20px;
      font-weight: bold;
      line-height: 1;
    }
    .o-dup-close:hover { color: #fff; }
    .o-dup-body {
      padding: 14px 18px;
      overflow-y: auto;
      flex: 1;
    }
    .o-dup-input {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #815f88;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    }
    .o-dup-input:focus { border-color: #D35155; }
    .o-dup-results {
      margin-top: 10px;
    }
    .o-dup-item {
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.1s;
      font-size: 13px;
    }
    .o-dup-item:hover { background: #f0f0f0; }
    .o-dup-item-name { font-weight: 600; color: #000; }
    .o-dup-item-code { color: #815f88; font-size: 11px; }
    .o-dup-item-detail { color: #000; font-size: 12px; }
    .o-dup-item-amount { color: #008582; font-weight: 600; }
    .o-dup-item-date { color: #815f88; font-size: 11px; }
    .o-dup-item-type {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      margin-right: 6px;
    }
    .o-dup-type-receipt { background: #D35155; }
    .o-dup-type-invoice { background: #008582; }
    .o-dup-back {
      color: #815f88;
      cursor: pointer;
      font-size: 12px;
      margin-bottom: 8px;
      display: inline-block;
    }
    .o-dup-back:hover { color: #D35155; }
    .o-dup-loading {
      text-align: center;
      padding: 20px;
      color: #815f88;
    }
    .o-dup-empty {
      text-align: center;
      padding: 20px;
      color: #815f88;
      font-size: 13px;
    }
  `);

  // AJAX helper — uses jQuery if available, else XMLHttpRequest
  function postFasts(data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://app.pelatologio.gr/loads/fasts.php');
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(new Error('XHR failed'));
      const params = new URLSearchParams(data).toString();
      xhr.send(params);
    });
  }

  // Parse search results HTML into customer objects
  function parseCustomers(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const rows = div.querySelectorAll('.hSearchLine[data-link]');
    return Array.from(rows).map(row => {
      const code = row.querySelector('span')?.textContent?.trim() || '';
      const text = row.textContent.replace(code, '').trim();
      const link = row.getAttribute('data-link');
      // Extract contact ID from sibling elements — look in parent context
      const parent = row.closest('.col80');
      const nextSibling = parent?.nextElementSibling?.nextElementSibling;
      const btn = nextSibling?.querySelector('[data-action="fasts-show_recent_invoices"]');
      const contactId = btn?.getAttribute('data-docid') || '';
      return { name: text, code, contactId, link };
    });
  }

  // Parse recent invoices HTML
  function parseInvoices(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const rows = div.querySelectorAll('.hSearchLine[data-action="invoices-preview_invoice"]');
    return Array.from(rows).map(row => {
      const docid = row.getAttribute('data-docid');
      const typeSpan = row.querySelector('[class*="invoice_type"]');
      const typeCode = typeSpan?.textContent?.trim() || '';
      const isReceipt = typeCode.includes('ΑΛ') || typeSpan?.className?.includes('receipt');
      const text = row.textContent.trim();
      // Extract date, number, amount from text like "28/12/2025 - Νο 3011 € 35.12 € 35.12"
      const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
      const noMatch = text.match(/Νο\s*(\d+)/);
      const amountMatch = text.match(/€\s*([\d.,]+)/);
      return {
        docid,
        typeCode,
        isReceipt,
        date: dateMatch?.[1] || '',
        number: noMatch?.[1] || '',
        amount: amountMatch?.[1] || '',
      };
    });
  }

  // Submit duplicate form
  function submitDuplicate(invoiceId, targetPage) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://app.pelatologio.gr/' + targetPage;
    form.target = '_blank';
    const fields = {
      invoice_temp_id: invoiceId,
      use_template: 'yes',
      same_products: 'yes',
      same_customer: 'yes',
      same_category: 'yes',
      same_rules: 'yes',
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
    document.body.removeChild(form);
  }

  // UI
  let overlay = null;

  function closeDialog() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  function showDialog() {
    closeDialog();
    overlay = document.createElement('div');
    overlay.className = 'o-dup-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });

    overlay.innerHTML = `
      <div class="o-dup-dialog">
        <div class="o-dup-header">
          <span>Αντιγραφή παραστατικού</span>
          <span class="o-dup-close">&times;</span>
        </div>
        <div class="o-dup-body">
          <input class="o-dup-input" placeholder="Αναζήτηση πελάτη..." autofocus>
          <div class="o-dup-results"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.o-dup-close').addEventListener('click', closeDialog);

    const input = overlay.querySelector('.o-dup-input');
    const results = overlay.querySelector('.o-dup-results');
    let searchTimeout = null;

    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const term = input.value.trim();
      if (term.length < 2) { results.innerHTML = ''; return; }
      searchTimeout = setTimeout(() => searchCustomers(term, results), 300);
    });

    input.focus();
  }

  async function searchCustomers(term, container) {
    container.innerHTML = '<div class="o-dup-loading">Αναζήτηση...</div>';
    try {
      const html = await postFasts({ option: 'global_search', sterm: term });
      const customers = parseCustomers(html);
      if (customers.length === 0) {
        container.innerHTML = '<div class="o-dup-empty">Δεν βρέθηκαν αποτελέσματα</div>';
        return;
      }
      container.innerHTML = '';
      for (const c of customers) {
        const item = document.createElement('div');
        item.className = 'o-dup-item';
        item.innerHTML = `
          <span><span class="o-dup-item-code">${c.code}</span> <span class="o-dup-item-name">${c.name}</span></span>
          <span style="color:#815f88;">▸</span>
        `;
        item.addEventListener('click', () => loadInvoices(c, container));
        container.appendChild(item);
      }
    } catch (err) {
      container.innerHTML = '<div class="o-dup-empty">Σφάλμα αναζήτησης</div>';
      error('Search failed: ' + err.message);
    }
  }

  async function loadInvoices(customer, container) {
    container.innerHTML = '<div class="o-dup-loading">Φόρτωση παραστατικών...</div>';
    try {
      const html = await postFasts({ option: 'show_recent_invoices', docid: customer.contactId });
      const invoices = parseInvoices(html);
      if (invoices.length === 0) {
        container.innerHTML = `
          <span class="o-dup-back">← Πίσω</span>
          <div class="o-dup-empty">Δεν βρέθηκαν παραστατικά για ${customer.name}</div>
        `;
        container.querySelector('.o-dup-back').addEventListener('click', () => {
          const input = overlay.querySelector('.o-dup-input');
          searchCustomers(input.value.trim(), container);
        });
        return;
      }
      container.innerHTML = '';

      const back = document.createElement('span');
      back.className = 'o-dup-back';
      back.textContent = '← Πίσω';
      back.addEventListener('click', () => {
        const input = overlay.querySelector('.o-dup-input');
        searchCustomers(input.value.trim(), container);
      });
      container.appendChild(back);

      const title = document.createElement('div');
      title.style.cssText = 'font-weight:700; margin-bottom:8px; font-size:13px;';
      title.textContent = customer.name;
      container.appendChild(title);

      for (const inv of invoices) {
        const item = document.createElement('div');
        item.className = 'o-dup-item';
        const typeClass = inv.isReceipt ? 'o-dup-type-receipt' : 'o-dup-type-invoice';
        item.innerHTML = `
          <span>
            <span class="o-dup-item-type ${typeClass}">${inv.typeCode}</span>
            <span class="o-dup-item-detail">${inv.date} — Νο ${inv.number}</span>
          </span>
          <span class="o-dup-item-amount">€ ${inv.amount}</span>
        `;
        item.addEventListener('click', () => {
          // Duplicate as same type: receipt→receipt, invoice→invoice
          const target = inv.isReceipt ? 'receipts_new.php' : 'invoices_new.php';
          log(`Duplicating ${inv.typeCode} #${inv.number} (${inv.docid}) → ${target}`);
          submitDuplicate(inv.docid, target);
          closeDialog();
        });
        container.appendChild(item);
      }
    } catch (err) {
      container.innerHTML = '<div class="o-dup-empty">Σφάλμα φόρτωσης</div>';
      error('Load invoices failed: ' + err.message);
    }
  }

  // Register on panel
  if (window.OxygenPanel) {
    OxygenPanel.addButton('📋', 'Αντιγραφή παραστατικού', () => {
      showDialog();
    });
  }

  // Expose globally
  window.oxygenDuplicate = showDialog;

})();
