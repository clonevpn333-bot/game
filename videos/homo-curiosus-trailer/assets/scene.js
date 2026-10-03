// HOMO CURIOSUS — channel trailer. A trip through 40,000 years of human image-making:
// cave paint → engraved star chart → da Vinci sketchbook → 1900s film → 8-bit pixels → cel-shaded 3D
// → kinetic type → the spark → the title. 2D eras are painted procedurally on a canvas; the 3D era is Three.js.
import {
  THREE, W, H, clamp, lerp, seg, eio, eo, eo5, ei, back, jiggle, rng, V3, vlerp,
  makeRenderer, INK, withInk, inkMat, canvasTex, makeCamera, aim,
} from "./lib.js";

const TOTAL = window.TIMING.total;
const c2 = document.getElementById("c2d");
const g = c2.getContext("2d");
const glCanvas = document.getElementById("gl");

// ------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;
function off(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
const bump = (t, at, w) => Math.max(0, 1 - Math.abs(t - at) / w); // triangle pulse around a cut
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function strokeLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
// draw the first `k` (0..1) of a polyline
function partial(ctx, pts, k) {
  if (k <= 0) return;
  const L = strokeLen(pts) * k;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= L) {
      const f = (L - acc) / d;
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      break;
    }
    ctx.lineTo(pts[i][0], pts[i][1]);
    acc += d;
  }
  ctx.stroke();
}
const arcPts = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(lerp(a0, a1, i / n)) * r, cy + Math.sin(lerp(a0, a1, i / n)) * r]);

