const { ipcRenderer } = require('electron');
const Look = require('../pet/look.js');

const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const PALETTE = [
  '#ffffff', '#d9d9d9', '#8c8c8c', '#4a4a4a', '#000000', '#fff1d0', '#f2c98a', '#e09a4b',
  '#b8641c', '#7a4420', '#4a2a14', '#f4b6c8', '#e0698f', '#a63a5c', '#8ad3c4', '#7a9cff',
];
const LABEL = {
  earL: 'Kuping kiri', earR: 'Kuping kanan', head: 'Kepala', body: 'Badan',
  arm: 'Tangan', foot: 'Kaki', tail: 'Ekor',
};
const EYE_BG_DEFAULT = '#ffffff';
const EYE_DEFAULT = '#5b8cff';

let look = null; // tampilan yang sedang diedit
let baseline = null; // tampilan awal, untuk tombol Buang
let dims = null;
let sil = null;
let tool = 'paint'; // paint, fill, erase
let brush = 3;
let color = '#e09a4b';
let mirror = false; // melukis dua sisi sekaligus
let hover = null; // sel yang sedang disentuh mouse: { key, x, y }
let mine = []; // preset buatan pemilik
const history = []; // riwayat lukisan untuk Urungkan
const canv = {};

function send() {
  ipcRenderer.send('look-set', look);
}

// ===== Pratinjau =====
let busy = false;
let dirty = false;
async function renderPreview() {
  if (busy) {
    dirty = true;
    return;
  }
  busy = true;
  do {
    dirty = false;
    try {
      const c = await Look.composite(look);
      const p = $('preview');
      p.width = c.width;
      p.height = c.height;
      p.getContext('2d').drawImage(c, 0, 0);
    } catch (e) {}
  } while (dirty);
  busy = false;
}

// ===== Kisi pola =====
const cellSize = (key) => Math.max(5, Math.min(12, Math.floor(190 / Math.max(dims[key].w, dims[key].h))));

