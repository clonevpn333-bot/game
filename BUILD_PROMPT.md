# BinderReady — Master Build Prompt for Claude Code

> **How to use:** Put this file in an empty folder as `BUILD_PROMPT.md`, open Claude Code in that folder, and say:
> *"Read BUILD_PROMPT.md fully, then execute Phase 0 only. Stop at the gate and report."*
> Then run one phase per prompt. Phases must pass their gate before moving on.

---

## 0. Your role and non-negotiable rules

You are a senior product engineer and product designer building **BinderReady**, a paid, local-first desktop app for tax preparers plus the marketing and checkout website that sells it. You are building a real product that people will pay $149 for, so the quality bar is "would a skeptical professional trust this with client files."

**Anti-stub rules (strict):**
- No `TODO`, `FIXME`, "implement later", placeholder functions, fake progress bars, hardcoded demo results, or mocked data paths in shipped code.
- Every button, menu item, and setting you render must work end to end. If you can't make something work, don't render it.
- No lorem ipsum. Use the real copy in this document, or write real copy in the same voice.
- If something genuinely cannot be completed (for example, a code-signing certificate or an account only Corey can create), implement everything up to that boundary. Make the missing value configurable through an env var or config file, and list it under **"Needs Corey"** in your phase report.
- Never claim a feature works without running it. "It should work" is not acceptable. Show test output or screenshots.

**Working style:**
- Prefer targeted, minimal edits (`str_replace`-style) over rewriting whole files.
- After every meaningful change: typecheck (`tsc --noEmit`), lint, and run the relevant tests. For Rust: `cargo check` and `cargo clippy -- -D warnings`.
- Use Playwright (Chromium) for visual verification of the website and the desktop app's web UI. Take screenshots at 375px, 768px and 1440px widths, in both light and dark themes, and inspect them yourself before reporting.
- Create and maintain a `CLAUDE.md` at the repo root. It should cover conventions, commands, architecture notes, and decisions made, so future sessions start with context.
- Address the developer as **Corey** in reports.
- The developer machine is an **Apple Silicon MacBook (M4)**. The primary customer platform is **Windows 10/11 x64**. Corey also has a Windows PC for testing. CI builds both platforms.

**Phase report format (end of every phase):**
1. What was built, as a short list.
2. Gate results, with actual command output summaries and screenshot paths.
3. Decisions you made and why (one line each).
4. **Needs Corey:** accounts, keys, or decisions required, with exact steps.
5. Known limitations, stated honestly.

---

## 1. Product context

**BinderReady** turns a client's messy pile of tax documents into one perfectly ordered, bookmarked PDF binder, in seconds, entirely on the user's computer.

- **Buyer:** Solo and small-firm US tax preparers: enrolled agents, storefront and seasonal preparers, and small CPA firms (1–5 people). Most use Drake, TaxSlayer Pro, ProSeries and similar software, and do not pay for an all-in-one practice-management platform.
- **Pain:** Clients send phone photos named `IMG_5678.HEIC`, multi-document scans, duplicates, and sideways pages. Sorting, renaming and combining them eats hours every tax season.
- **Core promise:** Client docs in, binder ready. Nothing leaves your computer.
- **Business model:** One-time license, not a subscription.
  - Free trial: full features, up to 3 client binders.
  - Solo: $149, 2 activations.
  - Firm: $299, 3 activations.
  - Founders: $99 Solo price via a limited-use discount code.

**Honesty and legal constraints (apply to the site, the app UI, and all copy):**
- Never claim "IRS-approved", "compliant", "certified", "guaranteed accurate", or "secure" as an absolute.
- Allowed phrasing: "runs locally", "client files are never uploaded", "works offline", "helps you keep client files off third-party servers".
- Never name competitors on the site. Comparisons are generic ("per-return organizing services", "cloud upload tools").
- No fake testimonials, fake customer logos, fake user counts, or fake scarcity timers. The testimonial component exists but only renders when real entries exist in `content/testimonials.json` (ships empty).
- BinderReady is not tax advice and does not prepare returns. Say so in the FAQ and Terms.
- Product name lives in one config value (`PRODUCT_NAME`), because the trademark check is pending and renaming must be a one-line change.

