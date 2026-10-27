import { buildRig, initLook } from './rig.js';
import { initInput } from './input.js';
import { startLoop } from './animate.js';

async function init() {
  await buildRig(); // muat gambar dan susun layer
  initInput(); // pasang pembaca mouse dan event dari Rust
  await initLook(); // terapkan warna dan pola
  startLoop(); // mulai animasi
}

init().catch((err) => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<pre style="color:red;background:#fff;font-size:11px">' + err.message + '</pre>'
  );
});