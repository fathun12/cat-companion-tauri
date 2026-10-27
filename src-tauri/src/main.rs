#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as _};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

mod panel;
mod timers;
mod watchers;

// Kotak kucing di dalam jendela (piksel logis): stage 144px di tengah jendela 260px.
const CAT_X0: f64 = 58.0;
const CAT_Y0: f64 = 58.0;
const CAT_X1: f64 = 202.0;
const CAT_Y1: f64 = 202.0;
const PEEK_VISIBLE: f64 = 150.0; // tinggi jendela yang terlihat saat mengintip (px logis)

static PEEKING: AtomicBool = AtomicBool::new(false);
static PEEK_ENABLED: AtomicBool = AtomicBool::new(true);

// Selisih kursor terhadap pojok jendela saat diseret (piksel fisik). None = tidak diseret.
type Drag = Arc<Mutex<Option<(f64, f64)>>>;

// ---------- Penyimpanan ----------
fn data_file(app: &tauri::AppHandle, name: &str) -> Option<std::path::PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    let _ = fs::create_dir_all(&dir);
    Some(dir.join(name))
}

fn save_pos(app: &tauri::AppHandle, win: &tauri::WebviewWindow) {
    if PEEKING.load(Ordering::Relaxed) {
        return;
    }
    if let (Some(f), Ok(p)) = (data_file(app, "pos.json"), win.outer_position()) {
        let _ = fs::write(f, format!("{},{}", p.x, p.y));
    }
}

fn on_screen(win: &tauri::WebviewWindow, x: i32, y: i32) -> bool {
    let size = match win.outer_size() {
        Ok(s) => s,
        Err(_) => return true,
    };
    let cx = x + size.width as i32 / 2;
    let cy = y + size.height as i32 / 2;
    win.available_monitors().unwrap_or_default().iter().any(|m| {
        let p = m.position();
        let s = m.size();
        cx > p.x && cx < p.x + s.width as i32 && cy > p.y && cy < p.y + s.height as i32
    })
}

fn default_pos(win: &tauri::WebviewWindow) {
    if let (Ok(Some(m)), Ok(size)) = (win.primary_monitor(), win.outer_size()) {
        let k = m.scale_factor();
        let x = m.position().x + m.size().width as i32 - size.width as i32 - (50.0 * k) as i32;
        let y = m.position().y + m.size().height as i32 - size.height as i32 - (60.0 * k) as i32;
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
    }
}

fn restore_pos(app: &tauri::AppHandle, win: &tauri::WebviewWindow) {
    let saved = data_file(app, "pos.json")
        .and_then(|f| fs::read_to_string(f).ok())
        .and_then(|t| {
            let mut it = t.trim().split(',');
            let x = it.next()?.parse::<i32>().ok()?;
            let y = it.next()?.parse::<i32>().ok()?;
            Some((x, y))
        });
    if let Some((x, y)) = saved {
        if on_screen(win, x, y) {
            let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
            return;
        }
    }
    default_pos(win);
}

// ---------- Perintah dari tampilan ----------
#[tauri::command]
fn drag_start(win: tauri::WebviewWindow, drag: tauri::State<'_, Drag>) {
    if let (Ok(cur), Ok(pos)) = (win.cursor_position(), win.outer_position()) {
        *drag.lock().unwrap() = Some((cur.x - pos.x as f64, cur.y - pos.y as f64));
    }
}

#[tauri::command]
fn drag_end(app: tauri::AppHandle, win: tauri::WebviewWindow, drag: tauri::State<'_, Drag>) {
    *drag.lock().unwrap() = None;
    save_pos(&app, &win);
}

#[tauri::command]
fn look_get(app: tauri::AppHandle) -> Option<String> {
    data_file(&app, "look.json").and_then(|f| fs::read_to_string(f).ok())
}

#[tauri::command]
fn look_set(app: tauri::AppHandle, look: String) {
    if let Some(f) = data_file(&app, "look.json") {
        let _ = fs::write(f, &look);
    }
    let _ = app.emit("look", look);
}

#[tauri::command]
fn set_peek_enabled(on: bool) {
    PEEK_ENABLED.store(on, Ordering::Relaxed);
}

// ---------- Tray ----------
fn toggle(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(true) {
            let _ = w.hide();
        } else {
            let _ = w.show();
        }
    }
}

// ---------- Mode mengintip ----------
// PRIVASI: hanya satu angka status dari Windows (2/3/4 = layar penuh), tanpa judul jendela atau isi layar.
#[cfg(windows)]
#[link(name = "shell32")]
extern "system" {
    fn SHQueryUserNotificationState(pquns: *mut i32) -> i32;
}

fn notif_state() -> i32 {
    #[cfg(windows)]
    unsafe {
        let mut s = 0i32;
        if SHQueryUserNotificationState(&mut s) == 0 {
            return s;
        }
    }
    0
}

