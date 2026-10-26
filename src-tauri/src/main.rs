#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{thread, time::Duration};
use tauri::Manager;

// Kotak kucing di dalam jendela (piksel logis): stage 144px di tengah jendela 260px
// (SCALE 3 = floor(190/48), sama dengan versi Electron).
const CAT_X0: f64 = 58.0;
const CAT_Y0: f64 = 58.0;
const CAT_X1: f64 = 202.0;
const CAT_Y1: f64 = 202.0;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            // Click-through: jendela mengabaikan mouse kecuali kursor ada di kotak kucing.
            // Hanya posisi kursor yang dibaca, tidak ada tombol atau isi layar.
            thread::spawn(move || {
                let mut ignoring: Option<bool> = None;
                loop {
                    if let (Ok(cur), Ok(pos), Ok(scale)) =
                        (win.cursor_position(), win.outer_position(), win.scale_factor())
                    {
                        let x = (cur.x - pos.x as f64) / scale;
                        let y = (cur.y - pos.y as f64) / scale;
                        let over = x >= CAT_X0 && x <= CAT_X1 && y >= CAT_Y0 && y <= CAT_Y1;
                        let want_ignore = !over;
                        if ignoring != Some(want_ignore) {
                            let _ = win.set_ignore_cursor_events(want_ignore);
                            ignoring = Some(want_ignore);
                        }
                    }
                    thread::sleep(Duration::from_millis(30));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("gagal menjalankan Tauri");
}