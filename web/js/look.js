// Pewarnaan ulang layer, pola, dan mata tertutup. Gambar dibaca lewat URL (assets/...).
// Dihitung dari lokasi file ini, jadi jalan dari jendela kucing maupun panel
const ASSETS = new URL('../assets/', import.meta.url).href;

const SRC = {
  badan: 'cat/model/badan.png',
  kepala: 'cat/model/kepala.png',
  kuping_kanan: 'cat/model/kuping_kanan.png',
  kuping_kiri: 'cat/model/kuping_kiri.png',
  ekor: 'cat/model/ekor.png',
  tangan_kiri: 'cat/model/tangan_kiri.png',
  tangan_kanan: 'cat/model/tangan_kanan.png',
  st_badan: 'cat/stand/badan.png',
  st_ekor: 'cat/stand/ekor.png',
  st_kaki_kanan: 'cat/stand/kaki_kanan.png',
  st_kaki_kiri: 'cat/stand/kaki_kiri.png',
  st_kepala: 'cat/stand/kepala.png',
  st_kumis: 'cat/stand/kumis.png',
  st_kuping_kanan: 'cat/stand/kuping_kanan.png',
  st_kuping_kiri: 'cat/stand/kuping_kiri.png',
  st_mata: 'cat/stand/mata.png',
  st_pupil: 'cat/stand/pupil.png',
  st_mata_tidur: 'cat/stand/mata.png',
  hand_kiri: 'cat/stand/typing_tangan_depan_kiri.png',
  hand_kanan: 'cat/stand/typing_tangan_depan_kanan.png',
  sr_badan: 'cat/stretch/badan.png',
  sr_ekor: 'cat/stretch/ekor.png',
  sr_kaki_kanan: 'cat/stretch/kaki_belakang_kanan.png',
  sr_kaki_kiri: 'cat/stretch/kaki_belakang_kiri.png',
  sr_kepala: 'cat/stretch/kepala.png',
  sr_kumis: 'cat/stretch/kumis.png',
  sr_kuping_kanan: 'cat/stretch/kuping_kanan.png',
  sr_kuping_kiri: 'cat/stretch/kuping_kiri.png',
  sr_mata: 'cat/stretch/mata.png',
  sr_pupil: 'cat/stretch/pupil.png',
  sr_mata_tidur: 'cat/stretch/mata.png',
  kumis: 'cat/model/kumis.png',
  mata: 'cat/model/mata.png',
  pupil: 'cat/model/pupil.png',
  mata_tidur: 'cat/model/mata.png',
  ty_badan: 'cat/typing/badan.png',
  ty_kepala: 'cat/typing/kepala.png',
  ty_kuping_kanan: 'cat/typing/kuping_kanan.png',
  ty_kuping_kiri: 'cat/typing/kuping_kiri.png',
  ty_kumis: 'cat/typing/kumis.png',
  ty_mata: 'cat/typing/mata.png',
  ty_pupil: 'cat/typing/pupil.png',
  ty_mata_tidur: 'cat/typing/mata.png',
  ty_hand_left: 'cat/typing/hand_left_clicked.png',
  ty_hand_right: 'cat/typing/hand_right_clicked.png',
};
const RECOLOR = Object.keys(SRC);
const EYE = new Set(['mata', 'pupil', 't_mata', 't_pupil', 's_mata', 's_pupil', 'c_mata', 'c_pupil']);
const CLOSED = new Set(['t_mata_tidur', 's_mata_tidur', 'c_mata_tidur']); // mata tertutup (kedip): seluruh piksel berwarna garis tepi

