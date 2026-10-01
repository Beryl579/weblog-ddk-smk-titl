/* verify-fix.js — cek hasil perbaikan */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'Weblog-DDK', 'Views', 'DashboardSiswa.html');
const html = fs.readFileSync(FILE, 'utf8');

// 1. Cek sintaks semua blok <script> tanpa src
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('Blok script ditemukan:', scripts.length);
scripts.forEach((s, i) => {
  try { new vm.Script(s); console.log(`  script[${i}]: sintaks OK (${s.length} chars)`); }
  catch (e) { console.log(`  script[${i}]: ERROR -> ${e.message}`); process.exitCode = 1; }
});

// 2. Ambil bank soal & cek distribusi + rentang kunci
function grab(marker) {
  const st = html.indexOf(marker);
  const a = html.indexOf('[', st);
  const e = html.indexOf('\n];', a);
  return eval(html.slice(a, e + 3));
}
['var PRETEST =', 'var POSTTEST =', 'var UJIAN ='].forEach(marker => {
  const arr = grab(marker);
  const dist = [0, 0, 0, 0];
  let bad = 0;
  arr.forEach(q => {
    if (q.a < 0 || q.a > 3 || !q.o[q.a] || !q.q || !q.why) bad++;
    else dist[q.a]++;
  });
  console.log(`${marker} n=${arr.length} dist A/B/C/D=${dist} invalid=${bad}`);
});

// 3. Spot-check: jawaban benar harus ikut teksnya
const pre = grab('var PRETEST =');
const me = pre.find(q => q.q.startsWith('Singkatan ME'));
console.log('Spot ME:', JSON.stringify(me.o[me.a]), me.o[me.a] === 'Mekanikal & Elektrikal' ? 'BENAR' : 'SALAH!!');
const panel = grab('var POSTTEST =').find(q => q.q.includes('RAB adalah singkatan'));
console.log('Spot RAB:', JSON.stringify(panel.o[panel.a]), panel.o[panel.a] === 'Rencana Anggaran Biaya' ? 'BENAR' : 'SALAH!!');

// 4. Pastikan fungsi acak + validasi ada
['siapkanSoalAcak', 'acakArray', 'quizBelumDijawab', 'Jawaban tersimpan'].forEach(k => {
  console.log((html.includes(k) ? 'ADA  ' : 'HILANG') + ' : ' + k);
});
// 5. Pastikan pembahasan tidak bocor saat ujian
console.log((html.includes("quiz.ans[quiz.idx]!==null && q.why") ? 'BOCOR!!' : 'AMAN  ') + ' : why-box saat ujian');
