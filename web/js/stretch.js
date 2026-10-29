import S from './state.js';
import { setSleep } from './actions.js';
import { STRETCH } from './look.js';

// Pose peregangan (pengingat peregangan dan awal istirahat): kucing merunduk, pantat naik,
// badan memanjang pelan berulang, mata menyipit. Dipicu event 'say' jenis 'stretch'.
const pct = (v) => v * 100 + '%';

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
let wagPhase = 0;

export function buildStretch() {
  A = { img: {} };
  S.str = A;

  A.box = mkDiv(S.stage);
  A.box.style.display = 'none';
  A.box.style.transformOrigin = pct(S.STRETCH_PIVOT[0]) + ' ' + pct(S.STRETCH_PIVOT[1]);

  A.tailBox = mkDiv(A.box);
  A.tailBox.style.transformOrigin = pct(S.STRETCH_TAIL_PIVOT[0]) + ' ' + pct(S.STRETCH_TAIL_PIVOT[1]);
  A.img.ekor = mkImg();
  A.tailBox.appendChild(A.img.ekor);

  for (const id of ['badan', 'kaki_kanan', 'kaki_kiri', 'tangan_kanan', 'tangan_kiri']) {
    A.img[id] = mkImg();
    A.box.appendChild(A.img[id]);
  }
  // Titik putar kaki depan = bahu (ujung atas sprite)
  A.img.tangan_kanan.style.transformOrigin = S.STRETCH_HAND_PIVOT[0].map((v) => v * S.SCALE + 'px').join(' ');
  A.img.tangan_kiri.style.transformOrigin = S.STRETCH_HAND_PIVOT[1].map((v) => v * S.SCALE + 'px').join(' ');

  A.headBox = mkDiv(A.box);
  for (const id of ['kuping_kanan', 'kuping_kiri', 'kepala', 'kumis', 'mata', 'pupil', 'mata_tidur']) {
    A.img[id] = mkImg();
    A.headBox.appendChild(A.img[id]);
  }
  A.img.mata_tidur.style.display = 'none';
}

export function applyLook(urls) {
  if (!A) return;
  for (const [id, key] of Object.entries(STRETCH)) A.img[id].src = urls[key];
}

export const isActive = (t) => startAt >= 0 && t - startAt < S.STRETCH_MS;

export function update(t, dt, active, breath) {
  if (!A) return;
  A.box.style.display = active ? '' : 'none';
  if (!active) return;
  const SC = S.SCALE;
  const e = t - startAt;

  // masuk dan keluar: 0 -> 1 -> 0
  const a = Math.max(0, Math.min(1, e / S.STRETCH_IN_MS, (S.STRETCH_MS - e) / S.STRETCH_OUT_MS));
  const pulse = 0.5 + 0.5 * Math.sin((e / S.STRETCH_PULSE_MS) * 2 * Math.PI - Math.PI / 2);
  const sx = 1 + S.STRETCH_SCALE_X * a * pulse;
  // jangkauan 0..1: kaki depan terulur dan badan turun; menarik lebih jauh saat pulse penuh
  const reach = a * (0.7 + 0.3 * pulse);
  const down = Math.round(S.STRETCH_DOWN_PX * reach) * SC;
  A.box.style.transform = `translateY(${S.STRETCH_SHIFT_Y * SC + down}px) scale(${sx}, 1)`;

  A.headBox.style.transform = `translateY(${breath * SC}px)`;

  // kaki belakang tetap menapak: dilawan turunnya badan (tidak bergetar lagi)
  A.img.kaki_kanan.style.transform = `translateY(${-down}px)`;
  A.img.kaki_kiri.style.transform = `translateY(${-down}px)`;

  // kaki depan terulur ke depan (kiri layar) dan miring, bertumpu di bahu
  const hx = Math.round(S.STRETCH_HAND_REACH[0] * reach) * SC;
  const hy = Math.round(S.STRETCH_HAND_REACH[1] * reach) * SC;
  const hand = `translate(${hx}px, ${hy}px) rotate(${S.STRETCH_HAND_ROT * reach}deg)`;
  A.img.tangan_kanan.style.transform = hand;
  A.img.tangan_kiri.style.transform = hand;

  wagPhase += ((dt / 1000) * 2 * Math.PI) / 1.6;
  const wag = Math.round((Math.sin(wagPhase) * 8) / 4) * 4;
  A.tailBox.style.transform = `translate(${S.STRETCH_TAIL[0] * SC}px, ${S.STRETCH_TAIL[1] * SC}px) rotate(${wag}deg)`;

  // mata menyipit selama meregang
  const shut = a > 0.6;
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
  wagPhase = 0;
}

window.__TAURI__.event.listen('say', (e) => {
  const kind = Array.isArray(e.payload) ? e.payload[1] : null;
  if (kind === 'stretch') start();
});