// Layer mana memakai kisi bagian mana (kuping dibagi dua: kiri dan kanan)
const PART_OF = {
  badan: 'body', t_badan: 'body', s_badan: 'body',
  t_hand_left: 'arm', t_hand_right: 'arm',
  kepala: 'head', t_kepala: 'head', s_kepala: 'head',
  kuping: 'ears', t_kuping: 'ears', s_kuping: 'ears',
  ekor: 'tail', t_ekor: 'tail', s_ekor: 'tail',
  tangan: 'arm', s_tangan_kiri: 'arm', s_tangan_kanan: 'arm',
  c_tangan_kiri: 'arm', c_tangan_kanan: 'arm',
  c_badan: 'body', c_kepala: 'head', c_ekor: 'tail',
  c_kaki_kiri: 'foot', c_kaki_kanan: 'foot',
  s_kaki_kiri: 'foot', s_kaki_kanan: 'foot',
  kuping_kanan: 'earL', kuping_kiri: 'earR',
  ty_badan: 'body', ty_kepala: 'head',
  ty_kuping_kanan: 'earL', ty_kuping_kiri: 'earR',
  ty_hand_left: 'arm', ty_hand_right: 'arm',
  st_badan: 'body', st_kepala: 'head', st_ekor: 'tail',
  st_kuping_kanan: 'earL', st_kuping_kiri: 'earR',
  st_kaki_kanan: 'foot', st_kaki_kiri: 'foot',
  hand_kiri: 'arm', hand_kanan: 'arm',
  sr_badan: 'body', sr_kepala: 'head', sr_ekor: 'tail',
  sr_kuping_kanan: 'earL', sr_kuping_kiri: 'earR',
  sr_kaki_kanan: 'arm', sr_kaki_kiri: 'arm',
  tangan_kiri: 'arm', tangan_kanan: 'arm',
  kaki_kiri: 'foot', kaki_kanan: 'foot',
};

// Layer ini memakai pola layer idle-nya, dan dibuatkan versi merah (akhiran _H)
const PID = {
  t_badan: 'badan', t_hand_left: 'tangan', t_hand_right: 'tangan',
  t_kepala: 'kepala', t_kuping: 'kuping', t_ekor: 'ekor',
  s_badan: 'badan', s_kepala: 'kepala', s_kuping: 'kuping', s_ekor: 'ekor',
  s_tangan_kiri: 'tangan', s_tangan_kanan: 'tangan', s_kaki_kiri: 'tangan', s_kaki_kanan: 'tangan',
  c_tangan_kiri: 'tangan', c_tangan_kanan: 'tangan',
  c_badan: 'badan', c_kepala: 'kepala', c_ekor: 'ekor',
  c_kaki_kiri: 'tangan', c_kaki_kanan: 'tangan',
};

const CX_HEAD = 0.5;
const CX_BODY = 0.5;

export const PRESETS = {
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

// 0 = warna badan, 1 = warna pola, 2 = warna pola 2
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat ' + src));
    img.src = src;
  });
}

const sources = {};
async function getSource(id) {
  if (sources[id]) return sources[id];
  const img = await loadImage(ASSETS + SRC[id]);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);

  // Kotak pembatas piksel yang terisi (titik tengah tiap layer)
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

// Warna kisi untuk satu piksel (look.json format baru); null = pakai warna badan
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

