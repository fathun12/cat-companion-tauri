import S from './state.js';
import { setSleep, spawnLove } from './actions.js';
import './hit.js'; // pixel-accurate click-through (self-starting)

// Pose perayaan: kucing berdiri, tangan terangkat, lompat-lompat, hati melayang.
// Dipicu event Tauri 'celebrate' (nanti dikirim Rust) atau start() langsung.
const pct = (v) => v * 100 + '%';

// Hand x offsets in image pixels (negative = left). HAND_L_DX = the hand on the right side of the screen.
const HAND_L_DX = 0;
const HAND_R_DX = 0;
const EAR_DX = -3; // sementara: kuping scroll 3 px lebih kanan dari kepala celebrate

const mkImg = (file) => {
  const img = new Image();
  img.className = 'layer';
  img.draggable = false;
  if (file) img.src = S.BASE + 'cat/celebrate/' + file;
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

export function buildCelebrate() {
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
  A.img.kuping.style.transform = `translateX(${EAR_DX * S.SCALE}px)`;
  for (const id of ['kumis', 'mata', 'pupil']) {
    A.img[id] = mkImg(id + '.png');
    A.headBox.appendChild(A.img[id]);
  }

  for (const id of ['tangan_kanan', 'tangan_kiri']) {
    A.img[id] = mkImg();
    A.box.appendChild(A.img[id]);
  }
}

export function applyLook(urls) {
  if (!A) return;
  A.img.mata.src = urls.c_mata;
  A.img.pupil.src = urls.c_pupil;
  A.img.ekor.src = urls.c_ekor;
  A.img.badan.src = urls.c_badan;
  A.img.kaki_kiri.src = urls.c_kaki_kiri;
  A.img.kaki_kanan.src = urls.c_kaki_kanan;
  A.img.kuping.src = urls.s_kuping; // sementara, belum ada celebrate_kuping.png
  A.img.kepala.src = urls.c_kepala;
  A.img.tangan_kiri.src = urls.c_tangan_kiri;
  A.img.tangan_kanan.src = urls.c_tangan_kanan;
}

export const isActive = (t) => startAt >= 0 && t - startAt < S.CELEBRATE_MS;

export function update(t, dt, active, breath) {
  if (!A) return;
  A.box.style.display = active ? '' : 'none';
  if (!active) return;
  const SC = S.SCALE;
  const e = Math.max(0, t - startAt);

  const hopMs = S.CELEBRATE_MS / S.CELEBRATE_HOPS;
  const k = (e % hopMs) / hopMs;
  const n = Math.floor(e / hopMs);
  const up = Math.round(Math.sin(Math.PI * k) * S.CELEBRATE_HOP_PX) * SC;
  A.box.style.transform = `translateY(${S.CELEBRATE_SHIFT_Y * SC - up}px)`;
  if (n !== lastHop) {
    lastHop = n;
    spawnLove();
  }

  const w = Math.floor(e / 150) % 2;
  A.img.tangan_kiri.style.transform = `translate(${HAND_L_DX * SC}px, ${w * SC}px)`;
  A.img.tangan_kanan.style.transform = `translate(${HAND_R_DX * SC}px, ${(1 - w) * SC}px)`;

  A.headBox.style.transform = `translateY(${breath * SC}px)`;

  wagPhase += ((dt / 1000) * 2 * Math.PI) / 0.35;
  const wag = Math.round((Math.sin(wagPhase) * 25) / 5) * 5;
  A.tailBox.style.transform = `rotate(${wag}deg)`;
}

export function start() {
  if (!A) return;
  const now = performance.now();
  setSleep(false);
  S.lastActivity = now;
  startAt = now;
  lastHop = -1;
}

window.__TAURI__.event.listen('celebrate', start);