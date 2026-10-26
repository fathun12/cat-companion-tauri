const fs = require('fs');
const path = require('path');
const S = require('./state');
const { rand, spring } = require('./actions');

// Pose scroll: kucing menarik gulungan tisu. Aset ada di assets/cat/scroll/.
// Urutan tumpuk dari bawah: tisu, ekor, badan, tangan, kaki, lalu kepala (kuping, kepala, kumis, mata, pupil).
// Kalau ada bagian yang tertutup atau terbalik, ubah urutan penyusunan di buildScroll().

const DIR = path.join(__dirname, '..', '..', '..', 'assets', 'cat', 'scroll');
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

// Cari kotak pembatas gulungan di tisu.png, untuk menentukan asal kertas tisu
function measureRoll() {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
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
    if (maxX < 0) return;
    A.roll = { x1: minX, x2: maxX, y1: minY, y2: maxY };
  };
  const file = path.join(DIR, 'tisu.png');
  img.src = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}

// Cari bentuk tiap mata di mata.png (satu gumpalan per mata) untuk membuat mata tertutup
function measureEyes() {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    const boxes = [];
    let cur = null;
    for (let x = 0; x <= w; x++) {
      let minY = h, maxY = -1;
      if (x < w) {
        for (let y = 0; y < h; y++) {
          if (d[(y * w + x) * 4 + 3] > 0) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxY >= 0) {
        if (!cur) cur = { x1: x, x2: x, y1: minY, y2: maxY };
        cur.x2 = x;
        cur.y1 = Math.min(cur.y1, minY);
        cur.y2 = Math.max(cur.y2, maxY);
      } else if (cur) {
        boxes.push(cur);
        cur = null;
      }
    }
    A.eyes = { w, h, boxes };
    drawClosed();
  };
  img.src = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, 'mata.png')).toString('base64');
}

// Mata tertutup = garis tipis setinggi 1 piksel di tengah tiap mata
function drawClosed() {
  if (!A.eyes || !A.look) return;
  const { w, h, boxes } = A.eyes;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = A.look.outline || '#ffffff';
  for (const b of boxes) ctx.fillRect(b.x1, Math.round((b.y1 + b.y2) / 2), b.x2 - b.x1 + 1, 1);
  A.img.closed.src = c.toDataURL();
}

function buildScroll() {
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
    A.img[id] = mkImg(id + '.png'); // tidak diwarnai ulang
    A.headBox.appendChild(A.img[id]);
  }
  // Mata tertutup (digambar lewat kode dari bentuk mata.png, dipakai saat kedip)
  A.img.closed = mkImg();
  A.img.closed.style.display = 'none';
  A.headBox.appendChild(A.img.closed);

  // Garis tisu yang meluncur dan gelembung: lapisan paling atas
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
  measureEyes();
}

// Dipanggil dari rig.js setiap warna atau pola berubah
function applyLook(urls, look) {
  A.look = look;
  drawClosed();
  A.img.mata.src = urls.s_mata; // warna mata dari panel
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

// Garis tisu: 1-3 garis vertikal kecil di tengah gulungan, posisi, panjang, dan kecepatan acak.
// Tiap garis muncul pelan, turun sedikit, lalu memudar.
function spawnLines() {
  const R = A.roll;
  if (!S.TISSUE_LINES || !R || liveLines > 12) return;
  const SC = S.SCALE;
  const n = 1 + Math.floor(rand(0, 3));
  const cy = Math.round((R.y1 + R.y2) / 2);
  for (let i = 0; i < n; i++) {
    const len = 2 + Math.floor(rand(0, 3)); // panjang 2-4 piksel
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

function update(t, dt, active, breath) {
  if (!A) return;
  A.box.style.display = active ? '' : 'none';
  if (!active) return;
  const sec = Math.min(dt, 50) / 1000;
  const SC = S.SCALE;

  // Setiap event scroll: satu tangan menarik, bergantian kiri dan kanan
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

  // Ekor berkibas, bertahap per 5 derajat
  wagPhase += ((dt / 1000) * 2 * Math.PI) / 0.8;
  const wag = Math.round((Math.sin(wagPhase) * 10) / 5) * 5;
  A.tailBox.style.transform = `rotate(${wag}deg)`;

  // Kedip
  if (t >= nextBlink) {
    blinkEnd = t + 160;
    nextBlink = t + rand(2500, 6000);
  }
  const shut = t < blinkEnd && !!A.img.closed.src;
  A.img.mata.style.display = shut ? 'none' : '';
  A.img.pupil.style.display = shut ? 'none' : '';
  A.img.closed.style.display = shut ? '' : 'none';

  // Gelembung bergantian tiap 0,4 detik
  const bp = Math.floor(t / 400) % Math.max(1, A.bubbles.length);
  A.bubbles.forEach((img, i) => (img.style.display = i === bp ? '' : 'none'));
}

module.exports = { buildScroll, applyLook, update };