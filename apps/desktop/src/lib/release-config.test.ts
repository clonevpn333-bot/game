import { describe, expect, it } from 'vitest';
import { releaseConfig } from '../../scripts/release-config.ts';
import { patchManifest, patchPortfile } from '../../scripts/vcpkg-overlay.ts';

// File names from the first Windows release build.
const WINDOWS_LIBS = ['tesseract55.dll', 'leptonica-1.87.0.dll', 'heif.dll', 'libde265.dll'];
const WINDOWS_BUILD = [
  ...WINDOWS_LIBS,
  ...['concrt140.dll', 'gif.dll', 'jpeg62.dll', 'liblzma.dll', 'libpng16.dll', 'libsharpyuv.dll'],
  ...['libwebp.dll', 'libwebpdecoder.dll', 'libwebpdemux.dll', 'libwebpmux.dll', 'msvcp140.dll'],
  ...['msvcp140_1.dll', 'msvcp140_2.dll', 'msvcp140_atomic_wait.dll', 'msvcp140_codecvt_ids.dll'],
  ...['openjp2.dll', 'tiff.dll', 'turbojpeg.dll', 'vccorlib140.dll', 'vcruntime140.dll'],
  ...['vcruntime140_1.dll', 'vcruntime140_threads.dll', 'z.dll'],
];
const MAC_LIBS = ['libtesseract.5.dylib', 'libleptonica.6.dylib', 'libheif.1.dylib'];

describe('release config', () => {
  it('bundles libraries and tessdata, and enables nothing without secrets', () => {
    const config = releaseConfig({ platform: 'windows', libs: WINDOWS_LIBS, env: {} });
    expect(config).toEqual({
      bundle: {
        targets: ['nsis', 'msi'],
        createUpdaterArtifacts: false,
        resources: {
          'tessdata/eng.traineddata': 'tessdata/eng.traineddata',
          'release-libs/heif.dll': 'heif.dll',
          'release-libs/leptonica-1.87.0.dll': 'leptonica-1.87.0.dll',
          'release-libs/libde265.dll': 'libde265.dll',
          'release-libs/tesseract55.dll': 'tesseract55.dll',
        },
      },
    });
  });

  it('turns on signing and the updater only when every secret is present', () => {
    const env = {
      TAURI_SIGNING_PRIVATE_KEY: 'key',
      BINDERREADY_UPDATER_PUBKEY: 'pub',
      BINDERREADY_UPDATE_URL: 'https://github.com/o/r/releases/latest/download/latest.json',
      AZURE_CLIENT_ID: 'a',
      AZURE_CLIENT_SECRET: 'b',
      AZURE_TENANT_ID: 'c',
      AZURE_SIGNING_ENDPOINT: 'https://eus.codesigning.azure.net',
      AZURE_SIGNING_ACCOUNT: 'acct',
      AZURE_SIGNING_PROFILE: 'prof',
    };
    const config = releaseConfig({ platform: 'windows', libs: WINDOWS_LIBS, env });
    expect(config.bundle).toMatchObject({
      createUpdaterArtifacts: true,
      windows: {
        signCommand:
          'trusted-signing-cli -e https://eus.codesigning.azure.net -a acct -c prof -d "BinderReady" %1',
      },
    });
    expect(config.plugins).toEqual({
      updater: {
        pubkey: 'pub',
        endpoints: [env.BINDERREADY_UPDATE_URL],
        windows: { installMode: 'passive' },
      },
    });
    const partial = releaseConfig({
      platform: 'windows',
      libs: WINDOWS_LIBS,
      env: { ...env, AZURE_SIGNING_PROFILE: '', BINDERREADY_UPDATE_URL: undefined },
    });
    expect(partial.bundle).not.toHaveProperty('windows');
    expect(partial).not.toHaveProperty('plugins');
  });

  it('puts every macOS library, PDFium included, in Frameworks and signs ad hoc by default', () => {
    const config = releaseConfig({ platform: 'macos', libs: MAC_LIBS, env: {}, version: '0.2.0' });
    expect(config.version).toBe('0.2.0');
    expect(config.bundle).toMatchObject({
      targets: ['app', 'dmg'],
      resources: { 'tessdata/eng.traineddata': 'tessdata/eng.traineddata', 'pdfium/': null },
      macOS: {
        frameworks: [
          'release-libs/libheif.1.dylib',
          'release-libs/libleptonica.6.dylib',
          'release-libs/libtesseract.5.dylib',
          'pdfium/libpdfium.dylib',
        ],
        signingIdentity: '-',
        hardenedRuntime: false,
      },
    });
    const signed = releaseConfig({
      platform: 'macos',
      libs: MAC_LIBS,
      env: { APPLE_SIGNING_IDENTITY: 'Developer ID Application: Sample (TEAM)' },
    });
    expect(signed.bundle).not.toHaveProperty('macOS.signingIdentity');
    expect(signed.bundle).not.toHaveProperty('macOS.hardenedRuntime');
  });

  it('accounts for every library a Windows release build bundled', () => {
    expect(() =>
      releaseConfig({ platform: 'windows', libs: WINDOWS_BUILD, env: {} }),
    ).not.toThrow();
  });

  it('refuses libraries the third-party notices do not list', () => {
    expect(() =>
      releaseConfig({ platform: 'windows', libs: [...WINDOWS_LIBS, 'libx265.dll'], env: {} }),
    ).toThrow(/libx265\.dll/);
    expect(() =>
      releaseConfig({ platform: 'macos', libs: ['libcurl.4.dylib', ...MAC_LIBS], env: {} }),
    ).toThrow(/libcurl/);
  });
});

describe('tesseract vcpkg overlay', () => {
  it('drops curl and libarchive from the port', () => {
    const manifest = JSON.parse(
      patchManifest(
        JSON.stringify({
          name: 'tesseract',
          dependencies: [{ name: 'curl', 'default-features': false }, 'leptonica', 'libarchive'],
        }),
      ),
    ) as { dependencies: unknown[] };
    expect(manifest.dependencies).toEqual(['leptonica']);
    const portfile = patchPortfile(
      [
        '-DCMAKE_REQUIRE_FIND_PACKAGE_LibArchive=ON',
        '-DCMAKE_REQUIRE_FIND_PACKAGE_CURL=ON',
        'find_dependency(CURL)',
        'find_dependency(Leptonica)',
        'find_dependency(LibArchive)',
        '',
      ].join('\n'),
    );
    expect(portfile).toBe('-DDISABLE_ARCHIVE=ON\n-DDISABLE_CURL=ON\nfind_dependency(Leptonica)\n');
    expect(() => patchPortfile('nothing to patch')).toThrow(/not found/);
  });
});