---

## 2. Shared design system: "Steel"

Inspiration is the **feeling** of Vercel's design: monochrome, precise, engineered, premium, quiet confidence. Do **not** copy Vercel's logo, triangle mark, exact page layouts, illustrations or copy. Create an original look that lives in the same family.

### Principles
- The product UI is the hero. No stock photos, no people, no emoji, no clip-art illustrations.
- Monochrome first. Color is reserved for meaning: success, warning, needs-review.
- Hairline precision: 1px borders, tight grids, aligned edges, generous whitespace.
- Motion is fast and purposeful (150–220ms, ease-out). No bounces. Always respect `prefers-reduced-motion`.
- Dark theme is the showcase default for the website hero. Both themes must be fully polished.

### Tokens
Put these in `packages/design/tokens.css` as CSS variables and export a Tailwind preset. Both apps consume the same package.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#000000` |
| `--bg-subtle` | `#fafafa` | `#0a0a0a` |
| `--surface` | `#ffffff` | `#111111` |
| `--fg` | `#0a0a0a` | `#ededed` |
| `--fg-muted` | `#666666` | `#a1a1a1` |
| `--fg-subtle` | `#8f8f8f` | `#6b6b6b` |
| `--border` | `#eaeaea` | `#1f1f1f` |
| `--border-strong` | `#d4d4d4` | `#333333` |
| `--success` | `#15803d` | `#22c55e` |
| `--warning` | `#b45309` | `#f59e0b` |
| `--danger` | `#b91c1c` | `#ef4444` |
| `--focus` | `#0a0a0a` | `#ededed` |

- **Steel gradient** (headline accent text only, used sparingly): light theme `linear-gradient(180deg, #0a0a0a 0%, #555 100%)`, dark theme `linear-gradient(180deg, #ffffff 0%, #8a8a8a 100%)`, applied with `background-clip: text`.
- **Type:** Geist Sans and Geist Mono (the `geist` npm package, OFL license).
  - Display: 64–76px desktop / 40px mobile, weight 600, letter-spacing −0.045em, line-height 1.02.
  - H2: 40px / 30px mobile, −0.035em.
  - Body: 16px / 1.6.
  - Small mono labels: 12px uppercase Geist Mono, letter-spacing 0.06em, `--fg-subtle`. Use these as section eyebrows, e.g. `01 — HOW IT WORKS`.
- **Radius:** 6px for controls, 10px for cards, 14px for large panels.
- **Buttons:**
  - Primary: inverted (`--fg` background, `--bg` text), 40px tall, 14px medium text.
  - Secondary: transparent with a `--border-strong` 1px border.
  - Hover: subtle background shift. Focus: 2px `--focus` ring with 2px offset.
- **Grid motif:** Sections are separated by 1px full-bleed lines. Use small `+` crosshair marks at key grid intersections, and a faint dotted or line grid behind the hero that fades out with a radial mask.
- **Glow:** One soft radial highlight behind the hero product shot (white at ~6% opacity in dark mode). Nowhere else.
- **Icons:** `lucide-react`, 16px, stroke 1.5.

---

## 3. Repository structure

pnpm workspaces + Turborepo, TypeScript strict everywhere.

```
/apps/web          Next.js (App Router) marketing + checkout site, static export
/apps/desktop      Tauri 2 app (React + TS frontend, Rust backend)
/packages/design   tokens.css, Tailwind preset, shared UI primitives (Button, Badge, Kbd, Card)
/packages/engine   Pure TypeScript: form definitions, classifier, splitter, naming, binder ordering
/packages/corpus   Synthetic test-document generator + accuracy harness
/CLAUDE.md
/BUILD_PROMPT.md
```

