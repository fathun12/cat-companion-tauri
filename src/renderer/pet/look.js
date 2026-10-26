const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets');

// Layer yang diwarnai ulang dan lokasi filenya.
// click1, click2, t_* = layer pose mengetik (assets/cat/typing/)
const SRC = {
  badan: 'cat/body/badan.png',
  kepala: 'cat/parts/kepala.png',
  kuping: 'cat/parts/kuping.png',
  ekor: 'cat/parts/ekor.png',
  tangan: 'cat/parts/tangan.png',
  click1: 'cat/typing/click1.png',
  click2: 'cat/typing/click2.png',
  t_kepala: 'cat/typing/kepala.png',
  t_kuping: 'cat/typing/kuping.png',
  t_ekor: 'cat/typing/ekor.png',
  // pose scroll (assets/cat/scroll/)
  s_badan: 'cat/scroll/badan.png',
  s_kepala: 'cat/scroll/kepala.png',
  s_kuping: 'cat/scroll/kuping.png',
  s_ekor: 'cat/scroll/ekor.png',
  s_tangan_kiri: 'cat/scroll/tangan_kiri.png',
  s_tangan_kanan: 'cat/scroll/tangan_kanan.png',
  s_kaki_kiri: 'cat/scroll/kaki_kiri.png',
  s_kaki_kanan: 'cat/scroll/kaki_kanan.png',
  // mata: hanya diwarnai kalau warnanya diatur di panel
  mata: 'cat/eyes/mata.png',
  pupil: 'cat/eyes/pupil.png',
  t_mata: 'cat/typing/mata.png',
  t_pupil: 'cat/typing/pupil.png',
  s_mata: 'cat/scroll/mata.png',
  s_pupil: 'cat/scroll/pupil.png',
};
// Pose perayaan: tangan terangkat (assets/cat/celebrate/). Kalau filenya belum ada, dilewati
// dan pose perayaan memakai tangan scroll sementara.
for (const k of ['tangan_kiri', 'tangan_kanan']) {
  const f = k + '_angkat.png';
  if (fs.existsSync(path.join(ASSETS, 'cat', 'celebrate', f))) {
    SRC['c_' + k] = 'cat/celebrate/' + f;
  }
}
const RECOLOR = Object.keys(SRC);
const EYE = new Set(['mata', 'pupil', 't_mata', 't_pupil', 's_mata', 's_pupil']);

// Editor pola: layer mana memakai kisi bagian mana (kuping dibagi dua: kiri dan kanan)
const PART_OF = {
  badan: 'body', click1: 'body', click2: 'body', s_badan: 'body',
  kepala: 'head', t_kepala: 'head', s_kepala: 'head',
  kuping: 'ears', t_kuping: 'ears', s_kuping: 'ears',
  ekor: 'tail', t_ekor: 'tail', s_ekor: 'tail',
  tangan: 'arm', s_tangan_kiri: 'arm', s_tangan_kanan: 'arm',
  c_tangan_kiri: 'arm', c_tangan_kanan: 'arm',
  s_kaki_kiri: 'foot', s_kaki_kanan: 'foot',
};
// Ukuran kisi = ukuran kotak pembatas layer acuan ini
const GRID_REF = { body: 'badan', head: 'kepala', ears: 'kuping', tail: 'ekor', arm: 'tangan', foot: 's_kaki_kiri' };

// Layer pose mengetik memakai pola yang sama dengan layer idle-nya.
// Layer di daftar ini juga dibuatkan versi merah (hasilnya diberi akhiran _H).
const PID = {
  click1: 'badan', click2: 'badan', t_kepala: 'kepala', t_kuping: 'kuping', t_ekor: 'ekor',
  s_badan: 'badan', s_kepala: 'kepala', s_kuping: 'kuping', s_ekor: 'ekor',
  // tangan dan kaki memakai pola "tangan" (misalnya kaus kaki putih di tuxedo)
  s_tangan_kiri: 'tangan', s_tangan_kanan: 'tangan', s_kaki_kiri: 'tangan', s_kaki_kanan: 'tangan',
  c_tangan_kiri: 'tangan', c_tangan_kanan: 'tangan',
};
// click1/click2 memuat papan ketik: warna abu-abunya dibiarkan apa adanya
const KEEP_MID = new Set(['click1', 'click2']);

