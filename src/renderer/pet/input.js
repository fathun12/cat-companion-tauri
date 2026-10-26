const { ipcRenderer } = require('electron');
const S = require('./state');
const { setSleep, spawnLove, updateHud } = require('./actions');

function initInput() {
  const stage = S.stage;

  // ----- Mouse di atas kucing -----
  stage.addEventListener('mouseenter', () => {
    S.hovering = true;
    ipcRenderer.send('set-ignore-mouse', false);
  });
  stage.addEventListener('mouseleave', () => {
    S.hovering = false;
    if (!S.dragging) ipcRenderer.send('set-ignore-mouse', true);
  });
  stage.addEventListener('mousemove', () => {
    S.lastHoverMove = performance.now();
    S.lastActivity = S.lastHoverMove;
  });

  // Klik kucing (bukan drag): keluarkan hati
  stage.addEventListener('click', () => {
    if (!S.sleeping && !S.dragMoved) spawnLove();
  });

  // ----- Drag kucing -----
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
      ipcRenderer.send('drag-start');
    }
    S.dragVx = e.screenX - S.lastSX;
    S.lastSX = e.screenX;
  });
  window.addEventListener('mouseup', () => {
    if (!S.dragging) return;
    S.dragging = false;
    if (S.dragMoved) {
      ipcRenderer.send('drag-end');
      if (!S.hovering) ipcRenderer.send('set-ignore-mouse', true);
    }
  });

  // ----- Klik kanan: menu Pomodoro dan pengaturan -----
  stage.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('show-menu');
  });

  // ----- Pesan dari main.js -----

  // Aktivitas global (keyboard, mouse, scroll, klik). Isi ketikan tidak pernah dikirim.
  ipcRenderer.on('activity', (event, type) => {
    const now = performance.now();
    S.lastActivity = now;
    if (type !== 'mouse' && S.sleeping) setSleep(false); // gerak mouse saja tidak membangunkan
    if (type === 'key') {
      S.lastKey = now;
      S.keyTimes.push(now);
      S.typeFrame = 1 - S.typeFrame; // ganti pose click1/click2 tiap ketikan
    }
    if (type === 'scroll') {
      S.keyPulseEnd = now + 110;
      S.lastScroll = now;
      S.scrollTick++;
      S.scrollFrame = 1 - S.scrollFrame; // tangan kiri dan kanan bergantian
    }
  });

  // Posisi kursor relatif terhadap jendela kucing + deteksi "bermain"
  ipcRenderer.on('cursor', (event, x, y) => {
    const now = performance.now();
    const dtc = now - S.lastCursorMove;
    const speed = dtc > 0 && dtc < 300 ? (Math.hypot(x - S.cursorX, y - S.cursorY) / dtc) * 1000 : 0;
    S.cursorX = x;
    S.cursorY = y;
    S.lastCursorMove = now;

    // Kursor cepat di dekat kucing -> kucing bermain
    const cx = stage.offsetLeft + stage.offsetWidth / 2;
    const cy = stage.offsetTop + stage.offsetHeight / 2;
    const near = Math.hypot(x - cx, y - cy) < S.PLAY_RADIUS;
    const need = S.hovering ? S.PLAY_SPEED * 1.8 : S.PLAY_SPEED; // mengelus tidak dianggap bermain
    if (S.playEnabled && near && !S.dragging && !S.purring && speed > need) {
      S.playing = true;
      S.playUntil = now + 1500;
      S.lastActivity = now;
      if (S.sleeping) setSleep(false);
    }
  });

  // Teks timer Pomodoro
  ipcRenderer.on('status', (event, text) => {
    S.statusText = text;
    updateHud();
  });

  // Pengingat: kucing bangun dan beraksi
  ipcRenderer.on('say', (event, text, kind) => {
    const now = performance.now();
    S.sayText = text;
    S.sayUntil = now + 7000;
    updateHud();
    setTimeout(updateHud, 7100);
    S.lastActivity = now;
    if (S.sleeping) setSleep(false);
    if (kind === 'stretch') S.stretchUntil = now + 4000; // kucing meregang
    else S.mochiV += 2.5; // kucing melonjak kecil
  });

  // Pengaturan "Bermain dengan kursor" (menu klik kanan)
  ipcRenderer.invoke('play-get').then((v) => (S.playEnabled = v));
  ipcRenderer.on('play-enabled', (event, v) => (S.playEnabled = v));

  // Catatan sematan: kotak kuning di atas kepala kucing (tidak menghalangi klik)
  const note = document.createElement('div');
  note.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);width:max-content;max-width:236px;' +
    'max-height:48px;overflow:hidden;padding:3px 6px;background:#fff2a8;border:2px solid #333;' +
    'color:#222;font:11px/1.25 "Segoe UI",sans-serif;text-align:center;white-space:pre-wrap;' +
    'word-break:break-word;pointer-events:none;display:none;';
  note.style.bottom = S.WIN - (stage.offsetTop + 8) + 'px';
  document.body.appendChild(note);
  const showNote = (text) => {
    note.textContent = text || '';
    note.style.display = text ? 'block' : 'none';
  };
  ipcRenderer.invoke('note-get').then(showNote);
  ipcRenderer.on('note', (event, text) => showNote(text));
}

module.exports = { initInput };