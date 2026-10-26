# Cat Companion 🐈‍⬛

Kucing piksel yang tinggal di desktop Windows-mu. Ia menemani saat kerja, bereaksi ke mouse dan keyboard, dan mengingatkanmu minum, meregang, dan hal-hal lain yang gampang terlupa.

Karakternya digambar sendiri dengan LibreSprite, dan animasinya dibuat lewat kode (bukan sprite sheet), jadi gerakannya halus dan warna kucing bisa diubah-ubah.

> Terinspirasi dari ide aplikasi Comnyang. Proyek ini tidak memakai aset atau sprite milik mereka.

<!-- Taruh tangkapan layar atau GIF di sini: ![Cat Companion](docs/preview.gif) -->

## Fitur

**Bereaksi ke kamu**
- Mata mengikuti kursor, kepala dan badan ikut condong dengan efek kenyal
- Klik kucing: muncul hati. Elus kepalanya dengan mouse: ia mendengkur
- Gerakkan kursor cepat di dekatnya: ia menunduk dan bermain
- Drag kucing ke mana saja, badannya meregang seperti mochi
- Diam beberapa menit: ia tidur melingkar. Tekan tombol atau klik untuk membangunkannya

**Saat kamu mengetik**
- Kucing "memijat" keyboard, kepalanya bergerak tiap ketikan, ekornya berkibas
- Mengetik terlalu cepat: ia kesal dan mengeluarkan gelembung, lalu memerah dan bergetar sambil pupilnya berputar pusing, lalu kelelahan
- Mode mengintip: saat ada video atau aplikasi layar penuh, kucing menyembul dari tepi bawah layar

**Produktivitas**
- Timer Pomodoro (fokus dan istirahat) yang tampil di samping kucing
- Pengingat peregangan dan minum air
- Pesan pengingat kustom: atur jam dan teksnya sendiri, kucing menyebut nama panggilanmu
- Catatan sematan: kotak catatan kecil di atas kepala kucing

**Kustomisasi**
- 5 preset warna (hitam, oren, abu, tuxedo, calico), warna badan, garis tepi, dan pola bisa diatur sendiri
- Pratinjau langsung di panel pengaturan

## Memasang

1. Unduh `Cat Companion Setup 1.0.0.exe` dari halaman rilis.
2. Jalankan installernya. Kalau Windows menampilkan peringatan SmartScreen, klik **More info**, lalu **Run anyway**. Peringatan ini muncul karena aplikasinya belum ditandatangani secara digital.
3. Kucing muncul di pojok kanan bawah layar.

## Cara memakai

| Aksi | Hasil |
|---|---|
| Klik kucing | Muncul hati |
| Gerakkan mouse di atas kepala kucing | Mengelus, lalu mendengkur |
| Drag kucing | Memindahkannya (posisi diingat) |
| Klik kanan kucing | Menu Pomodoro, pengingat, kustomisasi |
| Klik ikon kucing di tray | Tampilkan atau sembunyikan kucing |
| Klik kanan ikon tray | Kustomisasi, auto-start, keluar |
| `Ctrl` + `Shift` + `Q` | Keluar darurat |

Di Windows 11, ikon tray biasanya tersembunyi di balik panah **^** di taskbar. Seret ikonnya keluar kalau mau selalu terlihat.

## Privasi

- Aplikasi hanya tahu **ada atau tidaknya** aktivitas (keyboard ditekan, mouse bergerak, scroll). Tombol apa yang kamu tekan **tidak pernah dibaca, disimpan, atau dikirim**.
- Mode mengintip hanya menanyakan ke Windows "apakah ada aplikasi layar penuh?", jawabannya satu angka. Judul jendela dan isi layarmu tidak dibaca.
- Tidak ada koneksi internet, pelacakan, atau pengiriman data.
- Pengaturan tersimpan lokal di `%APPDATA%\cat-companion`.

Karena membaca aktivitas keyboard dan mouse secara global, sebagian antivirus bisa curiga. Kodenya terbuka di repositori ini, kamu bisa memeriksanya sendiri (lihat `main.js`).

## Untuk pengembang

Butuh [Node.js](https://nodejs.org) (dicoba di v22) dan Git.

```powershell
git clone <alamat-repo-ini>
cd cat-companion
npm install
npm start
```

Membuat installer (hasilnya di folder `release\`):

```powershell
npm run dist
```

### Struktur singkat

```
main.js                  proses utama Electron: jendela, tray, input global, mode mengintip
src/main/services/       Pomodoro, pengingat, pesan, catatan, menu klik kanan
src/renderer/pet/        tampilan dan animasi kucing (modul JavaScript tanpa build)
src/renderer/panel/      jendela kustomisasi
assets/                  PNG kucing, efek, dan rig.json (dibundel ke aplikasi)
art/                     file sumber gambar mentah (tidak dibundel)
build/                   ikon aplikasi untuk installer
SPEC.md di docs/         catatan serah-terima proyek
```

### Mengganti desain kucing

Kucing dirakit dari PNG terpisah berukuran 48x48 dengan latar transparan: kepala, kuping, kumis, mata, pupil, ekor, dan badan. Timpa PNG di `assets/cat/` (pose idle) atau `assets/cat/typing/` (pose mengetik) dengan nama dan ukuran kanvas yang sama, lalu jalankan ulang. Kodenya tidak perlu diubah.

## Masalah umum

- **Ikon tray tidak kelihatan**: klik panah **^** di taskbar, atau nyalakan "Electron/Cat Companion" di Settings → Personalization → Taskbar → Other system tray icons.
- **Kucing tidak bereaksi ke keyboard atau mouse**: coba jalankan ulang aplikasinya. Kalau masih bermasalah, cek apakah antivirus memblokir aplikasi.
- **Kucing tidak terlihat di atas game layar penuh**: game dengan mode exclusive fullscreen menutupi semua jendela lain. Pakai mode borderless windowed.

## Lisensi

Domain publik ([Unlicense](LICENSE)). Kode dan gambar kucing boleh dipakai, diubah, dan disebarkan siapa saja tanpa syarat, termasuk untuk keperluan komersial.