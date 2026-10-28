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
  kaki_kiri: 'cat/model/kaki_kiri.png',
  kaki_kanan: 'cat/model/kaki_kanan.png',
  kumis: 'cat/model/kumis.png',
  mata: 'cat/model/mata.png',
  pupil: 'cat/model/pupil.png',
  mata_tidur: 'cat/model/mata.png',
  t_badan: 'cat/typing/badan.png',
  t_hand_left: 'cat/typing/hand_left_clicked.png',
  t_hand_right: 'cat/typing/hand_right_clicked.png',
  t_kepala: 'cat/typing/kepala.png',
  t_kuping: 'cat/typing/kuping.png',
  t_ekor: 'cat/typing/ekor.png',
  s_badan: 'cat/scroll/badan.png',
  s_kepala: 'cat/scroll/kepala.png',
  s_kuping: 'cat/scroll/kuping.png',
  s_ekor: 'cat/scroll/ekor.png',
  s_tangan_kiri: 'cat/scroll/tangan_kiri.png',
  s_tangan_kanan: 'cat/scroll/tangan_kanan.png',
  s_kaki_kiri: 'cat/scroll/kaki_kiri.png',
  s_kaki_kanan: 'cat/scroll/kaki_kanan.png',
  t_mata: 'cat/typing/mata.png',
  t_pupil: 'cat/typing/pupil.png',
  t_mata_tidur: 'cat/typing/mata_tidur.png',
  s_mata: 'cat/scroll/mata.png',
  s_pupil: 'cat/scroll/pupil.png',
  s_mata_tidur: 'cat/scroll/mata_tidur.png',
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
const INNER_RING = false; // true = tiap bagian diberi garis tepi sendiri di dalam bentuknya
// ring: piksel terluar bagian diwarnai garis tepi. pid: nama pola untuk preset lama.
const MODEL = {
  badan: { ring: true, pid: 'badan' },
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
};

function solidAt(src, x, y) {
  return x >= 0 && y >= 0 && x < src.width && y < src.height && src.data[(y * src.width + x) * 4 + 3] > 0;
}
function isRing(src, x, y) {
  return !(solidAt(src, x - 1, y) && solidAt(src, x + 1, y) && solidAt(src, x, y - 1) && solidAt(src, x, y + 1));
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
      if (M.whisker) { set(i, c.outline); continue; }
      if (M.eye === 'bg') { set(i, bgCol); continue; }
      if (M.eye === 'iris') { set(i, c.hx(x - bb.minX + 0.5 < bb.w / 2 ? irisA : irisB)); continue; }
      const role = ROLE[hex6(sd[i], sd[i + 1], sd[i + 2])];
      if (!role) { set(i, [255, 0, 255]); continue; } // warna di luar tabel: magenta agar kelihatan
      if (INNER_RING && M.ring && isRing(src, x, y)) { set(i, c.outline); continue; }
      const xr = x - bb.minX;
      const yr = y - bb.minY;
      let col;
      if (c.grid) {
        const pc = patColor(look, id, xr, yr, bb.w, bb.h);
        col = pc ? c.hx(pc) : c.body;
      } else if (PAW_ROLES.has(role)) col = c.cols[look.pattern === 'tuxedo' ? 1 : 0];
      else col = M.pid === 'tangan' ? c.cols[0] : c.cols[c.fn(M.pid, xr, yr, bb.w, bb.h)];
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
      out[id] = toUrl(renderModel(id, MODEL[id], src, look, { body, outline, grid, cols, fn, hx }));
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
  arm: 'tangan_kiri', foot: 'kaki_kiri', tail: 'ekor',
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