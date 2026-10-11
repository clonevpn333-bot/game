//! `binderready-ingest [--cache DIR] [--engine tesseract|native] FILE...` — runs the desktop ingest pipeline and
//! prints one JSON line per file: {"ok":FileInput} or {"error":"password",...}.
//! Used by the accuracy harness (scanned and photo tiers) and for benchmarks.

use binderready_lib::{ingest, ocr};
use rayon::prelude::*;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::time::Instant;

fn main() {
    ocr::limit_internal_threads();
    let mut args = std::env::args().skip(1).peekable();
    let mut cache = std::env::temp_dir().join("binderready-ingest");
    let mut files = Vec::new();
    let mut engine = ocr::Engine::Tesseract;
    while let Some(arg) = args.next() {
        if arg == "--cache" {
            if let Some(dir) = args.next() {
                cache = PathBuf::from(dir);
            }
        } else if arg == "--engine" {
            engine = match args.next().as_deref() {
                Some("native") if native_ocr::available() => ocr::Engine::Native,
                Some("native") => {
                    eprintln!("No native text recognition on this system.");
                    std::process::exit(2);
                }
                _ => ocr::Engine::Tesseract,
            };
        } else {
            files.push(PathBuf::from(arg));
        }
    }
    let opts = ingest::Options { cache_dir: cache, resource_dir: None, tessdata: ocr::tessdata_dir(None), engine };
    let cancel = AtomicBool::new(false);
    let started = Instant::now();
    // Files in parallel (pages within a file are parallel too); output keeps input order.
    let results: Vec<String> = files
        .par_iter()
        .enumerate()
        .map(|(i, path)| match ingest::ingest_file(&format!("f{i}"), path, &opts, &cancel, &|_, _, _| {}) {
            Ok(file) => serde_json::json!({ "ok": file }).to_string(),
            Err(kind) => serde_json::json!({ "path": path, "error": kind }).to_string(),
        })
        .collect();
    let pages: usize = results
        .iter()
        .filter_map(|r| serde_json::from_str::<serde_json::Value>(r).ok())
        .filter_map(|v| v["ok"]["pages"].as_array().map(Vec::len))
        .sum();
    for line in &results {
        println!("{line}");
    }
    eprintln!("{} pages in {:.1}s", pages, started.elapsed().as_secs_f64());
}
