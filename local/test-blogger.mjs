/**
 * test-blogger.js — uji headless blogger/weblog-ddk.html tanpa browser.
 *
 * Cara kerja: seluruh isi <style>/<script> diekstrak, markup diparse ringan,
 * lalu semua blok skrip dijalankan berurutan di vm Sandbox yang diberi shim
 * DOM minimal + localStorage + fetch (backend demo /api/* dari ddk-demo.js
 * dijalankan sungguhan). Setelah itu alur pengguna disimulasikan:
 *   1. login siswa   (2024001/siswa123)  -> pgSiswa tampil, progres dimuat
 *   2. login guru    (GURU001/guru123)   -> pgGuru tampil, rekap dimuat
 *   3. registrasi siswa baru           -> sukses, lalu login akun baru
 *   4. salah password                  -> pesan error tampil
 *
 *   node local/test-blogger.js
 */

'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const REPO_ROOT = path.join(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(REPO_ROOT, 'blogger', 'weblog-ddk.html'), 'utf8');

/* ---------------- util ---------------- */

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ✓ ' + name); }
  else { failures++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : null;
}

/* ---------------- parse HTML ringan ---------------- */

// Kumpulkan elemen: div/aside/main/nav/button/input/select/form/a/small/strong/td ...
const elements = []; // {id, tag, style, classes, parent, display}
const stack = [];
const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;
let m;
while ((m = tagRe.exec(html))) {
  const closing = m[1] === '/';
  const tag = m[2].toLowerCase();
  const attrs = m[3] || '';
  const selfClose = ['meta', 'link', 'br', 'hr', 'img', 'input', 'polyline', 'line', 'path', 'circle', 'rect', 'polygon'].includes(tag);
  if (closing) { stack.pop(); continue; }
  const el = {
    tag,
    id: attr(attrs, 'id'),
    classes: (attr(attrs, 'class') || '').split(/\s+/).filter(Boolean),
    style: attr(attrs, 'style') || '',
    parent: stack.length ? stack[stack.length - 1] : null,
    children: []
  };
  if (el.parent) {
    const p = elements.find(e => e.uid === el.parent);
    if (p) p.children.push(el);
  }
  el.uid = 'e' + elements.length;
  elements.push(el);
  if (!selfClose && !attrs.trimEnd().endsWith('/')) stack.push(el.uid);
}
// tutup tag yang tersisa (</body></html> tidak tertangkap karena sudah lewat regex... sebenarnya tertangkap)
const byId = {};
for (const el of elements) if (el.id && !(el.id in byId)) byId[el.id] = el;

// Elemen di luar #pgLogin/#pgSiswa/#pgGuru dianggap visible.
function parentHidden(el) {
  let cur = el;
  while (cur) {
    if (/display\s*:\s*none/.test(cur.style)) return true;
    cur = cur.parent ? elements.find(e => e.uid === cur.parent) : null;
  }
  return false;
}
function visible(id) {
  const el = byId[id];
  if (!el) return false;
  return !parentHidden(el);
}

/* ---------------- shim DOM ---------------- */

function makeEl(id, tag) {
  const real = byId[id];
  const el = {
    id, tagName: (tag || (real && real.tag) || 'div').toUpperCase(),
    style: {},
    classList: {
      _s: new Set(real ? real.classes : []),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    textContent: '',
    innerHTML: '',
    value: '',
    disabled: false,
    children: [],
    listeners: {},
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    querySelector(sel) { return matchInTree(el, sel); },
    querySelectorAll(sel) { return allInTree(el, sel); },
    getAttribute(n) { return (this['_attr_' + n] !== undefined) ? this['_attr_' + n] : null; },
    setAttribute(n, v) { this['_attr_' + n] = String(v); },
    focus() {}, click() { if (this.onclick) this.onclick({ preventDefault() {} }); },
    onclick: null,
    href: '',
    className: ''
  };
  // style dari markup (display:none dsb.)
  if (real && real.style) {
    real.style.split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i > 0) el.style[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    });
  }
  return el;
}

const els = {}; // cache elemen shim per id

const documentShim = {
  getElementById(id) {
    // Elemen yang dibuat dinamis lewat innerHTML tidak ada di parse statis —
    // buat otomatis agar perilakunya mendekati browser.
    if (!els[id]) els[id] = makeEl(id);
    return els[id];
  },
  createElement(tag) { return makeEl(null, tag); },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: makeEl(null, 'body')
};


