//! BinderReady desktop backend.

pub mod images;
pub mod ingest;
pub mod logo;
pub mod diagnostics;
pub mod license;
pub mod net;
pub mod ocr;
pub mod pdf;
pub mod phash;
pub mod preprocess;
pub mod store;
pub mod types;

mod commands;
pub mod export;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub store: Mutex<store::Store>,
    /// Files ingested this session: the only user files export may read.
    pub ingested: Mutex<std::collections::HashSet<PathBuf>>,
    /// Folders the user chose (now or for a client before): the only places export may write.
    pub writable: Mutex<std::collections::HashSet<PathBuf>>,
    pub ingest: ingest::Options,
    pub data_dir: PathBuf,
    pub cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
    /// Timings and error codes for the diagnostic report (this session only).
    pub diagnostics: diagnostics::Recorder,
}

pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init());
    // Only release builds with a signing key and manifest URL have an updater; the
    // release workflow also passes the matching `plugins.updater` config, which the
    // plugin requires at startup.
    if commands::updates_configured() {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }
    builder
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let cache_dir = app.path().app_cache_dir()?;
            // Page images exist only for the working session: clear what a previous run left.
            ingest::clear_page_cache(&cache_dir);
            let resource_dir = app.path().resource_dir().ok();
            let store = store::Store::open(&data_dir.join("binderready.db")).map_err(|e| e.to_string())?;
            let tessdata = ocr::tessdata_dir(resource_dir.as_deref());
            app.manage(AppState {
                store: Mutex::new(store),
                ingested: Mutex::new(std::collections::HashSet::new()),
                writable: Mutex::new(std::collections::HashSet::new()),
                ingest: ingest::Options { cache_dir, resource_dir, tessdata, engine: ocr::Engine::Tesseract },
                data_dir,
                cancels: Mutex::new(HashMap::new()),
                diagnostics: diagnostics::Recorder::default(),
            });
            commands::revalidate_in_background(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::list_clients,
            commands::create_client,
            commands::list_binders,
            commands::get_setting,
            commands::set_setting,
            commands::ingest_files,
            commands::cancel_ingest,
            commands::expand_paths,
            export::read_source,
            export::page_jpeg,
            export::choose_output_dir,
            export::allow_remembered_dir,
            export::write_output,
            export::record_binder,
            commands::record_index,
            commands::previous_index,
            commands::dismissed_missing,
            commands::set_missing_dismissed,
            commands::delete_history,
            commands::choose_logo,
            commands::firm_logo,
            commands::clear_logo,
            commands::license_status,
            commands::activate_license,
            commands::deactivate_license,
            commands::begin_export,
            commands::open_buy_page,
            commands::export_diagnostics,
            commands::check_update,
            commands::install_update,
            commands::open_notices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BinderReady");
}
