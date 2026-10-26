#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};

// Kotak kucing di dalam jendela (piksel logis): stage 144px di tengah jendela 260px.
const CAT_X0: f64 = 58.0;
const CAT_Y0: f64 = 58.0;
const CAT_X1: f64 = 202.0;
const CAT_Y1: f64 = 202.0;

// Selisih kursor terhadap pojok jendela saat diseret (piksel fisik). None = tidak diseret.
type Drag = Arc<Mutex<Option<(f64, f64)>>>;

#[tauri::command]
fn drag_start(win: tauri::WebviewWindow, drag: tauri::State<'_, Drag>) {
    if let (Ok(cur), Ok(pos)) = (win.cursor_position(), win.outer_position()) {
        *drag.lock().unwrap() = Some((cur.x - pos.x as f64, cur.y - pos.y as f64));
    }
}

#[tauri::command]
fn drag_end(drag: tauri::State<'_, Drag>) {
    *drag.lock().unwrap() = None;
}

fn main() {
    let drag: Drag = Arc::new(Mutex::new(None));
    let drag_loop = drag.clone();

    tauri::Builder::default()
        .manage(drag)
        .invoke_handler(tauri::generate_handler![drag_start, drag_end])
        .setup(move |app| {
            let win = app.get_webview_window("main").unwrap();
            let handle = app.handle().clone();

            // Pembaca aktivitas global. PRIVASI: hanya jenisnya yang dikirim,
            // tombol apa yang ditekan tidak pernah dibaca atau disimpan.
            thread::spawn(move || {
                let mut last: [Option<Instant>; 4] = [None; 4];
                let mut gap = move |i: usize, ms: u64| -> bool {
                    let now = Instant::now();
                    if let Some(t) = last[i] {
                        if now.duration_since(t) < Duration::from_millis(ms) {
                            return false;
                        }
                    }
                    last[i] = Some(now);
                    true
                };
                let _ = rdev::listen(move |ev| {
                    let (i, ms, kind) = match ev.event_type {
                        rdev::EventType::KeyPress(_) => (0, 30, "key"),
                        rdev::EventType::MouseMove { .. } => (1, 250, "mouse"),
                        rdev::EventType::Wheel { .. } => (2, 100, "scroll"),
                        rdev::EventType::ButtonPress(_) => (3, 100, "click"),
                        _ => return,
                    };
                    if gap(i, ms) {
                        let _ = handle.emit("activity", kind);
                    }
                });
            });

            // Kursor, click-through, dan seret jendela
            thread::spawn(move || {
                let mut ignoring: Option<bool> = None;
                let mut last = (f64::NAN, f64::NAN);
                loop {
                    if let (Ok(cur), Ok(pos), Ok(scale)) =
                        (win.cursor_position(), win.outer_position(), win.scale_factor())
                    {
                        let dragging = *drag_loop.lock().unwrap();
                        if let Some((ox, oy)) = dragging {
                            let _ = win.set_position(tauri::PhysicalPosition::new(
                                (cur.x - ox).round() as i32,
                                (cur.y - oy).round() as i32,
                            ));
                        }
                        let x = (cur.x - pos.x as f64) / scale;
                        let y = (cur.y - pos.y as f64) / scale;
                        if (x, y) != last {
                            last = (x, y);
                            let _ = win.emit("cursor", (x, y));
                        }
                        let over = x >= CAT_X0 && x <= CAT_X1 && y >= CAT_Y0 && y <= CAT_Y1;
                        let want_ignore = !(over || dragging.is_some());
                        if ignoring != Some(want_ignore) {
                            let _ = win.set_ignore_cursor_events(want_ignore);
                            ignoring = Some(want_ignore);
                        }
                    }
                    thread::sleep(Duration::from_millis(16));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("gagal menjalankan Tauri");
}