- `packages/engine` must be pure and deterministic: OCR text and page metadata in, decisions out. That makes it fully unit-testable in Node with Vitest.
- Heavy native work (PDF rasterization, OCR, HEIC decode, file IO) lives in Rust (Tauri commands).
- PDF binder assembly uses `pdf-lib` in TypeScript, including outlines (bookmarks) and internal link annotations.

---

## 4. Part A: The website (`apps/web`)

### Stack
- Next.js App Router with `output: 'export'` (fully static, no server cost). Deployable to Netlify or Vercel with zero config changes.
- Tailwind with the shared preset.
- `motion` (Framer Motion) for the hero animation only.
- MDX for docs and changelog.
- Lemon Squeezy overlay checkout (`lemon.js`) for purchases. Lemon Squeezy is the merchant of record, handles sales tax, and emails license keys.
- **Site config:** All of these live in one file, `apps/web/site.config.ts`: product name, prices, checkout URLs, the Founders discount code, support email, company legal name, download URLs.

### Pages
| Route | Purpose |
|---|---|
| `/` | Home (sections below) |
| `/pricing` | Pricing table, license FAQ, refund policy summary |
| `/security` | Honest one-page explanation of what runs locally and the only network calls. Printable and downloadable as PDF, so preparers can attach it to their written security plan |
| `/download` | Detects the OS. Primary button for Windows, secondary for macOS. System requirements, trial explanation |
| `/docs` | Getting started, supported forms, review shortcuts, binder templates, troubleshooting, license activation |
| `/changelog` | MDX entries |
| `/thanks` | Post-purchase: "Check your email for your license key", plus a 3-step activation guide |
| `/legal/terms`, `/legal/privacy`, `/legal/refunds`, `/legal/eula` | Full drafted legal pages with a visible "Last updated" date. List them under Needs Corey for professional review |

### Home page sections, in order

1. **Nav** (sticky, blurred translucent background, 1px bottom border on scroll)
   - Left: wordmark (an original, simple geometric mark plus the name in Geist Sans semibold).
   - Center: Product, Security, Pricing, Docs.
   - Right: theme toggle, "Download" (secondary), "Buy" (primary).

2. **Hero**
   - Eyebrow (mono): `LOCAL-FIRST TAX DOCUMENT ORGANIZER`
   - Headline: **"The shoebox, sorted."** Put "sorted." in the steel gradient.
   - Subhead: "Drop in a client's messy pile of tax documents. Get one bookmarked, perfectly ordered PDF binder in seconds. Everything runs on your computer."
   - CTAs: **Download free trial** (primary) · **Buy for $149, once** (secondary)
   - Microcopy under the CTAs (mono, subtle): `Windows & macOS · Works offline · No subscription`
   - **Hero visual (the showpiece):** an interactive animation inside a realistic app-window frame (title bar with three neutral dots).
     - It starts as ~18 scattered, slightly rotated file cards with realistic messy names: `IMG_5678.HEIC`, `scan0003.pdf`, `W2 maybe.jpg`, `IMG_5679.HEIC`, `Document (4).pdf`, `bank thing.png`, `1099 stuff.pdf`, and so on.
     - After 1.2s, or on a click of a "Sort" button inside the frame, the cards fly into labeled category stacks (Wages, Interest & Dividends, Retirement, Health, Education, Mortgage & Property, Needs review).
     - Each card's name morphs into its clean name, e.g. `2026 W-2 – Northwind Logistics – Sample`.
     - The stacks then compress into a single binder card showing a bookmark tree and the line "1 binder · 23 documents · 41 pages".
     - A "Replay" control resets it.
     - All names are obviously fake. Reduced-motion users see the final state.

3. **Works-with strip**
   - One line: "Works alongside any tax software. It outputs standard, bookmarked PDFs."
   - No logos.

4. **How it works** (`01 — HOW IT WORKS`), three steps in bordered cells with mono numerals:
   - **01 Drop** — "Drag in PDFs, scans, and phone photos. Multi-document scans get split automatically."
   - **02 Review** — "BinderReady recognizes each form, names it, and flags anything it isn't sure about. Fix anything in one keystroke."
   - **03 Export** — "One binder with a cover page, a clickable index, and bookmarks, in your firm's order."