// Mengembalikan { badan: dataURL, t_badan: ..., t_badan_H: ... } yang sudah diwarnai.
// ===== Sprite berformat ID warna (assets/cat/model/) =====
// Tiap piksel dikenali dari warna persisnya (hex), bukan kecerahan.
const hex6 = (r, g, b) => ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
const ROLE = {
  '005130': 'tail', 'ffd800': 'body', '524b24': 'arm', 'cbdbfc': 'paw', 'ac3232': 'ear',
  '99e550': 'head', '004715': 'whisker', '8a6f30': 'eyebg', 'ffffff': 'iris',
  '76428a': 'leg', '5b6ee1': 'footpad',
};
const PAW_ROLES = new Set(['paw', 'footpad']);
// Sprite yang butuh versi merah (_H) untuk mode panas saat mengetik
const HEATED = new Set(['ekor', 'ty_badan', 'ty_hand_left', 'ty_hand_right', 'ty_kepala', 'ty_kuping_kanan', 'ty_kuping_kiri']);
const INNER_RING = false; // true = tiap bagian diberi garis tepi sendiri di dalam bentuknya
const WHISKER_COLOR = null; // null = warna garis tepi; atau isi hex, misalnya '#2b2140'
// ring: piksel terluar bagian diwarnai garis tepi. pid: nama pola untuk preset lama.
const MODEL = {
  badan: { ring: true, pid: 'badan' },
  ty_badan: { ring: true, pid: 'badan' },
  ty_kepala: { ring: true, pid: 'kepala' },
  ty_kuping_kanan: { ring: true, pid: 'kuping' },
  ty_kuping_kiri: { ring: true, pid: 'kuping' },
  ty_hand_left: { ring: true, pid: 'tangan', parts: true },
  ty_hand_right: { ring: true, pid: 'tangan', parts: true },
  ty_kumis: { whisker: true },
  ty_mata: { eye: 'bg' },
  ty_pupil: { eye: 'iris' },
  ty_mata_tidur: { closed: true },
  kepala: { ring: true, pid: 'kepala' },
  kuping_kanan: { ring: true, pid: 'kuping' },
  kuping_kiri: { ring: true, pid: 'kuping' },
  ekor: { ring: true, pid: 'ekor' },
  tangan_kiri: { ring: true, pid: 'tangan' },
  tangan_kanan: { ring: true, pid: 'tangan' },
  kaki_kiri: { ring: true, pid: 'tangan' },
  kaki_kanan: { ring: true, pid: 'tangan' },
  kumis: { whisker: true },
  mata: { eye: 'bg' },
  pupil: { eye: 'iris' },
  mata_tidur: { closed: true },
  st_badan: { ring: true, pid: 'badan' },
  st_ekor: { ring: true, pid: 'ekor' },
  st_kepala: { ring: true, pid: 'kepala' },
  st_kuping_kanan: { ring: true, pid: 'kuping' },
  st_kuping_kiri: { ring: true, pid: 'kuping' },
  st_kaki_kanan: { ring: true, pid: 'tangan' },
  st_kaki_kiri: { ring: true, pid: 'tangan' },
  hand_kiri: { ring: true, pid: 'tangan' },
  hand_kanan: { ring: true, pid: 'tangan' },
  st_kumis: { whisker: true },
  st_mata: { eye: 'bg' },
  st_pupil: { eye: 'iris' },
  st_mata_tidur: { closed: true },
  sr_badan: { ring: true, pid: 'badan' },
  sr_ekor: { ring: true, pid: 'ekor' },
  sr_kepala: { ring: true, pid: 'kepala' },
  sr_kuping_kanan: { ring: true, pid: 'kuping' },
  sr_kuping_kiri: { ring: true, pid: 'kuping' },
  sr_kaki_kanan: { ring: true, pid: 'tangan' },
  sr_kaki_kiri: { ring: true, pid: 'tangan' },
  sr_kumis: { whisker: true },
  sr_mata: { eye: 'bg' },
  sr_pupil: { eye: 'iris' },
  sr_mata_tidur: { closed: true },
};

// Layer tiap pose -> kunci URL hasil pewarnaan (dipakai celebrate.js, scroll.js, stretch.js)
export const STAND = {
  ekor: 'st_ekor', badan: 'st_badan', kaki_kanan: 'st_kaki_kanan', kaki_kiri: 'st_kaki_kiri',
  tangan_kanan: 'hand_kanan', tangan_kiri: 'hand_kiri',
  kuping_kanan: 'st_kuping_kanan', kuping_kiri: 'st_kuping_kiri', kepala: 'st_kepala',
  kumis: 'st_kumis', mata: 'st_mata', pupil: 'st_pupil', mata_tidur: 'st_mata_tidur',
};
export const STRETCH = {
  ekor: 'sr_ekor', badan: 'sr_badan', kaki_kanan: 'sr_kaki_kanan', kaki_kiri: 'sr_kaki_kiri', // kaki = kaki belakang
  tangan_kanan: 'hand_kanan', tangan_kiri: 'hand_kiri',
  kuping_kanan: 'sr_kuping_kanan', kuping_kiri: 'sr_kuping_kiri', kepala: 'sr_kepala',
  kumis: 'sr_kumis', mata: 'sr_mata', pupil: 'sr_pupil', mata_tidur: 'sr_mata_tidur',
};

function solidAt(src, x, y) {
  return x >= 0 && y >= 0 && x < src.width && y < src.height && src.data[(y * src.width + x) * 4 + 3] > 0;
}
function isRing(src, x, y) {
  return !(solidAt(src, x - 1, y) && solidAt(src, x + 1, y) && solidAt(src, x, y - 1) && solidAt(src, x, y + 1));
}

// Bagian bersambung (4 arah) di dalam satu sprite: label per piksel dan kotak pembatas tiap bagian.
// Dipakai sprite yang berisi beberapa bagian (dua kaki typing) supaya pola tidak meregang antar bagian.
function components(src) {
  const { width: w, height: h, data: d } = src;
  const label = new Int32Array(w * h).fill(-1);
  const boxes = [];
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      if (d[(sy * w + sx) * 4 + 3] === 0 || label[sy * w + sx] !== -1) continue;
      const n = boxes.length;
      const box = { minX: sx, maxX: sx, minY: sy, maxY: sy };
      const stack = [[sx, sy]];
      label[sy * w + sx] = n;
      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < box.minX) box.minX = x;
        if (x > box.maxX) box.maxX = x;
        if (y < box.minY) box.minY = y;
        if (y > box.maxY) box.maxY = y;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = ny * w + nx;
          if (label[k] !== -1 || d[k * 4 + 3] === 0) continue;
          label[k] = n;
          stack.push([nx, ny]);
        }
      }
      box.w = box.maxX - box.minX + 1;
      box.h = box.maxY - box.minY + 1;
      boxes.push(box);
    }
  }
  return { label, boxes };
}

