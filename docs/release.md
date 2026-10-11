# Releasing the desktop app

`.github/workflows/release.yml` builds the installers:

| Platform            | Runner           | Files                                                                   |
| ------------------- | ---------------- | ----------------------------------------------------------------------- |
| Windows x64         | `windows-latest` | `BinderReady_<v>_x64-setup.exe` (NSIS), `BinderReady_<v>_x64_en-US.msi` |
| macOS Apple Silicon | `macos-latest`   | `BinderReady_<v>_aarch64.dmg`, updater archive                          |
| macOS Intel         | `macos-15-intel` | `BinderReady_<v>_x64.dmg`, updater archive                              |

Pushing a tag `v<version>` (it must equal `version` in `apps/desktop/src-tauri/tauri.conf.json`)
builds all three and drafts a GitHub release with the installers and, when the updater is
configured, `latest.json`. Review the draft, then publish it. The app's updater reads
`https://github.com/<repo>/releases/latest/download/latest.json`, so only the published,
non-pre-release version is offered. Pushes that change packaging build the same installers
as workflow artifacts (14 days).

## What goes in the installers

- The app, PDFium (`chromium/8086`), Tesseract's English data (`tessdata_fast` 4.1.0).
- Tesseract 5.5, Leptonica and libheif, built by a pinned vcpkg (2026.07.29) as dynamic
  libraries (`.github/actions/native-libs`). Tesseract is built **without libcurl and
  libarchive** (`apps/desktop/scripts/vcpkg-overlay.ts`), and libheif **without the x265
  encoder**, which is GPL. libheif and libde265 (LGPL) stay separate, replaceable files.
- Windows: the Visual C++ runtime DLLs, deployed next to the exe.
- macOS: every library, PDFium included, in `Contents/Frameworks`, signed with the app.

The build fails if it bundles a library that the third-party notices
(`apps/desktop/scripts/licenses.ts`, `NATIVE`) don't list. After each build, CI checks that
the installed app starts with the build machine's libraries moved away, and on macOS that
nothing links outside the bundle and the signature verifies.

## Secrets and variables (Settings → Secrets and variables → Actions)

Everything is optional: without a value, the build still succeeds and that feature is off.
The app says so where it matters (Settings → License, Settings → Updates).

| Name                                                                       | Kind      | Turns on                                                               |
| -------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| `BINDERREADY_LS_STORE_ID`                                                  | variable  | License activation: the Lemon Squeezy store the key must belong to     |
| `BINDERREADY_LS_PRODUCT_IDS`                                               | variable  | Comma-separated product IDs a key may belong to                        |
| `BINDERREADY_BUY_URL`                                                      | variable  | "Buy a license" in the app                                             |
| `BINDERREADY_UPDATER_PUBKEY`                                               | variable  | The updater (with the private key below)                               |
| `TAURI_SIGNING_PRIVATE_KEY`                                                | secret    | Signed updater artifacts and `latest.json`                             |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`                                       | secret    | Password of that key                                                   |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`                | secrets   | Windows code signing with Azure Trusted Signing                        |
| `AZURE_SIGNING_ENDPOINT`, `AZURE_SIGNING_ACCOUNT`, `AZURE_SIGNING_PROFILE` | variables | (same; all six are needed)                                             |
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`                          | secrets   | macOS signing: the Developer ID Application certificate (.p12, base64) |
| `APPLE_SIGNING_IDENTITY`                                                   | secret    | e.g. `Developer ID Application: Company (TEAMID)`                      |
| `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`                              | secrets   | Notarization (app-specific password)                                   |

Create the updater key pair once, keep the private key out of the repository, and never
replace it: installed copies only accept updates signed by the key they were built with.

```sh
pnpm --filter @binderready/desktop exec tauri signer generate -w ~/.binderready/updater.key
# variable BINDERREADY_UPDATER_PUBKEY = contents of updater.key.pub
# secret   TAURI_SIGNING_PRIVATE_KEY  = contents of updater.key
```

Unsigned builds are for testing only: Windows SmartScreen warns about them, and macOS
refuses to open an ad-hoc-signed app downloaded from the internet.

## Updater test

`.github/workflows/updater-e2e.yml` proves the update path on Windows with a throwaway
key: it builds the configured version and the next patch version, publishes the newer
one as a temporary pre-release of this repository, installs the older one, reads a
scanned PDF and an HEIC photo with it, lets it find, download, verify and install the
update, and checks that the restarted app is the new version with its settings intact.
The pre-release and its tag are deleted at the end of the run.
