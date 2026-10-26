const { ipcRenderer } = require('electron');
const S = require('./state');

// Pose minum: kepala turun ke mangkuk (DRINK_DROP_PX). Lidah adalah anak grup kepala, jadi selalu ikut gerak kepala.
// Siklus jilat: kepala di mangkuk + lidah menjulur penuh, lalu kepala naik sedikit + lidah menciut.
// Dipicu IPC 'say' jenis 'drink' dari timers.js.
// lidah.png digambar pada posisi SAAT kepala sudah turun, jadi di grup kepala digeser naik sebesar DRINK_DROP_PX.

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

function buildDrink() {
  bowl = mkImg('bowl.png');
  tongue = mkImg('lidah.png');
  tongue.style.transform = `translateY(${-S.DRINK_DROP_PX * S.SCALE}px)`;
  S.stage.appendChild(bowl); // paling atas, di bawah dagu
  S.groups.head.appendChild(tongue); // di kepala, ikut gerak kepala
}

const isActive = (t) => startAt >= 0 && t >= startAt && t < startAt + S.DRINK_MS;

// 0 = kepala duduk biasa, 1 = kepala sudah di mangkuk
function amount(t) {
  const e = t - startAt;
  if (e < 0 || e >= S.DRINK_MS) return 0;
  if (e < S.DRINK_IN_MS) return e / S.DRINK_IN_MS;
  if (e > S.DRINK_MS - S.DRINK_OUT_MS) return (S.DRINK_MS - e) / S.DRINK_OUT_MS;
  return 1;
}

// true = kepala paling bawah (lidah penuh); false = kepala naik sedikit (lidah menciut)
const headDown = (t) => (t - startAt - S.DRINK_IN_MS) % S.DRINK_BOB_MS < S.DRINK_BOB_MS / 2;

// Seberapa turun kepala (piksel layar), dipakai animate.js
function dip(t) {
  if (!isActive(t) || S.dragging || S.sleeping) return 0;
  const a = amount(t);
  const up = a >= 1 && !headDown(t) ? S.DRINK_BOB_UP_PX : 0;
  return (Math.round(a * S.DRINK_DROP_PX) - up) * S.SCALE;
}

function update(t, active) {
  if (!bowl) return;
  bowl.style.display = active ? '' : 'none';
  const out = active && amount(t) >= 1;
  tongue.style.display = out ? '' : 'none';
  if (out) {
    // Menciut = potong bagian bawah lidah, sisakan DRINK_TONGUE_UP_ROWS baris dari atas lidah
    const h = tongue.naturalHeight || 48;
    const cut = (h - (S.DRINK_TONGUE_Y0 + S.DRINK_TONGUE_UP_ROWS)) * S.SCALE;
    tongue.style.clipPath = headDown(t) ? 'none' : `inset(0 0 ${cut}px 0)`;
  }
}

ipcRenderer.on('say', (event, text, kind) => {
  if (kind === 'drink') startAt = performance.now() + S.DRINK_DELAY_MS;
});

module.exports = { buildDrink, isActive, dip, update };