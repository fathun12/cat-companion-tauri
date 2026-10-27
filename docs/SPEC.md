# SPEC.md: Cat Companion (desktop pet kucing piksel)

Dokumen serah-terima. AI mana pun yang melanjutkan proyek ini WAJIB membaca seluruh file ini dulu, terutama **bagian 2 (cara kerja dengan pemilik)**.

Terakhir diperbarui: 26 Oktober 2026 (ditulis ulang total dari catatan yang menumpuk).

---

## 1. Tujuan proyek

Pemilik membuat desktop pet sendiri: kucing piksel yang hidup di desktop Windows, terinspirasi app berbayar **Comnyang** (comnyang.com), tapi dengan fitur lebih banyak sesuai kebutuhan pribadi.

Prinsip:
- Tiru **ide dan fitur**, JANGAN pakai aset gambar atau sprite Comnyang. Semua gambar dibuat pemilik sendiri (kucing hitam piksel, mata biru, dibuat di LibreSprite).
- Hasil akhir: aplikasi yang dipakai sehari-hari, bisa dikustomisasi (warna, pola), dan punya installer.

Fitur yang sudah ada (detail di bagian 6): reaksi ke mouse dan keyboard, bermain dengan kursor, pose mengetik (termasuk mode panas), pose scroll dengan gulungan tisu, tidur otomatis, Pomodoro, pengingat, kustomisasi warna dan pola, mode mengintip saat layar penuh, tray, auto-start, installer.

---

## 2. Cara kerja dengan pemilik (WAJIB DIPATUHI)

Pemilik: pemula (awam), **Windows**, **VS Code**, terminal **PowerShell 5.1**, berbahasa Indonesia, sangat peduli token.

1. **Jawab dalam bahasa Indonesia**, santai, jelas, tanpa jargon berlebihan. Istilah teknis dijelaskan singkat.
2. **Hemat token.** Singkat dan langsung ke inti. Jangan mengulang penjelasan.
3. **Jangan membuat prototipe atau kode besar yang tidak diminta.** Kerjakan hanya yang diminta.
4. **Jangan minta screenshot.** Kalau pemilik menempel output terminal, percayai itu. "udah" berarti langkah berhasil. Kalau error, minta TEKS error, bukan gambar.
5. **Jangan menanyakan hal yang sudah dijawab.** Cek spec ini dulu.
6. **Membuat folder dan file: satu skrip PowerShell** dengan format ini (jangan `mkdir` satu per satu):

```powershell
$files = @(
  "path\ke\file1.js",
  "path\ke\file2.js"
)
foreach ($p in $files) {
  $full = Join-Path $PWD $p
  [System.IO.Directory]::CreateDirectory((Split-Path $full)) | Out-Null
  if (-not (Test-Path -LiteralPath $full)) { New-Item -ItemType File -Path $full | Out-Null }
}
```

7. **Kode ditulis langsung di chat** (blok kode) agar tinggal disalin ke VS Code.
8. **Mengganti kode memakai format SEBELUM/SESUDAH**: tampilkan blok lama (SEBELUM) dan blok baru (SESUDAH) yang menggantikannya utuh. JANGAN instruksi seperti "taruh ini di bagian itu, ubah ini sampai ini". Untuk file yang berubah hampir total: "Ctrl+A lalu timpa seluruh isi dengan:".
9. File baru berisi kode: sebut nama dan lokasinya, lalu beri isinya.
10. Akhir tiap tahap: beri perintah commit Git dan, kalau perlu, catatan SPEC (juga format SEBELUM/SESUDAH atau `Add-Content`).
11. Akhiri tiap langkah dengan kriteria "berhasil kalau...", dan cara menutup/membatalkan bila relevan.
12. Maksimal satu pertanyaan klarifikasi per giliran. Lebih baik berasumsi dan menyebut asumsinya.
13. **Kalau perlu melihat isi file atau output**, buatkan perintah PowerShell yang menyalin ke clipboard supaya pemilik tinggal menempel (Ctrl+V) ke chat. Jalankan dari `D:\Projects\cat-companion`.

Satu file:

```powershell
Get-Content -Raw -Encoding UTF8 "main.js" | Set-Clipboard
```

Beberapa file (ganti isi daftar):

```powershell
$files = @("main.js", "src\renderer\pet\state.js")
($files | ForEach-Object { "=== $_ ===`r`n" + (Get-Content -Raw -Encoding UTF8 $_) }) -join "`r`n`r`n" | Set-Clipboard
```

Output error dari perintah:

```powershell
npm start 2>&1 | Out-String | Set-Clipboard
```

14. **Kode pemilik bisa diubah sesi AI lain.** Sebelum mengedit file yang mungkin berubah, MINTA isi terbarunya lewat perintah clipboard (aturan 13), jangan menebak dari ingatan. Jangan menyarankan `git restore .` karena bisa menghapus pekerjaan sesi lain. Cek `git status` dan `git log` bila ragu.
15. **Error cache Chromium saat `npm start` aman diabaikan** ("Unable to move the cache: Access is denied", "Gpu Cache Creation failed"). Selama kucing muncul, tidak ada masalah. Biasanya muncul bila ada instance Electron lain masih jalan.
16. **Jangan menghidupkan lagi hal yang dibatalkan pemilik** (lihat bagian 8).
17. Pemilik menilai hasil dari tampilan: kalau ada yang "aneh/jelek", tanyakan gejalanya singkat dan setel angka di `state.js` dulu sebelum menulis ulang kode.

