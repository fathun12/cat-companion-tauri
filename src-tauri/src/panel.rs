use std::fs;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// Jendela kustomisasi: dibuat saat diminta, dibuang saat ditutup (hemat RAM)
#[tauri::command]
pub async fn open_panel(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("panel") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "panel", WebviewUrl::App("panel/index.html".into()))
        .title("Kustomisasi Kucing")
        .inner_size(800.0, 780.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Preset buatan pemilik, disimpan sebagai teks JSON di presets.json
#[tauri::command]
pub fn presets_get(app: AppHandle) -> String {
    crate::data_file(&app, "presets.json")
        .and_then(|f| fs::read_to_string(f).ok())
        .unwrap_or_else(|| "[]".to_string())
}

#[tauri::command]
pub fn presets_set(app: AppHandle, list: String) {
    if let Some(f) = crate::data_file(&app, "presets.json") {
        let _ = fs::write(f, list);
    }
}