// Titik tengah pola, relatif terhadap kotak pembatas tiap layer (0 kiri, 1 kanan).
// Kepala dan badan dihitung sendiri-sendiri. Untuk geser manual: kecilkan = ke kiri.
const CX_HEAD = 0.5;
const CX_BODY = 0.5;

const PRESETS = {
  hitam:  { body: '#000000', outline: '#ffffff', p1: '#ffffff', p2: '#888888', pattern: 'polos' },
  oren:   { body: '#e8832a', outline: '#ffffff', p1: '#b85d14', p2: '#ffffff', pattern: 'belang' },
  abu:    { body: '#7d8590', outline: '#ffffff', p1: '#5a616b', p2: '#ffffff', pattern: 'belang' },
  tuxedo: { body: '#1b1b1b', outline: '#ffffff', p1: '#ffffff', p2: '#ffffff', pattern: 'tuxedo' },
  calico: { body: '#f4ede4', outline: '#3b2f2f', p1: '#e8832a', p2: '#2b2b2b', pattern: 'calico' },
};

function hash(a, b) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Setiap pola mengembalikan: 0 = warna badan, 1 = warna pola, 2 = warna pola 2
const PATTERNS = {
  polos: () => 0,
  belang: (id, x, y, w, h) => {
    if (id === 'tangan') return 0;
    if (id === 'ekor') return (x + y) % 8 < 3 ? 1 : 0;
    if (id === 'kepala') return y / h < 0.2 && x % 6 < 2 ? 1 : 0;
    return x % 6 < 2 ? 1 : 0;
  },
  tuxedo: (id, x, y, w, h) => {
    const u = x / w;
    const v = y / h;
    if (id === 'tangan') return 1;
    if (id === 'ekor') return u > 0.75 ? 1 : 0;
    if (id === 'badan') return ((u - CX_BODY) / 0.4) ** 2 + ((v - 0.62) / 0.5) ** 2 < 1 ? 1 : 0;
    if (id === 'kepala') return Math.abs(u - CX_HEAD) < 0.1 && v > 0.3 ? 1 : 0;
    return 0;
  },
  calico: (id, x, y) => {
    if (id === 'tangan') return 0;
    const k = hash(Math.floor(x / 7), Math.floor(y / 7));
    return k < 0.3 ? 1 : k < 0.5 ? 2 : 0;
  },
};

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const dataUrl = (rel) =>
  'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, rel)).toString('base64');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = src;
  });
}

