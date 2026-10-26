const fs = require('fs');
const path = require('path');

// Hapus file GPU/WebGPU yang tidak terpakai (GPU sudah dimatikan lewat app.disableHardwareAcceleration di main.js).
// Kalau kucing gagal tampil setelah build, kosongkan daftar ini.
const REMOVE = ['dxcompiler.dll', 'vk_swiftshader.dll', 'vk_swiftshader_icd.json', 'vulkan-1.dll'];

exports.default = async function (context) {
  for (const f of REMOVE) {
    fs.rmSync(path.join(context.appOutDir, f), { force: true });
  }
};