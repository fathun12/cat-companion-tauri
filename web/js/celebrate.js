import S from './state.js';
import { setSleep, spawnLove, rand } from './actions.js';
import './hit.js'; // pixel-accurate click-through (self-starting)

// Pose perayaan: kucing berdiri, tangan bergantian, lompat-lompat, hati melayang.
// Memakai sprite yang sama dengan idle (assets/cat/model/), dipasang lewat applyLook.
// Dipicu event Tauri 'celebrate' atau start() langsung.
const pct = (v) => v * 100 + '%';

// Selisih x tangan dalam piksel gambar (negatif = kiri). Tangan kiri = tangan di kanan layar.
const HAND_L_DX = 0;
const HAND_R_DX = 0;

const BODY_IDS = ['badan', 'kaki_kanan', 'kaki_kiri', 'tangan_kanan', 'tangan_kiri'];
const HEAD_IDS = ['kuping_kanan', 'kuping_kiri', 'kepala', 'kumis', 'mata', 'pupil', 'mata_tidur'];

const mkImg = () => {
  const img = new Image();
  img.className = 'layer';
  img.draggable = false;
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
let nextBlink = 0, blinkEnd = 0;

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

  for (const id of BODY_IDS) {
    A.img[id] = mkImg();
    A.box.appendChild(A.img[id]);
  }

  A.headBox = mkDiv(A.box);
  A.headBox.style.transformOrigin = '50% 45%';
  for (const id of HEAD_IDS) {
    A.img[id] = mkImg();
    A.headBox.appendChild(A.img[id]);
  }
  // Titik putar kuping sama seperti di idle (rig.json)
  for (const id of ['kuping_kanan', 'kuping_kiri']) {
    const p = S.rig.pivots[id];
    if (p) A.img[id].style.transformOrigin = pct(p[0]) + ' ' + pct(p[1]);
  }
  A.img.mata_tidur.style.display = 'none';
}

export function applyLook(urls) {
  if (!A) return;
  for (const id of ['ekor', ...BODY_IDS, ...HEAD_IDS]) A.img[id].src = urls[id];
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

  if (t >= nextBlink) {
    blinkEnd = t + 160;
    nextBlink = t + rand(700, 1200);
  }
  const shut = t < blinkEnd && !!A.img.mata_tidur.src;
  A.img.mata.style.display = shut ? 'none' : '';
  A.img.pupil.style.display = shut ? 'none' : '';
  A.img.mata_tidur.style.display = shut ? '' : 'none';
}

export function start() {
  if (!A) return;
  const now = performance.now();
  setSleep(false);
  S.lastActivity = now;
  startAt = now;
  lastHop = -1;
  nextBlink = now + 500;
  blinkEnd = 0;
}

window.__TAURI__.event.listen('celebrate', start);