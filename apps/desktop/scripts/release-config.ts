/**
 * Writes src-tauri/tauri.release.json, the configuration the release workflow merges
 * over tauri.conf.json (`tauri build --config src-tauri/tauri.release.json`):
 *
 *   node scripts/release-config.ts --platform windows|macos --libs <dir> [--version x.y.z]
 *
 * - bundles the OCR language data and the native libraries in <dir> (Windows: DLLs next
 *   to the exe; macOS: dylibs in Contents/Frameworks, PDFium included, so every Mach-O
 *   file is signed and notarized with the app);
 * - fails on any library the third-party notices don't account for;
 * - turns on what the environment provides secrets for, and nothing else:
 *   updater artifacts (TAURI_SIGNING_PRIVATE_KEY), the updater itself
 *   (BINDERREADY_UPDATER_PUBKEY + BINDERREADY_UPDATE_URL), Windows signing through Azure
 *   Trusted Signing (AZURE_* below), and a macOS Developer ID (APPLE_SIGNING_IDENTITY;
 *   without it the app is signed ad hoc, which runs locally but not after download).
 */
import { readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import tauriConfig from '../src-tauri/tauri.conf.json' with { type: 'json' };
import { unlistedLibraries } from './licenses.ts';

export type Platform = 'windows' | 'macos';

/** Paths in the generated config are relative to src-tauri/. */
export const LIBS_DIR = 'release-libs';
const TESSDATA = 'tessdata/eng.traineddata';

const AZURE = [
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_TENANT_ID',
  'AZURE_SIGNING_ENDPOINT',
  'AZURE_SIGNING_ACCOUNT',
  'AZURE_SIGNING_PROFILE',
] as const;

type Env = Record<string, string | undefined>;

export interface ReleaseInput {
  platform: Platform;
  /** File names of the native libraries in src-tauri/release-libs. */
  libs: string[];
  env: Env;
  version?: string | undefined;
}

const set = (env: Env, key: string) => !!env[key]?.trim();

export function releaseConfig({ platform, libs, env, version }: ReleaseInput) {
  const extension = platform === 'windows' ? '.dll' : '.dylib';
  const bundled = libs.filter((f) => f.toLowerCase().endsWith(extension)).sort();
  if (!bundled.length) throw new Error(`No ${extension} libraries to bundle`);
  const unlisted = unlistedLibraries(bundled);
  if (unlisted.length) {
    throw new Error(
      `Not in the third-party notices (scripts/licenses.ts NATIVE): ${unlisted.join(', ')}`,
    );
  }

  const bundle: Record<string, unknown> = {
    targets: platform === 'windows' ? ['nsis', 'msi'] : ['app', 'dmg'],
    createUpdaterArtifacts: set(env, 'TAURI_SIGNING_PRIVATE_KEY'),
  };
  if (platform === 'windows') {
    bundle.resources = {
      [TESSDATA]: TESSDATA,
      ...Object.fromEntries(bundled.map((f) => [`${LIBS_DIR}/${f}`, f])),
    };
    if (AZURE.every((k) => set(env, k))) {
      bundle.windows = {
        signCommand: `trusted-signing-cli -e ${env.AZURE_SIGNING_ENDPOINT ?? ''} -a ${env.AZURE_SIGNING_ACCOUNT ?? ''} -c ${env.AZURE_SIGNING_PROFILE ?? ''} -d "${tauriConfig.productName}" %1`,
      };
    }
  } else {
    // JSON merge patch: null drops the pdfium/ resource folder; PDFium moves to Frameworks.
    bundle.resources = { [TESSDATA]: TESSDATA, 'pdfium/': null };
    bundle.macOS = {
      frameworks: [...bundled.map((f) => `${LIBS_DIR}/${f}`), 'pdfium/libpdfium.dylib'],
      minimumSystemVersion: '11.0',
      // Without a Developer ID the app is signed ad hoc. Ad-hoc code has no Team ID, so the
      // hardened runtime's library validation would refuse every bundled dylib at launch
      // ("different Team IDs"). Notarization needs the hardened runtime, and gets it with a
      // real identity.
      ...(set(env, 'APPLE_SIGNING_IDENTITY')
        ? {}
        : { signingIdentity: '-', hardenedRuntime: false }),
    };
  }

  const config: Record<string, unknown> = { bundle };
  if (version) config.version = version;
  const pubkey = env.BINDERREADY_UPDATER_PUBKEY?.trim();
  const url = env.BINDERREADY_UPDATE_URL?.trim();
  if (pubkey && url) {
    config.plugins = {
      updater: { pubkey, endpoints: [url], windows: { installMode: 'passive' } },
    };
  }
  return config;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      platform: { type: 'string' },
      libs: { type: 'string' },
      version: { type: 'string' },
    },
  });
  const platform = values.platform;
  if (platform !== 'windows' && platform !== 'macos') throw new Error('--platform windows|macos');
  if (!values.libs) throw new Error('Pass --libs <dir>');
  const config = releaseConfig({
    platform,
    libs: readdirSync(values.libs),
    env: process.env,
    version: values.version,
  });
  const out = resolve(import.meta.dirname, '../src-tauri/tauri.release.json');
  await writeFile(out, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`${out}\n${JSON.stringify(config, null, 2)}`);
}
