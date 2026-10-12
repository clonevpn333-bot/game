#!/usr/bin/env node
// Renders preview images of props, Nana Nova and generated maps from the game's own recipe data.
// Usage: node render.js <workDir containing data.json + node_modules> <outDir>
// (data.json comes from: SPEC_DIR=tools/preview node tools/test.js > raw.txt)

const http = require("http");
const fs = require("fs");
const path = require("path");

const work = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const { chromium } = require(path.join(work, "node_modules", "playwright-core"));
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, "render.html"), path.join(work, "render.html"));

const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const file = path.join(work, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(work) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const shots = [
  ["map", "kitchen_overview", "mode=map&kit=KitchenCounter&view=overview&title=Kitchen%20Counter%20-%20generated%20map"],
  ["map", "kitchen_spawn", "mode=map&kit=KitchenCounter&view=spawn&title=Kitchen%20Counter%20-%20spawn%20view"],
  ["map", "backyard_overview", "mode=map&kit=BackyardBBQ&view=overview&title=Backyard%20BBQ%20-%20generated%20map"],
  ["map", "candy_overview", "mode=map&kit=CandyShop&view=overview&title=Candy%20Shop%20-%20generated%20map"],
  ["nana", "nana_nova", "mode=nana"],
  ["gallery", "props_kitchen_1", "mode=gallery&kit=KitchenCounter&page=0&title=Kitchen%20Counter%20props%20(smallest)"],
  ["gallery", "props_kitchen_3", "mode=gallery&kit=KitchenCounter&page=3&title=Kitchen%20Counter%20props%20(biggest)"],
  ["gallery", "props_backyard_2", "mode=gallery&kit=BackyardBBQ&page=1&title=Backyard%20BBQ%20props"],
  ["gallery", "props_candy_2", "mode=gallery&kit=CandyShop&page=1&title=Candy%20Shop%20props"],
];

server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  for (const [, name, query] of shots) {
    await page.goto(`http://localhost:${port}/render.html?${query}`);
    await page.waitForSelector("body[data-done='1']", { timeout: 180000 });
    await page.screenshot({ path: path.join(outDir, name + ".png") });
    console.log("rendered", name);
  }
  await browser.close();
  server.close();
});
