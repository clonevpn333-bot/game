//! Tauri commands. Long work runs on a background thread and reports through events:
//!   ingest://progress  { batchId, fileId, stage, pagesDone, pagesTotal, error?, message? }
//!   ingest://file      { batchId, file: FileInput }

use crate::AppState;
use crate::ingest;
use crate::license;
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
    /// The build has a signed updater configured.
    updates: bool,
    data_dir: String,
    platform: &'static str,
}

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<AppState>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        ocr_engines: crate::ocr::available_engines(),
        updates: updates_configured(),
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
        let started = std::time::Instant::now();
        let summary = std::sync::Mutex::new(crate::diagnostics::BatchSummary {
            engine: if opts.engine == crate::ocr::Engine::Native { native_ocr::NAME } else { "tesseract" },
            ..Default::default()
        });
        files.par_iter().for_each(|f| {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            let progress = |stage: Stage, done: usize, total: usize| emit(&f.id, stage, done, total, None);
            let result = ingest::ingest_file(&f.id, &PathBuf::from(&f.path), &opts, &cancel, &progress);
            if let Ok(mut s) = summary.lock() {
                s.record_file(&result);
            }
            match result {
                Ok(file) => {
                    let _ = app.emit("ingest://file", FileEvent { batch_id: batch_id.clone(), file });
                }
                Err(kind) => emit(&f.id, Stage::Error, 0, 0, Some(kind)),
            }
        });
        if let (Some(state), Ok(mut s)) = (app.try_state::<AppState>(), summary.into_inner()) {
            s.seconds = (started.elapsed().as_secs_f64() * 10.0).round() / 10.0;
            state.diagnostics.push(s);
        }
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

// Licensing (see license.rs).

/// Settings key mirroring the keychain's list of trial binders.
pub const TRIAL_SETTING: &str = "trial.binders";

fn status(state: &State<AppState>) -> Result<license::LicenseStatus, StoreError> {
    let activation = license::load_activation(&license::Keychain);
    let used = license::trial_used(&license::Keychain, lock(state)?.get_setting(TRIAL_SETTING)?.as_deref());
    Ok(license::LicenseStatus {
        licensed: activation.is_some(),
        key_masked: activation.as_ref().map(|a| license::mask(&a.key)),
        product_name: activation.as_ref().map(|a| a.product_name.clone()),
        variant_name: activation.as_ref().map(|a| a.variant_name.clone()),
        activated_at: activation.as_ref().map(|a| a.activated_at),
        last_validated: activation.as_ref().map(|a| a.last_validated),
        trial_used: used.len().min(license::TRIAL_BINDERS),
        trial_limit: license::TRIAL_BINDERS,
        store_configured: license::StoreConfig::from_build().is_some(),
        can_buy: BUY_URL.is_some(),
    })
}

#[tauri::command]
pub fn license_status(state: State<AppState>) -> Result<license::LicenseStatus, StoreError> {
    status(&state)
}

fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or_default()
}

/// How this computer appears in the customer's Lemon Squeezy account.
fn instance_name(app: &AppHandle) -> String {
    let computer = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| match std::env::consts::OS {
            "macos" => "Mac".into(),
            "windows" => "Windows PC".into(),
            other => other.into(),
        });
    format!("{} – {computer}", app.package_info().name)
}

