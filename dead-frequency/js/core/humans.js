'use strict';
// Realistic-ish humans: procedural, anatomically lofted skinned bodies driven by the Mixamo rig + motion-capture clips
// (idle / walk / run / sneak) from the X Bot asset. Faces and clothing are painted per character into a texture atlas.

const HUMAN_LOOKS = {
  marcy: { h: 1.66, female: true, skin: [226, 182, 158], hair: [70, 40, 26], hairStyle: 'ponytail', eye: [70, 95, 60],
    top: { kind: 'cardigan', color: [110, 38, 48], under: [215, 205, 190] }, pants: { kind: 'jeans', color: [52, 70, 98] }, shoes: { color: [30, 26, 24] },
    face: { lips: [165, 85, 85], makeup: 0.6, freckles: 0.25, age: 0.25 }, build: { hip: 0.18, waist: 0.135, chest: 0.16, shoulder: 0.175, bust: 0.025, belly: 0 } },
  jo: { h: 1.6, female: true, skin: [222, 190, 158], hair: [22, 17, 15], hairStyle: 'bun', eye: [40, 28, 20], asian: true,
    top: { kind: 'polo', color: [176, 32, 28] }, pants: { kind: 'slacks', color: [28, 28, 32] }, shoes: { color: [20, 20, 22] },
    face: { lips: [170, 100, 95], makeup: 0.35, age: 0.05 }, build: { hip: 0.172, waist: 0.128, chest: 0.152, shoulder: 0.168, bust: 0.02, belly: 0 }, nametag: true },
  dale: { h: 1.84, skin: [205, 156, 128], hair: [120, 116, 110], hairStyle: 'cap', cap: [46, 62, 44], eye: [80, 100, 110],
    top: { kind: 'workjacket', color: [138, 108, 68], under: [72, 72, 64] }, pants: { kind: 'jeans', color: [44, 56, 76] }, shoes: { color: [64, 44, 28], boots: true },
    face: { lips: [150, 95, 85], mustache: [125, 118, 110], stubble: 0.55, age: 0.75, brows: [110, 104, 98] }, build: { hip: 0.19, waist: 0.185, chest: 0.2, shoulder: 0.215, bust: 0, belly: 0.035 } },
  mom: { h: 1.65, female: true, skin: [232, 192, 168], hair: [128, 92, 60], hairStyle: 'bob', eye: [60, 80, 100],
    top: { kind: 'coat', color: [86, 92, 102], under: [190, 180, 170] }, pants: { kind: 'slacks', color: [40, 40, 46] }, shoes: { color: [40, 28, 20] },
    face: { lips: [170, 95, 95], makeup: 0.3, age: 0.5 }, build: { hip: 0.185, waist: 0.145, chest: 0.162, shoulder: 0.172, bust: 0.025, belly: 0.005 } },
  deputy: { h: 1.8, skin: [212, 166, 134], hair: [42, 32, 24], hairStyle: 'short', eye: [60, 50, 40],
    top: { kind: 'uniform', color: [118, 100, 66] }, pants: { kind: 'slacks', color: [74, 62, 44] }, shoes: { color: [16, 16, 16], boots: true },
    face: { lips: [160, 100, 90], stubble: 0.25, age: 0.35 }, build: { hip: 0.19, waist: 0.17, chest: 0.205, shoulder: 0.215, bust: 0, belly: 0.01 } },
  walt: { h: 1.72, skin: [218, 176, 152], hair: [220, 220, 216], hairStyle: 'balding', eye: [90, 110, 120], glasses: true,
    top: { kind: 'flannel', color: [60, 78, 102], under: [40, 40, 40] }, pants: { kind: 'slacks', color: [70, 66, 58] }, shoes: { color: [40, 30, 22] },
    face: { lips: [160, 110, 105], age: 1, brows: [200, 200, 196] }, build: { hip: 0.18, waist: 0.17, chest: 0.18, shoulder: 0.19, bust: 0, belly: 0.03 } },
};

const Humans = {
  ready: false,
  gltf: null,
  clips: {},
  init() {
    if (this._p) return this._p;
    this._p = new Promise((res) => {
      try {
        const bin = atob(window.ASSET_XBOT); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new XT.GLTFLoader().parse(buf.buffer, '', g => {
          this.gltf = g;
          for (const a of g.animations) {
            // keep the clip in place and drop finger tracks (hands are mittens)
            a.tracks = a.tracks.filter(t => !/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(t.name) && !/Eye/.test(t.name));
            const hp = a.tracks.find(t => t.name === 'mixamorigHips.position');
            if (hp) { const v = hp.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] -= x0; v[i + 2] -= z0; } }
            this.clips[a.name] = a;
          }
          this.ready = true; res();
        }, err => { console.error('xbot', err); res(); });
      } catch (e) { console.error(e); res(); }
    });
    return this._p;
  },
};

