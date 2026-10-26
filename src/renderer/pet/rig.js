const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const S = require('./state');
const Look = require('./look.js');
const Scroll = require('./scroll');
const Celebrate = require('./celebrate');
const Drink = require('./drink');

const pct = (v) => v * 100 + '%';

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.className = 'layer';
    img.draggable = false;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat ' + src));
    img.src = src;
  });
}

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

// Pose mengetik, disusun dari layer terpisah di assets/cat/typing/.
// Urutan tumpuk dari bawah: ekor, click1/click2 (badan + kaki + papan ketik),
// kuping, kepala, kumis, mata, pupil, mata tertutup.
// Bagian berwarna punya versi merah (H) di atasnya; seberapa merah diatur lewat opacity di animate.js.
function buildTyping() {
  const shift = S.TYPE_SHIFT_Y * S.SCALE + 'px';
  const T = {};
  S.typ = T;
  T.box = mkDiv(S.stage);
  T.box.style.display = 'none';
  T.box.style.transform = `translateY(${shift})`;

  // Gambar dasar + versi merahnya
  const pair = (parent) => {
    const base = mkImg();
    const hot = mkImg();
    hot.style.opacity = '0';
    parent.append(base, hot);
    return [base, hot];
  };

  T.tailBox = mkDiv(T.box);
  T.tailBox.style.transformOrigin = pct(S.TAIL_PIVOT[0]) + ' ' + pct(S.TAIL_PIVOT[1]);
  [T.tail, T.tailH] = pair(T.tailBox);

  T.clicks = [0, 1].map(() => {
    const [img, imgH] = pair(T.box);
    return { img, imgH };
  });

  T.headBox = mkDiv(T.box);
  [T.kuping, T.kupingH] = pair(T.headBox);
  [T.kepala, T.kepalaH] = pair(T.headBox);
  T.kumis = mkImg();
  T.mata = mkImg();
  T.pupil = mkImg();
  T.closed = mkImg();
  T.kumis.src = S.BASE + 'cat/typing/kumis.png'; // tidak diwarnai ulang
  T.kumis.style.transform = `translate(${S.WHISKER_DX * S.SCALE}px, ${S.WHISKER_DY * S.SCALE}px)`;
  T.mata.src = S.BASE + 'cat/typing/mata.png';
  T.pupil.src = S.BASE + 'cat/typing/pupil.png';
  T.closed.style.display = 'none';
  T.headBox.append(T.kumis, T.mata, T.pupil, T.closed);

  // Gelembung frustrasi (digambar di kanvas yang sama dengan pose ketik)
  for (const f of ['effects/gelembung2.png', 'effects/gelembung4.png']) {
    const img = mkImg();
    img.src = S.BASE + f;
    img.style.display = 'none';
    img.style.transform = `translateY(${shift})`;
    S.stage.appendChild(img);
    S.angryImgs.push(img);
  }
}

async function buildRig() {
  S.rig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', '..', 'assets', 'cat', 'rig.json'), 'utf8')
  );
  S.stage = document.getElementById('stage');
  S.hud = document.getElementById('hud');

  const imgs = await Promise.all(S.rig.layers.map((l) => loadImg(S.BASE + 'cat/' + l.file)));

  // Ukuran dibaca otomatis dari gambar, skala bilangan bulat
  const size = imgs[0].naturalWidth;
  S.SCALE = Math.max(1, Math.floor(190 / size));
  const px = size * S.SCALE;
  S.stage.style.width = px + 'px';
  S.stage.style.height = px + 'px';
  S.stage.style.left = (S.WIN - px) / 2 + 'px';
  S.stage.style.top = (S.WIN - px) / 2 + 'px';
  S.stage.style.transformOrigin = '50% 25%';

  S.rig.layers.forEach((l, i) => {
    if (!S.groups[l.group]) {
      const g = document.createElement('div');
      g.className = 'group';
      S.stage.appendChild(g);
      S.groups[l.group] = g;
    }
    S.groups[l.group].appendChild(imgs[i]);
    S.parts[l.id] = imgs[i];
  });

  for (const id in S.rig.pivots) {
    const [x, y] = S.rig.pivots[id];
    if (S.parts[id]) S.parts[id].style.transformOrigin = pct(x) + ' ' + pct(y);
  }
  S.groups.head.style.transformOrigin = '50% 45%'; // kepala miring dari area leher
  S.groups.body.style.transformOrigin = pct(S.FEET_X) + ' ' + pct(S.FEET_Y); // badan miring dari kaki

  S.bubble = await loadImg(S.BASE + S.rig.effects.gelembung);
  S.bubble.classList.add('bubble');
  S.bubble.style.transformOrigin =
    pct(S.rig.pivots.gelembung[0]) + ' ' + pct(S.rig.pivots.gelembung[1]);
  S.bubble.style.display = 'none';
  S.stage.appendChild(S.bubble);

  buildTyping();
  Scroll.buildScroll();
  Celebrate.buildCelebrate();
  Drink.buildDrink();
}

// Garis tepi luar otomatis, warnanya mengikuti "Garis tepi" di panel kustomisasi
function setOutline(look) {
  const d = S.OUTLINE_PX * S.SCALE;
  const c = (look && look.outline) || '#ffffff';
  const f =
    d > 0
      ? `drop-shadow(${d}px 0 0 ${c}) drop-shadow(${-d}px 0 0 ${c}) ` +
        `drop-shadow(0 ${d}px 0 ${c}) drop-shadow(0 ${-d}px 0 ${c})`
      : '';
  S.stage.style.filter = S.OUTLINE.idle ? f : '';
  S.typ.box.style.filter = S.OUTLINE.typing && !S.OUTLINE.idle ? f : '';
  S.scr.box.style.filter = S.OUTLINE.scroll && !S.OUTLINE.idle ? f : '';
  S.cel.box.style.filter = S.OUTLINE.celebrate && !S.OUTLINE.idle ? f : '';
}

async function applyLook(look) {
  const urls = await Look.recolorAll(look);
  for (const id in urls) if (S.parts[id]) S.parts[id].src = urls[id];

  // Pose mengetik ikut warna dan pola yang sama
  const T = S.typ;
  T.tail.src = urls.t_ekor;
  T.tailH.src = urls.t_ekor_H;
  T.clicks[0].img.src = urls.click1;
  T.clicks[0].imgH.src = urls.click1_H;
  T.clicks[1].img.src = urls.click2;
  T.clicks[1].imgH.src = urls.click2_H;
  T.kuping.src = urls.t_kuping;
  T.kupingH.src = urls.t_kuping_H;
  T.kepala.src = urls.t_kepala;
  T.kepalaH.src = urls.t_kepala_H;
  T.closed.src = await Look.closedEyes(look);
  T.mata.src = urls.t_mata; // warna mata dari panel
  T.pupil.src = urls.t_pupil;

  Scroll.applyLook(urls, look); // pose scroll ikut warna dan pola yang sama
  Celebrate.applyLook(urls); // pose perayaan juga
  setOutline(look);
}

// Terapkan tampilan tersimpan, lalu dengarkan perubahan dari panel kustomisasi
async function initLook() {
  const saved = await ipcRenderer.invoke('look-get');
  await applyLook(saved || Look.PRESETS.hitam);
  ipcRenderer.on('look', (event, look) => applyLook(look));
}

module.exports = { buildRig, initLook };