#[tauri::command]
pub async fn activate_license(app: AppHandle, state: State<'_, AppState>, key: String) -> Result<license::LicenseStatus, String> {
    let name = instance_name(&app);
    tauri::async_runtime::spawn_blocking(move || {
        license::activate(&license::LemonSqueezy, &license::Keychain, license::StoreConfig::from_build().as_ref(), &key, &name, now())
    })
    .await
    .map_err(|e| e.to_string())??;
    status(&state).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn deactivate_license(state: State<'_, AppState>) -> Result<license::LicenseStatus, String> {
    tauri::async_runtime::spawn_blocking(|| license::deactivate(&license::LemonSqueezy, &license::Keychain)).await.map_err(|e| e.to_string())??;
    status(&state).map_err(|e| e.to_string())
}

/// Checked before an export writes anything. Ok(true) means a trial export (the cover
/// says so); an error explains that the trial is used up.
#[tauri::command]
pub fn begin_export(state: State<AppState>, client_id: i64, tax_year: i64) -> Result<bool, String> {
    let licensed = license::load_activation(&license::Keychain).is_some();
    let stored = lock(&state).map_err(|e| e.to_string())?.get_setting(TRIAL_SETTING).map_err(|e| e.to_string())?;
    let used = license::trial_used(&license::Keychain, stored.as_deref());
    license::export_allowed(licensed, &used, &license::binder_key(client_id, tax_year))
}

/// The store page this build sells from, if it was built with one.
pub const BUY_URL: Option<&str> = option_env!("BINDERREADY_BUY_URL");

#[tauri::command]
pub fn open_buy_page(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let url = BUY_URL.ok_or("This build has no store page.")?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Background check at launch: at most every 14 days, and only an explicit answer from
/// the license server ends a license (`license://revoked`).
pub fn revalidate_in_background(app: AppHandle) {
    std::thread::spawn(move || {
        if let license::Revalidation::Revoked(reason) = license::revalidate(&license::LemonSqueezy, &license::Keychain, license::StoreConfig::from_build().as_ref(), now()) {
            let _ = app.emit("license://revoked", reason);
        }
    });
}

/// Settings → Data → "Export diagnostic report". Returns the saved path, or None if
/// the save dialog was cancelled.
#[tauri::command(async)]
pub fn export_diagnostics(app: AppHandle, state: State<'_, AppState>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (setting, trial, exported) = {
        let store = lock(&state).map_err(|e| e.to_string())?;
        let setting = store.get_setting("ocr.engine").map_err(|e| e.to_string())?.unwrap_or_else(|| "auto".into());
        let trial = license::trial_used(&license::Keychain, store.get_setting(TRIAL_SETTING).map_err(|e| e.to_string())?.as_deref()).len();
        let exported: i64 = store.connection().query_row("SELECT COUNT(*) FROM binders", [], |r| r.get(0)).map_err(|e| e.to_string())?;
        (setting, trial, exported)
    };
    let report = crate::diagnostics::Report {
        app_version: app.package_info().version.to_string(),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        cpus: std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
        ocr_engines: crate::ocr::available_engines(),
        ocr_setting: setting,
        licensed: license::load_activation(&license::Keychain).is_some(),
        trial_binders_used: trial.min(license::TRIAL_BINDERS),
        binders_exported: exported,
        batches_this_session: state.diagnostics.snapshot(),
    };
    let Some(path) = app
        .dialog()
        .file()
        .set_title("Save diagnostic report")
        .set_file_name(format!("{} diagnostic report.zip", app.package_info().name))
        .add_filter("Zip archive", &["zip"])
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    crate::diagnostics::write_zip(&report, &path)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

// Updates: tauri-plugin-updater, signed builds from GitHub Releases. Configured at build
// time (BINDERREADY_UPDATER_PUBKEY, BINDERREADY_UPDATE_URL); builds without them have
// no updater and Settings says so.

pub const UPDATER_PUBKEY: Option<&str> = option_env!("BINDERREADY_UPDATER_PUBKEY");
pub const UPDATE_URL: Option<&str> = option_env!("BINDERREADY_UPDATE_URL");

pub fn updates_configured() -> bool {
    UPDATER_PUBKEY.is_some() && UPDATE_URL.is_some_and(|u| crate::net::check_allowed(u).is_ok())
}

fn updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    use tauri_plugin_updater::UpdaterExt;
    let (Some(pubkey), Some(url)) = (UPDATER_PUBKEY, UPDATE_URL) else {
        return Err("This build doesn’t include automatic updates.".into());
    };
    crate::net::check_allowed(url).map_err(|e| e.to_string())?;
    let endpoint: tauri::Url = url.parse().map_err(|_| "The update address in this build is invalid.".to_string())?;
    app.updater_builder()
        .pubkey(pubkey)
        .endpoints(vec![endpoint])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    notes: Option<String>,
}

/// None when this is the newest version. Offline is an error the UI shows quietly.
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let update = updater(&app)?.check().await.map_err(|_| "Couldn’t check for updates. Try again when you’re online.".to_string())?;
    Ok(update.map(|u| UpdateInfo { version: u.version, notes: u.body }))
}

/// Downloads the update, verifies its signature, installs it and restarts.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let update = updater(&app)?.check().await.map_err(|e| e.to_string())?.ok_or("You already have the newest version.")?;
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| format!("The update couldn’t be installed: {e}"))?;
    app.restart();
}

/// Settings → About → "Open full notices": the bundled third-party license texts, in
/// the default text viewer.
#[tauri::command]
pub fn open_notices(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let bundled = app.path().resource_dir().ok().map(|d| d.join("third-party-notices.txt"));
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/third-party-notices.txt");
    let path = bundled.filter(|p| p.exists()).unwrap_or(dev);
    app.opener().open_path(path.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}