function renderModel(id, M, src, look, c) {
  const { width: w, height: h, data: sd, bb } = src;
  const img = new ImageData(new Uint8ClampedArray(sd), w, h);
  const d = img.data;
  const set = (i, col) => {
    d[i] = col[0];
    d[i + 1] = col[1];
    d[i + 2] = col[2];
    d[i + 3] = 255;
  };
  const mid = Math.round(bb.minY + (bb.h - 1) / 2);
  const comp = M.parts ? components(src) : null;
  const bgCol = c.hx(look.eyeBg || '#ffffff');
  const irisA = look.eyeColor || '#5b8cff';
  const irisB = look.odd ? look.eyeColor2 || irisA : irisA;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] === 0) continue;
      if (M.closed) {
        if (y === mid) set(i, c.outline);
        else d[i + 3] = 0;
        continue;
      }
      if (M.whisker) { set(i, WHISKER_COLOR ? c.hx(WHISKER_COLOR) : c.outline); continue; }
      if (M.eye === 'bg') { set(i, bgCol); continue; }
      if (M.eye === 'iris') { set(i, c.hx(x - bb.minX + 0.5 < bb.w / 2 ? irisA : irisB)); continue; }
      const role = ROLE[hex6(sd[i], sd[i + 1], sd[i + 2])];
      if (!role) { set(i, [255, 0, 255]); continue; } // warna di luar tabel: magenta agar kelihatan
      if (INNER_RING && M.ring && isRing(src, x, y)) { set(i, c.outline); continue; }
      let xr = x - bb.minX;
      let yr = y - bb.minY;
      let bw = bb.w;
      let bh = bb.h;
      if (comp) {
        const cb = comp.boxes[comp.label[y * w + x]];
        xr = x - cb.minX;
        yr = y - cb.minY;
        bw = cb.w;
        bh = cb.h;
      }
      let col;
      if (c.grid) {
        const pc = patColor(look, id, xr, yr, bw, bh);
        col = pc ? c.hx(pc) : c.body;
      } else if (PAW_ROLES.has(role)) col = c.cols[look.pattern === 'tuxedo' ? 1 : 0];
      else col = M.pid === 'tangan' ? c.cols[0] : c.cols[c.fn(M.pid, xr, yr, bw, bh)];
      set(i, col);
    }
  }
  return img;
}

