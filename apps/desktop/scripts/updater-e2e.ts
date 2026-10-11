/**
 * End-to-end update test on Windows, run by .github/workflows/updater-e2e.yml against
 * an installed release build:
 *
 *   node scripts/updater-e2e.ts --exe <installed binderready.exe> --from 0.1.0 --to 0.1.1
 *     --corpus <packages/corpus/out> --driver <msedgedriver.exe>
 *
 * 1. The installed old version reads a scanned PDF and an HEIC photo, so the DLLs,
 *    PDFium and tessdata in the installer are exercised, not the build machine's.
 * 2. It finds the newer version in the test release (the same check users get at
 *    startup), downloads it, verifies the signature, installs and restarts.
 * 3. The installed exe is now the new version, the app reports it, and a setting saved
 *    before the update is still there.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { CorpusManifest } from '../../../packages/corpus/src/manifest.ts';

const DRIVER = 'http://127.0.0.1:4444';
const FIRM = 'Northwind Tax Partners';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const failures: string[] = [];
function check(condition: boolean, message: string) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${message}`);
  if (!condition) failures.push(message);
}

async function wd<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${DRIVER}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = (await res.json()) as { value: T };
  if (!res.ok) throw new Error(`${method} ${path}: ${JSON.stringify(json.value)}`);
  return json.value;
}

function fileVersion(exe: string): string {
  return execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `(Get-Item '${exe.replaceAll("'", "''")}').VersionInfo.ProductVersion`,
  ])
    .toString()
    .trim();
}

function appRunning(): boolean {
  return execFileSync('tasklist', ['/FI', 'IMAGENAME eq binderready.exe', '/NH'])
    .toString()
    .includes('binderready.exe');
}

async function session(exe: string) {
  const id = (
    await wd<{ sessionId: string }>('POST', '/session', {
      capabilities: { alwaysMatch: { 'tauri:options': { application: exe }, browserName: 'wry' } },
    })
  ).sessionId;
  const s = `/session/${id}`;
  const exec = <T = unknown>(script: string, args: unknown[] = []) =>
    wd<T>('POST', `${s}/execute/sync`, { script, args });
  const invoke = <T = unknown>(command: string, args: Record<string, unknown> = {}) =>
    wd<T>('POST', `${s}/execute/async`, {
      script:
        'const done = arguments[arguments.length - 1]; window.__TAURI_INTERNALS__.invoke(arguments[0], arguments[1]).then(v => done({ ok: v }), e => done({ error: String(e) }));',
      args: [command, args],
    }).then((r) => {
      const result = r as { ok?: T; error?: string };
      if (result.error !== undefined) throw new Error(`${command}: ${result.error}`);
      return result.ok as T;
    });
  const text = () => exec<string>('return document.body.innerText');
  const waitFor = async (needle: string | RegExp, timeout = 120000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(500)) {
      const t = await text();
      if (typeof needle === 'string' ? t.includes(needle) : needle.test(t)) return true;
    }
    return false;
  };
  const clickText = async (label: string) => {
    const ok = await exec<boolean>(
      'const el = [...document.querySelectorAll("button")].find(e => e.textContent.trim().startsWith(arguments[0])); if (el) el.click(); return !!el;',
      [label],
    );
    if (!ok) throw new Error(`No button "${label}"`);
    await sleep(300);
  };
  const end = () => wd('DELETE', s).catch(() => undefined);
  return { exec, invoke, text, waitFor, clickText, end };
}

async function main() {
  const { values } = parseArgs({
    options: {
      exe: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      corpus: { type: 'string' },
      driver: { type: 'string' },
    },
  });
  const { exe, from, to, corpus, driver } = values;
  if (!exe || !from || !to || !corpus || !driver) {
    throw new Error('Pass --exe, --from, --to, --corpus and --driver');
  }
  const tauriDriver = spawn('tauri-driver', ['--native-driver', driver], { stdio: 'inherit' });
  await sleep(2000);
  try {
    check(fileVersion(exe).startsWith(from), `the installed app is ${from}`);
    let app = await session(exe);
    const info = await app.invoke<{ version: string; updates: boolean }>('app_info');
    check(info.version === from, `the app reports version ${info.version}`);
    check(info.updates, 'the build has the updater configured');

    // Real documents through the installed libraries.
    const pick = async (tier: string, test: (f: CorpusManifest['files'][number]) => boolean) => {
      const m = JSON.parse(
        await readFile(join(corpus, tier, 'manifest.json'), 'utf8'),
      ) as CorpusManifest;
      const file = m.files.find(test);
      if (!file) throw new Error(`No matching file in the ${tier} tier`);
      return { path: join(corpus, tier, file.path), file };
    };
    const scan = await pick(
      'scanned',
      (f) => f.expect === 'ok' && f.documents.length === 1 && f.path.endsWith('.pdf'),
    );
    const photo = await pick('photo', (f) => /\.heic$/i.test(f.path) && f.documents.length === 1);
    check(await app.waitFor('Start with a client’s documents.'), 'the app starts on the drop zone');
    await app.clickText('New binder');
    await app.exec(
      'const i = document.querySelector("input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, arguments[0]); i.dispatchEvent(new Event("input", { bubbles: true }));',
      [scan.file.client],
    );
    await sleep(200);
    await app.clickText('Start empty binder');
    await app.exec(
      'return window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "tauri://drag-drop", payload: { paths: arguments[0], position: { x: 400, y: 300 } } });',
      [[scan.path, photo.path]],
    );
    check(
      await app.waitFor(/2 documents · \d+ pages/, 300000),
      'a scanned PDF and an HEIC photo are read into 2 documents',
    );
    const board = await app.text();
    const issuer = scan.file.documents[0]?.issuer ?? '';
    check(board.includes(issuer), `the scan's issuer is read by OCR (${issuer})`);

    // A setting saved before the update.
    await app.invoke('set_setting', { key: 'firm.name', value: FIRM });

    check(
      await app.waitFor(`Update ${to} available`, 120000),
      `the startup check finds version ${to}`,
    );
    // The sidebar button asks first in a native dialog; WebDriver can't press it, so the
    // test calls the command that button runs.
    void app
      .exec('window.__TAURI_INTERNALS__.invoke("install_update"); return true;')
      .catch(() => undefined);
    let updated = false;
    for (const end = Date.now() + 600000; Date.now() < end && !updated; await sleep(3000)) {
      try {
        updated = fileVersion(exe).startsWith(to);
      } catch {
        // The installer is replacing the file.
      }
    }
    check(updated, `the installed app was replaced by ${to}`);
    let restarted = false;
    for (const end = Date.now() + 60000; Date.now() < end && !restarted; await sleep(2000)) {
      restarted = appRunning();
    }
    check(restarted, 'the app restarts after installing');
    await app.end();
    execFileSync('taskkill', ['/IM', 'binderready.exe', '/F']);
    await sleep(2000);

    app = await session(exe);
    const after = await app.invoke<{ version: string }>('app_info');
    check(after.version === to, `the restarted app reports version ${after.version}`);
    const firm = await app.invoke<string | null>('get_setting', { key: 'firm.name' });
    check(firm === FIRM, 'settings saved before the update are kept');
    await app.end();
  } finally {
    tauriDriver.kill();
  }
  if (failures.length) {
    console.error(`\n${String(failures.length)} check(s) failed`);
    process.exitCode = 1;
  } else console.log('\nUpdate end to end: all checks passed');
}

await main();
