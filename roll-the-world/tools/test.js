#!/usr/bin/env node
// Headless test runner for pure-Luau game logic.
//
// Copies src/shared into a build folder mirroring the Rojo instance tree, injects a tiny shim so
// `require(script.Parent.X)` and `game:GetService(...)` resolve to files, stubs the few Roblox
// datatypes config modules touch (Color3, Font, Enum...), then runs every tests/*.spec.luau with
// the standalone `luau` CLI. Usage: node tools/test.js [path/to/luau]

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const build = path.join(root, ".testbuild");
const luau = process.argv[2] || process.env.LUAU || "luau";

fs.rmSync(build, { recursive: true, force: true });

// Every copied module pulls the shim environment in as locals (the CLI sandboxes globals).
const SHIM_NAMES = "script, require, game, Color3, Font, UDim, UDim2, TweenInfo, Enum, warn, task, typeof, describe, it, expect";
const HEADER = (virtualPath, fileDir) => {
  let rel = path.relative(fileDir, path.join(build, "prelude")).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return `local ${SHIM_NAMES} = require(${JSON.stringify(rel)}).env(${JSON.stringify(virtualPath)}); `;
};

function copyTree(srcDir, virtualDir) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(src, `${virtualDir}/${entry.name}`);
      continue;
    }
    if (!entry.name.endsWith(".luau") || /\.(server|client)\.luau$/.test(entry.name)) continue;
    const isInit = entry.name === "init.luau";
    const moduleVirtual = isInit ? virtualDir : `${virtualDir}/${entry.name.replace(/\.luau$/, "")}`;
    const outFile = path.join(build, virtualDir, entry.name);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    let source = fs.readFileSync(src, "utf8");
    // Keep a leading --!strict/--!nonstrict directive on line 1 so the header doesn't disable it.
    let directive = "";
    const m = source.match(/^(--![a-z]+[^\n]*\n)/);
    if (m) {
      directive = m[1];
      source = source.slice(m[1].length);
    }
    // For init.luau the module *is* the folder, so relative requires resolve from its parent.
    const resolveDir = isInit ? path.dirname(path.dirname(outFile)) : path.dirname(outFile);
    fs.writeFileSync(outFile, directive + HEADER(moduleVirtual, resolveDir) + source);
  }
}

copyTree(path.join(root, "src", "shared"), "ReplicatedStorage/Shared");
if (fs.existsSync(path.join(root, "src", "server"))) {
  copyTree(path.join(root, "src", "server"), "ServerScriptService/Server");
}

// Specs live at <build>/Tests/<name>.
// SPEC_DIR lets tools (e.g. the preview exporter) reuse the same shimmed environment.
const specDir = process.env.SPEC_DIR ? path.resolve(process.env.SPEC_DIR) : path.join(root, "tests");
const specs = fs.readdirSync(specDir).filter((f) => f.endsWith(".spec.luau")).sort();
fs.mkdirSync(path.join(build, "Tests"), { recursive: true });
for (const spec of specs) {
  const source = fs.readFileSync(path.join(specDir, spec), "utf8");
  fs.writeFileSync(path.join(build, "Tests", spec), HEADER(`Tests/${spec.replace(/\.luau$/, "")}`, path.join(build, "Tests")) + source + "\nreturn {}\n");
}

fs.copyFileSync(path.join(root, "tests", "prelude.luau"), path.join(build, "prelude.luau"));
const runner = [
  'local P = require("./prelude")',
  ...specs.map((s) => `P.runSpec(${JSON.stringify(s)}, function() require("./Tests/${s.replace(/\.luau$/, "")}") end)`),
  "P.finish()",
].join("\n");
fs.writeFileSync(path.join(build, "runner.luau"), runner);

const result = spawnSync(luau, [path.join(build, "runner.luau")], { stdio: "inherit", cwd: build });
process.exit(result.status === null ? 1 : result.status);