---

## 3. Tech stack dan keputusan

| Hal | Keputusan |
|---|---|
| Platform | Windows (utama). macOS tidak diuji |
| Framework | **Electron** `^45.0.0`, JavaScript (CommonJS), `nodeIntegration: true`, `contextIsolation: false` |
| Animasi | **Prosedural lewat kode** (puppet/cutout animation) dari layer PNG terpisah; bukan sprite sheet penuh |
| Render | HTML + CSS transform, `image-rendering: pixelated`, skala bilangan bulat |
| Input global | `uiohook-napi` (modul native) |
| Font menu | `@fontsource/pixelify-sans` (diambil dari `node_modules`) |
| Penyimpanan | File JSON sendiri di `%APPDATA%\cat-companion\` (BUKAN `electron-store`) |
| Packaging | `electron-builder` (`electron-builder.yml`, `build/icon.ico`) |
| Lisensi | Unlicense |
| Tool gambar | LibreSprite; sumber `.ase` di folder pemilik dan `art/source/` |

Alasan animasi prosedural: pemilik merasa membuat banyak frame melelahkan. Gambar hanya untuk pose statis, ekspresi, dan efek.

### Aturan privasi (jangan dilanggar)

- Pembaca input global hanya mencatat **ada atau tidaknya** aktivitas (ketik, gerak mouse, scroll, klik). **Jangan pernah menyimpan atau mengirim tombol apa yang ditekan.** (Pose mengetik hanya menyimpan WAKTU ketikan di `S.keyTimes`.)
- Mode mengintip hanya membaca satu angka status layar penuh dari Windows (`SHQueryUserNotificationState`), tanpa judul jendela atau isi layar.
- Tidak ada pelacakan atau pengiriman data ke luar.

---

## 4. Struktur proyek sebenarnya

Lokasi: `D:\Projects\cat-companion` (branch `master`).

```
cat-companion/
├── main.js                         # proses utama (lihat bagian 5)
├── package.json  (main: "main.js", start: "electron .")
├── electron-builder.yml, README.md, LICENSE, .gitignore
├── build/icon.ico
├── docs/SPEC.md (file ini), roadmap.md, art-guide.md (kosong/ringan)
├── art/                            # bahan mentah, tidak dibundel
├── assets/
│   ├── cat/
│   │   ├── rig.json                # layer idle, grup, pivot, lokasi efek
│   │   ├── body/badan.png
│   │   ├── parts/                  # ekor, kepala, kumis, kuping, tangan
│   │   ├── eyes/                   # mata, mata_tidur, mata_tertutup2, pupil
│   │   ├── typing/                 # pose mengetik: click1, click2, ekor, kepala, kuping, kumis, mata, pupil
│   │   └── scroll/                 # pose scroll: tisu, badan, ekor, kepala, kuping, kumis, mata, pupil,
│   │                               #   tangan_kiri, tangan_kanan, kaki_kiri, kaki_kanan
│   └── effects/                    # love, gelembung, gelembung2, gelembung4
└── src/
    ├── main/services/
    │   ├── timers.js               # Pomodoro, pengingat, pesan kustom, catatan, pengaturan
    │   └── menuWindow.js           # jendela menu klik kanan buatan sendiri
    └── renderer/
        ├── pet/                    # tampilan kucing (modul, lihat bagian 5)
        ├── panel/                  # jendela kustomisasi (index.html, main.js)
        └── menu/                   # menu klik kanan (index.html, menu.js)
