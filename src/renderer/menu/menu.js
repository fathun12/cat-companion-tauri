const { ipcRenderer } = require('electron');

// Ikon pixel 7x7 ("#" = terisi)
const ICONS = {
  play: ['#......', '###....', '#####..', '#######', '#####..', '###....', '#......'],
  pause: ['.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.'],
  stop: ['.......', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.......'],
  heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  paw: ['##...##', '##.#.##', '...#...', '.#####.', '#######', '#######', '.##.##.'],
  eye: ['.......', '..###..', '.#...#.', '#.###.#', '.#...#.', '..###..', '.......'],
  x: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
};

function icon(name) {
  let rects = '';
  ICONS[name].forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    })
  );
  return `<svg class="ico" viewBox="0 0 7 7" width="21" height="21" shape-rendering="crispEdges" fill="#2b2140">${rects}</svg>`;
}

const ROWS = [
  { key: 'focusMin', label: 'Fokus (menit)', values: [1, 15, 25, 45, 50] },
  { key: 'breakMin', label: 'Istirahat (menit)', values: [1, 5, 10, 15] },
  { key: 'stretchMin', label: 'Peregangan (tiap menit)', values: [0, 1, 30, 45, 60] },
  { key: 'waterMin', label: 'Minum (tiap menit)', values: [0, 1, 30, 45, 60] },
];
const TOGGLES = [
  { key: 'hunt', label: 'Bermain dengan kursor', icon: 'paw' },
  { key: 'peek', label: 'Mengintip saat layar penuh', icon: 'eye' },
];

const root = document.getElementById('menu');
const MODE = new URLSearchParams(location.search).get('mode') || 'cat'; // 'cat' = menu kucing, 'tray' = menu ikon tray
const CH = MODE === 'tray' ? { state: 'tray-state', action: 'tray-action' } : { state: 'menu-state', action: 'menu-action' };
let state = null;

// Menu tray: tampil/sembunyikan kucing, jalankan saat Windows menyala, kustomisasi, keluar
function renderTray() {
  const s = state;
  root.innerHTML = `
    <div class="title"><span class="t">${icon('paw')}Menu Tray</span><span class="dots"><i></i><i></i><i></i></span></div>
    <div class="sec s1">
      <button class="btn" data-act="showhide">${icon('eye')}${s.visible ? 'Sembunyikan kucing' : 'Tampilkan kucing'}</button>
    </div>
    <div class="sec s3">
      <button class="btn toggle${s.autostart ? ' on' : ''}" data-act="autostart">
        ${icon('play')}<span>Jalankan saat Windows menyala</span><b class="sw">${s.autostart ? 'ON' : 'OFF'}</b>
      </button>
    </div>
    <div class="sec s4">
      <button class="btn lav" data-act="panel">${icon('heart')}Kustomisasi kucing</button>
      <button class="btn pink" data-act="quit">${icon('x')}Keluar</button>
    </div>`;
  ipcRenderer.send('menu-size', root.offsetHeight + 10);
}

function render() {
  if (MODE === 'tray') return renderTray();
  const s = state;
  const idle = s.phase === 'idle';
  const pomoText = idle ? 'Mulai Pomodoro' : s.running ? 'Jeda Pomodoro' : 'Lanjutkan';

  const rows = ROWS.map(
    (r) => `
    <div class="row">
      <div class="tag">${r.label}</div>
      <div class="chips">${r.values
        .map(
          (v) =>
            `<button class="chip${s[r.key] === v ? ' on' : ''}" data-act="set" data-key="${r.key}" data-val="${v}">${v === 0 ? 'OFF' : v}</button>`
        )
        .join('')}</div>
    </div>`
  ).join('');

  const toggles = TOGGLES.map(
    (t) => `
    <button class="btn toggle${s[t.key] ? ' on' : ''}" data-act="toggle" data-key="${t.key}">
      ${icon(t.icon)}<span>${t.label}</span><b class="sw">${s[t.key] ? 'ON' : 'OFF'}</b>
    </button>`
  ).join('');

  root.innerHTML = `
    <div class="title"><span class="t">${icon('heart')}Menu Kucing</span><span class="dots"><i></i><i></i><i></i></span></div>
    <div class="sec s1">
      <div class="tag">Pomodoro</div>
      <button class="btn" data-act="pomo">${icon(idle || !s.running ? 'play' : 'pause')}${pomoText}</button>
      ${idle ? '' : `<div class="status">${s.status}</div>`}
      <button class="btn y" data-act="reset" ${idle ? 'disabled' : ''}>${icon('stop')}Reset</button>
    </div>
    <div class="sec s2">${rows}</div>
    <div class="sec s3">${toggles}</div>
    <div class="sec s4">
      <button class="btn lav" data-act="panel">${icon('heart')}Kustomisasi kucing</button>
      <button class="btn pink" data-act="quit">${icon('x')}Keluar</button>
    </div>`;

  ipcRenderer.send('menu-size', root.offsetHeight + 10);
}

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const val = el.dataset.val === undefined ? undefined : Number(el.dataset.val);
  ipcRenderer.invoke(CH.action, act, el.dataset.key, val).then((st) => {
    if (['pomo', 'reset', 'panel', 'quit', 'showhide'].includes(act)) {
      ipcRenderer.send('menu-close');
      return;
    }
    state = st;
    render();
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') ipcRenderer.send('menu-close');
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

Promise.all([
  ipcRenderer.invoke(CH.state),
  document.fonts.load('700 15px "Pixelify Sans"').catch(() => []),
]).then(([st]) => {
  state = st;
  render();
});