/**
 * build-blogger.js — menghasilkan VERSI SATU FILE untuk Blogger.
 *
 *   node local/build-blogger.js
 *
 * Hasil: blogger/weblog-ddk.html — satu berkas HTML mandiri yang berisi:
 *   - halaman login/daftar (index.html)
 *   - dashboard siswa (dashboard/index.html)
 *   - dashboard guru (guru/index.html)
 *   - backend tiruan ddk-demo.js (di-inline, tanpa <script src>)
 *
 * Perubahan yang dilakukan supaya ketiganya bisa hidup berdampingan:
 *   1. CSS ketiga halaman digabung, duplikat dibuang.
 *   2. Ketiga markup dibungkus <div id="pgLogin|pgSiswa|pgGuru"> dan
 *      ditampilkan/disembunyikan oleh router kecil showPage().
 *   3. Navigasi location.href antar-folder diganti showPage('...').
 *   4. init() siswa & boot IIFE guru tidak dijalankan saat parse,
 *      tetapi dipicu router saat halamannya dibuka.
 *   5. ID ganda antar halaman diubah (sidebar → sidebarGuru, main → mainGuru).
 *   6. Flag DDK_DEMO_ONLY=true (default) membuat panggilan langsung ke
 *      Apps Script /exec dialihkan ke backend demo /api/* di dalam berkas,
 *      sehingga satu file ini jalan offline di Blogger. Set false untuk
 *      memakai Apps Script asli.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'blogger');
const OUT_FILE = path.join(OUT_DIR, 'weblog-ddk.html');

function read(p) { return fs.readFileSync(path.join(REPO_ROOT, p), 'utf8'); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

function between(html, start, end, label) {
  const i = html.indexOf(start);
  must(i >= 0, '[' + label + '] penanda awal tidak ditemukan: ' + start);
  const j = html.indexOf(end, i + start.length);
  must(j >= 0, '[' + label + '] penanda akhir tidak ditemukan: ' + end);
  return html.slice(i + start.length, j).trim();
}

function lastScript(html, label) {
  const i = html.lastIndexOf('<script>');
  const j = html.lastIndexOf('</script>');
  must(i >= 0 && j > i, '[' + label + '] blok <script> terakhir tidak ditemukan');
  return html.slice(i + 8, j).trim() + '\n';
}

function extractStyles(html, label) {
  const out = [];
  const re = /<style>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  must(out.length, '[' + label + '] tidak ada blok <style>');
  return out;
}

const loginHtml = read('index.html');
const dashHtml = read('dashboard/index.html');
const guruHtml = read('guru/index.html');
const demoJs = read('ddk-demo.js');

must(demoJs.indexOf('</script') === -1, "ddk-demo.js mengandung '</script' — tidak aman di-inline");

/* ---------- 1. CSS: gabung semua blok, buang duplikat ---------- */

const cssParts = [];
const cssSeen = new Set();
for (const [label, html] of [['login', loginHtml], ['siswa', dashHtml], ['guru', guruHtml]]) {
  for (const css of extractStyles(html, label)) {
    const key = css.replace(/\s+/g, ' ');
    if (cssSeen.has(key)) continue;
    cssSeen.add(key);
    cssParts.push(css);
  }
}

/* ---------- 2. Markup body tiap halaman ---------- */

const loginBody = between(loginHtml, '<body>', '<div id="toast"', 'login');
const dashBody = between(dashHtml, '<body>', '<div id="toast"', 'siswa');
const guruBody = between(guruHtml, '<body>', '<div id="toast"', 'guru');

/* ---------- 3. Skrip tiap halaman + adaptasi single-file ---------- */

const loginScript = lastScript(loginHtml, 'login');
const siswaScript = lastScript(dashHtml, 'siswa');
const guruScript = lastScript(guruHtml, 'guru');

// Login: navigasi antar-folder -> showPage; auto-restore pindah ke router.
const L = loginScript
  .replace(/\/\/ Auto-restore session[\s\S]*?\}\)\(\);/,
    '/* Auto-restore session dipindah ke router di bawah (versi satu file). */')
  .replace("if(role==='guru' || role==='admin') location.href = 'guru/';",
    "if(role==='guru' || role==='admin') showPage('guru');")
  .replace("else location.href = 'dashboard/';",
    "else showPage('siswa');");
