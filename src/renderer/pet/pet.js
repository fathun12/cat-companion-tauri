const S = require('./state');
const { buildRig, initLook } = require('./rig');
const { initInput } = require('./input');
const { startLoop } = require('./animate');

async function init() {
  await buildRig(); // muat gambar dan susun layer
  initInput(); // pasang pembaca mouse dan pesan dari main.js
  await initLook(); // terapkan warna dan pola tersimpan
  startLoop(); // mulai animasi
}

init().catch((err) => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<pre style="color:red;background:#fff;font-size:11px">' + err.message + '</pre>'
  );
});