// ================================================================== A · CAVE (0 – 5.1)
const rock = off(W, H, (c, w, h) => {
  const gr = c.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#4a2f1c");
  gr.addColorStop(0.5, "#6b4528");
  gr.addColorStop(1, "#3a2414");
  c.fillStyle = gr;
  c.fillRect(0, 0, w, h);
  const r = rng(3);
  for (let i = 0; i < 260; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 40 + r() * 260;
    const gg = c.createRadialGradient(x, y, 0, x, y, rad);
    const light = r() > 0.5;
    gg.addColorStop(0, light ? `rgba(190,140,90,${0.08 + r() * 0.12})` : `rgba(30,15,5,${0.1 + r() * 0.15})`);
    gg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  c.strokeStyle = "rgba(25,12,4,0.5)";
  for (let i = 0; i < 26; i++) {
    let x = r() * w;
    let y = r() * h;
    c.lineWidth = 1 + r() * 3;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      x += (r() - 0.5) * 70;
      y += r() * 50;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = r() > 0.5 ? "rgba(255,230,190,0.06)" : "rgba(0,0,0,0.08)";
    c.fillRect(r() * w, r() * h, 2, 2);
  }
});
function handPath(cx, cy, s) {
  // stylised human hand: palm + 5 rounded fingers (Path2D, used for both stencil test and drawing)
  const p = new Path2D();
  p.ellipse(cx, cy + 40 * s, 120 * s, 140 * s, 0, 0, TAU);
  const fingers = [
    [-150, -40, 0.9, 42, -0.9], // thumb
    [-78, -170, 1.05, 34, -0.18],
    [-8, -205, 1.15, 35, -0.04],
    [62, -190, 1.08, 34, 0.1],
    [122, -140, 0.85, 30, 0.28],
  ];
  fingers.forEach(([dx, dy, len, w, rot]) => {
    p.ellipse(cx + dx * s, cy + dy * s, w * s, 95 * len * s, rot, 0, TAU);
  });
  return p;
}
const HAND = { cx: 540, cy: 760, s: 1.25 };
const handP = handPath(HAND.cx, HAND.cy, HAND.s);
const spray = (() => {
  const r = rng(11);
  const dots = [];
  const tmp = document.createElement("canvas").getContext("2d");
  for (let i = 0; i < 20000 && dots.length < 7000; i++) {
    const a = r() * TAU;
    const rr = Math.pow(r(), 0.75) * 480;
    const x = HAND.cx + Math.cos(a) * rr * 0.85;
    const y = HAND.cy - 40 + Math.sin(a) * rr;
    if (tmp.isPointInPath(handP, x, y)) continue;
    dots.push({ x, y, r: 2 + r() * 6 * (1 - rr / 560), a: 0.45 + r() * 0.55 * (1 - rr / 620), t: 2.6 + (rr / 520) * 0.9 + r() * 0.25 });
  }
  return dots;
})();
// three-frame horse run cycle drawn with jittered "paint" passes
function horse(ctx, x, y, s, frame, col) {
  const legs = [
    [[-0.5, 0.35], [0.45, -0.2], [-0.2, 0.5], [0.6, -0.35]],
    [[0.1, -0.1], [0.0, 0.1], [0.35, -0.2], [-0.25, 0.25]],
    [[0.5, -0.4], [-0.45, 0.25], [0.6, -0.1], [-0.6, 0.4]],
  ][frame];
  for (let pass = 0; pass < 3; pass++) {
    const j = (pass - 1) * 2.5;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.globalAlpha = pass === 1 ? 0.85 : 0.35;
    ctx.beginPath();
    ctx.ellipse(x + j, y + j, 110 * s, 48 * s, -0.05, 0, TAU);
    ctx.fill();
    ctx.beginPath(); // neck + head
    ctx.moveTo(x - 80 * s, y - 20 * s);
    ctx.quadraticCurveTo(x - 130 * s, y - 90 * s, x - 175 * s + j, y - 95 * s);
    ctx.lineTo(x - 195 * s, y - 70 * s);
    ctx.quadraticCurveTo(x - 140 * s, y - 50 * s, x - 70 * s, y + 20 * s);
    ctx.fill();
    ctx.lineCap = "round";
    ctx.lineWidth = 15 * s;
    const hips = [[-70, 25], [-55, 25], [70, 25], [85, 25]];
    hips.forEach(([hx, hy], k) => {
      const [a1, a2] = legs[k];
      const kx = x + hx * s + Math.sin(a1) * 55 * s;
      const ky = y + hy * s + Math.cos(a1) * 55 * s;
      ctx.beginPath();
      ctx.moveTo(x + hx * s, y + hy * s);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.sin(a1 + a2) * 50 * s, ky + Math.cos(a1 + a2) * 50 * s);
      ctx.stroke();
    });
    ctx.lineWidth = 12 * s; // tail
    ctx.beginPath();
    ctx.moveTo(x + 105 * s, y - 15 * s);
    ctx.quadraticCurveTo(x + 160 * s, y - 10 * s + frame * 6, x + 175 * s, y + 50 * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawCave(t) {
  const zoom = lerp(1.0, 1.1, eio(seg(t, 0, 5.1)));
  g.save();
  g.translate(W / 2, H / 2);
  g.scale(zoom, zoom);
  g.translate(-W / 2, -H / 2);
  g.drawImage(rock, 0, 0);
  // faint ancient handprints of other people
  const olds = [
    [200, 380, 0.45, "rgba(150,50,30,0.25)"],
    [880, 330, 0.4, "rgba(40,20,10,0.3)"],
    [870, 1060, 0.5, "rgba(150,60,30,0.2)"],
  ];
  olds.forEach(([x, y, s, col]) => {
    g.fillStyle = col;
    g.fill(handPath(x, y, s));
  });
  // galloping horses (the first animation: a 3-pose cycle)
  const reveal = seg(t, 0.25, 1.6);
  g.save();
  g.beginPath();
  g.rect(0, 0, W * reveal * 1.2, H);
  g.clip();
  for (let k = 0; k < 3; k++) {
    const frame = Math.floor(t * 9 + k) % 3;
    const x = ((900 - t * 140 + k * 360) % 1300) + 40;
    horse(g, x, 1370 + k * 95 - (k === 1 ? 60 : 0), 0.85 - k * 0.12, frame, k === 1 ? "#2a160b" : "#7a2a18");
  }
  g.restore();
  // the hand stencil: ochre sprayed around a pressed hand
  spray.forEach((d) => {
    const k = seg(t, d.t, d.t + 0.18);
    if (k <= 0) return;
    g.fillStyle = `rgba(178,52,28,${d.a * k})`;
    g.beginPath();
    g.arc(d.x, d.y, d.r, 0, TAU);
    g.fill();
  });
  g.restore();
  // torch light flicker + darkness
  const fl = 0.86 + 0.08 * Math.sin(t * 13.3) + 0.05 * Math.sin(t * 31.7 + 1) + 0.03 * Math.sin(t * 57.1);
  const tg = g.createRadialGradient(540, 900, 50, 540, 950, 1250 * fl);
  tg.addColorStop(0, "rgba(255,180,90,0.28)");
  tg.addColorStop(0.6, "rgba(0,0,0,0)");
  tg.addColorStop(1, "rgba(0,0,0,0.6)");
  g.fillStyle = tg;
  g.fillRect(0, 0, W, H);
}

// ================================================================== B · STAR CHART (5.1 – 6.9)
const parchment = off(W, H, (c, w, h) => {
  c.fillStyle = "#e8d5a6";
  c.fillRect(0, 0, w, h);
  const r = rng(8);
  for (let i = 0; i < 120; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 30 + r() * 220;
    const gg = c.createRadialGradient(x, y, 0, x, y, rad);
    gg.addColorStop(0, `rgba(140,95,40,${0.05 + r() * 0.1})`);
    gg.addColorStop(1, "rgba(140,95,40,0)");
    c.fillStyle = gg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  c.strokeStyle = "rgba(120,80,30,0.08)";
  for (let i = 0; i < 400; i++) {
    c.lineWidth = 1;
    const x = r() * w;
    const y = r() * h;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 8);
    c.stroke();
  }
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(70,35,5,0.55)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
});
const STARS = [
  [540, 560], [700, 600], [610, 760], [520, 820], [470, 910], [600, 980], [690, 1180], [430, 1200], [560, 880],
];
const STAR_LINES = [[0, 2], [1, 2], [2, 8], [3, 8], [4, 3], [8, 5], [5, 6], [5, 7]];
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function drawStars(t) {
  g.drawImage(parchment, 0, 0);
  const lt = t - 5.1;
  const cx = 540;
  const cy = 880;
  // astrolabe rings, turning
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = "#5a3a14";
  [430, 380, 300].forEach((R, i) => {
    g.save();
    g.rotate((i % 2 ? -1 : 1) * lt * 0.25 + i);
    g.lineWidth = i === 0 ? 6 : 2.5;
    const k = eo(seg(t, 5.15 + i * 0.1, 5.8 + i * 0.1));
    g.beginPath();
    g.arc(0, 0, R, 0, TAU * k);
    g.stroke();
    for (let m = 0; m < 72; m++) {
      if (m / 72 > k) break;
      const a = (m / 72) * TAU;
      const tl = m % 6 === 0 ? 22 : 10;
      g.lineWidth = m % 6 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      g.lineTo(Math.cos(a) * (R - tl), Math.sin(a) * (R - tl));
      g.stroke();
    }
    g.restore();
  });
  // engraved hatching crescent
  g.save();
  g.beginPath();
  g.arc(-150, -220, 90, 0, TAU);
  g.clip();
  g.lineWidth = 2;
  for (let k = -120; k < 120; k += 9) {
    g.beginPath();
    g.moveTo(-250 + k, -320);
    g.lineTo(-50 + k, -120);
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.arc(-150, -220, 90, 0, TAU);
  g.stroke();
  g.restore();
  // constellation: lines etch on, gold stars pop
  g.strokeStyle = "#a8781f";
  g.lineWidth = 4;
  g.setLineDash([14, 8]);
  STAR_LINES.forEach(([a, b], i) => {
    const k = eio(seg(t, 5.35 + i * 0.09, 5.75 + i * 0.09));
    partial(g, [STARS[a], STARS[b]], k);
  });
  g.setLineDash([]);
  STARS.forEach(([x, y], i) => {
    const k = back(seg(t, 5.3 + i * 0.06, 5.6 + i * 0.06));
    if (k <= 0) return;
    g.fillStyle = "#e0b042";
    g.strokeStyle = "#5a3a14";
    g.lineWidth = 3;
    star(g, x, y, (i === 2 || i === 5 ? 34 : 22) * k);
  });
  g.fillStyle = "#4a2a0c";
  g.font = "700 64px Cinzel";
  g.textAlign = "center";
  g.globalAlpha = seg(t, 6.0, 6.3);
  g.fillText("ORION · VENATOR", cx, cy + 520);
  g.globalAlpha = 1;
}

// ================================================================== C · DA VINCI SKETCHBOOK (6.9 – 9.6)
const paper = off(W, H, (c, w, h) => {
  c.fillStyle = "#efdfb8";
  c.fillRect(0, 0, w, h);
  const r = rng(14);
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 40 + r() * 260;
    const gg = c.createRadialGradient(x, y, 0, x, y, rad);
    gg.addColorStop(0, `rgba(150,100,40,${0.04 + r() * 0.08})`);
    gg.addColorStop(1, "rgba(150,100,40,0)");
    c.fillStyle = gg;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(90,50,10,0.5)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
});
// the ornithopter as ordered ink strokes; wings are separate so they can flap
const ORN = (() => {
  const body = [];
  body.push([[380, 900], [470, 960], [610, 960], [700, 900]]); // hull
  body.push([[380, 900], [700, 900]]);
  body.push([[540, 900], [540, 800]]); // mast
  body.push(arcPts(540, 780, 28, 0, TAU, 24)); // pilot head
  body.push([[520, 808], [500, 870], [580, 870], [560, 808]]);
  // gears
  const gear = (cx, cy, R, n) => {
    const p = [];
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const rr = i % 2 ? R : R * 0.8;
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return p;
  };
  body.push(gear(450, 1040, 55, 10));
  body.push(gear(620, 1050, 40, 8));
  body.push(arcPts(450, 1040, 15, 0, TAU, 16));
  body.push(arcPts(620, 1050, 11, 0, TAU, 16));
  // hatching under the hull
  for (let k = 0; k < 9; k++) body.push([[420 + k * 28, 930], [445 + k * 28, 955]]);
  // wings: ribs radiating from a shoulder, membrane scallops
  const wing = (sx, dir) => {
    const ribs = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 - dir * (0.25 + i * 0.22);
      const L = 360 - i * 30;
      ribs.push([[sx, 860], [sx + Math.cos(a) * L * 0.55 * -dir * -1, 860 + Math.sin(a) * L * 0.55], [sx + Math.cos(a) * L * -dir * -1, 860 + Math.sin(a) * L]]);
    }
    const mem = [];
    for (let i = 0; i < 5; i++) {
      const p0 = ribs[i][2];
      const p1 = ribs[i + 1][2];
      mem.push([p0, [(p0[0] + p1[0]) / 2 + dir * 20, (p0[1] + p1[1]) / 2 + 30], p1]);
    }
    return { sx, ribs, mem };
  };
  const wl = wing(500, 1);
  const wr = wing(580, -1);
  return { body, wl, wr };
})();
function drawWing(ctx, w, k, flap) {
  const all = [...w.ribs, ...w.mem];
  ctx.save();
  ctx.translate(w.sx, 860);
  ctx.rotate(flap);
  ctx.translate(-w.sx, -860);
  all.forEach((s, i) => partial(ctx, s, clamp(k * all.length - i)));
  ctx.restore();
}
function drawSketch(t) {
  g.drawImage(paper, 0, 0);
  const lt = t - 6.9;
  const lift = eo(seg(t, 9.08, 9.6)) * 120;
  g.save();
  g.translate(0, -lift);
  g.strokeStyle = "#4a2a12";
  g.lineCap = "round";
  g.lineJoin = "round";
  g.lineWidth = 5;
  const kb = seg(t, 7.0, 8.4);
  ORN.body.forEach((s, i) => partial(g, s, clamp(kb * ORN.body.length - i)));
  const kw = seg(t, 7.6, 8.9);
  const flap = t > 9.05 ? Math.sin((t - 9.05) * 16) * 0.35 : 0;
  g.lineWidth = 4;
  drawWing(g, ORN.wl, kw, -flap);
  drawWing(g, ORN.wr, kw, flap);
  g.restore();
  // mirror-written notes in the margins (Leonardo wrote right-to-left)
  g.save();
  g.fillStyle = "rgba(74,42,18,0.85)";
  g.font = "700 46px Kalam";
  const notes = [["ali che battono", 160, 560], ["l'uomo volerà", 200, 1310], ["ingegno · moto", 760, 1420]];
  notes.forEach(([s, x, y], i) => {
    const k = seg(t, 7.2 + i * 0.4, 7.6 + i * 0.4);
    if (k <= 0) return;
    g.save();
    g.translate(x, y);
    g.scale(-1, 1);
    g.globalAlpha = k;
    g.fillText(s, -300, 0);
    g.restore();
  });
  g.restore();
  // ink speed lines when it lifts off
  if (t > 9.1) {
    g.strokeStyle = "rgba(74,42,18,0.6)";
    g.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const x = 380 + i * 40;
      g.beginPath();
      g.moveTo(x, 1080 - lift + 40);
      g.lineTo(x, 1080 - lift + 40 + 80 * seg(t, 9.1, 9.4));
      g.stroke();
    }
  }
}

// ================================================================== D · 1900s FILM (9.6 – 11.3)
const grain = Array.from({ length: 6 }, (_, k) =>
  off(540, 960, (c, w, h) => {
    const img = c.createImageData(w, h);
    const r = rng(100 + k);
    for (let i = 0; i < w * h; i++) {
      const v = Math.floor(r() * 255);
      img.data.set([v, v, v, 38], i * 4);
    }
    c.putImageData(img, 0, 0);
  }),
);
function plane(ctx, x, y, s, prop) {
  ctx.fillStyle = "#151515";
  ctx.strokeStyle = "#151515";
  ctx.lineWidth = 5 * s;
  ctx.fillRect(x - 230 * s, y - 74 * s, 460 * s, 24 * s); // top wing
  ctx.fillRect(x - 230 * s, y + 8 * s, 460 * s, 24 * s); // bottom wing
  ctx.beginPath(); // pilot lying on the lower wing
  ctx.arc(x - 20 * s, y - 2 * s, 14 * s, 0, TAU);
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 70 * s, y - 56 * s);
    ctx.lineTo(x + i * 70 * s, y + 10 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 260 * s, y - 20 * s);
  ctx.lineTo(x - 330 * s, y - 20 * s);
  ctx.stroke();
  ctx.fillRect(x - 350 * s, y - 50 * s, 18 * s, 60 * s); // front elevator
  ctx.fillRect(x + 250 * s, y - 60 * s, 12 * s, 90 * s); // rudder
  ctx.beginPath();
  ctx.moveTo(x + 230 * s, y - 20 * s);
  ctx.lineTo(x + 250 * s, y - 20 * s);
  ctx.stroke();
  [-60, 60].forEach((dx) => {
    ctx.save();
    ctx.translate(x + dx * s, y - 22 * s);
    ctx.scale(1, Math.abs(Math.cos(prop)));
    ctx.fillRect(-6 * s, -50 * s, 12 * s, 100 * s);
    ctx.restore();
  });
}
function drawFilm(t) {
  const frame = Math.floor(t * 24);
  const weave = [(hash(frame) - 0.5) * 8, (hash(frame + 7) - 0.5) * 10];
  const flick = 0.85 + hash(frame + 3) * 0.15;
  g.save();
  g.translate(weave[0], weave[1]);
  if (t < 10.05) {
    // intertitle card
    g.fillStyle = "#0e0e0e";
    g.fillRect(-20, -20, W + 40, H + 40);
    g.strokeStyle = "#d8d2c4";
    g.lineWidth = 8;
    g.strokeRect(120, 640, 840, 640);
    g.lineWidth = 3;
    g.strokeRect(150, 670, 780, 580);
    [[150, 670], [930, 670], [150, 1250], [930, 1250]].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x, y, 34, 0, TAU);
      g.stroke();
    });
    g.fillStyle = "#e8e2d4";
    g.textAlign = "center";
    g.font = "400 210px 'IM Fell English'";
    g.fillText("1903", 540, 1030);
    g.font = "400 60px 'IM Fell English'";
    g.fillText("~ Kitty Hawk ~", 540, 1150);
  } else {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#9a9a9a");
    sky.addColorStop(0.7, "#d6d6d6");
    sky.addColorStop(1, "#bdbdbd");
    g.fillStyle = sky;
    g.fillRect(-20, -20, W + 40, H + 40);
    g.fillStyle = "#6e6e6e";
    g.beginPath();
    g.moveTo(-20, 1450);
    for (let x = -20; x <= W + 20; x += 40) g.lineTo(x, 1420 + Math.sin(x * 0.006) * 60 + Math.sin(x * 0.017) * 20);
    g.lineTo(W + 20, H + 20);
    g.lineTo(-20, H + 20);
    g.fill();
    g.fillStyle = "#3e3e3e";
    g.beginPath();
    g.moveTo(-20, 1600);
    for (let x = -20; x <= W + 20; x += 40) g.lineTo(x, 1590 + Math.sin(x * 0.004 + 2) * 40);
    g.lineTo(W + 20, H + 20);
    g.lineTo(-20, H + 20);
    g.fill();
    const k = seg(t, 10.05, 11.3);
    const px = lerp(-300, 1350, k);
    const py = lerp(1400, 820, eo(k)) + Math.sin(t * 9) * 8;
    g.save();
    g.translate(px, py);
    g.transform(1, -0.22, 0.35, 0.8, 0, 0); // three-quarter view, climbing
    plane(g, 0, 0, 1.1, t * 40);
    g.restore();
  }
  g.restore();
  // film artefacts
  g.globalAlpha = 1;
  g.drawImage(grain[frame % 6], 0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 3; i++) {
    if (hash(frame * 3 + i) < 0.45) continue;
    const x = hash(frame * 5 + i) * W;
    g.lineWidth = 1 + hash(frame + i) * 2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (hash(i + frame) - 0.5) * 30, H);
    g.stroke();
  }
  g.fillStyle = "rgba(0,0,0,0.6)";
  for (let i = 0; i < 6; i++) {
    if (hash(frame * 11 + i) < 0.5) continue;
    g.beginPath();
    g.arc(hash(frame * 13 + i) * W, hash(frame * 17 + i) * H, 2 + hash(i) * 5, 0, TAU);
    g.fill();
  }
  g.fillStyle = `rgba(0,0,0,${1 - flick})`;
  g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  // iris in / out
  const iris = Math.min(eo(seg(t, 9.6, 9.8)), 1 - ei(seg(t, 11.12, 11.3)));
  if (iris < 1) {
    g.fillStyle = "#000";
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(W / 2, H / 2, Math.max(1, iris * 1200), 0, TAU, true);
    g.fill();
  }
}

