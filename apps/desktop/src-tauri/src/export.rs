//! Export support: source bytes and page images for the binder assembler, and
//! writing results. Reads are limited to files ingested this session and the page
//! cache; writes to folders the user chose through the system dialog.

use crate::AppState;
use image::{GrayImage, codecs::jpeg::JpegEncoder, imageops};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Quality {
    Compact,
    Balanced,
    High,
}

impl Quality {
    /// Scale relative to the stored 150 DPI page image, and JPEG quality.
    fn params(self) -> (f32, u8) {
        match self {
            Quality::Compact => (0.75, 55),
            Quality::Balanced => (1.0, 68),
            Quality::High => (1.0, 85),
        }
    }
}

/// Re-encodes a page image at a quality preset.
pub fn encode_page(image: &GrayImage, quality: Quality) -> Result<Vec<u8>, String> {
    let (scale, q) = quality.params();
    let resized = if (scale - 1.0).abs() > f32::EPSILON {
        imageops::resize(image, ((image.width() as f32 * scale) as u32).max(1), ((image.height() as f32 * scale) as u32).max(1), imageops::FilterType::Triangle)
    } else {
        image.clone()
    };
    let mut out = Vec::new();
    JpegEncoder::new_with_quality(&mut out, q).encode_image(&resized).map_err(|e| e.to_string())?;
    Ok(out)
}

fn allowed_read(state: &AppState, path: &Path) -> bool {
    let cache = state.ingest.cache_dir.join("pages");
    path.starts_with(&cache) || state.ingested.lock().is_ok_and(|set| set.contains(path))
}

/// Bytes of an ingested source file (digital PDF pages are copied, not re-rendered).
// Off the main thread: file IO, JPEG encoding and the modal dialog would block the UI.
#[tauri::command(async)]
pub fn read_source(state: State<AppState>, path: String) -> Result<Response, String> {
    let path = PathBuf::from(path);
    if !allowed_read(&state, &path) {
        return Err("This file wasn’t part of the binder.".into());
    }
    std::fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

/// A page image re-encoded at the export quality.
// Off the main thread: file IO, JPEG encoding and the modal dialog would block the UI.
#[tauri::command(async)]
pub fn page_jpeg(state: State<AppState>, path: String, quality: Quality) -> Result<Response, String> {
    let path = PathBuf::from(path);
    if !allowed_read(&state, &path) {
        return Err("This page isn’t in the page cache.".into());
    }
    let image = image::open(&path).map_err(|e| e.to_string())?.to_luma8();
    encode_page(&image, quality).map(Response::new)
}

/// Asks for an output folder with the system dialog and allows writing there.
// Off the main thread: file IO, JPEG encoding and the modal dialog would block the UI.
#[tauri::command(async)]
pub fn choose_output_dir(app: AppHandle, state: State<AppState>, start: Option<String>) -> Option<String> {
    let mut dialog = app.dialog().file().set_title("Choose where to save the binder");
    if let Some(start) = start.filter(|s| Path::new(s).is_dir()) {
        dialog = dialog.set_directory(start);
    }
    let folder = dialog.blocking_pick_folder()?.into_path().ok()?;
    if let Ok(mut set) = state.writable.lock() {
        set.insert(folder.clone());
    }
    Some(folder.to_string_lossy().into_owned())
}

/// Allows writing to a folder remembered for a client (chosen earlier in the dialog).
#[tauri::command]
pub fn allow_remembered_dir(state: State<AppState>, client_id: i64) -> Result<Option<String>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let dir = store.client(client_id).map_err(|e| e.to_string())?.and_then(|c| c.output_dir).map(PathBuf::from);
    match dir {
        Some(dir) if dir.is_dir() => {
            if let Ok(mut set) = state.writable.lock() {
                set.insert(dir.clone());
            }
            Ok(Some(dir.to_string_lossy().into_owned()))
        }
        _ => Ok(None),
    }
}

/// File names never contain path separators or characters Windows rejects.
pub fn safe_file_name(name: &str) -> String {
    let cleaned: String = name.chars().map(|c| if r#"\/:*?"<>|"#.contains(c) || c.is_control() { '-' } else { c }).collect();
    let trimmed = cleaned.trim().trim_matches('.').trim();
    if trimmed.is_empty() { "Binder".into() } else { trimmed.chars().take(180).collect() }
}

/// Picks "name.pdf", or "name (2).pdf" … if it exists.
pub fn unique_path(dir: &Path, name: &str) -> PathBuf {
    let base = safe_file_name(name);
    let mut candidate = dir.join(format!("{base}.pdf"));
    let mut n = 2;
    while candidate.exists() {
        candidate = dir.join(format!("{base} ({n}).pdf"));
        n += 1;
    }
    candidate
}

/// Writes a PDF. Raw body; headers `x-dir` (an allowed folder), `x-name` and `x-subdir` (optional).
// Off the main thread: file IO, JPEG encoding and the modal dialog would block the UI.
#[tauri::command(async)]
pub fn write_output(state: State<AppState>, request: Request<'_>) -> Result<String, String> {
    let header = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(percent_decode);
    let dir = PathBuf::from(header("x-dir").ok_or("Missing folder")?);
    let name = header("x-name").ok_or("Missing file name")?;
    let allowed = state.writable.lock().is_ok_and(|set| set.iter().any(|d| dir.starts_with(d)));
    if !allowed {
        return Err("Choose the output folder again.".into());
    }
    let target_dir = match header("x-subdir") {
        Some(sub) if !sub.is_empty() => dir.join(safe_file_name(&sub)),
        _ => dir,
    };
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected file bytes".into()) };
    let path = unique_path(&target_dir, &name);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Headers are ASCII: names are sent percent-encoded.
fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinderRecord {
    client_id: i64,
    tax_year: i64,
    documents: i64,
    pages: i64,
    output_path: String,
    output_dir: String,
    trial: bool,
}

/// Records an exported binder (for Recent binders) and remembers the client's folder.
#[tauri::command]
pub fn record_binder(state: State<AppState>, record: BinderRecord) -> Result<(), String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let conn = store.connection();
    conn.execute(
        "INSERT INTO binders (client_id, tax_year, documents, pages, output_path, trial) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![record.client_id, record.tax_year, record.documents, record.pages, record.output_path, record.trial as i64],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("UPDATE clients SET output_dir = ?1 WHERE id = ?2", rusqlite::params![record.output_dir, record.client_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makes_safe_unique_file_names() {
        assert_eq!(safe_file_name("2026 W-2 / Acme: Inc?"), "2026 W-2 - Acme- Inc-");
        assert_eq!(safe_file_name(" .. "), "Binder");
        let dir = std::env::temp_dir().join(format!("br-unique-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let first = unique_path(&dir, "Jane – 2026 Binder");
        std::fs::write(&first, b"x").unwrap();
        assert!(unique_path(&dir, "Jane – 2026 Binder").to_string_lossy().ends_with("Jane – 2026 Binder (2).pdf"));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn decodes_percent_encoded_names() {
        assert_eq!(percent_decode("Jane%20%E2%80%93%202026"), "Jane – 2026");
    }

    #[test]
    fn quality_presets_shrink_in_order() {
        let page = GrayImage::from_fn(1275, 1650, |x, y| image::Luma([((x * 7 + y * 13) % 255) as u8]));
        let sizes: Vec<usize> = [Quality::Compact, Quality::Balanced, Quality::High].iter().map(|q| encode_page(&page, *q).unwrap().len()).collect();
        assert!(sizes[0] < sizes[1] && sizes[1] < sizes[2], "{sizes:?}");
    }
}
