// Semua pengaturan dan status bersama kucing.
// Modul lain memakainya lewat: const S = require('./state');

const S = {
  // ===== Pengaturan (boleh diubah) =====
  WIN: 260, // harus sama dengan WIN di main.js
  BASE: '../../../assets/', // lokasi folder assets dari index.html
  SLEEP_AFTER_MS: 5 * 60 * 1000, // diam sekian milidetik -> tidur
  LOVE_START_UP: 0.42, // makin besar, hati muncul makin tinggi
  SLEEP_HEAD_DROP: 0.14, // kepala turun saat tidur (pecahan tinggi kucing)
  FOLLOW_HEAD: 3, // seberapa jauh kepala condong ke kursor
  FOLLOW_BODY: 1, // seberapa jauh badan ikut
  PLAY_SPEED: 700, // kecepatan kursor (px/detik) agar kucing bermain
  PLAY_RADIUS: 140, // jarak kursor dari kucing agar dianggap "di depan kucing"
  FEET_X: 0.46, // posisi kaki di gambar (0 kiri, 1 kanan); badan miring dari titik ini
  FEET_Y: 0.82, // posisi telapak kaki (0 atas, 1 bawah); kaki tetap menapak di titik ini

  // ----- Pose mengetik (click1/click2) -----
  TYPE_HOLD_MS: 1200, // pose mengetik bertahan sekian ms setelah ketikan terakhir
  TYPE_SHIFT_Y: -2, // geser pose mengetik (piksel gambar, negatif = naik) supaya lantainya sejajar kucing biasa
  TAIL_PIVOT: [0.83, 0.58], // pangkal ekor di pose ketik (tersembunyi di belakang badan)
  WHISKER_DY: 3, // kumis pose ketik turun sekian piksel gambar (supaya tidak menimpa mata)
  WHISKER_DX: 2, // kumis pose ketik geser ke kanan sekian piksel gambar (negatif = ke kiri)
  HEAT_KPS: 7, // ketikan per detik yang dianggap "terlalu cepat"
  HEAT_RISE_MS: 5000, // lama ngetik cepat sampai memerah
  HEAT_FALL_MS: 3000, // lama mendingin kalau ngetik sudah pelan
  FRUSTRATE_AT: 0.4, // di atas ini gelembung frustrasi muncul (0 sampai 1)
  HOT_MS: 6000, // lama memerah
  TIRED_MS: 6000, // lama lelah (mata tertutup + gelembung)
  EXCITED_KPS: 4, // ketikan per detik yang bikin ekor kibas cepat (sebelum gelembung/memerah); makin kecil = makin gampang semangat
  EXCITED_HOLD_MS: 1500, // ekor tetap kibas cepat sekian ms setelah ngetik melambat
  EXCITED_BURST_PERIOD: 0.09, // detik per kibasan saat semangat naik/turun ("sangat cepat"); makin kecil makin gila
  EXCITED_RAMP_MS: 120, // makin besar, "sangat cepat"-nya makin lama (naik/turun semangat)
  EXCITED_WAG_PERIOD: 0.35, // detik per satu kibasan saat semangat (makin kecil makin cepat); 0.35 = sama dengan mode bermain
  EXCITED_WAG_AMP: 38, // lebar kibasan (derajat); mode bermain 25, dilebarkan karena ekor di pose ketik sebagian tertutup

  // ----- Pose scroll (kucing menarik gulungan tisu) -----
  SCROLL_HOLD_MS: 1400, // pose scroll bertahan sekian ms setelah scroll terakhir
  SCROLL_SHIFT_Y: 0, // geser pose scroll (piksel gambar, negatif = naik) supaya lantainya sejajar
  TISSUE_LINES: true, // false = tanpa garis tisu yang meluncur turun
  LINE_TRAVEL: 5, // makin besar, makin jauh garis meluncur turun (acak, piksel gambar)
  LINE_MS: 800, // lama satu garis dari muncul sampai hilang
  SCROLL_BUBBLES: ['effects/gelembung2.png', 'effects/gelembung4.png'], // gelembung saat scroll, bergantian; [] = tanpa gelembung

  // ----- Garis tepi luar otomatis (warnanya mengikuti "Garis tepi" di panel kustomisasi) -----
  OUTLINE_PX: 1, // tebal garis (piksel gambar); 0 = mati
  OUTLINE: { idle: true, typing: true, scroll: true, celebrate: true }, // pose mana yang diberi garis tepi

  // ----- Pose perayaan (ComfyUI, unduhan, atau salin file selesai) -----
  CELEBRATE_MS: 2400, // lama total pose perayaan
  CELEBRATE_HOPS: 3, // jumlah lompatan
  CELEBRATE_HOP_PX: 4, // tinggi lompatan (piksel gambar)
  CELEBRATE_SHIFT_Y: 0, // geser pose perayaan (piksel gambar, negatif = naik)

  // ----- Pose minum (pengingat minum) -----
  DRINK_DELAY_MS: 700, // jeda dari munculnya pesan sampai kucing mulai menunduk
  DRINK_MS: 6000, // lama total pose minum (termasuk menunduk dan bangun lagi)
  DRINK_DROP_PX: 10, // kepala turun sekian piksel gambar ke mangkuk (hasil ukur desain; jangan diubah kecuali desain berubah)
  DRINK_IN_MS: 450, // lama kepala turun
  DRINK_OUT_MS: 450, // lama kepala naik lagi
  DRINK_BOB_MS: 500, // satu siklus jilat: setengah pertama kepala di mangkuk + lidah penuh, setengah kedua kepala naik + lidah menciut
  DRINK_BOB_UP_PX: 2, // seberapa naik kepala antar jilatan (piksel gambar)
  DRINK_TONGUE_Y0: 32, // baris teratas lidah di lidah.png (hasil ukur)
  DRINK_TONGUE_UP_ROWS: 1, // berapa baris lidah yang kelihatan saat kepala naik (lidah penuh = 3 baris)
  DRINK_PUPIL_DY: 1, // pupil turun sekian piksel gambar saat minum (melihat mangkuk); 1 = batas bawah mata
  DRINK_BLINK_MIN_MS: 1200, // jeda kedip tercepat saat minum
  DRINK_BLINK_MAX_MS: 2800, // jeda kedip terlama saat minum
  cel: null, // layer pose perayaan (diisi buildCelebrate)
  scr: null, // layer pose scroll (diisi buildScroll)
  lastScroll: -10000,
  scrollTick: 0,
  scrollFrame: 0,

  // ===== Elemen dan data (diisi saat start) =====
  stage: null,
  hud: null,
  bubble: null,
  rig: null,
  parts: {},
  groups: {},
  typ: null, // layer pose mengetik (diisi buildTyping)
  angryImgs: [], // gelembung2, gelembung4
  SCALE: 2,

  // ===== Status =====
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
  statusText: '',
  sayText: '',
  sayUntil: 0,
};

module.exports = S;