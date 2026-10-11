//! Windows.Media.Ocr (built into Windows 10 and 11; uses the installed language packs).

use crate::Word;
use windows::Globalization::Language;
use windows::Graphics::Imaging::{BitmapAlphaMode, BitmapPixelFormat, SoftwareBitmap};
use windows::Media::Ocr::OcrEngine;
use windows::Security::Cryptography::CryptographicBuffer;
use windows::Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize};
use windows::core::HSTRING;

pub const NAME: &str = "windows";

fn init_thread() {
    // Each worker thread joins the multithreaded apartment once; "already initialized"
    // (in either mode) is fine.
    thread_local!(static READY: () = unsafe {
        let _ = RoInitialize(RO_INIT_MULTITHREADED);
    });
    READY.with(|_| {});
}

fn engine() -> windows::core::Result<OcrEngine> {
    init_thread();
    let english = Language::CreateLanguage(&HSTRING::from("en-US"))?;
    match OcrEngine::TryCreateFromLanguage(&english) {
        Ok(engine) => Ok(engine),
        // Fall back to whatever the user's profile languages support.
        Err(_) => OcrEngine::TryCreateFromUserProfileLanguages(),
    }
}

/// Windows OCR is usable when an OCR language pack is installed.
pub fn available() -> bool {
    engine().is_ok()
}

pub fn recognize(gray: &[u8], width: u32, height: u32) -> Result<Vec<Word>, String> {
    let to_string = |e: windows::core::Error| e.message().to_string();
    if gray.len() != (width as usize) * (height as usize) {
        return Err("Image buffer does not match its size.".into());
    }
    let engine = engine().map_err(to_string)?;
    let max = OcrEngine::MaxImageDimension().map_err(to_string)?;
    if width > max || height > max {
        return Err(format!("Image is larger than Windows OCR accepts ({max} px)."));
    }
    // BGRA8 is the format every OCR-capable Windows build accepts.
    let mut bgra = Vec::with_capacity(gray.len() * 4);
    for &v in gray {
        bgra.extend_from_slice(&[v, v, v, 255]);
    }
    let bitmap = SoftwareBitmap::CreateWithAlpha(BitmapPixelFormat::Bgra8, width as i32, height as i32, BitmapAlphaMode::Ignore)
        .map_err(to_string)?;
    let buffer = CryptographicBuffer::CreateFromByteArray(&bgra).map_err(to_string)?;
    bitmap.CopyFromBuffer(&buffer).map_err(to_string)?;
    let result = engine.RecognizeAsync(&bitmap).map_err(to_string)?.get().map_err(to_string)?;
    let mut words = Vec::new();
    for line in result.Lines().map_err(to_string)? {
        for word in line.Words().map_err(to_string)? {
            let rect = word.BoundingRect().map_err(to_string)?;
            words.push(Word {
                text: word.Text().map_err(to_string)?.to_string(),
                left: rect.X.max(0.0) as u32,
                top: rect.Y.max(0.0) as u32,
                width: rect.Width.max(1.0) as u32,
                height: rect.Height.max(1.0) as u32,
                confidence: None,
            });
        }
    }
    Ok(words)
}
