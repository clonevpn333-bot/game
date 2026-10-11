//! OCR behind one trait so platform engines (Phase 6: Windows.Media.Ocr, Apple
//! Vision) can replace the bundled Tesseract baseline.

use image::GrayImage;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct OcrWord {
    pub text: String,
    /// Pixel box in the recognized image.
    pub left: u32,
    pub top: u32,
    pub width: u32,
    pub height: u32,
    /// 0–1.
    pub confidence: f32,
}

#[derive(Debug, thiserror::Error)]
pub enum OcrError {
    #[error("OCR engine failed to start: {0}")]
    Init(String),
    #[error("OCR failed: {0}")]
    Recognize(String),
}

/// Which recognizer reads the pages.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Engine {
    Tesseract,
    /// Windows.Media.Ocr or Apple Vision.
    Native,
}

/// "Automatic" uses the native engine only when a measured comparison on that platform
/// shows it is at least as accurate as Tesseract. Measured (docs/ocr-engines.md): Apple
/// Vision and Windows.Media.Ocr are both less accurate and slower, so Automatic is Tesseract.
pub const AUTOMATIC_PREFERS_NATIVE: bool = false;

/// Engines this computer can run, the Automatic choice first.
pub fn available_engines() -> Vec<&'static str> {
    let mut engines = vec!["tesseract"];
    if native_ocr::available() {
        if AUTOMATIC_PREFERS_NATIVE {
            engines.insert(0, native_ocr::NAME);
        } else {
            engines.push(native_ocr::NAME);
        }
    }
    engines
}

/// The engine for a stored setting: "auto", "tesseract", "windows" or "vision".
pub fn engine_for_setting(setting: Option<&str>) -> Engine {
    let native = native_ocr::available();
    match setting {
        Some(name) if native && name == native_ocr::NAME => Engine::Native,
        Some("tesseract") => Engine::Tesseract,
        _ if native && AUTOMATIC_PREFERS_NATIVE => Engine::Native,
        _ => Engine::Tesseract,
    }
}

pub trait OcrEngine {
    fn name(&self) -> &'static str;
    fn recognize(&mut self, image: &GrayImage, ppi: u32) -> Result<Vec<OcrWord>, OcrError>;
    /// Whether word confidences are real. Orientation detection and name extraction
    /// rely on them; engines without them get orientation from Tesseract.
    fn reports_confidence(&self) -> bool {
        true
    }
}

/// Confidence given to words from an engine that reports none (Windows OCR): high
/// enough to count as readable text, so names and orientation logic still work.
pub const UNREPORTED_CONFIDENCE: f32 = 0.9;

/// The operating system's recognizer (see the `native-ocr` crate).
pub struct NativeEngine;

impl OcrEngine for NativeEngine {
    fn name(&self) -> &'static str {
        native_ocr::NAME
    }

    fn recognize(&mut self, image: &GrayImage, _ppi: u32) -> Result<Vec<OcrWord>, OcrError> {
        let words = native_ocr::recognize(image.as_raw(), image.width(), image.height()).map_err(OcrError::Recognize)?;
        Ok(words
            .into_iter()
            .map(|w| OcrWord {
                text: w.text,
                left: w.left,
                top: w.top,
                width: w.width,
                height: w.height,
                confidence: w.confidence.unwrap_or(UNREPORTED_CONFIDENCE),
            })
            .collect())
    }

    fn reports_confidence(&self) -> bool {
        cfg!(target_os = "macos")
    }
}

/// Tesseract parallelizes internally with OpenMP; with one engine per worker thread
/// that oversubscribes the CPU and the OpenMP barriers spin in futex calls (2x
/// slower measured). libgomp reads OMP_THREAD_LIMIT when it is loaded, before
/// `main`, so setting it here is too late: on Unix the process re-executes itself
/// once with it set. Call first thing in `main`.
pub fn limit_internal_threads() {
    if std::env::var_os("OMP_THREAD_LIMIT").is_some() {
        return;
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        if let Ok(exe) = std::env::current_exe() {
            // `exec` only returns if it failed; then run on with OpenMP's defaults.
            let _failed = std::process::Command::new(exe).args(std::env::args_os().skip(1)).env("OMP_THREAD_LIMIT", "1").exec();
        }
    }
    #[cfg(not(unix))]
    {
        // SAFETY: called at startup before any other thread exists. Takes effect only
        // when the OpenMP runtime loads after this point.
        unsafe { std::env::set_var("OMP_THREAD_LIMIT", "1") };
    }
}

