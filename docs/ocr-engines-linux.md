# OCR engines on linux 6.18.44-fc-v114 (x64, 4 cores)

Synthetic corpus (see docs/accuracy). Orientation for engines without word confidences (Windows OCR) is decided by Tesseract, then the native engine reads the page; that cost is included.

| Engine | Tier | Correct | Correct or flagged | Misfiled while auto | Auto-accepted | Issuer | Recipient | Pages/s |
|---|---|---|---|---|---|---|---|---|
| Tesseract 5 | scanned | 100.0% | 100.0% | 0.0% | 79.2% | 94.0% | 88.1% | 2.64 |
| Tesseract 5 | photo | 100.0% | 100.0% | 0.0% | 78.0% | 89.3% | 93.5% | 1.42 |
| Tesseract 5 | 100 mixed pages | | | | | | | 2.12 (47.1 s) |

No native engine is available on this system: Automatic uses Tesseract.
