//! The per-file pipeline: read → split into pages → recognize → page images.
//!
//! Digital PDFs use their embedded text layer (exact and fast). Scans and photos
//! are rendered or decoded, made upright and deskewed, then OCR'd. Every page
//! gets a 150 DPI JPEG for display and binder export, and a dHash for
//! near-duplicate detection. Nothing here logs document text.

use crate::images::{self, Kind};
use crate::ocr::{OcrEngine, TesseractEngine};
use crate::pdf;
use crate::phash::dhash;
use crate::preprocess;
use crate::types::{FileErrorKind, FileInput, PageInput, Stage, TextSource, Word};
use image::{GrayImage, codecs::jpeg::JpegEncoder};
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::cell::RefCell;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

/// OCR resolution for scans.
pub const OCR_DPI: f32 = 300.0;
/// Resolution of the stored page images used for display and export.
pub const DISPLAY_DPI: f32 = 150.0;
/// Photos are scaled so their long side is at most this many pixels before OCR
/// (a letter page at 300 DPI is 3300 px tall).
const PHOTO_MAX: u32 = 3300;

#[derive(Debug, Clone)]
pub struct Options {
    /// Page images are written to `<cache_dir>/pages/<sha256>/<index>.jpg`.
    pub cache_dir: PathBuf,
    pub resource_dir: Option<PathBuf>,
    pub tessdata: Option<PathBuf>,
}

thread_local! {
    // Tesseract instances are not thread-safe: one per worker thread.
    static ENGINE: RefCell<Option<TesseractEngine>> = const { RefCell::new(None) };
}

fn with_engine<T>(opts: &Options, f: impl FnOnce(&mut dyn OcrEngine) -> T) -> Result<T, FileErrorKind> {
    ENGINE.with(|cell| {
        let mut slot = cell.borrow_mut();
        if slot.is_none() {
            *slot = Some(TesseractEngine::new(opts.tessdata.clone()).map_err(|_| FileErrorKind::Unreadable)?);
        }
        let engine = slot.as_mut().ok_or(FileErrorKind::Unreadable)?;
        Ok(f(engine))
    })
}

fn save_jpeg(image: &GrayImage, path: &Path) -> Result<(), FileErrorKind> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| FileErrorKind::Unreadable)?;
    }
    let file = fs::File::create(path).map_err(|_| FileErrorKind::Unreadable)?;
    let mut writer = std::io::BufWriter::new(file);
    JpegEncoder::new_with_quality(&mut writer, 82).encode_image(image).map_err(|_| FileErrorKind::Unreadable)
}

/// What one page needs before recognition.
enum Raw {
    TextLayer { words: Vec<Word>, display: GrayImage },
    Image { image: GrayImage, ppi: u32 },
}

/// Stage durations on stderr when BINDERREADY_TIMINGS is set. Never prints document content.
fn timed<T>(label: &str, f: impl FnOnce() -> T) -> T {
    if std::env::var_os("BINDERREADY_TIMINGS").is_none() {
        return f();
    }
    let started = std::time::Instant::now();
    let out = f();
    eprintln!("timing {label} {:.0}ms", started.elapsed().as_secs_f64() * 1000.0);
    out
}

fn recognize_image(opts: &Options, image: GrayImage, ppi: u32) -> Result<(Vec<Word>, GrayImage, u16, f32), FileErrorKind> {
    let image = timed("contrast", || preprocess::normalize_contrast(&image));
    let reading = timed("recognize", || with_engine(opts, |e| preprocess::read_upright(e, &image, ppi)))?.map_err(|_| FileErrorKind::Unreadable)?;
    let (ocr, straight, rotation) = (reading.words, reading.image, reading.rotation);
    let (w, h) = (straight.width() as f32, straight.height() as f32);
    let mean = if ocr.is_empty() { 0.0 } else { ocr.iter().map(|o| o.confidence).sum::<f32>() / ocr.len() as f32 };
    let words = ocr
        .into_iter()
        .map(|o| Word {
            text: o.text,
            x: o.left as f32 / w,
            y: o.top as f32 / h,
            w: o.width as f32 / w,
            h: o.height as f32 / h,
            confidence: o.confidence,
        })
        .collect();
    Ok((words, straight, rotation, mean))
}

