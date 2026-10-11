//! Image files: format detection by content, decoding, EXIF orientation, and
//! multi-page TIFF expansion.

use crate::types::FileErrorKind;
use image::{DynamicImage, GrayImage, ImageFormat, Luma};
use std::io::Cursor;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Pdf,
    Jpeg,
    Png,
    Tiff,
    Heic,
}

/// Detects the format from the first bytes, never from the file name.
pub fn detect(bytes: &[u8]) -> Option<Kind> {
    if bytes.starts_with(b"%PDF") || bytes.get(..1024).is_some_and(|h| h.windows(5).any(|w| w == b"%PDF-")) {
        return Some(Kind::Pdf);
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some(Kind::Jpeg);
    }
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        return Some(Kind::Png);
    }
    if bytes.starts_with(b"II*\0") || bytes.starts_with(b"MM\0*") {
        return Some(Kind::Tiff);
    }
    if bytes.len() > 12 && &bytes[4..8] == b"ftyp" {
        let brand = &bytes[8..12];
        if [b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1", b"heim", b"heis"].iter().any(|b| brand == *b) {
            return Some(Kind::Heic);
        }
    }
    None
}

fn exif_orientation(bytes: &[u8]) -> u32 {
    exif::Reader::new()
        .read_from_container(&mut Cursor::new(bytes))
        .ok()
        .and_then(|e| e.get_field(exif::Tag::Orientation, exif::In::PRIMARY).and_then(|f| f.value.get_uint(0)))
        .unwrap_or(1)
}

fn apply_orientation(image: DynamicImage, orientation: u32) -> DynamicImage {
    match orientation {
        2 => image.fliph(),
        3 => image.rotate180(),
        4 => image.flipv(),
        5 => image.rotate90().fliph(),
        6 => image.rotate90(),
        7 => image.rotate270().fliph(),
        8 => image.rotate270(),
        _ => image,
    }
}

fn decode_tiff(bytes: &[u8]) -> Result<Vec<GrayImage>, FileErrorKind> {
    use tiff::decoder::{Decoder, DecodingResult};
    use tiff::ColorType;
    let mut decoder = Decoder::new(Cursor::new(bytes)).map_err(|_| FileErrorKind::Corrupt)?;
    let mut pages = Vec::new();
    loop {
        let (w, h) = decoder.dimensions().map_err(|_| FileErrorKind::Corrupt)?;
        let color = decoder.colortype().map_err(|_| FileErrorKind::Corrupt)?;
        let data = decoder.read_image().map_err(|_| FileErrorKind::Corrupt)?;
        let DecodingResult::U8(buf) = data else { return Err(FileErrorKind::Unsupported) };
        let page = match color {
            ColorType::Gray(8) => GrayImage::from_raw(w, h, buf),
            ColorType::Gray(1) => {
                // Bilevel fax scans: one bit per pixel, rows padded to whole bytes.
                let stride = w.div_ceil(8) as usize;
                Some(GrayImage::from_fn(w, h, |x, y| {
                    let byte = buf[y as usize * stride + (x / 8) as usize];
                    Luma([if byte & (0x80 >> (x % 8)) != 0 { 255 } else { 0 }])
                }))
            }
            ColorType::RGB(8) => image::RgbImage::from_raw(w, h, buf).map(|i| DynamicImage::ImageRgb8(i).to_luma8()),
            ColorType::RGBA(8) => image::RgbaImage::from_raw(w, h, buf).map(|i| DynamicImage::ImageRgba8(i).to_luma8()),
            _ => return Err(FileErrorKind::Unsupported),
        }
        .ok_or(FileErrorKind::Corrupt)?;
        pages.push(page);
        if !decoder.more_images() {
            break;
        }
        decoder.next_image().map_err(|_| FileErrorKind::Corrupt)?;
    }
    Ok(pages)
}

fn decode_heic(bytes: &[u8]) -> Result<GrayImage, FileErrorKind> {
    use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};
    let lib = LibHeif::new();
    let ctx = HeifContext::read_from_bytes(bytes).map_err(|_| FileErrorKind::Corrupt)?;
    let handle = ctx.primary_image_handle().map_err(|_| FileErrorKind::Corrupt)?;
    // libheif applies the file's rotation and mirroring while decoding.
    let image = lib.decode(&handle, ColorSpace::Rgb(RgbChroma::Rgb), None).map_err(|_| FileErrorKind::Corrupt)?;
    let plane = image.planes().interleaved.ok_or(FileErrorKind::Corrupt)?;
    let (w, h, stride) = (plane.width, plane.height, plane.stride);
    let mut rgb = image::RgbImage::new(w, h);
    for y in 0..h {
        let row = &plane.data[y as usize * stride..y as usize * stride + w as usize * 3];
        for x in 0..w {
            let i = x as usize * 3;
            rgb.put_pixel(x, y, image::Rgb([row[i], row[i + 1], row[i + 2]]));
        }
    }
    Ok(DynamicImage::ImageRgb8(rgb).to_luma8())
}

/// Every page of an image file as an upright grayscale image.
pub fn decode_pages(kind: Kind, bytes: &[u8]) -> Result<Vec<GrayImage>, FileErrorKind> {
    match kind {
        Kind::Jpeg | Kind::Png => {
            let format = if kind == Kind::Jpeg { ImageFormat::Jpeg } else { ImageFormat::Png };
            let image = image::load_from_memory_with_format(bytes, format).map_err(|_| FileErrorKind::Corrupt)?;
            Ok(vec![apply_orientation(image, exif_orientation(bytes)).to_luma8()])
        }
        Kind::Tiff => decode_tiff(bytes),
        Kind::Heic => Ok(vec![decode_heic(bytes)?]),
        Kind::Pdf => Err(FileErrorKind::Unsupported),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_formats_by_content() {
        assert_eq!(detect(b"%PDF-1.7\n"), Some(Kind::Pdf));
        assert_eq!(detect(&[0xFF, 0xD8, 0xFF, 0xE0]), Some(Kind::Jpeg));
        assert_eq!(detect(b"\x89PNG\r\n\x1a\n"), Some(Kind::Png));
        assert_eq!(detect(b"\0\0\0\x18ftypheic\0\0\0\0"), Some(Kind::Heic));
        assert_eq!(detect(b"hello"), None);
    }

    #[test]
    fn rotates_by_exif_orientation() {
        let image = DynamicImage::ImageLuma8(GrayImage::new(40, 20));
        assert_eq!(apply_orientation(image.clone(), 6).width(), 20);
        assert_eq!(apply_orientation(image, 1).width(), 40);
    }

    #[test]
    fn expands_multi_page_tiff() {
        use tiff::encoder::{TiffEncoder, colortype};
        let mut buf = Cursor::new(Vec::new());
        {
            let mut encoder = TiffEncoder::new(&mut buf).expect("encoder");
            for shade in [10u8, 200u8] {
                encoder.write_image::<colortype::Gray8>(8, 4, &[shade; 32]).expect("page");
            }
        }
        let pages = decode_pages(Kind::Tiff, buf.get_ref()).expect("decode");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[1].get_pixel(0, 0).0[0], 200);
    }
}
