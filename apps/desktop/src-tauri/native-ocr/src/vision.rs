//! Apple Vision text recognition (VNRecognizeTextRequest, macOS 10.15+).

use crate::{Word, word_ranges};
use objc2::AllocAnyThread;
use objc2::rc::Retained;
use objc2_foundation::{NSArray, NSData, NSDictionary, NSRange, NSString};
use objc2_vision::{VNImageRequestHandler, VNRecognizeTextRequest, VNRequest, VNRequestTextRecognitionLevel};

pub const NAME: &str = "vision";

/// Vision ships with macOS 10.15 and later, which every supported Mac runs.
pub fn available() -> bool {
    true
}

fn png(gray: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut encoder = png::Encoder::new(&mut out, width, height);
    encoder.set_color(png::ColorType::Grayscale);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Fast);
    let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
    writer.write_image_data(gray).map_err(|e| e.to_string())?;
    writer.finish().map_err(|e| e.to_string())?;
    Ok(out)
}

pub fn recognize(gray: &[u8], width: u32, height: u32) -> Result<Vec<Word>, String> {
    if gray.len() != (width as usize) * (height as usize) {
        return Err("Image buffer does not match its size.".into());
    }
    let data = NSData::with_bytes(&png(gray, width, height)?);
    let (w, h) = (width as f64, height as f64);
    objc2::rc::autoreleasepool(|_| unsafe {
        let request = VNRecognizeTextRequest::new();
        request.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);
        request.setUsesLanguageCorrection(true);
        request.setRecognitionLanguages(&NSArray::from_retained_slice(&[NSString::from_str("en-US")]));
        let handler = VNImageRequestHandler::initWithData_options(VNImageRequestHandler::alloc(), &data, &NSDictionary::new());
        let as_request: Retained<VNRequest> = Retained::into_super(Retained::into_super(request.clone()));
        handler
            .performRequests_error(&NSArray::from_retained_slice(&[as_request]))
            .map_err(|e| e.localizedDescription().to_string())?;
        let mut words = Vec::new();
        let Some(observations) = request.results() else { return Ok(words) };
        for observation in observations.iter() {
            let candidates = observation.topCandidates(1);
            let Some(candidate) = candidates.firstObject() else { continue };
            let line = candidate.string().to_string();
            let confidence = candidate.confidence();
            for (text, start, len) in word_ranges(&line) {
                let Ok(rect) = candidate.boundingBoxForRange_error(NSRange::new(start, len)) else { continue };
                // Normalized, origin at the bottom left.
                let b = rect.boundingBox();
                words.push(Word {
                    text,
                    left: (b.origin.x * w).max(0.0) as u32,
                    top: ((1.0 - b.origin.y - b.size.height) * h).max(0.0) as u32,
                    width: (b.size.width * w).max(1.0) as u32,
                    height: (b.size.height * h).max(1.0) as u32,
                    confidence: Some(confidence),
                });
            }
        }
        Ok(words)
    })
}