/// How a page's text was obtained.
struct Origin {
    source: TextSource,
    rotation: u16,
    confidence: f32,
}

fn finish_page(opts: &Options, sha: &str, index: usize, words: Vec<Word>, display: GrayImage, origin: Origin) -> Result<PageInput, FileErrorKind> {
    let Origin { source, rotation, confidence } = origin;
    let path = opts.cache_dir.join("pages").join(sha).join(format!("{index}.jpg"));
    save_jpeg(&display, &path)?;
    Ok(PageInput {
        index,
        words,
        source,
        phash: dhash(&display),
        image: path.to_string_lossy().into_owned(),
        image_width: display.width(),
        image_height: display.height(),
        rotation,
        confidence,
    })
}

/// Processes one file. `progress(stage, pages_done, pages_total)` is called as work advances;
/// `cancel` stops between pages.
pub fn ingest_file(
    id: &str,
    path: &Path,
    opts: &Options,
    cancel: &AtomicBool,
    progress: &(dyn Fn(Stage, usize, usize) + Sync),
) -> Result<FileInput, FileErrorKind> {
    progress(Stage::Reading, 0, 0);
    let bytes = fs::read(path).map_err(|_| FileErrorKind::Unreadable)?;
    let sha = hex::encode(Sha256::digest(&bytes));
    let kind = images::detect(&bytes).ok_or(FileErrorKind::Unsupported)?;
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();

    progress(Stage::Splitting, 0, 0);
    let raws: Vec<Raw> = if kind == Kind::Pdf {
        let pdfium = pdf::pdfium(opts.resource_dir.as_deref()).map_err(|_| FileErrorKind::Unreadable)?;
        let document = pdf::open(pdfium, &bytes)?;
        let mut raws = Vec::new();
        for page in document.pages().iter() {
            let (words, chars) = pdf::text_words(&page);
            if pdf::text_layer_usable(&words, chars) {
                raws.push(Raw::TextLayer { words, display: pdf::render(&page, DISPLAY_DPI)? });
            } else {
                raws.push(Raw::Image { image: pdf::render(&page, OCR_DPI)?, ppi: OCR_DPI as u32 });
            }
        }
        raws
    } else {
        images::decode_pages(kind, &bytes)?
            .into_iter()
            .map(|image| {
                let fitted = preprocess::fit(&image, PHOTO_MAX);
                // Assume the page fills the frame: estimate resolution from an 11-inch long side.
                let ppi = (fitted.width().max(fitted.height()) as f32 / 11.0).round().max(72.0) as u32;
                Raw::Image { image: fitted, ppi }
            })
            .collect()
    };
    if raws.is_empty() {
        return Err(FileErrorKind::Corrupt);
    }

    let total = raws.len();
    let done = AtomicUsize::new(0);
    progress(Stage::Recognizing, 0, total);
    let pages: Result<Vec<PageInput>, FileErrorKind> = raws
        .into_par_iter()
        .enumerate()
        .map(|(index, raw)| {
            if cancel.load(Ordering::Relaxed) {
                return Err(FileErrorKind::Unreadable);
            }
            let page = match raw {
                Raw::TextLayer { words, display } => finish_page(opts, &sha, index, words, display, Origin { source: TextSource::TextLayer, rotation: 0, confidence: 1.0 }),
                Raw::Image { image, ppi } => {
                    let (words, straight, rotation, mean) = recognize_image(opts, image, ppi)?;
                    let scale = DISPLAY_DPI / ppi as f32;
                    let display = image::imageops::resize(
                        &straight,
                        ((straight.width() as f32 * scale) as u32).max(1),
                        ((straight.height() as f32 * scale) as u32).max(1),
                        image::imageops::FilterType::Triangle,
                    );
                    finish_page(opts, &sha, index, words, display, Origin { source: TextSource::Ocr, rotation, confidence: mean })
                }
            }?;
            let n = done.fetch_add(1, Ordering::Relaxed) + 1;
            progress(Stage::Recognizing, n, total);
            Ok(page)
        })
        .collect();
    let mut pages = pages?;
    pages.sort_by_key(|p| p.index);
    progress(Stage::Done, total, total);

    Ok(FileInput { id: id.to_string(), name, path: path.to_string_lossy().into_owned(), sha256: sha, pages })
}
