(() => {
  // Default build: one row per category, pre-filled with the common choice (GPU left empty)
  const DEFAULT_BUILD = [
    ['CPU', 'Intel Core Ultra 5 225'],
    ['GPU', ''],
    ['RAM', 'DDR5 8GB'],
    ['Mobo', 'H810M-A'],
    ['PSU', '550W PSU'],
    ['SSD', 'NVMe SSD 512GB'],
    ['Casing', 'Side Tempered Glass Casing'],
  ];
  const CATS = DEFAULT_BUILD.map(([cat]) => cat);
  // Extra categories offered in "Add another row" (no presets, free-text names)
  const EXTRA_CATS = ['Heatsink', 'Monitor', 'Fan'];

  // Each category has groups of presets; a group with a `tier` is colour-coded in the UI.
  const intelGroup = (tier, models) => ({
    label: `Core Ultra ${tier}`,
    tier,
    items: models.map((m) => `Intel Core Ultra ${tier} ${m}`),
  });
  const plain = (items) => [{ label: null, tier: null, items }];
  const PRESETS = {
    CPU: [
      intelGroup(5, ['225', '225F', '235', '235F', '235T', '245', '245F', '245K', '245KF', '245T']),
      intelGroup(7, ['265', '265F', '265K', '265KF', '265T']),
      intelGroup(9, ['285', '285K', '285T']),
    ],
    GPU: plain(['ASUS Dual RTX 5050', 'ASUS Dual RTX 5060', 'ASUS Dual RTX 5060 Ti']),
    RAM: plain(['DDR4 8GB', 'DDR4 16GB', 'DDR5 8GB', 'DDR5 16GB']),
    Mobo: plain(['H810M-A', 'B860M-AYW', 'B860M-A']),
    PSU: plain(['550W PSU', 'Cooler Master MWE V3 750W 80+ Gold']),
    SSD: plain(['NVMe SSD 512GB', 'NVMe SSD 1TB', 'NVMe SSD 2TB']),
    Casing: plain(['Side Tempered Glass Casing']),
  };
  const CUSTOM = '__custom';

  const CURRENCIES = { MYR: 'RM', USD: '$', SGD: 'S$', EUR: '€', GBP: '£', CNY: '¥', TWD: 'NT$', HKD: 'HK$' };
  const DEFAULT_FEE = 500;
  const STORE_KEY = 'rigpilot.v2';

  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 9);

  const newItem = (cat, name = '') => ({ id: uid(), cat, name, qty: 1, price: '', note: '' });

  const blank = () => ({
    title: '',
    customer: '',
    date: today(),
    currency: 'MYR',
    fee: DEFAULT_FEE,
    logo: '', // data URL of the company logo, kept in this browser only
    items: DEFAULT_BUILD.map(([cat, name]) => newItem(cat, name)),
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* storage may be unavailable (e.g. private mode) */ }
    return blank();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const groupsOf = (cat) => PRESETS[cat] || [];
  const presetsOf = (cat) => groupsOf(cat).flatMap((g) => g.items);
  const tierOf = (it) => {
    const g = groupsOf(it.cat).find((x) => x.items.includes(it.name));
    return g && g.tier ? 'tier-' + g.tier : '';
  };
  const sym = () => CURRENCIES[state.currency] || '';
  const money = (n) => sym() + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------- Calculations ----------
  function total() {
    const parts = state.items.reduce((s, it) => s + num(it.qty) * num(it.price), 0);
    return parts + num(state.fee);
  }

  function renderTotals() {
    $('t-total').textContent = money(total());
    document.querySelectorAll('#items tbody tr').forEach((tr) => {
      const it = state.items.find((x) => x.id === tr.dataset.id);
      if (it) tr.querySelector('.sub').textContent = money(num(it.qty) * num(it.price));
    });
  }

  // ---------- Table ----------
  // The dropdown mirrors the typed name: a preset if it matches one, "Custom…" if edited, empty otherwise
  const selectValue = (it) => {
    if (presetsOf(it.cat).includes(it.name)) return it.name;
    return it.name.trim() ? CUSTOM : '';
  };

  function partCell(it) {
    const presets = presetsOf(it.cat);
    let select = '';
    if (presets.length) {
      const selected = selectValue(it);
      const option = (p, tier) => `<option value="${esc(p)}"${tier ? ` class="tier-${tier}"` : ''}${p === selected ? ' selected' : ''}>${esc(p)}</option>`;
      const groups = groupsOf(it.cat).map((g) => {
        const opts = g.items.map((p) => option(p, g.tier)).join('');
        return g.label ? `<optgroup label="${esc(g.label)}" class="tier-${g.tier}">${opts}</optgroup>` : opts;
      });
      const opts = [`<option value="">Select ${esc(it.cat)}…</option>`]
        .concat(groups)
        .concat(`<option value="${CUSTOM}"${selected === CUSTOM ? ' selected' : ''}>Custom…</option>`);
      select = `<select data-f="preset" class="${tierOf(it)}">${opts.join('')}</select>`;
    }
    const placeholder = presets.length ? 'Or type / edit the name' : 'Type model / name';
    const input = `<input data-f="name" value="${esc(it.name)}" placeholder="${placeholder}">`;
    return `<div class="pick">${select}${input}</div>`;
  }

  function rowHtml(it) {
    return `<tr data-id="${it.id}">
      <td class="cat">${esc(it.cat)}</td>
      <td class="c-part">${partCell(it)}</td>
      <td class="num c-qty"><input data-f="qty" type="number" min="0" step="1" value="${esc(it.qty)}"></td>
      <td class="num c-price"><input data-f="price" type="number" min="0" step="any" value="${esc(it.price)}"></td>
      <td class="sub c-sub"></td>
      <td class="c-note"><input data-f="note" value="${esc(it.note)}" placeholder="Link / notes"></td>
      <td class="c-del"><button class="del" title="Delete row" aria-label="Delete row">×</button></td>
    </tr>`;
  }

  function renderRows() {
    $('items').querySelector('tbody').innerHTML = state.items.map(rowHtml).join('');
    renderTotals();
  }

  function addItem(cat) {
    state.items.push(newItem(cat));
    save();
    renderRows();
  }

  // ---------- Form bindings ----------
  function syncMeta() {
    $('title').value = state.title;
    $('customer').value = state.customer;
    $('date').value = state.date;
    $('currency').value = state.currency;
    $('fee').value = state.fee;
    syncLogo();
  }

  function syncLogo() {
    $('logo-thumb').hidden = !state.logo;
    if (state.logo) $('logo-thumb').src = state.logo;
    $('btn-logo-clear').hidden = !state.logo;
    $('btn-logo').textContent = state.logo ? 'Change logo' : 'Upload logo';
  }

  // Downscale so the logo stays small enough for localStorage
  function loadLogo(file) {
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w0 = img.naturalWidth || 300;
        const h0 = img.naturalHeight || 150;
        const scale = Math.min(1, 480 / w0, 240 / h0);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w0 * scale));
        canvas.height = Math.max(1, Math.round(h0 * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        state.logo = canvas.toDataURL('image/png');
        save();
        syncLogo();
      };
      img.onerror = () => alert('Could not read that image.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onRowInput(e) {
    const f = e.target.dataset.f;
    const tr = e.target.closest('tr');
    if (!f || !tr) return;
    const it = state.items.find((x) => x.id === tr.dataset.id);

    const picker = tr.querySelector('[data-f="preset"]');
    const nameInput = tr.querySelector('[data-f="name"]');

    if (f === 'preset') {
      if (e.target.value === CUSTOM) {
        // Start from a blank name; the dropdown stays on "Custom…" until a preset is picked
        it.name = '';
        nameInput.value = '';
        nameInput.focus();
        e.target.className = '';
      } else {
        it.name = e.target.value;
        nameInput.value = it.name;
        e.target.className = tierOf(it);
      }
    } else {
      it[f] = e.target.value;
      if (f === 'name' && picker) {
        picker.value = selectValue(it);
        picker.className = tierOf(it);
      }
    }
    save();
    renderTotals();
  }

  function bindMeta() {
    $('currency').innerHTML = Object.keys(CURRENCIES)
      .map((k) => `<option value="${k}">${k} (${CURRENCIES[k]})</option>`).join('');
    $('quick-btns').innerHTML = CATS.concat(EXTRA_CATS)
      .map((c) => `<button data-cat="${c}">+ ${c}</button>`).join('')
      + '<button data-custom-cat>+ Custom…</button>';

    const bind = (id, key, isNum) => {
      $(id).addEventListener('input', (e) => {
        state[key] = isNum ? num(e.target.value) : e.target.value;
        save();
        renderTotals();
      });
    };
    bind('title', 'title');
    bind('customer', 'customer');
    bind('date', 'date');
    bind('currency', 'currency');
    bind('fee', 'fee', true);

    $('quick-btns').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cat]');
      if (b) { addItem(b.dataset.cat); return; }
      if (e.target.closest('button[data-custom-cat]')) {
        const cat = (prompt('Category name (e.g. WiFi card, Keyboard):') || '').trim();
        if (cat) addItem(cat);
      }
    });

    const tbody = $('items').querySelector('tbody');
    tbody.addEventListener('input', onRowInput);
    tbody.addEventListener('click', (e) => {
      if (!e.target.closest('.del')) return;
      const id = e.target.closest('tr').dataset.id;
      state.items = state.items.filter((x) => x.id !== id);
      save();
      renderRows();
    });
  }

  // ---------- Print / PDF ----------
  const namedItems = () => state.items.filter((it) => it.name.trim());

  const itemLabel = (it) => it.name.trim() + (num(it.qty) > 1 ? ` × ${num(it.qty)}` : '');

  function renderSheet() {
    const rows = namedItems().map((it, i) => (
      `<tr><td>${i + 1}</td><td>${esc(it.cat)}</td><td>${esc(itemLabel(it))}</td></tr>`
    )).join('');

    $('sheet').innerHTML = `
      ${state.logo ? `<img class="logo" src="${state.logo}" alt="Company logo">` : ''}
      <h2>${esc(state.title || 'PC Build Quote')}</h2>
      <div class="info">
        <span>${state.customer ? 'Customer: ' + esc(state.customer) : ''}</span>
        <span>Date: ${esc(state.date)}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Category</th><th>Part</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total"><span>Total</span><span>${money(total())}</span></div>
      <div class="sign">Generated by RigPilot</div>`;
  }

  window.addEventListener('beforeprint', renderSheet);

  function openPreview() {
    if (!namedItems().length) { alert('Select or enter at least one part first.'); return; }
    renderSheet();
    $('preview').hidden = false;
    document.body.classList.add('modal-open');
    $('preview').querySelector('.modal-scroll').scrollTop = 0;
  }

  function closePreview() {
    $('preview').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function printPdf() {
    // The page title becomes the default file name in "Save as PDF"
    const old = document.title;
    document.title = (state.title || 'PC Build Quote') + ' ' + state.date;
    window.print();
    document.title = old;
  }

  // WhatsApp links can't attach files, so the quote is shared as a text message
  function shareWhatsApp() {
    const lines = [`*${state.title || 'PC Build Quote'}*`, `Date: ${state.date}`];
    if (state.customer) lines.push(`Customer: ${state.customer}`);
    lines.push('');
    namedItems().forEach((it) => lines.push(`${it.cat}: ${itemLabel(it)}`));
    lines.push('', `*Total: ${money(total())}*`);
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  }

  // ---------- Export / import ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const baseName = () => (state.title || 'rigpilot').replace(/[\\/:*?"<>|]/g, '_');

  function exportCsv() {
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [['Category', 'Part', 'Qty', 'Unit price', 'Subtotal', 'Notes'].map(q).join(',')];
    state.items.forEach((it) => {
      lines.push([it.cat, it.name, num(it.qty), num(it.price), num(it.qty) * num(it.price), it.note].map(q).join(','));
    });
    lines.push([q('Service fee'), '', '', '', num(state.fee), ''].join(','));
    lines.push([q('Total'), '', '', '', total(), ''].join(','));
    // BOM so Excel detects UTF-8
    download(baseName() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.items)) throw new Error('bad');
        state = Object.assign(blank(), data);
        state.items = data.items.map((it) => Object.assign(newItem('Other'), it, { id: uid() }));
        save();
        syncMeta();
        renderRows();
      } catch (e) {
        alert('Invalid file format. Could not import.');
      }
    };
    reader.readAsText(file);
  }

  function bindActions() {
    $('btn-logo').addEventListener('click', () => $('file-logo').click());
    $('file-logo').addEventListener('change', (e) => {
      if (e.target.files[0]) loadLogo(e.target.files[0]);
      e.target.value = '';
    });
    $('btn-logo-clear').addEventListener('click', () => {
      state.logo = '';
      save();
      syncLogo();
    });
    $('btn-pdf').addEventListener('click', openPreview);
    $('btn-print').addEventListener('click', printPdf);
    $('btn-wa').addEventListener('click', shareWhatsApp);
    $('btn-close').addEventListener('click', closePreview);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('preview').hidden) closePreview();
    });
    $('btn-csv').addEventListener('click', exportCsv);
    $('btn-json').addEventListener('click', () => download(baseName() + '.json', JSON.stringify(state, null, 2), 'application/json'));
    $('btn-import').addEventListener('click', () => $('file-import').click());
    $('file-import').addEventListener('change', (e) => {
      if (e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = '';
    });
    $('btn-clear').addEventListener('click', () => {
      if (!confirm('Reset the build to the default empty rows?')) return;
      const logo = state.logo; // the company logo survives a reset
      state = blank();
      state.logo = logo;
      save();
      syncMeta();
      renderRows();
    });
  }

  bindMeta();
  bindActions();
  syncMeta();
  renderRows();
})();