```

Semua kanvas gambar **48x48 piksel**, latar transparan, semua layer bertumpuk di posisi (0,0). File `.ts` kosong dan `tsconfig.json` dari rencana awal sudah dihapus; proyek 100% JavaScript.

---

## 5. Peta kode

### `main.js` (proses utama)
- Jendela kucing 260x260 (`WIN = 260`, harus sama dengan `S.WIN` di `state.js`): transparan, tanpa frame, always-on-top, click-through (`setIgnoreMouseEvents(true, {forward:true})`) kecuali saat kursor di atas kucing (IPC `set-ignore-mouse`).
- Satu instance saja (`requestSingleInstanceLock`). Posisi terakhir disimpan di `pos.json`; diselamatkan ke monitor utama bila monitor dicabut.
- Keluar darurat: **Ctrl+Shift+Q**.
- `uIOhook`: mengirim IPC `activity` dengan nilai `key`/`mouse`/`scroll`/`click` (tanpa isi ketikan). Mengirim `cursor` (posisi kursor relatif jendela, tiap 50 ms).
- Drag jendela: IPC `drag-start`/`drag-end`.
- **Mode mengintip**: proses PowerShell tersembunyi membaca status layar penuh; saat penuh, jendela meluncur ke tepi bawah (`PEEK_VISIBLE = 150`) dan kembali setelahnya. Bisa dimatikan (setting `peek`).
- Tray: klik = tampil/sembunyi, menu tray (bawaan Windows): tampil/sembunyi, Kustomisasi, "Jalankan saat Windows menyala", Keluar.
- Panel kustomisasi (`open-panel`) dan penyimpanan tampilan (`look-get`, `look-set` ke `look.json`, siaran `look`).

### `src/main/services/timers.js`
- Pomodoro (fokus/istirahat/jeda/reset), pengingat peregangan dan minum, pesan kustom (jam:menit harian, nama panggilan), catatan sematan.
- Pengaturan di `settings.json`: `focusMin`, `breakMin`, `stretchMin`, `waterMin` (0 = nonaktif), `hunt` (= "Bermain dengan kursor"), `peek`, `name`, `messages`, `note`.
- IPC ke kucing: `status` (teks timer), `say` (teks pengingat + jenis `stretch`/`hop`), `play-enabled`, `note`.
- IPC dari menu dan panel: `show-menu`, `menu-state`, `menu-action`, `play-get`, `note-get`, `note-set`, `msgs-get`, `msgs-set`.
- Catatan: fungsi `buildMenu()` dan `radio()` adalah sisa menu bawaan lama dan TIDAK dipakai lagi (boleh dihapus).

### `src/main/services/menuWindow.js` + `src/renderer/menu/`
Menu klik kanan buatan sendiri, gaya brutalis + pixel art: palet krem/pink/mint/kuning mentega/lavender dengan tinta `#2b2140`, border tebal, bayangan keras, font Pixelify Sans, ikon pixel 7x7 digambar lewat SVG di `menu.js`. Isi: Pomodoro (mulai/jeda/lanjutkan, reset, status), chip durasi (fokus, istirahat, peregangan, minum), saklar (bermain dengan kursor, mengintip), Kustomisasi, Keluar. Menu tetap terbuka saat ganti chip/saklar, menutup saat klik di luar (blur), Esc, atau setelah aksi Pomodoro/Kustomisasi/Keluar. Jendela menyesuaikan tinggi lewat IPC `menu-size`.

### `src/renderer/pet/` (modul CommonJS tanpa build; semua status bersama ada di objek `S`)
- `state.js`: semua konstanta pengaturan dan variabel status (tabel bagian 7).
- `actions.js`: `setSleep`, `spawnLove`, `updateHud`, `rand`.
- `rig.js`: `buildRig` (muat gambar, layer idle, pivot, gelembung tidur, `buildTyping`, `Scroll.buildScroll`), `applyLook` (warna/pola ke semua pose), `setOutline` (garis tepi luar otomatis), `initLook`.
- `input.js`: semua listener mouse/drag/klik kanan dan semua pesan IPC dari `main.js`, deteksi "bermain", event `scroll` (menaikkan `scrollTick`, menukar `scrollFrame`), event `key` (mencatat waktu ketikan, menukar `typeFrame`), kotak catatan sematan (kuning di atas kepala).
- `animate.js`: loop animasi (napas, tidur, bermain, elus/dengkur, kepala/badan kenyal ikut kursor, ekor, kuping, kedip, pupil, mochi, kaki menapak) **dan** logika pose mengetik (panas/frustrasi/lelah) yang masih tercampur di sini.
- `scroll.js`: pose scroll (kucing menarik gulungan tisu): `buildScroll`, `applyLook`, `update`.
- `look.js`: pewarnaan ulang layer (`SRC`, `PID`, `RECOLOR`), pola prosedural, preset, `recolorAll`, `composite`, `closedEyes` (dipakai pose mengetik). Hanya 25 baris awal yang terakhir dilihat; bila perlu, minta file lengkap.
- `pet.js`: titik awal (`buildRig`, `initInput`, `initLook`, `startLoop`).
- `index.html`: `#stage`, `#hud`, CSS layer.

### `src/renderer/panel/`
Jendela kustomisasi bergaya brutalis + pixel art (sama dengan menu klik kanan: font Pixelify Sans, palet krem/pink/mint/lavender/butter, border tebal, bayangan keras), tiga tab: **Tampilan** (pratinjau, 5 preset, 4 warna, 4 pola prosedural), **Catatan** (catatan sematan, IPC `note-get`/`note-set`), **Pesan** (nama panggilan dan pesan harian, IPC `msgs-get`/`msgs-set`). Perubahan tampilan lewat IPC `look-set`.

