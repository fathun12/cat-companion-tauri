const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const menuWindow = require('./menuWindow');

const DEFAULTS = { focusMin: 25, breakMin: 5, stretchMin: 45, waterMin: 60, hunt: true, peek: true, name: '', messages: [], note: '' }; // 0 = nonaktif
let settings = { ...DEFAULTS };
let file = '';
let win = null;

let pomo = { phase: 'idle', running: false, endAt: 0, left: 0 };
let nextStretch = 0;
let nextWater = 0;
let lastStatus = null;

function load() {
  file = path.join(app.getPath('userData'), 'settings.json');
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) {}
}

function save() {
  try {
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
  } catch (e) {}
}

function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function say(text, kind) {
  send('say', text, kind);
}

function schedule() {
  const now = Date.now();
  nextStretch = now + settings.stretchMin * 60000;
  nextWater = now + settings.waterMin * 60000;
}

function begin(phase) {
  const min = phase === 'focus' ? settings.focusMin : settings.breakMin;
  pomo = { phase, running: true, endAt: Date.now() + min * 60000, left: 0 };
}

function statusText() {
  if (pomo.phase === 'idle') return '';
  const left = pomo.running ? Math.max(0, pomo.endAt - Date.now()) : pomo.left;
  const s = Math.ceil(left / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const label = !pomo.running ? 'JEDA' : pomo.phase === 'focus' ? 'FOKUS' : 'ISTIRAHAT';
  return `${label} ${mm}:${ss}`;
}

function sendStatus() {
  const text = statusText();
  if (text === lastStatus) return;
  lastStatus = text;
  send('status', text);
}

// Pesan kustom: bunyi sekali per hari pada jam:menit yang ditentukan
const fired = {}; // id pesan -> tanggal+jam terakhir dibunyikan
function checkMessages(now) {
  const d = new Date(now);
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const stamp = d.toDateString() + hm;
  for (const m of settings.messages) {
    if (!m.enabled || m.time !== hm || fired[m.id] === stamp) continue;
    fired[m.id] = stamp;
    say((settings.name ? settings.name + ', ' : '') + m.text, 'hop');
    return true;
  }
  return false;
}

function tick() {
  const now = Date.now();
  let said = false;

  if (pomo.phase !== 'idle' && pomo.running && now >= pomo.endAt) {
    if (pomo.phase === 'focus') {
      begin('break');
      say('Waktunya istirahat! Minum dan regangkan badan.', 'stretch');
    } else {
      begin('focus');
      say('Istirahat selesai. Ayo fokus lagi!', 'hop');
    }
    said = true;
  }

  if (!said && checkMessages(now)) said = true;

  if (!said && settings.stretchMin > 0 && now >= nextStretch && pomo.phase !== 'break') {
    say('Waktunya peregangan! Berdiri sebentar.', 'stretch');
    nextStretch = now + settings.stretchMin * 60000;
    said = true;
  }

  if (!said && settings.waterMin > 0 && now >= nextWater) {
    say('Minum air dulu yuk!', 'drink');
    nextWater = now + settings.waterMin * 60000;
  }

  sendStatus();
}

// ===== Untuk menu klik kanan buatan sendiri (src/renderer/menu) =====
const OPTIONS = {
  focusMin: [1, 15, 25, 45, 50],
  breakMin: [1, 5, 10, 15],
  stretchMin: [0, 1, 30, 45, 60],
  waterMin: [0, 1, 30, 45, 60],
};

function togglePomo() {
  if (pomo.phase === 'idle') {
    begin('focus');
    say('Fokus dimulai! Semangat!', 'hop');
  } else if (pomo.running) {
    pomo.left = Math.max(0, pomo.endAt - Date.now());
    pomo.running = false;
  } else {
    pomo.endAt = Date.now() + pomo.left;
    pomo.running = true;
  }
  lastStatus = null;
  sendStatus();
}

function resetPomo() {
  pomo = { phase: 'idle', running: false, endAt: 0, left: 0 };
  lastStatus = null;
  sendStatus();
}

function menuState() {
  return {
    phase: pomo.phase,
    running: pomo.running,
    status: statusText(),
    focusMin: settings.focusMin,
    breakMin: settings.breakMin,
    stretchMin: settings.stretchMin,
    waterMin: settings.waterMin,
    hunt: settings.hunt,
    peek: settings.peek,
  };
}

function init(browserWindow) {
  win = browserWindow;
  load();
  schedule();
  setInterval(tick, 1000);
  ipcMain.on('show-menu', () => menuWindow.open());
  ipcMain.handle('menu-state', () => menuState());
  ipcMain.handle('menu-action', (event, action, key, value) => {
    if (action === 'pomo') togglePomo();
    else if (action === 'reset') resetPomo();
    else if (action === 'set' && OPTIONS[key] && OPTIONS[key].includes(value)) {
      settings[key] = value;
      save();
      schedule();
    } else if (action === 'toggle' && (key === 'hunt' || key === 'peek')) {
      settings[key] = !settings[key];
      save();
      if (key === 'hunt') send('play-enabled', settings.hunt);
    } else if (action === 'panel') ipcMain.emit('open-panel');
    else if (action === 'quit') app.quit();
    return menuState();
  });
  ipcMain.handle('play-get', () => settings.hunt);

  // Catatan sematan di atas kepala kucing
  ipcMain.handle('note-get', () => settings.note);
  ipcMain.on('note-set', (event, text) => {
    settings.note = String(text || '').slice(0, 80);
    save();
    send('note', settings.note);
  });

  // Pesan kustom dari panel
  ipcMain.handle('msgs-get', () => ({ name: settings.name, messages: settings.messages }));
  ipcMain.on('msgs-set', (event, data) => {
    settings.name = String((data && data.name) || '').slice(0, 20);
    settings.messages = ((data && data.messages) || [])
      .filter((m) => m && /^\d{2}:\d{2}$/.test(m.time) && String(m.text || '').trim())
      .slice(0, 20)
      .map((m) => ({
        id: String(m.id),
        time: m.time,
        text: String(m.text).slice(0, 60),
        enabled: !!m.enabled,
      }));
    save();
  });
}

module.exports = { init, huntEnabled: () => settings.hunt, peekEnabled: () => settings.peek };