const sources = {};
async function getSource(id) {
  if (sources[id]) return sources[id];
  const img = await loadImage(dataUrl(SRC[id]));
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);

  // Kotak pembatas piksel yang terisi (untuk titik tengah tiap layer)
  let minX = c.width, maxX = 0, minY = c.height, maxY = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data.data[(y * c.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  data.bb = { minX, minY, w: Math.max(1, maxX - minX + 1), h: Math.max(1, maxY - minY + 1) };

  sources[id] = data;
  return data;
}

// Mengembalikan { badan: dataURL, kepala: dataURL, click1: ..., click1_H: ... } yang sudah diwarnai.
// Akhiran _H = versi merah (mode panas), hanya untuk layer pose mengetik.
async function recolorAll(look, ids) {
  const body = hex(look.body);
  const outline = hex(look.outline);
  const grid = !!look.parts; // true = pola dari editor piksel; false = look.json lama (pola rumus)
  const cols = grid ? null : [body, hex(look.p1), hex(look.p2)];
  const fn = PATTERNS[look.pattern] || PATTERNS.polos;
  const RED = [235, 45, 45];
  const hexCache = {};
  const hx = (s) => hexCache[s] || (hexCache[s] = hex(s));

  // Garis tepi jadi merah, badan gelap tetap gelap, badan terang sedikit memerah
  const warm = (c) => {
    if (c[0] === outline[0] && c[1] === outline[1] && c[2] === outline[2]) return RED;
    const L = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    if (L < 60) return c;
    return c.map((v, k) => Math.round(v + (RED[k] - v) * 0.4));
  };
  const toUrl = (img) => {
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    cv.getContext('2d').putImageData(img, 0, 0);
    return cv.toDataURL();
  };
  const out = {};

  for (const id of ids || RECOLOR) {
    const pid = PID[id] || id; // nama pola yang dipakai
    const src = await getSource(id);
    const w = src.width;
    const h = src.height;
    const bb = src.bb;

    // Mata: hanya diwarnai kalau warnanya diatur; selain itu dibiarkan asli
    if (EYE.has(id)) {
      const bg = id.endsWith('mata');
      const c1 = bg ? look.eyeBg : look.eyeColor;
      const c2 = bg ? c1 : look.odd ? look.eyeColor2 || c1 : c1;
      const eimg = new ImageData(new Uint8ClampedArray(src.data), w, h);
      if (c1 || c2) {
        const e = eimg.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (e[i + 3] === 0) continue;
            const L = e[i] * 0.3 + e[i + 1] * 0.59 + e[i + 2] * 0.11;
            if (bg ? L <= 215 : L > 215) continue; // latar mata: hanya bagian putih; pupil: bukan bagian putih
            const col = x - bb.minX + 0.5 < bb.w / 2 ? c1 : c2; // kiri atau kanan
            if (!col) continue;
            const rgb = hx(col);
            e[i] = rgb[0];
            e[i + 1] = rgb[1];
            e[i + 2] = rgb[2];
          }
        }
      }
      out[id] = toUrl(eimg);
      continue;
    }
    const img = new ImageData(new Uint8ClampedArray(src.data), w, h);
    const imgH = PID[id] ? new ImageData(new Uint8ClampedArray(src.data), w, h) : null;
    const d = img.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        const L = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        let c;
        if (L < 40) {
          if (grid) {
            const pc = patColor(look, id, x - bb.minX, y - bb.minY, bb.w, bb.h);
            c = pc ? hx(pc) : body;
          } else {
            c = cols[fn(pid, x - bb.minX, y - bb.minY, bb.w, bb.h)];
          }
        }
        else if (L > 215) c = outline;
        else if (KEEP_MID.has(id)) continue; // papan ketik: tidak diwarnai
        else c = body.map((v, k) => v + (outline[k] - v) * (L / 255));
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        if (imgH) {
          const hc = warm(c);
          imgH.data[i] = hc[0];
          imgH.data[i + 1] = hc[1];
          imgH.data[i + 2] = hc[2];
        }
      }
    }

    out[id] = toUrl(img);
    if (imgH) out[id + '_H'] = toUrl(imgH);
  }
  return out;
}

