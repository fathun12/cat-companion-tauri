// Semua pengaturan dan status bersama kucing.
const S = {
  // ===== Pengaturan =====
  WIN: 260, // harus sama dengan lebar jendela di tauri.conf.json
  BASE: 'assets/',
  SLEEP_AFTER_MS: 5 * 60 * 1000,
  LOVE_START_UP: 0.42,
  SLEEP_HEAD_DROP: 0.14,
  FOLLOW_HEAD: 3,
  FOLLOW_BODY: 1,
  PLAY_SPEED: 700,
  PLAY_RADIUS: 140,
  FEET_X: 0.46,
  FEET_Y: 0.82,

  // Pose mengetik
  TYPE_HOLD_MS: 1200,
  // Posisi kaki di keyboard [dx, dy] dalam piksel gambar, dari posisi sprite tangan_kiri. [kiri layar, kanan layar]
  TYPE_HANDS: [[0, 0], [0, 0]],
  TYPE_PRESS: 2, // seberapa turun/naik kaki saat mengetik (piksel gambar)
  TYPE_TAIL: [9, -10], // geser ekor di pose typing [dx, dy]; dx negatif ke kiri, dy negatif ke atas
  TYPE_SHIFT_Y: 0,
  TAIL_PIVOT: [0.83, 0.58],
  WHISKER_DY: 5,
  WHISKER_DX: -4,
  HEAT_KPS: 7,
  HEAT_RISE_MS: 5000,
  HEAT_FALL_MS: 3000,
  FRUSTRATE_AT: 0.4,
  HOT_MS: 6000,
  TIRED_MS: 6000,
  EXCITED_KPS: 4,
  EXCITED_HOLD_MS: 1500,
  EXCITED_BURST_PERIOD: 0.09,
  EXCITED_RAMP_MS: 120,
  EXCITED_WAG_PERIOD: 0.35,
  EXCITED_WAG_AMP: 38,

  // Pose scroll
  SCROLL_HOLD_MS: 1400,
  SCROLL_SHIFT_Y: 0,
  TISSUE_LINES: true,
  LINE_TRAVEL: 5,
  LINE_MS: 800,
  SCROLL_BUBBLES: ['effects/gelembung2.png', 'effects/gelembung4.png'],

  // Garis tepi luar otomatis
  OUTLINE_PX: 1,
  OUTLINE: { idle: true, typing: true, scroll: true, celebrate: true },

  // Pose perayaan
  CELEBRATE_MS: 2400,
  CELEBRATE_HOPS: 3,
  CELEBRATE_HOP_PX: 4,
  CELEBRATE_SHIFT_Y: 0,
  STAND_HAND_DX: [-4, 13], // geser tangan di pose berdiri (celebrate, scroll): [tangan_kanan, tangan_kiri]
  STRETCH_MS: 6000,
  STRETCH_IN_MS: 500,
  STRETCH_OUT_MS: 500,
  STRETCH_PULSE_MS: 2400, // satu siklus regangan
  STRETCH_SCALE_X: 0.06, // seberapa panjang badan saat meregang (0.06 = 6%)
  STRETCH_SHIFT_Y: 0,
  STRETCH_PIVOT: [0.4, 0.85], // titik tumpu regangan (kaki depan)
  STRETCH_TAIL_PIVOT: [0.5, 0.48],

  // Pose minum
  DRINK_DELAY_MS: 700,
  DRINK_MS: 6000,
  DRINK_DROP_PX: 10,
  DRINK_IN_MS: 450,
  DRINK_OUT_MS: 450,
  DRINK_BOB_MS: 500,
  DRINK_BOB_UP_PX: 2,
  DRINK_TONGUE_Y0: 32,
  DRINK_TONGUE_UP_ROWS: 1,
  DRINK_TONGUE_DY: 3, // geser lidah ke bawah (piksel gambar); naikkan kalau masih terlalu atas
  DRINK_PUPIL_DY: 1,
  DRINK_BLINK_MIN_MS: 1200,
  DRINK_BLINK_MAX_MS: 2800,

  // ===== Elemen dan data (diisi saat start) =====
  cel: null,
  scr: null,
  typ: null,
  stage: null,
  bubble: null,
  rig: null,
  parts: {},
  groups: {},
  angryImgs: [],
  SCALE: 2,

  // ===== Status =====
  lastScroll: -10000,
  scrollTick: 0,
  scrollFrame: 0,
  sleeping: false,
  lastActivity: performance.now(),
  lastKey: -10000,
  keyPulseEnd: 0,
  keyTimes: [], // hanya waktu ketikan, BUKAN tombolnya
  typeFrame: 0,
  cursorX: 0,
  cursorY: 0,
  lastCursorMove: -10000,
  hovering: false,
  lastHoverMove: -10000,
  petTime: 0,
  purring: false,
  lastPurrHeart: 0,
  dragging: false,
  dragMoved: false,
  dragSX: 0,
  dragSY: 0,
  lastSX: 0,
  dragVx: 0,
  playing: false,
  playUntil: 0,
  playAmt: 0,
  playEnabled: true,
  mochi: 0,
  mochiV: 0,
  stretchUntil: 0,
};

export default S;