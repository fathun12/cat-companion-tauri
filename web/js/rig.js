import S from './state.js';
import * as Look from './look.js';
import * as Scroll from './scroll.js';
import * as Celebrate from './celebrate.js';
import * as Drink from './drink.js';

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
  T.kumis.src = S.BASE + 'cat/typing/kumis.png';
  T.kumis.style.transform = `translate(${S.WHISKER_DX * S.SCALE}px, ${S.WHISKER_DY * S.SCALE}px)`;
  T.mata.src = S.BASE + 'cat/typing/mata.png';
  T.pupil.src = S.BASE + 'cat/typing/pupil.png';
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
  T.mata.src = urls.t_mata;
  T.pupil.src = urls.t_pupil;

  Scroll.applyLook(urls, look);
  Celebrate.applyLook(urls);
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