Editor pola piksel (Tahap B, SELESAI): panel punya lima tab (**Tampilan, Pola, Mata, Catatan, Pesan**) dan jendela 800x780. Aside kiri berisi pratinjau, Urungkan, Buang, dan "Simpan preset". Tab Pola: satu kisi piksel per bagian (`earL`, `earR`, `head`, `body`, `arm`, `foot` (satu kisi dipakai kedua kaki), `tail`), alat Kuas/Penghapus (klik kanan = hapus), ukuran kuas 1/2/3/5, palet 16 warna + warna bebas; hanya piksel isi badan (kecerahan < 40 di gambar acuan) yang bisa dilukis. Tab Mata: warna latar mata, warna mata, opsi mata beda warna; `null` = pakai warna asli gambar. Format `look.json` baru: `{ body, outline, parts: { key: { w, h, px: ['' atau '#rrggbb', ...] } }, eyeBg, eyeColor, odd, eyeColor2 }`; `px` kosong = warna badan. `look.json` lama (`p1`, `p2`, `pattern`, tanpa `parts`) masih dibaca lewat jalur rumus lama di `recolorAll`, dan diubah jadi kisi saat panel dibuka (`fromPreset`). Preset buatan pemilik di `presets.json` (`presets-get`/`presets-set`). Di `look.js`: `PART_OF` memetakan layer ke bagian, `GRID_REF` layer acuan ukuran kisi, `patColor` mengambil warna kisi lewat posisi RELATIF di kotak pembatas layer (jadi pola ikut ke pose mengetik dan scroll, tidak persis per piksel; di pose mengetik kaki ikut kisi badan karena satu gambar dengan papan ketik), kuping dibagi dua di tengah kotak pembatas.

---

## 6. Perilaku yang sudah jalan

- **Idle:** napas (kepala naik-turun 1 piksel), ekor goyang bertahap per 5 derajat, kuping berkedut acak, kedip, pupil melirik acak.
- **Mengikuti kursor:** pupil, kepala (condong dan miring), badan (miring dari titik kaki) dengan efek pegas kenyal. Kaki tetap menapak: badan miring/menunduk dari titik `FEET_X/FEET_Y`, hanya saat di-drag boleh terangkat.
- **Klik kucing:** hati melayang. **Drag:** efek mochi (memanjang, mengayun). **Elus:** gerakkan kursor di atas kucing lama, mata menutup, bergetar, hati berkala, mendengkur. Mengelus kucing tidur membangunkannya.
- **Bermain dengan kursor:** kursor digerakkan cepat di dekat kucing (`PLAY_SPEED`, `PLAY_RADIUS`): kucing menunduk, badan geol-geol dari kaki, ekor kibas cepat. Jendela TIDAK berpindah.
- **Pose mengetik** (`assets/cat/typing`): tiap ketikan kaki bergantian (click1/click2), kepala menekan sedikit. Mengetik cepat: frustrasi (gelembung2/gelembung4) lalu memerah (versi merah tiap layer lewat opacity, getar, pupil berputar pusing) lalu lelah (mata tertutup, gelembung lambat).
- **Pose scroll** (`assets/cat/scroll`): tangan kiri-kanan bergantian menarik gulungan tisu tiap event scroll, kepala mengangguk, ekor berkibas, berkedip (mata tertutup digambar lewat kode dari bentuk `scroll/mata.png`), gelembung bergantian (`SCROLL_BUBBLES`), 1-3 garis vertikal kecil acak di tengah gulungan yang meluncur turun lalu memudar (`TISSUE_LINES`).
- **Tidur:** tidak ada aktivitas selama `SLEEP_AFTER_MS` (5 menit) lalu kepala turun ke badan (melingkar), mata tidur, gelembung. Keyboard/klik/scroll/elusan membangunkan, gerak mouse saja tidak.
- **Garis tepi luar otomatis** (`setOutline`, filter drop-shadow 4 arah): warna mengikuti "Garis tepi" di panel, tebal `OUTLINE_PX` x skala; aktif untuk semua pose (`OUTLINE.idle: true` menimpa yang lain agar tidak dobel).
- **Pomodoro, pengingat, pesan kustom, catatan sematan** (lihat `timers.js`): teks tampil di `#hud` 7 detik, kucing bangun, meregang atau melonjak.
- **Kustomisasi:** warna dan pola diterapkan ke pose idle, mengetik, dan scroll; tersimpan di `look.json`.
- **Mode mengintip, tray, auto-start, ingat posisi, multi-monitor, satu instance.**

---

## 7. Konstanta yang bisa disetel (`src/renderer/pet/state.js`)

| Konstanta | Fungsi |
|---|---|
| `WIN` | ukuran jendela (harus sama dengan `main.js`) |
| `SLEEP_AFTER_MS` | diam sekian ms lalu tidur |
| `LOVE_START_UP` | tinggi awal hati |
| `SLEEP_HEAD_DROP` | seberapa turun kepala saat tidur |
| `FOLLOW_HEAD`, `FOLLOW_BODY` | seberapa condong ke kursor |
| `PLAY_SPEED`, `PLAY_RADIUS` | kecepatan dan jarak pemicu bermain |
| `FEET_X`, `FEET_Y` | titik telapak kaki (pivot badan, jangkar lantai) |
| `TYPE_HOLD_MS`, `TYPE_SHIFT_Y`, `TAIL_PIVOT`, `WHISKER_DX/DY` | pose mengetik |
| `HEAT_KPS`, `HEAT_RISE_MS`, `HEAT_FALL_MS`, `FRUSTRATE_AT`, `HOT_MS`, `TIRED_MS` | mode panas |
| `SCROLL_HOLD_MS`, `SCROLL_SHIFT_Y` | pose scroll |
| `TISSUE_LINES`, `LINE_TRAVEL`, `LINE_MS`, `SCROLL_BUBBLES` | efek scroll |
| `OUTLINE_PX`, `OUTLINE` | garis tepi luar otomatis |

