//! Settings → "Export diagnostic report": a zip the preparer saves and can email to
//! support. App version, system, OCR engine, timings and error codes only: no file
//! names, paths, client names, document text or license key.

use crate::types::{FileErrorKind, FileInput, TextSource};
use serde::Serialize;
use std::collections::{BTreeMap, VecDeque};
use std::io::Write;
use std::path::Path;
use std::sync::Mutex;

/// Batches kept in memory (this session only; nothing is written until an export).
const KEEP: usize = 50;

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BatchSummary {
    pub engine: &'static str,
    pub files: usize,
    pub pages: usize,
    pub text_layer_pages: usize,
    pub ocr_pages: usize,
    pub seconds: f64,
    /// Error kind → number of files.
    pub errors: BTreeMap<&'static str, usize>,
}

impl BatchSummary {
    pub fn record_file(&mut self, result: &Result<FileInput, FileErrorKind>) {
        self.files += 1;
        match result {
            Ok(file) => {
                self.pages += file.pages.len();
                self.text_layer_pages += file.pages.iter().filter(|p| p.source == TextSource::TextLayer).count();
                self.ocr_pages += file.pages.iter().filter(|p| p.source == TextSource::Ocr).count();
            }
            Err(kind) => *self.errors.entry(error_code(*kind)).or_default() += 1,
        }
    }
}

pub fn error_code(kind: FileErrorKind) -> &'static str {
    match kind {
        FileErrorKind::Password => "password",
        FileErrorKind::Corrupt => "corrupt",
        FileErrorKind::Unsupported => "unsupported",
        FileErrorKind::Unreadable => "unreadable",
    }
}

#[derive(Default)]
pub struct Recorder(Mutex<VecDeque<BatchSummary>>);

impl Recorder {
    pub fn push(&self, batch: BatchSummary) {
        if let Ok(mut batches) = self.0.lock() {
            if batches.len() == KEEP {
                batches.pop_front();
            }
            batches.push_back(batch);
        }
    }

    pub fn snapshot(&self) -> Vec<BatchSummary> {
        self.0.lock().map(|b| b.iter().cloned().collect()).unwrap_or_default()
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub app_version: String,
    pub os: &'static str,
    pub arch: &'static str,
    pub cpus: usize,
    pub ocr_engines: Vec<&'static str>,
    pub ocr_setting: String,
    pub licensed: bool,
    pub trial_binders_used: usize,
    pub binders_exported: i64,
    pub batches_this_session: Vec<BatchSummary>,
}

const README: &str = "This report helps support diagnose problems with the app.\n\
It contains the app version, your operating system, the text recognition engine,\n\
processing timings and error codes. It contains no file names, folders, client\n\
names, document contents or license key. You can open report.json to check.\n";

/// Writes report.json and README.txt into a zip at `path`.
pub fn write_zip(report: &Report, path: &Path) -> Result<(), String> {
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    zip.start_file("report.json", options).map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(report).map_err(|e| e.to_string())?.as_bytes()).map_err(|e| e.to_string())?;
    zip.start_file("README.txt", options).map_err(|e| e.to_string())?;
    zip.write_all(README.as_bytes()).map_err(|e| e.to_string())?;
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{PageInput, Word};

    fn file(name: &str, sources: &[TextSource]) -> FileInput {
        FileInput {
            id: "f1".into(),
            name: name.into(),
            path: format!("/Users/preparer/Clients/Jane Sample/{name}"),
            sha256: "abc".into(),
            pages: sources
                .iter()
                .enumerate()
                .map(|(index, &source)| PageInput {
                    index,
                    words: vec![Word { text: "000-00-0000".into(), x: 0.0, y: 0.0, w: 0.1, h: 0.01, confidence: 1.0 }],
                    source,
                    phash: "0".into(),
                    image: "/cache/pages/abc/0.jpg".into(),
                    image_width: 1,
                    image_height: 1,
                    rotation: 0,
                    confidence: 1.0,
                })
                .collect(),
        }
    }

    #[test]
    fn reports_counts_and_codes_but_nothing_identifying() {
        let mut batch = BatchSummary { engine: "tesseract", seconds: 3.5, ..Default::default() };
        batch.record_file(&Ok(file("Jane W-2.pdf", &[TextSource::TextLayer, TextSource::Ocr])));
        batch.record_file(&Err(FileErrorKind::Password));
        assert_eq!((batch.files, batch.pages, batch.text_layer_pages, batch.ocr_pages), (2, 2, 1, 1));
        let recorder = Recorder::default();
        recorder.push(batch);
        let report = Report {
            app_version: "0.1.0".into(),
            os: "macos",
            arch: "aarch64",
            cpus: 8,
            ocr_engines: vec!["tesseract"],
            ocr_setting: "auto".into(),
            licensed: false,
            trial_binders_used: 1,
            binders_exported: 1,
            batches_this_session: recorder.snapshot(),
        };
        let json = serde_json::to_string(&report).expect("json");
        for secret in ["Jane", "Users", "000-00-0000", "cache", "abc"] {
            assert!(!json.contains(secret), "report leaks {secret}: {json}");
        }
        assert!(json.contains("\"password\":1"));

        let dir = std::env::temp_dir().join(format!("br-diag-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("dir");
        let path = dir.join("report.zip");
        write_zip(&report, &path).expect("zip");
        let mut archive = zip::ZipArchive::new(std::fs::File::open(&path).expect("open")).expect("zip");
        let names: Vec<String> = (0..archive.len()).map(|i| archive.by_index(i).expect("entry").name().to_string()).collect();
        assert_eq!(names, vec!["report.json", "README.txt"]);
        std::fs::remove_dir_all(&dir).expect("cleanup");
    }

    #[test]
    fn keeps_the_most_recent_batches() {
        let recorder = Recorder::default();
        for files in 0..(KEEP + 5) {
            recorder.push(BatchSummary { files, ..Default::default() });
        }
        let kept = recorder.snapshot();
        assert_eq!(kept.len(), KEEP);
        assert_eq!(kept[0].files, 5);
    }
}
