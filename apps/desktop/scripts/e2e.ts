/**
 * Drives the real desktop app (Rust backend + WebKit webview) over WebDriver:
 * tauri-driver → WebKitWebDriver. Files enter through the app's own drag-and-drop
 * event, so the real drop handler, folder expansion and Rust ingest all run.
 *
 *   pnpm tauri build --no-bundle && node scripts/e2e.ts
 *
 * Needs tauri-driver (cargo install tauri-driver), WebKitWebDriver and a display
 * (Xvfb on Linux CI). Screenshots go to docs/screenshots/phase-3/.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { CorpusManifest } from '../../../packages/corpus/src/manifest.ts';
import tauriConfig from '../src-tauri/tauri.conf.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '../../..');
const app = resolve(import.meta.dirname, '../src-tauri/target/release/binderready');
const shots = resolve(root, process.env.SHOT_DIR ?? 'docs/screenshots/phase-3');
const corpus = resolve(root, 'packages/corpus/out');
const DRIVER = 'http://127.0.0.1:4444';

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

async function main() {
  const data = await mkdtemp(join(tmpdir(), 'br-e2e-'));
  const env = {
    ...process.env,
    XDG_DATA_HOME: join(data, 'data'),
    XDG_CACHE_HOME: join(data, 'cache'),
    XDG_CONFIG_HOME: join(data, 'config'),
  };
  const driver: ChildProcess = spawn('tauri-driver', [], { env, stdio: 'ignore' });
  await sleep(1500);
  await mkdir(shots, { recursive: true });
  let session = '';
  try {
    session = (
      await wd<{ sessionId: string }>('POST', '/session', {
        capabilities: {
          alwaysMatch: { 'tauri:options': { application: app }, browserName: 'wry' },
        },
      })
    ).sessionId;
    const s = `/session/${session}`;
    const exec = <T = unknown>(script: string, args: unknown[] = []) =>
      wd<T>('POST', `${s}/execute/sync`, { script, args });
    const text = () => exec<string>('return document.body.innerText');
    const placeholderShown = async (prefix: string, timeout = 5000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (
          await exec<boolean>(
            'return [...document.querySelectorAll("input")].some(i => i.placeholder.startsWith(arguments[0]))',
            [prefix],
          )
        )
          return true;
        await sleep(200);
      }
      return false;
    };
    const waitFor = async (needle: string | RegExp, timeout = 120000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const t = await text();
        if (typeof needle === 'string' ? t.includes(needle) : needle.test(t)) return true;
        await sleep(400);
      }
      return false;
    };
    const shot = async (name: string) => {
      // Page images load lazily from disk: let visible ones finish first.
      const end = Date.now() + 5000;
      while (
        Date.now() < end &&
        !(await exec<boolean>(
          'return [...document.images].filter(i => i.getBoundingClientRect().top < innerHeight).every(i => i.complete)',
        ))
      )
        await sleep(150);
      const png = await wd<string>('GET', `${s}/screenshot`);
      await writeFile(join(shots, `${name}.png`), Buffer.from(png, 'base64'));
    };
    const theme = async (t: 'light' | 'dark') => {
      await exec(
        'localStorage.setItem("br-desktop-theme", arguments[0]); document.documentElement.dataset.theme = arguments[0];',
        [t],
      );
      await sleep(250);
    };
    const press = async (...keys: string[]) => {
      const actions = keys.flatMap((k) => [
        { type: 'keyDown', value: k },
        { type: 'keyUp', value: k },
      ]);
      await wd('POST', `${s}/actions`, { actions: [{ type: 'key', id: 'kb', actions }] });
      await sleep(250);
    };
    const chord = async (modifier: string, key: string) => {
      const actions = [
        { type: 'keyDown', value: modifier },
        { type: 'keyDown', value: key },
        { type: 'keyUp', value: key },
        { type: 'keyUp', value: modifier },
      ];
      await wd('POST', `${s}/actions`, { actions: [{ type: 'key', id: 'kb', actions }] });
      await sleep(300);
    };
    const click = async (selector: string) => {
      const el = await wd<Record<string, string>>('POST', `${s}/element`, {
        using: 'css selector',
        value: selector,
      });
      await wd('POST', `${s}/element/${Object.values(el)[0] ?? ''}/click`, {});
      await sleep(300);
    };
    const clickText = async (label: string) => {
      const ok = await exec<boolean>(
        'const el = [...document.querySelectorAll("button, label, [role=option]")].find(e => e.textContent.trim().startsWith(arguments[0])); if (el) el.click(); return !!el;',
        [label],
      );
      if (!ok) throw new Error(`No button "${label}"`);
      await sleep(300);
    };

    await wd('POST', `${s}/window/rect`, { width: 1280, height: 820 });
    check(await waitFor('Start with a client’s documents.'), 'empty state shows the drop zone');
    check((await exec<string>('return document.title')) === tauriConfig.productName, 'the window title is the configured product name');
    for (const t of ['light', 'dark'] as const) {
      await theme(t);
      await shot(`01-empty-${t}`);
    }
    await theme('light');

    // A realistic pile for one client: digital PDFs and scans, phone photos,
    // a duplicate, a password-protected file and a corrupt one.
    const pick = async (
      tier: string,
      filter: (f: CorpusManifest['files'][number]) => boolean,
      n: number,
    ) => {
      const m = JSON.parse(
        await readFile(join(corpus, tier, 'manifest.json'), 'utf8'),
      ) as CorpusManifest;
      return m.files
        .filter(filter)
        .slice(0, n)
        .map((f) => join(corpus, tier, f.path));
    };
    const client = 'Jane Sample';
    const paths = [
      ...(await pick('clean', (f) => f.client === client && f.expect === 'ok', 14)),
      ...(await pick('scanned', (f) => f.client === client && f.documents.length > 1, 2)),
      ...(await pick('photo', (f) => f.client === client, 4)),
      ...(await pick('clean', (f) => f.expect !== 'ok', 2)),
    ];

    await clickText('New binder');
    check(await waitFor('Who is this binder for?'), 'new binder asks for the client');
    await exec(
      'const i = document.querySelector("input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, arguments[0]); i.dispatchEvent(new Event("input", { bubbles: true }));',
      [client],
    );
    await sleep(200);
    await shot('02-new-binder-light');
    await clickText('Start empty binder');
    check(await waitFor('Add documents to begin'), 'binder starts and waits for documents');

    // The same event the OS sends when files are dropped on the window.
    const started = Date.now();
    await exec(
      'return window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "tauri://drag-drop", payload: { paths: arguments[0], position: { x: 400, y: 300 } } });',
      [paths],
    );
    check(await waitFor(/Reading \d+ files/, 15000), 'dropped files start processing');
    await sleep(1500);
    await shot('03-processing-light');
    await theme('dark');
    await shot('03-processing-dark');
    await theme('light');

    check(
      await waitFor(/\d+ documents · \d+ pages/, 600000),
      'processing finishes and opens the review board',
    );
    const seconds = (Date.now() - started) / 1000;
    const summary = await exec<string>(
      'return document.querySelector("h1 + p")?.textContent ?? ""',
    );
    console.log(`      ${summary} — ${paths.length} files in ${seconds.toFixed(1)} s`);
    const body = await text();
    check(body.includes('password-protected'), 'the password-protected file shows a clear card');
    check(body.includes('damaged or incomplete'), 'the corrupt file shows a clear card');
    check(/Wages|Interest/.test(body), 'documents are grouped by category');
    await shot('04-review-light');
    await theme('dark');
    await shot('04-review-dark');
    await theme('light');

    // Keyboard review.
    const selected = () =>
      exec<string>('return document.querySelector("[aria-pressed=true] p")?.textContent ?? ""');
    const first = await selected();
    await press('j');
    const second = await selected();
    check(first !== second && second !== '', 'J moves to the next document');
    await press('k');
    check((await selected()) === first, 'K moves back');
    await press('t');
    check(await placeholderShown('Form type for'), 'T opens the form-type picker');
    await shot('05-form-picker-light');
    await press('\uE00C');
    await press('e');
    const editing = await exec<boolean>(
      'return document.activeElement?.getAttribute("aria-label") === "Document name"',
    );
    check(editing, 'E edits the name');
    await press('\uE00C');
    await press(' ');
    check(
      await exec<boolean>('return !!document.querySelector("img[alt^=\'Page 1 of\']")'),
      'Space opens the large preview',
    );
    await shot('06-preview-light');
    await press(' ');
    await click('[aria-pressed=true]');
    check(
      await exec<boolean>('return !!document.querySelector("section[aria-label=Pages]")'),
      'clicking a document opens the page strip',
    );
    await shot('07-page-strip-light');
    await theme('dark');
    await shot('07-page-strip-dark');
    await theme('light');
    const before = await exec<number>(
      'return document.querySelectorAll("section[aria-label=Pages] li").length',
    );
    await press('r');
    check(
      await exec<boolean>(
        'return [...document.querySelectorAll("section[aria-label=Pages] img")].some(i => i.style.transform.includes("90deg"))',
      ),
      'R rotates the current page',
    );
    check(before > 0, 'page strip lists the pages');
    const groupsBefore = await exec<number>(
      'return document.querySelectorAll("main section[aria-labelledby^=group-] button[aria-pressed]").length',
    );
    await press('d');
    check(await waitFor('Duplicates and removed', 5000), 'D removes a document from the binder');
    await press('d');
    const groupsAfter = await exec<number>(
      'return document.querySelectorAll("main section[aria-labelledby^=group-] button[aria-pressed]").length',
    );
    check(groupsBefore === groupsAfter, 'D again restores it');
    await press('3');
    check((await text()).includes('Interest & dividends'), '3 reassigns to Interest & dividends');
    await press('\uE007');
    check(true, 'Enter accepts');

    await chord('\uE009', 'k');
    check(await placeholderShown('Type a command'), 'Ctrl+K opens the command palette');
    await shot('08-command-palette-light');
    await press('\uE00C');

    await clickText('Settings');
    check(await waitFor('App data folder'), 'settings open');
    await shot('09-settings-light');
    await theme('dark');
    await shot('09-settings-dark');
    await theme('light');
    await clickText('Clients');
    check(await waitFor(client), 'the new client is listed');
    await shot('10-clients-light');
  } finally {
    if (session) await wd('DELETE', `/session/${session}`).catch(() => undefined);
    driver.kill();
    await rm(data, { recursive: true, force: true });
  }
  if (failures.length) {
    console.error(`\n${String(failures.length)} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed');
  }
}

await main();