function drawGrid(key) {
  const cv = canv[key];
  const g = look.parts[key];
  const s = sil[key];
  const cs = cellSize(key);
  const ctx = cv.getContext('2d');
  const body = rgb(look.body);
  const outline = rgb(look.outline);
  ctx.fillStyle = '#2b2140';
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const L = s.L[y * g.w + x];
      if (L < 0) continue;
      let col;
      if (L < 40) col = g.px[y * g.w + x] || look.body;
      else if (L > 215) col = look.outline;
      else {
        const m = body.map((v, k) => Math.round(v + (outline[k] - v) * (L / 255)));
        col = `rgb(${m[0]},${m[1]},${m[2]})`;
      }
      ctx.fillStyle = col;
      ctx.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < g.w; x++) {
    ctx.moveTo(x * cs + 0.5, 0);
    ctx.lineTo(x * cs + 0.5, cv.height);
  }
  for (let y = 1; y < g.h; y++) {
    ctx.moveTo(0, y * cs + 0.5);
    ctx.lineTo(cv.width, y * cs + 0.5);
  }
  ctx.stroke();

  // Sumbu cermin: garis putus-putus pink (hanya saat Cermin ON, tidak untuk kuping)
  if (mirror && key !== 'earL' && key !== 'earR') {
    const ax = (g.w / 2 + mirrorShift(key) / 2) * cs;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.moveTo(ax, 0);
    ctx.lineTo(ax, cv.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawHover(key, ctx, cs);
}

const drawAll = () => Look.PART_KEYS.forEach(drawGrid);

// Pasangan cermin: kuping kiri <-> kuping kanan, bagian lain bercermin di kisinya sendiri
const otherKey = (key) => (key === 'earL' ? 'earR' : key === 'earR' ? 'earL' : key);

// Geser sumbu cermin per kisi (satuan setengah sel; 0 = tepat di tengah kisi). Kuping selalu 0.
const mirrorShift = (key) => (key === 'earL' || key === 'earR' ? 0 : (look.mirrorX && look.mirrorX[key]) || 0);

// Hanya piksel isi badan yang bisa dilukis (bukan garis tepi, bukan area kosong)
function paintable(key, x, y) {
  const g = look.parts[key];
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return false;
  const L = sil[key].L[y * g.w + x];
  return L >= 0 && L < 40;
}

// Kotak-kotak kuas di (gx, gy), termasuk kotak bayangan kalau cermin aktif
function brushRects(key, gx, gy) {
  const o = Math.floor((brush - 1) / 2);
  const x0 = gx - o;
  const y0 = gy - o;
  const rects = [{ k: key, x: x0, y: y0 }];
  if (mirror) {
    const mk = otherKey(key);
    rects.push({ k: mk, x: look.parts[mk].w - (x0 + brush) + mirrorShift(key), y: y0 });
  }
  return rects;
}

function paintAt(key, gx, gy, erase) {
  for (const r of brushRects(key, gx, gy)) {
    const g = look.parts[r.k];
    for (let dy = 0; dy < brush; dy++) {
      for (let dx = 0; dx < brush; dx++) {
        const x = r.x + dx;
        const y = r.y + dy;
        if (!paintable(r.k, x, y)) continue;
        g.px[y * g.w + x] = erase ? '' : color;
      }
    }
  }
}

// Area bersambung (atas, bawah, kiri, kanan) dengan warna yang sama dengan sel awal
function floodCells(key, sx, sy) {
  if (!paintable(key, sx, sy)) return [];
  const g = look.parts[key];
  const target = g.px[sy * g.w + sx] || '';
  const seen = new Set();
  const stack = [[sx, sy]];
  const out = [];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!paintable(key, x, y)) continue;
    const i = y * g.w + x;
    if (seen.has(i)) continue;
    seen.add(i);
    if ((g.px[i] || '') !== target) continue;
    out.push([key, x, y]);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

function fillCells(key, gx, gy) {
  let cells = floodCells(key, gx, gy);
  if (mirror) {
    const mk = otherKey(key);
    cells = cells.concat(floodCells(mk, look.parts[mk].w - 1 - gx + mirrorShift(key), gy));
  }
  return cells;
}

function applyFill(key, gx, gy, erase) {
  for (const [k, x, y] of fillCells(key, gx, gy)) {
    const g = look.parts[k];
    g.px[y * g.w + x] = erase ? '' : color;
  }
}

// Kisi mana saja yang perlu digambar ulang untuk sebuah posisi mouse
function affected(h) {
  if (!h) return [];
  const ks = [h.key];
  if (mirror && otherKey(h.key) !== h.key) ks.push(otherKey(h.key));
  return ks;
}

function setHover(h) {
  const old = hover;
  if (old && h && old.key === h.key && old.x === h.x && old.y === h.y) return;
  hover = h;
  new Set([...affected(old), ...affected(h)]).forEach(drawGrid);
}

// Pratinjau di atas kisi: kotak kuas berwarna, atau area yang akan terisi
function drawHover(key, ctx, cs) {
  if (!hover) return;
  const erase = tool === 'erase';
  if (tool === 'fill') {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    for (const [k, x, y] of fillCells(hover.key, hover.x, hover.y)) {
      if (k === key) ctx.fillRect(x * cs, y * cs, cs, cs);
    }
    ctx.globalAlpha = 1;
    return;
  }
  for (const r of brushRects(hover.key, hover.x, hover.y)) {
    if (r.k !== key) continue;
    ctx.globalAlpha = erase ? 0.45 : 0.9;
    ctx.fillStyle = erase ? '#ffffff' : color;
    for (let dy = 0; dy < brush; dy++) {
      for (let dx = 0; dx < brush; dx++) {
        if (paintable(key, r.x + dx, r.y + dy)) ctx.fillRect((r.x + dx) * cs, (r.y + dy) * cs, cs, cs);
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash(erase ? [4, 3] : []);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(r.x * cs + 1.5, r.y * cs + 1.5, brush * cs - 3, brush * cs - 3);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2b2140';
    ctx.strokeRect(r.x * cs + 1.5, r.y * cs + 1.5, brush * cs - 3, brush * cs - 3);
    ctx.setLineDash([]);
  }
}

function pushHistory() {
  history.push(JSON.stringify(look.parts));
  if (history.length > 30) history.shift();
}

function undo() {
  if (!history.length) return;
  look.parts = JSON.parse(history.pop());
  drawAll();
  renderPreview();
  send();
}

function bindCanvas(key, cv) {
  let down = false;
  let erase = false;
  const cell = (e) => {
    const r = cv.getBoundingClientRect();
    const cs = cellSize(key);
    return [Math.floor((e.clientX - r.left) / cs), Math.floor((e.clientY - r.top) / cs)];
  };
  const stroke = (e) => {
    const [x, y] = cell(e);
    hover = { key, x, y };
    paintAt(key, x, y, erase);
    affected(hover).forEach(drawGrid);
    renderPreview();
  };
  cv.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const [x, y] = cell(e);
    hover = { key, x, y };
    erase = e.button === 2 || tool === 'erase';
    pushHistory();
    if (tool === 'fill') {
      applyFill(key, x, y, erase);
      affected(hover).forEach(drawGrid);
      renderPreview();
      send();
      return;
    }
    down = true;
    stroke(e);
  });
  cv.addEventListener('mousemove', (e) => {
    if (down) stroke(e);
    else {
      const [x, y] = cell(e);
      setHover({ key, x, y });
    }
  });
  cv.addEventListener('mouseleave', () => setHover(null));
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mouseup', () => {
    if (!down) return;
    down = false;
    send();
  });
}

