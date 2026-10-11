/**
 * Third-party notices for everything the desktop app ships: Rust crates linked into
 * the Windows and macOS builds (normal dependencies only, from `cargo metadata`), the
 * frontend's production npm packages, and the native libraries and data bundled with
 * the installers. Writes:
 *   src/generated/third-party.json         summary shown in Settings → About
 *   src-tauri/resources/third-party-notices.txt   full license texts, bundled with the app
 *
 *   node scripts/licenses.ts           regenerate
 *   node scripts/licenses.ts --check   exit 1 if the committed files are out of date (CI)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const manifest = join(root, 'src-tauri/Cargo.toml');
const summaryPath = join(root, 'src/generated/third-party.json');
const noticesPath = join(root, 'src-tauri/resources/third-party-notices.txt');
/** The platforms installers are built for. */
const TARGETS = ['x86_64-pc-windows-msvc', 'aarch64-apple-darwin', 'x86_64-apple-darwin'];
const OWN = new Set(['binderready', 'native-ocr']);

export interface Component {
  name: string;
  version: string;
  license: string;
  source: string;
  kind: 'rust' | 'npm' | 'native';
}

/**
 * Bundled with the installers but not managed by cargo or npm. License names are the
 * projects' own; their texts are included from the URLs below at release time by the
 * packaging workflow (see release.yml) and summarized here.
 */
const NATIVE: (Component & { notice: string })[] = [
  {
    name: 'Tesseract OCR',
    version: '5',
    license: 'Apache-2.0',
    source: 'https://github.com/tesseract-ocr/tesseract',
    kind: 'native',
    notice:
      'Licensed under the Apache License, Version 2.0. https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    name: 'Tesseract English language data (tessdata_fast)',
    version: '4.1',
    license: 'Apache-2.0',
    source: 'https://github.com/tesseract-ocr/tessdata_fast',
    kind: 'native',
    notice:
      'Licensed under the Apache License, Version 2.0. https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    name: 'Leptonica',
    version: '1.8x',
    license: 'BSD-2-Clause',
    source: 'http://www.leptonica.org/',
    kind: 'native',
    notice:
      'Copyright (C) 2001-2024 Leptonica. Redistribution under the Leptonica license (BSD 2-clause style). http://www.leptonica.org/about-the-license.html',
  },
  {
    name: 'PDFium (binaries by bblanchon/pdfium-binaries)',
    version: 'chromium/8086',
    license: 'BSD-3-Clause',
    source: 'https://pdfium.googlesource.com/pdfium/',
    kind: 'native',
    notice:
      'Copyright 2014 The PDFium Authors. Redistribution under the BSD 3-Clause license; some components under Apache-2.0 and other permissive licenses (see the LICENSE file in the PDFium source).',
  },
  {
    name: 'libheif',
    version: '1.17+',
    license: 'LGPL-3.0-or-later',
    source: 'https://github.com/strukturag/libheif',
    kind: 'native',
    notice:
      'Copyright (c) struktur AG. Licensed under the GNU Lesser General Public License v3. Shipped as a separate dynamic library that can be replaced. https://www.gnu.org/licenses/lgpl-3.0.html',
  },
  {
    name: 'libde265',
    version: '1.0',
    license: 'LGPL-3.0-or-later',
    source: 'https://github.com/strukturag/libde265',
    kind: 'native',
    notice:
      'Copyright (c) struktur AG. Licensed under the GNU Lesser General Public License v3. Shipped as a separate dynamic library that can be replaced. https://www.gnu.org/licenses/lgpl-3.0.html',
  },
  {
    name: 'Geist and Geist Mono fonts',
    version: '1',
    license: 'OFL-1.1',
    source: 'https://github.com/vercel/geist-font',
    kind: 'native',
    notice:
      'Copyright (c) 2023 Vercel, in collaboration with basement.studio. SIL Open Font License, Version 1.1. https://openfontlicense.org',
  },
];

interface CargoPackage {
  id: string;
  name: string;
  version: string;
  license: string | null;
  repository: string | null;
  manifest_path: string;
}
interface CargoNode {
  id: string;
  deps: { pkg: string; dep_kinds: { kind: string | null }[] }[];
}

