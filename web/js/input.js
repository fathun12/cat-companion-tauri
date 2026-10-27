import S from './state.js';
import { setSleep, spawnLove } from './actions.js';
import * as Celebrate from './celebrate.js';
import * as Drink from './drink.js';

const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

let testN = 0; // SEMENTARA: klik kanan menjalankan perayaan dan minum bergantian

export function initInput() {
  const stage = S.stage;

  // ----- Mouse di atas kucing (click-through diatur thread Rust) -----
  stage.addEventListener('mouseenter', () => { S.hovering = true; });
  stage.addEventListener('mouseleave', () => { S.hovering = false; });
  stage.addEventListener('mousemove', () => {
    S.lastHoverMove = performance.now();
    S.lastActivity = S.lastHoverMove;
  });

  // Klik kucing (bukan seret): hati
  stage.addEventListener('click', () => {
    if (!S.sleeping && !S.dragMoved) spawnLove();
  });

  // ----- Seret: jendela digerakkan oleh Rust -----
  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    S.dragging = true;
    S.dragMoved = false;
    S.dragSX = S.lastSX = e.screenX;
    S.dragSY = e.screenY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!S.dragging) return;
    if (!S.dragMoved) {
      if (Math.hypot(e.screenX - S.dragSX, e.screenY - S.dragSY) < 5) return;
      S.dragMoved = true;
      S.lastActivity = performance.now();
      if (S.sleeping) setSleep(false);
      invoke('drag_start');
    }
    S.dragVx = e.screenX - S.lastSX;
    S.lastSX = e.screenX;
  });
  window.addEventListener('mouseup', () => {
    if (!S.dragging) return;
    S.dragging = false;
    if (S.dragMoved) invoke('drag_end');
  });

  // Klik kanan: menu Pomodoro dan pengaturan (jendela menu dikelola Rust)
  stage.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    invoke('show_menu');
  });

  // ----- Event dari Rust -----
  // Aktivitas global. Isi ketikan tidak pernah dikirim.
  listen('activity', (e) => {
    const type = e.payload;
    const now = performance.now();
    S.lastActivity = now;
    if (type !== 'mouse' && S.sleeping) setSleep(false);
    if (type === 'key') {
      S.lastKey = now;
      S.keyTimes.push(now);
      S.typeFrame = 1 - S.typeFrame;
    }
    if (type === 'scroll') {
      S.keyPulseEnd = now + 110;
      S.lastScroll = now;
      S.scrollTick++;
      S.scrollFrame = 1 - S.scrollFrame;
    }
  });

  // Posisi kursor relatif jendela + deteksi "bermain"
  listen('cursor', (e) => {
    const [x, y] = e.payload;
    const now = performance.now();
    const dtc = now - S.lastCursorMove;
    const speed = dtc > 0 && dtc < 300 ? (Math.hypot(x - S.cursorX, y - S.cursorY) / dtc) * 1000 : 0;
    S.cursorX = x;
    S.cursorY = y;
    S.lastCursorMove = now;

    const cx = stage.offsetLeft + stage.offsetWidth / 2;
    const cy = stage.offsetTop + stage.offsetHeight / 2;
    const near = Math.hypot(x - cx, y - cy) < S.PLAY_RADIUS;
    const need = S.hovering ? S.PLAY_SPEED * 1.8 : S.PLAY_SPEED;
    if (S.playEnabled && near && !S.dragging && !S.purring && speed > need) {
      S.playing = true;
      S.playUntil = now + 1500;
      S.lastActivity = now;
      if (S.sleeping) setSleep(false);
    }
  });
}