5. **Feature bento grid** (`02 — WHAT IT DOES`), six cells, each with a small live UI fragment rather than an icon blob:
   - **Recognizes the forms that matter.** W-2, the 1099 family, 1098s, 1095s, K-1s, SSA-1099 and more.
   - **Splits multi-document scans.** One 30-page scan becomes the 9 documents it actually contains.
   - **Names everything consistently.** `2026 1099-DIV – Issuer – Client`, using your naming template.
   - **Catches what's missing.** "Last year this client had a 1099-DIV from Sample Brokerage. It hasn't arrived." This is the hero feature cell and spans 2 columns.
   - **Finds duplicates.** The same W-2 sent twice gets flagged, not filed twice.
   - **Your firm, your binder.** Firm logo on the cover page, with category order you control.

6. **Privacy panel** (`03 — PRIVACY`). A full-width dark panel, even in light theme.
   - Headline: **"Nothing leaves this computer."**
   - Body: "BinderReady reads, recognizes and assembles documents entirely on your machine. There's no account and no cloud processing, and client files are never uploaded. The app's own security policy blocks every network request except two."
   - List of the only two network calls:
     1. License activation (sends your license key and a device name).
     2. Update check (can be turned off in Settings).
   - Link: "Read the security overview →"

7. **ROI calculator** (`04 — THE MATH`)
   - Slider: returns per season (50–1,000, default 300).
   - Editable field: "Per-return cost of an organizing service" (default $5).
   - Live output: "This season: $1,500 vs. $149 once. BinderReady pays for itself after 30 returns."
   - Number transitions animate subtly, in tabular mono figures.

8. **Pricing** (`05 — PRICING`), three cards:
   - **Trial** — Free. Full features, 3 client binders, trial note on cover pages.
   - **Solo** — $149 once. 2 computers, all features, free updates for version 1.x. Marked "Most popular" with a subtle border emphasis.
   - **Firm** — $299 once. 3 computers, all features, free updates for version 1.x.
   - If the Founders code is active in the config, show a quiet banner: "Founders pricing: Solo is $99 with code FOUNDERS for the first 100 licenses." The limit is enforced by Lemon Squeezy, not faked on the site.
   - Below the cards: "14-day refund, no questions asked. Not a subscription. Ever."

9. **FAQ** (accordion, smooth height animation). Write full answers for:
   - Do my clients' documents leave my computer?
   - Which tax software does it work with?
   - Which forms does it recognize?
   - What happens when it isn't sure?
   - Does it work on scanned paper and phone photos?
   - Windows or Mac?
   - Is this a subscription?
   - What does "free updates for 1.x" mean?
   - Can my whole office use one license?
   - What's your refund policy?
   - Is this tax advice?

10. **Final CTA band:** "Get your evenings back this tax season." with both buttons.

11. **Footer:** product links, docs, legal links, support email, `© {year} {company}`, and a theme toggle.

### Website quality gates
- Lighthouse (mobile) ≥ 95 for Performance, Accessibility, Best Practices and SEO.
- LCP < 1.8s on simulated mobile.
- No layout shift from fonts (use `next/font` with Geist).
- WCAG AA contrast in both themes. Full keyboard navigation with visible focus. The accordion and theme toggle are accessible.
- SEO: meta tags, an Open Graph image (a designed 1200×630 PNG of the binder visual), `sitemap.xml`, `robots.txt`, and JSON-LD `SoftwareApplication` with offers.
- Checkout opens the Lemon Squeezy overlay with the correct product variant. Checkout URLs come from env/config, and you document exactly where Corey gets them.
- Playwright screenshots at 375, 768 and 1440 widths, in both themes, for every page. Fix anything misaligned, cramped or overflowing before reporting.

---

## 5. Part B: The desktop app (`apps/desktop`)

