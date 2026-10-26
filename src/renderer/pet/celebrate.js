const { ipcRenderer } = require('electron');
const S = require('./state');
const { setSleep, spawnLove } = require('./actions');

// Pose perayaan: kucing berdiri (badan, kaki, kepala dari pose scroll), tangan terangkat,
// lompat-lompat, hati melayang. Dipicu IPC 'celebrate' dari watchers.js (proses utama).
// Tangan terangkat: assets/cat/celebrate/tangan_kiri_angkat.png dan tangan_kanan_angkat.png (48x48).
// Kalau belum ada, tangan pose scroll dipakai sementara.

const pct = (v) => v * 100 + '%';

const mkImg = (file) => {
  const img = new Image();
  img.className = 'layer';
  img.draggable = false;
  if (file) img.src = S.BASE + 'cat/scroll/' + file;
  return img;
};

const mkDiv = (parent) => {
  const d = document.createElement('div');
  d.className = 'group';
  parent.appendChild(d);
  return d;
};

let A = null;
let startAt = -1;
let lastHop = -1;
let wagPhase = 0;

function buildCelebrate() {
  A = { img: {} };
  S.cel = A;

  A.box = mkDiv(S.stage);
  A.box.style.display = 'none';

  A.tailBox = mkDiv(A.box);
  const [px, py] = S.rig.pivots.ekor;
  A.tailBox.style.transformOrigin = pct(px) + ' ' + pct(py);
  A.img.ekor = mkImg();
  A.tailBox.appendChild(A.img.ekor);

  for (const id of ['badan', 'kaki_kanan', 'kaki_kiri']) {
    A.img[id] = mkImg();
    A.box.appendChild(A.img[id]);
  }

  A.headBox = mkDiv(A.box);
  A.headBox.style.transformOrigin = '50% 45%';
  for (const id of ['kuping', 'kepala']) {
    A.img[id] = mkImg();
    A.headBox.appendChild(A.img[id]);
  }
  for (const id of ['kumis', 'mata', 'pupil']) {
    A.img[id] = mkImg(id + '.png'); // tidak diwarnai ulang
    A.headBox.appendChild(A.img[id]);
  }

  // Tangan di lapisan paling atas supaya tidak tertutup kepala.
  // Kalau terlihat janggal, pindahkan loop ini ke atas loop kepala.
  for (const id of ['tangan_kanan', 'tangan_kiri']) {
    A.img[id] = mkImg();
    A.box.appendChild(A.img[id]);
  }
}

// Dipanggil dari rig.js setiap warna atau pola berubah
function applyLook(urls) {
  if (!A) return;
  A.img.mata.src = urls.s_mata;
  A.img.pupil.src = urls.s_pupil;
  A.img.ekor.src = urls.s_ekor;
  A.img.badan.src = urls.s_badan;
  A.img.kaki_kiri.src = urls.s_kaki_kiri;
  A.img.kaki_kanan.src = urls.s_kaki_kanan;
  A.img.kuping.src = urls.s_kuping;
  A.img.kepala.src = urls.s_kepala;
  A.img.tangan_kiri.src = urls.c_tangan_kiri || urls.s_tangan_kiri;
  A.img.tangan_kanan.src = urls.c_tangan_kanan || urls.s_tangan_kanan;
}

const isActive = (t) => startAt >= 0 && t - startAt < S.CELEBRATE_MS;

function update(t, dt, active, breath) {
  if (!A) return;
  A.box.style.display = active ? '' : 'none';
  if (!active) return;
  const SC = S.SCALE;
  const e = Math.max(0, t - startAt);

  // Lompat: tiap lompatan = satu busur, tinggi bertahap per piksel
  const hopMs = S.CELEBRATE_MS / S.CELEBRATE_HOPS;
  const k = (e % hopMs) / hopMs;
  const n = Math.floor(e / hopMs);
  const up = Math.round(Math.sin(Math.PI * k) * S.CELEBRATE_HOP_PX) * SC;
  A.box.style.transform = `translateY(${S.CELEBRATE_SHIFT_Y * SC - up}px)`;
  if (n !== lastHop) {
    lastHop = n;
    spawnLove(); // satu hati tiap lompatan
  }

  // Tangan terangkat bergantian naik-turun 1 piksel
  const w = Math.floor(e / 150) % 2;
  A.img.tangan_kiri.style.transform = `translateY(${w * SC}px)`;
  A.img.tangan_kanan.style.transform = `translateY(${(1 - w) * SC}px)`;

  A.headBox.style.transform = `translateY(${breath * SC}px)`;

  // Ekor berkibas cepat (sama dengan mode excited)
  wagPhase += ((dt / 1000) * 2 * Math.PI) / 0.35;
  const wag = Math.round((Math.sin(wagPhase) * 25) / 5) * 5;
  A.tailBox.style.transform = `rotate(${wag}deg)`;
}

ipcRenderer.on('celebrate', () => {
  if (!A) return;
  const now = performance.now();
  setSleep(false);
  S.lastActivity = now;
  startAt = now;
  lastHop = -1;
});

module.exports = { buildCelebrate, applyLook, update, isActive };