const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

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
let state = null;
let mode = 'pet'; // 'pet' = pet right-click menu, 'tray' = tray icon menu
let tray = { visible: true, autostart: false };

// report = true: beri tahu Rust tingginya, lalu Rust menempatkan dan menampilkan jendela
function renderTray(report) {
  const t = tray;
  root.innerHTML = `
    <div class="title"><span class="t">${icon('paw')}Cat Companion</span><span class="dots"><i></i><i></i><i></i></span></div>
    <div class="sec s1">
      <button class="btn" data-act="t-toggle">${icon('eye')}${t.visible ? 'Hide cat' : 'Show cat'}</button>
      <button class="btn lav" data-act="panel">${icon('heart')}Customize cat</button>
    </div>
    <div class="sec s3">
      <button class="btn toggle${t.autostart ? ' on' : ''}" data-act="t-autostart">${icon('play')}<span>Start with Windows</span><b class="sw">${t.autostart ? 'ON' : 'OFF'}</b></button>
    </div>
    <div class="sec s4">
      <button class="btn pink" data-act="quit">${icon('x')}Quit</button>
    </div>`;
  if (report) invoke('menu_size', { h: root.offsetHeight + 10 });
}

function render(report) {
  if (mode === 'tray') return renderTray(report);
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

  if (report) invoke('menu_size', { h: root.offsetHeight + 10 });
}

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (act === 't-toggle') {
    invoke('tray_action', { action: 'toggle' });
    invoke('menu_close');
    return;
  }
  if (act === 't-autostart') {
    invoke('tray_action', { action: 'autostart' })
      .then(() => invoke('tray_state'))
      .then((s) => {
        tray = s;
        render(true);
      });
    return;
  }
  if (act === 'panel') {
    invoke('menu_close');
    invoke('open_panel');
    return;
  }
  const val = el.dataset.val === undefined ? undefined : Number(el.dataset.val);
  invoke('menu_action', { action: act, key: el.dataset.key, value: val }).then((st) => {
    if (['pomo', 'reset', 'quit'].includes(act)) {
      invoke('menu_close');
      return;
    }
    state = st;
    render(true);
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') invoke('menu_close');
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Setiap kali kucing diklik kanan: ambil status terbaru, gambar ulang, lalu tampilkan
function openMenu(m) {
  mode = m === 'tray' ? 'tray' : 'pet';
  const p =
    mode === 'tray'
      ? invoke('tray_state').then((s) => {
          tray = s;
        })
      : invoke('menu_state').then((st) => {
          state = st;
        });
  p.then(() => render(true));
}
listen('menu-open', (e) => openMenu(e.payload));

// Pemanasan saat start (jendela masih tersembunyi): muat font dan gambar sekali
Promise.all([
  invoke('menu_state'),
  document.fonts.load('700 15px "Pixelify Sans"').catch(() => []),
]).then(([st]) => {
  state = st;
  render(false);
  // Jendela baru dibuat karena diminta: tampilkan sesuai permintaan yang tertunda
  invoke('menu_pending').then((m) => {
    if (m) openMenu(m);
  });
});