fn slide_to(win: &tauri::WebviewWindow, tx: i32, ty: i32) {
    if let Ok(p) = win.outer_position() {
        let (sx, sy) = (p.x, p.y);
        let t0 = Instant::now();
        loop {
            let k = (t0.elapsed().as_millis() as f64 / 350.0).min(1.0);
            let e = 1.0 - (1.0 - k).powi(3);
            let x = sx as f64 + (tx - sx) as f64 * e;
            let y = sy as f64 + (ty - sy) as f64 * e;
            let _ = win.set_position(tauri::PhysicalPosition::new(x.round() as i32, y.round() as i32));
            if k >= 1.0 {
                break;
            }
            thread::sleep(Duration::from_millis(16));
        }
    }
}

fn set_peek(win: &tauri::WebviewWindow, on: bool, restore: &mut Option<(i32, i32)>) {
    if on == PEEKING.load(Ordering::Relaxed) {
        return;
    }
    if on {
        if !win.is_visible().unwrap_or(false) {
            return;
        }
        if let (Ok(p), Ok(Some(m)), Ok(size)) = (win.outer_position(), win.current_monitor(), win.outer_size()) {
            *restore = Some((p.x, p.y));
            let k = m.scale_factor();
            let mx = m.position().x;
            let mw = m.size().width as i32;
            let x = p.x.max(mx).min(mx + mw - size.width as i32);
            let y = m.position().y + m.size().height as i32 - (PEEK_VISIBLE * k) as i32;
            PEEKING.store(true, Ordering::Relaxed);
            let _ = win.set_always_on_top(true);
            slide_to(win, x, y);
        }
    } else {
        PEEKING.store(false, Ordering::Relaxed);
        match restore.take() {
            Some((x, y)) => slide_to(win, x, y),
            None => default_pos(win),
        }
    }
}

fn main() {
    let drag: Drag = Arc::new(Mutex::new(None));
    let drag_loop = drag.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
            }
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(drag)
        .invoke_handler(tauri::generate_handler![
            drag_start,
            drag_end,
            look_get,
            look_set,
            set_peek_enabled,
            timers::show_menu,
            timers::menu_size,
            timers::menu_close,
            timers::menu_state,
            timers::menu_action,
            timers::play_get,
            timers::note_get,
            timers::note_set,
            timers::msgs_get,
            timers::msgs_set,
            panel::open_panel,
            panel::presets_get,
            panel::presets_set
        ])
        .setup(move |app| {
            let win = app.get_webview_window("main").unwrap();
            restore_pos(app.handle(), &win);
            timers::init(app.handle());
            watchers::init(app.handle());

            // Keluar darurat: Ctrl+Shift+Q
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, _sc, ev| {
                        if ev.state() == ShortcutState::Pressed {
                            app.exit(0);
                        }
                    })
                    .build(),
            )?;
            app.global_shortcut()
                .register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ))?;

            // Tray: klik kiri = tampil/sembunyi, klik kanan = menu
            let toggle_i = MenuItem::with_id(app, "toggle", "Tampil / Sembunyi", true, None::<&str>)?;
            let auto_i = CheckMenuItem::with_id(
                app,
                "autostart",
                "Jalankan saat Windows menyala",
                true,
                app.autolaunch().is_enabled().unwrap_or(false),
                None::<&str>,
            )?;
            let quit_i = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;
            let panel_i = MenuItem::with_id(app, "panel", "Kustomisasi", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &panel_i, &auto_i, &quit_i])?;
            let auto_item = auto_i.clone();
            let mut tb = TrayIconBuilder::new()
                .tooltip("Cat Companion")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "toggle" => toggle(app),
                    "autostart" => {
                        let al = app.autolaunch();
                        let on = al.is_enabled().unwrap_or(false);
                        let _ = if on { al.disable() } else { al.enable() };
                        let _ = auto_item.set_checked(al.is_enabled().unwrap_or(false));
                    }
                    "panel" => {
                        let a = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = panel::open_panel(a).await;
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tb = tb.icon(icon.clone());
            }
            tb.build(app)?;

            // Pembaca aktivitas global. PRIVASI: hanya jenisnya yang dikirim,
            // tombol apa yang ditekan tidak pernah dibaca atau disimpan.
            let handle = app.handle().clone();
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

            // Mode mengintip: baca status layar penuh tiap 1,5 detik
            let win_peek = win.clone();
            thread::spawn(move || {
                let mut streak = 0;
                let mut last_full = false;
                let mut restore: Option<(i32, i32)> = None;
                loop {
                    thread::sleep(Duration::from_millis(1500));
                    let n = notif_state();
                    let full = n == 2 || n == 3 || n == 4;
                    if full == last_full {
                        streak += 1;
                    } else {
                        last_full = full;
                        streak = 1;
                    }
                    if streak >= 2 {
                        let want = full && PEEK_ENABLED.load(Ordering::Relaxed);
                        set_peek(&win_peek, want, &mut restore);
                    }
                }
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