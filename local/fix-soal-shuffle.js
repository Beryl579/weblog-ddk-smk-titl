/**
 * fix-soal-shuffle.js (one-off) — acak urutan opsi tiap soal di
 * Weblog-DDK/Views/DashboardSiswa.html agar kunci tidak semua A.
 * Menangani: var PRETEST, var POSTTEST, var UJIAN, dan semua blok kuis:[...]
 * Jawaban benar mengikuti teks opsi (bukan posisi), jadi tetap valid.
 *
 *   node local/fix-soal-shuffle.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'Weblog-DDK', 'Views', 'DashboardSiswa.html');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function esc(s) {
  return JSON.stringify(String(s));
}

function serializeBank(arr) {
  return '[\n' + arr.map(function (q) {
    return '  {q:' + esc(q.q) + ', o:[' + q.o.map(esc).join(', ') + '], a:' + q.a + ', why:' + esc(q.why || '') + '}';
  }).join(',\n') + '\n]';
}

// Ambil blok array JS yang diawali marker, berakhir pada "\n];" pertama.
function extractArray(src, marker) {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('Marker tidak ketemu: ' + marker);
  const arrStart = src.indexOf('[', start);
  const end = src.indexOf('\n];', arrStart);
  if (end === -1) throw new Error('Penutup tidak ketemu untuk: ' + marker);
  return { start: arrStart, end: end + 3, text: src.slice(arrStart, end + 3) };
}

let html = fs.readFileSync(FILE, 'utf8');
const stats = {};

['var PRETEST =', 'var POSTTEST =', 'var UJIAN ='].forEach(function (marker) {
  const blk = extractArray(html, marker);
  const arr = eval(blk.text);
  arr.forEach(function (q) {
    const benar = q.o[q.a];
    shuffle(q.o);
    q.a = q.o.indexOf(benar);
  });
  // acak juga urutan soal, lalu tulis ulang order join tetap berurutan tampil
  shuffle(arr);
  const dist = [0, 0, 0, 0];
  arr.forEach(function (q) { dist[q.a]++; });
  stats[marker] = { n: arr.length, dist: dist };
  html = html.slice(0, blk.start) + serializeBank(arr) + html.slice(blk.end);
});

// Semua blok kuis materi: "kuis:[" ... "\n  ]"
let kuisCount = 0;
let offset = 0;
for (;;) {
  const m = html.indexOf('kuis:[', offset);
  if (m === -1) break;
  const arrStart = html.indexOf('[', m);
  const end = html.indexOf('\n  ]', arrStart);
  if (end === -1) break;
  const text = html.slice(arrStart, end + 4);
  let arr;
  try { arr = eval(text); } catch (e) { offset = m + 6; continue; }
  if (!Array.isArray(arr) || !arr[0] || !arr[0].o) { offset = m + 6; continue; }
  arr.forEach(function (q) {
    const benar = q.o[q.a];
    shuffle(q.o);
    q.a = q.o.indexOf(benar);
  });
  shuffle(arr);
  const ser = '[\n' + arr.map(function (q) {
    return '    {q:' + esc(q.q) + ', o:[' + q.o.map(esc).join(', ') + '], a:' + q.a + ', why:' + esc(q.why || '') + '}';
  }).join(',\n') + '\n  ]';
  html = html.slice(0, arrStart) + ser + html.slice(end + 4);
  offset = arrStart + ser.length;
  kuisCount++;
}

fs.writeFileSync(FILE, html, 'utf8');
console.log('OK — bank soal diacak.');
console.log(JSON.stringify(stats, null, 2));
console.log('Blok kuis materi diacak: ' + kuisCount);
