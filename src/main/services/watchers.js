const fs = require('fs');
const { app } = require('electron');

// ===== Pengaturan (boleh diubah) =====
const COMFY_URL = 'http://127.0.0.1:8188'; // alamat ComfyUI lokal; '' = nonaktif
const WATCH_DOWNLOAD = true; // unduhan browser selesai
const WATCH_COPY = false; // salin/pindah file di Explorer selesai (nama kelas jendela belum ketemu di Win11 ini)
const DOWNLOAD_DIR = ''; // '' = folder Unduhan bawaan Windows; isi kalau browsermu mengunduh ke folder lain
const PARTIAL = ['.crdownload', '.part', '.opdownload']; // file sementara Chrome/Edge, Firefox, Opera

// PRIVASI: ComfyUI = hanya status antrean. Unduhan = hanya nama file di folder Unduhan (untuk
// melihat ekstensi sementara). Salin file = hanya cek jendela progres Explorer ada atau tidak.
// Tidak ada isi file, judul jendela, atau data yang dikirim keluar.

let win = null;
let lastFire = 0;

// Kirim ke kucing: teks di HUD + (opsional) pose perayaan
function fire(text, celebrate = true) {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  const now = Date.now();
  if (now - lastFire < 4000) return; // jangan beruntun
  lastFire = now;
  win.webContents.send('say', text, 'hop');
  if (celebrate) win.webContents.send('celebrate');
}

// ----- ComfyUI -----
async function comfyFinished(id) {
  let ok = true;
  try {
    const res = await fetch(COMFY_URL + '/history/' + id, { signal: AbortSignal.timeout(1500) });
    const h = await res.json();
    const st = h[id] && h[id].status;
    if (st && st.status_str && st.status_str !== 'success') ok = false;
  } catch (e) {}
  if (ok) fire('Gambar ComfyUI sudah jadi!');
  else fire('ComfyUI berhenti (error atau dibatalkan).', false);
}

function watchComfy() {
  if (!COMFY_URL) return;
  let busy = false;
  let lastId = null;
  setInterval(async () => {
    try {
      const res = await fetch(COMFY_URL + '/queue', { signal: AbortSignal.timeout(1500) });
      const q = await res.json();
      const run = q.queue_running || [];
      const n = run.length + (q.queue_pending || []).length;
      if (run[0]) lastId = run[0][1];
      if (busy && n === 0) await comfyFinished(lastId);
      busy = n > 0;
    } catch (e) {
      busy = false; // ComfyUI belum jalan atau mati
    }
  }, 3000);
}

// ----- Unduhan browser -----
function watchDownloads() {
  const dir = DOWNLOAD_DIR || app.getPath('downloads');
  const isPart = (n) => PARTIAL.some((x) => n.toLowerCase().endsWith(x));
  let known = new Set();
  let partials = new Set();
  let pending = false;

  const scan = () => {
    let now;
    try {
      now = fs.readdirSync(dir);
    } catch (e) {
      return;
    }
    const nowPart = new Set(now.filter(isPart));
    const added = now.filter((n) => !known.has(n) && !isPart(n));
    const gone = [...partials].some((n) => !nowPart.has(n));
    // File sementara hilang DAN ada file baru = selesai (kalau dibatalkan, tidak ada file baru)
    if (gone && added.length) fire('Unduhan selesai!');
    known = new Set(now);
    partials = nowPart;
  };

  scan();
  try {
    fs.watch(dir, () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        scan();
      }, 800);
    });
  } catch (e) {}
}

// ----- Salin/pindah file di Explorer -----
function watchCopy() {
  let find;
  try {
    const koffi = require('koffi');
    find = koffi.load('user32.dll').func('intptr_t __stdcall FindWindowW(str16 cls, str16 title)');
  } catch (e) {
    return;
  }
  let was = false;
  setInterval(() => {
    let now = false;
    try {
      now = Number(find('OperationStatusWindow', null)) !== 0;
    } catch (e) {}
    if (was && !now) fire('Salin/pindah file selesai!');
    was = now;
  }, 1000);
}

function init(browserWindow) {
  win = browserWindow;
  watchComfy();
  if (WATCH_DOWNLOAD) watchDownloads();
  if (WATCH_COPY) watchCopy();
}

module.exports = { init };