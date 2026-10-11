//! The operating system's own text recognition, behind one small interface:
//! Windows.Media.Ocr on Windows, Apple Vision on macOS, nothing elsewhere.
//!
//! Kept in its own crate (no C dependencies) so it can be type-checked for both
//! platforms from any machine: `cargo check --target x86_64-pc-windows-msvc` and
//! `--target aarch64-apple-darwin`.

/// A recognized word in pixel coordinates of the input image (top-left origin).
#[derive(Debug, Clone, PartialEq)]
pub struct Word {
    pub text: String,
    pub left: u32,
    pub top: u32,
    pub width: u32,
    pub height: u32,
    /// 0–1 when the engine reports it (Vision does, per line; Windows OCR doesn't).
    pub confidence: Option<f32>,
}

#[cfg(windows)]
mod windows_ocr;
#[cfg(windows)]
pub use windows_ocr::{NAME, available, recognize};

#[cfg(target_os = "macos")]
mod vision;
#[cfg(target_os = "macos")]
pub use vision::{NAME, available, recognize};

/// No native engine on this platform.
#[cfg(not(any(windows, target_os = "macos")))]
pub const NAME: &str = "";

#[cfg(not(any(windows, target_os = "macos")))]
pub fn available() -> bool {
    false
}

#[cfg(not(any(windows, target_os = "macos")))]
pub fn recognize(_gray: &[u8], _width: u32, _height: u32) -> Result<Vec<Word>, String> {
    Err("No native text recognition on this platform.".into())
}

/// Splits a line into words with their character ranges (in UTF-16 units, which is
/// what Vision's ranges count).
pub fn word_ranges(line: &str) -> Vec<(String, usize, usize)> {
    let mut out = Vec::new();
    let mut offset = 0;
    let mut current = String::new();
    let mut start = 0;
    for ch in line.chars() {
        if ch.is_whitespace() {
            if !current.is_empty() {
                out.push((std::mem::take(&mut current), start, offset - start));
            }
            offset += ch.len_utf16();
            start = offset;
        } else {
            current.push(ch);
            offset += ch.len_utf16();
        }
    }
    if !current.is_empty() {
        out.push((current, start, offset - start));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_lines_into_utf16_word_ranges() {
        assert_eq!(
            word_ranges("Form  W–2 Wages"),
            vec![("Form".into(), 0, 4), ("W–2".into(), 6, 3), ("Wages".into(), 10, 5)]
        );
        assert!(word_ranges("   ").is_empty());
    }
}