// ---------------------------------------------------------------------------
// Texture atlas painting (1024 x 1152):
//  head  : x 0..1024, y 0..512        (u = angle around head, front at center)
//  torso : x 0..512,  y 512..1024
//  legs  : x 512..768, y 512..1024
//  arms  : x 768..1024, y 512..1024
//  hands : x 0..256, y 1024..1152 ; feet : x 256..512 ; neck/skin : x 512..768 ; extra: 768..1024
const ATLAS = { W: 1024, H: 1152, head: [0, 0, 1024, 512], torso: [0, 512, 512, 512], legs: [512, 512, 256, 512], arms: [768, 512, 256, 512], hands: [0, 1024, 256, 128], feet: [256, 1024, 256, 128], neck: [512, 1024, 256, 128] };
const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(U.clamp(c[0] * k, 0, 255))},${Math.round(U.clamp(c[1] * k, 0, 255))},${Math.round(U.clamp(c[2] * k, 0, 255))},${a})`;

function paintNoise(x, r, x0, y0, w, h, amt, n, col = '0,0,0') {
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : col},${Math.random() * amt})`; x.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2, 1 + r() * 2); }
}
function fabric(x, r, rect, color, kind) {
  const [x0, y0, w, h] = rect;
  x.fillStyle = rgb(color); x.fillRect(x0, y0, w, h);
  // weave
  if (kind === 'jeans') {
    x.strokeStyle = rgb(color, 1.25, 0.18); x.lineWidth = 1;
    for (let i = -h; i < w; i += 3) { x.beginPath(); x.moveTo(x0 + i, y0); x.lineTo(x0 + i + h, y0 + h); x.stroke(); }
    // fading on thighs/knees
    const g = x.createRadialGradient(x0 + w * 0.5, y0 + h * 0.45, 4, x0 + w * 0.5, y0 + h * 0.45, h * 0.35);
    g.addColorStop(0, 'rgba(200,215,235,.18)'); g.addColorStop(1, 'rgba(200,215,235,0)'); x.fillStyle = g; x.fillRect(x0, y0, w, h);
  } else if (kind === 'flannel') {
    for (let i = 0; i < w; i += 22) { x.fillStyle = 'rgba(15,15,25,.45)'; x.fillRect(x0 + i, y0, 7, h); x.fillStyle = 'rgba(180,60,50,.25)'; x.fillRect(x0 + i + 12, y0, 3, h); }
    for (let j = 0; j < h; j += 22) { x.fillStyle = 'rgba(15,15,25,.4)'; x.fillRect(x0, y0 + j, w, 7); x.fillStyle = 'rgba(180,60,50,.2)'; x.fillRect(x0, y0 + j + 12, w, 3); }
  } else if (kind === 'canvas') {
    for (let j = 0; j < h; j += 2) { x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; x.fillRect(x0, y0 + j, w, 1); }
    for (let i = 0; i < w; i += 2) { x.fillStyle = `rgba(255,255,255,${r() * 0.04})`; x.fillRect(x0 + i, y0, 1, h); }
  } else if (kind === 'knit') {
    for (let j = 0; j < h; j += 4) for (let i = 0; i < w; i += 4) { x.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`; x.fillRect(x0 + i, y0 + j, 2, 3); }
  } else {
    for (let j = 0; j < h; j += 2) { x.fillStyle = `rgba(0,0,0,${r() * 0.05})`; x.fillRect(x0, y0 + j, w, 1); }
  }
  paintNoise(x, r, x0, y0, w, h, 0.07, w * h / 40);
}
// soft fold lines (wrinkles) across a band
function folds(x, r, x0, y0, w, h, n, amt = 0.25) {
  for (let i = 0; i < n; i++) {
    const yy = y0 + r() * h, xx = x0 + r() * w, len = 20 + r() * 60, sl = (r() - 0.5) * 0.6;
    x.strokeStyle = `rgba(0,0,0,${amt * (0.4 + r() * 0.6)})`; x.lineWidth = 1.5 + r() * 2.5;
    x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + len / 2, yy + sl * len + (r() - 0.5) * 6, xx + len, yy + sl * len * 1.6); x.stroke();
    x.strokeStyle = `rgba(255,255,255,${amt * 0.35})`; x.lineWidth = 1;
    x.beginPath(); x.moveTo(xx, yy - 3); x.quadraticCurveTo(xx + len / 2, yy - 3 + sl * len, xx + len, yy - 3 + sl * len * 1.6); x.stroke();
  }
}
// vertical shading so cylinders read as rounded under flat light (ambient occlusion feel)
function sideShade(x, rect, amt = 0.28) {
  const [x0, y0, w, h] = rect;
  const g = x.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, `rgba(0,0,0,${amt})`); g.addColorStop(0.22, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(0.78, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${amt})`);
  x.fillStyle = g; x.fillRect(x0, y0, w, h);
}

function paintFace(x, L, r) {
  const [X0, Y0, W, H] = ATLAS.head;
  const S = L.skin, F = L.face || {};
  // base skin, slightly ruddier at the center
  x.fillStyle = rgb(S); x.fillRect(X0, Y0, W, H);
  const cx = X0 + W / 2;
  const tone = (px, py, rad, col, a) => { const g = x.createRadialGradient(px, py, 1, px, py, rad); g.addColorStop(0, rgb(col, 1, a)); g.addColorStop(1, rgb(col, 1, 0)); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); };
  // pores / mottling
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '120,60,40' : '255,230,210'},${r() * 0.06})`; x.fillRect(X0 + r() * W, Y0 + r() * H, 1 + r() * 2, 1 + r() * 2); }
  const eyeY = Y0 + 249, noseY = Y0 + 352, mouthY = Y0 + 428, browY = Y0 + 192, chinY = Y0 + 494;
  // facial planes: warm cheeks/nose, cooler jaw, shading under brow, sides of nose
  tone(cx - 70, Y0 + 315, 55, [200, 95, 85], 0.18 + (F.makeup || 0) * 0.12);
  tone(cx + 70, Y0 + 315, 55, [200, 95, 85], 0.18 + (F.makeup || 0) * 0.12);
  tone(cx, Y0 + 325, 30, [205, 110, 95], 0.18);
  tone(cx, Y0 + 470, 90, [90, 70, 80], 0.12);
  // temples / sides darker (helps the face read in the dark)
  for (const sx of [-1, 1]) tone(cx + sx * 170, Y0 + 270, 120, [60, 40, 35], 0.25);
  // eye sockets
  for (const sx of [-1, 1]) { tone(cx + sx * 58, eyeY - 2, 34, [70, 45, 50], 0.3 + (F.age || 0) * 0.12); tone(cx + sx * 60, eyeY + 18, 22, [90, 60, 70], 0.18 + (F.age || 0) * 0.15); }
  // nose: side shadows, tip highlight, nostrils
  for (const sx of [-1, 1]) { const g = x.createLinearGradient(cx + sx * 6, 0, cx + sx * 22, 0); g.addColorStop(0, 'rgba(90,50,40,0)'); g.addColorStop(0.5, 'rgba(90,50,40,.16)'); g.addColorStop(1, 'rgba(90,50,40,0)'); x.fillStyle = g; x.fillRect(cx + Math.min(sx * 6, sx * 22), eyeY + 14, 16, noseY - eyeY - 10); }
  tone(cx, noseY - 6, 12, [255, 235, 220], 0.35);
  x.fillStyle = 'rgba(60,25,20,.55)'; x.beginPath(); x.ellipse(cx - 11, noseY + 6, 6, 3.2, 0.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx + 11, noseY + 6, 6, 3.2, -0.3, 0, 7); x.fill();
  tone(cx, noseY + 10, 22, [110, 55, 45], 0.15);
  // nasolabial folds + age lines
  const age = F.age || 0;
  x.strokeStyle = `rgba(90,45,35,${0.12 + age * 0.25})`; x.lineWidth = 2 + age * 2;
  for (const sx of [-1, 1]) { x.beginPath(); x.moveTo(cx + sx * 24, noseY + 2); x.quadraticCurveTo(cx + sx * 40, mouthY - 20, cx + sx * 36, mouthY + 14); x.stroke(); }
  if (age > 0.4) { x.strokeStyle = `rgba(90,50,40,${age * 0.2})`; x.lineWidth = 1.5; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx - 60, browY - 30 - k * 12); x.quadraticCurveTo(cx, browY - 36 - k * 12, cx + 60, browY - 30 - k * 12); x.stroke(); } for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx + sx * 88, eyeY - 6 + k * 7); x.lineTo(cx + sx * 104, eyeY - 10 + k * 9); x.stroke(); } }
  // stubble / beard shadow
  if (F.stubble) { for (let i = 0; i < 9000 * F.stubble; i++) { const a = r() * Math.PI, rr = 60 + r() * 75; const px = cx + Math.cos(a) * rr * 1.05 * (r() < 0.5 ? -1 : 1), py = mouthY - 30 + Math.sin(a) * rr * 0.75; if (py < noseY + 8) continue; x.fillStyle = `rgba(40,30,25,${0.12 + r() * 0.18})`; x.fillRect(px, py, 1.5, 1.5); } }
  // eyes
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 58;
    // lid shadow + crease
    x.fillStyle = 'rgba(70,40,40,.25)'; x.beginPath(); x.ellipse(ex, eyeY - 6, 24, 10, 0, Math.PI, 0); x.fill();
    x.strokeStyle = 'rgba(70,40,40,.45)'; x.lineWidth = 2; x.beginPath(); x.ellipse(ex, eyeY - 4, 22, 9, 0, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    // sclera
    x.fillStyle = 'rgb(225,214,205)'; x.beginPath(); x.moveTo(ex - 20, eyeY + 2); x.quadraticCurveTo(ex - 2, eyeY - 11, ex + 20, eyeY + 1); x.quadraticCurveTo(ex + 2, eyeY + 11, ex - 20, eyeY + 2); x.fill();
    tone(ex + sx * 14, eyeY + 1, 8, [200, 140, 140], 0.6);
    // iris + pupil
    const ic = L.eye || [70, 60, 50];
    x.save(); x.beginPath(); x.moveTo(ex - 20, eyeY + 2); x.quadraticCurveTo(ex - 2, eyeY - 11, ex + 20, eyeY + 1); x.quadraticCurveTo(ex + 2, eyeY + 11, ex - 20, eyeY + 2); x.clip();
    const ig = x.createRadialGradient(ex, eyeY, 1, ex, eyeY, 9); ig.addColorStop(0, rgb(ic, 1.5)); ig.addColorStop(0.7, rgb(ic)); ig.addColorStop(1, rgb(ic, 0.45)); x.fillStyle = ig; x.beginPath(); x.arc(ex, eyeY, 9, 0, 7); x.fill();
    x.fillStyle = '#0a0705'; x.beginPath(); x.arc(ex, eyeY, 3.6, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ex - 22, eyeY - 12, 44, 6);
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(ex + 2, eyeY - 4, 2.5, 2.5);
    // lashes / upper lid line
    x.strokeStyle = `rgba(25,15,12,${L.female ? 0.95 : 0.75})`; x.lineWidth = L.female ? 3 : 2.2;
    x.beginPath(); x.moveTo(ex - 21, eyeY + 2); x.quadraticCurveTo(ex - 2, eyeY - 12, ex + 21, eyeY + 1); x.stroke();
    x.strokeStyle = 'rgba(60,35,30,.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ex - 18, eyeY + 4); x.quadraticCurveTo(ex, eyeY + 10, ex + 18, eyeY + 3); x.stroke();
    if (F.makeup) { x.strokeStyle = `rgba(20,12,12,${F.makeup * 0.6})`; x.lineWidth = 2; x.beginPath(); x.moveTo(ex + sx * 18, eyeY); x.lineTo(ex + sx * 25, eyeY - 4); x.stroke(); }
    // brows
    const bc = F.brows || L.hair;
    for (let k = 0; k < 70; k++) {
      const t = k / 70, bx = ex - sx * 20 + sx * t * 48, by = browY + 6 - Math.sin(t * Math.PI) * 9 + t * 3 + (r() - 0.5) * 4;
      x.strokeStyle = rgb(bc, 0.9, 0.55 + r() * 0.3); x.lineWidth = L.female ? 1.6 : 2.4;
      x.beginPath(); x.moveTo(bx, by + 3); x.lineTo(bx + sx * 7, by - 2); x.stroke();
    }
  }
  // mouth
  const lc = F.lips || [160, 90, 85];
  x.fillStyle = rgb(lc, 0.85, 0.9); x.beginPath(); x.moveTo(cx - 30, mouthY); x.quadraticCurveTo(cx - 12, mouthY - 11, cx, mouthY - 6); x.quadraticCurveTo(cx + 12, mouthY - 11, cx + 30, mouthY); x.closePath(); x.fill();
  x.fillStyle = rgb(lc, 1.0, 0.9); x.beginPath(); x.moveTo(cx - 28, mouthY + 1); x.quadraticCurveTo(cx, mouthY + 17, cx + 28, mouthY + 1); x.closePath(); x.fill();
  tone(cx + 4, mouthY + 7, 9, [255, 230, 220], 0.25);
  x.strokeStyle = 'rgba(60,25,25,.85)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx - 30, mouthY + 1); x.quadraticCurveTo(cx, mouthY + 4, cx + 30, mouthY + 1); x.stroke();
  tone(cx, mouthY + 30, 24, [110, 60, 50], 0.14);
  if (F.mustache) {
    for (let k = 0; k < 500; k++) { const t = r(), side = r() < 0.5 ? -1 : 1; const px = cx + side * t * 40, py = mouthY - 16 + t * 10 + r() * 12; x.strokeStyle = rgb(F.mustache, 0.8 + r() * 0.4, 0.6); x.lineWidth = 1.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + side * 4, py + 7); x.stroke(); }
  }
  if (F.freckles) for (let i = 0; i < 160 * F.freckles; i++) { x.fillStyle = 'rgba(150,80,50,.35)'; x.beginPath(); x.arc(cx + (r() - 0.5) * 170, noseY - 30 + (r() - 0.5) * 50, 1.3, 0, 7); x.fill(); }
  // hair on the scalp area (top and back of the head)
  const hc = L.hair;
  const hairTop = L.hairStyle === 'balding' ? 45 : (L.hairStyle === 'cap' ? 92 : 84);
  x.fillStyle = rgb(hc, 0.75); x.fillRect(X0, Y0, W, hairTop - 10);
  // hairline: lower at the sides/back, arched in front
  x.beginPath(); x.moveTo(X0, Y0);
  for (let px = 0; px <= W; px += 8) { const a = Math.abs(px - W / 2) / (W / 2); let hy = hairTop + Math.pow(a, 1.6) * 260; if (a > 0.3 && a < 0.42) hy -= 40 * Math.sin((a - 0.3) / 0.12 * Math.PI); x.lineTo(X0 + px, Y0 + Math.min(H, hy)); }
  x.lineTo(X0 + W, Y0); x.closePath(); x.fillStyle = rgb(hc); x.fill();
  for (let k = 0; k < 2500; k++) { const px = X0 + r() * W, py = Y0 + r() * 200; x.strokeStyle = rgb(hc, 0.6 + r() * 0.8, 0.35); x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py + 10 + r() * 14); x.stroke(); }
  // ears region (sides) slightly redder
  for (const sx of [-1, 1]) tone(cx + sx * 256, Y0 + 270, 30, [200, 110, 100], 0.25);
  void chinY;
}

function paintBody(x, L, r) {
  const T = L.top || {}, Pn = L.pants || {}, S = L.skin;
  // torso: v (canvas y) top = shoulders/neck, bottom = crotch. u: 0/1 back, 0.5 front, .25/.75 sides
  const [tx, ty, tw, th] = ATLAS.torso;
  const beltY = ty + th * 0.72, hemY = T.kind === 'coat' ? ty + th * 0.98 : (T.kind === 'workjacket' ? ty + th * 0.82 : beltY);
  const topKind = T.kind === 'flannel' ? 'flannel' : T.kind === 'cardigan' ? 'knit' : T.kind === 'workjacket' ? 'canvas' : 'plain';
  fabric(x, r, [tx, beltY, tw, ty + th - beltY], Pn.color, Pn.kind === 'jeans' ? 'jeans' : 'plain');
  // belt
  x.fillStyle = 'rgb(28,22,18)'; x.fillRect(tx, beltY - 4, tw, 14); x.fillStyle = 'rgb(150,140,110)'; x.fillRect(tx + tw * 0.5 - 8, beltY - 3, 16, 12);
  fabric(x, r, [tx, ty, tw, hemY - ty], T.color, topKind);
  const front = tx + tw * 0.5;
  // collar/neckline
  if (T.kind === 'polo') {
    x.fillStyle = rgb(T.color, 0.8); x.fillRect(tx, ty, tw, 14);
    x.fillStyle = rgb(T.color, 0.7); x.fillRect(front - 6, ty, 12, 70); x.fillStyle = 'rgb(235,230,220)'; for (const k of [24, 48]) { x.beginPath(); x.arc(front, ty + k, 3, 0, 7); x.fill(); }
    x.fillStyle = 'rgb(240,238,232)'; x.fillRect(front + 28, ty + 70, 34, 14); x.fillStyle = '#b22'; x.font = 'bold 10px Arial'; x.fillText('JO', front + 38, ty + 81);
  } else if (T.kind === 'cardigan' || T.kind === 'coat' || T.kind === 'workjacket') {
    // open front showing the layer underneath
    const open = T.kind === 'cardigan' ? 40 : T.kind === 'coat' ? 26 : 30;
    x.fillStyle = rgb(T.under || [200, 200, 200]); x.beginPath(); x.moveTo(front - open, ty); x.lineTo(front + open, ty); x.lineTo(front + open * 0.3, hemY); x.lineTo(front - open * 0.3, hemY); x.fill();
    paintNoise(x, r, front - open, ty, open * 2, hemY - ty, 0.06, 300);
    x.strokeStyle = rgb(T.color, 0.55); x.lineWidth = 4; x.beginPath(); x.moveTo(front - open, ty); x.lineTo(front - open * 0.3, hemY); x.moveTo(front + open, ty); x.lineTo(front + open * 0.3, hemY); x.stroke();
    if (T.kind === 'workjacket') { // pockets, corduroy collar
      x.fillStyle = rgb(T.color, 0.75); x.fillRect(tx, ty, tw, 22);
      for (const sx of [-1, 1]) { x.strokeStyle = rgb(T.color, 0.6); x.lineWidth = 2; x.strokeRect(front + sx * 70 - 22, ty + th * 0.5, 44, 50); x.strokeRect(front + sx * 60 - 18, ty + 70, 36, 34); }
      x.fillStyle = 'rgba(60,40,20,.25)'; x.fillRect(tx, hemY - 16, tw, 16);
    }
    if (T.kind === 'coat') for (const k of [80, 150, 220, 290]) for (const sx of [-1, 1]) { x.fillStyle = 'rgb(30,30,34)'; x.beginPath(); x.arc(front + sx * 34, ty + k, 4, 0, 7); x.fill(); }
  } else if (T.kind === 'uniform') {
    x.fillStyle = rgb(T.color, 0.8); x.fillRect(front - 2, ty, 4, hemY - ty);
    for (let k = 30; k < hemY - ty; k += 45) { x.fillStyle = 'rgb(40,34,24)'; x.beginPath(); x.arc(front + 6, ty + k, 3, 0, 7); x.fill(); }
    for (const sx of [-1, 1]) { x.strokeStyle = rgb(T.color, 0.6); x.lineWidth = 2; x.strokeRect(front + sx * 60 - 20, ty + 60, 40, 40); }
    x.fillStyle = 'rgb(200,170,60)'; x.beginPath(); x.moveTo(front - 70, ty + 50); x.lineTo(front - 56, ty + 44); x.lineTo(front - 42, ty + 50); x.lineTo(front - 46, ty + 66); x.lineTo(front - 66, ty + 66); x.fill();
    x.fillStyle = rgb(T.color, 0.75); x.fillRect(tx, ty, tw, 14);
  } else if (T.kind === 'flannel') {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(front - 2, ty, 4, hemY - ty);
    for (let k = 26; k < hemY - ty; k += 40) { x.fillStyle = 'rgb(200,195,180)'; x.beginPath(); x.arc(front + 6, ty + k, 2.6, 0, 7); x.fill(); }
  }
  // neck skin at the top-front (open collar)
  x.fillStyle = rgb(S); x.beginPath(); x.moveTo(front - 30, ty); x.lineTo(front + 30, ty); x.lineTo(front, ty + (T.kind === 'polo' ? 20 : 34)); x.fill();
  folds(x, r, tx, ty + th * 0.35, tw, th * 0.35, 30, 0.22);
  folds(x, r, tx, beltY + 10, tw, th - (beltY - ty) - 10, 18, 0.25);
  sideShade(x, [tx, ty, tw, th], 0.12);
  // legs: whole height pants, cuff at bottom
  const [lx, ly, lw, lh] = ATLAS.legs;
  fabric(x, r, [lx, ly, lw, lh], Pn.color, Pn.kind === 'jeans' ? 'jeans' : 'plain');
  if (T.kind === 'coat') { fabric(x, r, [lx, ly, lw, lh * 0.22], T.color, 'plain'); }
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (const u of [0.25, 0.75]) { x.beginPath(); x.moveTo(lx + lw * u, ly); x.lineTo(lx + lw * u, ly + lh); x.stroke(); }
  if (Pn.kind === 'jeans') { x.strokeStyle = 'rgba(210,170,90,.45)'; x.lineWidth = 1; for (const u of [0.23, 0.27, 0.73, 0.77]) { x.beginPath(); x.moveTo(lx + lw * u, ly); x.lineTo(lx + lw * u, ly + lh); x.stroke(); } }
  folds(x, r, lx, ly + lh * 0.4, lw, lh * 0.2, 14, 0.3);   // knees
  folds(x, r, lx, ly + lh * 0.85, lw, lh * 0.15, 10, 0.3); // bunching at the ankle
  x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(lx, ly + lh - 10, lw, 10);
  sideShade(x, [lx, ly, lw, lh], 0.18);
  // arms: sleeves from shoulder (top) to wrist (bottom); short sleeves for polo
  const [ax, ay, aw, ah] = ATLAS.arms;
  const sleeveEnd = T.kind === 'polo' ? 0.36 : 0.97;
  fabric(x, r, [ax, ay, aw, ah], S, 'plain');
  paintNoise(x, r, ax, ay, aw, ah, 0.05, 2000, '120,60,40');
  fabric(x, r, [ax, ay, aw, ah * sleeveEnd], T.color, topKind);
  x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(ax, ay + ah * sleeveEnd - 8, aw, 8);
  if (T.kind !== 'polo') folds(x, r, ax, ay + ah * 0.45, aw, ah * 0.15, 12, 0.3); // elbow
  sideShade(x, [ax, ay, aw, ah], 0.2);
  // hands
  const [hx, hy, hw, hh] = ATLAS.hands;
  x.fillStyle = rgb(S, 0.97); x.fillRect(hx, hy, hw, hh); paintNoise(x, r, hx, hy, hw, hh, 0.08, 800, '140,70,50');
  for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(120,60,50,.25)'; x.fillRect(hx + hw * 0.55, hy + 20 + k * 24, 30, 3); }
  sideShade(x, [hx, hy, hw, hh], 0.2);
  // feet / shoes
  const [fx, fy, fw, fh] = ATLAS.feet;
  const sc = (L.shoes || {}).color || [30, 30, 30];
  x.fillStyle = rgb(sc); x.fillRect(fx, fy, fw, fh); paintNoise(x, r, fx, fy, fw, fh, 0.1, 600);
  x.fillStyle = (L.shoes || {}).boots ? 'rgba(20,14,10,.8)' : 'rgba(225,225,220,.85)'; x.fillRect(fx, fy + fh - 18, fw, 18);
  x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1.5; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(fx + fw * 0.4, fy + 20 + k * 10); x.lineTo(fx + fw * 0.6, fy + 20 + k * 10); x.stroke(); }
  // neck
  const [nx, ny, nw, nh] = ATLAS.neck;
  x.fillStyle = rgb(S, 0.95); x.fillRect(nx, ny, nw, nh); paintNoise(x, r, nx, ny, nw, nh, 0.05, 400, '120,60,40');
  x.fillStyle = 'rgba(80,40,30,.15)'; x.fillRect(nx, ny, nw, 30);
}

function hairTexture(col, seed) {
  const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(seed);
  x.fillStyle = rgb(col, 0.7); x.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 5000; k++) { const px = r() * 256, py = r() * 256; x.strokeStyle = rgb(col, 0.55 + r() * 0.9, 0.5); x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + (r() - 0.5) * 4, py + 10, px + (r() - 0.5) * 6, py + 20, px + (r() - 0.5) * 4, py + 34); x.stroke(); }
  return TEX.make(c);
}

// ---------------------------------------------------------------------------
class GeoBuilder {
  constructor() { this.pos = []; this.uv = []; this.idx = []; this.si = []; this.sw = []; }
  vert(p, uv, weights) {
    this.pos.push(p.x, p.y, p.z); this.uv.push(uv[0], uv[1]);
    const w = weights.slice().sort((a, b) => b[1] - a[1]).slice(0, 4); let tot = 0; for (const e of w) tot += e[1];
    for (let k = 0; k < 4; k++) { const e = w[k]; this.si.push(e ? e[0] : 0); this.sw.push(e ? e[1] / tot : 0); }
    return this.pos.length / 3 - 1;
  }
  // rings: [{c:Vector3, a:Vector3 (unit, phi=90deg dir), b:Vector3 (unit, phi=0 dir), ra, rb, ex}] ; uvRect [x,y,w,h] in atlas px
  loft(rings, seg, uvRect, wFn, o = {}) {
    const base = this.pos.length / 3;
    const n = rings.length;
    for (let i = 0; i < n; i++) {
      const R = rings[i];
      for (let j = 0; j <= seg; j++) {
        const phi = (j / seg) * Math.PI * 2 - Math.PI;   // -PI..PI, 0 = front (b axis)
        const s = Math.sin(phi), c = Math.cos(phi), e = 2 / (R.ex || 2);
        const sx = Math.sign(s) * Math.pow(Math.abs(s), e), cz = Math.sign(c) * Math.pow(Math.abs(c), e);
        const p = R.c.clone().addScaledVector(R.a, sx * R.ra * (R.raFn ? R.raFn(phi) : 1)).addScaledVector(R.b, cz * R.rb * (R.rbFn ? R.rbFn(phi) : 1));
        if (R.push) R.push(p, phi);
        const u = (uvRect[0] + (j / seg) * uvRect[2]) / ATLAS.W, v = 1 - (uvRect[1] + (o.flipV ? (i / (n - 1)) : (1 - i / (n - 1))) * uvRect[3]) / ATLAS.H;
        this.vert(p, [u, v], wFn(i / (n - 1), phi, p));
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j, b = a + 1, c2 = a + seg + 1, d = c2 + 1;
      if (o.flip) this.idx.push(a, b, c2, b, d, c2); else this.idx.push(a, c2, b, b, c2, d);
    }
    // caps
    if (o.capEnd) { const last = rings[n - 1]; const ci = this.vert(last.c, [(uvRect[0] + uvRect[2] / 2) / ATLAS.W, 1 - (uvRect[1] + (o.flipV ? uvRect[3] : 0)) / ATLAS.H], wFn(1, 0, last.c)); const rb = base + (n - 1) * (seg + 1); for (let j = 0; j < seg; j++) o.flip ? this.idx.push(rb + j, ci, rb + j + 1) : this.idx.push(rb + j, rb + j + 1, ci); }
    if (o.capStart) { const first = rings[0]; const ci = this.vert(first.c, [(uvRect[0] + uvRect[2] / 2) / ATLAS.W, 1 - (uvRect[1] + (o.flipV ? 0 : uvRect[3])) / ATLAS.H], wFn(0, 0, first.c)); for (let j = 0; j < seg; j++) o.flip ? this.idx.push(base + j + 1, ci, base + j) : this.idx.push(base + j, ci, base + j + 1); }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx); g.computeVertexNormals();
    return g;
  }
}

const lerpProfile = (pts, y) => { // pts: [[y, ...vals]] sorted ascending y
  if (y <= pts[0][0]) return pts[0].slice(1);
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (y <= b[0]) { const t = U.smooth((y - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t); } }
  return pts[pts.length - 1].slice(1);
};

// Build the body geometry for a look, in rig T-pose space (meters, facing +z). bone(name) -> index
function buildBody(L, bi, BP) {
  const G2 = new GeoBuilder();
  const b = L.build, T = L.top || {}, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const jacket = ['workjacket', 'coat', 'uniform', 'cardigan'].includes(T.kind) ? 0.012 : 0.004;
  const w2 = (n1, n2, t) => [[bi(n1), 1 - t], [bi(n2), t]];
  // ---------- torso ----------
  const prof = [
    [0.80, b.hip * 0.86, 0.10, 0.0, 2.6],
    [0.90, b.hip, 0.112, 0.0, 2.5],
    [1.00, b.hip * 0.97, 0.108 + b.belly * 0.4, 0.004 + b.belly * 0.3, 2.4],
    [1.10, b.waist + jacket, 0.098 + b.belly, 0.012 + b.belly * 0.7, 2.3],
    [1.20, (b.waist + b.chest) / 2 + jacket, 0.104 + b.bust * 0.35 + b.belly * 0.6, 0.014 + b.belly * 0.3, 2.4],
    [1.29, b.chest + jacket, 0.112 + b.bust + jacket, 0.016 + b.bust * 0.7, 2.5],
    [1.37, b.chest * 1.02 + jacket, 0.105 + jacket, 0.004, 2.6],
    [1.425, b.shoulder + jacket, 0.08 + jacket, -0.018, 2.8],
    [1.455, b.shoulder * 0.72, 0.07, -0.024, 2.4],
    [1.48, 0.085, 0.062, -0.028, 2.1],
    [1.50, 0.06, 0.056, -0.03, 2],
  ];
  const tRings = [];
  for (let k = 0; k <= 26; k++) {
    const y = 0.80 + k / 26 * 0.70; const [hw, hd, zo, ex] = lerpProfile(prof, y);
    tRings.push({ c: new THREE.Vector3(0, y, zo + 0.0), a: X, b: Z, ra: hw, rb: hd, ex,
      rbFn: phi => (Math.cos(phi) < 0 ? 0.92 : 1) }); // flatter back
  }
  const spineW = (t, phi, p) => {
    const y = p.y;
    if (y < 0.93) { const side = p.x >= 0 ? 'mixamorigLeftUpLeg' : 'mixamorigRightUpLeg'; const k = U.clamp((0.93 - y) / 0.13, 0, 1) * Math.min(1, Math.abs(p.x) / 0.08); return [[bi('mixamorigHips'), 1 - k * 0.6], [bi(side), k * 0.6]]; }
    if (y < 1.09) return w2('mixamorigHips', 'mixamorigSpine', U.smooth((y - 0.93) / 0.16));
    if (y < 1.19) return w2('mixamorigSpine', 'mixamorigSpine1', U.smooth((y - 1.09) / 0.1));
    if (y < 1.30) return w2('mixamorigSpine1', 'mixamorigSpine2', U.smooth((y - 1.19) / 0.11));
    if (y < 1.45) { const sh = Math.abs(p.x) > 0.09 ? (p.x > 0 ? 'mixamorigLeftShoulder' : 'mixamorigRightShoulder') : null; const k = sh ? U.clamp((Math.abs(p.x) - 0.09) / 0.1, 0, 1) * U.clamp((y - 1.33) / 0.1, 0, 1) : 0; return sh ? [[bi('mixamorigSpine2'), 1 - k], [bi(sh), k]] : [[bi('mixamorigSpine2'), 1]]; }
    return w2('mixamorigSpine2', 'mixamorigNeck', U.smooth((y - 1.45) / 0.05));
  };
  G2.loft(tRings, 28, ATLAS.torso, spineW, { capStart: false });
  // coat skirt (long coat / work jacket hem flares over the hips)
  // ---------- neck ----------
  const nRings = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6, y = 1.45 + t * 0.16; nRings.push({ c: new THREE.Vector3(0, y, -0.028 + t * 0.015), a: X, b: Z, ra: (L.female ? 0.05 : 0.06) * (1 + (1 - t) * 0.15), rb: (L.female ? 0.052 : 0.06), ex: 2 }); }
  G2.loft(nRings, 16, ATLAS.neck, (t) => w2('mixamorigNeck', 'mixamorigHead', U.smooth(U.clamp((t - 0.4) / 0.6, 0, 1))));
  // ---------- head ----------
  buildHead(G2, L, bi);
  // ---------- arms ----------
  for (const side of [1, -1]) {
    const nm = side > 0 ? 'Left' : 'Right';
    const ay = 1.432, az = -0.05;
    const sl = jacket;
    const ap = [[0.10, 0.058 + sl, 0.058 + sl], [0.17, 0.055 + sl, 0.052 + sl], [0.26, 0.046 + sl, 0.046 + sl], [0.34, 0.042 + sl, 0.044 + sl], [0.43, 0.036 + sl, 0.038 + sl], [0.50, 0.04 + sl * 0.8, 0.041 + sl * 0.8], [0.6, 0.034 + sl * 0.6, 0.036 + sl * 0.6], [0.69, 0.027 + (T.kind === 'polo' ? 0 : sl * 0.5), 0.031 + sl * 0.5], [0.715, 0.026, 0.03]];
    const fem = L.female ? 0.9 : 1;
    const rings = [];
    for (let k = 0; k <= 22; k++) {
      const xx = 0.10 + k / 22 * 0.615; const [ry, rz] = lerpProfile(ap, xx);
      rings.push({ c: new THREE.Vector3(side * xx, ay - (xx < 0.2 ? (0.2 - xx) * 0.05 : 0), az), a: Z.clone().multiplyScalar(side), b: Y, ra: rz * fem, rb: ry * fem, ex: 2 });
    }
    const armW = (t, phi, p) => {
      const xx = Math.abs(p.x);
      if (xx < 0.17) return w2('mixamorig' + nm + 'Shoulder', 'mixamorig' + nm + 'Arm', U.smooth((xx - 0.10) / 0.07));
      if (xx < 0.40) return [[bi('mixamorig' + nm + 'Arm'), 1]];
      if (xx < 0.46) return w2('mixamorig' + nm + 'Arm', 'mixamorig' + nm + 'ForeArm', U.smooth((xx - 0.40) / 0.06));
      if (xx < 0.68) return [[bi('mixamorig' + nm + 'ForeArm'), 1]];
      return w2('mixamorig' + nm + 'ForeArm', 'mixamorig' + nm + 'Hand', U.smooth((xx - 0.68) / 0.04));
    };
    G2.loft(rings, 16, ATLAS.arms, armW, { flipV: true, flip: side < 0 });
    // hand: palm + fingers as one mitten, thumb as a small tube
    const hr = [];
    const hp = [[0.70, 0.016, 0.03], [0.74, 0.02, 0.042], [0.80, 0.017, 0.044], [0.84, 0.014, 0.04], [0.885, 0.01, 0.034], [0.9, 0.004, 0.02]];
    for (let k = 0; k <= 10; k++) { const xx = 0.70 + k / 10 * 0.2; const [th, wd] = lerpProfile(hp, xx); hr.push({ c: new THREE.Vector3(side * xx, ay - 0.004 - Math.max(0, xx - 0.8) * 0.25, az + 0.005), a: Z.clone().multiplyScalar(side), b: Y, ra: wd * fem, rb: th * fem, ex: 2.4 }); }
    G2.loft(hr, 12, ATLAS.hands, () => [[bi('mixamorig' + nm + 'Hand'), 1]], { flipV: true, flip: side < 0, capEnd: true });
    const th2 = [];
    for (let k = 0; k <= 4; k++) { const t = k / 4; th2.push({ c: new THREE.Vector3(side * (0.725 + t * 0.06), ay - 0.012 - t * 0.012, az + 0.03 + t * 0.03), a: Y, b: Z, ra: 0.011 * (1 - t * 0.3) * fem, rb: 0.011 * (1 - t * 0.3) * fem, ex: 2 }); }
    G2.loft(th2, 8, ATLAS.hands, () => [[bi('mixamorig' + nm + 'Hand'), 1]], { capEnd: true, flip: side > 0 });
  }
  // ---------- legs ----------
  for (const side of [1, -1]) {
    const nm = side > 0 ? 'Left' : 'Right';
    const lx = side * 0.082;
    const fl = (L.pants || {}).kind === 'jeans' ? 0.006 : 0.012;
    const lp = [[0.07, 0.04 + fl, 0.045 + fl], [0.2, 0.042 + fl * 0.7, 0.046 + fl * 0.7], [0.38, 0.056, 0.06], [0.53, 0.05, 0.055], [0.7, 0.07, 0.075], [0.86, 0.088 * (b.hip / 0.18), 0.09], [0.98, 0.095 * (b.hip / 0.18), 0.095]];
    const rings = [];
    for (let k = 0; k <= 24; k++) { const y = 0.07 + k / 24 * 0.91; const [rx, rz] = lerpProfile(lp, y); rings.push({ c: new THREE.Vector3(lx + (y > 0.6 ? side * (y - 0.6) * 0.02 : 0), y, 0.006 + (y < 0.5 && y > 0.25 ? -0.01 : 0)), a: X, b: Z, ra: rx, rb: rz, ex: 2.1 }); }
    const legW = (t, phi, p) => {
      const y = p.y;
      if (y > 0.9) return w2('mixamorigHips', 'mixamorig' + nm + 'UpLeg', U.smooth(U.clamp((0.98 - y) / 0.08, 0, 1)));
      if (y > 0.58) return [[bi('mixamorig' + nm + 'UpLeg'), 1]];
      if (y > 0.48) return w2('mixamorig' + nm + 'Leg', 'mixamorig' + nm + 'UpLeg', U.smooth((y - 0.48) / 0.1));
      if (y > 0.12) return [[bi('mixamorig' + nm + 'Leg'), 1]];
      return w2('mixamorig' + nm + 'Foot', 'mixamorig' + nm + 'Leg', U.smooth((y - 0.07) / 0.05));
    };
    G2.loft(rings, 18, ATLAS.legs, legW, {});
    // shoe
    const boots = (L.shoes || {}).boots;
    const sp = [[-0.08, 0.04, 0.048, 0.05], [-0.04, 0.045, 0.06, 0.06], [0.04, 0.05, 0.05, 0.045], [0.12, 0.052, 0.04, 0.035], [0.19, 0.04, 0.028, 0.03], [0.215, 0.02, 0.014, 0.03]];
    const srings = [];
    for (let k = 0; k <= 12; k++) { const z = -0.08 + k / 12 * 0.295; const [wd, ht, cy] = lerpProfile(sp, z); srings.push({ c: new THREE.Vector3(lx, cy + (boots ? 0.01 : 0), z), a: X, b: Y, ra: wd * (L.female ? 0.85 : 1), rb: ht + (boots ? 0.01 : 0), ex: 2.6, rbFn: phi => (Math.cos(phi) < 0 ? 0.55 : 1) }); }
    G2.loft(srings, 14, ATLAS.feet, (t, phi, p) => p.z > 0.06 ? w2('mixamorig' + nm + 'Foot', 'mixamorig' + nm + 'ToeBase', 0.45 * U.smooth((p.z - 0.06) / 0.08)) : [[bi('mixamorig' + nm + 'Foot'), 1]], { capStart: true, capEnd: true, flip: true });
  }
  void BP;
  return G2.geometry();
}

// sculpted head: ellipsoid with facial relief
function buildHead(G2, L, bi) {
  const cy = 1.652, cz = 0.0, RX = L.female ? 0.075 : 0.08, RY = 0.113, RZ = 0.094;
  const segU = 48, segV = 32, base = G2.pos.length / 3;
  const asian = !!L.asian, f = L.female ? 1 : 0;
  for (let i = 0; i <= segV; i++) {
    const th = i / segV * Math.PI;       // 0 top -> PI bottom
    for (let j = 0; j <= segU; j++) {
      const ph = (j / segU) * Math.PI * 2 - Math.PI;   // 0 = front
      let nx = Math.sin(th) * Math.sin(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(ph);
      let x = nx * RX, y = ny * RY, z = nz * RZ;
      // jaw taper + chin
      const low = U.clamp((-ny - 0.05) / 0.9, 0, 1);
      x *= 1 - low * (0.2 - f * 0.04);
      z *= 1 - low * 0.1;
      if (ny < -0.3) z += Math.max(0, nz) * 0.01 * U.clamp((-ny - 0.3) / 0.5, 0, 1); // chin forward
      // back of skull fuller, forehead flatter
      if (nz < 0) z *= 1.06 + Math.max(0, ny) * 0.04;
      if (nz > 0 && ny > 0.35) z *= 1 - (ny - 0.35) * 0.08;
      // face relief (front only) — positions match the painted face layout
      if (nz > 0.2) {
        const fx = x, fy = y; const front = U.clamp((nz - 0.2) / 0.4, 0, 1);
        const g = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy));
        let d = 0;
        const ramp = fy > -0.045 ? U.smooth(U.clamp((0.012 - fy) / 0.057, 0, 1)) : Math.exp(-((fy + 0.045) ** 2) / (2 * 0.006 * 0.006));
        d += 0.021 * Math.exp(-(fx * fx) / (2 * 0.0085 * 0.0085)) * ramp;                    // nose
        d += 0.006 * (g(fx - 0.014, fy + 0.043, 0.006, 0.006) + g(fx + 0.014, fy + 0.043, 0.006, 0.006)); // nostril wings
        d += (asian ? 0.004 : 0.008) * g(fx, fy - 0.03, 0.04, 0.007);                          // brow ridge
        d -= (asian ? 0.004 : 0.008) * (g(fx - 0.031, fy - 0.004, 0.014, 0.01) + g(fx + 0.031, fy - 0.004, 0.014, 0.01)); // eye sockets
        d += 0.004 * (g(fx - 0.031, fy - 0.002, 0.009, 0.006) + g(fx + 0.031, fy - 0.002, 0.009, 0.006)); // eyeballs under lids
        d += 0.006 * (g(fx - 0.05, fy + 0.02, 0.016, 0.014) + g(fx + 0.05, fy + 0.02, 0.016, 0.014)); // cheekbones
        d += 0.005 * g(fx, fy + 0.071, 0.019, 0.005) + 0.0045 * g(fx, fy + 0.082, 0.017, 0.005);   // lips
        d -= 0.004 * g(fx, fy + 0.092, 0.02, 0.004);                                          // under lip
        d += 0.006 * g(fx, fy + 0.105, 0.02, 0.01);                                           // chin
        z += d * front;
      }
      const p = new THREE.Vector3(x, cy + y, cz + z);
      const vf = U.clamp((RY - y) / (2 * RY), 0, 1);
      const u = (ATLAS.head[0] + (j / segU) * ATLAS.head[2]) / ATLAS.W, v = 1 - (ATLAS.head[1] + vf * ATLAS.head[3]) / ATLAS.H;
      const w = y < -0.085 && Math.abs(z) < 0.07 ? [[bi('mixamorigHead'), 0.8], [bi('mixamorigNeck'), 0.2]] : [[bi('mixamorigHead'), 1]];
      G2.vert(p, [u, v], w);
    }
  }
  for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) { const a = base + i * (segU + 1) + j, b2 = a + 1, c = a + segU + 1, d = c + 1; G2.idx.push(a, c, b2, b2, c, d); }
  // ears
  for (const s of [1, -1]) {
    const er = [];
    for (let k = 0; k <= 5; k++) { const t = k / 5; er.push({ c: new THREE.Vector3(s * (RX + 0.004 + Math.sin(t * Math.PI) * 0.004), cy - 0.035 + t * 0.06, -0.008 - t * 0.006), a: new THREE.Vector3(0, 0, 1), b: new THREE.Vector3(s, 0, 0), ra: 0.017 * Math.sin(0.25 + t * 2.6) + 0.004, rb: 0.006, ex: 2 }); }
    G2.loft(er, 10, [ATLAS.head[0] + (s > 0 ? 760 : 250), 250, 30, 40], () => [[bi('mixamorigHead'), 1]], { capStart: true, capEnd: true, flip: s < 0 });
  }
}

// hair / hats: separate meshes skinned to the head
function buildHair(L, bi) {
  const G2 = new GeoBuilder();
  const cy = 1.652, RX = (L.female ? 0.074 : 0.079) + 0.006, RY = 0.113 + 0.008, RZ = 0.094 + 0.008;
  const st = L.hairStyle;
  if (st === 'balding') { // ring of hair around the back and sides
    for (let k = 0; k <= 0; k++) { /* painted only */ }
    return null;
  }
  const segU = 36, segV = 14, hb = [[bi('mixamorigHead'), 1]];
  const front = st === 'short' || st === 'cap' ? 0.62 : 0.58;     // hairline height (normalized) at front
  const side = st === 'bob' ? -0.55 : (st === 'short' || st === 'cap' ? 0.0 : -0.1);
  const back = st === 'bob' ? -0.95 : (st === 'short' || st === 'cap' ? -0.45 : -0.6);
  const vol = st === 'bob' ? 1.06 : st === 'short' || st === 'cap' ? 1.0 : 1.03;
  const base = G2.pos.length / 3;
  for (let i = 0; i <= segV; i++) for (let j = 0; j <= segU; j++) {
    const ph = (j / segU) * Math.PI * 2 - Math.PI, a = Math.abs(ph) / Math.PI;    // 0 front, 1 back
    const edge = a < 0.13 ? front : a < 0.32 ? U.lerp(front, side, U.smooth((a - 0.13) / 0.19)) : U.lerp(side, back, U.smooth((a - 0.32) / 0.68));
    const th = Math.acos(U.clamp(edge, -1, 1)) * (i / segV);
    const nx = Math.sin(th) * Math.sin(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(ph);
    let x = nx * RX * vol, y = ny * RY * vol, z = nz * RZ * vol;
    if (st === 'bob' && ny < 0) { x *= 1.08; z *= 1.05; }
    if (st === 'ponytail' || st === 'bun') { if (nz < 0) z *= 1.01; }
    G2.vert(new THREE.Vector3(x, cy + y, z), [j / segU, i / segV], hb);
  }
  for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) { const a = base + i * (segU + 1) + j, b2 = a + 1, c = a + segU + 1, d = c + 1; G2.idx.push(a, c, b2, b2, c, d); }
  if (st === 'ponytail') {
    const rings = []; for (let k = 0; k <= 8; k++) { const t = k / 8; rings.push({ c: new THREE.Vector3(0, cy + 0.05 - t * 0.2, -0.1 - Math.sin(t * 1.4) * 0.03), a: new THREE.Vector3(1, 0, 0), b: new THREE.Vector3(0, 0, 1), ra: 0.022 * (1 - t * 0.6) + 0.006, rb: 0.018 * (1 - t * 0.5) + 0.005, ex: 2 }); }
    const b0 = G2.pos.length / 3; G2.loft(rings, 10, [0, 0, 1024, 512], () => hb, { capEnd: true }); void b0;
  }
  if (st === 'bun') {
    const rings = []; for (let k = 0; k <= 6; k++) { const t = k / 6; rings.push({ c: new THREE.Vector3(0, cy + 0.06 - t * 0.04, -0.1 - t * 0.04), a: new THREE.Vector3(1, 0, 0), b: new THREE.Vector3(0, 1, 0), ra: 0.035 * Math.sin(0.2 + t * 2.7) + 0.005, rb: 0.03 * Math.sin(0.2 + t * 2.7) + 0.005, ex: 2 }); }
    G2.loft(rings, 10, [0, 0, 1024, 512], () => hb, { capEnd: true, capStart: true });
  }
  return G2.geometry();
}

function buildCap(L, bi) {
  const G2 = new GeoBuilder(); const hb = [[bi('mixamorigHead'), 1]];
  const cy = 1.652, RX = 0.079 + 0.011, RY = 0.113 + 0.01, RZ = 0.094 + 0.014;
  const base = G2.pos.length / 3, segU = 32, segV = 10;
  for (let i = 0; i <= segV; i++) for (let j = 0; j <= segU; j++) {
    const th = (i / segV) * 1.18, ph = (j / segU) * Math.PI * 2 - Math.PI;
    const nx = Math.sin(th) * Math.sin(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(ph);
    G2.vert(new THREE.Vector3(nx * RX, cy + ny * RY * 0.92 + 0.004, nz * RZ), [j / segU, i / segV], hb);
  }
  for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) { const a = base + i * (segU + 1) + j, b2 = a + 1, c = a + segU + 1, d = c + 1; G2.idx.push(a, c, b2, b2, c, d); }
  // brim: follows the cap's front edge, curved down at the sides
  const b0 = G2.pos.length / 3, n = 14, ey = cy + Math.cos(1.18) * RY * 0.92 + 0.004;
  for (let j = 0; j <= n; j++) {
    const a = -1.05 + j / n * 2.1, sa = Math.sin(a), ca = Math.cos(a);
    const ix = sa * RX * Math.sin(1.18), iz = ca * RZ * Math.sin(1.18);
    const len = 0.072 * Math.pow(Math.max(0, ca), 0.6);
    G2.vert(new THREE.Vector3(ix, ey, iz), [j / n, 0], hb);
    G2.vert(new THREE.Vector3(ix + sa * len * 0.5, ey - 0.012 - Math.abs(sa) * 0.012, iz + ca * len), [j / n, 1], hb);
  }
  for (let j = 0; j < n; j++) { const a = b0 + j * 2; G2.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  return G2.geometry();
}

// ---------------------------------------------------------------------------
class Human {
  constructor(parent, who, o = {}) {
    const look = this.look = Object.assign({}, HUMAN_LOOKS[who] || HUMAN_LOOKS.walt, o.look || {});
    this.who = who;
    this.s = look.h / 1.775;
    this.root = new THREE.Group(); parent.add(this.root);
    this.root.position.set(o.x || 0, o.y || 0, o.z || 0); this.root.rotation.y = o.ry || 0;
    this.body = new THREE.Group(); this.body.scale.setScalar(this.s); this.root.add(this.body);
    // rig
    const rig = this.rig = XT.clone(Humans.gltf.scene);
    const drop = []; rig.traverse(n => { if (n.isMesh) drop.push(n); }); drop.forEach(n => n.parent.remove(n));
    this.body.add(rig);
    rig.updateMatrixWorld(true);
    const bones = []; rig.traverse(n => { if (n.isBone) bones.push(n); });
    this.bones = {}; bones.forEach(bn => { this.bones[bn.name] = bn; });
    const index = {}; bones.forEach((bn, i) => { index[bn.name] = i; });
    const bi = name => index[name] != null ? index[name] : 0;
    // bind in rig-local T-pose space: temporarily reset parent transforms
    const saveP = this.root.position.clone(), saveR = this.root.rotation.y, saveS = this.body.scale.x;
    this.root.position.set(0, 0, 0); this.root.rotation.y = 0; this.body.scale.setScalar(1);
    const prevParent = this.root.parent; prevParent.remove(this.root);
    this.root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    const key = who + JSON.stringify(o.look || {});
    const cache = Human.cache[key] || (Human.cache[key] = Human.makeAssets(look, bi));
    const mk = (geo, mat) => { const m = new THREE.SkinnedMesh(geo, mat); m.bind(skeleton); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.body.add(m); return m; };
    this.mesh = mk(cache.body, cache.bodyMat);
    if (cache.hair) mk(cache.hair, cache.hairMat);
    if (cache.cap) mk(cache.cap, cache.capMat);
    prevParent.add(this.root);
    this.root.position.copy(saveP); this.root.rotation.y = saveR; this.body.scale.setScalar(saveS);
    // accessories on the head bone
    const head = this.bones.mixamorigHead;
    if (look.glasses) {
      const gm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
      const gg = new THREE.Group();
      for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0022, 6, 14), gm); t.position.set(s * 0.031, 0, 0); gg.add(t); }
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.003, 0.003), gm); gg.add(br);
      gg.position.set(0, (1.662 - 1.596) * 100, (0.1 - (-0.01)) * 100); gg.scale.setScalar(100);
      head.add(gg);
    }
    // animation
    this.mixer = new THREE.AnimationMixer(rig);
    this.actions = {};
    for (const n of ['idle', 'walk', 'run', 'sneak_pose', 'sad_pose', 'agree', 'headShake']) if (Humans.clips[n]) { const a = this.mixer.clipAction(Humans.clips[n]); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[n] = a; }
    this.cur = null;
    this.pose = o.pose || 'stand';
    this.t = Math.random() * 10; this.mixer.update(Math.random() * 2);
    this.speed = 0; this.path = null; this.talking = false; this.lookTarget = null;
    this.headYaw = 0; this.headPitch = 0; this.visible = true; this.gesture = 0;
    this.weights = { idle: 1 };
    this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._v = new THREE.Vector3();
  }
  static makeAssets(look, bi) {
    const r = U.seeded(look.h * 1000 | 0);
    const c = TEX.canvas(ATLAS.W, ATLAS.H), x = c.getContext('2d');
    paintFace(x, look, r);
    paintBody(x, look, r);
    const tex = TEX.make(c, { clamp: true }); tex.flipY = true; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const body = buildBody(look, bi);
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.15 });
    const out = { body, bodyMat };
    const hair = buildHair(look, bi);
    if (hair) { out.hair = hair; out.hairMat = new THREE.MeshStandardMaterial({ map: hairTexture(look.hair, 7), roughness: 0.6, color: 0xffffff, side: THREE.DoubleSide, envMapIntensity: 0.15 }); }
    if (look.hairStyle === 'cap') { out.cap = buildCap(look, bi); const cc = TEX.canvas(64, 64), cx = cc.getContext('2d'); cx.fillStyle = rgb(look.cap); cx.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { cx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; cx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } cx.fillStyle = 'rgba(230,220,200,.8)'; cx.fillRect(26, 54, 14, 6); out.capMat = new THREE.MeshStandardMaterial({ map: TEX.make(cc), roughness: 0.9, side: THREE.DoubleSide }); }
    return out;
  }
  get pos() { return this.root.position; }
  get head() { return this.bones.mixamorigHead; }
  setVisible(v) { this.root.visible = v; this.visible = v; }
  remove() { this.root.parent && this.root.parent.remove(this.root); }
  lookAt(t) { this.lookTarget = t; }
  face(x, z) { this.root.rotation.y = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  walkTo(points, speed = 1.3) {
    if (!Array.isArray(points[0])) points = [points];
    this.path = points.map(p => new THREE.Vector3(p[0], 0, p[1]));
    this.speed = speed; this.pose = speed > 2.5 ? 'run' : 'walk';
    return new Promise(res => { this._onArrive = res; });
  }
  update(dt) {
    this.t += dt;
    const p = this.root.position;
    if (this.path && this.path.length) {
      const tgt = this.path[0]; const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { this.path.shift(); if (!this.path.length) { this.path = null; this.pose = 'stand'; if (this._onArrive) { const f = this._onArrive; this._onArrive = null; f(); } } }
      else {
        const step = Math.min(d, this.speed * dt); p.x += dx / d * step; p.z += dz / d * step;
        this.root.rotation.y += U.angDiff(this.root.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 8);
        if (this.onStep) { this._stepAcc = (this._stepAcc || 0) + step; if (this._stepAcc > (this.pose === 'run' ? 1.1 : 0.7)) { this._stepAcc = 0; this.onStep(); } }
      }
    }
    if (G.level && G.level.groundFn && !this.noGround) p.y = G.level.groundAt(p.x, p.z);
    this.animate(dt);
  }
  animate(dt) {
    const pose = this.pose;
    // base clip weights
    const want = { idle: 0, walk: 0, run: 0, sneak_pose: 0, sad_pose: 0 };
    if (pose === 'walk') want.walk = 1;
    else if (pose === 'run') want.run = 1;
    else if (pose === 'crouch') want.sneak_pose = 1;
    else if (pose === 'tied') want.sad_pose = 1;
    else want.idle = 1;
    for (const k in want) { const a = this.actions[k]; if (!a) continue; const w = U.damp(a.getEffectiveWeight(), want[k], 8, dt); a.setEffectiveWeight(w); }
    if (this.actions.walk) this.actions.walk.timeScale = U.clamp((this.speed || 1.3) / 1.35, 0.5, 1.8) * this.s ** -1;
    if (this.actions.run) this.actions.run.timeScale = U.clamp((this.speed || 3.6) / 3.8, 0.6, 1.4);
    this.mixer.update(dt);
    // procedural layers
    const B = this.bones;
    this.rig.position.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const X = new THREE.Vector3(1, 0, 0), Yv = new THREE.Vector3(0, 1, 0), Zv = new THREE.Vector3(0, 0, 1);
    const rot = (bn, axis, ang) => this.rotWorld(B['mixamorig' + bn], axis, ang);
    if (pose === 'sit' || pose === 'tied') {
      this.rig.position.y = -0.45 / this.s;   // drop the hips onto the seat
      this.rig.position.z = -0.06 / this.s;
      this.root.updateMatrixWorld(true);
      for (const s of ['Left', 'Right']) { rot(s + 'UpLeg', X, -1.45); rot(s + 'Leg', X, 1.5); rot(s + 'Foot', X, -0.1); }
      if (pose === 'sit') { for (const s of ['Left', 'Right']) { rot(s + 'Arm', X, -0.55); rot(s + 'ForeArm', X, -0.7); } }
      else { for (const s of ['Left', 'Right']) { rot(s + 'Arm', X, 0.5); } rot('Neck', X, 0.35 + Math.sin(this.t * 1.7) * 0.05); }
    }
    if (pose === 'phone') { rot('RightArm', Zv, -1.1); rot('RightArm', X, -0.6); rot('RightForeArm', X, -2.0); }
    if (pose === 'flashlight' || this.holdLight) { rot('RightArm', X, -1.25); rot('RightArm', Yv, 0.2); rot('RightForeArm', X, -0.15); }
    if (this.talking) { const g = Math.sin(this.t * 2.3) * 0.12; rot('RightForeArm', X, -0.35 + g); rot('LeftForeArm', X, -0.2 - g * 0.6); }
    // head look + talk nod
    let wy = 0, wp = 0;
    if (this.lookTarget) {
      const hp = B.mixamorigHead.getWorldPosition(this._v);
      const dx = this.lookTarget.x - hp.x, dz = this.lookTarget.z - hp.z, dy = this.lookTarget.y - hp.y;
      wy = U.clamp(U.angDiff(this.root.rotation.y, Math.atan2(dx, dz)), -1.1, 1.1);
      wp = U.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.6, 0.6);
    }
    this.headYaw = U.damp(this.headYaw, wy, 4, dt); this.headPitch = U.damp(this.headPitch, wp, 4, dt);
    const nod = this.talking ? Math.sin(this.t * 6.5) * 0.04 + Math.sin(this.t * 2.9) * 0.05 : 0;
    rot('Neck', Yv, this.headYaw * 0.4); rot('Head', Yv, this.headYaw * 0.6);
    const right = new THREE.Vector3(Math.cos(this.headYaw), 0, -Math.sin(this.headYaw));
    rot('Head', right, this.headPitch * 0.7 + nod);
  }
  // rotate a bone about an axis given in character space
  rotWorld(bone, axisLocal, ang) {
    if (!bone || !ang) return;
    const rq = this.root.getWorldQuaternion(this._q2);
    const axis = axisLocal.clone().applyQuaternion(rq).normalize();
    const qb = bone.getWorldQuaternion(new THREE.Quaternion());
    const qr = new THREE.Quaternion().setFromAxisAngle(axis, ang);
    const qw = qr.multiply(qb);
    const qp = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(qp.multiply(qw));
    bone.updateMatrixWorld(true);
  }
}
Human.cache = {};
