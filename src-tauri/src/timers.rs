use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::{atomic::Ordering, Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WindowEvent};

// Kapan menu mulai tampil (blur dalam 400 ms pertama diabaikan, fokus bisa direbut sesaat)
static MENU_SHOWN: Mutex<Option<Instant>> = Mutex::new(None);

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Msg {
    pub id: String,
    pub time: String,
    pub text: String,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub focus_min: u32,
    pub break_min: u32,
    pub stretch_min: u32, // 0 = nonaktif
    pub water_min: u32,   // 0 = nonaktif
    pub hunt: bool,
    pub peek: bool,
    pub name: String,
    pub messages: Vec<Msg>,
    pub note: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            focus_min: 25,
            break_min: 5,
            stretch_min: 45,
            water_min: 60,
            hunt: true,
            peek: true,
            name: String::new(),
            messages: Vec::new(),
            note: String::new(),
        }
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Phase {
    Idle,
    Focus,
    Break,
}

struct Pomo {
    phase: Phase,
    running: bool,
    end_at: Instant,
    left: Duration,
}

pub struct Timers {
    settings: Settings,
    pomo: Pomo,
    next_stretch: Instant,
    next_water: Instant,
    last_status: Option<String>,
    fired: HashMap<String, String>,
    file: Option<PathBuf>,
    menu_at: (i32, i32),
}

pub type TimersState = Arc<Mutex<Timers>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuState {
    phase: String,
    running: bool,
    status: String,
    focus_min: u32,
    break_min: u32,
    stretch_min: u32,
    water_min: u32,
    hunt: bool,
    peek: bool,
}

#[derive(Serialize)]
pub struct MsgsPayload {
    name: String,
    messages: Vec<Msg>,
}

impl Timers {
    fn save(&self) {
        if let Some(f) = &self.file {
            if let Ok(text) = serde_json::to_string_pretty(&self.settings) {
                let _ = fs::write(f, text);
            }
        }
    }

    fn schedule(&mut self) {
        let now = Instant::now();
        let stretch = self.settings.stretch_min as u64 * 60;
        let water = self.settings.water_min as u64 * 60;
        self.next_stretch = now + Duration::from_secs(stretch);
        self.next_water = now + Duration::from_secs(water);
    }

    fn begin(&mut self, phase: Phase) {
        let min = if phase == Phase::Focus {
            self.settings.focus_min
        } else {
            self.settings.break_min
        };
        self.pomo = Pomo {
            phase,
            running: true,
            end_at: Instant::now() + Duration::from_secs(min as u64 * 60),
            left: Duration::ZERO,
        };
    }

    fn status_text(&self) -> String {
        if self.pomo.phase == Phase::Idle {
            return String::new();
        }
        let left = if self.pomo.running {
            self.pomo.end_at.saturating_duration_since(Instant::now())
        } else {
            self.pomo.left
        };
        let s = (left.as_millis() as u64 + 999) / 1000;
        let label = if !self.pomo.running {
            "JEDA"
        } else if self.pomo.phase == Phase::Focus {
            "FOKUS"
        } else {
            "ISTIRAHAT"
        };
        format!("{} {:02}:{:02}", label, s / 60, s % 60)
    }

    fn menu_state(&self) -> MenuState {
        let phase = match self.pomo.phase {
            Phase::Idle => "idle",
            Phase::Focus => "focus",
            Phase::Break => "break",
        };
        MenuState {
            phase: phase.to_string(),
            running: self.pomo.running,
            status: self.status_text(),
            focus_min: self.settings.focus_min,
            break_min: self.settings.break_min,
            stretch_min: self.settings.stretch_min,
            water_min: self.settings.water_min,
            hunt: self.settings.hunt,
            peek: self.settings.peek,
        }
    }
}

// Pesan ke kucing: payload [teks, jenis]; jenis = stretch / hop / drink
fn say(app: &AppHandle, text: &str, kind: &str) {
    let _ = app.emit("say", (text, kind));
}

fn send_status(app: &AppHandle, t: &mut Timers) {
    let text = t.status_text();
    if t.last_status.as_deref() == Some(text.as_str()) {
        return;
    }
    t.last_status = Some(text.clone());
    let _ = app.emit("status", text);
}