function matchInTree(root, sel) { return allInTree(root, sel)[0] || null; }
function allInTree(root, sel) {
  const out = [];
  (function walk(node) {
    for (const c of (node.children || [])) {
      if (sel === '.sidebar-nav a' && c.tagName === 'A') out.push(c);
      walk(c);
    }
  })(root);
  return out;
}

/* ---------------- shim localStorage & window ---------------- */

function makeStorage() {
  const s = new Map();
  return {
    getItem: k => (s.has(k) ? s.get(k) : null),
    setItem: (k, v) => s.set(k, String(v)),
    removeItem: k => s.delete(k),
    clear: () => s.clear()
  };
}
const storage = makeStorage();

const timeouts = [];

/* ---------------- muat & jalankan blok skrip ---------------- */

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
console.log('Menjalankan ' + scripts.length + ' blok skrip...\n');

const sandbox = {
  console,
  document: documentShim,
  localStorage: storage,
  Response: global.Response,
  structuredClone: global.structuredClone,
  setTimeout: (fn, ms) => { timeouts.push(fn); return timeouts.length; },
  clearTimeout: () => {},
  Math, JSON, Date, Promise, parseInt, parseFloat, String, Number, Boolean, Array, Object, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent
};
sandbox.fetch = global.fetch;
// Di browser window === global; tiru agar override window.fetch dkk. bereffect.
sandbox.window = sandbox;
sandbox.location = { hash: '', href: 'https://ddk-demo.blogspot.com/p/weblog-ddk.html' };
sandbox.scrollTo = () => {};
sandbox.addEventListener = () => {};
vm.createContext(sandbox);

for (let i = 0; i < scripts.length; i++) {
  try {
    vm.runInContext(scripts[i], sandbox, { filename: 'blok-' + (i + 1) + '.js' });
  } catch (e) {
    console.log('  ✗ blok ' + (i + 1) + ' error saat eksekusi: ' + e.message);
    failures++;
  }
}
console.log('');

/* ---------------- pembantu simulasi ---------------- */

function flushMicrotasks() { return new Promise(r => setImmediate(r)); }
async function settle(rounds) {
  for (let i = 0; i < (rounds || 6); i++) {
    await flushMicrotasks();
    while (timeouts.length) { const t = timeouts.shift(); try { t(); } catch (e) {} }
    await flushMicrotasks();
  }
}
// HanyaFlush microtask (tanpa menjalankan setTimeout) — untuk memeriksa
// pesan sementara yang dihapus oleh timer (mis. pesan sukses registrasi).
async function microOnly(n) {
  for (let i = 0; i < (n || 4); i++) await flushMicrotasks();
}

function el(id) { return documentShim.getElementById(id); }
// showPage mengatur el.style.display langsung; tangkap lewat pembacaan shim
function currentPages() {
  const read = id => (els[id] ? els[id].style.display !== 'none' : null);
  return { login: read('pgLogin'), siswa: read('pgSiswa'), guru: read('pgGuru') };
}

function setVal(id, v) { el(id).value = v; }

async function doLogin(nis, pw) {
  setVal('nis', nis); setVal('pw', pw);
  el('btnLogin').disabled = false; el('btnLogin').textContent = 'Masuk';
  // doLogin memanggil ev.preventDefault(); sediakan event palsu
  sandbox.doLogin && sandbox.doLogin({ preventDefault() {} });
  await settle();
}

/* ================= UJI 1: state awal ================= */

console.log('— State awal —');
const initPages = currentPages();
check('halaman login tampil saat pertama dibuka', initPages.login === true, JSON.stringify(initPages));
check('dashboard siswa tersembunyi', initPages.siswa === false);
check('dashboard guru tersembunyi', initPages.guru === false);
check('backend demo aktif (window.DDK_STATIC_DEMO)', sandbox.window.DDK_STATIC_DEMO === true);
check('flag DDK_DEMO_ONLY aktif', sandbox.DDK_DEMO_ONLY === true);

/* ================= UJI 2: login siswa ================= */

