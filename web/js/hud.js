import S from './state.js';
import { setSleep } from './actions.js';

const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

// Teks di atas kucing: pesan pengingat (7 detik) lalu kembali ke status Pomodoro
let statusText = '';
let sayText = '';
let sayUntil = 0;

function updateHud() {
  const hud = document.getElementById('hud');
  const text = performance.now() < sayUntil ? sayText : statusText;
  hud.textContent = text;
  hud.style.display = text ? 'block' : 'none';
}

export function initHud() {
  const stage = S.stage;

  // Teks timer Pomodoro
  listen('status', (e) => {
    statusText = e.payload || '';
    updateHud();
  });

  // Pengingat: kucing bangun dan beraksi. payload = [teks, jenis]
  listen('say', (e) => {
    const [text, kind] = Array.isArray(e.payload) ? e.payload : [String(e.payload), ''];
    const now = performance.now();
    sayText = text;
    sayUntil = now + 7000;
    updateHud();
    setTimeout(updateHud, 7100);
    S.lastActivity = now;
    if (S.sleeping) setSleep(false);
    if (kind === 'stretch') S.stretchUntil = now + 4000; // kucing meregang
    else S.mochiV += 2.5; // kucing melonjak kecil
  });

  // Pengaturan "Bermain dengan kursor"
  invoke('play_get').then((v) => (S.playEnabled = v)).catch(() => {});
  listen('play-enabled', (e) => (S.playEnabled = e.payload));

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
  invoke('note_get').then(showNote).catch(() => {});
  listen('note', (e) => showNote(e.payload));
}