# OCR engines: Tesseract vs. the operating system's own

Measured by `.github/workflows/ocr-engines.yml` (`packages/corpus/src/compare-engines.ts`) on
GitHub-hosted runners, 2026-10-11, commit cf412ab. Synthetic scanned and photo tiers (see
`docs/accuracy`) and the 100-page mixed benchmark. Windows OCR reports no word confidences, so
Tesseract decides page orientation and Windows OCR reads the page; that cost is included.

## macOS 26 (Apple Silicon runner, 3 cores) — Tesseract 5 from Homebrew vs. Apple Vision

| Engine       | Tier            | Correct | Correct or flagged | Misfiled while auto | Auto-accepted | Issuer | Recipient | Pages/s        |
| ------------ | --------------- | ------- | ------------------ | ------------------- | ------------- | ------ | --------- | -------------- |
| Tesseract 5  | scanned         | 99.4%   | 100.0%             | 0.7%                | 83.9%         | 89.8%  | 86.8%     | 2.36           |
| Tesseract 5  | photo           | 100.0%  | 100.0%             | 0.0%                | 85.7%         | 90.5%  | 94.0%     | 1.32           |
| Tesseract 5  | 100 mixed pages |         |                    |                     |               |        |           | 2.07 (48.4 s)  |
| Apple Vision | scanned         | 94.6%   | 98.2%              | 1.3%                | 90.5%         | 96.3%  | 96.3%     | 0.57           |
| Apple Vision | photo           | 80.4%   | 100.0%             | 0.0%                | 72.0%         | 75.6%  | 78.0%     | 0.48           |
| Apple Vision | 100 mixed pages |         |                    |                     |               |        |           | 0.82 (122.0 s) |

## Windows Server 2025 (x64 runner, 4 cores) — Tesseract 5 from vcpkg vs. Windows.Media.Ocr

| Engine            | Tier            | Correct | Correct or flagged | Misfiled while auto | Auto-accepted | Issuer | Recipient | Pages/s       |
| ----------------- | --------------- | ------- | ------------------ | ------------------- | ------------- | ------ | --------- | ------------- |
| Tesseract 5       | scanned         | 99.4%   | 100.0%             | 0.7%                | 83.9%         | 89.8%  | 86.8%     | 2.30          |
| Tesseract 5       | photo           | 100.0%  | 100.0%             | 0.0%                | 85.7%         | 90.5%  | 94.0%     | 1.27          |
| Tesseract 5       | 100 mixed pages |         |                    |                     |               |        |           | 2.21 (45.3 s) |
| Windows.Media.Ocr | scanned         | 86.9%   | 100.0%             | 8.5%                | 56.0%         | 65.8%  | 66.4%     | 1.94          |
| Windows.Media.Ocr | photo           | 100.0%  | 100.0%             | 0.0%                | 78.0%         | 80.4%  | 87.5%     | 1.13          |
| Windows.Media.Ocr | 100 mixed pages |         |                    |                     |               |        |           | 1.96 (51.1 s) |

## Decision

**Automatic uses Tesseract on both platforms** (`AUTOMATIC_PREFERS_NATIVE = false`). Each native
engine is less accurate on the scanned tier and slower end to end. Windows OCR is the riskier of
the two: without word confidences, wrong documents get auto-accepted (8.5% misfiled while
auto-accepted). Both remain available as a manual choice in Settings, which states these results.

Both platforms meet the speed target with Tesseract: 100 mixed pages in 48.4 s (macOS, 3 cores)
and 45.3 s (Windows, 4 cores), against 60 s.

**Open:** the newer Tesseract builds on macOS and Windows misfile one auto-accepted scanned
document (0.7%, target ≤ 0.5%), where Linux's Tesseract 5.3.4 misfiles none. The comparison now
logs every miss so the document can be identified and the rule fixed.