// ================================================================== E · 8-BIT (11.3 – 13.0)
const PX = 6;
const pw = W / PX;
const ph = H / PX;
const pc = off(pw, ph, () => {});
const p = pc.getContext("2d");
const PAL = { sky: "#1d2b53", star: "#fff1e8", earth: "#29adff", land: "#00e436", moon: "#c2c3c7", dark: "#5f574f", white: "#fff1e8", red: "#ff004d", orange: "#ffa300", yellow: "#ffec27", grey: "#83769c" };
const pxStars = Array.from({ length: 70 }, (_, i) => [Math.floor(hash(i) * pw), Math.floor(hash(i + 99) * ph * 0.8), hash(i + 7)]);
function rect(x, y, w, h, c) {
  p.fillStyle = c;
  p.fillRect(Math.round(x), Math.round(y), w, h);
}
function drawPixel(t) {
  p.imageSmoothingEnabled = false;
  rect(0, 0, pw, ph, PAL.sky);
  pxStars.forEach(([x, y, s]) => {
    if (Math.sin(t * 6 + s * 20) > -0.3) rect(x, y, 1, 1, PAL.star);
  });
  const f2 = Math.floor(t * 12) % 2;
  if (t < 12.2) {
    // launch
    p.fillStyle = PAL.earth;
    p.beginPath();
    p.arc(pw / 2, ph + 120, 190, 0, TAU);
    p.fill();
    rect(20, ph - 40, 40, 6, PAL.land);
    rect(100, ph - 44, 50, 8, PAL.land);
    const k = ei(seg(t, 11.45, 12.2));
    const rx = pw / 2 - 5;
    const ry = ph - 70 - k * 260;
    rect(rx + 2, ry, 6, 4, PAL.red);
    rect(rx, ry + 4, 10, 22, PAL.white);
    rect(rx + 3, ry + 9, 4, 4, PAL.earth);
    rect(rx - 3, ry + 20, 3, 8, PAL.red);
    rect(rx + 10, ry + 20, 3, 8, PAL.red);
    rect(rx + 2, ry + 26, 6, 4 + f2 * 3, PAL.orange);
    rect(rx + 3, ry + 30 + f2 * 3, 4, 4, PAL.yellow);
    for (let i = 0; i < 8; i++) {
      const a = t - 11.45 - i * 0.08;
      if (a < 0) continue;
      const sy = ph - 40 - (k * 260 * (1 - i / 10)) + a * 10;
      p.fillStyle = PAL.grey;
      p.beginPath();
      p.arc(pw / 2 + (hash(i) - 0.5) * 30 * a, sy, 3 + a * 6, 0, TAU);
      p.fill();
    }
  } else {
    // the Moon
    p.fillStyle = PAL.earth;
    p.beginPath();
    p.arc(140, 60, 18, 0, TAU);
    p.fill();
    rect(130, 52, 8, 5, PAL.land);
    rect(142, 64, 6, 4, PAL.land);
    rect(0, ph - 90, pw, 90, PAL.moon);
    [[30, ph - 70, 10], [120, ph - 50, 14], [80, ph - 30, 7]].forEach(([x, y, r]) => {
      p.fillStyle = PAL.grey;
      p.beginPath();
      p.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
      p.fill();
    });
    const step = Math.floor(seg(t, 12.2, 12.5) * 4);
    const ax = 70 + step * 3;
    const ay = ph - 112;
    rect(ax, ay, 12, 12, PAL.white);
    rect(ax + 3, ay + 3, 7, 5, PAL.orange);
    rect(ax, ay + 12, 12, 10, PAL.white);
    rect(ax - 3, ay + 13, 3, 6, PAL.white);
    rect(ax + (f2 ? 1 : 3), ay + 22, 4, 4, PAL.white);
    rect(ax + (f2 ? 7 : 5), ay + 22, 4, 4, PAL.white);
    if (t > 12.47) {
      const fy = ay - 6;
      rect(ax + 15, fy, 2, 34, PAL.white);
      rect(ax + 17, fy, 12, 7 + f2, PAL.red);
      rect(ax + 17, fy + 3, 12, 2, PAL.white);
    }
    p.fillStyle = PAL.yellow;
    p.font = "8px 'Press Start 2P'";
    p.textAlign = "center";
    
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(pc, 0, 0, W, H);
  g.imageSmoothingEnabled = true;
  // CRT scanlines + curvature vignette
  g.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += PX) g.fillRect(0, y, W, 2);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.7)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  // CRT power-on line
  const on = seg(t, 11.3, 11.48);
  if (on < 1) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff";
    const hh = Math.max(4, on * H);
    g.fillRect(0, H / 2 - hh / 2, W, hh);
  }
}

