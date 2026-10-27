use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Emitter, Manager};

// ===== Pengaturan (boleh diubah) =====
const COMFY_URL: &str = "http://127.0.0.1:8188"; // alamat ComfyUI lokal; "" = nonaktif
const WATCH_DOWNLOAD: bool = true; // unduhan browser selesai
const DOWNLOAD_DIR: &str = ""; // "" = folder Unduhan bawaan Windows
const PARTIAL: [&str; 3] = [".crdownload", ".part", ".opdownload"]; // file sementara Chrome/Edge, Firefox, Opera

// PRIVASI: ComfyUI = hanya status antrean. Unduhan = hanya nama file di folder Unduhan
// (untuk melihat ekstensi sementara). Tidak ada isi file atau data yang dikirim keluar.

static LAST_FIRE: Mutex<Option<Instant>> = Mutex::new(None);

// Kirim ke kucing: teks di HUD + (opsional) pose perayaan
fn fire(app: &AppHandle, text: &str, celebrate: bool) {
    let visible = app
        .get_webview_window("main")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false);
    if !visible {
        return;
    }
    {
        let mut last = LAST_FIRE.lock().unwrap();
        if let Some(t) = *last {
            if t.elapsed() < Duration::from_secs(4) {
                return; // jangan beruntun
            }
        }
        *last = Some(Instant::now());
    }
    let _ = app.emit("say", (text, "hop"));
    if celebrate {
        let _ = app.emit("celebrate", ());
    }
}

// ----- ComfyUI -----
fn comfy_finished(app: &AppHandle, agent: &ureq::Agent, id: Option<&str>) {
    let mut ok = true;
    if let Some(id) = id {
        if let Ok(r) = agent.get(&format!("{}/history/{}", COMFY_URL, id)).call() {
            if let Ok(h) = r.into_json::<serde_json::Value>() {
                if let Some(s) = h[id]["status"]["status_str"].as_str() {
                    if s != "success" {
                        ok = false;
                    }
                }
            }
        }
    }
    if ok {
        fire(app, "Gambar ComfyUI sudah jadi!", true);
    } else {
        fire(app, "ComfyUI berhenti (error atau dibatalkan).", false);
    }
}

fn watch_comfy(app: AppHandle) {
    if COMFY_URL.is_empty() {
        return;
    }
    thread::spawn(move || {
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_millis(1500)).build();
        let mut busy = false;
        let mut last_id: Option<String> = None;
        loop {
            thread::sleep(Duration::from_secs(3));
            let q: Result<serde_json::Value, String> = agent
                .get(&format!("{}/queue", COMFY_URL))
                .call()
                .map_err(|e| e.to_string())
                .and_then(|r| r.into_json::<serde_json::Value>().map_err(|e| e.to_string()));
            match q {
                Ok(v) => {
                    let run = v["queue_running"].as_array().cloned().unwrap_or_default();
                    let pend = v["queue_pending"].as_array().map(|a| a.len()).unwrap_or(0);
                    let n = run.len() + pend;
                    if let Some(id) = run.first().and_then(|r| r.get(1)).and_then(|x| x.as_str()) {
                        last_id = Some(id.to_string());
                    }
                    if busy && n == 0 {
                        comfy_finished(&app, &agent, last_id.as_deref());
                    }
                    busy = n > 0;
                }
                Err(_) => busy = false, // ComfyUI belum jalan atau mati
            }
        }
    });
}

// ----- Unduhan browser -----
fn is_part(n: &str) -> bool {
    let l = n.to_lowercase();
    PARTIAL.iter().any(|x| l.ends_with(x))
}

fn list_dir(d: &PathBuf) -> Option<HashSet<String>> {
    fs::read_dir(d).ok().map(|rd| {
        rd.filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect()
    })
}

fn watch_downloads(app: AppHandle) {
    let dir: Option<PathBuf> = if DOWNLOAD_DIR.is_empty() {
        app.path().download_dir().ok()
    } else {
        Some(PathBuf::from(DOWNLOAD_DIR))
    };
    let dir = match dir {
        Some(d) => d,
        None => return,
    };
    thread::spawn(move || {
        let mut known: HashSet<String> = list_dir(&dir).unwrap_or_default();
        let mut partials: HashSet<String> = known.iter().filter(|n| is_part(n)).cloned().collect();
        loop {
            thread::sleep(Duration::from_millis(1000));
            let now = match list_dir(&dir) {
                Some(n) => n,
                None => continue,
            };
            let now_part: HashSet<String> = now.iter().filter(|n| is_part(n)).cloned().collect();
            let added = now.iter().any(|n| !known.contains(n) && !is_part(n));
            let gone = partials.iter().any(|n| !now_part.contains(n));
            // File sementara hilang DAN ada file baru = selesai (kalau dibatalkan, tidak ada file baru)
            if gone && added {
                fire(&app, "Unduhan selesai!", true);
            }
            known = now;
            partials = now_part;
        }
    });
}

pub fn init(app: &AppHandle) {
    watch_comfy(app.clone());
    if WATCH_DOWNLOAD {
        watch_downloads(app.clone());
    }
}