### Stack
- Tauri 2 (Rust backend), React + TypeScript + Tailwind frontend, the shared design package, and Zustand for state.
- **PDF rendering and text-layer extraction:** `pdfium-render` (bundle the PDFium binaries per platform).
- **PDF assembly:** `pdf-lib`.
- **OCR:** behind a Rust trait `OcrEngine` with three implementations:
  1. Tesseract (bundled, English tessdata), the cross-platform baseline, built first.
  2. Windows.Media.Ocr via the `windows` crate.
  3. Apple Vision (`VNRecognizeTextRequest`) via `objc2`.

  The accuracy harness picks the default engine per platform by measured accuracy.
- **HEIC decode:** `libheif` (bundled) in Rust.
- **Local storage:** SQLite (`rusqlite`) in the app data directory, holding settings, the client list, and the missing-docs index. It never stores document images, OCR text, SSNs or dollar amounts.
- **License storage:** the OS keychain via the `keyring` crate.

### App layout (Vercel-dashboard feel: calm, monochrome, keyboard-first)
- **Window:** minimum size 1100×720, custom title bar, and a sidebar 240px wide with these sections:
  - Clients
  - Recent binders
  - Settings
  - License status pill at the bottom
- **⌘K / Ctrl+K command palette:** new binder, open client, export, toggle theme, and open settings.
- **Empty state:** a large dashed drop zone with "Drop a client's documents here", with supported types listed in mono below it.

### Core flow
1. **New binder:** choose an existing client or create one (display name + tax year), then drop files or folders. Accepted: PDF, JPG/JPEG, PNG, HEIC/HEIF, TIFF (multi-page).
2. **Processing view:** a live per-file list with real stage chips (Reading → Splitting → Recognizing → Done), a real overall progress bar driven by actual work, and pages-per-second shown in mono. The UI never blocks; work runs on Rust worker threads with progress events.
3. **Review board:** documents grouped by binder category. Each card shows the first-page thumbnail, the proposed name, the form type, and a confidence indicator:
   - High confidence: no badge, just quiet.
   - "Check": amber dot.
   - "Needs review": red dot. These cards sit in their own group at the top.

   Keyboard shortcuts (always shown in a footer with `Kbd` components):

   | Key | Action |
   |---|---|
   | `J` / `K` | Next / previous document |
   | `Enter` | Accept |
   | `1`–`9` | Reassign category |
   | `T` | Change form type (searchable popover) |
   | `E` | Edit name |
   | `R` | Rotate page |
   | `S` | Split document at the current page |
   | `M` | Merge with previous document |
   | `D` | Mark duplicate / remove |
   | `Space` | Open large preview |

   Clicking a document opens a page strip so the user can split, merge, reorder and rotate pages. A right-hand panel shows **Missing from last year** when the client has history.
4. **Export dialog:**
   - Binder order template (default or custom; drag to reorder categories)
   - Include cover page and include index (both on by default)
   - Also export individual renamed files (off by default)
   - File-name template
   - Output folder (remembered per client)
   - Image quality preset (Balanced is the default)

   After export: a success toast with "Show in Finder/Explorer" and "Copy missing-docs list".

### Processing pipeline (implement fully)
1. **Ingest**
   - SHA-256 every file to catch exact duplicates.
   - Decode HEIC, apply EXIF orientation, and expand multi-page TIFFs.
   - For PDFs, extract the embedded text layer first. If a page has a usable text layer (enough characters, sane words), skip OCR for that page. This makes digital PDFs fast and exact.
2. **Preprocess** (image pages only)
   - Rasterize at 300 DPI for OCR.
   - Deskew.
   - Detect 90/180/270 rotation by comparing OCR confidence on a downscaled pass.
   - Normalize contrast.
   - Keep a 150 DPI JPEG for display and export.
3. **OCR** with word bounding boxes and confidences, so the engine can reason about regions (header area, labeled boxes).
4. **Split (page grouping).** A new document starts when the header region contains a form title or OMB number, or when the form type changes. Pages continue a document on "Page X of Y", continuation markers, or a matching account number or issuer.
   - Brokerage consolidated statements stay together as one document.
   - **Multi-copy pages are one document:** a single page showing W-2 Copies B, C and 2 is one W-2. Also detect separately scanned copies of the same form/issuer/year and treat the extras as duplicates.