// Mata tertutup pose mengetik: diambil dari layer mata.png,
// hanya baris tengah yang disisakan (jadi satu garis per mata), warna garis tepi.
async function closedEyes(look) {
  const outline = hex(look.outline);
  const img = await loadImage(dataUrl('cat/typing/mata.png'));
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  let minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const mid = Math.round((minY + maxY) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      if (y === mid) {
        d[i] = outline[0];
        d[i + 1] = outline[1];
        d[i + 2] = outline[2];
        d[i + 3] = 255;
      } else {
        d[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return cv.toDataURL();
}

// Gambar kucing utuh (untuk pratinjau di panel)
async function composite(look) {
  const rig = JSON.parse(fs.readFileSync(path.join(ASSETS, 'cat', 'rig.json'), 'utf8'));
  const layers = rig.layers.filter((l) => l.id !== 'mata_tidur');
  const urls = await recolorAll(look, layers.map((l) => l.id).filter((id) => RECOLOR.includes(id)));
  const imgs = await Promise.all(
    layers.map((l) => loadImage(RECOLOR.includes(l.id) ? urls[l.id] : dataUrl('cat/' + l.file)))
  );
  const c = document.createElement('canvas');
  c.width = imgs[0].naturalWidth;
  c.height = imgs[0].naturalHeight;
  const ctx = c.getContext('2d');
  imgs.forEach((img) => ctx.drawImage(img, 0, 0));
  return c;
}

// ===== Editor pola piksel =====
const PART_KEYS = ['earL', 'earR', 'head', 'body', 'arm', 'foot', 'tail'];

// Warna kisi untuk satu piksel di satu layer; null = pakai warna badan.
// Posisi dipetakan relatif ke kotak pembatas layer, jadi pola ikut ke semua pose.
function patColor(look, id, xRel, yRel, bw, bh) {
  const kind = PART_OF[id];
  if (!kind) return null;
  let key = kind;
  let segW = bw;
  let xl = xRel;
  if (kind === 'ears') {
    const half = Math.ceil(bw / 2);
    if (xRel + 0.5 < bw / 2) key = 'earL';
    else {
      key = 'earR';
      xl = xRel - (bw - half);
    }
    segW = half;
  }
  const g = look.parts[key];
  if (!g || !g.px) return null;
  const gx = Math.min(g.w - 1, Math.max(0, Math.floor(((xl + 0.5) / segW) * g.w)));
  const gy = Math.min(g.h - 1, Math.max(0, Math.floor(((yRel + 0.5) / bh) * g.h)));
  return g.px[gy * g.w + gx] || null;
}

// Ukuran kisi tiap bagian (piksel), dari layer acuan
async function gridDims() {
  const s = {};
  for (const k of Object.keys(GRID_REF)) s[k] = (await getSource(GRID_REF[k])).bb;
  const earW = Math.ceil(s.ears.w / 2);
  return {
    earL: { w: earW, h: s.ears.h },
    earR: { w: earW, h: s.ears.h },
    head: { w: s.head.w, h: s.head.h },
    body: { w: s.body.w, h: s.body.h },
    arm: { w: s.arm.w, h: s.arm.h },
    foot: { w: s.foot.w, h: s.foot.h },
    tail: { w: s.tail.w, h: s.tail.h },
  };
}

// Bentuk tiap bagian untuk editor: kecerahan tiap sel (-1 = kosong)
async function silhouette() {
  const dims = await gridDims();
  const out = {};
  for (const key of PART_KEYS) {
    const ref = key === 'earL' || key === 'earR' ? 'kuping' : GRID_REF[key];
    const src = await getSource(ref);
    const { w, h } = dims[key];
    const ox = src.bb.minX + (key === 'earR' ? src.bb.w - w : 0);
    const L = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((src.bb.minY + y) * src.width + (ox + x)) * 4;
        const d = src.data;
        L.push(d[i + 3] === 0 ? -1 : d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      }
    }
    out[key] = { w, h, L };
  }
  return out;
}

// Membuat tampilan berisi kisi dari preset lama (nama preset atau objek look.json lama)
const LEGACY_ID = { earL: 'kuping', earR: 'kuping', head: 'kepala', body: 'badan', arm: 'tangan', foot: 'tangan', tail: 'ekor' };
async function fromPreset(nameOrLook) {
  const base = typeof nameOrLook === 'string' ? PRESETS[nameOrLook] : nameOrLook;
  const dims = await gridDims();
  const fn = PATTERNS[base.pattern] || PATTERNS.polos;
  const cols = ['', base.p1 || '', base.p2 || ''];
  const parts = {};
  for (const key of PART_KEYS) {
    const { w, h } = dims[key];
    const px = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) px.push(cols[fn(LEGACY_ID[key], x, y, w, h)] || '');
    }
    parts[key] = { w, h, px };
  }
  return {
    body: base.body,
    outline: base.outline,
    parts,
    eyeBg: base.eyeBg || null,
    eyeColor: base.eyeColor || null,
    odd: !!base.odd,
    eyeColor2: base.eyeColor2 || null,
  };
}

module.exports = { PRESETS, PART_KEYS, recolorAll, closedEyes, composite, gridDims, silhouette, fromPreset };