fn tick(app: &AppHandle, st: &TimersState) {
    let mut t = st.lock().unwrap();
    let now = Instant::now();
    let mut said = false;

    // Pomodoro habis: ganti fase
    if t.pomo.phase != Phase::Idle && t.pomo.running && now >= t.pomo.end_at {
        if t.pomo.phase == Phase::Focus {
            t.begin(Phase::Break);
            say(app, "Waktunya istirahat! Minum dan regangkan badan.", "stretch");
        } else {
            t.begin(Phase::Focus);
            say(app, "Istirahat selesai. Ayo fokus lagi!", "hop");
        }
        said = true;
    }

    // Pesan kustom: bunyi sekali per hari pada jam:menit yang ditentukan
    if !said {
        let d = chrono::Local::now();
        let hm = d.format("%H:%M").to_string();
        let stamp = format!("{}{}", d.format("%Y-%m-%d"), hm);
        let name = t.settings.name.clone();
        let mut hit: Option<(String, String)> = None;
        for m in &t.settings.messages {
            if !m.enabled || m.time != hm {
                continue;
            }
            if t.fired.get(&m.id) == Some(&stamp) {
                continue;
            }
            hit = Some((m.id.clone(), m.text.clone()));
            break;
        }
        if let Some((id, text)) = hit {
            t.fired.insert(id, stamp);
            let full = if name.is_empty() { text } else { format!("{}, {}", name, text) };
            say(app, &full, "hop");
            said = true;
        }
    }

    if !said && t.settings.stretch_min > 0 && now >= t.next_stretch && t.pomo.phase != Phase::Break {
        say(app, "Waktunya peregangan! Berdiri sebentar.", "stretch");
        let secs = t.settings.stretch_min as u64 * 60;
        t.next_stretch = now + Duration::from_secs(secs);
        said = true;
    }

    if !said && t.settings.water_min > 0 && now >= t.next_water {
        say(app, "Minum air dulu yuk!", "drink");
        let secs = t.settings.water_min as u64 * 60;
        t.next_water = now + Duration::from_secs(secs);
    }

    send_status(app, &mut *t);
}

// Dipanggil sekali dari setup() di main.rs
pub fn init(app: &AppHandle) {
    let file = app.path().app_data_dir().ok().map(|d| {
        let _ = fs::create_dir_all(&d);
        d.join("settings.json")
    });
    let settings: Settings = file
        .as_ref()
        .and_then(|f| fs::read_to_string(f).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    crate::PEEK_ENABLED.store(settings.peek, Ordering::Relaxed);

    let now = Instant::now();
    let mut t = Timers {
        settings,
        pomo: Pomo { phase: Phase::Idle, running: false, end_at: now, left: Duration::ZERO },
        next_stretch: now,
        next_water: now,
        last_status: None,
        fired: HashMap::new(),
        file,
        menu_at: (0, 0),
    };
    t.schedule();
    let st: TimersState = Arc::new(Mutex::new(t));
    app.manage(st.clone());

    let app2 = app.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(1));
        tick(&app2, &st);
    });

    // Menu klik kanan: tutup kalau kehilangan fokus (klik di luar)
    if let Some(menu) = app.get_webview_window("menu") {
        let m2 = menu.clone();
        menu.on_window_event(move |e| {
            if let WindowEvent::Focused(false) = e {
                let recent = MENU_SHOWN
                    .lock()
                    .unwrap()
                    .map(|t| t.elapsed() < Duration::from_millis(400))
                    .unwrap_or(false);
                if recent {
                    let _ = m2.set_focus();
                } else {
                    let _ = m2.hide();
                }
            }
        });
    }
}

// ---------- Menu klik kanan ----------
fn place_and_show(menu: &WebviewWindow, h_logical: f64, at: (i32, i32)) {
    const W: f64 = 270.0;
    let monitors = menu.available_monitors().unwrap_or_default();
    let mon = monitors
        .iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            at.0 >= p.x && at.0 < p.x + s.width as i32 && at.1 >= p.y && at.1 < p.y + s.height as i32
        })
        .or_else(|| monitors.first());
    let (mx, my, mw, mh, k) = match mon {
        Some(m) => (
            m.position().x,
            m.position().y,
            m.size().width as i32,
            m.size().height as i32,
            m.scale_factor(),
        ),
        None => (0, 0, 1920, 1080, 1.0),
    };
    let w = (W * k).round() as i32;
    let h = (h_logical * k).round() as i32;
    let margin = (48.0 * k) as i32; // sisakan ruang untuk taskbar

    // Muncul di samping kursor; kalau tidak muat, dibalik ke kiri atau atas
    let mut x = if at.0 + w > mx + mw { at.0 - w } else { at.0 };
    let mut y = if at.1 + h > my + mh - margin { at.1 - h } else { at.1 };
    let max_x = (mx + mw - w).max(mx);
    let max_y = (my + mh - margin - h).max(my);
    x = x.max(mx).min(max_x);
    y = y.max(my).min(max_y);

    let _ = menu.set_size(PhysicalSize::new(w as u32, h as u32));
    let _ = menu.set_position(PhysicalPosition::new(x, y));
    let _ = menu.show();
    let _ = menu.set_focus();
    *MENU_SHOWN.lock().unwrap() = Some(Instant::now());
}

#[tauri::command]
pub fn show_menu(app: AppHandle, win: WebviewWindow, st: tauri::State<'_, TimersState>) {
    if let Ok(c) = win.cursor_position() {
        st.lock().unwrap().menu_at = (c.x as i32, c.y as i32);
    }
    // Tampilan menu menyegarkan isinya, lalu memanggil menu_size (yang menampilkan jendela)
    let _ = app.emit("menu-open", "pet");
}