5. **Classify** using the data-driven rules in `packages/engine/forms.json`. Each page collects weighted signals:
   - Exact OMB number match: strong.
   - Form title regex in the header region: strong.
   - Distinctive box labels: medium.
   - Keywords: weak.
   - Original filename hints: weak.

   Signals combine into a calibrated confidence score:
   - ≥ 0.90: auto-accepted.
   - 0.60–0.90: "Check".
   - < 0.60: "Needs review" under Other.

   The engine must **never** auto-accept when two form types score within a close margin. In that case it flags "Check" and shows both options.
6. **Extract naming fields only:**
   - Tax year
   - Issuer, payer or employer name (read from the region near the labeled box)
   - Recipient last name

   Do not extract or store SSNs, TINs, account numbers or amounts. If logging is enabled in dev, mask any 9-digit SSN/TIN pattern. Production builds never log OCR text.
7. **Duplicates:** exact matches by hash. Near-duplicates are flagged when the perceptual hash of the first page, the form type, the issuer and the year all match.
8. **Assemble the binder** with `pdf-lib`:
   - **Cover page:** firm logo (optional), firm name, client display name, tax year, generated date, document and page counts. In trial mode, add a subtle footer: "Created with BinderReady trial".
   - **Index page(s):** every document grouped by category, each line a clickable internal link to its first page, with page numbers.
   - **PDF outline (bookmarks):** nested Category → Document.
   - PDF metadata title set to `"{Client} – {Tax Year} Binder"`.
   - Images embedded as JPEG at the chosen quality.
   - A 100-page binder of phone photos should stay under ~25 MB on the Balanced preset.

### Default binder order
1. Client organizer / engagement documents
2. Wages (W-2, W-2G)
3. Interest & dividends (1099-INT, 1099-OID, 1099-DIV)
4. Brokerage (1099-B, consolidated statements)
5. Retirement & Social Security (1099-R, SSA-1099, RRB-1099, 5498)
6. Self-employment & other income (1099-NEC, 1099-MISC, 1099-K, 1099-G)
7. Health (1095-A, 1095-B, 1095-C, 1099-SA, 5498-SA)
8. Education (1098-T, 1098-E, 1099-Q)
9. Mortgage & property (1098, property tax statements, 1099-S)
10. Pass-through (Schedule K-1: 1065, 1120-S, 1041)
11. Debt & other (1099-C)
12. Other / unrecognized

### `forms.json` (critical: verify, never guess)
For each form in the MVP list, create an entry with:
- `id`
- `displayName`
- `category`
- `ombNumbers[]`
- `titlePatterns[]` (regex)
- `boxLabelPatterns[]`
- `keywords[]`
- `issuerFieldLabels[]`
- `yearPatterns[]`
- `multiPage` (boolean)
- `source` (URL)
- `verifiedOn` (date)

**Research step:** Download the current official PDFs from irs.gov, and from ssa.gov for SSA-1099. Read the OMB numbers and exact titles from the actual documents, and record the source URL and date. If a form has no OMB number, rely on title and box-label rules. **Do not write an OMB number from memory.** If you can't verify one, omit it and note that in the report.

**MVP form list:**
- W-2, W-2G
- 1099-INT, 1099-OID, 1099-DIV, 1099-B, 1099-R, 1099-NEC, 1099-MISC, 1099-K, 1099-G, 1099-SA, 1099-Q, 1099-S, 1099-C
- SSA-1099, RRB-1099
- 1098, 1098-T, 1098-E
- 1095-A, 1095-B, 1095-C
- 5498, 5498-SA
- Schedule K-1 (1065 / 1120-S / 1041)
- Heuristic types: brokerage consolidated statement, property tax statement

