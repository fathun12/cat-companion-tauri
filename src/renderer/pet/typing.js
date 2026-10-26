const S = require('./state');
const { rand, spring } = require('./actions');

// Pose mengetik: kaki bergantian, kepala menekan, dan mode panas
// (tenang -> frustrasi -> memerah -> lelah).
// Layer-nya dibuat di rig.js (buildTyping) dan disimpan di S.typ.

const DIZZY_MS = 880; // 8 langkah x 110 ms = 2 putaran
const DIZZY_RING = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // atas, kanan, bawah, kiri

let heat = 0; // 0 = tenang, 1 = memerah
let hot = false, hotUntil = 0, tiredUntil = 0;
let tired = false, frustrated = false, spd = 0; // dihitung ulang tiap frame di updateHeat
let kps = 0, excitedUntil = 0; // ketikan per detik; ekor tetap cepat sampai waktu ini
let exc = 0; // 0 = ekor biasa, 1 = penuh semangat (naik/turun mulus, seperti playAmt di animate.js)
let kick = 0, kickV = 0, seenKey = 0, wagPhase = 0;
let nextDizzy = 0, dizzyStart = -10000; // pupil pusing saat memerah

// Seberapa panas: makin cepat mengetik, makin naik; setelah memerah jadi lelah
function updateHeat(t, dt) {
  const keys = S.keyTimes;
  while (keys.length && t - keys[0] > 1000) keys.shift();
  kps = keys.length;
  spd = Math.min(1, kps / 8); // 0 = pelan, 1 = ngebut
  tired = !S.sleeping && t < tiredUntil;
  if (S.sleeping) {
    heat = 0;
    hot = false;
    tiredUntil = 0;
  } else if (tired) {
    heat = 0;
  } else if (hot) {
    if (t > hotUntil) {
      hot = false;
      heat = 0;
      tiredUntil = t + S.TIRED_MS;
      keys.length = 0;
    }
  } else {
    heat += keys.length >= S.HEAT_KPS ? dt / S.HEAT_RISE_MS : -dt / S.HEAT_FALL_MS;
    heat = Math.max(0, Math.min(1, heat));
    if (heat >= 1) {
      hot = true;
      hotUntil = t + S.HOT_MS;
    }
  }
  frustrated = !hot && !tired && heat > S.FRUSTRATE_AT;
}

// Kaki bergantian: click1 <-> click2
function drawFeet() {
  const T = S.typ;
  const active = tired ? 0 : S.typeFrame;
  T.clicks.forEach((c, i) => {
    const on = i === active ? '' : 'none';
    c.img.style.display = on;
    c.imgH.style.display = on;
  });
}

// Setiap ketikan: kepala menekan sedikit ke bawah, lalu memantul kembali
function drawHead(dt, breath) {
  const sec = Math.min(dt, 50) / 1000;
  if (S.lastKey !== seenKey) {
    seenKey = S.lastKey;
    kickV += 26;
  }
  [kick, kickV] = spring(kick, kickV, 0, 260, 14, sec);
  kick = Math.min(kick, 2);
  const dip = Math.min(2, breath + Math.max(0, Math.round(kick))) * S.SCALE;
  S.typ.headBox.style.transform = `translateY(${dip}px)`;
}

// Mata: melihat ke papan ketik; tertutup saat lelah atau kedip.
// Saat memerah pupil sesekali berputar pusing.
function drawEyes(t, blinkEnd) {
  const T = S.typ;
  const shut = tired || t < blinkEnd;
  T.mata.style.display = shut ? 'none' : '';
  T.pupil.style.display = shut ? 'none' : '';
  T.closed.style.display = shut ? '' : 'none';
  let pdx = 0, pdy = 1;
  if (hot) {
    if (t >= nextDizzy) {
      dizzyStart = t;
      nextDizzy = t + rand(1800, 3000);
    }
    const dz = t - dizzyStart;
    if (dz < DIZZY_MS) [pdx, pdy] = DIZZY_RING[Math.floor(dz / 110) % 4];
  } else {
    nextDizzy = t + 500; // putaran pertama 0,5 detik setelah mulai memerah
    dizzyStart = -10000;
  }
  T.pupil.style.transform = `translate(${pdx * S.SCALE}px, ${pdy * S.SCALE}px)`;
}

// Ekor berkibas. Meniru mode bermain di animate.js:
// - semangat (exc) naik/turun mulus; selama naik atau turun ekor kibas SANGAT CEPAT (burst),
//   lalu setelah stabil kibas cepat biasa, lalu pelan lagi.
// Fase dijumlahkan per frame (bukan dihitung dari waktu total), jadi burst-nya stabil, tidak acak.
function drawTail(t, dt) {
  if (kps >= S.EXCITED_KPS) excitedUntil = t + S.EXCITED_HOLD_MS; // ditahan sebentar supaya tidak gonta-ganti
  const excited = frustrated || hot || t < excitedUntil;
  const goal = excited ? 1 : 0;
  exc += (goal - exc) * Math.min(1, dt / (S.EXCITED_RAMP_MS || 120));
  const bursting = !tired && Math.abs(goal - exc) > 0.05;

  const calmPeriod = 1.4 - 1.0 * spd;
  const calmAmp = 10 + 12 * spd;
  const fastPeriod = S.EXCITED_WAG_PERIOD || 0.35;
  const fastAmp = S.EXCITED_WAG_AMP || 25;
  let period = calmPeriod + (fastPeriod - calmPeriod) * exc;
  let amp = calmAmp + (fastAmp - calmAmp) * exc;
  if (bursting) {
    period = S.EXCITED_BURST_PERIOD || 0.09;
    amp = fastAmp;
  }
  if (tired) {
    period = 3;
    amp = 5;
  }
  wagPhase += ((dt / 1000) * (2 * Math.PI)) / period;
  const wag = Math.round((Math.sin(wagPhase) * amp) / 5) * 5;
  S.typ.tailBox.style.transform = `rotate(${wag}deg)`;
}

// Merah: naik pelan saat panas, penuh saat memerah, memudar saat lelah
function drawRed(t) {
  const T = S.typ;
  const red = hot
    ? 1
    : tired
      ? Math.max(0, (tiredUntil - t) / S.TIRED_MS)
      : Math.max(0, (heat - 0.3) / 0.7);
  T.tailH.style.opacity = red;
  T.kupingH.style.opacity = red;
  T.kepalaH.style.opacity = red;
  T.clicks.forEach((c) => (c.imgH.style.opacity = red));
}

// Gelembung: frustrasi dan memerah cepat, lelah pelan
function drawBubbles(t, show) {
  const showBubbles = show && (frustrated || hot || tired);
  const bp = Math.floor(t / (tired ? 600 : 300)) % 2;
  S.angryImgs.forEach((img, i) => (img.style.display = showBubbles && i === bp ? '' : 'none'));
}

// Dipanggil tiap frame dari animate.js. Mengembalikan true kalau pose mengetik sedang tampil.
// blinkEnd = waktu kedip kucing biasa berakhir (dibagi supaya kedipnya serempak)
function update(t, dt, breath, blinkEnd) {
  updateHeat(t, dt);
  const show =
    !S.sleeping && !S.dragging && (t - S.lastKey < S.TYPE_HOLD_MS || hot || tired || heat > 0);
  S.typ.box.style.display = show ? '' : 'none';
  if (show) {
    drawFeet();
    drawHead(dt, breath);
    drawEyes(t, blinkEnd);
    drawTail(t, dt);
    drawRed(t);
  }
  drawBubbles(t, show);
  return show;
}

module.exports = { update, isHot: () => hot };