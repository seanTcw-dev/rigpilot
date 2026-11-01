(() => {
  // Default build: one row per category, pre-filled with the common choice (GPU left empty)
  const DEFAULT_BUILD = [
    ['CPU + Mobo', 'Intel Core Ultra 5 225 + H810M-A'],
    ['GPU', ''],
    ['RAM', 'DDR5 8GB'],
    ['PSU', '550W PSU'],
    ['SSD', 'NVMe SSD 512GB'],
    ['Casing', 'Side Tempered Glass Casing'],
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
    'CPU + Mobo': plain(['Intel Core Ultra 5 225 + H810M-A', 'Intel Core Ultra 5 225 + B860M-AYW', 'Intel Core Ultra 5 225 + B860M-A']),
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
    savedId: '', // id of the saved build this one was loaded from / saved as
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
        pushLogo();
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
      await remoteMutate('logo.json', { logo: '' }, () => ({ logo: state.logo }), state.logo ? 'Update logo' : 'Remove logo');
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
      if (e.target.files[0]) loadLogo(e.target.files[0]);
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
