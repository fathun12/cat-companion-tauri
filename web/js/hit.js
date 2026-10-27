import S from './state.js';

const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const masks = new Map(); // img -> { src, w, h, a }
const OFFS = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]; // small forgiveness around the cursor (css px)

function maskOf(img) {
  if (!img.complete || !img.naturalWidth) return null;
  let m = masks.get(img);
  if (m && m.src === img.src) return m;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  m = { src: img.src, w: c.width, h: c.height, a: ctx.getImageData(0, 0, c.width, c.height).data };
  masks.set(img, m);
  return m;
}

// Maps a window point into the img's own coordinates, walking stage -> ... -> img
function toLocal(img, x, y) {
  const list = [];
  for (let e = img; e && e !== document.body; e = e.parentElement) list.unshift(e);
  let px = x, py = y;
  for (const e of list) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none') return null;
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    const m = cs.transform === 'none' ? new DOMMatrix() : new DOMMatrix(cs.transform);
    const q = new DOMPoint(px - e.offsetLeft - ox, py - e.offsetTop - oy).matrixTransform(m.inverse());
    if (!isFinite(q.x) || !isFinite(q.y)) return null;
    px = q.x + ox;
    py = q.y + oy;
  }
  return [px, py];
}

function isOverCat(x, y) {
  const st = S.stage;
  if (!st) return false;
  const M = 30;
  if (x < st.offsetLeft - M || x > st.offsetLeft + st.offsetWidth + M) return false;
  if (y < st.offsetTop - M || y > st.offsetTop + st.offsetHeight + M) return false;
  for (const img of st.querySelectorAll('img.layer:not(.effect)')) {
    if (img.offsetParent === null) continue; // hidden
    if (parseFloat(getComputedStyle(img).opacity) < 0.05) continue;
    const m = maskOf(img);
    if (!m) continue;
    for (const [dx, dy] of OFFS) {
      const p = toLocal(img, x + dx, y + dy);
      if (!p) break;
      const ix = Math.floor((p[0] / img.offsetWidth) * m.w);
      const iy = Math.floor((p[1] / img.offsetHeight) * m.h);
      if (ix >= 0 && iy >= 0 && ix < m.w && iy < m.h && m.a[(iy * m.w + ix) * 4 + 3] > 20) return true;
    }
  }
  return false;
}

let latest = null;
let pending = false;
let lastHit = null;

function run() {
  pending = false;
  if (!latest) return;
  const hit = isOverCat(latest[0], latest[1]);
  if (hit !== lastHit) {
    lastHit = hit;
    invoke('set_cat_hit', { hit });
  }
}

listen('cursor', (e) => {
  latest = e.payload;
  if (!pending) {
    pending = true;
    requestAnimationFrame(run);
  }
});