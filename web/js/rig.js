import S from './state.js';
import * as Look from './look.js';
import * as Scroll from './scroll.js';
import * as Celebrate from './celebrate.js';
import * as Drink from './drink.js';
import * as Stretch from './stretch.js';

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
function buildTyping() {
  const shift = S.TYPE_SHIFT_Y * S.SCALE + 'px';
  const T = {};
  S.typ = T;
  T.box = mkDiv(S.stage);
  T.box.style.display = 'none';
  T.box.style.transform = `translateY(${shift})`;

  const pair = (parent) => {
    const base = mkImg();
    const hot = mkImg();
    hot.style.opacity = '0';
    parent.append(base, hot);
    return [base, hot];
  };

  T.tailBox = mkDiv(T.box);
  T.tailBox.style.transformOrigin = pct(S.rig.pivots.ekor[0]) + ' ' + pct(S.rig.pivots.ekor[1]);
  [T.tail, T.tailH] = pair(T.tailBox);

  [T.body, T.bodyH] = pair(T.box);
  T.keys = ['left', 'right'].map((side) => {
    const k = mkImg();
    k.src = S.BASE + 'cat/typing/keyboard_' + side + '_clicked.png';
    T.box.appendChild(k);
    return k;
  });
  T.hands = [0, 1].map(() => {
    const [img, imgH] = pair(T.box);
    return { img, imgH };
  });

  T.headBox = mkDiv(T.box);
  T.ears = [0, 1].map(() => {
    const [img, imgH] = pair(T.headBox);
    return { img, imgH };
  });
  [T.kepala, T.kepalaH] = pair(T.headBox);
  T.kumis = mkImg();
  T.mata = mkImg();
  T.pupil = mkImg();
  T.closed = mkImg();
  T.closed.style.display = 'none';
  T.headBox.append(T.kumis, T.mata, T.pupil, T.closed);

  for (const f of ['effects/gelembung2.png', 'effects/gelembung4.png']) {
    const img = mkImg();
    img.src = S.BASE + f;
    img.style.display = 'none';
    img.style.transform = `translateY(${shift})`;
    S.stage.appendChild(img);
    S.angryImgs.push(img);
  }
}

export async function buildRig() {
  S.rig = await (await fetch(S.BASE + 'cat/rig.json')).json();
  S.stage = document.getElementById('stage');

  const imgs = await Promise.all(S.rig.layers.map((l) => loadImg(S.BASE + 'cat/' + l.file)));

  const size = imgs[0].naturalWidth;
  S.SCALE = Math.max(1, Math.floor(190 / size));
  const px = size * S.SCALE;
  S.stage.style.width = px + 'px';
  S.stage.style.height = px + 'px';
  S.stage.style.left = (S.WIN - px) / 2 + 'px';
  S.stage.style.top = (S.WIN - px) / 2 + 'px';

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
  S.groups.head.style.transformOrigin = '50% 45%';
  S.groups.body.style.transformOrigin = pct(S.FEET_X) + ' ' + pct(S.FEET_Y);

  S.bubble = await loadImg(S.BASE + S.rig.effects.gelembung);
  S.bubble.classList.add('bubble');
  S.bubble.style.transformOrigin =
    pct(S.rig.pivots.gelembung[0]) + ' ' + pct(S.rig.pivots.gelembung[1]);
  S.bubble.style.display = 'none';
  S.stage.appendChild(S.bubble);

  buildTyping();
  Scroll.buildScroll();
  Celebrate.buildCelebrate();
  Stretch.buildStretch();
  Drink.buildDrink();
}

// Garis tepi luar otomatis, warnanya mengikuti look.outline
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

export async function applyLook(look) {
  const urls = await Look.recolorAll(look);
  for (const id in urls) if (S.parts[id]) S.parts[id].src = urls[id];

  const T = S.typ;
  T.tail.src = urls.ekor;
  T.tailH.src = urls.ekor_H;
  T.body.src = urls.ty_badan;
  T.bodyH.src = urls.ty_badan_H;
  T.hands[0].img.src = urls.ty_hand_left;
  T.hands[0].imgH.src = urls.ty_hand_left_H;
  T.hands[1].img.src = urls.ty_hand_right;
  T.hands[1].imgH.src = urls.ty_hand_right_H;
  T.ears[0].img.src = urls.ty_kuping_kanan;
  T.ears[0].imgH.src = urls.ty_kuping_kanan_H;
  T.ears[1].img.src = urls.ty_kuping_kiri;
  T.ears[1].imgH.src = urls.ty_kuping_kiri_H;
  T.kepala.src = urls.ty_kepala;
  T.kepalaH.src = urls.ty_kepala_H;
  T.closed.src = urls.ty_mata_tidur;
  T.mata.src = urls.ty_mata;
  T.pupil.src = urls.ty_pupil;
  T.kumis.src = urls.ty_kumis;

  Scroll.applyLook(urls, look);
  Celebrate.applyLook(urls);
  Stretch.applyLook(urls);
  setOutline(look);
}

// Muat look.json tersimpan (kalau ada), lalu dengarkan perubahan dari panel
export async function initLook() {
  let saved = null;
  try {
    const raw = await window.__TAURI__.core.invoke('look_get');
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}
  await applyLook(saved || Look.PRESETS.hitam);
  window.__TAURI__.event.listen('look', (e) => applyLook(JSON.parse(e.payload)));
}