### Missing-documents check
- After each export, store a minimal per-client index row: tax year, plus a list of `{formType, issuerName}`. Nothing else.
- When building a binder for the same client and a later year, show expected-but-missing items in the side panel.
- Each item has a "Not expected this year" dismiss action, which is remembered.
- "Copy missing-docs list" copies a clean, friendly plain-text list the preparer can paste into an email to the client.

### Settings
- **Firm profile:** name and logo (PNG/SVG).
- Default binder order template.
- **Naming template:** tokens `{year}`, `{form}`, `{issuer}`, `{client}`, with a live preview.
- Image quality preset.
- OCR engine: Auto, or a manual override.
- Theme: System / Light / Dark.
- Automatic update checks: on or off.
- **License:** status, key (masked), and deactivate this device.
- **Data:** shows the app data folder path, and "Delete all local history" with a confirmation.

### Licensing and trial
- **Trial:** full features, 3 client binders total, tracked locally.
- **Activation:** uses the Lemon Squeezy License API (activate / validate / deactivate). Verify the current endpoints and request fields against the official Lemon Squeezy docs before implementing. Activation limits are set in the Lemon Squeezy product (Solo 2, Firm 3).
- **One-time license must never brick offline:**
  - After successful activation, the app works offline indefinitely.
  - Revalidation is attempted at most every 14 days when online, and only to detect refunded or disabled keys.
  - Network failure is never treated as invalid.
- Store activation data in the OS keychain.
- Show clear, human error messages ("This key has reached its 2-device limit. Deactivate it on another computer from Settings → License.").

### Privacy enforcement (a selling point, so make it real)
- Tauri Content Security Policy and HTTP allowlist permit only:
  1. The Lemon Squeezy license API host.
  2. The update manifest host.
- No analytics, no telemetry, no crash reporting SDKs, no remote fonts (bundle Geist).
- Add an automated test that asserts the CSP and allowlist contain exactly these hosts.
- "Export diagnostic report" in Settings creates a local zip with app version, OS, timings and error codes, and no document content. The user can email it themselves.

### Packaging and updates
- **Windows:** NSIS `.exe` installer (primary) and `.msi`, x64.
- **macOS:** universal `.dmg`.
- **Auto-updates:** `tauri-plugin-updater`, signed with an updater keypair, with the manifest and artifacts on GitHub Releases.
- **CI:** a GitHub Actions matrix (`windows-latest`, `macos-latest`) that builds on version tags and attaches artifacts to a draft release.
- **Code signing:** wire Windows signing via Azure Trusted Signing env vars, and macOS signing + notarization via Apple Developer env vars. Document exact setup steps and costs under Needs Corey. Builds must still succeed unsigned for local testing.

### App quality gates
- A cold start shows the UI in under 2s.
- 100 mixed pages are processed in under 60s on the Mac and on a mid-range Windows PC, using the Tesseract baseline. Report actual timings.
- No UI freeze during processing (the main thread is never blocked for more than 100ms).
- The app never crashes on corrupt or password-protected PDFs. Those show a clear "Couldn't open this file: it's password-protected" card.
- Every review shortcut works and is visible in the footer.
- Playwright screenshots (driving the Vite dev frontend with the real engine in Node, plus Tauri e2e via WebDriver where available) of: empty state, processing, review board, page strip, export dialog, settings, and both themes.

---

## 6. Synthetic test corpus and accuracy harness (`packages/corpus`)

Never use real taxpayer data, anywhere, ever.

- **Generator:**
  - Download the official fillable IRS PDFs (US government works).
  - Fill them with fake data using `pdf-lib`:
    - Names from a fake list ("Jane Sample", "Northwind Logistics LLC")
    - Clearly invalid identifiers (`000-00-0000` style SSNs, `00-0000000` EINs)
    - Addresses like "123 Sample St, Testville"
  - Produce three tiers:
    1. Clean digital PDFs.
    2. Scanned: rasterized, slight skew, noise, JPEG artifacts.
    3. Phone photos: perspective warp, rotation of 90/180°, shadows, blur, table-texture background, HEIC output.
  - Also generate multi-document scans (several forms in one PDF), 4-up W-2 copy pages, duplicates, a password-protected PDF, and a corrupt file.
