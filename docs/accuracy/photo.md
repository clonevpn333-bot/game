# Accuracy: photo tier

Corpus: 168 files, 168 documents, 168 pages (seed 2026, synthetic-templates). Engine input: desktop ingest pipeline (PDFium, preprocessing, Tesseract 5 OCR) via binderready-ingest.

> These documents come from built-in synthetic layouts, not the official IRS PDFs (irs.gov was unreachable when this corpus was built). The numbers show the pipeline works end to end; they are not evidence of accuracy on real client documents. Regenerate with `generate --irs-dir` once the official PDFs are available.

| Metric | Result | Target |
|---|---|---|
| Correct or flagged for review | **100.0%** (168/168) | ≥ 95% ✅ |
| Correct (right split and form) | 100.0% | |
| Split accuracy | 100.0% | |
| Auto-accepted | 83.3% (140) | |
| **Misfiled while auto-accepted** | **0.0%** (0/140) | ≤ 0.5% ✅ |
| Duplicate detection | 100.0% (12/12), 0 false | |
| Password-protected / corrupt files reported | 0/0 | all |
| Tax year read correctly | 92.9% | |
| Issuer read correctly | 91.1% | |
| Recipient last name read correctly | 95.8% | |
| Pages per second (extraction + engine) | 1.6 | |
| Pages per second (engine only) | 507 | |

## Per form

| Form | Documents | Precision | Recall |
|---|---|---|---|
| 1095-a | 6 | 100.0% | 100.0% |
| 1095-b | 5 | 100.0% | 100.0% |
| 1095-c | 5 | 100.0% | 100.0% |
| 1098 | 5 | 100.0% | 100.0% |
| 1098-e | 7 | 100.0% | 100.0% |
| 1098-t | 6 | 100.0% | 100.0% |
| 1099-b | 6 | 100.0% | 100.0% |
| 1099-c | 5 | 100.0% | 100.0% |
| 1099-div | 5 | 100.0% | 100.0% |
| 1099-g | 5 | 100.0% | 100.0% |
| 1099-int | 5 | 100.0% | 100.0% |
| 1099-k | 6 | 100.0% | 100.0% |
| 1099-misc | 5 | 100.0% | 100.0% |
| 1099-nec | 5 | 100.0% | 100.0% |
| 1099-oid | 5 | 100.0% | 100.0% |
| 1099-q | 5 | 100.0% | 100.0% |
| 1099-r | 5 | 100.0% | 100.0% |
| 1099-s | 5 | 100.0% | 100.0% |
| 1099-sa | 5 | 100.0% | 100.0% |
| 5498 | 5 | 100.0% | 100.0% |
| 5498-sa | 5 | 100.0% | 100.0% |
| brokerage-consolidated | 5 | 100.0% | 100.0% |
| k-1-1041 | 5 | 100.0% | 100.0% |
| k-1-1065 | 5 | 100.0% | 100.0% |
| k-1-1120s | 5 | 100.0% | 100.0% |
| property-tax-statement | 5 | 100.0% | 100.0% |
| rrb-1099 | 5 | 100.0% | 100.0% |
| ssa-1099 | 5 | 100.0% | 100.0% |
| w-2 | 17 | 100.0% | 100.0% |
| w-2g | 5 | 100.0% | 100.0% |
