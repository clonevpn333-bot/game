# Screenshot tour

The whole product in the order a tax preparer meets it, following the Definition of done
(BUILD_PROMPT.md §8). Every image is captured by a test run, not mocked:
website screenshots by `pnpm screenshots` in `apps/web` (all routes at 375, 768 and 1440 px,
light and dark, in `screenshots/phase-1`), app screenshots by the desktop e2e run against the
release build (`screenshots/phase-3` to `phase-5`). The synthetic clients and companies are fake.

## 1–2. Find the site, understand it in ten seconds

![Home](screenshots/phase-1/home-dark-1440.jpg)

Pricing, the security overview and the docs:
[pricing](screenshots/phase-1/pricing-light-1440.jpg) ·
[security](screenshots/phase-1/security-dark-1440.jpg) ·
[getting started](screenshots/phase-1/docs-light-1440.jpg) ·
[review shortcuts](screenshots/phase-1/docs-review-shortcuts-light-1440.jpg) ·
[phone width](screenshots/phase-1/home-light-375.jpg)

## 3. Download the trial

![Download](screenshots/phase-1/download-dark-1440.jpg)

The buttons point at the newest published GitHub release (`DOWNLOAD_REPO`; unset in this
build, hence the marker).

## 4. Drop in a messy pile

![Empty app](screenshots/phase-3/01-empty-light.png)
![New binder](screenshots/phase-3/02-new-binder-light.png)
![Processing](screenshots/phase-3/03-processing-dark.png)

## 5. Fix flagged items with the keyboard

![Review board](screenshots/phase-3/04-review-light.png)

A password-protected and a damaged file get their own cards; the rest of the pile carries on.
[Form-type picker (T)](screenshots/phase-3/05-form-picker-light.png) ·
[preview (Space)](screenshots/phase-3/06-preview-light.png) ·
[page strip](screenshots/phase-3/07-page-strip-dark.png) ·
[command palette](screenshots/phase-3/08-command-palette-light.png) ·
[dark](screenshots/phase-3/04-review-dark.png)

## 6. Export a bookmarked binder

![Export dialog](screenshots/phase-4/01-export-dialog-light.png)
![Export done](screenshots/phase-4/02-export-done-light.png)

The binder itself, rendered from the exported PDF, with its bookmarks. Two things in it come
from the test, not the app: the second W-2 sits under Interest & dividends because the e2e moves
it there with key 3 to test re-filing, and the forms say 2026 because the synthetic corpus prints
that year while the binder is for tax year 2025.

![Cover](screenshots/phase-4/binder-page-1.png)
![Index](screenshots/phase-4/binder-page-2.png)
![Bookmarks](screenshots/phase-4/binder-navigation.png)

[Cover with a firm logo](screenshots/phase-5/04-cover-with-logo.png)

## 7. See what's missing from last year

![Missing from 2024](screenshots/phase-5/02-missing-dark.png)
![Copy the list](screenshots/phase-5/03-export-toast-dark.png)

## 8–10. Buy, activate, keep working offline

![Settings](screenshots/phase-5/01-settings-light.png)
![License](screenshots/phase-5/06-license-dark.png)
![Trial over](screenshots/phase-5/05-trial-over-dark.png)

This build has no store configured, so activation is disabled and says why. Activation
against the live Lemon Squeezy API is on Corey's list (docs/launch-checklist.md).
