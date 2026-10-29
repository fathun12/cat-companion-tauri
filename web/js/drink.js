import S from './state.js';
import { setSleep } from './actions.js';

// Pose minum: kepala turun ke mangkuk, lidah menjilat.
// Dipicu event Tauri 'say' dengan jenis 'drink' (payload [teks, jenis]) atau start() langsung.
let bowl = null;
let tongue = null;
let startAt = -1;

const mkImg = (file) => {
  const img = new Image();
  img.className = 'layer';
  img.draggable = false;
  img.src = S.BASE + 'cat/drink/' + file;
  img.style.display = 'none';
  return img;
};

export function buildDrink() {
  bowl = mkImg('bowl.png');
  tongue = mkImg('lidah.png');
  tongue.style.transform = `translateY(${(S.DRINK_TONGUE_DY - S.DRINK_DROP_PX) * S.SCALE}px)`;
  S.stage.appendChild(bowl);
  S.groups.head.appendChild(tongue);
}

export const isActive = (t) => startAt >= 0 && t >= startAt && t < startAt + S.DRINK_MS;

function amount(t) {
  const e = t - startAt;
  if (e < 0 || e >= S.DRINK_MS) return 0;
  if (e < S.DRINK_IN_MS) return e / S.DRINK_IN_MS;
  if (e > S.DRINK_MS - S.DRINK_OUT_MS) return (S.DRINK_MS - e) / S.DRINK_OUT_MS;
  return 1;
}

const headDown = (t) => (t - startAt - S.DRINK_IN_MS) % S.DRINK_BOB_MS < S.DRINK_BOB_MS / 2;

// Seberapa turun kepala (piksel layar), dipakai animate.js
export function dip(t) {
  if (!isActive(t) || S.dragging || S.sleeping) return 0;
  const a = amount(t);
  const up = a >= 1 && !headDown(t) ? S.DRINK_BOB_UP_PX : 0;
  return (Math.round(a * S.DRINK_DROP_PX) - up) * S.SCALE;
}

export function update(t, active) {
  if (!bowl) return;
  bowl.style.display = active ? '' : 'none';
  const out = active && amount(t) >= 1;
  tongue.style.display = out ? '' : 'none';
  if (out) {
    const h = tongue.naturalHeight || 48;
    const cut = (h - (S.DRINK_TONGUE_Y0 + S.DRINK_TONGUE_UP_ROWS)) * S.SCALE;
    tongue.style.clipPath = headDown(t) ? 'none' : `inset(0 0 ${cut}px 0)`;
  }
}

export function start() {
  if (!bowl) return;
  const now = performance.now();
  if (S.sleeping) setSleep(false);
  S.lastActivity = now;
  startAt = now + S.DRINK_DELAY_MS;
}

window.__TAURI__.event.listen('say', (e) => {
  const kind = Array.isArray(e.payload) ? e.payload[1] : null;
  if (kind === 'drink') start();
});