- **Harness:** `pnpm test:accuracy` runs the full engine pipeline against the corpus with ground-truth labels, and outputs a Markdown report with:
  - Per-form precision and recall
  - Split accuracy
  - % auto-accepted
  - **% misfiled while auto-accepted** (the number that matters most)
  - Duplicate detection rate
  - Pages per second per OCR engine
- **Targets:**
  - Clean tier: ≥ 99% correct.
  - Scanned tier: ≥ 97% correct-or-flagged.
  - Photo tier: ≥ 95% correct-or-flagged.
  - Misfiled-while-auto-accepted: ≤ 0.5% across all tiers.

  If targets aren't met, tune the rules and thresholds, never the test labels.

---

## 7. Phases and gates

Do one phase per session. Stop at each gate with a full report.

**Phase 0: Foundation**
- Monorepo scaffold, shared `packages/design` (tokens, Tailwind preset, Button / Badge / Kbd / Card primitives with a small showcase page), `CLAUDE.md`, lint/format/typecheck scripts, CI skeleton.
- Complete the `forms.json` research step with sources.
- **Gate:** all checks pass; screenshots of the design showcase in both themes; `forms.json` with verified sources.

**Phase 1: Website**
- All pages and sections from Part A, with real copy, the hero animation, the ROI calculator, and checkout wired to config.
- **Gate:** the Lighthouse scores; Playwright screenshots of every page at 3 widths × 2 themes; a test checkout (Lemon Squeezy test mode) opens correctly.

**Phase 2: Engine + corpus**
- `packages/engine` (classifier, splitter, naming, ordering, duplicate logic) with Vitest unit tests.
- `packages/corpus` generator and harness.
- **Gate:** unit tests pass; accuracy report on the clean tier, using text-layer extraction run in Node.

**Phase 3: Desktop pipeline + review**
- Tauri shell, ingest, rasterize, Tesseract OCR, engine integration, processing view, and the review board with all shortcuts.
- **Gate:** drop the corpus into the real app and screenshot each state; report timings and the scanned- and photo-tier accuracy.

**Phase 4: Binder export**
- Cover, index with working internal links, nested bookmarks, individual-file export, quality presets.
- **Gate:** open the generated binder, verify that bookmarks and links navigate correctly (test this programmatically and with screenshots), and report file sizes.

**Phase 5: Missing docs, duplicates, settings**
- **Gate:** a two-year client scenario from the corpus shows the correct missing items; duplicates are caught; every setting persists across restarts.

**Phase 6: Native OCR engines**
- Windows.Media.Ocr and Apple Vision implementations behind the trait, then benchmark against Tesseract.
- **Gate:** the accuracy and speed comparison table, with the default engine per platform chosen from data.

**Phase 7: Licensing, privacy lockdown, packaging, updates**
- **Gate:** trial limit enforced; activate / deactivate works in Lemon Squeezy test mode; offline launch after activation works; the CSP/allowlist test passes; CI produces Windows and macOS installers; the updater works end to end with a test release.

**Phase 8: Polish + launch readiness**
- A full visual QA pass on the app and site: spacing, alignment, empty states, error states, loading states, focus states, copy consistency.
- Wire the site's download buttons to the latest release.
- Write `/docs` from the real app behavior.
- A final "Needs Corey" checklist for launch: accounts, signing, legal review, domain, support email, the Founders code.
- **Gate:** a screenshot tour of the entire product, and a launch checklist with everything either done or explicitly assigned to Corey.

---

## 8. Definition of done

A tax preparer can:
1. Find the site.
2. Understand the product in 10 seconds.
3. Download the trial on Windows.
4. Drop in a realistic messy pile of client documents.
5. Fix the flagged items with the keyboard.
6. Export a beautiful bookmarked binder.
7. See what's missing from last year.
8. Buy a license.
9. Activate it.
10. Keep working offline.

None of this sends a single client document anywhere, and every screen looks like it came from a team that obsesses over details.