const axLabels = {};
const axText = (key) => {
  const m = mirrorShift(key);
  return m === 0 ? '0' : (m > 0 ? '+' : '') + m;
};

// Tombol geser sumbu cermin di samping judul tiap kisi
function axisControls(key) {
  const box = document.createElement('span');
  box.className = 'ax';
  box.title = 'Geser sumbu cermin (terlihat saat Cermin ON)';
  const val = document.createElement('span');
  val.className = 'axv';
  axLabels[key] = val;
  const mk = (txt, d) => {
    const b = document.createElement('button');
    b.className = 'chip sm';
    b.textContent = txt;
    b.onclick = () => {
      look.mirrorX = look.mirrorX || {};
      look.mirrorX[key] = Math.max(-6, Math.min(6, mirrorShift(key) + d));
      val.textContent = axText(key);
      drawGrid(key);
      send();
    };
    return b;
  };
  box.append(mk('<', -1), val, mk('>', 1));
  return box;
}

function buildGrids() {
  const box = $('grids');
  box.innerHTML = '';
  for (const key of Look.PART_KEYS) {
    const { w, h } = dims[key];
    const cs = cellSize(key);
    const part = document.createElement('div');
    part.className = 'part';
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = LABEL[key];
    const head = document.createElement('div');
    head.className = 'phead';
    head.appendChild(tag);
    if (key !== 'earL' && key !== 'earR') head.appendChild(axisControls(key));
    const wrap = document.createElement('div');
    wrap.className = 'cwrap';
    const cv = document.createElement('canvas');
    cv.width = w * cs;
    cv.height = h * cs;
    canv[key] = cv;
    bindCanvas(key, cv);
    wrap.appendChild(cv);
    part.append(head, wrap);
    box.appendChild(part);
  }
}