Data pengguna di `%APPDATA%\cat-companion\`: `settings.json`, `look.json`, `pos.json`.

---

## 8. Keputusan dan hal yang dibatalkan

- **DIBATALKAN pemilik:** kucing mengejar kursor dengan memindahkan jendela (mengganggu, menutupi layar). JANGAN dibuat lagi. Versi sekarang: bermain di tempat (menunduk, geol, ekor).
- Pola kustom dihitung dari kotak pembatas piksel tiap layer (kepala dan badan beda titik tengah karena kucing serong); geser manual lewat `CX_HEAD`/`CX_BODY` di `look.js`.
- Palette swap tanpa warna penanda: kucing hitam-putih dipetakan dari kecerahan piksel. Mata, pupil, kumis tidak diwarnai. Papan ketik di click1/click2 dibiarkan abu-abu.
- Tidur melingkar lewat kode (kepala diturunkan), bukan gambar pose.
- Pesan kustom dan catatan tersimpan di `settings.json` (bukan `electron-store`).
- Struktur rencana awal (`core/brain/animation`, TypeScript) tidak dipakai.
- Gulungan tisu: kertas panjang bentuk "U" dibatalkan (jelek); diganti garis vertikal acak di tengah gulungan.

---

## 9. Status phase

| Phase | Isi | Status |
|---|---|---|
| 0 | Persiapan (Node, Git, Electron) | Selesai |
| 1 | Desain karakter | Selesai (pose idle, mengetik, scroll) |
| 2 | Jendela transparan, click-through | Selesai |
| 3 | Rig dan animasi prosedural | Selesai |
| 4 | Input global, reaksi mengetik, tidur | Selesai (tanpa state machine formal; status berupa flag di `state.js`) |
| 5 | Interaksi mouse | Selesai (mata/kepala kenyal, mochi, elus, bermain, scroll tisu, mode panas) |
| 6 | Pomodoro, pengingat, pesan, catatan | Selesai di sisi kode; UI kotak input di panel belum diverifikasi |
| 7 | Kustomisasi warna dan pola | Selesai |
| 8 | Polish: tray, auto-start, multi-monitor, mengintip | Selesai (dikerjakan sesi AI lain) |
| 9 | Installer `electron-builder`, ikon, README | Selesai (dikerjakan sesi AI lain) |

---

## 10. Antrean pekerjaan

1. **Pindahkan logika pose mengetik** dari `animate.js` ke modul sendiri (`typing.js`), seperti `scroll.js`.
2. **Verifikasi panel kustomisasi:** apakah sudah ada kotak input pesan kustom dan catatan sematan; bila belum, buat.
3. **Bersihkan** `buildMenu()` dan `radio()` yang tak terpakai di `timers.js`.
4. **Menu tray** masih bawaan Windows; bisa disamakan gayanya bila pemilik mau.
5. Cek installer: font menu dari `node_modules/@fontsource/pixelify-sans` harus ikut terbungkus (`electron-builder.yml`).
6. Fitur lanjutan (tunggu pemilik): statistik harian, mood kucing, aksesori, reaksi ke AI agent, pose berjalan.
7. Opsional: state machine formal, migrasi TypeScript.

Hal yang belum diverifikasi AI penulis: isi lengkap `look.js` (kecuali 25 baris awal), isi `panel/main.js` dan `index.html` terbaru, `electron-builder.yml`, dan `README.md`. Minta lewat perintah clipboard sebelum mengeditnya.


---

## Catatan optimasi RAM (26 Oktober 2026)

- Total RAM turun dari 288 MB ke 117 MB (privat, versi build).
- pp.disableHardwareAcceleration() di main.js: proses GPU turun dari 83 MB ke 15 MB.
- Mode mengintip kini membaca SHQueryUserNotificationState langsung lewat modul koffi (timer 1,5 detik di main.js). Proses PowerShell tersembunyi DIBUANG (hemat 65 MB). JANGAN dikembalikan ke PowerShell. Privasi tetap sama: hanya satu angka status.
- uild/icon.ico harus ICO asli (16/32/48/256). Sumber PNG ada di uild/icon-src.png.

- [26 Okt 2026] Logika pose mengetik (panas/frustrasi/lelah, kaki, kepala, mata, ekor, merah, gelembung) dipindah dari animate.js ke src/renderer/pet/typing.js (update, isHot). buildTyping tetap di rig.js. Fungsi spring dipindah ke actions.js dan dipakai bersama animate.js, scroll.js, dan typing.js.

- [26 Okt 2026] Fitur pengamat + pose perayaan. src/main/services/watchers.js mengirim IPC 'say' + 'celebrate' ke kucing saat: ComfyUI selesai (poll /queue tiap 3 dtk, cek /history untuk sukses/error), unduhan browser selesai (fs.watch folder Unduhan, file sementara .crdownload/.part hilang + ada file baru), salin/pindah file Explorer selesai (cek jendela kelas OperationStatusWindow via koffi). Pengaturan berupa konstanta di atas watchers.js. Pose perayaan di src/renderer/pet/celebrate.js (badan berdiri dari pose scroll, tangan dari assets/cat/celebrate/, lompat 3x, hati). Privasi: hanya status antrean, nama file di folder Unduhan, dan ada/tidaknya jendela progres; tanpa judul jendela, isi file, atau data keluar.

- [26 Okt 2026] Pose perayaan memakai tangan buatan pemilik: assets/cat/celebrate/tangan_kiri_angkat.png dan tangan_kanan_angkat.png. Ekor pose mengetik kibas cepat (0,35 dtk, 25 derajat, sama dengan mode bermain) saat ngetik >= EXCITED_KPS per detik (state.js), ditahan EXCITED_HOLD_MS. Masalah dikenal: di kucing hitam versi merah tidak terlihat (warm() di look.js sengaja membiarkan piksel gelap, garis tepi putih berupa filter CSS).

- [26 Okt 2026] Pengamat salin file di watchers.js DIMATIKAN (WATCH_COPY = false). Dites di Windows 11 pemilik: FindWindow("OperationStatusWindow") selalu False dan EnumWindows tidak menemukan kelas jendela baru saat menyalin node_modules, jadi dialog progres Explorer tidak bisa dibaca dari luar. Jangan dicoba lagi dengan cara yang sama.

- [26 Okt 2026] Efek ekor "sangat cepat" di mode bermain (animate.js) adalah efek samping rumus sin(s*2*PI/period) dengan s = waktu total: tiap period berubah (playAmt naik/turun) fase melonjak sebanding uptime. Pemilik MENYUKAI efek ini, jadi animate.js JANGAN dirapikan. Di pose mengetik (typing.js drawTail) efeknya ditiru sengaja: fase dijumlahkan per frame, burst = kibasan EXCITED_BURST_PERIOD selama semangat naik/turun (EXCITED_RAMP_MS), lalu kibas cepat stabil.

- [26 Okt 2026] Pose minum: src/renderer/pet/drink.js. Pengingat minum (timers.js, jenis 'drink') memicu mangkuk (assets/cat/drink/bowl.png) + lidah (lidah.png, di grup kepala); kepala turun-naik, lidah keluar saat turun. Menimpa pose mengetik/scroll selama DRINK_MS. Konstanta DRINK_* di state.js. Gambar tidak diwarnai ulang.

- [26 Okt 2026] Pose minum DIPERBAIKI (menggantikan catatan pose minum sebelumnya): kepala turun DRINK_DROP_PX=10 piksel gambar (diukur dari desain pemilik: mata idle baris 15-18, di desain baris 25-28). lidah.png digambar di posisi kepala-turun, jadi di grup kepala digeser -DRINK_DROP_PX dan ikut gerak kepala. bowl.png di panggung paling atas. Kepala berhenti mengikuti kursor saat minum. Konstanta DRINK_* di state.js.

- [26 Okt 2026] Pose minum disempurnakan: saat minum (animate.js, flag drinking) pegas kepala/badan, pupil, mode bermain, dan dengkur dikunci supaya tidak ikut kursor. Lidah (anak grup kepala) selalu kelihatan dan menempel; menjulur penuh saat kepala turun, menciut ke DRINK_TONGUE_UP_ROWS baris (clip-path) saat kepala naik DRINK_BOB_UP_PX.

- [26 Okt 2026] Pose minum: pupil menatap ke bawah (DRINK_PUPIL_DY=1) dan kedip lebih sering (DRINK_BLINK_MIN_MS/MAX_MS) selama minum.

- Editor pola: alat tambahan **Isi** (flood fill 4 arah pada piksel isi badan dengan warna sama, klik kanan = kembali ke warna badan) dan **Cermin** (melukis/mengisi sisi seberang; kuping kiri <-> kuping kanan, bagian lain bercermin di kisinya sendiri, sumbu = tengah kisi). Kursor asli disembunyikan di kisi; gantinya pratinjau di canvas (`drawHover` di `panel/main.js`): kotak seukuran kuas berisi warna pilihan, putus-putus untuk penghapus, area yang akan terisi untuk Isi. Memilih warna tidak memindahkan alat ke Kuas kecuali sedang memakai Penghapus.

- [26 Okt 2026] Ukuran installer: 108,7 MB (Cat Companion.exe 238 MB terpasang, hampir semuanya Electron; kode app hanya ~3 MB). electron-builder.yml: compression: maximum + afterPack (build/afterPack.js) menghapus dxcompiler.dll, vk_swiftshader.dll, vk_swiftshader_icd.json, vulkan-1.dll karena GPU dimatikan. Kalau kucing gagal tampil, kosongkan daftar REMOVE.

- [26 Okt 2026] CABANG tauri-test (folder terpisah ..\cat-companion-tauri, git worktree): uji kelayakan Tauri 2. Tahap 1: jendela transparan always-on-top + click-through lewat thread Rust yang membaca cursor_position tiap 30 ms (Tauri hanya punya set_ignore_cursor_events tanpa forward). Master/Electron tidak disentuh.

- [26 Okt 2026] REPO cat-companion-tauri (terpisah dari Electron). Tahap 2a: animasi idle + interaksi (hati, seret lewat thread Rust, bermain, elus, tidur) dan input global lewat crate rdev (hanya jenis aktivitas, tombol tidak dibaca). Pose mengetik/scroll/minum/perayaan, warna, tray, menu, Pomodoro belum dipindah.

- [26 Okt 2026] REPO cat-companion-tauri, tahap 2b: renderer dipecah jadi modul ES di web\js (state, actions, look, rig, typing, scroll, celebrate, drink, animate, input, main), tanpa Vite. Pose mengetik, scroll, perayaan, minum dan pewarnaan sudah dipindah. Perayaan/minum dipicu event Tauri 'celebrate' dan 'say' (payload [teks, jenis]); sementara dites lewat klik kanan. Belum: look.json/panel, tray, menu klik kanan, Pomodoro/HUD, watchers, ingat posisi, mengintip.

- [27 Okt 2026] Tauri tahap 3a: ingat posisi (pos.json di %APPDATA%\com.catcompanion.tauritest), tray (tauri tray-icon), satu instance, Ctrl+Shift+Q, skipTaskbar, mode mengintip (SHQueryUserNotificationState lewat extern shell32), look.json dimuat lewat perintah look_get/look_set. Belum: menu klik kanan, Pomodoro/HUD, panel kustomisasi, watchers.

- [27 Okt 2026] Tauri tahap 3a: ingat posisi (pos.json di %APPDATA%\com.catcompanion.tauritest), tray (tauri tray-icon), satu instance, Ctrl+Shift+Q, skipTaskbar, mode mengintip (SHQueryUserNotificationState lewat extern shell32), look.json dimuat lewat perintah look_get/look_set. Belum: menu klik kanan, Pomodoro/HUD, panel kustomisasi, watchers.

- [27 Okt 2026] Tauri tahap 3a: ingat posisi (pos.json di %APPDATA%\com.catcompanion.tauritest), tray (fitur tray-icon), satu instance, Ctrl+Shift+Q, skipTaskbar, mode mengintip (SHQueryUserNotificationState lewat extern shell32), look.json dimuat lewat perintah look_get/look_set. Belum: menu klik kanan, Pomodoro/HUD, panel kustomisasi, watchers.

- [27 Okt 2026] Tauri tahap 3b: timers.rs (Pomodoro, pengingat, pesan kustom, catatan; settings.json), menu klik kanan sebagai jendela kedua 'menu' (web\menu), HUD teks dan catatan di web\js\hud.js. Event Rust ke tampilan: status, say ([teks,jenis]), play-enabled, note, menu-open. Belum: panel kustomisasi, watchers, menu tray bergaya (tray masih menu bawaan Windows).

---

## CATATAN VERSI TAURI (repo cat-companion-tauri, 27 Okt 2026)

Repo ini terpisah dari Electron. Isi bagian 3 sampai 7 di atas masih menggambarkan versi Electron; peta kode Tauri ada di sini.

**Aturan tambahan (WAJIB):** PowerShell hanya untuk membuat folder/file kosong, mengecek ukuran file, dan perintah git/clipboard. SEMUA KODE ditulis di chat dalam blok kode (aturan 6 sampai 9), bukan di dalam here-string PowerShell.

**Stack:** Tauri 2 (Rust) + HTML/JS modul ES tanpa bundler. Menjalankan: `npx --yes @tauri-apps/cli@2 dev`. Data pengguna di `%APPDATA%\com.catcompanion.tauritest\` (pos.json, look.json, settings.json, presets.json).

**Rust (src-tauri/src):**
- main.rs: jendela kucing, thread kursor + click-through + seret jendela, rdev (aktivitas global; hanya jenis, tombol tidak dibaca), tray (Tampil/Sembunyi, Kustomisasi, Jalankan saat Windows menyala, Keluar), satu instance, Ctrl+Shift+Q, ingat posisi, mode mengintip (SHQueryUserNotificationState), look_get/look_set.
- timers.rs: Pomodoro, pengingat peregangan/minum, pesan kustom, catatan, settings.json, menu klik kanan (jendela 'menu' tersembunyi, menu_size/menu_close/menu_state/menu_action).
- watchers.rs: pemantau unduhan (folder Unduhan) dan ComfyUI (port 8188, crate ureq). Pemantau salin file Explorer TIDAK dipindah.
- panel.rs: open_panel (jendela 'panel' dibuat saat diminta), presets_get/presets_set.

**Event Rust ke tampilan:** activity, cursor, status, say ([teks, jenis]), play-enabled, note, look, celebrate, menu-open.

**Tampilan (web/):** index.html + js/ (state, actions, look, rig, typing, scroll, celebrate, drink, animate, input, hud, main), menu/ (menu klik kanan, font di menu/fonts), panel/ (kustomisasi 5 tab, memakai js/look.js). Aset gambar di web/assets (salinan dari assets/ Electron).

**Belum / catatan:** menu tray masih menu bawaan Windows (bukan menu bergaya); pemantau salin file belum dipindah; belum ada installer (bundle.active = false); folder src/, assets/, art/, docs/ lama dari Electron masih ikut di repo ini.

- [27 Okt 2026] Tauri: menu tray bergaya SUDAH. Jendela 'menu' dipakai ulang dengan mode 'tray': perintah tray_state/tray_action di main.rs, show_menu_at di timers.rs, event menu-open (payload 'pet' atau 'tray'), tampilan di web\menu\menu.js (renderTray). Menu bawaan Windows dibuang.

- [27 Okt 2026] Tauri: klik tembus per piksel SUDAH. web\js\hit.js mengecek alpha piksel di bawah kursor (membalik rantai transform DOM tiap layer), lalu memanggil perintah Rust set_cat_hit. Thread kursor di main.rs memakai CAT_HIT (kotak CAT_X0..Y1 dihapus). hit.js diimpor dari celebrate.js (sementara, boleh dipindah ke main.js). Layer berkelas .effect (hati) dan layer berotasi opacity < 0.05 diabaikan.

- [27 Okt 2026] Tauri: hati saat klik kucing muncul di x acak (+-10 piksel gambar, actions.js spawnLove). Pose perayaan: tangan digeser lewat HAND_L_DX / HAND_R_DX di celebrate.js (tangan_kiri_angkat.png tampil di sisi KANAN layar).

- [27 Okt 2026] Tauri: installer SUDAH dibuild. tauri.conf.json: bundle.active true, targets nsis, installMode currentUser, productName "Cat Companion", versi 0.1.0, identifier com.catcompanion.app (data lama di %APPDATA%\com.catcompanion.tauritest disalin ke folder baru). Cargo.toml: [profile.release] codegen-units 1, lto, opt-level s, panic abort, strip. Build: npx --yes @tauri-apps/cli@2 build. Hasil di src-tauri\target\release\bundle\nsis: Cat Companion_0.1.0_x64-setup.exe 1,23 MB (Electron 108,7 MB); exe mentah 3,47 MB sudah termasuk di dalam setup, cukup bagikan setup.exe.

- [27 Okt 2026] RENCANA ASET (pemilik membuat ulang gambar satu per satu; perbaikan lewat kode ditunda). Masalah: click1/click2 berisi badan, kaki, dan keyboard dalam SATU gambar, jadi tepi gelap keyboard (1-5 px) ikut diwarnai (pewarnaan di look.js: kecerahan < 40 = warna badan, hanya abu-abu tengah yang dikecualikan lewat KEEP_MID). Rencana: keypad dan kaki dibuat terpisah, tangan dan keyboard pose mengetik dipisah, tisu dibuat ulang. Perkiraan perubahan kode setelah aset baru:
  * Keyboard: layer sendiri, JANGAN dimasukkan ke SRC/RECOLOR di look.js (otomatis tidak diwarnai), lalu hapus KEEP_MID dan entri click1/click2 di PART_OF dan PID.
  * Pose mengetik: buildTyping di rig.js (layer kaki/tangan dan keyboard baru), applyLook di rig.js (src layer baru), drawFeet dan drawRed di typing.js (pasangan _H per layer), PART_OF/PID di look.js (kaki memakai bagian 'foot' atau 'arm').
  * Kaki: look.js GRID_REF.foot = 's_kaki_kiri'. Bila ukuran gambar kaki berubah, kisi 'foot' di look.json lama tidak cocok (pola bergeser, tidak crash): panel (fromPreset/gridDims) perlu dibuka ulang dan pola kaki dilukis lagi, atau tambahkan migrasi.
  * Tisu: scroll.js measureRoll membaca kotak pembatas tisu.png untuk asal garis tisu, jadi ukuran/posisi baru ikut otomatis; tisu tidak diwarnai; geser 1 piksel saat tangan menarik (update).
  * Pose perayaan memakai badan, kaki, dan kepala dari assets/cat/scroll; ikut berubah bila aset scroll dibuat ulang. Tangan: assets/cat/celebrate. Cek HAND_L_DX / HAND_R_DX lagi setelah tangan baru.
  * Klik tembus (hit.js) membaca alpha tiap layer otomatis, tidak perlu diubah.
  * Semua gambar tetap kanvas 48x48, transparan, bertumpuk di (0,0).

- [27 Okt 2026] Antrean berikutnya: (1) uji pasang setup.exe (kucing, tray, Start with Windows); (2) pemilik membuat ulang aset (keypad dan kaki); (3) bersihkan folder lama Electron di repo Tauri (src\, assets\, art\, dan docs\ lama); (4) fitur tertunda: pemantau salin file Explorer tidak dipindah (dimatikan di Electron, jangan dicoba lagi dengan cara yang sama).