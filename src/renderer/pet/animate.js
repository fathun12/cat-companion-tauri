const S = require('./state');
const { rand, spring, setSleep, spawnLove } = require('./actions');
const Scroll = require('./scroll');
const Typing = require('./typing');
const Celebrate = require('./celebrate');
const Drink = require('./drink');

// Variabel yang hanya dipakai di loop animasi
let prevT = 0;
let sleepAmt = 0; // 0 = bangun, 1 = tidur melingkar
let fx = 0, fvx = 0, fy = 0, fvy = 0, bx = 0, bvx = 0; // pegas kepala/badan
let tilt = 0, tiltV = 0;
let plant = 1; // 1 = kaki menapak, 0 = diangkat (saat di-drag)
let nextBlink = 2000, blinkEnd = 0;
let nextEar = 4000, earEnd = 0, earAngle = -4;
let nextLook = 3000, lookX = 0;

function frame(t) {
  const { parts, groups, stage, SCALE } = S;
  const s = t / 1000;
  const dt = Math.min(t - prevT, 100);
  prevT = t;

  // ----- Pose yang menimpa gerak normal: perayaan dan minum -----
  const celebrating = Celebrate.isActive(t) && !S.dragging;
  const drinking = Drink.isActive(t) && !S.dragging && !S.sleeping && !celebrating;
  if (drinking) {
    // Saat minum, semua bagian kepala dan badan dikunci: tidak ikut kursor, tidak bermain, tidak mendengkur
    S.playing = false;
    S.playAmt = 0;
    S.petTime = 0;
    fx = fvx = fy = fvy = bx = bvx = 0;
  }

  // ----- Napas -----
  const breathPeriod = S.sleeping ? 4.5 : 3.2;
  const breath = Math.round((Math.sin((s * 2 * Math.PI) / breathPeriod) + 1) / 2);

  // ----- Transisi tidur: kepala turun ke badan, bergerak per piksel -----
  const target = S.sleeping ? 1 : 0;
  sleepAmt += Math.sign(target - sleepAmt) * Math.min(Math.abs(target - sleepAmt), dt / 700);
  const dropPx = Math.round((stage.offsetHeight * S.SLEEP_HEAD_DROP) / SCALE);
  const drop = Math.round(sleepAmt * dropPx) * SCALE;

  // ----- Bermain: menunduk, badan geol-geol -----
  if (S.playing && (t > S.playUntil || S.sleeping || S.dragging)) S.playing = false;
  S.playAmt += ((S.playing ? 1 : 0) - S.playAmt) * Math.min(1, dt / 120);
  const crouchPx = Math.round((S.playAmt * stage.offsetHeight * 0.06) / SCALE) * SCALE;
  const wigDeg = Math.sin(t / 45) * 3 * S.playAmt; // geol-geol: badan miring dari kaki

  // ----- Elus: kursor digerakkan di atas kucing cukup lama -> mendengkur -----
  if (S.hovering && !S.dragging && t - S.lastHoverMove < 250) S.petTime += dt;
  else S.petTime = Math.max(0, S.petTime - dt * 2);
  if (S.sleeping && S.petTime > 1500) {
    setSleep(false);
    S.lastActivity = t;
  }
  S.purring = !S.sleeping && !S.playing && !drinking && S.petTime > 1000;
  if (S.purring && t - S.lastPurrHeart > 1400) {
    S.lastPurrHeart = t;
    spawnLove();
  }
  const shake = S.purring ? (Math.floor(t / 70) % 2) * SCALE : 0;

  // ----- Kepala dan badan condong ke kursor dengan efek kenyal -----
  const fsec = Math.min(dt, 50) / 1000;
  let dirX = 0, dirY = 0;
  if (!S.sleeping && !S.dragging && !drinking && t - S.lastCursorMove < 5000) {
    const fcx = stage.offsetLeft + stage.offsetWidth / 2;
    const fcy = stage.offsetTop + stage.offsetHeight / 2;
    dirX = Math.max(-1, Math.min(1, (S.cursorX - fcx) / 200));
    dirY = Math.max(-1, Math.min(1, (S.cursorY - fcy) / 200));
  }
  [fx, fvx] = spring(fx, fvx, dirX * S.FOLLOW_HEAD * SCALE, 140, 9, fsec);
  [fy, fvy] = spring(fy, fvy, dirY * S.FOLLOW_HEAD * 0.6 * SCALE, 140, 9, fsec);
  [bx, bvx] = spring(bx, bvx, dirX * S.FOLLOW_BODY * SCALE, 90, 8, fsec);
  const headTilt = (fx / SCALE) * 1.5;
  // Badan miring dari titik kaki (kaki tidak bergeser); kepala ikut terbawa
  const bodyDeg = (bx / SCALE) * 2 + wigDeg;
  const carry = (S.FEET_Y - 0.4) * stage.offsetHeight * Math.sin((bodyDeg * Math.PI) / 180);
  groups.head.style.transform =
    `translate(${Math.round(fx + shake + carry)}px, ${Math.round(fy + drop + crouchPx + breath * SCALE + Drink.dip(t))}px) rotate(${headTilt}deg)`;
  groups.body.style.transform = `rotate(${bodyDeg}deg)`;

  // ----- Ekor goyang, bertahap per 5 derajat supaya terasa pixel art -----
  const tailPeriod = 2.6 - 2.25 * S.playAmt; // makin semangat makin cepat
  const amp = S.sleeping ? 5 : 10 + 15 * S.playAmt;
  const tail = Math.round((Math.sin((s * 2 * Math.PI) / tailPeriod) * amp) / 5) * 5;
  parts.ekor.style.transform = `rotate(${tail}deg)`;

  // ----- Kuping berkedut sesekali -----
  if (t >= nextEar) {
    earEnd = t + 180;
    earAngle = Math.random() < 0.5 ? -4 : 4;
    nextEar = t + rand(4000, 9000);
  }
  parts.kuping.style.transform = `rotate(${t < earEnd ? earAngle : 0}deg)`;

  // ----- Kedip (saat minum lebih sering) -----
  if (drinking && nextBlink > t + S.DRINK_BLINK_MAX_MS) {
    nextBlink = t + rand(S.DRINK_BLINK_MIN_MS, S.DRINK_BLINK_MAX_MS);
  }
  if (t >= nextBlink) {
    blinkEnd = t + 160;
    nextBlink = t + (drinking ? rand(S.DRINK_BLINK_MIN_MS, S.DRINK_BLINK_MAX_MS) : rand(2500, 6000));
  }
  const closed = S.sleeping || S.purring || t < blinkEnd;
  parts.mata.style.display = closed ? 'none' : '';
  parts.pupil.style.display = closed ? 'none' : '';
  parts.mata_tidur.style.display = closed ? '' : 'none';

  // ----- Pupil: melirik acak, melihat ke bawah saat mengetik, mengikuti kursor (kecuali saat minum) -----
  if (t >= nextLook) {
    lookX = Math.floor(rand(-1, 2));
    nextLook = t + rand(2000, 5000);
  }
  const typing = !S.sleeping && t - S.lastKey < 1500;
  const following = !S.sleeping && t - S.lastCursorMove < 5000;
  let ex = lookX;
  let ey = 0;
  if (drinking) {
    ex = 0;
    ey = S.DRINK_PUPIL_DY; // melihat mangkuk
  } else if (typing) {
    ey = 1;
  } else if (following) {
    const cx = stage.offsetLeft + stage.offsetWidth / 2;
    const cy = stage.offsetTop + stage.offsetHeight / 2;
    ex = Math.abs(S.cursorX - cx) > 30 ? Math.sign(S.cursorX - cx) : 0;
    ey = Math.abs(S.cursorY - cy) > 30 ? Math.sign(S.cursorY - cy) : 0;
  }
  parts.pupil.style.transform = `translate(${ex * SCALE}px, ${ey * SCALE}px)`;

  // ----- Tangan: sekarang hanya bergerak saat scroll -----
  parts.tangan.style.transform = `translate(0px, ${t < S.keyPulseEnd ? SCALE : 0}px)`;

  // ----- Pose mengetik (logika di typing.js) menggantikan kucing biasa -----
  let showTyping = Typing.update(t, dt, breath, blinkEnd);
  if (celebrating || drinking) {
    showTyping = false;
    S.typ.box.style.display = 'none';
    S.angryImgs.forEach((img) => (img.style.display = 'none'));
  }
  // Pose scroll: tampil kalau baru scroll dan tidak sedang mengetik
  const showScroll =
    !celebrating && !drinking && !showTyping && !S.sleeping && !S.dragging && t - S.lastScroll < S.SCROLL_HOLD_MS;
  for (const id in groups) {
    groups[id].style.display = showTyping || showScroll || celebrating ? 'none' : '';
  }
  Scroll.update(t, dt, showScroll, breath);
  Celebrate.update(t, dt, celebrating, breath);
  Drink.update(t, drinking);

  // ----- Tidur kalau lama tidak ada aktivitas -----
  if (!S.sleeping && t - S.lastActivity > S.SLEEP_AFTER_MS) setSleep(true);

  // ----- Mochi: memanjang saat diangkat, memendek saat menunduk, memantul kembali -----
  const sec = Math.min(dt, 50) / 1000;
  S.dragVx *= 0.85;
  const held = S.dragging && S.dragMoved;
  const mochiTarget = held ? 0.18 : t < S.stretchUntil ? 0.14 : -0.1 * S.playAmt;
  S.mochiV += (mochiTarget - S.mochi) * 180 * sec - S.mochiV * 9 * sec;
  S.mochi += S.mochiV * sec;
  if (S.playing) S.lastActivity = t;
  const tiltTarget = held ? Math.max(-15, Math.min(15, S.dragVx * 0.5)) : 0;
  tiltV += (tiltTarget - tilt) * 140 * sec - tiltV * 8 * sec;
  tilt += tiltV * sec;
  // Kaki tetap menapak: saat tidak diangkat, geser panggung supaya kaki tidak ikut naik/turun
  plant += ((held ? 0 : 1) - plant) * Math.min(1, dt / 150);
  const sy = 1 + S.mochi;
  const ground = (S.FEET_Y - 0.25) * stage.offsetHeight * (1 - sy) * plant;
  const hotShake = Typing.isHot() && showTyping ? (Math.floor(t / 60) % 2) * SCALE : 0; // bergetar saat memerah
  stage.style.transform =
    `translateX(${hotShake}px) translateY(${ground}px) rotate(${tilt}deg) scale(${1 - S.mochi * 0.6}, ${sy})`;

  // Hemat tenaga: kalau sudah tidur nyenyak, cukup gambar ulang 10x per detik
  // (yang bergerak hanya napas dan ekor, sangat pelan)
  if (S.sleeping && sleepAmt >= 1) setTimeout(() => requestAnimationFrame(frame), 100);
  else requestAnimationFrame(frame);
}

function startLoop() {
  requestAnimationFrame(frame);
}

module.exports = { startLoop };