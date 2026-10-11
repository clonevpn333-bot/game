//! Wire types shared with the TypeScript engine (`packages/engine/src/types.ts`).
//! Field names are camelCase on the wire so the frontend passes them straight
//! to `processFiles`.

use serde::{Deserialize, Serialize};

/// One recognized word. Coordinates are fractions of the page, origin top-left.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Word {
    pub text: String,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    /// OCR confidence 0–1; 1 for an embedded text layer.
    pub confidence: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TextSource {
    TextLayer,
    Ocr,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageInput {
    pub index: usize,
    pub words: Vec<Word>,
    pub source: TextSource,
    /// 64-bit dHash of the page image, 16 hex characters.
    pub phash: String,
    /// The upright, deskewed page image (150 DPI JPEG) used for display and export.
    pub image: String,
    pub image_width: u32,
    pub image_height: u32,
    /// Clockwise rotation (0/90/180/270) applied to make the page upright.
    pub rotation: u16,
    /// Mean OCR confidence 0–1 for OCR pages; 1 for text-layer pages.
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInput {
    pub id: String,
    pub name: String,
    pub path: String,
    pub sha256: String,
    pub pages: Vec<PageInput>,
}

/// Why a file could not be processed. Shown to the user as a plain sentence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FileErrorKind {
    Password,
    Corrupt,
    Unsupported,
    Unreadable,
}

impl FileErrorKind {
    pub fn message(self) -> &'static str {
        match self {
            FileErrorKind::Password => "Couldn’t open this file: it’s password-protected.",
            FileErrorKind::Corrupt => "Couldn’t open this file: it’s damaged or incomplete.",
            FileErrorKind::Unsupported => "This file type isn’t supported. Use PDF, JPG, PNG, HEIC or TIFF.",
            FileErrorKind::Unreadable => "Couldn’t read this file. Check that it still exists and isn’t open elsewhere.",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    Queued,
    Reading,
    Splitting,
    Recognizing,
    Done,
    Error,
}

/// Progress for one file, emitted as the `ingest://progress` event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub batch_id: String,
    pub file_id: String,
    pub stage: Stage,
    pub pages_done: usize,
    pub pages_total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<FileErrorKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<&'static str>,
}
