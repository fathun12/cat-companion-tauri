const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

const W = 270; // lebar jendela (CSS: menu 256 + ruang bayangan 10 + sisa)
let menu = null;
let at = { x: 0, y: 0 }; // posisi kursor saat menu dibuka
let shownAt = 0; // kapan menu mulai tampil (untuk mengabaikan blur sesaat)

// Menu muncul di samping kursor; kalau tidak muat, dibalik ke kiri atau atas
function place(h) {
  const d = screen.getDisplayNearestPoint(at).workArea;
  let x = at.x + W > d.x + d.width ? at.x - W : at.x;
  let y = at.y + h > d.y + d.height ? at.y - h : at.y;
  x = Math.max(d.x, Math.min(x, d.x + d.width - W));
  y = Math.max(d.y, Math.min(y, d.y + d.height - h));
  return { x, y };
}

function show(m) {
  shownAt = Date.now();
  m.show();
  m.focus();
}

// mode: 'cat' = menu klik kanan kucing, 'tray' = menu klik kanan ikon tray
function open(mode) {
  if (menu && !menu.isDestroyed()) menu.close();
  at = screen.getCursorScreenPoint();
  const p = place(480);
  const m = new BrowserWindow({
    width: W,
    height: 480,
    x: p.x,
    y: p.y,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  menu = m;
  m.setAlwaysOnTop(true, 'screen-saver');
  m.loadFile(path.join(__dirname, '..', '..', 'renderer', 'menu', 'index.html'), {
    query: { mode: mode || 'cat' },
  });
  m.on('blur', () => {
    if (m.isDestroyed()) return;
    // Klik di luar menu = tutup. Blur dalam 400 ms pertama (taskbar merebut fokus) diabaikan.
    if (Date.now() - shownAt < 400) m.focus();
    else m.close();
  });
  // Jaga-jaga kalau tampilan gagal memberi tahu ukurannya
  setTimeout(() => {
    if (!m.isDestroyed() && !m.isVisible()) show(m);
  }, 1500);
}

// Tampilan menu memberi tahu tingginya; jendela disesuaikan lalu ditampilkan
ipcMain.on('menu-size', (event, h) => {
  if (!menu || menu.isDestroyed()) return;
  h = Math.max(100, Math.min(Math.ceil(h), 900));
  const p = place(h);
  menu.setBounds({ x: p.x, y: p.y, width: W, height: h });
  if (!menu.isVisible()) show(menu);
});

ipcMain.on('menu-close', () => {
  if (menu && !menu.isDestroyed()) menu.close();
});

module.exports = { open };