/// Where tessdata lives: BINDERREADY_TESSDATA, then the bundled resource folder, then the system.
pub fn tessdata_dir(resource_dir: Option<&std::path::Path>) -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("BINDERREADY_TESSDATA") {
        return Some(PathBuf::from(dir));
    }
    if let Some(dir) = resource_dir.map(|d| d.join("tessdata")) {
        if dir.join("eng.traineddata").exists() {
            return Some(dir);
        }
    }
    None
}

/// Keeps one initialized Tesseract per worker: loading the language model costs
/// far more than recognizing a small image, so it is done once.
pub struct TesseractEngine {
    datapath: Option<String>,
    api: Option<tesseract::Tesseract>,
}

impl TesseractEngine {
    pub fn new(datapath: Option<PathBuf>) -> Result<Self, OcrError> {
        let datapath = datapath.map(|p| p.to_string_lossy().into_owned());
        let api = tesseract::Tesseract::new(datapath.as_deref(), Some("eng")).map_err(|e| OcrError::Init(e.to_string()))?;
        Ok(Self { datapath, api: Some(api) })
    }
}

impl OcrEngine for TesseractEngine {
    fn name(&self) -> &'static str {
        "tesseract"
    }

    fn recognize(&mut self, image: &GrayImage, ppi: u32) -> Result<Vec<OcrWord>, OcrError> {
        let (w, h) = image.dimensions();
        let api = match self.api.take() {
            Some(api) => api,
            None => tesseract::Tesseract::new(self.datapath.as_deref(), Some("eng")).map_err(|e| OcrError::Init(e.to_string()))?,
        };
        let mut api = api
            .set_frame(image.as_raw(), w as i32, h as i32, 1, w as i32)
            .map_err(|e| OcrError::Recognize(e.to_string()))?
            .set_source_resolution(ppi as i32);
        api.set_page_seg_mode(tesseract::PageSegMode::PsmAuto);
        let mut api = api.recognize().map_err(|e| OcrError::Recognize(e.to_string()))?;
        let tsv = api.get_tsv_text(0).map_err(|e| OcrError::Recognize(e.to_string()))?;
        self.api = Some(api);
        Ok(parse_tsv(&tsv))
    }
}

/// Tesseract TSV: level, page, block, par, line, word, left, top, width, height, conf, text.
pub fn parse_tsv(tsv: &str) -> Vec<OcrWord> {
    tsv.lines()
        .filter_map(|line| {
            let cols: Vec<&str> = line.split('\t').collect();
            if cols.len() < 12 || cols[0] != "5" {
                return None;
            }
            let text = cols[11].trim();
            let conf: f32 = cols[10].parse().ok()?;
            if text.is_empty() || conf < 0.0 {
                return None;
            }
            Some(OcrWord {
                text: text.to_string(),
                left: cols[6].parse().ok()?,
                top: cols[7].parse().ok()?,
                width: cols[8].parse().ok()?,
                height: cols[9].parse().ok()?,
                confidence: conf / 100.0,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {

    #[test]
    fn engine_setting_falls_back_to_tesseract() {
        assert_eq!(engine_for_setting(Some("tesseract")), Engine::Tesseract);
        assert_eq!(engine_for_setting(Some("no-such-engine")), Engine::Tesseract);
        if !native_ocr::available() {
            // Without a native engine, asking for one (or Automatic) reads with Tesseract.
            assert_eq!(engine_for_setting(Some("windows")), Engine::Tesseract);
            assert_eq!(engine_for_setting(Some("vision")), Engine::Tesseract);
            assert_eq!(engine_for_setting(None), Engine::Tesseract);
            assert_eq!(available_engines(), vec!["tesseract"]);
        }
    }

    use super::*;

    #[test]
    fn parses_word_rows_only() {
        let tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
                   4\t1\t1\t1\t1\t0\t10\t10\t100\t20\t-1\t\n\
                   5\t1\t1\t1\t1\t1\t10\t10\t40\t20\t96.5\tForm\n\
                   5\t1\t1\t1\t1\t2\t60\t10\t40\t20\t91\tW-2\n";
        let words = parse_tsv(tsv);
        assert_eq!(words.len(), 2);
        assert_eq!(words[1].text, "W-2");
        assert!((words[0].confidence - 0.965).abs() < 1e-6);
    }
}