// ================================================================== G / H / I backgrounds drawn in 2D
function drawSpace(t, dim = 1) {
  const gr = g.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.5, H * 0.8);
  gr.addColorStop(0, "#1c1440");
  gr.addColorStop(1, "#05030c");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 3) + i);
    g.fillStyle = `rgba(255,245,230,${(0.2 + 0.6 * tw) * hash(i + 5) * dim})`;
    g.fillRect(hash(i) * W, hash(i + 50) * H, 2 + hash(i + 9) * 2, 2 + hash(i + 9) * 2);
  }
}
// the eight "knowledge" icons, each in its own medium (pre-painted discs)
const ICONS = [
  off(300, 300, (c) => {
    c.drawImage(rock, 300, 600, 600, 600, 0, 0, 300, 300);
    c.fillStyle = "rgba(178,52,28,0.9)";
    c.fill(handPath(150, 160, 0.42));
  }),
  off(300, 300, (c) => {
    c.drawImage(parchment, 300, 600, 600, 600, 0, 0, 300, 300);
    c.fillStyle = "#e0b042";
    c.strokeStyle = "#5a3a14";
    c.lineWidth = 2;
    [[90, 90], [200, 120], [150, 200], [80, 220]].forEach(([x, y]) => star(c, x, y, 16));
    c.beginPath();
    c.moveTo(90, 90);
    c.lineTo(200, 120);
    c.lineTo(150, 200);
    c.lineTo(80, 220);
    c.stroke();
  }),
  off(300, 300, (c) => {
    c.drawImage(paper, 300, 600, 600, 600, 0, 0, 300, 300);
    c.strokeStyle = "#4a2a12";
    c.lineWidth = 4;
    c.translate(-260, -630);
    c.scale(0.75, 0.75);
    c.translate(160, 220);
    ORN.body.slice(0, 5).forEach((s) => partial(c, s, 1));
    [...ORN.wl.ribs, ...ORN.wr.ribs].forEach((s) => partial(c, s, 1));
  }),
  off(300, 300, (c) => {
    c.fillStyle = "#c8c8c8";
    c.fillRect(0, 0, 300, 300);
    plane(c, 150, 160, 0.4, 0.3);
    c.drawImage(grain[0], 0, 0, 300, 300);
  }),
  off(300, 300, (c) => {
    c.imageSmoothingEnabled = false;
    c.fillStyle = PAL.sky;
    c.fillRect(0, 0, 300, 300);
    const q = 10;
    const R = (x, y, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(x * q, y * q, w * q, h * q);
    };
    R(14, 5, 2, 2, PAL.red);
    R(13, 7, 4, 10, PAL.white);
    R(14, 9, 2, 2, PAL.earth);
    R(11, 14, 2, 4, PAL.red);
    R(17, 14, 2, 4, PAL.red);
    R(14, 17, 2, 3, PAL.orange);
    R(14, 20, 2, 2, PAL.yellow);
  }),
  off(300, 300, (c) => {
    const gg = c.createLinearGradient(0, 0, 0, 300);
    gg.addColorStop(0, "#3a2f8f");
    gg.addColorStop(1, "#1a1240");
    c.fillStyle = gg;
    c.fillRect(0, 0, 300, 300);
    c.lineWidth = 8;
    for (let i = 0; i < 9; i++) {
      const y = 40 + i * 28;
      const a = i * 0.7;
      const x1 = 150 + Math.cos(a) * 70;
      const x2 = 150 - Math.cos(a) * 70;
      c.strokeStyle = "#1b1033";
      c.beginPath();
      c.moveTo(x1, y);
      c.lineTo(x2, y);
      c.stroke();
      [[x1, "#ff5aa0"], [x2, "#7fe9ff"]].forEach(([x, col]) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(x, y, 13, 0, TAU);
        c.fill();
        c.stroke();
      });
    }
  }),
  off(300, 300, (c) => {
    c.fillStyle = "#f2e4c4";
    c.fillRect(0, 0, 300, 300);
    c.fillStyle = "#c9a15e";
    c.strokeStyle = "#5a3a14";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(150, 60);
    c.lineTo(260, 240);
    c.lineTo(40, 240);
    c.closePath();
    c.fill();
    c.stroke();
    for (let y = 90; y < 240; y += 22) {
      c.beginPath();
      c.moveTo(150 - (y - 60) * 0.61, y);
      c.lineTo(150 + (y - 60) * 0.61, y);
      c.stroke();
    }
    c.fillStyle = "#f7b733";
    c.beginPath();
    c.arc(240, 70, 26, 0, TAU);
    c.fill();
  }),
  off(300, 300, (c) => {
    c.fillStyle = "#0b0614";
    c.fillRect(0, 0, 300, 300);
    c.shadowColor = "#ff4fd8";
    c.shadowBlur = 24;
    c.strokeStyle = "#ffb3f0";
    c.lineWidth = 9;
    c.beginPath();
    c.arc(150, 120, 60, Math.PI * 0.8, Math.PI * 2.2);
    c.lineTo(180, 210);
    c.lineTo(120, 210);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(125, 235);
    c.lineTo(175, 235);
    c.stroke();
  }),
];
const ICON_NAMES = ["paint", "stars", "flight", "machines", "space", "life", "civilization", "ideas"];
function drawIconDisc(icon, x, y, R, alpha = 1, ring = "#fff1e8") {
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(x, y, R, 0, TAU);
  g.save();
  g.clip();
  g.drawImage(icon, x - R, y - R, R * 2, R * 2);
  g.restore();
  g.lineWidth = 8;
  g.strokeStyle = "#1b1033";
  g.stroke();
  g.lineWidth = 4;
  g.strokeStyle = ring;
  g.beginPath();
  g.arc(x, y, R - 6, 0, TAU);
  g.stroke();
  g.restore();
}
// the spark: a glowing ember with a long trail
function sparkAt(t) {
  const a = t * 2.2;
  return [540 + Math.sin(a) * 320 * Math.sin(t * 0.7), 880 + Math.sin(a * 2) * 220];
}
function drawSpark(t, x, y, s = 1, trail = true) {
  for (let i = trail ? 18 : 0; i >= 0; i--) {
    const tt = t - i * 0.025;
    const [px, py] = i ? sparkAt(tt) : [x, y];
    const gg = g.createRadialGradient(px, py, 0, px, py, (40 - i * 1.6) * s);
    gg.addColorStop(0, `rgba(255,240,200,${0.9 - i * 0.045})`);
    gg.addColorStop(0.3, `rgba(255,170,60,${0.55 - i * 0.028})`);
    gg.addColorStop(1, "rgba(255,120,30,0)");
    g.fillStyle = gg;
    g.fillRect(px - 60 * s, py - 60 * s, 120 * s, 120 * s);
  }
}
function ringPos(i, t, R = 340) {
  const a = (i / 8) * TAU - Math.PI / 2 + (t - 20) * 0.25;
  return [540 + Math.cos(a) * R, 900 + Math.sin(a) * R * 1.15];
}
function drawSparkSection(t) {
  drawSpace(t);
  // icons pop into a ring, the spark links them into a constellation of knowledge
  const shown = ICONS.map((_, i) => back(seg(t, 20.3 + i * 0.17, 20.6 + i * 0.17)));
  const linkK = seg(t, 20.6, 22.4);
  g.strokeStyle = "rgba(255,200,120,0.75)";
  g.lineWidth = 5;
  g.shadowColor = "#ffb347";
  g.shadowBlur = 18;
  for (let i = 0; i < 8; i++) {
    const k = clamp(linkK * 8 - i);
    if (k <= 0) continue;
    partial(g, [ringPos(i, t), ringPos((i + 1) % 8, t)], k);
    if (i % 2 === 0) partial(g, [ringPos(i, t), [540, 900]], k);
  }
  g.shadowBlur = 0;
  ICONS.forEach((icon, i) => {
    if (shown[i] <= 0) return;
    const [x, y] = ringPos(i, t);
    drawIconDisc(icon, x, y, 105 * shown[i] * (1 + 0.08 * bump(t, 22.3, 0.3)));
  });
  // the spark
  let sx;
  let sy;
  if (t < 20.3) [sx, sy] = sparkAt(t);
  else [sx, sy] = vlerp(V3(...sparkAt(20.3), 0), V3(540, 900, 0), eo(seg(t, 20.3, 20.8))).toArray();
  const fl = bump(t, 19.72, 0.45);
  if (fl > 0) {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.8;
      const L = (300 + hash(i) * 500) * eo(seg(t, 19.6, 19.9));
      const gr = g.createLinearGradient(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L);
      gr.addColorStop(0, `rgba(255,220,150,${0.8 * fl})`);
      gr.addColorStop(1, "rgba(255,140,40,0)");
      g.strokeStyle = gr;
      g.lineWidth = 6 + hash(i + 3) * 10;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L);
      g.stroke();
    }
    const halo = g.createRadialGradient(sx, sy, 0, sx, sy, 700 * fl);
    halo.addColorStop(0, `rgba(255,200,120,${0.5 * fl})`);
    halo.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  drawSpark(t, sx, sy, 1 + 1.8 * bump(t, 19.7, 0.35) + 0.6 * seg(t, 22.2, 23.0));
}