must(L.indexOf("showPage('siswa')") !== -1, 'login: penggantian navigasi gagal');

// Siswa: logout & guard init -> showPage; init() dipicu router.
const S = siswaScript
  .replace("var finish = function(){ localStorage.removeItem('user'); localStorage.removeItem('nis'); location.href='../'; };",
    "var finish = function(){ localStorage.removeItem('user'); localStorage.removeItem('nis'); showPage('login'); };")
  .replace("if(!user || !user.nis){ location.href='../'; return; }",
    "if(!user || !user.nis){ showPage('login'); return; }")
  .replace("if(['guru','admin'].indexOf(String(user.role||'').toLowerCase())!==-1){ location.href='../guru/'; return; }",
    "if(['guru','admin'].indexOf(String(user.role||'').toLowerCase())!==-1){ showPage('guru'); return; }")
  .replace(/init\(\);\s*$/, 'window.__ddkSiswaInit = init;');
must(S.indexOf('__ddkSiswaInit') !== -1, 'siswa: init() tidak tertangani');
must(S.indexOf("location.href='../") === -1, 'siswa: masih ada location.href ke folder luar');

// Guru: ID ganda diubah, tautan balik diarahkan ke router, boot dipicu router.
const guruBodyFixed = guruBody
  .replace('id="sidebar"', 'id="sidebarGuru"')
  .replace(/getElementById\('sidebar'\)/g, "getElementById('sidebarGuru')")
  .replace('<main class="main" id="main">', '<main class="main" id="mainGuru">')
  .replace('<a href="../">← Halaman siswa</a>',
    '<a href="#" onclick="showPage(\'login\');return false">← Halaman siswa</a>');
must(guruBodyFixed.indexOf('sidebarGuru') !== -1, 'guru: rename sidebar gagal');

