//! Image pages before OCR: grayscale, contrast stretch, upright rotation
//! (chosen by OCR confidence on a downscaled pass) and deskew.

use crate::ocr::{OcrEngine, OcrError, OcrWord};
use image::{DynamicImage, GrayImage, Luma, imageops};
use imageproc::geometric_transformations::{Border, Interpolation, rotate_about_center};

/// Stretches the 1st–99th percentile of gray levels to the full range.
pub fn normalize_contrast(image: &GrayImage) -> GrayImage {
    let mut histogram = [0u64; 256];
    for p in image.pixels() {
        histogram[p.0[0] as usize] += 1;
    }
    let total: u64 = histogram.iter().sum();
    let percentile = |q: f64| -> u8 {
        let target = (total as f64 * q) as u64;
        let mut seen = 0u64;
        for (level, count) in histogram.iter().enumerate() {
            seen += count;
            if seen >= target {
                return level as u8;
            }
        }
        255
    };
    let (lo, hi) = (percentile(0.01), percentile(0.99));
    if hi <= lo.saturating_add(10) {
        return image.clone();
    }
    let scale = 255.0 / f32::from(hi - lo);
    GrayImage::from_fn(image.width(), image.height(), |x, y| {
        let v = image.get_pixel(x, y).0[0];
        Luma([((f32::from(v.saturating_sub(lo))) * scale).clamp(0.0, 255.0) as u8])
    })
}

pub fn rotate(image: &GrayImage, degrees: u16) -> GrayImage {
    match degrees {
        90 => imageops::rotate90(image),
        180 => imageops::rotate180(image),
        270 => imageops::rotate270(image),
        _ => image.clone(),
    }
}

/// Scales so the longer side is at most `max` pixels.
pub fn fit(image: &GrayImage, max: u32) -> GrayImage {
    let (w, h) = image.dimensions();
    let longest = w.max(h);
    if longest <= max {
        return image.clone();
    }
    let scale = max as f32 / longest as f32;
    imageops::resize(image, ((w as f32 * scale) as u32).max(1), ((h as f32 * scale) as u32).max(1), imageops::FilterType::Triangle)
}

/// How many confidently read real words run left to right. Turned pages still
/// yield plenty of low-confidence junk, and Tesseract reads sideways text
/// (words taller than wide), so only confident horizontal words count.
pub fn readable(words: &[OcrWord]) -> usize {
    words
        .iter()
        .filter(|w| w.confidence >= 0.85 && w.width > w.height && w.text.chars().filter(|c| c.is_alphabetic()).count() >= 3)
        .count()
}

/// A turn with at least this many readable words is taken as upright.
const READABLE: usize = 20;

/// A page made upright and straight, with its OCR.
pub struct Reading {
    pub words: Vec<OcrWord>,
    pub image: GrayImage,
    pub rotation: u16,
}

fn read_turned(engine: &mut dyn OcrEngine, image: &GrayImage, rotation: u16, ppi: u32) -> Result<Reading, OcrError> {
    let upright = rotate(image, rotation);
    let straight = deskew(&upright, estimate_skew(&upright));
    let words = engine.recognize(&straight, ppi)?;
    Ok(Reading { words, image: straight, rotation })
}

/// Finds the upright orientation and reads the page. The OCR runs first as the
/// page came and is kept when it reads well, so upright pages cost one pass.
/// Otherwise the other turns are read too (upside down first: the common
/// scanner mistake) until one reads well; the most readable reading wins. Pages
/// that fail the first pass are mostly sparse, so the extra passes are cheap.
pub fn read_upright(engine: &mut dyn OcrEngine, image: &GrayImage, ppi: u32) -> Result<Reading, OcrError> {
    let mut best = read_turned(engine, image, 0, ppi)?;
    let mut best_score = readable(&best.words);
    for rotation in [180, 90, 270] {
        if best_score >= READABLE {
            break;
        }
        let reading = read_turned(engine, image, rotation, ppi)?;
        let score = readable(&reading.words);
        if score > best_score {
            (best, best_score) = (reading, score);
        }
    }
    Ok(best)
}

