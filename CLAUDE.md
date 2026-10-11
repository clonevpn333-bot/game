# BinderReady

Local-first desktop app for US tax preparers that turns a client's pile of tax documents into one
ordered, bookmarked PDF binder, plus the website that sells it. `BUILD_PROMPT.md` is the full spec;
it is built one phase per session, and each phase stops at its gate with a report to Corey.

## Status

| Phase | Scope                                                          | State                                           |
| ----- | -------------------------------------------------------------- | ----------------------------------------------- |
| 0     | Monorepo, design system + showcase, forms.json research, CI    | Done except forms.json verification (see below) |
| 1     | Website (`apps/web`)                                           | Not started                                     |
| 2     | Engine + corpus                                                | Not started (forms catalog + validator exist)   |
| 3–8   | Desktop pipeline, export, missing docs, OCR, licensing, polish | Not started                                     |

**Open from Phase 0:** `forms.json` patterns are drafted but unverified, and no OMB numbers are
recorded, because the cloud sessions could not reach irs.gov/ssa.gov. Run `pnpm forms:verify --write`
from a machine that can (or with `--pdf-dir` pointing at downloaded PDFs). Fix any reported pattern
misses against the official text. Never fix them from memory.

## Commands

```sh
pnpm install
pnpm check            # format:check + lint + typecheck + test + build (what CI runs)
pnpm lint | typecheck | test | build | format
pnpm showcase         # design system showcase on Vite dev server
pnpm screenshots      # build showcase, capture 375/768/1440 × light/dark → docs/screenshots/phase-0
pnpm forms:verify     # check forms.json against official PDFs; --write, --pdf-dir <dir>, --only a,b
```

Screenshots need a Chromium: `pnpm --filter @binderready/design exec playwright-core install chromium`,
or set `CHROMIUM_PATH` (cloud sessions: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`).

## Layout

```
apps/web          Next.js static marketing + checkout site        (Phase 1)
apps/desktop      Tauri 2 app, React frontend + Rust backend       (Phase 3+)
packages/design   Steel tokens, Tailwind v4 preset, React primitives, showcase/
packages/engine   Pure TS engine. Today: forms.json + validator + source verifier
packages/corpus   Synthetic documents + accuracy harness           (Phase 2)
docs/screenshots  Gate screenshots, one folder per phase
```

`index.html`, `css/`, `js/` at the root are an unrelated browser game that predates this project.
They are excluded from lint/format and untouched. Ask Corey before moving or deleting them.

## Conventions

- pnpm workspaces + Turborepo. TypeScript strict everywhere (`tsconfig.base.json`), including
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `erasableSyntaxOnly`.
- TypeScript is pinned to 6.0.x: typescript-eslint 8 does not support TS 7 yet.
- Internal packages are source-only (`exports` point at `.ts`); consumers compile them. No build step.
- Node scripts run as `.ts` directly (Node ≥22.18 type stripping). So: erasable syntax only, and
  relative imports in code a script touches use explicit `.ts` extensions (see `packages/engine`).
- ESLint flat config at the root, `strictTypeChecked`. `TODO`/`FIXME` comments are a lint error
  (anti-stub rule). Prettier: single quotes, trailing commas, width 100.
- No mocked data paths, no placeholder UI, no buttons that do nothing (BUILD_PROMPT.md §0).
- Never use real taxpayer data. Fake names ("Jane Sample", "Northwind Logistics"), `000-00-0000`.
- Copy rules: never "IRS-approved", "compliant", "certified", "guaranteed", absolute "secure". Never
  name competitors. Product name comes from one config value (`PRODUCT_NAME`).

## Design system (packages/design)

- `tokens.css`: Steel tokens as CSS variables. No `data-theme` follows the OS. `data-theme="light"|"dark"`
  on `<html>` forces a theme; on any element it scopes the theme to that subtree (the website's
  always-dark privacy panel). Dark values appear twice (media query + attribute); a test keeps them equal.
- `preset.css`: Tailwind v4 preset (`@theme inline`). Tailwind's default palette and radii are
  removed, so only Steel colors (`bg-surface`, `text-fg-muted`, …) and radii (`rounded-control|card|panel`)
  exist. Text sizes: `text-display`, `text-h2`, `text-body`, `text-label`. Utilities: `eyebrow`,
  `text-steel`, `bg-grid`, `tabular`. Global `:focus-visible` ring and reduced-motion reset live here.
- `fonts.css`: bundled Geist via Fontsource (desktop + showcase). The website uses `geist` + `next/font`.
- Components: `Button`/`ButtonLink`/`buttonStyles`, `Badge`, `StatusDot`, `Kbd`, `Card*` parts,
  `Mark`, `Crosshair`. React 19 (ref as a prop, no `forwardRef`), explicit variants, compound parts.
  `cx()` wraps tailwind-merge, configured for the preset's custom keys. Extend it when adding keys.
- Icons: `lucide-react`, 16px, `strokeWidth={1.5}`.

## Engine: forms.json

- Schema and provenance rules are enforced by `parseFormsCatalog` (`packages/engine/src/forms.ts`):
  - `ombNumbers` may be non-empty only when `verifiedOn` and `source` are set. They are written only
    by `forms:verify`, from the official PDF text.
  - `heuristic` types (brokerage consolidated statement, property tax statement) have no source and no OMB.
  - `yearPatterns` must capture the year in group 1. All patterns compile with `patternFlags` (`iu`).
- Categories are fixed, in default binder order: `CATEGORY_IDS`.
- `forms:verify` marks a form verified only if every title, box-label and issuer-label pattern matches
  the official text. It writes `packages/engine/forms-verification.md`.

## Decisions log

- 2026-10-11 `--fg-subtle` changed from the brief's #8f8f8f / #6b6b6b to #737373 / #7d7d7d. The
  originals are 3.1–3.9:1, which fails WCAG AA for the 12px labels that use it. Test-enforced.
- 2026-10-11 Tailwind v4: the "preset" is a CSS file (`preset.css`), the v4-native mechanism.
- 2026-10-11 The `geist` package has a Next.js peer dependency, so non-Next consumers use the same
  Geist faces from `@fontsource-variable/geist{,-mono}` (OFL).
- 2026-10-11 Empty `apps/*` and `packages/corpus` were not scaffolded. Placeholder apps would
  violate the anti-stub rule; each arrives in its phase.