// Called from the tray (right click on the icon): the menu opens at the click position
pub fn show_menu_at(app: &AppHandle, x: i32, y: i32, mode: &str) {
    if let Some(st) = app.try_state::<TimersState>() {
        st.lock().unwrap().menu_at = (x, y);
    }
    let _ = app.emit("menu-open", mode);
}

#[tauri::command]
pub fn menu_size(app: AppHandle, st: tauri::State<'_, TimersState>, h: f64) {
    let h = h.max(100.0).min(900.0);
    let at = st.lock().unwrap().menu_at;
    if let Some(menu) = app.get_webview_window("menu") {
        place_and_show(&menu, h, at);
    }
}

#[tauri::command]
pub fn menu_close(app: AppHandle) {
    if let Some(menu) = app.get_webview_window("menu") {
        let _ = menu.hide();
    }
}

#[tauri::command]
pub fn menu_state(st: tauri::State<'_, TimersState>) -> MenuState {
    st.lock().unwrap().menu_state()
}

#[tauri::command]
pub fn menu_action(
    app: AppHandle,
    st: tauri::State<'_, TimersState>,
    action: String,
    key: Option<String>,
    value: Option<u32>,
) -> MenuState {
    let mut t = st.lock().unwrap();
    match action.as_str() {
        "pomo" => {
            if t.pomo.phase == Phase::Idle {
                t.begin(Phase::Focus);
                say(&app, "Fokus dimulai! Semangat!", "hop");
            } else if t.pomo.running {
                let left = t.pomo.end_at.saturating_duration_since(Instant::now());
                t.pomo.left = left;
                t.pomo.running = false;
            } else {
                let left = t.pomo.left;
                t.pomo.end_at = Instant::now() + left;
                t.pomo.running = true;
            }
            t.last_status = None;
            send_status(&app, &mut *t);
        }
        "reset" => {
            t.pomo = Pomo {
                phase: Phase::Idle,
                running: false,
                end_at: Instant::now(),
                left: Duration::ZERO,
            };
            t.last_status = None;
            send_status(&app, &mut *t);
        }
        "set" => {
            if let (Some(k), Some(v)) = (key.as_deref(), value) {
                let ok = match k {
                    "focusMin" => [1u32, 15, 25, 45, 50].contains(&v),
                    "breakMin" => [1u32, 5, 10, 15].contains(&v),
                    "stretchMin" | "waterMin" => [0u32, 1, 30, 45, 60].contains(&v),
                    _ => false,
                };
                if ok {
                    match k {
                        "focusMin" => t.settings.focus_min = v,
                        "breakMin" => t.settings.break_min = v,
                        "stretchMin" => t.settings.stretch_min = v,
                        _ => t.settings.water_min = v,
                    }
                    t.save();
                    t.schedule();
                }
            }
        }
        "toggle" => match key.as_deref() {
            Some("hunt") => {
                let on = !t.settings.hunt;
                t.settings.hunt = on;
                t.save();
                let _ = app.emit("play-enabled", on);
            }
            Some("peek") => {
                let on = !t.settings.peek;
                t.settings.peek = on;
                t.save();
                crate::PEEK_ENABLED.store(on, Ordering::Relaxed);
            }
            _ => {}
        },
        "quit" => app.exit(0),
        _ => {}
    }
    t.menu_state()
}

// ---------- Pengaturan lain ----------
#[tauri::command]
pub fn play_get(st: tauri::State<'_, TimersState>) -> bool {
    st.lock().unwrap().settings.hunt
}

#[tauri::command]
pub fn note_get(st: tauri::State<'_, TimersState>) -> String {
    st.lock().unwrap().settings.note.clone()
}

#[tauri::command]
pub fn note_set(app: AppHandle, st: tauri::State<'_, TimersState>, text: String) {
    let mut t = st.lock().unwrap();
    let note: String = text.chars().take(80).collect();
    t.settings.note = note.clone();
    t.save();
    let _ = app.emit("note", note);
}

fn valid_time(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 5 && b[2] == b':' && [0usize, 1, 3, 4].iter().all(|&i| b[i].is_ascii_digit())
}

#[tauri::command]
pub fn msgs_get(st: tauri::State<'_, TimersState>) -> MsgsPayload {
    let t = st.lock().unwrap();
    MsgsPayload { name: t.settings.name.clone(), messages: t.settings.messages.clone() }
}

#[tauri::command]
pub fn msgs_set(st: tauri::State<'_, TimersState>, name: String, messages: Vec<Msg>) {
    let mut t = st.lock().unwrap();
    t.settings.name = name.chars().take(20).collect();
    t.settings.messages = messages
        .into_iter()
        .filter(|m| valid_time(&m.time) && !m.text.trim().is_empty())
        .take(20)
        .map(|m| Msg {
            id: m.id,
            time: m.time,
            text: m.text.chars().take(60).collect(),
            enabled: m.enabled,
        })
        .collect();
    t.save();
}