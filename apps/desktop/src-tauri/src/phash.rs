//! dHash: 9×8 grayscale cells, one bit per horizontal neighbour comparison.
//! Same algorithm as `packages/corpus/src/extract.ts` so hashes compare across tools.

use image::GrayImage;

pub fn dhash(image: &GrayImage) -> String {
    let (width, height) = image.dimensions();
    let (cols, rows) = (9u32, 8u32);
    let cell = |cx: u32, cy: u32| -> f64 {
        let x0 = cx * width / cols;
        let x1 = ((cx + 1) * width / cols).max(x0 + 1);
        let y0 = cy * height / rows;
        let y1 = ((cy + 1) * height / rows).max(y0 + 1);
        let mut sum = 0u64;
        for y in y0..y1.min(height) {
            for x in x0..x1.min(width) {
                sum += u64::from(image.get_pixel(x, y).0[0]);
            }
        }
        sum as f64 / f64::from((x1 - x0) * (y1 - y0))
    };
    let mut bits = 0u64;
    for y in 0..rows {
        for x in 0..cols - 1 {
            bits <<= 1;
            if cell(x, y) > cell(x + 1, y) {
                bits |= 1;
            }
        }
    }
    format!("{bits:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Luma;

    #[test]
    fn distinguishes_mirror_images_and_is_stable() {
        let left = GrayImage::from_fn(36, 32, |x, _| Luma([if x < 18 { 0 } else { 255 }]));
        let right = GrayImage::from_fn(36, 32, |x, _| Luma([if x < 18 { 255 } else { 0 }]));
        assert_eq!(dhash(&left), dhash(&left));
        assert_ne!(dhash(&left), dhash(&right));
        assert_eq!(dhash(&left).len(), 16);
    }
}