const G = guruScript
  .replace(/gasExec\(/g, 'gasExecGuru(')
  .replace(/apiCall\(/g, 'apiCallGuru(')
  .replace(`/* ---------- INIT ---------- */
(function(){
  try{ guru = JSON.parse(localStorage.getItem('user')||'null'); }catch(e){ guru=null; }
  if(guru && ['guru','admin'].indexOf(String(guru.role||'').toLowerCase())!==-1){
    showApp();
  } else {
    guru=null; showGate();
  }
})();`, `/* ---------- INIT (dipicu router single-file) ---------- */
window.__ddkGuruBoot = function(){
  try{ guru = JSON.parse(localStorage.getItem('user')||'null'); }catch(e){ guru=null; }
  if(guru && ['guru','admin'].indexOf(String(guru.role||'').toLowerCase())!==-1){
    showApp();
  } else {
    guru=null; showGate();
  }
};`);
must(G.indexOf('__ddkGuruBoot') !== -1, 'guru: boot IIFE tidak tertangani');
must(G.indexOf('function apiCallGuru(') !== -1, 'guru: rename apiCall gagal');

/* ---------- 4. Susun berkas keluaran ---------- */

const out = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Weblog DDK — Media Pembelajaran Dasar-Dasar Ketenagalistrikan</title>
<!--
  ============================================================
  Weblog DDK — VERSI SATU FILE (untuk Blogger)
  ============================================================
  Isi: Login/Daftar + Dashboard Siswa + Dashboard Guru + backend demo.
  Semua CSS & JS sudah di-inline — tidak butuh file pendamping apa pun.

  CARA PAKAI DI BLOGGER (pilih salah satu):
  1. Paling aman  : Layout → Tambah Gadget → HTML/JavaScript → tempel
                    seluruh isi file ini → Simpan.
  2. Halaman statis: Pages → New Page → mode tampilan HTML → tempel.
  3. Tema         : Theme → Edit HTML → tempel sebelum </body>
                    (berlaku di seluruh blog, kurang disarankan).

  AKUN DEMO : siswa 2024001/siswa123 · guru GURU001/guru123.
  DATA      : secara default (flag DDK_DEMO_ONLY = true di blok skrip
              pertama) seluruh data hanya tersimpan di localStorage
              browser — demo offline, Sheet asli tidak tersentuh. Ubah
              menjadi false untuk memakai Google Apps Script asli.
  ============================================================
-->
<style>
${cssParts.join('\n\n')}
</style>
</head>
<body>

<!-- ==================== HALAMAN 1: LOGIN / DAFTAR ==================== -->
<div id="pgLogin">
${loginBody}
</div>

<!-- ==================== HALAMAN 2: DASHBOARD SISWA ==================== -->
<div id="pgSiswa" style="display:none">
${dashBody}
</div>

<!-- ==================== HALAMAN 3: DASHBOARD GURU ==================== -->
<div id="pgGuru" style="display:none">
${guruBodyFixed}
</div>

<div id="toast" class="toast"></div>

<script>
/* Flag mode demo satu file: true = semua data di localStorage browser
   (tanpa server, aman untuk demo). false = tembak Apps Script asli. */
var DDK_DEMO_ONLY = true;

function showToast(msg, type){
  var el=document.getElementById('toast');
  el.textContent=msg;
  el.className='toast show '+(type||'');
  setTimeout(function(){ el.className='toast'; }, 3000);
}
function showLoading(on){
  document.body.classList.toggle('loading', !!on);
}
</script>

<script>
${demoJs}</script>

<script>
/* Saat DDK_DEMO_ONLY aktif, panggilan langsung ke Google Apps Script (/exec)
   dialihkan ke backend demo /api/* sehingga satu file ini berjalan mandiri. */
(function(){
  if(!window.DDK_DEMO_ONLY) return;
  var prev = window.fetch ? window.fetch.bind(window) : null;
  if(!prev) return;
  window.fetch = function(input, init){
    try{
      var url = (typeof input === 'string') ? input : ((input && input.url) || '');
      if(url.indexOf('https://script.google.com/macros/s/') === 0 && init && init.body){
        var payload = {};
        try{ payload = JSON.parse(init.body); }catch(e){ payload = {}; }
        var action = String(payload.action || '');
        var data = payload.data || {};
        if(action === 'submitPretest' || action === 'submitPosttest'){
          data.quizKey = (action === 'submitPretest') ? 'pretest' : 'posttest';
          action = 'submitMateriQuiz';
        }
        return prev('/api/' + action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    }catch(e){}
    return prev(input, init);
  };
})();
</script>

<script>
${L}</script>

<script>
${S}</script>

<script>
${G}</script>

<script>
/* ---------- ROUTER SATU FILE (versi Blogger) ---------- */
var DDK_PAGE_IDS = ['pgLogin','pgSiswa','pgGuru'];
function showPage(name){
  var target = ({login:'pgLogin', siswa:'pgSiswa', guru:'pgGuru'})[name] || 'pgLogin';
  DDK_PAGE_IDS.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = (id === target) ? '' : 'none';
  });
  if(target === 'pgSiswa' && typeof window.__ddkSiswaInit === 'function'){ window.__ddkSiswaInit(); }
  if(target === 'pgGuru' && typeof window.__ddkGuruBoot === 'function'){ window.__ddkGuruBoot(); }
  try{ window.scrollTo(0,0); }catch(e){}
}
/* Auto-restore session: langsung dari localStorage, tanpa network. */
(function(){
  var u = null;
  try{ u = JSON.parse(localStorage.getItem('user')||'null'); }catch(e){ u = null; }
  if(u && u.nis){
    var role = String(u.role||'siswa').toLowerCase();
    showPage((role==='guru'||role==='admin') ? 'guru' : 'siswa');
  } else {
    showPage('login');
  }
})();
</script>
</body>
</html>
`;

/* ---------- 5. Pemeriksaan kesehatan ---------- */

const ids = [...out.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
must(dupIds.length === 0, 'ID ganda di hasil: ' + [...new Set(dupIds)].join(', '));
must(!/<script src=/.test(out), 'hasil masih memuat <script src> — harus di-inline semua');
must(out.includes("showPage('guru')") && out.includes("showPage('siswa')"), 'router belum terpasang penuh');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, out, 'utf8');
console.log('  ✓ blogger/weblog-ddk.html  (' + Math.round(out.length / 1024) + ' KB, satu file mandiri)');
console.log('\nSelesai. Tempel isi berkas ini ke Blogger (Gadget HTML/JavaScript disarankan).');
