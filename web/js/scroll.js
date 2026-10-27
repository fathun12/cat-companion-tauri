import S from './state.js';
import { rand, spring } from './actions.js';

// Pose scroll: kucing menarik gulungan tisu. Aset di assets/cat/scroll/.
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
const kick = [0, 0]; // 0 = tangan kiri, 1 = tangan kanan
const kickV = [0, 0];
let seenTick = 0;
let wagPhase = 0;
let nextBlink = 1500, blinkEnd = 0;
let liveLines = 0;

// Baca piksel sebuah gambar (alpha dipakai untuk mengukur bentuk)
function loadPixels(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({ w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data });
    };
    img.src = url;
  });
}

// Kotak pembatas gulungan di tisu.png, untuk asal garis tisu
async function measureRoll() {
  const { w, h, d } = await loadPixels(S.BASE + 'cat/scroll/tisu.png');
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX >= 0) A.roll = { x1: minX, x2: maxX, y1: minY, y2: maxY };
}
export function buildScroll() {
  A = { img: {}, roll: null };
  S.scr = A;

  A.box = mkDiv(S.stage);
  A.box.style.display = 'none';
  A.box.style.transform = `translateY(${S.SCROLL_SHIFT_Y * S.SCALE}px)`;

  A.img.tisu = mkImg('tisu.png');
  A.box.appendChild(A.img.tisu);

  A.tailBox = mkDiv(A.box);
  const [px, py] = S.rig.pivots.ekor;
  A.tailBox.style.transformOrigin = pct(px) + ' ' + pct(py);
  A.img.ekor = mkImg();
  A.tailBox.appendChild(A.img.ekor);

  for (const id of ['badan', 'tangan_kanan', 'tangan_kiri', 'kaki_kanan', 'kaki_kiri']) {
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
    A.img[id] = mkImg(id + '.png');
    A.headBox.appendChild(A.img[id]);
  }
  A.img.closed = mkImg();
  A.img.closed.style.display = 'none';
  A.headBox.appendChild(A.img.closed);

  A.fx = mkDiv(A.box);
  A.bubbles = (S.SCROLL_BUBBLES || []).map((f) => {
    const img = new Image();
    img.className = 'layer';
    img.draggable = false;
    img.src = S.BASE + f;
    img.style.display = 'none';
    A.fx.appendChild(img);
    return img;
  });

  measureRoll();
}

// Dipanggil dari rig.js setiap warna atau pola berubah
export function applyLook(urls, look) {
  A.look = look;
  A.img.closed.src = urls.s_mata_tidur;
  A.img.mata.src = urls.s_mata;
  A.img.pupil.src = urls.s_pupil;
  A.img.ekor.src = urls.s_ekor;
  A.img.badan.src = urls.s_badan;
  A.img.tangan_kiri.src = urls.s_tangan_kiri;
  A.img.tangan_kanan.src = urls.s_tangan_kanan;
  A.img.kaki_kiri.src = urls.s_kaki_kiri;
  A.img.kaki_kanan.src = urls.s_kaki_kanan;
  A.img.kuping.src = urls.s_kuping;
  A.img.kepala.src = urls.s_kepala;
}

// 1-3 garis tisu kecil yang meluncur turun lalu memudar
function spawnLines() {
  const R = A.roll;
  if (!S.TISSUE_LINES || !R || liveLines > 12) return;
  const SC = S.SCALE;
  const n = 1 + Math.floor(rand(0, 3));
  const cy = Math.round((R.y1 + R.y2) / 2);
  for (let i = 0; i < n; i++) {
    const len = 2 + Math.floor(rand(0, 3));
    const x = R.x1 + Math.floor(rand(0, R.x2 - R.x1 + 1));
    const y = cy - Math.floor(len / 2) + Math.floor(rand(-2, 3));
    const travel = (2 + Math.floor(rand(0, S.LINE_TRAVEL))) * SC;
    const line = document.createElement('div');
    line.style.cssText =
      'position:absolute;pointer-events:none;background:#fff;opacity:0;box-shadow:0 0 0 1px #333;' +
      `left:${x * SC}px;top:${y * SC}px;width:${SC}px;height:${len * SC}px;`;
    A.fx.appendChild(line);
    liveLines++;
    line
      .animate(
        [
          { transform: 'translateY(0px)', opacity: 0 },
          { transform: `translateY(${travel * 0.35}px)`, opacity: 1, offset: 0.35 },
          { transform: `translateY(${travel * 0.7}px)`, opacity: 1, offset: 0.65 },
          { transform: `translateY(${travel}px)`, opacity: 0 },
        ],
        { duration: S.LINE_MS * rand(0.7, 1.2), delay: Math.round(rand(0, 150)), easing: 'steps(5)' }
      )
      .addEventListener('finish', () => {
        line.remove();
        liveLines--;
      });
  }
}

export function update(t, dt, active, breath) {
  if (!A) return;
  A.box.style.display = active ? '' : 'none';
  if (!active) return;
  const sec = Math.min(dt, 50) / 1000;
  const SC = S.SCALE;

  if (S.scrollTick !== seenTick) {
    seenTick = S.scrollTick;
    kickV[S.scrollFrame] += 26;
    spawnLines();
  }
  for (let i = 0; i < 2; i++) {
    [kick[i], kickV[i]] = spring(kick[i], kickV[i], 0, 260, 14, sec);
    kick[i] = Math.min(kick[i], 2);
  }
  const off = (v) => Math.max(0, Math.min(2, Math.round(v))) * SC;
  A.img.tangan_kiri.style.transform = `translateY(${off(kick[0])}px)`;
  A.img.tangan_kanan.style.transform = `translateY(${off(kick[1])}px)`;

  const peak = Math.max(0, Math.round(Math.max(kick[0], kick[1])));
  A.img.tisu.style.transform = `translateX(${Math.min(1, peak) * SC}px)`;
  A.headBox.style.transform = `translateY(${Math.min(2, breath + peak) * SC}px)`;

  wagPhase += ((dt / 1000) * 2 * Math.PI) / 0.8;
  const wag = Math.round((Math.sin(wagPhase) * 10) / 5) * 5;
  A.tailBox.style.transform = `rotate(${wag}deg)`;

  if (t >= nextBlink) {
    blinkEnd = t + 160;
    nextBlink = t + rand(2500, 6000);
  }
  const shut = t < blinkEnd && !!A.img.closed.src;
  A.img.mata.style.display = shut ? 'none' : '';
  A.img.pupil.style.display = shut ? 'none' : '';
  A.img.closed.style.display = shut ? '' : 'none';

  const bp = Math.floor(t / 400) % Math.max(1, A.bubbles.length);
  A.bubbles.forEach((img, i) => (img.style.display = i === bp ? '' : 'none'));
}