//! The firm logo printed on binder covers: a PNG or SVG the preparer picks,
//! normalized to one PNG in the app data folder.

use image::{ImageFormat, imageops::FilterType};
use resvg::{tiny_skia, usvg};

/// File name inside the app data folder.
pub const LOGO_FILE: &str = "firm-logo.png";
/// Logos are stored at most this many pixels on the long side (sharp on a printed cover).
pub const MAX_SIDE: u32 = 1200;

/// PNG bytes for the cover, from a PNG or SVG file.
pub fn normalize(bytes: &[u8], svg: bool) -> Result<Vec<u8>, String> {
    if svg {
        return render_svg(bytes);
    }
    let image = image::load_from_memory_with_format(bytes, ImageFormat::Png).map_err(|_| "This isn’t a PNG image.".to_string())?;
    let image = if image.width().max(image.height()) > MAX_SIDE { image.resize(MAX_SIDE, MAX_SIDE, FilterType::Lanczos3) } else { image };
    let mut out = std::io::Cursor::new(Vec::new());
    image.write_to(&mut out, ImageFormat::Png).map_err(|e| e.to_string())?;
    Ok(out.into_inner())
}

fn render_svg(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let mut options = usvg::Options::default();
    options.fontdb_mut().load_system_fonts();
    let tree = usvg::Tree::from_data(bytes, &options).map_err(|_| "This SVG file couldn’t be read.".to_string())?;
    let size = tree.size();
    let scale = MAX_SIDE as f32 / size.width().max(size.height());
    let (w, h) = ((size.width() * scale).round().max(1.0) as u32, (size.height() * scale).round().max(1.0) as u32);
    let mut pixmap = tiny_skia::Pixmap::new(w, h).ok_or("This SVG has no size.")?;
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    pixmap.encode_png().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_an_svg_logo_to_a_png() {
        let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#111"/></svg>"##;
        let png = normalize(svg, true).expect("render");
        let image = image::load_from_memory(&png).expect("png");
        assert_eq!((image.width(), image.height()), (MAX_SIDE, MAX_SIDE / 2));
    }

    #[test]
    fn shrinks_large_pngs_and_rejects_other_files() {
        let big = image::RgbaImage::from_pixel(3000, 1000, image::Rgba([0, 0, 0, 255]));
        let mut bytes = std::io::Cursor::new(Vec::new());
        big.write_to(&mut bytes, ImageFormat::Png).expect("encode");
        let png = normalize(bytes.get_ref(), false).expect("normalize");
        assert_eq!(image::load_from_memory(&png).expect("png").width(), MAX_SIDE);
        assert!(normalize(b"not an image", false).is_err());
        assert!(normalize(b"<svg", true).is_err());
    }
}
