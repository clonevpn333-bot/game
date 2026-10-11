//! Tauri commands. Long work runs on a background thread and reports through events:
//!   ingest://progress  { batchId, fileId, stage, pagesDone, pagesTotal, error?, message? }
//!   ingest://file      { batchId, file: FileInput }

use crate::AppState;
use crate::ingest;
use crate::logo;
use crate::store::{Client, IndexItem, Store, StoreError, YearIndex};
use crate::types::{Progress, Stage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    version: String,
    /// Text recognition engines on this system, best first (Automatic uses the first).
    ocr_engines: Vec<&'static str>,
    data_dir: String,
    platform: &'static str,
}

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<AppState>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        ocr_engines: crate::ocr::available_engines(),
        data_dir: state.data_dir.to_string_lossy().into_owned(),
        platform: std::env::consts::OS,
    }
}

fn lock<'a>(state: &'a State<AppState>) -> Result<std::sync::MutexGuard<'a, Store>, StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))
}

#[tauri::command]
pub fn list_clients(state: State<AppState>) -> Result<Vec<Client>, StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))?.list_clients()
}

#[tauri::command]
pub fn create_client(state: State<AppState>, display_name: String) -> Result<Client, StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))?.create_client(&display_name)
}

#[tauri::command]
pub fn list_binders(state: State<AppState>) -> Result<Vec<crate::store::BinderRow>, StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))?.list_binders(50)
}

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))?.get_setting(&key)
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), StoreError> {
    state.store.lock().map_err(|e| StoreError::Invalid(e.to_string()))?.set_setting(&key, &value)
}

#[derive(Deserialize)]
pub struct IngestRequest {
    id: String,
    path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEvent {
    batch_id: String,
    file: crate::types::FileInput,
}

/// Starts processing in the background and returns immediately.
#[tauri::command]
pub fn ingest_files(app: AppHandle, state: State<AppState>, batch_id: String, files: Vec<IngestRequest>) {
    let cancel = Arc::new(AtomicBool::new(false));
    if let Ok(mut cancels) = state.cancels.lock() {
        cancels.insert(batch_id.clone(), cancel.clone());
    }
    let mut opts = state.ingest.clone();
    // Settings → Text recognition, read per batch so a change applies to the next drop.
    let setting = state.store.lock().ok().and_then(|s| s.get_setting("ocr.engine").ok().flatten());
    opts.engine = crate::ocr::engine_for_setting(setting.as_deref());
    if let Ok(mut set) = state.ingested.lock() {
        set.extend(files.iter().map(|f| PathBuf::from(&f.path)));
    }
    std::thread::spawn(move || {
        let emit = |file_id: &str, stage: Stage, done: usize, total: usize, error: Option<crate::types::FileErrorKind>| {
            let _ = app.emit(
                "ingest://progress",
                Progress {
                    batch_id: batch_id.clone(),
                    file_id: file_id.to_string(),
                    stage,
                    pages_done: done,
                    pages_total: total,
                    error,
                    message: error.map(|e| e.message()),
                },
            );
        };
        for f in &files {
            emit(&f.id, Stage::Queued, 0, 0, None);
        }
        files.par_iter().for_each(|f| {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            let progress = |stage: Stage, done: usize, total: usize| emit(&f.id, stage, done, total, None);
            match ingest::ingest_file(&f.id, &PathBuf::from(&f.path), &opts, &cancel, &progress) {
                Ok(file) => {
                    let _ = app.emit("ingest://file", FileEvent { batch_id: batch_id.clone(), file });
                }
                Err(kind) => emit(&f.id, Stage::Error, 0, 0, Some(kind)),
            }
        });
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(mut cancels) = state.cancels.lock() {
                cancels.remove(&batch_id);
            }
        }
    });
}

#[tauri::command]
pub fn cancel_ingest(state: State<AppState>, batch_id: String) {
    if let Ok(cancels) = state.cancels.lock() {
        if let Some(flag) = cancels.get(&batch_id) {
            flag.store(true, Ordering::Relaxed);
        }
    }
}

/// File extensions accepted when a folder is dropped (single files are checked by content).
const ACCEPTED: &[&str] = &["pdf", "jpg", "jpeg", "png", "heic", "heif", "tif", "tiff"];

fn walk(dir: &std::path::Path, out: &mut Vec<String>, depth: usize) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    let mut entries: Vec<_> = entries.flatten().map(|e| e.path()).collect();
    entries.sort();
    for path in entries {
        let hidden = path.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with('.'));
        if hidden {
            continue;
        }
        if path.is_dir() && depth < 8 {
            walk(&path, out, depth + 1);
        } else if path
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| ACCEPTED.contains(&e.to_ascii_lowercase().as_str()))
        {
            out.push(path.to_string_lossy().into_owned());
        }
    }
}

/// Expands dropped folders into the supported files inside them, in name order.
// Walking a large folder must not block the UI.
#[tauri::command(async)]
pub fn expand_paths(paths: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    for p in paths {
        let path = PathBuf::from(&p);
        if path.is_dir() {
            walk(&path, &mut out, 0);
        } else {
            out.push(p);
        }
    }
    out
}

// Missing-documents check.

#[tauri::command]
pub fn record_index(state: State<AppState>, client_id: i64, tax_year: i64, items: Vec<IndexItem>) -> Result<(), StoreError> {
    lock(&state)?.record_index(client_id, tax_year, &items)
}

#[tauri::command]
pub fn previous_index(state: State<AppState>, client_id: i64, tax_year: i64) -> Result<Option<YearIndex>, StoreError> {
    lock(&state)?.previous_index(client_id, tax_year)
}

#[tauri::command]
pub fn dismissed_missing(state: State<AppState>, client_id: i64, tax_year: i64) -> Result<Vec<IndexItem>, StoreError> {
    lock(&state)?.dismissed(client_id, tax_year)
}

#[tauri::command]
pub fn set_missing_dismissed(state: State<AppState>, client_id: i64, tax_year: i64, item: IndexItem, dismissed: bool) -> Result<(), StoreError> {
    lock(&state)?.set_dismissed(client_id, tax_year, &item, dismissed)
}

/// Settings → Data → "Delete all local history".
#[tauri::command]
pub fn delete_history(state: State<AppState>) -> Result<(), StoreError> {
    lock(&state)?.delete_history()
}

// Firm logo.

/// Picks a PNG or SVG with the system dialog and stores it as the cover logo.
/// Returns false when the dialog was cancelled.
#[tauri::command(async)]
pub fn choose_logo(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    let Some(file) = app.dialog().file().set_title("Choose your firm logo").add_filter("Logo (PNG or SVG)", &["png", "svg"]).blocking_pick_file() else {
        return Ok(false);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let svg = path.extension().is_some_and(|e| e.eq_ignore_ascii_case("svg"));
    let png = logo::normalize(&bytes, svg)?;
    std::fs::create_dir_all(&state.data_dir).map_err(|e| e.to_string())?;
    std::fs::write(state.data_dir.join(logo::LOGO_FILE), png).map_err(|e| e.to_string())?;
    Ok(true)
}

/// The stored logo as PNG bytes; empty when there is none.
#[tauri::command(async)]
pub fn firm_logo(state: State<'_, AppState>) -> Result<tauri::ipc::Response, String> {
    let path = state.data_dir.join(logo::LOGO_FILE);
    let bytes = if path.exists() { std::fs::read(path).map_err(|e| e.to_string())? } else { Vec::new() };
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn clear_logo(state: State<AppState>) -> Result<(), String> {
    let path = state.data_dir.join(logo::LOGO_FILE);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