// ================================================================== F · CEL-SHADED 3D (13.0 – 15.45) — Three.js
const { renderer, env: ENV } = makeRenderer(glCanvas, { exposure: 1.0, shadows: false });
renderer.autoClear = false;
const toonGrad = new THREE.DataTexture(new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
toonGrad.minFilter = toonGrad.magFilter = THREE.NearestFilter;
toonGrad.needsUpdate = true;
const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad });
const S3 = (() => {
  const scene = new THREE.Scene();
  scene.background = canvasTex(540, 960, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2b1d6e");
    gr.addColorStop(1, "#0f0a2a");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 0; y < h; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < w; x += 14) c.fillRect(x, y, 4 * (1 - y / h) + 1, 4 * (1 - y / h) + 1);
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x302060, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(4, 6, 5);
  scene.add(sun);
  const cam = makeCamera(40);
  // DNA helix
  const dna = new THREE.Group();
  const ballG = new THREE.SphereGeometry(0.22, 24, 16);
  const rungG = new THREE.CylinderGeometry(0.06, 0.06, 1, 10);
  const mA = toon(0xff5aa0);
  const mB = toon(0x7fe9ff);
  const mR = toon(0xfff1e8);
  for (let i = 0; i < 22; i++) {
    const y = (i - 11) * 0.42;
    const a = i * 0.55;
    const pa = V3(Math.cos(a) * 1.1, y, Math.sin(a) * 1.1);
    const pb = V3(-Math.cos(a) * 1.1, y, -Math.sin(a) * 1.1);
    [[pa, mA], [pb, mB]].forEach(([p, m]) => {
      const b = new THREE.Mesh(ballG, m);
      b.position.copy(p);
      withInk(b, 0.03);
      dna.add(b);
    });
    const r = new THREE.Mesh(rungG, mR);
    r.position.copy(pa).add(pb).multiplyScalar(0.5);
    r.scale.y = pa.distanceTo(pb);
    r.quaternion.setFromUnitVectors(V3(0, 1, 0), pb.clone().sub(pa).normalize());
    withInk(r, 0.025);
    dna.add(r);
  }
  scene.add(dna);
  // ringed planet + atom
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 32), toon(0xffb347));
  withInk(planet, 0.05);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 80), toon(0xffe27a));
  ring.rotation.x = 1.2;
  withInk(ring, 0.03);
  planet.add(ring);
  planet.position.set(-3.2, 3.6, -6);
  scene.add(planet);
  const atom = new THREE.Group();
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), toon(0xff4d5e));
  withInk(nuc, 0.03);
  atom.add(nuc);
  const electrons = [];
  for (let k = 0; k < 3; k++) {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 6, 60), new THREE.MeshBasicMaterial({ color: 0xfff1e8 }));
    orbit.rotation.set(k * 1.05, k * 0.6, 0);
    atom.add(orbit);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), toon(0x7fe9ff));
    withInk(e, 0.02);
    orbit.add(e);
    electrons.push(e);
  }
  atom.position.set(2.4, -2.6, -1);
  scene.add(atom);
  const fb = new THREE.FramebufferTexture(W, H);
  const post = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: fb }, uBlur: { value: 0 }, uInv: { value: 0 }, uDuo: { value: 0 }, uCol: { value: new THREE.Color() }, uCA: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float; varying vec2 vUv;
      uniform sampler2D uTex; uniform float uBlur; uniform float uInv; uniform float uDuo; uniform vec3 uCol; uniform float uCA; uniform float uTime;
      vec3 S(vec2 uv){ return texture2D(uTex, 1.0 - abs(fract(uv*0.5)*2.0 - 1.0)).rgb; }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 c = vec2(0.5, 0.52); vec3 col = vec3(0.0);
        for (int i = 0; i < 10; i++){ float f = float(i)/9.0; vec2 b = mix(vUv, c, uBlur*f*f); vec2 d = b - c;
          col += vec3(S(c + d*(1.0+uCA)).r, S(b).g, S(c + d*(1.0-uCA)).b); }
        col /= 10.0;
        float l = dot(col, vec3(0.299,0.587,0.114));
        col = mix(col, 1.0 - col, uInv);
        col = mix(col, mix(vec3(0.02,0.0,0.035), uCol, smoothstep(0.3, 0.42, mix(l, 1.0-l, uInv))), uDuo);
        col += (h(floor(vUv*vec2(540.,960.)) + fract(uTime*7.31)) - 0.5) * 0.04;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const pScene = new THREE.Scene();
  pScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const qCam = new THREE.Camera();
  function update(t) {
    dna.rotation.y = t * 1.4;
    dna.rotation.z = 0.25;
    planet.rotation.y = t * 0.4;
    atom.rotation.set(t * 0.5, t * 0.8, 0);
    electrons.forEach((e, k) => e.position.set(Math.cos(t * 4 + k * 2) * 1.0, Math.sin(t * 4 + k * 2) * 1.0, 0));
    const k = eio(seg(t, 13.0, 15.45));
    aim(cam, vlerp(V3(0, -2.5, 6.5), V3(1.4, 1.5, 7.8), k), V3(0, 0.3, 0), 40, lerp(0.15, -0.08, k) + jiggle(t, 13.0, 0.3, 16, 6));
  }
  function render(r, t) {
    r.setRenderTarget(null);
    r.clear();
    r.render(scene, cam);
    const imp = [[13.0, 0.06, "inv"], [14.33, 0.07, "duo"], [14.76, 0.07, "inv"]];
    let inv = 0;
    let duo = 0;
    post.uniforms.uCol.value.setRGB(0.78, 0.4, 1.0);
    imp.forEach(([a, d, kind]) => {
      if (t >= a && t < a + d) {
        if (kind === "inv") [inv, duo] = [1, 0.85];
        else duo = 1;
      }
    });
    post.uniforms.uInv.value = inv;
    post.uniforms.uDuo.value = duo;
    post.uniforms.uCol.value.setRGB(inv ? 1 : 0.78, inv ? 1 : 0.4, 1.0);
    post.uniforms.uBlur.value = 0.03 + 0.35 * Math.exp(-Math.pow((t - 13.0) / 0.12, 2)) + (inv || duo ? 0.12 : 0);
    post.uniforms.uCA.value = 0.006 + (inv || duo ? 0.03 : 0);
    post.uniforms.uTime.value = t;
    r.copyFramebufferToTexture(fb);
    r.render(pScene, qCam);
  }
  return { scene, cam, update, render };
})();

