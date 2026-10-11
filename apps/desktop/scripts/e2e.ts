/**
 * Drives the real desktop app (Rust backend + WebKit webview) over WebDriver:
 * tauri-driver → WebKitWebDriver. Files enter through the app's own drag-and-drop
 * event, so the real drop handler, folder expansion and Rust ingest all run.
 *
 *   pnpm tauri build --no-bundle && node scripts/e2e.ts
 *
 * Needs tauri-driver (cargo install tauri-driver), WebKitWebDriver and a display
 * (Xvfb on Linux CI), xdotool and xclip. Screenshots go to docs/screenshots/phase-3,
 * phase-4 and phase-5.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { CorpusManifest } from '../../../packages/corpus/src/manifest.ts';
import tauriConfig from '../src-tauri/tauri.conf.json' with { type: 'json' };
import type { TwoYearManifest } from '../../../packages/corpus/src/two-year.ts';
import { checkBinder, coverInfo, shootBinder } from './verify-binder.ts';

const root = resolve(import.meta.dirname, '../../..');
const app = resolve(import.meta.dirname, '../src-tauri/target/release/binderready');
const shots = resolve(root, process.env.SHOT_DIR ?? 'docs/screenshots/phase-3');
const exportShots = resolve(root, process.env.EXPORT_SHOT_DIR ?? 'docs/screenshots/phase-4');
const settingsShots = resolve(root, process.env.SETTINGS_SHOT_DIR ?? 'docs/screenshots/phase-5');
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
  // Helpers read the current session, so the app can be restarted mid-run.
  let s = '';
  const startApp = async () => {
    session = (
      await wd<{ sessionId: string }>('POST', '/session', {
        capabilities: {
          alwaysMatch: { 'tauri:options': { application: app }, browserName: 'wry' },
        },
      })
    ).sessionId;
    s = `/session/${session}`;
    await wd('POST', `${s}/window/rect`, { width: 1280, height: 820 });
  };
  try {
    await startApp();
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
    const shot = async (name: string, dir = shots) => {
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
      await writeFile(join(dir, `${name}.png`), Buffer.from(png, 'base64'));
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

    const typeInto = async (selector: string, value: string) => {
      const el = await wd<Record<string, string>>('POST', `${s}/element`, {
        using: 'css selector',
        value: selector,
      });
      const id = Object.values(el)[0] ?? '';
      await wd('POST', `${s}/element/${id}/clear`, {});
      await wd('POST', `${s}/element/${id}/value`, { text: value });
      await sleep(200);
    };
    /** Sets a controlled <select> the way a user change would. */
    const choose = (selector: string, value: string) =>
      exec(
        'const el = document.querySelector(arguments[0]); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, arguments[1]); el.dispatchEvent(new Event("change", { bubbles: true }));',
        [selector, value],
      );
    const typeName = (value: string) =>
      exec(
        'const i = document.querySelector("input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, arguments[0]); i.dispatchEvent(new Event("input", { bubbles: true }));',
        [value],
      );
    const drop = (files: string[]) =>
      exec(
        'return window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "tauri://drag-drop", payload: { paths: arguments[0], position: { x: 400, y: 300 } } });',
        [files],
      );

    /** The native GTK file chooser: type the path into its location bar (xdotool). */
    const pickPath = async (title: string, path: string, folder: boolean) => {
      const find = () => {
        try {
          return execFileSync('xdotool', ['search', '--onlyvisible', '--name', title])
            .toString()
            .trim()
            .split('\n')[0];
        } catch {
          return undefined;
        }
      };
      let win: string | undefined;
      for (let end = Date.now() + 15000; Date.now() < end && !win; await sleep(300)) win = find();
      if (!win) throw new Error(`The "${title}" dialog did not open`);
      // No window manager under Xvfb: focus the dialog directly. GTK opens on
      // "Recent", where a typed path can't be chosen: go Home (Alt+Home), type the
      // folder, Return opens it, Return again chooses it.
      execFileSync('xdotool', ['windowfocus', '--sync', win]);
      const steps: string[][] = [
        ['key', 'alt+Home'],
        ['key', 'ctrl+l'],
        ['type', '--delay', '15', folder ? `${path}/` : path],
        ['key', 'Return'],
      ];
      for (const step of steps) {
        execFileSync('xdotool', step);
        await sleep(500);
      }
      // Depending on the view, the first Return opens the folder or already chooses it.
      await sleep(500);
      if (find()) execFileSync('xdotool', ['key', 'Return']);
      for (let end = Date.now() + 5000; Date.now() < end && find();) await sleep(300);
      if (find()) throw new Error(`The "${title}" dialog did not accept ${path}`);
    };
    const pickFolder = (dir: string) => pickPath('Choose where to save the binder', dir, true);
    /** Confirms a native message dialog (Return activates its default, the confirm button). */
    const confirmNative = async (title: string) => {
      let win: string | undefined;
      for (let end = Date.now() + 10000; Date.now() < end && !win; await sleep(300)) {
        try {
          win = execFileSync('xdotool', ['search', '--onlyvisible', '--name', title])
            .toString()
            .trim()
            .split('\n')[0];
        } catch {
          win = undefined;
        }
      }
      if (!win) return false;
      execFileSync('xdotool', ['windowfocus', '--sync', win]);
      execFileSync('xdotool', ['key', 'Return']);
      await sleep(800);
      return true;
    };
    /** Opens the export dialog, sets it up, exports and waits for the toast. */
    const exportBinder = async (opts: { folder?: string; quality?: string; singles?: boolean }) => {
      await chord('\uE009', 'e');
      if (!(await waitFor('Binder order', 5000))) throw new Error('Export dialog did not open');
      if (opts.folder) {
        await clickText('Choose');
        await pickFolder(opts.folder);
        if (!(await waitFor(opts.folder, 10000))) throw new Error('Folder was not chosen');
      }
      if (opts.quality) await clickText(opts.quality);
      if (opts.singles) await clickText('Also export individual files');
      await click('dialog button[type=submit]');
      const started = Date.now();
      const ok = await waitFor('Binder saved', 300000);
      return { ok, seconds: (Date.now() - started) / 1000 };
    };
    const newestPdf = async (dir: string) => {
      const entries = await Promise.all(
        (await readdir(dir))
          .filter((f) => f.endsWith('.pdf'))
          .map(async (f) => ({ f, s: await stat(join(dir, f)) })),
      );
      const latest = entries.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs)[0];
      if (!latest) throw new Error(`No PDF in ${dir}`);
      return { path: join(dir, latest.f), bytes: latest.s.size };
    };
    const verify = async (path: string, title: string, prefix: string | null) => {
      const result = await checkBinder(path, title);
      for (const f of result.failures) console.log(`      ${f}`);
      check(
        result.failures.length === 0,
        `${prefix ?? 'binder'}: ${String(result.links.length)} index links and ${String(result.bookmarks.reduce((n, b) => n + 1 + b.children.length, 0))} bookmarks land on the right pages`,
      );
      if (prefix) await shootBinder(path, result, exportShots, prefix);
      return result;
    };
    const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

    check(await waitFor('Start with a client’s documents.'), 'empty state shows the drop zone');
    check(
      (await exec<string>('return document.title')) === tauriConfig.productName,
      'the window title is the configured product name',
    );
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
      // All of the client's digital files, including an exact re-send and a Copy C rescan.
      ...(await pick('clean', (f) => f.client === client && f.expect === 'ok', 40)),
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
    const duplicateBadges = await exec<number>(
      'return [...document.querySelectorAll("[aria-labelledby=group-excluded] button[aria-pressed]")].filter(b => b.textContent.includes("Duplicate")).length',
    );
    check(
      duplicateBadges >= 2,
      `duplicates are caught and set aside (${String(duplicateBadges)}: an exact re-send and a Copy C rescan)`,
    );
    await shot('04-review-light');
    await theme('dark');
    await shot('04-review-dark');
    await theme('light');

    // Keyboard review.
    // Position of the selected card on the board (names can repeat across duplicates).
    const selected = () =>
      exec<number>(
        'return [...document.querySelectorAll("main button[aria-pressed]")].findIndex(b => b.getAttribute("aria-pressed") === "true")',
      );
    const first = await selected();
    await press('j');
    const second = await selected();
    check(second === first + 1, 'J moves to the next document');
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

    // Export through the real dialog, then open the file and follow every link.
    await mkdir(exportShots, { recursive: true });
    const out = join(data, 'out');
    await mkdir(out, { recursive: true });
    await chord('\uE009', 'e');
    check(await waitFor('Binder order', 5000), 'Ctrl+E opens the export dialog');
    await shot('01-export-dialog-light', exportShots);
    await theme('dark');
    await shot('01-export-dialog-dark', exportShots);
    await theme('light');
    await press('\uE00C');
    check(
      !(await exec<boolean>('return !!document.querySelector("dialog[open]")')),
      'Escape closes the export dialog',
    );
    const firstExport = await exportBinder({ folder: out, singles: true });
    check(firstExport.ok, `export finishes (${firstExport.seconds.toFixed(1)} s)`);
    await shot('02-export-done-light', exportShots);
    const title = `${client} – 2025 Binder`;
    const binder = await newestPdf(out);
    check(binder.path.endsWith(`${title}.pdf`), 'the binder is named after the client and year');
    const result = await verify(binder.path, title, 'binder');
    const singles = (await readdir(join(out, `${client} – 2025 files`))).filter((f) =>
      f.endsWith('.pdf'),
    );
    const documentCount = result.bookmarks.reduce((n, b) => n + b.children.length, 0);
    check(
      singles.length === documentCount,
      `individual files: ${String(singles.length)} for ${String(documentCount)} documents`,
    );
    console.log(
      `      binder: ${String(result.pages)} pages, ${mb(binder.bytes)} (balanced, mixed digital/scanned/photo)`,
    );

    await clickText('Settings');
    check(await waitFor('App data folder'), 'settings open');
    await shot('09-settings-light');
    await theme('dark');
    await shot('09-settings-dark');
    await theme('light');
    await clickText('Clients');
    check(await waitFor(client), 'the new client is listed');
    await shot('10-clients-light');

    // File sizes: 100 phone photos as one binder, at each quality preset.
    // E2E_QUICK=1 skips it (about three minutes) while iterating on later steps.
    if (!process.env.E2E_QUICK) {
      await clickText('Current binder');
      await clickText('Start next binder');
      check(await waitFor('Who is this binder for?'), 'Start next binder opens a new binder');
      // The same client and year again: re-exporting a binder doesn't use another trial slot.
      const photoClient = client;
      await clickText(photoClient);
      await choose('select', '2025');
      await clickText('Start empty binder');
      check(await waitFor('Add documents to begin'), 'the second binder starts');
      const photos = await pick(
        'photo',
        (f) => f.expect === 'ok' && f.documents.every((d) => d.duplicateOf === null),
        100,
      );
      const photoStart = Date.now();
      await exec(
        'return window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "tauri://drag-drop", payload: { paths: arguments[0], position: { x: 400, y: 300 } } });',
        [photos],
      );
      check(
        await waitFor(/\d+ documents · \d+ pages/, 900000),
        `${String(photos.length)} photos processed`,
      );
      console.log(
        `      ${String(photos.length)} photos in ${((Date.now() - photoStart) / 1000).toFixed(1)} s`,
      );
      const out2 = join(data, 'out-photos');
      await mkdir(out2, { recursive: true });
      const sizes: { quality: string; bytes: number; pages: number; seconds: number }[] = [];
      for (const [i, quality] of ['Balanced', 'Compact', 'High'].entries()) {
        if (i > 0) await click('[aria-label=Dismiss]');
        const run = await exportBinder({ ...(i === 0 ? { folder: out2 } : {}), quality });
        check(run.ok, `${quality} export finishes (${run.seconds.toFixed(1)} s)`);
        const file = await newestPdf(out2);
        const checked = await verify(file.path, `${photoClient} – 2025 Binder`, null);
        sizes.push({ quality, bytes: file.bytes, pages: checked.pages, seconds: run.seconds });
        console.log(`      ${quality}: ${String(checked.pages)} pages, ${mb(file.bytes)}`);
      }
      const balanced = sizes.find((x) => x.quality === 'Balanced');
      check(
        (balanced?.bytes ?? Infinity) < 25 * 1024 * 1024,
        'a 100-photo binder is under 25 MB on Balanced',
      );
      await writeFile(
        resolve(root, 'docs/export-sizes.md'),
        [
          '# Binder file sizes',
          '',
          `${String(photos.length)} phone photos from the synthetic photo tier (12 MP, JPEG and HEIC), exported by the release app as one binder with cover and index. Generated by \`apps/desktop/scripts/e2e.ts\`.`,
          '',
          '| Preset | Pages | File size | Per page | Export time |',
          '|---|---|---|---|---|',
          ...sizes.map(
            (x) =>
              `| ${x.quality} | ${String(x.pages)} | ${mb(x.bytes)} | ${String(Math.round(x.bytes / x.pages / 1024))} KB | ${x.seconds.toFixed(1)} s |`,
          ),
          '',
          `Mixed binder (digital, scanned and photo pages, ${String(result.pages)} pages, Balanced): ${mb(binder.bytes)}.`,
          '',
        ].join('\n'),
      );
    }

    // ---- Settings, the missing-documents check, and both surviving a restart.
    await mkdir(settingsShots, { recursive: true });
    const firm = 'Example Tax Co.';
    const template = '{year} {form} – {issuer}';
    await clickText('Settings');
    check(await waitFor('Firm profile'), 'settings show the firm profile');
    await typeInto('input[placeholder="Example Tax Co."]', firm);
    await press('');
    check(await waitFor('Saved', 5000), 'the firm name saves');
    const logo = join(data, 'firm-logo.svg');
    await writeFile(
      logo,
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60"><rect width="60" height="60" rx="8" fill="#111"/><rect x="76" y="14" width="150" height="10" fill="#111"/><rect x="76" y="36" width="100" height="10" fill="#777"/></svg>',
    );
    await clickText('Choose logo');
    await pickPath('Choose your firm logo', logo, false);
    const logoShown = async () => {
      for (let end = Date.now() + 8000; Date.now() < end; await sleep(300))
        if (await exec<boolean>('return !!document.querySelector("img[alt=\'Firm logo\']")'))
          return true;
      return false;
    };
    check(await logoShown(), 'an SVG logo is imported and previewed');
    await typeInto('input[aria-describedby$="-preview"]', template);
    check(
      await waitFor('Example: 2025 W-2 – Northwind Logistics LLC', 5000),
      'the name template previews live',
    );
    await sleep(1200);
    for (let i = 0; i < 4; i++)
      await exec(
        'document.querySelector("[aria-label=\'Move Retirement & Social Security up\']").click()',
      );
    await clickText('Compact');
    await choose('select', 'tesseract');
    const settled = async () => {
      await exec('document.querySelector("main .overflow-y-auto")?.scrollTo(0, 0)');
      await sleep(700);
    };
    check(
      await exec<boolean>(
        'return [document.scrollingElement, document.body, document.getElementById("root"), document.querySelector("main")].every(e => !e || e.scrollTop === 0)',
      ),
      `the app shell never scrolls as a whole (only panes do) ${await exec<string>('const out = []; for (const e of document.querySelectorAll("*")) if (e.scrollTop > 0) out.push(e.tagName + "." + String(e.className).slice(0, 60) + "=" + e.scrollTop + " overflow:" + getComputedStyle(e).overflowY); return document.scrollingElement.tagName + "=" + document.scrollingElement.scrollTop + " " + out.join(" | ")')}`,
    );
    await click('label[title=Dark]');
    await settled();
    await shot('01-settings-dark', settingsShots);
    await click('label[title=Light]');
    await settled();
    await shot('01-settings-light', settingsShots);
    await click('label[title=Dark]');

    // Two tax years for one client: 2024 exported first, then 2025 arrives incomplete.
    const twoYearDir = join(corpus, 'two-year');
    const twoYear = JSON.parse(
      await readFile(join(twoYearDir, 'manifest.json'), 'utf8'),
    ) as TwoYearManifest;
    const yearFiles = (y: number) =>
      (twoYear.years.find((x) => x.taxYear === y)?.files ?? []).map((f) => join(twoYearDir, f));
    const labels: Record<string, string> = {
      'w-2': 'Form W-2',
      '1099-div': 'Form 1099-DIV',
      'k-1-1065': 'Schedule K-1 (Form 1065)',
    };
    const expected = twoYear.expectedMissing.map(
      (m) => `${labels[m.formType] ?? m.formType} from ${m.issuerName}`,
    );
    const startBinder = async (existing: boolean, year: number) => {
      await clickText('Current binder');
      await clickText('Start next binder');
      if (!(await waitFor('Who is this binder for?'))) throw new Error('New binder did not open');
      if (existing) await clickText(twoYear.client);
      else {
        await clickText('+ Add a new client');
        await typeName(twoYear.client);
      }
      await choose('select', String(year));
      await clickText('Start empty binder');
      await waitFor('Add documents to begin');
      await drop(yearFiles(year));
      return waitFor(/\d+ documents · \d+ pages/, 300000);
    };
    const missingList = () =>
      exec<string[]>(
        'return [...document.querySelectorAll("ul[aria-label=\'Missing documents\'] li p")].map(p => p.textContent)',
      );
    check(await startBinder(false, 2024), 'the 2024 binder is reviewed');
    check(
      !(await text()).includes('Missing from'),
      'a client with no history shows no missing list',
    );
    const out3 = join(data, 'out-two-year');
    await mkdir(out3, { recursive: true });
    check((await exportBinder({ folder: out3 })).ok, 'the 2024 binder exports');
    check(await startBinder(true, 2025), 'the 2025 binder is reviewed');
    check(
      await waitFor('Missing from 2024', 10000),
      'the 2025 binder shows what is missing from 2024',
    );
    const missing = await missingList();
    check(
      JSON.stringify([...missing].sort()) === JSON.stringify([...expected].sort()),
      `missing items match the scenario: ${missing.join('; ')}`,
    );
    await exec(
      '[...document.querySelectorAll("ul[aria-label=\'Missing documents\'] li")].find(li => li.textContent.includes("Schedule K-1")).querySelector("button").click()',
    );
    await sleep(400);
    check(
      (await missingList()).length === expected.length - 1,
      '"Not expected this year" removes an item',
    );
    await clickText('Copy missing-docs list');
    await sleep(400);
    const copied = execFileSync('xclip', ['-o', '-selection', 'clipboard']).toString();
    check(
      copied.startsWith('Hi Robin,') &&
        copied.includes('- Form W-2 from Testville Unified Schools') &&
        !copied.includes('K-1') &&
        copied.trimEnd().endsWith(firm),
      'the copied list is a friendly email without dismissed items, signed by the firm',
    );
    if (await exec<boolean>('return !!document.querySelector("[aria-label=\'Close page strip\']")'))
      await click('[aria-label="Close page strip"]');
    await exec('document.getElementById("missing-title")?.scrollIntoView({ block: "start" })');
    await sleep(700);
    await shot('02-missing-dark', settingsShots);
    await theme('light');
    await sleep(500);
    await shot('02-missing-light', settingsShots);
    await theme('dark');
    const exported2025 = await exportBinder({});
    check(exported2025.ok, 'the 2025 binder exports to the remembered folder');
    check(
      await waitFor('Copy missing-docs list (2)', 5000),
      'the export toast offers the missing-docs list',
    );
    await shot('03-export-toast-dark', settingsShots);
    const binder2025 = await newestPdf(out3);
    const checked2025 = await verify(binder2025.path, `${twoYear.client} – 2025 Binder`, null);
    const cover = await coverInfo(binder2025.path);
    check(cover.text.includes(firm) && cover.images > 0, 'the cover shows the firm name and logo');
    check(cover.text.includes('trial'), 'an unlicensed binder says so on the cover');
    const titles = checked2025.bookmarks.flatMap((b) => b.children.map((c) => c.title));
    check(
      titles.includes('2025 W-2 – Northwind Logistics LLC'),
      'documents are named with the custom template',
    );
    check(
      checked2025.bookmarks.filter((b) => b.children.length)[0]?.title ===
        'Retirement & Social Security' || !titles.some((t) => /SSA|RRB|1099-R|5498/.test(t)),
      'the binder follows the firm’s category order',
    );
    execFileSync('pdftoppm', [
      '-f',
      '1',
      '-l',
      '1',
      '-r',
      '80',
      '-png',
      '-singlefile',
      binder2025.path,
      join(settingsShots, '04-cover-with-logo'),
    ]);

    // Restart the app: everything above must still be there.
    await wd('DELETE', `/session/${session}`);
    session = '';
    await sleep(1500);
    await startApp();
    check(await waitFor('Start with a client’s documents.'), 'the app restarts');
    check(
      (await exec<string | null>('return document.documentElement.dataset.theme ?? null')) ===
        'dark',
      'the theme persists',
    );
    await clickText('Settings');
    await waitFor('Firm profile');
    check(
      (await exec<string>(
        'return document.querySelector("input[placeholder=\'Example Tax Co.\']").value',
      )) === firm,
      'the firm name persists',
    );
    check(await logoShown(), 'the logo persists');
    check(
      (await exec<string>(
        'return document.querySelector("input[aria-describedby$=\'-preview\']").value',
      )) === template,
      'the name template persists',
    );
    check(
      (
        await exec<string>(
          'return document.querySelector("ol[aria-label=\'Category order\'] li")?.textContent ?? ""',
        )
      ).includes('Retirement & Social Security'),
      'the binder order persists',
    );
    check(
      await exec<boolean>(
        'return document.querySelector("input[name=quality][value=compact]").checked',
      ),
      'the quality preset persists',
    );
    check(
      (await exec<string>('return document.querySelector("select").value')) === 'tesseract',
      'the OCR engine choice persists',
    );
    await clickText('New binder');
    await waitFor('Who is this binder for?');
    await clickText(twoYear.client);
    await choose('select', '2025');
    await clickText('Start empty binder');
    await waitFor('Add documents to begin');
    await drop(yearFiles(2025));
    await waitFor(/\d+ documents · \d+ pages/, 300000);
    await waitFor('Missing from 2024', 10000);
    check(
      (await missingList()).length === expected.length - 1 &&
        (await text()).includes('Not expected this year'),
      `the "Not expected this year" choice persists (${(await missingList()).join('; ')})`,
    );

    // The trial: three binders were exported (Jane 2025, Robin 2024, Robin 2025); a fourth is refused.
    check((await text()).includes('Trial used'), 'the sidebar shows the trial is used up');
    // Close the unexported binder from before the restart (it asks first).
    await chord('\uE009', 'k');
    await exec(
      '[...document.querySelectorAll("[role=option]")].find(o => o.textContent.includes("Close binder"))?.click()',
    );
    check(await confirmNative('Close binder'), 'closing an unexported binder asks first');
    await clickText('New binder');
    await waitFor('Who is this binder for?');
    await clickText('+ Add a new client');
    await typeName('Avery Fakename');
    await clickText('Start empty binder');
    await waitFor('Add documents to begin');
    await drop(yearFiles(2025).slice(0, 1));
    await waitFor(/\d+ documents · \d+ pages/, 120000);
    await chord('\uE009', 'e');
    await waitFor('Binder order', 5000);
    await clickText('Choose');
    const out4 = join(data, 'out-trial');
    await mkdir(out4, { recursive: true });
    await pickFolder(out4);
    await waitFor(out4, 10000);
    await click('dialog button[type=submit]');
    check(
      await waitFor('The trial includes 3 client binders', 10000),
      'a fourth binder is refused with a clear message',
    );
    check((await readdir(out4)).length === 0, 'nothing is written when the trial is used up');
    await shot('05-trial-over-dark', settingsShots);
    await clickText('Enter a license key');
    check(await waitFor('3 of 3 used', 5000), 'the license section shows the trial count');
    await exec('document.getElementById("license")?.scrollIntoView({ block: "start" })');
    await sleep(500);
    await shot('06-license-dark', settingsShots);

    // Delete all local history, through the real confirmation dialog.
    await clickText('Settings');
    await waitFor('Local history');
    await clickText('Delete all local history');
    check(
      await confirmNative('Delete all local history'),
      'deleting history asks for confirmation',
    );
    check(await waitFor('History deleted', 10000), 'history is deleted after confirming');
    await clickText('Clients');
    await sleep(500);
    check(
      !(await text()).includes(twoYear.client),
      'the client list is empty after deleting history',
    );
    check((await text()).includes('Trial used'), 'deleting history doesn’t reset the trial');
  } finally {
    if (session) await wd('DELETE', `/session/${session}`).catch(() => undefined);
    driver.kill();
    // The app may still be flushing its database as it exits.
    if (driver.exitCode === null) await new Promise((r) => driver.once('exit', r));
    await rm(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
  if (failures.length) {
    console.error(`\n${String(failures.length)} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed');
  }
}

await main();