export async function recolorAll(look, ids) {
  const body = hex(look.body);
  const outline = hex(look.outline);
  const grid = !!look.parts;
  const cols = grid ? null : [body, hex(look.p1), hex(look.p2)];
  const fn = PATTERNS[look.pattern] || PATTERNS.polos;
  const RED = [235, 45, 45];
  const hexCache = {};
  const hx = (s) => hexCache[s] || (hexCache[s] = hex(s));

  const warm = (c) => {
    if (c[0] === outline[0] && c[1] === outline[1] && c[2] === outline[2]) return RED;
    const L = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    if (L < 60) return c.map((v, k) => Math.round(v + (RED[k] - v) * 0.35));
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
    const pid = PID[id] || id;
    const src = await getSource(id);
    const w = src.width;
    const h = src.height;
    const bb = src.bb;

    if (MODEL[id]) {
      const mimg = renderModel(id, MODEL[id], src, look, { body, outline, grid, cols, fn, hx });
      out[id] = toUrl(mimg);
      if (HEATED.has(id)) {
        const hh = new ImageData(new Uint8ClampedArray(mimg.data), mimg.width, mimg.height);
        const e = hh.data;
        for (let i = 0; i < e.length; i += 4) {
          if (e[i + 3] === 0) continue;
          const hc = warm([e[i], e[i + 1], e[i + 2]]);
          e[i] = hc[0];
          e[i + 1] = hc[1];
          e[i + 2] = hc[2];
        }
        out[id + '_H'] = toUrl(hh);
      }
      continue;
    }

    if (CLOSED.has(id)) {
      const cimg = new ImageData(new Uint8ClampedArray(src.data), w, h);
      const cd = cimg.data;
      for (let i = 0; i < cd.length; i += 4) {
        if (cd[i + 3] === 0) continue;
        cd[i] = outline[0];
        cd[i + 1] = outline[1];
        cd[i + 2] = outline[2];
        cd[i + 3] = 255;
      }
      out[id] = toUrl(cimg);
      continue;
    }

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
            if (bg ? L <= 215 : L > 215) continue;
            const col = x - bb.minX + 0.5 < bb.w / 2 ? c1 : c2;
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
    const imgH = PID[id] && id.startsWith('t_') ? new ImageData(new Uint8ClampedArray(src.data), w, h) : null;
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
        } else if (L > 215) c = outline;
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

// ===== Untuk panel kustomisasi =====
export const PART_KEYS = ['earL', 'earR', 'head', 'body', 'arm', 'foot', 'tail'];

// Ukuran kisi = ukuran kotak pembatas layer acuan ini
const GRID_REF = {
  earL: 'kuping_kanan', earR: 'kuping_kiri', head: 'kepala', body: 'badan',
  arm: 'hand_kiri', foot: 'st_kaki_kiri', tail: 'ekor',
};

// Ukuran kisi tiap bagian (piksel), dari layer acuan
export async function gridDims() {
  const s = {};
  for (const k of Object.keys(GRID_REF)) {
    const bb = (await getSource(GRID_REF[k])).bb;
    s[k] = { w: bb.w, h: bb.h };
  }
  return s;
}

// Bentuk tiap bagian untuk editor: kecerahan tiap sel (-1 = kosong)
export async function silhouette() {
  const dims = await gridDims();
  const out = {};
  for (const key of PART_KEYS) {
    const src = await getSource(GRID_REF[key]);
    const { w, h } = dims[key];
    const L = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = src.bb.minX + x;
        const py = src.bb.minY + y;
        // -1 kosong, 255 = garis tepi (tidak bisa dilukis), 0 = bisa dilukis
        L.push(!solidAt(src, px, py) ? -1 : INNER_RING && isRing(src, px, py) ? 255 : 0);
      }
    }
    out[key] = { w, h, L };
  }
  return out;
}

// Membuat tampilan berisi kisi dari preset lama (nama preset atau objek look.json lama)
const LEGACY_ID = { earL: 'kuping', earR: 'kuping', head: 'kepala', body: 'badan', arm: 'tangan', foot: 'tangan', tail: 'ekor' };
export async function fromPreset(nameOrLook) {
  const base = typeof nameOrLook === 'string' ? PRESETS[nameOrLook] : nameOrLook;
  const dims = await gridDims();
  const fn = PATTERNS[base.pattern] || PATTERNS.polos;
  const cols = ['', base.p1 || '', base.p2 || ''];
  const parts = {};
  for (const key of PART_KEYS) {
    const { w, h } = dims[key];
    const src = await getSource(GRID_REF[key]);
    const px = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let idx;
        if (key === 'arm' || key === 'foot') {
          const i = ((src.bb.minY + y) * src.width + (src.bb.minX + x)) * 4;
          const paw = src.data[i + 3] > 0 && PAW_ROLES.has(ROLE[hex6(src.data[i], src.data[i + 1], src.data[i + 2])]);
          idx = paw && base.pattern === 'tuxedo' ? 1 : 0;
        } else idx = fn(LEGACY_ID[key], x, y, w, h);
        px.push(cols[idx] || '');
      }
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

// Gambar kucing utuh (untuk pratinjau di panel)
export async function composite(look) {
  const rig = await (await fetch(ASSETS + 'cat/rig.json')).json();
  const layers = rig.layers.filter((l) => l.id !== 'mata_tidur');
  const urls = await recolorAll(look, layers.map((l) => l.id).filter((id) => RECOLOR.includes(id)));
  const imgs = await Promise.all(
    layers.map((l) => loadImage(RECOLOR.includes(l.id) ? urls[l.id] : ASSETS + 'cat/' + l.file))
  );
  const c = document.createElement('canvas');
  c.width = imgs[0].naturalWidth;
  c.height = imgs[0].naturalHeight;
  const ctx = c.getContext('2d');
  imgs.forEach((img) => ctx.drawImage(img, 0, 0));
  return c;
}