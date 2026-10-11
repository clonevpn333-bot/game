//! Tauri commands. Long work runs on a background thread and reports through events:
//!   ingest://progress  { batchId, fileId, stage, pagesDone, pagesTotal, error?, message? }
//!   ingest://file      { batchId, file: FileInput }

use crate::AppState;
use crate::ingest;
use crate::store::{Client, StoreError};
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
    ocr_engine: &'static str,
    data_dir: String,
    platform: &'static str,
}

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<AppState>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        ocr_engine: "tesseract",
        data_dir: state.data_dir.to_string_lossy().into_owned(),
        platform: std::env::consts::OS,
    }
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
    let opts = state.ingest.clone();
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
#[tauri::command]
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