// ===== Alat =====
function refreshTools() {
  document.querySelectorAll('#tools .chip').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  $('bMirror').classList.toggle('on', mirror);
  $('bMirror').textContent = mirror ? 'Cermin: ON' : 'Cermin: OFF';
  affected(hover).forEach(drawGrid);
  document.querySelectorAll('#brushes .chip').forEach((b) => b.classList.toggle('on', Number(b.dataset.brush) === brush));
  document.querySelectorAll('#palette .sw').forEach((b) => b.classList.toggle('on', b.dataset.color === color));
}

function buildPalette() {
  PALETTE.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'sw';
    b.style.background = c;
    b.dataset.color = c;
    b.onclick = () => {
      color = c;
      if (tool === 'erase') tool = 'paint';
      $('cCustom').value = c;
      refreshTools();
    };
    $('palette').appendChild(b);
  });
}

document.querySelectorAll('#tools .chip').forEach((b) =>
  b.addEventListener('click', () => {
    tool = b.dataset.tool;
    refreshTools();
  })
);
document.querySelectorAll('#brushes .chip').forEach((b) =>
  b.addEventListener('click', () => {
    brush = Number(b.dataset.brush);
    refreshTools();
  })
);
$('cCustom').addEventListener('input', () => {
  color = $('cCustom').value;
  if (tool === 'erase') tool = 'paint';
  refreshTools();
});
$('bMirror').addEventListener('click', () => {
  mirror = !mirror;
  refreshTools();
  drawAll();
});

// ===== Tampilan dan mata =====
function fillInputs() {
  $('cBody').value = look.body;
  $('cOutline').value = look.outline;
  $('eBg').value = look.eyeBg || EYE_BG_DEFAULT;
  $('eIris').value = look.eyeColor || EYE_DEFAULT;
  $('eIris2').value = look.eyeColor2 || look.eyeColor || EYE_DEFAULT;
  $('eBgNote').textContent = look.eyeBg ? '' : '(asli)';
  $('eIrisNote').textContent = look.eyeColor ? '' : '(asli)';
  $('eIris2Note').textContent = look.eyeColor2 ? '' : '(asli)';
  $('eOdd').checked = !!look.odd;
  $('eIris2row').style.display = look.odd ? '' : 'none';
  Object.keys(axLabels).forEach((k) => (axLabels[k].textContent = axText(k)));
}

$('cBody').addEventListener('input', () => {
  look.body = $('cBody').value;
  drawAll();
  renderPreview();
});
$('cBody').addEventListener('change', send);
$('cOutline').addEventListener('input', () => {
  look.outline = $('cOutline').value;
  drawAll();
  renderPreview();
});
$('cOutline').addEventListener('change', send);

function bindEye(id, field, resetId) {
  $(id).addEventListener('input', () => {
    look[field] = $(id).value;
    renderPreview();
  });
  $(id).addEventListener('change', () => {
    fillInputs();
    send();
  });
  $(resetId).onclick = () => {
    look[field] = null;
    fillInputs();
    renderPreview();
    send();
  };
}
bindEye('eBg', 'eyeBg', 'eBgReset');
bindEye('eIris', 'eyeColor', 'eIrisReset');
bindEye('eIris2', 'eyeColor2', 'eIris2Reset');
$('eOdd').addEventListener('change', () => {
  look.odd = $('eOdd').checked;
  fillInputs();
  renderPreview();
  send();
});

// ===== Preset =====
function normalize(l) {
  const out = clone(l);
  out.parts = out.parts || {};
  out.mirrorX = out.mirrorX || {};
  for (const key of Look.PART_KEYS) {
    const { w, h } = dims[key];
    const g = out.parts[key];
    if (!g || g.w !== w || g.h !== h || !Array.isArray(g.px) || g.px.length !== w * h) {
      out.parts[key] = { w, h, px: new Array(w * h).fill('') };
    }
  }
  return out;
}

function setLook(l, resetBase) {
  look = normalize(l);
  if (resetBase) {
    baseline = clone(look);
    history.length = 0;
  }
  fillInputs();
  drawAll();
  renderPreview();
  send();
}

