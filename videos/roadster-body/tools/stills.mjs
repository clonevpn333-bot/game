// node tools/stills.mjs <Comp> <out-dir> <t1,t2,...> [scale] — bundles once, renders stills at times (s), tiles a sheet.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path"; import fs from "node:fs"; import { execSync } from "node:child_process";
const [comp, out, times, scale = "0.3", cols = "6"] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../remotion");
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: { score: false } });
const ts = times.split(",").map(Number); const files = [];
const opts = { browserExecutable: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", chromiumOptions: { gl: "swangle" } };
for (const t of ts) { const f = path.join(out, `t${t.toFixed(2)}.png`); const t0 = Date.now(); await renderStill({ composition, serveUrl, output: f, frame: Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)), inputProps: { score: false }, ...opts }); files.push(f); console.log(t, Date.now() - t0, "ms"); }
const c = Math.min(+cols, files.length), w = Math.round(1080 * +scale);
execSync(`ffmpeg -y -loglevel error ${files.map((f) => `-i ${f}`).join(" ")} -filter_complex "${files.map((_, i) => `[${i}]scale=${w}:-1,drawtext=text='${ts[i]}':x=8:y=8:fontsize=28:fontcolor=white:box=1:boxcolor=black[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % c) ? Array.from({ length: i % c }, () => "w0").join("+") : "0"}_${Math.floor(i / c) ? Array.from({ length: Math.floor(i / c) }, () => "h0").join("+") : "0"}`).join("|")}:fill=black" ${path.join(out, "sheet.png")}`);
console.log("sheet ->", path.join(out, "sheet.png"));