/// Estimates skew within ±6° by maximizing the variance of row ink sums.
pub fn estimate_skew(image: &GrayImage) -> f32 {
    let small = fit(image, 900);
    let (w, h) = small.dimensions();
    let (cx, cy) = (w as f32 / 2.0, h as f32 / 2.0);
    // Project the ink pixels onto the vertical axis at each candidate angle; text
    // lines are sharpest (highest row variance) when the angle cancels the skew.
    let ink: Vec<(f32, f32)> = small
        .enumerate_pixels()
        .filter(|(_, _, p)| p.0[0] < 128)
        .map(|(x, y, _)| (x as f32 - cx, y as f32 - cy))
        .collect();
    let diagonal = (w as f32).hypot(h as f32);
    let bins = diagonal.ceil() as usize + 1;
    let mut rows = vec![0u32; bins];
    let mut best = (0.0f32, f64::MIN);
    for step in -12..=12 {
        let angle = step as f32 * 0.5;
        let (sin, cos) = angle.to_radians().sin_cos();
        rows.iter_mut().for_each(|r| *r = 0);
        for &(x, y) in &ink {
            let row = (x * sin + y * cos + diagonal / 2.0) as usize;
            if let Some(slot) = rows.get_mut(row) {
                *slot += 1;
            }
        }
        let variance = rows.iter().map(|&r| f64::from(r).powi(2)).sum::<f64>();
        if variance > best.1 {
            best = (angle, variance);
        }
    }
    best.0
}

pub fn deskew(image: &GrayImage, degrees: f32) -> GrayImage {
    if degrees.abs() < 0.25 {
        return image.clone();
    }
    rotate_about_center(image, degrees.to_radians(), Interpolation::Bilinear, Border::Constant(Luma([255])))
}

pub fn to_gray(image: &DynamicImage) -> GrayImage {
    image.to_luma8()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stretches_low_contrast_images() {
        let flat = GrayImage::from_fn(100, 10, |x, _| Luma([100 + (x as u8 % 50)]));
        let out = normalize_contrast(&flat);
        let max = out.pixels().map(|p| p.0[0]).max().unwrap_or(0);
        let min = out.pixels().map(|p| p.0[0]).min().unwrap_or(255);
        assert!(max > 240 && min < 15);
    }

    /// Reads confident left-to-right words only when the marker is top left. Upside
    /// down it returns lots of low-confidence junk; a quarter turn off it "reads"
    /// sideways text confidently, as Tesseract does.
    struct TurnBlindReader;
    impl OcrEngine for TurnBlindReader {
        fn name(&self) -> &'static str {
            "turn-blind"
        }
        fn recognize(&mut self, image: &GrayImage, _ppi: u32) -> Result<Vec<OcrWord>, OcrError> {
            let (w, h) = image.dimensions();
            let dark = |x: u32, y: u32| image.get_pixel(x, y).0[0] < 128;
            let (count, width, height, confidence) = if dark(5, 5) {
                (40, 60, 12, 0.9)
            } else if dark(w - 6, h - 6) {
                (200, 60, 12, 0.4)
            } else {
                (40, 12, 60, 0.95)
            };
            Ok((0..count).map(|i| OcrWord { text: "Wages".into(), left: 0, top: i * 14, width, height, confidence }).collect())
        }
    }

    #[test]
    fn turned_pages_are_read_upright() {
        let mut page = GrayImage::from_pixel(200, 300, Luma([255]));
        for x in 0..60 {
            for y in 0..60 {
                page.put_pixel(x, y, Luma([0]));
            }
        }
        for turned in [0u16, 90, 180, 270] {
            let photo = rotate(&page, (360 - turned) % 360);
            let reading = read_upright(&mut TurnBlindReader, &photo, 100).expect("reads");
            assert_eq!(reading.rotation, turned);
            assert_eq!(readable(&reading.words), 40);
        }
    }

    #[test]
    fn finds_the_skew_of_rotated_lines() {
        let mut page = GrayImage::from_pixel(600, 600, Luma([255]));
        for row in (60..540).step_by(30) {
            for x in 60..540 {
                for t in 0..4 {
                    page.put_pixel(x, row + t, Luma([0]));
                }
            }
        }
        let tilted = rotate_about_center(&page, 3.0f32.to_radians(), Interpolation::Bilinear, Border::Constant(Luma([255])));
        let skew = estimate_skew(&tilted);
        assert!((skew + 3.0).abs() <= 0.5, "estimated {skew}");
    }
}