// ================================================================== cut transitions (each in the language of the era it enters)
function drawTransitions(t) {
  // cave → stars: ink blot swallows the frame
  const b1 = bump(t, 5.1, 0.2);
  if (b1 > 0) {
    g.fillStyle = "#2a1608";
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(hash(i) * W, hash(i + 4) * H, b1 * (500 + hash(i + 8) * 600), 0, TAU);
      g.fill();
    }
  }
  // stars → sketch: page flip flash
  const b2 = bump(t, 6.9, 0.12);
  if (b2 > 0) {
    g.fillStyle = `rgba(255,248,230,${b2})`;
    g.fillRect(0, 0, W, H);
  }
  // sketch → film: the paper burns away
  const b3 = bump(t, 9.6, 0.22);
  if (b3 > 0) {
    for (let i = 0; i < 7; i++) {
      const x = hash(i + 20) * W;
      const y = hash(i + 30) * H;
      const R = b3 * (400 + hash(i) * 500);
      const gg = g.createRadialGradient(x, y, R * 0.6, x, y, R);
      gg.addColorStop(0, "rgba(10,6,2,1)");
      gg.addColorStop(0.8, "rgba(255,150,40,0.9)");
      gg.addColorStop(1, "rgba(255,150,40,0)");
      g.fillStyle = gg;
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();
    }
  }
  // pixel → 3D: mosaic blocks
  const b5 = bump(t, 13.0, 0.18);
  if (b5 > 0) {
    const s = 90;
    for (let y = 0; y < H; y += s)
      for (let x = 0; x < W; x += s) {
        if (hash(x * 0.37 + y * 1.31) < b5 * 1.2) {
          g.fillStyle = ["#1d2b53", "#7e2553", "#29adff", "#ff004d"][Math.floor(hash(x + y) * 4)];
          g.fillRect(x, y, s, s);
        }
      }
  }
  // hard white impact cuts
  [15.45, 17.5, 23.1].forEach((c) => {
    const b = bump(t, c, 0.1);
    if (b > 0) {
      g.fillStyle = `rgba(255,255,255,${b})`;
      g.fillRect(0, 0, W, H);
    }
  });
}