console.log('\n— Login siswa (2024001/siswa123) —');
await doLogin('2024001', 'siswa123');
const afterSiswa = currentPages();
check('pindah ke dashboard siswa', afterSiswa.siswa === true && afterSiswa.login === false, JSON.stringify(afterSiswa));
check('sidebar menampilkan nama siswa', (els.sbUser && els.sbUser.textContent.indexOf('Siswa Contoh') !== -1), els.sbUser && els.sbUser.textContent);
check('dashboard dirender (tidak kosong)', !!sandbox.renderDashboard && (els.main ? els.main.innerHTML.length > 100 : false), 'panjang: ' + (els.main ? els.main.innerHTML.length : 'null'));
const lsUser = JSON.parse(storage.getItem('user') || 'null');
check('sesi tersimpan di localStorage', !!lsUser && lsUser.nis === '2024001');

// Masuk ke materi 1 (unlock) — tiru event hashchange seperti di browser.
console.log('\n— Navigasi materi —');
sandbox.location.hash = '#/materidetail/1';
await sandbox.route();
await settle();
check('materi 1 terbuka (banner terender)', els.main && els.main.innerHTML.indexOf('materi-banner') !== -1, els.main ? els.main.innerHTML.slice(0, 120) : 'main kosong');

/* ================= UJI 3: logout siswa ================= */

console.log('\n— Logout siswa —');
sandbox.doLogout && sandbox.doLogout();
await settle();
const afterLogout = currentPages();
check('kembali ke halaman login', afterLogout.login === true, JSON.stringify(afterLogout));
check('sesi dihapus dari localStorage', storage.getItem('user') === null);

/* ================= UJI 4: login guru ================= */

console.log('\n— Login guru (GURU001/guru123) —');
await doLogin('GURU001', 'guru123');
const afterGuru = currentPages();
check('pindah ke dashboard guru', afterGuru.guru === true && afterGuru.siswa === false, JSON.stringify(afterGuru));
check('rekap siswa dimuat', els.tbody && els.tbody.innerHTML.indexOf('Siswa Contoh') !== -1, els.tbody && els.tbody.innerHTML.slice(0, 120));
check('kartu statistik terisi', els.statBox && els.statBox.innerHTML.indexOf('stat-card') !== -1);
const guruSes = JSON.parse(storage.getItem('user') || 'null');
check('sesi guru tersimpan', !!guruSes && guruSes.role === 'guru');

/* ================= UJI 5: logout guru + validasi login salah ================= */

console.log('\n— Logout guru, lalu coba password salah —');
sandbox.guruLogout && sandbox.guruLogout();
await settle();
{
  const gateShown = els.gateLogin && els.gateLogin.style.display !== 'none';
  const appShown = els.guruApp && els.guruApp.style.display !== 'none';
  check('guru kembali ke gate login guru', gateShown && !appShown, JSON.stringify({ gateShown, appShown }));
}

await doLogin('2024001', 'passwordsalah');
const msgEl = el('msg');
check('pesan error tampil untuk password salah', msgEl && msgEl.textContent.indexOf('Password salah') !== -1, msgEl && msgEl.textContent);
check('login gagal tidak mengarahkan ke dashboard siswa', currentPages().siswa === false, JSON.stringify(currentPages()));

/* ================= UJI 6: registrasi siswa baru + login ================= */

console.log('\n— Registrasi siswa baru —');
setVal('rNis', '2024999'); setVal('rNama', 'Budi Uji Coba');
el('rKelas').value = 'X TITL 2';
setVal('rPw', 'rahasia123'); setVal('rPw2', 'rahasia123');
sandbox.doDaftar && sandbox.doDaftar({ preventDefault() {} });
await microOnly(); // jangan flush timer 900ms yang menutup pesan
check('registrasi sukses (pesan konfirmasi)', msgEl.textContent.indexOf('Registrasi berhasil') !== -1, msgEl.textContent);

await doLogin('2024999', 'rahasia123');
check('akun baru bisa login ke dashboard siswa', currentPages().siswa === true, JSON.stringify(currentPages()));

/* ================= ringkasan ================= */

console.log('\n========================================');
if (failures) { console.log('GAGAL: ' + failures + ' pemeriksaan tidak lolos'); process.exit(1); }
console.log('SEMUA PEMERIKSAAN LOLOS ✓');