function rustComponents(): { component: Component; dir: string }[] {
  const found = new Map<string, { component: Component; dir: string }>();
  for (const target of TARGETS) {
    const meta = JSON.parse(
      execFileSync(
        'cargo',
        [
          'metadata',
          '--format-version',
          '1',
          '--locked',
          '--filter-platform',
          target,
          '--manifest-path',
          manifest,
        ],
        { maxBuffer: 256 * 1024 * 1024 },
      ).toString(),
    ) as { packages: CargoPackage[]; resolve: { root: string; nodes: CargoNode[] } };
    const packages = new Map(meta.packages.map((p) => [p.id, p]));
    const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
    // Normal (linked) dependencies only: build scripts and dev-dependencies aren't shipped.
    const queue = [meta.resolve.root];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.pop() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const dep of nodes.get(id)?.deps ?? []) {
        if (dep.dep_kinds.some((k) => k.kind === null)) queue.push(dep.pkg);
      }
    }
    for (const id of seen) {
      const p = packages.get(id);
      if (!p || OWN.has(p.name)) continue;
      found.set(`${p.name}@${p.version}`, {
        component: {
          name: p.name,
          version: p.version,
          license: p.license ?? 'see license file',
          source: p.repository ?? `https://crates.io/crates/${p.name}`,
          kind: 'rust',
        },
        dir: dirname(p.manifest_path),
      });
    }
  }
  return [...found.values()];
}

interface PnpmLicense {
  name: string;
  versions: string[];
  paths: string[];
  license: string;
  homepage?: string;
}

function npmComponents(): { component: Component; dir: string }[] {
  const out = execFileSync(
    'pnpm',
    ['licenses', 'list', '--prod', '--json', '--filter', '@binderready/desktop'],
    {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    },
  ).toString();
  const byLicense = JSON.parse(out) as Record<string, PnpmLicense[]>;
  return Object.values(byLicense)
    .flat()
    .filter((p) => !p.name.startsWith('@binderready/'))
    .flatMap((p) =>
      p.versions.map((version, i) => ({
        component: {
          name: p.name,
          version,
          license: p.license,
          source: p.homepage ?? `https://www.npmjs.com/package/${p.name}`,
          kind: 'npm' as const,
        },
        dir: p.paths[i] ?? p.paths[0] ?? '',
      })),
    );
}

/** LICENSE / COPYING / NOTICE files shipped in a package directory. */
function licenseTexts(dir: string): string {
  if (!dir || !existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((f) => /^(licen[cs]e|copying|notice)/i.test(f))
    .sort()
    .map((f) => {
      try {
        return readFileSync(join(dir, f), 'utf8').trim();
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Components sharing an identical license text are listed together, the text once. */
function grouped(entries: { component: Component; dir: string }[]) {
  const groups = new Map<string, Component[]>();
  for (const { component, dir } of entries) {
    const text = licenseTexts(dir) || `Licensed under ${component.license}.`;
    groups.set(text, [...(groups.get(text) ?? []), component]);
  }
  return [...groups].map(([text, components]) => ({ text, components }));
}

export function build() {
  const entries = [...rustComponents(), ...npmComponents()].sort((a, b) =>
    `${a.component.kind}${a.component.name}`.localeCompare(
      `${b.component.kind}${b.component.name}`,
    ),
  );
  const summary: Component[] = [
    ...NATIVE.map(({ name, version, license, source, kind }) => ({
      name,
      version,
      license,
      source,
      kind,
    })),
    ...entries.map((e) => e.component),
  ];
  const rule = '-'.repeat(78);
  const notices = [
    'Third-party software notices',
    '',
    'This application includes the open-source components listed below. Each is',
    'used under its own license, reproduced or referenced here.',
    '',
    ...NATIVE.flatMap((n) => [
      rule,
      `${n.name} ${n.version} — ${n.license}`,
      n.source,
      '',
      n.notice,
      '',
    ]),
    ...grouped(entries).flatMap(({ text, components }) => [
      rule,
      ...components.map((c) => `${c.name} ${c.version} — ${c.license} — ${c.source}`),
      '',
      text,
      '',
    ]),
  ].join('\n');
  return { summary: `${JSON.stringify(summary, null, 2)}\n`, notices };
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const { values } = parseArgs({ options: { check: { type: 'boolean' } } });
  const { summary, notices } = build();
  if (values.check) {
    const current = await readFile(summaryPath, 'utf8').catch(() => '');
    if (current !== summary) {
      console.error(
        'Third-party notices are out of date: run `node scripts/licenses.ts` in apps/desktop.',
      );
      process.exitCode = 1;
    } else console.log('Third-party notices are up to date.');
  } else {
    await mkdir(dirname(summaryPath), { recursive: true });
    await mkdir(dirname(noticesPath), { recursive: true });
    await writeFile(summaryPath, summary);
    await writeFile(noticesPath, notices);
    const count = (JSON.parse(summary) as Component[]).length;
    console.log(
      `${String(count)} components → ${summaryPath}\n${String(notices.length)} bytes → ${noticesPath}`,
    );
  }
}
