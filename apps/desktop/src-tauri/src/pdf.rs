//! PDF access through PDFium: open (with password detection), the embedded text
//! layer as positioned words, and page rendering.

use crate::types::{FileErrorKind, Word};
use image::GrayImage;
use pdfium_render::prelude::*;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static PDFIUM: OnceLock<Result<Pdfium, String>> = OnceLock::new();

/// Folders searched for the bundled PDFium library, in order.
fn candidate_dirs(resource_dir: Option<&Path>) -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(dir) = std::env::var("BINDERREADY_PDFIUM_DIR") {
        dirs.push(PathBuf::from(dir));
    }
    if let Some(dir) = resource_dir {
        dirs.push(dir.join("pdfium"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            dirs.push(parent.join("pdfium"));
            dirs.push(parent.to_path_buf());
            dirs.push(parent.join("../Resources/pdfium"));
        }
    }
    dirs.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("pdfium"));
    dirs
}

pub fn pdfium(resource_dir: Option<&Path>) -> Result<&'static Pdfium, String> {
    PDFIUM
        .get_or_init(|| {
            for dir in candidate_dirs(resource_dir) {
                let lib = Pdfium::pdfium_platform_library_name_at_path(&dir);
                if lib.exists() {
                    return Pdfium::bind_to_library(&lib).map(Pdfium::new).map_err(|e| e.to_string());
                }
            }
            Err("PDFium library not found. Run `pnpm fetch:pdfium` in apps/desktop.".into())
        })
        .as_ref()
        .map_err(Clone::clone)
}

pub fn open<'a>(pdfium: &'a Pdfium, bytes: &'a [u8]) -> Result<PdfDocument<'a>, FileErrorKind> {
    pdfium.load_pdf_from_byte_slice(bytes, None).map_err(|e| match e {
        PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::PasswordError) => FileErrorKind::Password,
        _ => FileErrorKind::Corrupt,
    })
}

/// Words from the embedded text layer, in page fractions. Returns the words and
/// the number of non-space characters.
pub fn text_words(page: &PdfPage) -> (Vec<Word>, usize) {
    let width = page.width().value;
    let height = page.height().value;
    let Ok(text) = page.text() else { return (Vec::new(), 0) };
    let mut words: Vec<Word> = Vec::new();
    let mut current: Option<(String, f32, f32, f32, f32)> = None; // text, left, top, right, bottom (PDF points)
    let mut chars = 0usize;

    let flush = |current: &mut Option<(String, f32, f32, f32, f32)>, words: &mut Vec<Word>| {
        if let Some((t, l, top, r, b)) = current.take() {
            if !t.trim().is_empty() {
                words.push(Word {
                    text: t,
                    x: l / width,
                    y: (height - top) / height,
                    w: (r - l).max(0.0) / width,
                    h: (top - b).max(0.0) / height,
                    confidence: 1.0,
                });
            }
        }
    };

    for ch in text.chars().iter() {
        let Some(c) = ch.unicode_char() else { continue };
        if c.is_whitespace() || c == '\u{0}' {
            flush(&mut current, &mut words);
            continue;
        }
        let Ok(bounds) = ch.loose_bounds() else { continue };
        let (l, t, r, b) = (bounds.left().value, bounds.top().value, bounds.right().value, bounds.bottom().value);
        chars += 1;
        match current.as_mut() {
            // Same word: on the same baseline and touching the previous glyph.
            Some((s, _, top, right, bottom)) if (b - *bottom).abs() < (t - b) * 0.5 && l - *right < (t - b) * 0.35 => {
                s.push(c);
                *right = r;
                *top = top.max(t);
                *bottom = bottom.min(b);
            }
            _ => {
                flush(&mut current, &mut words);
                current = Some((c.to_string(), l, t, r, b));
            }
        }
    }
    flush(&mut current, &mut words);
    (words, chars)
}

/// A text layer is usable when it has real text, not a handful of stray glyphs or
/// an invisible OCR layer full of garbage.
pub fn text_layer_usable(words: &[Word], chars: usize) -> bool {
    if chars < 40 || words.is_empty() {
        return false;
    }
    let wordlike = words
        .iter()
        .filter(|w| w.text.chars().filter(|c| c.is_alphabetic()).count() >= 2)
        .count();
    wordlike as f32 / words.len() as f32 >= 0.45
}

pub fn render(page: &PdfPage, dpi: f32) -> Result<GrayImage, FileErrorKind> {
    let target = (page.width().value / 72.0 * dpi).round() as i32;
    let config = PdfRenderConfig::new().set_target_width(target.max(1));
    let bitmap = page.render_with_config(&config).map_err(|_| FileErrorKind::Corrupt)?;
    let image = bitmap.as_image().map_err(|_| FileErrorKind::Corrupt)?;
    Ok(image.to_luma8())
}
