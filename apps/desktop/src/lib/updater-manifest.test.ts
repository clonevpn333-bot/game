import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASE_ASSET_SUFFIXES } from '../../../web/site.config.ts';
import { STABLE_SUFFIXES, stableName } from '../../scripts/release-assets.ts';
import { manifest, platformFor } from '../../scripts/updater-manifest.ts';

describe('updater manifest', () => {
  it('maps signed artifacts to updater platforms and release URLs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'br-manifest-'));
    try {
      await writeFile(join(dir, 'BinderReady_0.2.0_x64-setup.exe.sig'), 'sig-win\n');
      await writeFile(join(dir, 'BinderReady_0.2.0_aarch64.app.tar.gz.sig'), 'sig-mac\n');
      await writeFile(join(dir, 'BinderReady_0.2.0_x64_en-US.msi'), '');
      const m = await manifest(dir, '0.2.0', 'owner/repo', 'Fixes');
      expect(Object.keys(m.platforms).sort()).toEqual(['darwin-aarch64', 'windows-x86_64']);
      expect(m.platforms['windows-x86_64']).toEqual({
        signature: 'sig-win',
        url: 'https://github.com/owner/repo/releases/download/v0.2.0/BinderReady_0.2.0_x64-setup.exe',
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    expect(platformFor('BinderReady_0.2.0_x64_en-US.msi')).toBeNull();
  });
});

describe('release assets', () => {
  it('gives installers the version-free names the website links to', () => {
    expect(STABLE_SUFFIXES).toEqual(RELEASE_ASSET_SUFFIXES);
    expect(stableName('BinderReady_0.2.0_x64-setup.exe', 'BinderReady')).toBe(
      'BinderReady-windows-x64-setup.exe',
    );
    expect(stableName('BinderReady_0.2.0_aarch64.dmg', 'BinderReady')).toBe(
      'BinderReady-macos-apple-silicon.dmg',
    );
    expect(stableName('BinderReady_0.2.0_x64.dmg', 'BinderReady')).toBe(
      'BinderReady-macos-intel.dmg',
    );
    expect(stableName('BinderReady_0.2.0_x64_en-US.msi', 'BinderReady')).toBeNull();
    expect(stableName('BinderReady_0.2.0_x64-setup.exe.sig', 'BinderReady')).toBeNull();
  });
});
