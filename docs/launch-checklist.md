# Launch checklist

Every item is either **done** (with where it was checked) or **assigned to Corey**. Nothing
here is "probably fine". Definition of done: BUILD_PROMPT.md §8.

## Done and verified

| Area      | What                                                                                                          | Evidence                                           |
| --------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Website   | Every route at 375/768/1440 in light and dark                                                                 | docs/screenshots/phase-1, `pnpm screenshots`       |
| Website   | Mobile Lighthouse, median of 3 per route                                                                      | docs/lighthouse/phase-1.md                         |
| Website   | Checkout opens the Lemon Squeezy overlay (stubbed in tests), falls back to the hosted page                    | apps/web/tests/site.spec.ts                        |
| Website   | Release build refuses to build with any business value missing                                                | `BINDERREADY_RELEASE=1 pnpm build`                 |
| Website   | Download buttons point at the newest published release (`DOWNLOAD_REPO`)                                      | site.spec.ts "download" test                       |
| Website   | /docs rewritten from the app's real labels, keys and flows                                                    | apps/web/app/docs                                  |
| Engine    | Clean, scanned and photo tiers: 100% correct, 0% misfiled while auto-accepted (Linux)                         | docs/accuracy                                      |
| Desktop   | Drop → review → export, keyboard review, binder bookmarks and index links checked page by page                | `pnpm e2e` (72 checks), docs/screenshots/phase-3–5 |
| Desktop   | 100 mixed pages in about 35 s on 4 cores (target 60 s); Windows 45 s, macOS 48 s                              | docs/accuracy, docs/ocr-engines.md                 |
| Desktop   | Binder sizes for 100 phone photos: Compact 5.9 MB, Balanced 18.9 MB, High 22.7 MB                             | docs/export-sizes.md                               |
| Desktop   | Missing documents from last year, duplicates, settings, delete history                                        | e2e, phase-5 screenshots                           |
| Desktop   | Trial: 3 client binders, gated in Rust before anything is written; the 4th is refused                         | e2e, license.rs tests                              |
| Desktop   | License activate / validate / deactivate against the documented API, offline-safe revalidation                | license.rs tests with a fake server                |
| Privacy   | One HTTP client, HTTPS to `api.lemonsqueezy.com` and `github.com` only, CSP kept identical by a test          | net.rs `allowlist_matches_csp`                     |
| Privacy   | Diagnostic report carries no names, paths, identifiers or key                                                 | diagnostics.rs test                                |
| Privacy   | Installers bundle no networking library besides the app's own (Tesseract built without libcurl)               | release.yml, vcpkg-overlay.ts                      |
| Licensing | Third-party notices for every Rust crate, npm package and native library; build fails on an unlisted library  | Settings → About, release-config.ts                |
| Packaging | Windows NSIS + MSI and macOS DMGs build in CI; the installed app starts without the build machine's libraries | release.yml                                        |
| Updates   | Install an old version, update from a GitHub release, restart into the new version with settings kept         | updater-e2e.yml                                    |

## Assigned to Corey

### Accounts and money

- [ ] **Lemon Squeezy store**: create the Solo ($149, 2 activations) and Firm ($299, 3 activations)
      products with license keys turned on and those activation limits.
- [ ] **Test mode check**: with a test-mode key, run Activate, Deactivate, and Activate on a second
      computer in a build that has the store variables set. The API calls are written from the
      official docs and tested against a fake server; they have not met the live API.
- [ ] **The Founders code**: create the discount in Lemon Squeezy (Solo at $99, limit 100
      redemptions), then set `FOUNDERS_ACTIVE=1` and `FOUNDERS_CODE` for the website build.
- [ ] Variables for the desktop build: `BINDERREADY_LS_STORE_ID`, `BINDERREADY_LS_PRODUCT_IDS`,
      `BINDERREADY_BUY_URL` (docs/release.md).
- [ ] Website values: `LEMON_SQUEEZY_SOLO_CHECKOUT_URL`, `LEMON_SQUEEZY_FIRM_CHECKOUT_URL`
      (apps/web/.env.example).

### Signing (costs are the vendors' list prices; check before buying)

- [ ] **Windows**: an Azure Trusted Signing account and certificate profile (identity validation
      takes days), then the six `AZURE_*` values. Unsigned installers trigger SmartScreen warnings.
- [ ] **macOS**: Apple Developer Program membership, a Developer ID Application certificate, and an
      app-specific password for notarization (`APPLE_*`). Without them, macOS refuses to open the
      downloaded app.
- [ ] **Updater key pair**: generate once (`tauri signer generate`), store the private key and
      password as secrets and the public key as a variable. Losing the private key means installed
      copies can't be updated; keep a backup outside GitHub.

### Domain, email, company

- [ ] Domain and static hosting for `apps/web/out` (any static host; `pnpm start` shows the
      expected brotli setup). Set `SITE_URL`.
- [ ] Support email inbox (`SUPPORT_EMAIL`), company legal name, address and governing state.
- [ ] `DOWNLOAD_REPO`: the GitHub repository whose releases carry the installers. It must be public,
      or downloads and updates won't reach customers.
- [ ] Trademark check on the product name. Renaming is one line on each side (`PRODUCT_NAME`,
      `productName`); a test keeps them equal.

### Legal review

- [ ] Terms, EULA, privacy policy and refund policy pages (drafted, not reviewed by a lawyer).
- [ ] Open-source obligations: libheif and libde265 are LGPL-3.0 (shipped as replaceable dynamic
      libraries, with notices); five Rust crates are MPL-2.0 (cssparser, cssparser-macros,
      dtoa-short, option-ext, selectors; unmodified); Visual C++ runtime DLLs are deployed next to
      the Windows app under the Visual Studio redistribution terms. Settings → About lists every
      component and bundles the full texts.
- [ ] Security overview PDF: re-read after the business values are set (`pnpm security:pdf`).

### Form data (release gate)

- [ ] `pnpm forms:verify --write` from a machine that can reach irs.gov and ssa.gov (or with
      `--pdf-dir` of downloaded official PDFs). Fix any reported pattern misses against the official
      text. No OMB numbers are recorded until then.
- [ ] Re-run the accuracy harness on official IRS fillable PDFs filled with fake data. Today's
      numbers come from synthetic templates and prove the pipeline, not real-world accuracy.

### First release

- [ ] Set the version in `tauri.conf.json` (and `Cargo.toml`, `package.json`), push tag `v<version>`,
      review the draft release, publish it.
- [ ] Download each installer from the website on a clean Windows PC and both kinds of Mac, and run
      the Definition of done once by hand.

## Known limitations (not blockers, recorded so nobody is surprised)

- macOS ships as two DMGs (Apple silicon, Intel), not one universal app.
- Photos of documents keep the table around the page; the binder shows the straightened photo
  without cropping to the page edge.
- The Windows and macOS text recognition engines are available in Settings but are not the default:
  they were less accurate than Tesseract in our tests (docs/ocr-engines.md).
- Testimonials stay hidden until `content/testimonials.json` has real, permitted quotes.