function renderPresets() {
  const box = $('presets');
  box.innerHTML = '';
  Object.keys(Look.PRESETS).forEach((name) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = name[0].toUpperCase() + name.slice(1);
    b.onclick = async () => setLook(await Look.fromPreset(name), true);
    box.appendChild(b);
  });

  const m = $('mine');
  m.innerHTML = '';
  if (!mine.length) {
    m.textContent = 'Belum ada. Beri nama di kiri, lalu klik "Preset baru".';
    return;
  }
  mine.forEach((p, i) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = p.name;
    b.onclick = () => setLook(p.look, true);
    const x = document.createElement('button');
    x.className = 'chip';
    x.textContent = 'x';
    x.title = 'Hapus preset ini';
    x.onclick = () => {
      mine.splice(i, 1);
      ipcRenderer.send('presets-set', mine);
      renderPresets();
    };
    pill.append(b, x);
    m.appendChild(pill);
  });
}

$('pSave').onclick = () => {
  const name = $('pName').value.trim() || 'Preset ' + (mine.length + 1);
  mine.push({ name, look: clone(look) });
  ipcRenderer.send('presets-set', mine);
  baseline = clone(look);
  $('pName').value = '';
  renderPresets();
};
$('bDiscard').onclick = () => {
  look = clone(baseline);
  history.length = 0;
  fillInputs();
  drawAll();
  renderPreview();
  send();
};
$('bUndo').onclick = undo;
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault();
    undo();
  }
});

// ===== Mulai =====
(async () => {
  dims = await Look.gridDims();
  sil = await Look.silhouette();
  buildGrids();
  buildPalette();
  refreshTools();
  mine = (await ipcRenderer.invoke('presets-get')) || [];
  renderPresets();

  const saved = await ipcRenderer.invoke('look-get');
  const start = saved && saved.parts ? saved : await Look.fromPreset(saved || 'hitam');
  look = normalize(start);
  baseline = clone(look);
  fillInputs();
  drawAll();
  renderPreview();
})();

// ===== Pesan pengingat =====
let msgs = { name: '', messages: [] };

function saveMsgs() {
  msgs.name = $('uName').value.trim();
  ipcRenderer.send('msgs-set', msgs);
}

function renderMsgs() {
  const box = $('mList');
  box.innerHTML = '';
  msgs.messages.sort((a, b) => a.time.localeCompare(b.time));
  msgs.messages.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'msg';

    const on = document.createElement('input');
    on.type = 'checkbox';
    on.checked = m.enabled;
    on.onchange = () => {
      m.enabled = on.checked;
      saveMsgs();
    };

    const t = document.createElement('span');
    t.className = 't';
    t.textContent = m.time;

    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = m.text;

    const del = document.createElement('button');
    del.textContent = 'Hapus';
    del.onclick = () => {
      msgs.messages = msgs.messages.filter((q) => q !== m);
      renderMsgs();
      saveMsgs();
    };

    row.append(on, t, x, del);
    box.appendChild(row);
  });
}

$('mAdd').onclick = () => {
  const time = $('mTime').value;
  const text = $('mText').value.trim();
  if (!time || !text) return;
  msgs.messages.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time,
    text,
    enabled: true,
  });
  $('mText').value = '';
  renderMsgs();
  saveMsgs();
};
$('uName').addEventListener('change', saveMsgs);

(async () => {
  const saved = await ipcRenderer.invoke('msgs-get');
  if (saved) msgs = { name: saved.name || '', messages: saved.messages || [] };
  $('uName').value = msgs.name;
  renderMsgs();
})();

// ===== Catatan sematan =====
ipcRenderer.invoke('note-get').then((v) => ($('note').value = v || ''));
$('note').addEventListener('change', () => ipcRenderer.send('note-set', $('note').value));

// ===== Tab =====
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + t.dataset.tab));
  });
});