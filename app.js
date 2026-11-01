(() => {
  // Default build: one row per category, pre-filled with the common choice (GPU left empty)
  const DEFAULT_BUILD = [
    ['CPU + Mobo', 'Intel Core Ultra 5 225 + ASUS PRIME H810M-A'],
    ['GPU', ''],
    ['RAM', 'DDR5 8GB'],
    ['SSD', 'NVMe SSD 512GB'],
    ['PSU', '550W PSU'],
    ['Casing', 'Tempered Glass Side Panel Case'],
    ['WiFi & BT', 'WiFi & Bluetooth'],
    ['Gift', 'Keyboard, Mouse, Mouse Pad, Power Cord'],
  ];
  const CATS = DEFAULT_BUILD.map(([cat]) => cat);
  // Extra categories offered in "Add another row" (no presets, free-text names)
  const EXTRA_CATS = ['CPU', 'Mobo', 'Heatsink', 'Monitor', 'Fan'];

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
    'CPU + Mobo': plain(['Intel Core Ultra 5 225 + ASUS PRIME H810M-A', 'Intel Core Ultra 5 225 + ASUS PRIME B860M-AYW', 'Intel Core Ultra 5 225 + ASUS PRIME B860M-A']),
    GPU: plain(['ASUS Dual RTX 5050', 'ASUS Dual RTX 5060', 'ASUS Dual RTX 5060 Ti']),
    RAM: plain(['DDR4 8GB', 'DDR4 16GB', 'DDR5 8GB', 'DDR5 16GB']),
    Mobo: plain(['ASUS PRIME H810M-A', 'ASUS PRIME B860M-AYW', 'ASUS PRIME B860M-A']),
    PSU: plain(['550W PSU', 'Cooler Master MWE V3 750W 80+ Gold']),
    SSD: plain(['NVMe SSD 512GB', 'NVMe SSD 1TB', 'NVMe SSD 2TB']),
    Casing: plain(['Tempered Glass Side Panel Case']),
    'WiFi & BT': plain(['WiFi & Bluetooth']),
    Gift: plain(['Keyboard, Mouse, Mouse Pad, Power Cord']),
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
    savedId: '', // id of the saved build this one was loaded from / saved as
    items: DEFAULT_BUILD.map(([cat, name]) => newItem(cat, name)),
  });

  const sheetEdits = new Map(); // double-click text edits on the quotation, dropped when the build changes

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* storage may be unavailable (e.g. private mode) */ }
    return blank();
  }

  function save() {
    sheetEdits.clear();
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
  const fmt = (currency, n) => (CURRENCIES[currency] || '') + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => fmt(state.currency, n);

  // ---------- Calculations ----------
  function calcTotal(build) {
    const parts = build.items.reduce((s, it) => s + num(it.qty) * num(it.price), 0);
    return parts + num(build.fee);
  }
  const total = () => calcTotal(state);

  function renderTotals() {
    $('t-total').textContent = money(total());
    $('t-total-bar').textContent = money(total());
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
      <td class="cat"><span class="chip">${esc(it.cat)}</span></td>
      <td class="c-part">${partCell(it)}</td>
      <td class="num c-qty" data-label="Qty"><input data-f="qty" type="number" min="0" step="1" value="${esc(it.qty)}"></td>
      <td class="num c-price" data-label="Unit price"><input data-f="price" type="number" min="0" step="any" value="${esc(it.price)}"></td>
      <td class="sub c-sub" data-label="Subtotal"></td>
      <td class="c-note" data-label="Notes"><input data-f="note" value="${esc(it.note)}" placeholder="Link / notes"></td>
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

  // Downscale an uploaded image so it stays small enough for browser and GitHub storage
  function readImage(file, maxW, maxH, preferWebp) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('Please choose an image file.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.onload = () => {
          const w0 = img.naturalWidth || 300;
          const h0 = img.naturalHeight || 150;
          const scale = Math.min(1, maxW / w0, maxH / h0);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w0 * scale));
          canvas.height = Math.max(1, Math.round(h0 * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          let url = preferWebp ? canvas.toDataURL('image/webp', 0.88) : '';
          if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/png');
          resolve(url);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function loadImageInto(key, file, maxW, maxH, preferWebp) {
    try {
      state[key] = await readImage(file, maxW, maxH, preferWebp);
    } catch (e) {
      alert(e.message);
      return;
    }
    save();
    syncLogo();
    pushLogo();
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

  const VALID_DAYS = 14; // "Valid for N Days" line on the quotation
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const prettyDate = (iso) => {
    const [y, m, d] = String(iso || '').split('-');
    return m && MONTHS[+m - 1] ? `${d} ${MONTHS[+m - 1]} ${y}` : String(iso || '');
  };
  // Quotation amounts read "RM 2,495.00"
  const qmoney = (n) => money(n).replace(/^([^\d-]+)/, '$1 ');

  // Line icons, drawn in a 24x24 box
  const ICONS = {
    cpu: '<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M8 0V4M16 0V4M8 20V24M16 20V24M0 8H4M0 16H4M20 8H24M20 16H24"/>',
    mobo: '<rect x="2" y="2" width="20" height="20" rx="2"/><rect x="5" y="5" width="7" height="7" rx="1"/><path d="M15 5v7M18 5v7M5 16h6M5 19h6"/><rect x="14" y="15" width="5" height="4" rx="0.8"/>',
    ram: '<rect x="1" y="5" width="22" height="11" rx="1.5"/><path d="M4 16v3M8 16v3M12 16v3M16 16v3M20 16v3"/><rect x="4" y="8" width="4" height="5" rx="0.6"/><rect x="10" y="8" width="4" height="5" rx="0.6"/><rect x="16" y="8" width="4" height="5" rx="0.6"/>',
    ssd: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',
    bolt: '<path d="M13 1L4 16h8l-3 8 11-14h-8z"/>',
    case: '<rect x="4.5" y="0" width="15" height="24" rx="2"/><path d="M8.5 5h7v10h-7z"/><circle cx="12" cy="19.5" r="1"/>',
    gpu: '<rect x="3" y="4" width="20" height="12" rx="1.5"/><path d="M3 6H1v8h2"/><circle cx="9.5" cy="10" r="3"/><circle cx="17" cy="10" r="3"/><circle cx="9.5" cy="10" r="0.6"/><circle cx="17" cy="10" r="0.6"/><path d="M6 16v3h9v-3"/>',
    monitor: '<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 16v5"/>',
    fan: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4C12 6.5 14 4.3 16.8 4.8M13.6 12c3.9 0 6.1 2 5.6 4.8M12 13.6c0 3.9-2 6.1-4.8 5.6M10.4 12c-3.9 0-6.1-2-5.6-4.8"/>',
    heatsink: '<path d="M4 3v12M8 3v12M12 3v12M16 3v12M20 3v12"/><rect x="2" y="15" width="20" height="5" rx="1"/><path d="M6 20v2M18 20v2"/>',
    gift: '<rect x="2.6" y="8.5" width="19" height="5.7" rx="1.5"/><path d="M4.8 14.3v7.2h14.6v-7.2M12.1 8.5v13"/><path d="M12 8.5C7.7 8.5 6.3 7.5 6.3 5.2c0-1.7 1.3-2.3 2.5-1.9 1.5.5 2.4 2.6 3.2 5.2Zm0 0c4.3 0 5.7-1 5.7-3.3 0-1.7-1.3-2.3-2.5-1.9-1.5.5-2.4 2.6-3.2 5.2Z"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
    bluetooth: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
  };

  // The quotation shows the CPU tier only (e.g. "Ultra 5"), not the full model
  const cpuTitle = (name) => {
    const m = name.match(/Ultra\s*(\d)/i);
    return m ? `Ultra ${m[1]}` : name;
  };
  const tidy = (s) => s.replace(/\s+/g, ' ').trim();

  // Turn one part row into the text shown on its quotation card
  function cardOf(it) {
    const name = it.name.trim();
    let c;
    switch (it.cat) {
      case 'CPU':
        c = { eyebrow: 'PROCESSOR', title: cpuTitle(name), detail: 'Processor', icon: 'cpu' };
        break;
      case 'Mobo':
        c = { eyebrow: 'MOTHERBOARD', title: name, detail: 'Motherboard', icon: 'mobo' };
        break;
      case 'RAM': {
        const m = name.match(/(DDR\d)\s*(\d+\s*[GT]B)/i);
        c = { eyebrow: 'MEMORY', title: m ? m[2].replace(/\s/g, '') : name, detail: m ? `${m[1].toUpperCase()} RAM` : 'RAM', icon: 'ram' };
        break;
      }
      case 'SSD': {
        const m = name.match(/(\d+(?:\.\d+)?\s*[GT]B)/i);
        c = { eyebrow: 'STORAGE', title: m ? m[1].replace(/\s/g, '') : name, detail: m ? tidy(name.replace(m[0], '')) || 'SSD' : 'SSD', icon: 'ssd' };
        break;
      }
      case 'PSU': {
        const m = name.match(/(\d{3,4})\s*W\b/i);
        c = { eyebrow: 'POWER SUPPLY', title: m ? `${m[1]}W` : name, detail: m ? tidy(name.replace(m[0], '')) || 'PSU' : 'PSU', icon: 'bolt' };
        break;
      }
      case 'Casing':
        // The preset is split over two lines using exactly its own words: "Tempered Glass" / "Side Panel Case"
        c = name === 'Tempered Glass Side Panel Case'
          ? { eyebrow: 'CHASSIS', title: 'Tempered Glass', detail: 'Side Panel Case', icon: 'case' }
          : { eyebrow: 'CHASSIS', title: name, detail: 'Casing', icon: 'case' };
        break;
      case 'GPU': {
        const m = name.match(/RTX\s*\d{4}(?:\s*Ti)?/i);
        c = { eyebrow: 'GRAPHICS', title: m ? m[0] : name, detail: `${m ? tidy(name.replace(m[0], '')) : ''} Graphics Card`.trim(), icon: 'gpu' };
        break;
      }
      case 'Heatsink':
        c = { eyebrow: 'COOLING', title: name, detail: 'CPU Cooler', icon: 'heatsink' };
        break;
      case 'Fan':
        c = { eyebrow: 'COOLING', title: name, detail: 'Case Fan', icon: 'fan' };
        break;
      case 'Monitor':
        c = { eyebrow: 'DISPLAY', title: name, detail: 'Monitor', icon: 'monitor' };
        break;
      case 'Gift':
        c = { eyebrow: 'GIFT', icon: 'gift', wide: true, gifts: name.split(/[,\n]/).map((g) => g.trim()).filter(Boolean) };
        break;
      default:
        c = { eyebrow: it.cat.toUpperCase(), title: name, detail: '', icon: 'box' };
    }
    if (!c.cols && !c.gifts) c.cols = [{ title: c.title, detail: c.detail }];
    const qty = num(it.qty);
    if (qty > 1 && c.cols) c.cols[0].detail = tidy(`${c.cols[0].detail} × ${qty}`);
    return c;
  }

  // A "CPU + Mobo" row becomes two separate cards on the quotation: processor and motherboard
  function cardsOf(it) {
    if (it.cat === 'WiFi & BT') return [wirelessCard(it)];
    if (it.cat !== 'CPU + Mobo') return [cardOf(it)];
    const [cpu, ...rest] = it.name.trim().split(/\s+\+\s+/);
    const mobo = rest.join(' + ');
    return [cardOf({ ...it, cat: 'CPU', name: cpu }), ...(mobo ? [cardOf({ ...it, cat: 'Mobo', name: mobo })] : [])];
  }

  // Card heights shrink when there are many parts so everything stays on one A4 page
  const giftHeight = (c) => 103 + 30 * Math.ceil(c.gifts.length / 2);
  const WIRELESS_H = 80;

  function cardHeights(cards) {
    const GAP = 18;
    const AVAILABLE = 705; // page height minus header, total bar and margins, with slack so A4 never spills onto page 2
    const giftsH = cards.filter((c) => c.gifts || c.strip).reduce((sum, c) => sum + (c.gifts ? giftHeight(c) : WIRELESS_H) + GAP, 0);
    let wideRows = 0;
    let rows = 0;
    let pending = 0;
    cards.filter((c) => !c.gifts && !c.strip).forEach((c) => {
      if (c.wide) {
        if (pending) { rows += 1; pending = 0; }
        wideRows += 1;
      } else {
        pending += 1;
        if (pending === 2) { rows += 1; pending = 0; }
      }
    });
    if (pending) rows += 1;
    const totalRows = rows + wideRows;
    if (!totalRows) return { normal: 174, wide: 156 };
    const h = (AVAILABLE - giftsH - (totalRows - 1) * GAP) / (0.9 * wideRows + rows);
    // Never shorter than the card's content (badge row + title + detail); longer builds flow onto a second page
    const normal = Math.round(Math.min(174, Math.max(120, h)));
    return { normal, wide: Math.max(120, Math.round(normal * 0.9)) };
  }

  // ---------- Editable text on the quotation ----------
  // Double-clicking any text in the preview edits it. Edits live in memory until the build itself changes.
  const textOf = (key, fallback) => (sheetEdits.has(key) ? sheetEdits.get(key) : fallback);
  const et = (tag, cls, key, fallback, style) => `<${tag}${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''} data-ek="${key}">${esc(textOf(key, fallback))}</${tag}>`;

  const cardBody = (c, i) => `<div class="qcols">${c.cols.map((col, j) => {
    const key = `c${i}.t${j}`;
    return `<div class="qcol">
          ${et('div', `qtitle${textOf(key, col.title).length > 16 ? ' long' : ''}`, key, col.title)}
          ${col.detail ? et('div', 'qdetail', `c${i}.d${j}`, col.detail) : ''}
        </div>`;
  }).join('')}</div>`;

  // Small icons for the gift list, drawn in a 16x18 box (each nudged to sit on the text's centre line)
  const GIFT_ICONS = {
    keyboard: '<g transform="translate(0 1.7)"><rect x="0.8" y="2" width="13.2" height="10.5" rx="1.8"/><path d="M3.2 4.8h.1M6 4.8h.1M8.8 4.8h.1M11.5 4.8h.1M3.2 7.2h.1M6 7.2h.1M8.8 7.2h.1M11.5 7.2h.1M4 10h6.8"/></g>',
    mouse: '<g transform="translate(0 0.6)"><rect x="1.4" y="0.8" width="9.9" height="15.2" rx="5"/><path d="M6.4 3.2v4.1"/></g>',
    pad: '<g transform="translate(0 2)"><rect x="1" y="0.8" width="12.5" height="12.5" rx="2.3"/></g>',
    cord: '<g transform="translate(0 -0.7)"><path d="M4.1 1.5v4.4M9.2 1.5v4.4M2.2 6h8.9v3.5c0 2.4-1.9 4.1-4.5 4.1S2.2 11.9 2.2 9.5V6ZM6.6 13.6v4.3"/></g>',
    other: '<circle cx="7.5" cy="9" r="6"/><path d="M4.8 9.2l2 2 3.6-4"/>',
  };
  const giftKind = (name) => {
    const n = name.toLowerCase();
    if (n.includes('keyboard')) return 'keyboard';
    if (n.includes('pad')) return 'pad';
    if (n.includes('mouse')) return 'mouse';
    if (/cord|cable|plug|power/.test(n)) return 'cord';
    return 'other';
  };

  const giftHtml = (c) => `
      <div class="qgift">
        <div class="qg-head">
          <span class="qg-tile"><svg viewBox="0 0 25 25">${ICONS.gift}</svg></span>
          <div class="qg-text">${et('div', 'qg-title', 'g.title', 'COMPLIMENTARY GIFTS')}${et('div', 'qg-sub', 'g.sub', 'A little extra, on us.')}</div>
          ${et('span', 'qg-free', 'g.free', 'FREE')}
        </div>
        <div class="qg-rule"></div>
        <div class="qg-items">${c.gifts.map((g, k) => `<div class="qg-item"><svg viewBox="0 0 16 18">${GIFT_ICONS[giftKind(g)]}</svg>${et('span', '', `g.i${k}`, g)}</div>`).join('')}</div>
      </div>`;

  // Vector desktop set (monitor, tower, keyboard, mouse) for the name card; never a photo
  const PC_SET = `<svg viewBox="0 0 247 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Desktop computer set">
    <defs>
      <linearGradient id="pcScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6FAFF"/><stop offset="1" stop-color="#D9E5F3"/></linearGradient>
      <linearGradient id="pcTower" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#40566F"/><stop offset="1" stop-color="#29384B"/></linearGradient>
      <linearGradient id="pcBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F9FCFF"/><stop offset="1" stop-color="#D9E4EE"/></linearGradient>
      <clipPath id="pcScreenClip"><rect x="26" y="29" width="138" height="76" rx="4"/></clipPath>
    </defs>
    <circle cx="134" cy="69" r="80" fill="#E2EBF5" opacity="0.72"/>
    <g transform="translate(5 -4) scale(0.92)">
      <ellipse cx="116" cy="145" rx="103" ry="5" fill="#8399B2" opacity="0.13"/>
      <ellipse cx="200" cy="130" rx="41" ry="5" fill="#8399B2" opacity="0.16"/>
      <rect x="17" y="19" width="156" height="96" rx="9" fill="#B6C5D4" opacity="0.6"/>
      <rect x="16" y="16" width="156" height="96" rx="9" fill="#2B3B4F"/>
      <rect x="21" y="21" width="146" height="86" rx="5.5" fill="#435871"/>
      <rect x="26" y="29" width="138" height="76" rx="4" fill="url(#pcScreen)"/>
      <g clip-path="url(#pcScreenClip)">
        <rect x="26" y="29" width="138" height="11" fill="#E9F0F7"/>
        <circle cx="34" cy="34.6" r="2" fill="#F26822"/><circle cx="41" cy="34.6" r="2" fill="#B2C2D2"/><circle cx="48" cy="34.6" r="2" fill="#B2C2D2"/>
        <rect x="35" y="48" width="52" height="7" rx="2" fill="#6C829C" opacity="0.85"/>
        <rect x="35" y="61" width="62" height="4" rx="2" fill="#BAC9D8"/><rect x="35" y="70" width="54" height="4" rx="2" fill="#BAC9D8"/><rect x="35" y="79" width="43" height="4" rx="2" fill="#BAC9D8"/>
        <rect x="104" y="48" width="50" height="46" rx="5" fill="#FFFFFF" opacity="0.72"/>
        <path d="M113 81 L121 71 L128 76 L137 60 L145 65" fill="none" stroke="#F26822" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M113 87 H146" stroke="#D4DFE9" stroke-width="2" stroke-linecap="round"/>
        <rect x="36" y="93" width="58" height="4" rx="2" fill="#C8D6E3"/>
      </g>
      <circle cx="94" cy="110" r="1.6" fill="#A0B5CC"/>
      <path d="M87 112 L84 123 Q93 127 103 123 L100 112Z" fill="#607892"/>
      <path d="M77 123 H110 Q115 123 116 130 H71 Q72 123 77 123Z" fill="#425970"/>
      <path d="M76 128 H112" stroke="#829AB2" stroke-width="1.6" opacity="0.8"/>
      <rect x="184" y="22" width="59" height="106" rx="8" fill="#A9BBCA" opacity="0.33"/>
      <rect x="181" y="18" width="59" height="106" rx="8" fill="url(#pcTower)"/>
      <path d="M227 18 Q240 18 240 26 V116 Q240 124 231 124 H226Z" fill="#253448" opacity="0.55"/>
      <rect x="189" y="27" width="38" height="88" rx="4.5" fill="#33475E" stroke="#637A93" stroke-width="1"/>
      <circle cx="198" cy="38" r="3.1" fill="#F26822"/>
      <path d="M209 38 H220" stroke="#93A9BC" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M196 50 H221 M196 56 H221" stroke="#8197AA" stroke-width="1.5" stroke-linecap="round" opacity="0.78"/>
      <rect x="194" y="70" width="27" height="30" rx="3" fill="#26374B"/>
      <path d="M199 76 H216 M199 82 H216 M199 88 H216 M199 94 H216" stroke="#60758B" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="194" y="106" width="27" height="3" rx="1.5" fill="#7089A1"/>
      <path d="M17 130 L134 130 Q138 130 141 134 L150 145 Q151 148 146 148 H12 Q7 148 10 143 L14 133 Q15 130 17 130Z" fill="#C6D2E0"/>
      <path d="M17 127 H134 Q138 127 140 130 L148 141 Q149 144 145 144 H13 Q9 144 11 140 L14 130 Q15 127 17 127Z" fill="url(#pcBase)" stroke="#8198B0" stroke-width="1"/>
      <g fill="#8398AE" opacity="0.96">
        <rect x="22" y="132" width="11" height="3" rx="1"/><rect x="36" y="132" width="11" height="3" rx="1"/><rect x="50" y="132" width="11" height="3" rx="1"/><rect x="64" y="132" width="11" height="3" rx="1"/><rect x="78" y="132" width="11" height="3" rx="1"/><rect x="92" y="132" width="11" height="3" rx="1"/><rect x="106" y="132" width="11" height="3" rx="1"/><rect x="120" y="132" width="11" height="3" rx="1"/>
        <rect x="19" y="138" width="14" height="3" rx="1"/><rect x="36" y="138" width="11" height="3" rx="1"/><rect x="50" y="138" width="11" height="3" rx="1"/><rect x="64" y="138" width="38" height="3" rx="1"/><rect x="105" y="138" width="11" height="3" rx="1"/><rect x="119" y="138" width="17" height="3" rx="1"/>
      </g>
      <rect x="22" y="132" width="11" height="3" rx="1" fill="#F26822"/>
      <ellipse cx="170" cy="143" rx="13" ry="3" fill="#8399B2" opacity="0.22"/>
      <path d="M160 128 Q160 116 171 116 Q182 116 182 128 V136 Q182 143 171 143 Q160 143 160 136Z" fill="url(#pcBase)" stroke="#8198B0" stroke-width="1.2"/>
      <path d="M171 117 V129" stroke="#8DA1B5" stroke-width="1.5"/>
      <rect x="169.5" y="121" width="3" height="5" rx="1.5" fill="#F26822"/>
    </g>
  </svg>`;

  // "Modern Computing · RTX 5060 · DDR4 · SATA SSD": only claims what the chosen parts really are
  function specLine() {
    const named = (cat) => state.items.find((it) => it.cat === cat && it.name.trim());
    const parts = ['Modern Computing'];
    const gpu = named('GPU');
    const gpuMatch = gpu && gpu.name.match(/RTX\s*\d{4}(?:\s*Ti)?/i);
    if (gpuMatch) parts.push(gpuMatch[0].toUpperCase().replace('TI', 'Ti'));
    const ram = named('RAM');
    const ramMatch = ram && ram.name.match(/DDR\d/i); // DDR5 only when it is DDR5, DDR4 when it is DDR4
    if (ramMatch) parts.push(ramMatch[0].toUpperCase());
    const ssd = named('SSD');
    if (ssd) {
      if (/nvme/i.test(ssd.name)) parts.push('NVMe SSD');
      else if (/sata/i.test(ssd.name)) parts.push('SATA SSD');
      else parts.push('SSD');
    }
    return parts.join(' · ');
  }

  // "WiFi 6E & Bluetooth 5.3" typed on the main page becomes "WiFi 6E + Bluetooth 5.3"; only what is typed gets claimed
  function wirelessCard(it) {
    const name = it.name.trim();
    const wifi = name.match(/Wi-?Fi(?:\s*\d+E?)?/i);
    const bt = name.match(/Bluetooth(?:\s*\d+(?:\.\d+)?)?|\bBT\b(?:\s*\d+(?:\.\d+)?)?/i);
    const parts = [];
    if (wifi) parts.push(wifi[0].replace(/wi-?fi/i, 'WiFi'));
    if (bt) parts.push(bt[0].replace(/^bt\b/i, 'Bluetooth'));
    return {
      strip: true,
      eyebrow: 'WIRELESS CONNECTIVITY',
      title: parts.length ? parts.join(' + ') : name,
      icons: parts.length ? [wifi && 'wifi', bt && 'bluetooth'].filter(Boolean) : ['wifi'],
    };
  }

  // Full-width card so customers see straight away that the PC has WiFi / Bluetooth
  const wirelessHtml = (c, i) => `
      <div class="qwireless">
        <div class="qw-main">
          <span class="qbadge"><svg viewBox="0 0 24 24">${ICONS[c.icons[0]]}</svg></span>
          <div class="qw-text">${et('span', 'qeyebrow', `w${i}.e`, c.eyebrow)}${et('div', 'qw-title', `w${i}.t`, c.title)}</div>
        </div>
        <div class="qw-icons">${c.icons.map((k) => `<span><svg viewBox="0 0 24 24">${ICONS[k]}</svg></span>`).join('')}</div>
      </div>`;

  function sysCard() {
    return `<div class="q-sys">
        <div class="q-sys-text">
          <div class="q-sys-eyebrow"><svg viewBox="0 0 24 24">${ICONS.monitor}</svg>${et('span', '', 's.eyebrow', 'DESKTOP SYSTEM')}</div>
          ${et('div', 'q-sys-title', 's.title', state.title || 'PC Quotation')}
          ${et('div', 'q-sys-sub', 's.sub', specLine())}
          <div class="q-sys-bars"><i></i><i></i></div>
        </div>
        <div class="q-sys-art">${PC_SET}</div>
      </div>`;
  }

  function renderSheet() {
    const all = namedItems().flatMap(cardsOf);
    const cards = all.filter((c) => !c.gifts && !c.strip).concat(all.filter((c) => c.strip), all.filter((c) => c.gifts)); // WiFi strip, then gifts, always last
    const heights = cardHeights(cards);
    const cardsHtml = cards.map((c, i) => c.gifts ? giftHtml(c) : c.strip ? wirelessHtml(c, i) : `
      <div class="qcard${c.wide ? ' wide' : ''}" style="height:${c.wide ? heights.wide : heights.normal}px">
        <div class="qhead"><span class="qbadge"><svg viewBox="0 0 24 24">${ICONS[c.icon]}</svg></span>${et('span', 'qeyebrow', `c${i}.e`, c.eyebrow)}</div>
        ${cardBody(c, i)}
      </div>`).join('');

    $('sheet').innerHTML = `
      <div class="q-top">
        ${state.logo ? `<div class="q-brand"><img class="q-logo" src="${state.logo}" alt="Company logo"></div>` : ''}
        <div class="q-head">
          ${et('div', 'q-title', 'h.quote', 'QUOTATION')}
          ${et('div', 'q-meta', 'h.date', `Date: ${prettyDate(state.date)}`, 'top:44px')}
          ${et('div', 'q-meta', 'h.valid', `Valid for ${VALID_DAYS} Days`, 'top:70px')}
        </div>
        <div class="q-rule"></div>
        ${sysCard()}
      </div>
      <div class="q-cards">${cardsHtml}</div>
      <div class="qtotal">${et('span', '', 't.label', 'Total')}${et('span', '', 't.amount', qmoney(total()))}</div>`;
  }

  window.addEventListener('beforeprint', renderSheet);

  // Shrink the A4 page so the whole quotation fits inside the preview without scrolling
  function fitPaper() {
    const scroller = $('preview').querySelector('.modal-scroll');
    const paper = $('paper');
    paper.style.transform = '';
    const pageH = Math.min(paper.offsetHeight, 1120);
    const scale = Math.min(1, (scroller.clientWidth - 24) / 794, (scroller.clientHeight - 40) / pageH);
    paper.style.transform = scale < 1 ? `scale(${scale})` : '';
    $('paper-wrap').style.width = `${794 * scale}px`;
    $('paper-wrap').style.height = `${paper.offsetHeight * scale}px`;
  }

  window.addEventListener('resize', () => { if (!$('preview').hidden) fitPaper(); });

  // ---------- Quotation as a JPG (for WhatsApp) ----------
  const H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const H2C_SRI = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
  let h2cLoading = null;

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    if (!h2cLoading) {
      h2cLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = H2C_URL;
        s.integrity = H2C_SRI;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = resolve;
        s.onerror = () => { h2cLoading = null; reject(new Error('Could not load the image library. Check your connection.')); };
        document.head.appendChild(s);
      });
    }
    return h2cLoading;
  }

  async function renderQuoteJpeg() {
    await loadHtml2Canvas();
    await document.fonts.ready;
    // Draw an unscaled, hidden copy so the preview's zoom doesn't affect the picture
    const box = document.createElement('div');
    box.className = 'paper capture';
    const copy = $('sheet').cloneNode(true);
    copy.removeAttribute('id');
    box.appendChild(copy);
    document.body.appendChild(box);
    try {
      const canvas = await window.html2canvas(box, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (doc) => { const el = doc.querySelector('.paper.capture'); if (el) el.style.clipPath = 'none'; },
      });
      return await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/jpeg', 0.92);
      });
    } finally {
      box.remove();
    }
  }

  // The image is prepared in the background so Share can open instantly (phones need it within the tap)
  let jpegJob = null;
  let jpegTimer = null;
  const prepareJpeg = () => { jpegJob = renderQuoteJpeg(); jpegJob.catch(() => {}); return jpegJob; };
  const scheduleJpeg = () => { jpegJob = null; clearTimeout(jpegTimer); jpegTimer = setTimeout(prepareJpeg, 600); };

  // ---------- Double-click to edit ----------
  function startEdit(el) {
    const key = el.dataset.ek;
    const before = el.textContent;
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.classList.add('editing');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = (commit) => {
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKey);
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (commit && text && text !== before) sheetEdits.set(key, text);
      renderSheet(); // re-draw so styles that depend on the text (e.g. long titles) update
      fitPaper();
      scheduleJpeg();
    };
    const onBlur = () => finish(true);
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    };
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKey);
  }

  // On touch screens a single tap edits text; with a mouse it is a double-click (or switch "Edit text" on)
  let editMode = window.matchMedia('(pointer: coarse)').matches;
  function syncEditMode() {
    $('preview').classList.toggle('edit-on', editMode);
    $('btn-edit').classList.toggle('on', editMode);
    $('btn-edit').setAttribute('aria-pressed', String(editMode));
    $('preview-msg').textContent = editMode ? 'Tap any text to edit it' : 'Double-click any text to edit it';
  }

  function openPreview() {
    if (!namedItems().length) { alert('Select or enter at least one part first.'); return; }
    renderSheet();
    $('preview').hidden = false;
    document.body.classList.add('modal-open');
    syncEditMode();
    fitPaper();
    $('preview').querySelector('.modal-scroll').scrollTop = 0;
    scheduleJpeg();
  }

  function closePreview() {
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    $('preview').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function printPdf() {
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    // The page title becomes the default file name in "Save as PDF"
    const old = document.title;
    document.title = (state.title || 'PC Quotation') + ' ' + state.date;
    window.print();
    document.title = old;
  }

  // Share the quotation as a JPG. Phones and some desktops open the share sheet with the picture attached;
  // elsewhere the JPG is downloaded so it can be attached in WhatsApp.
  async function shareWhatsApp() {
    const btn = $('btn-wa');
    if (btn.disabled) return;
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing image…';
    try {
      const blob = await (jpegJob || prepareJpeg());
      const name = `${baseName()}-quotation.jpg`;
      const file = new File([blob], name, { type: 'image/jpeg' });
      const title = state.title || 'PC Quotation';
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: `${title} - ${qmoney(total())}` });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      downloadBlob(name, blob);
      $('preview-msg').innerHTML = 'Image saved to your downloads. <a href="https://wa.me/" target="_blank" rel="noopener">Open WhatsApp</a> and attach it.';
    } catch (e) {
      alert(e.message || 'Could not create the image.');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  // ---------- Export / import ----------
  function download(name, text, type) {
    downloadBlob(name, new Blob([text], { type }));
  }

  function downloadBlob(name, blob) {
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

  // Replace the current build; the current company logo is kept unless the data carries its own
  function applyBuild(data, savedId = '') {
    const logo = state.logo;
    state = Object.assign(blank(), data, { logo: data.logo || logo, savedId });
    state.items = data.items.map((it) => Object.assign(newItem('Other'), it, { id: uid() }));
    save();
    syncMeta();
    renderRows();
    renderHistory();
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && Array.isArray(data.records)) { restoreBackup(data.records); return; }
        if (!data || !Array.isArray(data.items)) throw new Error('bad');
        applyBuild(data);
      } catch (e) {
        alert('Invalid file format. Could not import.');
      }
    };
    reader.readAsText(file);
  }

  // ---------- GitHub storage (private data repo) ----------
  // Saved builds live in history.json and the logo in logo.json, committed through the GitHub contents API.
  const GH_API = 'https://api.github.com';
  const SYNC_KEY = 'rigpilot.sync';
  const DEFAULT_REPO = 'seanTcw-dev/rigpilot-data';

  function loadSync() {
    for (const store of [localStorage, sessionStorage]) {
      try {
        const raw = store.getItem(SYNC_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
    }
    return { repo: DEFAULT_REPO, token: '', remember: true };
  }

  function saveSync() {
    try {
      localStorage.removeItem(SYNC_KEY);
      sessionStorage.removeItem(SYNC_KEY);
      if (sync.token) (sync.remember ? localStorage : sessionStorage).setItem(SYNC_KEY, JSON.stringify(sync));
    } catch (e) { /* ignore */ }
  }

  let sync = loadSync();
  const isCloud = () => !!sync.token;

  const b64enc = (text) => {
    let bin = '';
    new TextEncoder().encode(text).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  const b64dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  function ghError(res) {
    const msg = {
      401: 'GitHub rejected the token (wrong or expired). Create a new token and reconnect.',
      403: 'GitHub refused the request. The token needs Contents: Read and write on the data repository.',
      404: 'Data repository not found, or the token has no access to it.',
    }[res.status] || `GitHub error ${res.status}.`;
    return new Error(msg);
  }

  async function ghFetch(url, opts = {}) {
    try {
      return await fetch(GH_API + url, {
        cache: 'no-store',
        ...opts,
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${sync.token}`, ...(opts.headers || {}) },
      });
    } catch (e) {
      throw new Error('Could not reach GitHub. Check your internet connection.');
    }
  }

  async function remoteRead(path, fallback) {
    const res = await ghFetch(`/repos/${sync.repo}/contents/${path}`);
    if (res.status === 404) return { data: fallback, sha: undefined };
    if (!res.ok) throw ghError(res);
    const file = await res.json();
    if (!file.content) throw new Error(`${path} is too large to load from GitHub.`);
    return { data: JSON.parse(b64dec(file.content)), sha: file.sha };
  }

  // Read the latest file, apply fn to it, commit. Retried on conflict so edits from another device aren't lost.
  async function remoteMutate(path, fallback, fn, message) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, sha } = await remoteRead(path, fallback);
      const next = fn(data);
      const res = await ghFetch(`/repos/${sync.repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ message, content: b64enc(JSON.stringify(next)), sha }),
      });
      if (res.ok) return next;
      if (res.status !== 409 && res.status !== 422) throw ghError(res);
    }
    throw new Error('GitHub kept reporting a conflict. Please try again.');
  }

  function setSyncStatus(text, kind = '') {
    $('sync-status').textContent = text;
    $('sync-status').className = 'sync-status ' + kind;
  }

  function renderSyncUI() {
    $('sync-repo').value = sync.repo;
    $('sync-remember').checked = sync.remember !== false;
    const on = isCloud();
    $('sync-repo').disabled = on;
    $('sync-token-label').hidden = on;
    $('sync-remember-label').hidden = on;
    $('btn-connect').hidden = on;
    $('btn-disconnect').hidden = !on;
    if (!on) setSyncStatus('Not connected: data stays in this browser');
  }

  // ---------- Saved builds (history) ----------
  const HISTORY_KEY = 'rigpilot.history.v1'; // browser-only storage, used when GitHub isn't connected
  const KEEP_YEARS = 3; // saved builds older than this are removed automatically; 0 keeps them forever
  const KEEP_MS = KEEP_YEARS * 365.25 * 24 * 3600 * 1000;
  const isFresh = (r) => !KEEP_YEARS || !(Date.now() - Date.parse(r.savedAt) > KEEP_MS);
  const isRecord = (r) => r && r.id && r.build && Array.isArray(r.build.items) && !Number.isNaN(Date.parse(r.savedAt));

  let history = isCloud() ? [] : loadHistory();
  let busy = false;

  function loadHistory() {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(list)) return [];
      const fresh = list.filter(isFresh);
      if (fresh.length !== list.length) writeHistory(fresh); // persist the auto-removal
      return fresh;
    } catch (e) { return []; }
  }

  function writeHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) {
      throw new Error('Could not save: browser storage is full or blocked.');
    }
  }

  const historyMsg = (text) => { $('hist-msg').textContent = text; };

  function mergeRecords(list, records) {
    const byId = new Map(list.map((r) => [r.id, r]));
    records.forEach((r) => {
      const old = byId.get(r.id);
      if (!old || Date.parse(r.savedAt) > Date.parse(old.savedAt)) {
        byId.set(r.id, { id: String(r.id), savedAt: r.savedAt, total: num(r.total), build: r.build });
      }
    });
    return [...byId.values()];
  }

  // Apply a change to the saved builds, in GitHub when connected, otherwise in this browser
  async function changeHistory(fn, message) {
    if (isCloud()) return remoteMutate('history.json', [], (cur) => fn(Array.isArray(cur) ? cur : []), message);
    const next = fn(history.slice());
    writeHistory(next);
    return next;
  }

  async function runHistory(op, okMsg, after) {
    if (busy) return;
    busy = true;
    historyMsg(isCloud() ? 'Saving to GitHub…' : '');
    try {
      history = await op();
      if (after) after();
      renderHistory();
      historyMsg(okMsg);
    } catch (e) {
      historyMsg('');
      alert(e.message || 'Something went wrong.');
    } finally {
      busy = false;
    }
  }

  const snapshot = () => ({
    title: state.title,
    customer: state.customer,
    date: state.date,
    currency: state.currency,
    fee: state.fee,
    items: state.items.map(({ cat, name, qty, price, note }) => ({ cat, name, qty, price, note })),
  });

  function saveBuild(asNew) {
    const linked = !asNew && history.some((r) => r.id === state.savedId);
    const record = { id: linked ? state.savedId : uid() + uid(), savedAt: new Date().toISOString(), total: total(), build: snapshot() };
    runHistory(
      () => changeHistory((list) => {
        const i = list.findIndex((r) => r.id === record.id);
        if (i >= 0) list[i] = record; else list.push(record);
        return list;
      }, `Save build: ${record.build.title || 'Untitled'}`),
      linked ? 'Saved build updated.' : 'Build saved.',
      () => { state.savedId = record.id; save(); },
    );
  }

  function loadBuild(id) {
    const r = history.find((x) => x.id === id);
    if (!r || !confirm(`Load "${r.build.title || 'Untitled'}"? Your current edits will be replaced.`)) return;
    applyBuild(r.build, r.id);
    historyMsg('Build loaded.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteBuild(id) {
    const r = history.find((x) => x.id === id);
    if (!r || !confirm(`Delete "${r.build.title || 'Untitled'}" from saved builds?`)) return;
    runHistory(
      () => changeHistory((list) => list.filter((x) => x.id !== id), 'Delete build'),
      'Build deleted.',
      () => { if (state.savedId === id) { state.savedId = ''; save(); } },
    );
  }

  function renderHistory() {
    const q = $('hist-search').value.trim().toLowerCase();
    const rows = history
      .filter((r) => !q || [r.build.title, r.build.customer, r.build.date].join(' ').toLowerCase().includes(q))
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
    $('history').querySelector('tbody').innerHTML = rows.map((r) => `<tr data-id="${esc(r.id)}"${r.id === state.savedId ? ' class="current"' : ''}>
      <td>${esc(r.build.date)}</td>
      <td>${esc(r.build.title || 'Untitled')}</td>
      <td>${esc(r.build.customer)}</td>
      <td class="num">${fmt(r.build.currency, num(r.total))}</td>
      <td><div class="row-actions"><button data-act="load">Load</button><button data-act="delete" class="danger">Delete</button></div></td>
    </tr>`).join('');
    $('hist-empty').classList.toggle('hidden', history.length > 0);
    const linked = history.some((r) => r.id === state.savedId);
    $('btn-save').textContent = linked ? 'Update saved build' : 'Save this build';
    $('btn-save-new').hidden = !linked;
    $('hist-hint').textContent = (isCloud()
      ? `Saved builds are stored in your GitHub repository ${sync.repo}`
      : 'Saved builds stay in this browser only')
      + (KEEP_YEARS ? ` and are removed automatically after ${KEEP_YEARS} years.` : '.')
      + ' "Backup all" downloads a copy you can restore anywhere.';
  }

  function backupAll() {
    download('rigpilot-backup-' + today() + '.json', JSON.stringify({ rigpilot: 'history', records: history }, null, 2), 'application/json');
  }

  function restoreBackup(records) {
    const valid = records.filter(isRecord).filter(isFresh);
    const added = valid.filter((r) => !history.some((h) => h.id === r.id)).length;
    runHistory(
      () => changeHistory((list) => mergeRecords(list, valid), 'Restore backup'),
      `Backup restored: ${added} new build(s).`,
    );
  }

  // Pull saved builds and the logo from GitHub (or the browser when not connected)
  async function refreshStorage() {
    if (!isCloud()) {
      history = loadHistory();
      renderHistory();
      return;
    }
    setSyncStatus('Syncing…');
    try {
      const [h, l] = await Promise.all([remoteRead('history.json', []), remoteRead('logo.json', { logo: '' })]);
      let list = Array.isArray(h.data) ? h.data : [];
      if (!list.every(isFresh)) {
        list = await remoteMutate('history.json', [], (cur) => cur.filter(isFresh), `Remove builds older than ${KEEP_YEARS} years`);
      }
      history = list;
      if (l.data.logo) { state.logo = l.data.logo; save(); syncLogo(); }
      setSyncStatus('Connected to ' + sync.repo, 'ok');
    } catch (e) {
      history = [];
      setSyncStatus(e.message, 'err');
    }
    renderHistory();
  }

  async function pushLogo() {
    if (!isCloud()) return;
    try {
      await remoteMutate('logo.json', { logo: '' }, () => ({ logo: state.logo }), 'Update logo');
    } catch (e) {
      alert('The logo was kept on this device only: ' + e.message);
    }
  }

  async function connect() {
    const repo = $('sync-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    const token = $('sync-token').value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) { alert('Enter the repository as owner/name and paste the access token.'); return; }
    const previous = sync;
    sync = { repo, token, remember: $('sync-remember').checked };
    setSyncStatus('Connecting…');
    try {
      const res = await ghFetch(`/repos/${repo}`);
      if (!res.ok) throw ghError(res);
      const info = await res.json();
      if (!info.private && !confirm(`"${repo}" is a PUBLIC repository: anyone could read your saved builds and customer names. Use a private repository instead.\n\nContinue anyway?`)) {
        sync = previous;
        renderSyncUI();
        return;
      }
      // A real write doubles as the permission check
      await remoteMutate('history.json', [], (cur) => (Array.isArray(cur) ? cur : []), 'Connect RigPilot');
      const local = loadHistory();
      if (local.length) {
        await remoteMutate('history.json', [], (cur) => mergeRecords(cur, local), 'Import builds from this browser');
        localStorage.removeItem(HISTORY_KEY);
      }
      const logo = await remoteRead('logo.json', { logo: '' });
      if (!logo.data.logo && state.logo) await pushLogo();
      saveSync();
      $('sync-token').value = '';
      renderSyncUI();
      await refreshStorage();
      historyMsg('Connected. Saved builds now live in GitHub.');
    } catch (e) {
      sync = previous;
      renderSyncUI();
      setSyncStatus(e.message, 'err');
      alert(e.message);
    }
  }

  function disconnect() {
    if (!confirm('Disconnect from GitHub? Your saved builds stay in the repository; this browser will stop using them.')) return;
    sync = { repo: sync.repo, token: '', remember: true };
    saveSync();
    renderSyncUI();
    refreshStorage();
  }

  function bindActions() {
    $('btn-logo').addEventListener('click', () => $('file-logo').click());
    $('file-logo').addEventListener('change', (e) => {
      if (e.target.files[0]) loadImageInto('logo', e.target.files[0], 480, 240, false);
      e.target.value = '';
    });
    $('btn-logo-clear').addEventListener('click', () => {
      state.logo = '';
      save();
      syncLogo();
      pushLogo();
    });
    $('btn-save').addEventListener('click', () => saveBuild(false));
    $('btn-save-new').addEventListener('click', () => saveBuild(true));
    $('btn-backup').addEventListener('click', backupAll);
    $('btn-restore').addEventListener('click', () => $('file-import').click());
    $('hist-search').addEventListener('input', renderHistory);
    $('history').querySelector('tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('tr').dataset.id;
      if (btn.dataset.act === 'load') loadBuild(id); else deleteBuild(id);
    });
    $('btn-connect').addEventListener('click', connect);
    $('btn-disconnect').addEventListener('click', disconnect);
    $('btn-pdf').addEventListener('click', openPreview);
    $('btn-pdf-sum').addEventListener('click', openPreview);

    // "More" menu closes after a choice, on outside click and on Escape
    const menu = $('more-menu');
    menu.addEventListener('click', (e) => { if (e.target.closest('.menu-list button')) menu.open = false; });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
    $('btn-print').addEventListener('click', printPdf);
    $('btn-wa').addEventListener('click', shareWhatsApp);
    $('btn-close').addEventListener('click', closePreview);
    // Clicking the dimmed area around the page goes back to the main page
    $('preview').addEventListener('click', (e) => { if (!e.target.closest('.paper-wrap, .modal-bar')) closePreview(); });
    $('sheet').addEventListener('dblclick', (e) => {
      const el = e.target.closest('[data-ek]');
      if (el && !el.isContentEditable) startEdit(el);
    });
    $('sheet').addEventListener('click', (e) => {
      const el = editMode && e.target.closest('[data-ek]');
      if (el && !el.isContentEditable) startEdit(el);
    });
    $('btn-edit').addEventListener('click', () => { editMode = !editMode; syncEditMode(); });
    $('btn-pdf-bar').addEventListener('click', openPreview);
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
      const { logo } = state; // the company logo survives a reset
      state = blank();
      state.logo = logo;
      save();
      syncMeta();
      renderRows();
      renderHistory();
    });
  }

  bindMeta();
  bindActions();
  syncMeta();
  renderRows();
  renderSyncUI();
  refreshStorage();
})();