// ================================================================== the master draw
let lastT = -1;
function renderAt(t) {
  t = Math.max(0, Math.min(TOTAL, Number(t) || 0));
  if (t === lastT) return;
  lastT = t;
  const in3D = t >= 13.0 && t < 15.45;
  glCanvas.style.opacity = in3D ? "1" : "0";
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  if (t < 5.1) drawCave(t);
  else if (t < 6.9) drawStars(t);
  else if (t < 9.6) drawSketch(t);
  else if (t < 11.3) drawFilm(t);
  else if (t < 13.0) drawPixel(t);
  else if (t < 15.45) {
    S3.update(t);
    S3.render(renderer, t);
  } else if (t < 17.5) {
    // kinetic type montage — backgrounds stutter between the eras behind the words
    const which = t < 15.97 ? 0 : t < 16.33 ? 1 : t < 16.69 ? 2 : 3;
    if (which === 0) g.drawImage(rock, 0, 0);
    else if (which === 1) g.drawImage(parchment, 0, 0);
    else if (which === 2) {
      drawSpace(t);
      g.fillStyle = "rgba(0,0,0,0.25)";
      for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
    } else {
      g.fillStyle = "#0b0614";
      g.fillRect(0, 0, W, H);
    }
  } else if (t < 23.1) drawSparkSection(t);
  else {
    // title: the ring of knowledge keeps orbiting, faint, behind the letters
    drawSpace(t, 0.8);
    g.save();
    g.globalAlpha = 0.22 * seg(t, 23.1, 24.0);
    ICONS.forEach((icon, i) => {
      const [x, y] = ringPos(i, t, 620);
      drawIconDisc(icon, x, y + 60, 64, 0.22 * seg(t, 23.1, 24.0));
    });
    g.restore();
    drawSpark(t, 540, 430 + Math.sin(t * 2) * 10, 0.7 + 0.6 * bump(t, 24.81, 0.3), false);
  }
  drawTransitions(t);
}
await Promise.all(["700 40px Cinzel", "40px 'Press Start 2P'", "40px 'IM Fell English'", "700 40px Kalam"].map((f) => document.fonts.load(f).catch(() => {})));
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
S3.update(13.5);
renderer.compile(S3.scene, S3.cam);
renderAt(window.__hfThreeTime || 0);
window.__renderAt = renderAt;
