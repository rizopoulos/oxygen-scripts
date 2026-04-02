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
      border-radius: 4px;
      width: 460px;
      max-height: 70vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .o-dup-header {
      background: #000;
      color: #fff;
      padding: 14px 18px;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .o-dup-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .o-dup-header-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #D35155;
    }
    .o-dup-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: #815f88;
      font-size: 16px;
      transition: all 0.15s;
    }
    .o-dup-close:hover { background: #D35155; color: #fff; }
    .o-dup-body {
      padding: 16px 18px;
      overflow-y: auto;
      flex: 1;
    }
    .o-dup-input {
      width: 100%;
      padding: 11px 12px;
      border: 2px solid #e8e0eb;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
    }
    .o-dup-input:focus { border-color: #D35155; }
    .o-dup-results {
      margin-top: 12px;
    }
    .o-dup-item {
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: background 0.12s;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .o-dup-item:hover { background: #f8f5f9; }
    .o-dup-item-avatar {
      width: 34px;
      height: 34px;
      border-radius: 4px;
      background: #815f88;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      flex-shrink: 0;
    }
    .o-dup-item-info { flex: 1; }
    .o-dup-item-name { font-weight: 700; font-size: 13px; color: #000; }
    .o-dup-item-contact { font-size: 11px; color: #815f88; margin-top: 1px; }
    .o-dup-item-arrow { color: #815f88; font-size: 16px; transition: all 0.15s; }
    .o-dup-item:hover .o-dup-item-arrow { transform: translateX(3px); color: #D35155; }
    .o-dup-item-detail { color: #000; font-size: 13px; font-weight: 600; }
    .o-dup-item-date { font-size: 11px; color: #815f88; margin-top: 1px; }
    .o-dup-item-amount { color: #008582; font-weight: 700; font-size: 14px; margin-left: auto; }
    .o-dup-item-type {
      display: inline-block;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      color: #fff;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .o-dup-type-receipt { background: #D35155; }
    .o-dup-type-invoice { background: #008582; }
    .o-dup-inv-item {
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #f0ecf1;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.15s;
      margin-bottom: 5px;
    }
    .o-dup-inv-item:hover {
      border-color: #815f88;
      background: #fdfafe;
      transform: translateX(3px);
    }
    .o-dup-back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #815f88;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .o-dup-back:hover { color: #D35155; }
    .o-dup-customer-name {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 12px;
      color: #000;
    }
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
  // HTML structure repeats: .col80 (name) → .col10 (notes) → .col10 (invoices btn with docid)
  function parseCustomers(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const customers = [];
    const nameRows = div.querySelectorAll('.hSearchLine[data-link]');
    for (const row of nameRows) {
      const code = row.querySelector('span')?.textContent?.trim() || '';
      const name = row.textContent.replace(code, '').trim();
      // The contact ID is in the btnstmpnotes or btnstmp nearby — use regex on raw HTML
      const linkHref = row.getAttribute('data-link') || '';
      const idMatch = linkHref.match(/[&?]i=(\d+)/);
      const contactId = idMatch?.[1] || '';
      if (contactId) customers.push({ name, code, contactId });
    }
    return customers;
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
          <div class="o-dup-header-left"><div class="o-dup-header-dot"></div> Αντιγραφή παραστατικού</div>
          <div class="o-dup-close">&times;</div>
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
