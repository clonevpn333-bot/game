<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 09 — VEHICLES
   Procedural chassis meshes plus a semi-sim driving model: per-wheel spring
   suspension for the visuals, a slip-based tyre model for the handling.
   ========================================================================== */
const VEHICLE_CLASSES = {
  hatch:   { name:"Thorton Colby",   len:4.30, wid:1.82, hgt:1.44, mass:1450, power:5200,  grip:1.00, top:41, cls:"Economy",  price:14000 },
  sedan:   { name:"Villefort Alvarado", len:5.05, wid:1.95, hgt:1.48, mass:1780, power:6600,  grip:1.02, top:47, cls:"Executive",price:38000 },
  sport:   { name:"Quadra Turbo-R",  len:4.55, wid:1.98, hgt:1.22, mass:1420, power:11800, grip:1.34, top:74, cls:"Sport",    price:96000 },
  hyper:   { name:"Rayfield Caliburn",len:4.72, wid:2.06, hgt:1.16, mass:1380, power:17500, grip:1.52, top:92, cls:"Hypercar", price:340000 },
  suv:     { name:"Militech Basilisk",len:5.30, wid:2.16, hgt:1.92, mass:2650, power:9200,  grip:0.94, top:52, cls:"Utility",  price:72000 },
  van:     { name:"Chevillon Hauler",len:5.60, wid:2.10, hgt:2.24, mass:2900, power:7000,  grip:0.86, top:40, cls:"Cargo",    price:26000 },
  police:  { name:"NCPD Interceptor",len:5.10, wid:2.00, hgt:1.50, mass:1900, power:10800, grip:1.24, top:66, cls:"Police",   price:0 },
  muscle:  { name:"Archer Hellhound",len:4.95, wid:2.02, hgt:1.36, mass:1690, power:10200, grip:1.10, top:63, cls:"Muscle",   price:58000 },
  bike:    { name:"Yaiba Kusanagi",  len:2.20, wid:0.78, hgt:1.18, mass:245,  power:3400,  grip:1.18, top:78, cls:"Moto",     price:44000, bike:true },
};

const VEHICLE = {
  meshes: {}, wheelMesh: null,

  buildAll() {
    for (const k in VEHICLE_CLASSES) this.meshes[k] = this.build(k);
    const W = new MeshBuilder();
    /* tyre: sidewall bulge, shoulder radius, flat contact patch */
    W.mat(TEX.id("rubber"), 1, 0, 0).col(.075,.075,.08,0).uv(2.4);
    W.lathe([0.215,-0.115, 0.268,-0.118, 0.318,-0.105, 0.348,-0.070,
             0.356,-0.030, 0.356, 0.030, 0.348, 0.070, 0.318, 0.105,
             0.268, 0.118, 0.215, 0.115], 22, 0,0,0, 1,1,0);
    /* rim barrel + dished face */
    W.mat(TEX.id("metalPanel"), .28, 1, 0).col(.60,.62,.66,0).uv(3);
    W.lathe([0.215,-0.112, 0.222,-0.060, 0.222, 0.060, 0.215, 0.112], 22, 0,0,0, 1,1,0);
    W.lathe([0.0,0.070, 0.055,0.076, 0.140,0.082, 0.200,0.072, 0.222,0.055], 22, 0,0,0, 1,1,0);
    /* ten spokes, tapered */
    W.mat(TEX.id("metalPanel"), .32, 1, 0).col(.54,.56,.60,0).uv(3);
    for (let i = 0; i < 10; i++) {
      const a = i/10*TAU, ca = cos(a), sa = sin(a);
      for (let k = 0; k < 4; k++) {
        const t0 = 0.06 + k*0.038, t1 = t0 + 0.038;
        const w0 = 0.030*(1 - k*0.14), w1 = 0.030*(1 - (k+1)*0.14);
        W.quad([ca*t0 - sa*w0, 0.062, sa*t0 + ca*w0], [ca*t1 - sa*w1, 0.068, sa*t1 + ca*w1],
               [ca*t1 + sa*w1, 0.068, sa*t1 - ca*w1], [ca*t0 + sa*w0, 0.062, sa*t0 - ca*w0], 1, 1);
      }
    }
    /* brake disc + caliper behind the spokes */
    W.mat(TEX.id("gunmetal"), .35, 1, 0).col(.30,.31,.33,0).uv(4);
    W.lathe([0.0,0.0, 0.055,0.004, 0.170,0.006, 0.172,-0.006, 0.055,-0.004, 0,0], 18, 0,0,0,1,1,0);
    W.mat(TEX.id("paintKitsch"), .5, .2, 0).col(.72,.10,.06,0).uv(3);
    W.box(-0.028, -0.020, 0.120, 0.028, 0.030, 0.176);
    W.mat(TEX.id("gunmetal"), .3, 1, 0).col(.18,.18,.20,0).uv(4);
    W.lathe([0.0,0.074, 0.052,0.080, 0.054,0.070, 0,0.068], 14, 0,0,0,1,1,0);
    this.wheelMesh = W.build();
    return this;
  },

  /* ---------------------------------------------------------------------
     CHASSIS
     Bodies are lofted: a longitudinal set of stations, each carrying a
     superellipse cross-section whose width, sill height, shoulder height and
     corner sharpness are all functions of position along the car. That is
     what produces a real automotive surface — a tumblehome that leans in
     toward the roof, a sill that tucks under, and a shoulder line running the
     length of the body — instead of an extruded box.

     Silhouette targets per class (proportions, not badges):
       hatch  — tall cabin, short overhangs, upright tail
       sedan  — long bonnet, three-box, gentle roof arc
       sport  — cab-backward, low nose, fastback tail
       hyper  — mid-engined wedge, extreme rake, wide rear haunches
       muscle — long flat bonnet, high belt, kicked-up tail
       suv/van— slab sides, high roof, blunt fascia
     --------------------------------------------------------------------- */
  build(kind) {
    const C = VEHICLE_CLASSES[kind];
    const B = new MeshBuilder();
    const car = TEX.id("carPaint"), gls = TEX.id("glassPanel"), met = TEX.id("metalPanel");
    const gun = TEX.id("gunmetal"), rub = TEX.id("rubber"), tec = TEX.id("tech");
    const L = C.len, W = C.wid, H = C.hgt;
    const hw = W*.5, hl = L*.5;
    if (C.bike) return this.buildBike(B, C);

    const S = {
      hatch:  { nose:0.44, tail:0.42, cabF: 0.16, cabR:-0.46, roof:0.98, belt:0.56, sill:0.30,
                rakeF:0.30, rakeR:0.16, haunch:1.00, wheelR:0.33, tumble:0.90, nOut:2.5 },
      sedan:  { nose:0.40, tail:0.36, cabF: 0.02, cabR:-0.52, roof:0.96, belt:0.58, sill:0.28,
                rakeF:0.40, rakeR:0.34, haunch:1.02, wheelR:0.34, tumble:0.86, nOut:2.8 },
      sport:  { nose:0.30, tail:0.34, cabF:-0.10, cabR:-0.56, roof:0.92, belt:0.60, sill:0.22,
                rakeF:0.52, rakeR:0.50, haunch:1.10, wheelR:0.34, tumble:0.78, nOut:3.2 },
      hyper:  { nose:0.24, tail:0.30, cabF:-0.16, cabR:-0.50, roof:0.88, belt:0.60, sill:0.18,
                rakeF:0.60, rakeR:0.56, haunch:1.16, wheelR:0.35, tumble:0.72, nOut:3.6 },
      muscle: { nose:0.46, tail:0.34, cabF:-0.06, cabR:-0.54, roof:0.94, belt:0.62, sill:0.26,
                rakeF:0.42, rakeR:0.30, haunch:1.08, wheelR:0.36, tumble:0.84, nOut:3.0 },
      suv:    { nose:0.38, tail:0.30, cabF: 0.20, cabR:-0.54, roof:1.00, belt:0.58, sill:0.36,
                rakeF:0.26, rakeR:0.12, haunch:1.02, wheelR:0.40, tumble:0.95, nOut:2.3 },
      van:    { nose:0.26, tail:0.20, cabF: 0.30, cabR:-0.62, roof:1.00, belt:0.54, sill:0.34,
                rakeF:0.22, rakeR:0.06, haunch:1.00, wheelR:0.38, tumble:0.97, nOut:2.2 },
      police: { nose:0.40, tail:0.34, cabF: 0.04, cabR:-0.52, roof:0.96, belt:0.58, sill:0.28,
                rakeF:0.38, rakeR:0.30, haunch:1.04, wheelR:0.35, tumble:0.86, nOut:2.8 },
    }[kind] || { nose:0.40, tail:0.36, cabF:0.02, cabR:-0.52, roof:0.96, belt:0.58, sill:0.28,
                 rakeF:0.40, rakeR:0.34, haunch:1.02, wheelR:0.34, tumble:0.86, nOut:2.8 };

    const roofY = H * S.roof, beltY = H * S.belt, sillY = H * S.sill;
    const wz = hl * 0.66;                       // wheel centres
    const wr = S.wheelR;

    /* ---- longitudinal shape functions (t = z/hl in [-1, 1]) ---------- */
    const halfW = (t) => {
      /* widest over the rear haunches, tapering into both fascias */
      let w = hw * (1 - 0.14*Math.pow(abs(t), 3.2));
      if (t < -0.25) w *= lerp(1, S.haunch, sat((-t - 0.25)/0.55));
      if (t > 0.55) w *= lerp(1, 0.90, sat((t-0.55)/0.45));
      if (t < -0.86) w *= lerp(1, 0.88, sat((-t - 0.86)/0.14));
      return w;
    };
    const topY = (t) => {
      /* bonnet -> windscreen base -> roof -> backlight -> boot */
      if (t > S.cabF) return lerp(beltY*1.02, beltY*(1 - S.nose*0.20), sat((t - S.cabF)/(1 - S.cabF)));
      if (t > S.cabR) return beltY;
      return lerp(beltY, beltY*(1 - S.tail*0.16), sat((S.cabR - t)/(1 + S.cabR)));
    };
    const botY = (t) => sillY * (1 - 0.30*Math.pow(abs(t), 2.6));

    /* ---- loft the lower body ---------------------------------------- */
    const NS = 22, NR = 16;
    B.mat(car, 1, 1, 0).col(1,1,1,0).uv(.55);
    const ringPt = (t, i) => {
      const a = i/NR*TAU, ca = cos(a), sa = sin(a);
      const w = halfW(t), yT = topY(t), yB = botY(t);
      const cy = (yT + yB)*0.5, ry = (yT - yB)*0.5;
      const n = S.nOut;
      const cx2 = Math.sign(ca)*Math.pow(abs(ca), 2/n);
      const cy2 = Math.sign(sa)*Math.pow(abs(sa), 2/n);
      /* tumblehome: pull the top of the section inboard */
      const lean = 1 - (1 - S.tumble) * sat(cy2) ;
      return [cx2*w*lean, cy + cy2*ry, t*hl];
    };
    const base = B.nv;
    for (let sIdx = 0; sIdx <= NS; sIdx++) {
      const t = -1 + 2*sIdx/NS;
      for (let i = 0; i <= NR; i++) {
        const p = ringPt(t, i);
        const q = ringPt(t, i+1), r = ringPt(t + 0.001, i);
        const ux = q[0]-p[0], uy = q[1]-p[1], uz = q[2]-p[2];
        const vx = r[0]-p[0], vy = r[1]-p[1], vz = r[2]-p[2];
        let nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
        const nl = hypot(nx,ny,nz)||1;
        B.vert(p[0], p[1], p[2], nx/nl, ny/nl, nz/nl, i/NR*2.2, sIdx/NS*2.2);
      }
    }
    for (let sIdx = 0; sIdx < NS; sIdx++) for (let i = 0; i < NR; i++) {
      const a = base + sIdx*(NR+1) + i, b = a + NR + 1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
    /* fascia caps */
    for (const t of [-1, 1]) {
      const cy = (topY(t) + botY(t))*0.5;
      const c = B.vert(0, cy, t*hl, 0, 0, sign(t), 0, 0);
      for (let i = 0; i < NR; i++) {
        const p = ringPt(t, i), q = ringPt(t, i+1);
        const a = B.vert(p[0],p[1],p[2], 0,0,sign(t), p[0], p[1]);
        const b2 = B.vert(q[0],q[1],q[2], 0,0,sign(t), q[0], q[1]);
        if (t > 0) B.idx.push(c, a, b2); else B.idx.push(c, b2, a);
      }
    }
    B.smoothNormals(0.004);

    /* ---- wheel arches: a flared lip around each wheel well ----------- */
    B.mat(car, 1, 1, 0).col(.86,.86,.88,0).uv(.6);
    for (let sx = -1; sx <= 1; sx += 2) for (let sz = -1; sz <= 1; sz += 2) {
      const cz = sz*wz;
      const t = cz/hl;
      const w = halfW(t);
      const seg = 12;
      for (let i = 0; i < seg; i++) {
        const a0 = PI*i/seg, a1 = PI*(i+1)/seg;
        const R0 = wr*1.30, R1 = wr*1.46;
        const P0 = [sx*w*0.99, wr*0.32 + sin(a0)*R0, cz - cos(a0)*R0];
        const P1 = [sx*w*0.99, wr*0.32 + sin(a1)*R0, cz - cos(a1)*R0];
        const P2 = [sx*(w*0.99 + 0.045), wr*0.32 + sin(a1)*R1, cz - cos(a1)*R1];
        const P3 = [sx*(w*0.99 + 0.045), wr*0.32 + sin(a0)*R1, cz - cos(a0)*R1];
        if (sx > 0) B.quad(P0, P1, P2, P3, 1, 1); else B.quad(P3, P2, P1, P0, 1, 1);
      }
      /* dark wheel-well interior so the arch reads as an opening */
      B.mat(gun, .9, .3, 0).col(.05,.05,.055,0).uv(1);
      for (let i = 0; i < seg; i++) {
        const a0 = PI*i/seg, a1 = PI*(i+1)/seg;
        const R0 = wr*1.28;
        B.quad([sx*w*0.97, wr*0.32 + sin(a0)*R0, cz - cos(a0)*R0],
               [sx*w*0.97, wr*0.32 + sin(a1)*R0, cz - cos(a1)*R0],
               [sx*w*0.55, wr*0.32 + sin(a1)*R0, cz - cos(a1)*R0],
               [sx*w*0.55, wr*0.32 + sin(a0)*R0, cz - cos(a0)*R0], 1, 1);
      }
      B.mat(car, 1, 1, 0).col(.86,.86,.88,0).uv(.6);
    }

    /* ---- greenhouse: pillars, roof panel, raked glass ---------------- */
    const cabZ0 = S.cabR*hl, cabZ1 = S.cabF*hl;
    const wCab = halfW((S.cabF + S.cabR)*0.5);
    B.mat(met, .5, 1, 0).col(.10,.10,.12,0).uv(.9);
    for (let sx = -1; sx <= 1; sx += 2) {
      const px = sx*wCab*0.90;
      /* A pillar leans back with the windscreen rake */
      B.box(px-0.035, beltY, cabZ1 - S.rakeF*hl*0.55, px+0.035, roofY, cabZ1 - S.rakeF*hl*0.55 + 0.09);
      B.box(px-0.032, beltY, cabZ0 + S.rakeR*hl*0.42 - 0.09, px+0.032, roofY, cabZ0 + S.rakeR*hl*0.42);
      B.box(px-0.030, beltY, (cabZ0+cabZ1)*.5-0.035, px+0.030, roofY, (cabZ0+cabZ1)*.5+0.035);
    }
    B.mat(car, 1, 1, 0).col(1,1,1,0).uv(.55);
    /* roof panel with a slight crown */
    const rz0 = cabZ0 + S.rakeR*hl*0.42, rz1 = cabZ1 - S.rakeF*hl*0.55;
    for (let i = 0; i < 6; i++) {
      const u0 = -1 + 2*i/6, u1 = -1 + 2*(i+1)/6;
      const y0 = roofY - 0.022*u0*u0, y1 = roofY - 0.022*u1*u1;
      B.quad([u0*wCab*0.90, y0, rz1], [u1*wCab*0.90, y1, rz1],
             [u1*wCab*0.90, y1, rz0], [u0*wCab*0.90, y0, rz0], 1, 1);
    }
    B.mat(gls, .5, .6, 0).col(.13,.16,.19,0).uv(.6);
    B.quad([-wCab*0.88, beltY, cabZ1], [wCab*0.88, beltY, cabZ1],
           [wCab*0.86, roofY-0.03, rz1], [-wCab*0.86, roofY-0.03, rz1]);
    B.quad([wCab*0.86, roofY-0.03, rz0], [wCab*0.88, beltY, cabZ0],
           [-wCab*0.88, beltY, cabZ0], [-wCab*0.86, roofY-0.03, rz0]);
    for (let sx = -1; sx <= 1; sx += 2) {
      B.quad([sx*wCab*0.905, beltY, rz0+0.02], [sx*wCab*0.905, beltY, rz1-0.02],
             [sx*wCab*0.875, roofY-0.035, rz1-0.10], [sx*wCab*0.875, roofY-0.035, rz0+0.10]);
    }

    /* ---- fascias: lights, grille, splitter, diffuser ----------------- */
    const fw = halfW(1);
    B.mat(tec, .16, .4, 0).col(.92,.96,1, 1.1).uv(2);
    if (kind === "hyper" || kind === "sport") {
      /* full-width light bar — the signature future-car cue */
      B.box(-fw*0.86, beltY*0.70, hl-0.05, fw*0.86, beltY*0.70+0.045, hl+0.015);
    } else {
      B.box(-fw*0.84, beltY*0.66, hl-0.06, -fw*0.34, beltY*0.66+0.085, hl+0.015);
      B.box( fw*0.34, beltY*0.66, hl-0.06,  fw*0.84, beltY*0.66+0.085, hl+0.015);
    }
    const rwv = halfW(-1);
    B.mat(tec, .16, .4, 0).col(1,.10,.16, 1.2).uv(2);
    B.box(-rwv*0.88, beltY*0.68, -hl-0.015, rwv*0.88, beltY*0.68+0.05, -hl+0.05);
    B.mat(gun, .55, 1, 0).col(.07,.07,.08,0).uv(2);
    B.box(-fw*0.60, beltY*0.30, hl-0.02, fw*0.60, beltY*0.56, hl+0.025);      // grille
    B.box(-fw*0.86, sillY*0.42, hl-0.10, fw*0.86, sillY*0.42+0.05, hl+0.05);  // splitter
    B.box(-rwv*0.80, sillY*0.40, -hl-0.05, rwv*0.80, sillY*0.40+0.09, -hl+0.10); // diffuser
    B.mat(gun, .45, 1, 0).col(.32,.33,.35,0).uv(3);
    B.cylinder(-rwv*0.52, sillY*0.55, -hl-0.02, 0.048, 0.048, 0.10, 8, true, 3);
    B.cylinder(-rwv*0.36, sillY*0.55, -hl-0.02, 0.048, 0.048, 0.10, 8, true, 3);
    /* side sills + shoulder crease */
    B.mat(car, 1, 1, 0).col(.80,.80,.82,0).uv(.7);
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*hw*0.97-0.02, sillY*0.42, -hl*0.62, sx*hw*0.97+0.02, sillY*0.42+0.055, hl*0.62);
    }
    /* mirrors on stalks */
    B.mat(met, .45, 1, 0).col(.14,.14,.16,0).uv(2);
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*wCab*0.90, beltY+0.02, cabZ1-0.30, sx*(wCab*0.90+0.055), beltY+0.055, cabZ1-0.24);
      B.mat(car, 1, 1, 0).col(1,1,1,0);
      B.box(sx*(wCab*0.90+0.045), beltY+0.005, cabZ1-0.33, sx*(wCab*0.90+0.155), beltY+0.085, cabZ1-0.21);
      B.mat(met, .45, 1, 0).col(.14,.14,.16,0);
    }
    /* door shut lines */
    B.mat(gun, .8, .4, 0).col(.05,.05,.06,0).uv(2);
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*hw*0.995, sillY*0.5, cabZ1-0.03, sx*hw*1.005, beltY, cabZ1+0.01);
      B.box(sx*hw*0.995, sillY*0.5, cabZ0-0.01, sx*hw*1.005, beltY, cabZ0+0.03);
    }

    /* ---- class dressing --------------------------------------------- */
    if (kind === "police") {
      B.mat(gun, .5, 1, 0).col(.05,.05,.06,0).uv(2);
      B.box(-wCab*0.66, roofY, (cabZ0+cabZ1)*.5-0.14, wCab*0.66, roofY+0.075, (cabZ0+cabZ1)*.5+0.14);
      B.mat(tec, .2, .5, 0).col(.12,.32,1, 3.0).uv(3);
      B.box(-wCab*0.64, roofY+0.075, (cabZ0+cabZ1)*.5-0.12, -0.015, roofY+0.165, (cabZ0+cabZ1)*.5+0.12);
      B.mat(tec, .2, .5, 0).col(1,.09,.18, 3.0).uv(3);
      B.box(0.015, roofY+0.075, (cabZ0+cabZ1)*.5-0.12, wCab*0.64, roofY+0.165, (cabZ0+cabZ1)*.5+0.12);
      B.mat(met, .8, 1, 0).col(.05,.05,.06,0).uv(1);
      B.box(-hw*1.01, sillY*0.5, hl*0.72, hw*1.01, beltY*0.72, hl+0.09);   // push bar
      B.mat(car, 1, 1, 0).col(1,1,1,0).uv(.6);
      for (let sx = -1; sx <= 1; sx += 2)                                   // livery panel
        B.box(sx*hw*1.002, sillY*0.55, -hl*0.30, sx*hw*1.012, beltY*0.92, hl*0.35);
    }
    if (kind === "hyper" || kind === "sport") {
      B.mat(gun, .35, 1, 0).col(.06,.06,.07,0).uv(2);
      /* swan-neck rear wing */
      B.box(-hw*0.86, beltY*1.02, -hl-0.14, hw*0.86, beltY*1.02+0.035, -hl+0.10);
      for (let sx = -1; sx <= 1; sx += 2)
        B.box(sx*hw*0.62-0.02, beltY*0.80, -hl-0.02, sx*hw*0.62+0.02, beltY*1.02, -hl+0.06);
      /* side intakes ahead of the rear wheels */
      B.mat(gun, .8, 1, 0).col(.04,.04,.045,0).uv(2);
      for (let sx = -1; sx <= 1; sx += 2)
        B.box(sx*hw*0.94, sillY*0.8, -hl*0.42, sx*hw*1.005, beltY*0.86, -hl*0.16);
    }
    if (kind === "muscle") {
      B.mat(gun, .5, 1, 0).col(.06,.06,.07,0).uv(2);
      B.box(-0.16, topY(0.62)-0.005, hl*0.40, 0.16, topY(0.62)+0.075, hl*0.66);   // bonnet scoop
    }
    if (kind === "van" || kind === "suv") {
      B.mat(met, .9, 1, 0).col(.26,.26,.28,0).uv(1.4);
      B.box(-wCab*0.86, roofY, cabZ0+0.10, wCab*0.86, roofY+0.055, cabZ1-0.10);
      for (let i = 0; i < 4; i++)
        B.box(-wCab*0.86, roofY+0.055, cabZ0+0.22+i*0.46, wCab*0.86, roofY+0.10, cabZ0+0.29+i*0.46);
    }

    /* ---- interior (visible from the driver's seat) ------------------- */
    B.mat(TEX.id("leather"), 1, .1, 0).col(.09,.09,.11,0).uv(1.6);
    B.box(-wCab*0.86, beltY-0.26, cabZ1-0.44, wCab*0.86, beltY-0.17, cabZ1-0.10);   // dash
    B.box(-wCab*0.88, beltY-0.30, cabZ1-0.10, wCab*0.88, beltY-0.24, cabZ0+0.10);   // centre console
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*wCab*0.44-0.22, sillY+0.14, cabZ1-0.98, sx*wCab*0.44+0.22, sillY+0.32, cabZ1-0.50);
      B.box(sx*wCab*0.44-0.22, sillY+0.32, cabZ1-1.02, sx*wCab*0.44+0.22, sillY+0.86, cabZ1-0.92);
      B.box(sx*wCab*0.44-0.20, sillY+0.86, cabZ1-1.00, sx*wCab*0.44+0.20, sillY+0.98, cabZ1-0.94);
    }
    B.mat(TEX.id("holoPanel"), .15, .4, 0).col(.06,.55,.78, 1.3).uv(2);
    B.box(-0.20, beltY-0.245, cabZ1-0.455, 0.26, beltY-0.185, cabZ1-0.445);          // cluster
    B.box(-0.09, beltY-0.29, cabZ1-0.20, 0.11, beltY-0.245, cabZ1-0.12);             // centre screen
    B.mat(gun, .5, 1, 0).col(.10,.10,.12,0).uv(3);
    const swZ = cabZ1-0.56, swY = beltY-0.16;
    B.cylinder(-wCab*0.44, swY, swZ, 0.155, 0.155, 0.028, 16, true, 3);

    const m = B.build();
    m.cls = C; m.kind = kind;
    const wx = hw*0.90;
    m.wheels = [[-wx, wr, wz], [wx, wr, wz], [-wx, wr, -wz], [wx, wr, -wz]];
    m.wheelR = wr;
    m.seatL = [-wCab*0.44, sillY+1.02, cabZ1-0.70];
    m.seatR = [ wCab*0.44, sillY+1.02, cabZ1-0.70];
    return m;
  },

  buildBike(B, C) {
    const car = TEX.id("carPaint"), gun = TEX.id("gunmetal"), tec = TEX.id("tech");
    const met = TEX.id("metalPanel"), lea = TEX.id("leather");
    B.mat(car, 1, 1, 0).col(1,1,1,0).uv(1.2);
    B.box(-0.16, 0.56, -0.46, 0.16, 0.86, 0.52);
    B.box(-0.20, 0.62, 0.30, 0.20, 0.94, 0.92);                 // tank/fairing
    B.mat(lea, 1, .1, 0).col(.07,.07,.08,0).uv(2);
    B.box(-0.16, 0.86, -0.42, 0.16, 0.94, 0.28);                // seat
    B.mat(gun, .4, 1, 0).col(.24,.25,.27,0).uv(2.5);
    B.cylinder(0, 0.30, 0.86, 0.05, 0.05, 0.72, 8, true, 2);    // forks
    B.box(-0.30, 1.00, 0.70, 0.30, 1.06, 0.78);                 // bars
    B.cylinder(0, 0.34, -0.72, 0.06, 0.06, 0.40, 8, true, 2);   // swingarm post
    B.mat(tec, .2, .4, 0).col(.85,.95,1, 1.4).uv(3);
    B.box(-0.13, 0.96, 0.90, 0.13, 1.10, 0.96);
    B.mat(tec, .2, .4, 0).col(1,.1,.2, 1.4).uv(3);
    B.box(-0.09, 0.84, -0.50, 0.09, 0.92, -0.46);
    B.mat(met, .5, 1, 0).col(.4,.41,.44,0).uv(3);
    B.cylinder(0.14, 0.46, -0.30, 0.05, 0.05, 0.5, 8, true, 3);
    const m = B.build();
    m.cls = C; m.kind = "bike";
    m.wheels = [[0, 0.34, 0.80], [0, 0.34, -0.72]];
    m.wheelR = 0.34;
    m.seatL = [0, 1.14, -0.05]; m.seatR = m.seatL;
    return m;
  },
};

/* ==========================================================================
   DRIVING MODEL
   ======================================================================== */
class Car {
  constructor(kind, x, z, yaw, colour) {
    this.kind = kind;
    this.C = VEHICLE_CLASSES[kind];
    this.mesh = VEHICLE.meshes[kind];
    this.p = V3.n(x, CITY.height(x, z) + 0.5, z);
    this.v = V3.n();
    this.yaw = yaw || 0;
    this.yawRate = 0;
    this.pitch = 0; this.roll = 0;
    this.steer = 0; this.throttle = 0; this.brake = 0; this.handbrake = 0;
    this.rpm = 0; this.gear = 1; this.speed = 0;
    this.wheelSpin = 0; this.susp = [0,0,0,0]; this.grounded = true;
    this.hp = 100; this.destroyed = false; this.burn = 0;
    this.colour = colour || [.5,.5,.55];
    this.model = M4.n(); this.prevModel = M4.n();
    this.headlights = false;
    this.occupant = null;
    this.ai = null;
    this.driftAmt = 0;
    this.id = Car.nextId++;
  }
  update(dt, world) {
    const C = this.C;
    const c = cos(this.yaw), s = sin(this.yaw);
    /* body-frame velocity */
    const fx = -s, fz = c;                        // forward
    const rx = -c, rz = -s;                       // right
    let vf = this.v[0]*fx + this.v[2]*fz;
    let vr = this.v[0]*rx + this.v[2]*rz;
    this.speed = hypot(this.v[0], this.v[2]);

    const gy = CITY.height(this.p[0], this.p[2]);
    const onGround = this.p[1] <= gy + 0.62;
    this.grounded = onGround;

    if (onGround) {
      /* --- longitudinal ------------------------------------------------ */
      const powerScale = 1 / max(1, abs(vf)*0.45 + 1);
      let drive = this.throttle * (C.power/C.mass) * powerScale;
      if (this.throttle < 0) drive = this.throttle * (C.power/C.mass) * 0.45;
      vf += drive * dt;
      /* braking + engine braking + rolling resistance */
      if (this.brake > 0) vf = moveTo(vf, 0, this.brake * 16 * dt);
      vf -= vf * (0.42 + this.handbrake*1.2) * dt;
      /* aero drag rises with the square of speed and caps the top end */
      const dragK = 0.0016 * (C.top > 70 ? 0.72 : 1.0);
      vf -= sign(vf) * vf*vf * dragK * dt * (60/ max(1,C.mass/1000*60));
      if (abs(vf) > C.top) vf = sign(vf)*C.top;

      /* --- lateral: slip-limited grip, which is what produces drift ---- */
      const gripBase = C.grip * (this.handbrake > .5 ? 0.34 : 1.0);
      const wet = (world && world.wetness) ? 1 - world.wetness*0.30 : 1;
      const maxLat = gripBase * 15.5 * wet;
      const slip = -vr;
      const lat = clamp(slip * 9.0, -maxLat, maxLat);
      vr += lat * dt;
      this.driftAmt = damp(this.driftAmt, sat(abs(vr)/6), 6, dt);

      /* --- steering: speed-sensitive, with a slip-angle yaw response --- */
      const steerLimit = lerp(0.62, 0.16, sat(abs(vf)/40));
      const st = this.steer * steerLimit;
      const wheelbase = C.len*0.62;
      const targetYawRate = abs(vf) > 0.4 ? (vf/wheelbase) * Math.tan(st) : 0;
      this.yawRate = damp(this.yawRate, targetYawRate + (this.handbrake>0.5 ? -sign(vr)*abs(vf)*0.05 : 0), 9, dt);
      this.yaw += this.yawRate * dt;

      this.v[0] = fx*vf + rx*vr;
      this.v[2] = fz*vf + rz*vr;
      this.v[1] = damp(this.v[1], 0, 12, dt);
      this.p[1] = damp(this.p[1], gy + 0.5, 14, dt);
      /* body roll and pitch from lateral/longitudinal load transfer */
      this.roll = damp(this.roll, clamp(-vr*0.045, -0.20, 0.20), 8, dt);
      this.pitch = damp(this.pitch, clamp((this.brake>0?0.05:0) - drive*0.006, -0.09, 0.09), 7, dt);
    } else {
      this.v[1] -= 22 * dt;
      this.p[1] = max(gy + 0.5, this.p[1] + this.v[1]*dt);
      this.pitch = damp(this.pitch, clamp(-this.v[1]*0.02, -0.3, 0.3), 3, dt);
    }
    this.p[0] += this.v[0]*dt;
    this.p[2] += this.v[2]*dt;

    this.wheelSpin += (vf / 0.36) * dt;
    this.rpm = damp(this.rpm, sat(abs(vf)/C.top)*0.82 + abs(this.throttle)*0.18, 6, dt);
    if (this.burn > 0) { this.burn -= dt; if (this.burn <= 0) this.destroyed = true; }

    /* keep the chassis matrix ready for the renderer */
    M4.cpy(this.prevModel, this.model);
    const q = Q4.n();
    Q4.euler(q, this.pitch, -this.yaw, this.roll);
    M4.trs(this.model, this.p[0], this.p[1], this.p[2], q[0], q[1], q[2], q[3], 1, 1, 1);
    return this;
  }
  /* world position of a seat */
  seatWorld(out, right) {
    const m = this.mesh ? (right ? this.mesh.seatR : this.mesh.seatL) : [0,1,0];
    return V3.xfm(out, m, this.model);
  }
  forward(out) { const c = cos(this.yaw), s = sin(this.yaw); return V3.set(out, -s, 0, c); }
  damage(n) {
    this.hp -= n;
    if (this.hp <= 0 && this.burn <= 0) this.burn = 2.4;
  }
}
Car.nextId = 1;

/* ==========================================================================
   TRAFFIC — vehicles that follow the road graph
   ======================================================================== */
const TRAFFIC = {
  cars: [], MAX: 26, R: rng(0xC4A5),
  kinds: ["hatch","sedan","sport","suv","van","muscle","hatch","sedan"],

  update(dt, px, pz, world) {
    /* spawn / despawn around the player, always out of direct sight */
    for (let i = this.cars.length-1; i >= 0; i--) {
      const c = this.cars[i];
      if (hypot(c.p[0]-px, c.p[2]-pz) > 340 || c.destroyed) this.cars.splice(i, 1);
    }
    let guard = 0;
    while (this.cars.length < this.MAX && guard++ < 8) {
      const a = this.R()*TAU, d = 120 + this.R()*160;
      const x = px + cos(a)*d, z = pz + sin(a)*d;
      if (CITY.inWater(x, z) || CITY.cityFalloff(x, z) > .55) continue;
      const n = this.nearestNode(x, z);
      if (!n) continue;
      const kind = this.kinds[(this.R()*this.kinds.length)|0];
      const car = new Car(kind, n.x, n.z, this.R()*TAU, hsl(this.R(), .18+this.R()*.4, .18+this.R()*.5));
      car.ai = { node: n, next: null, t: 0, cruise: 8 + this.R()*10 };
      car.headlights = true;
      this.pickNext(car);
      this.cars.push(car);
    }
    for (const c of this.cars) {
      /* Skip anything another system is already driving: the car the player is
         sitting in, and NCPD units under POLICE control. Both used to fall
         through to the ambient AI and double-integrate — or crash on a null ai. */
      if (c.occupant || c.policeControlled) continue;
      this.driveAI(c, dt, px, pz);
    }
  },
  nearestNode(x, z) {
    const cands = CITY.nodeGrid.query(x, z, 160, []);
    let best = null, bd = 1e9;
    for (const n of cands) { const d = (n.x-x)*(n.x-x)+(n.z-z)*(n.z-z);
      if (d < bd && n.e.length > 1) { bd = d; best = n; } }
    return best;
  },
  pickNext(car) {
    const a = car.ai;
    if (!a) return;                      // player-driven or police-controlled
    const n = a.node;
    if (!n || !n.e.length) { a.next = null; return; }
    /* prefer continuing roughly straight — keeps traffic from ping-ponging */
    let best = null, bestScore = -1e9;
    const fx = -sin(car.yaw), fz = cos(car.yaw);
    for (const ei of n.e) {
      const e = CITY.edges[ei];
      const o = CITY.nodes[e.a === n.id ? e.b : e.a];
      if (a.prev && o.id === a.prev) continue;
      const dx = o.x-n.x, dz = o.z-n.z, l = hypot(dx,dz)||1;
      const score = (dx/l*fx + dz/l*fz) + this.R()*0.35;
      if (score > bestScore) { bestScore = score; best = o; }
    }
    if (!best) { for (const ei of n.e) { const e = CITY.edges[ei];
      best = CITY.nodes[e.a === n.id ? e.b : e.a]; break; } }
    a.next = best; a.t = 0;
  },
  driveAI(car, dt, px, pz) {
    const a = car.ai;
    if (!a) { car.throttle = 0; car.update(dt); return; }
    if (!a.next) { this.pickNext(car); car.throttle = 0; car.update(dt); return; }
    const tx = a.next.x, tz = a.next.z;
    const dx = tx-car.p[0], dz = tz-car.p[2];
    const dist = hypot(dx, dz);
    if (dist < 7) { a.prev = a.node ? a.node.id : null; a.node = a.next; this.pickNext(car); }
    const want = atan2(-dx, dz);
    const err = angDiff(car.yaw, want);
    car.steer = clamp(err*1.5, -1, 1);
    /* slow for corners and for anything directly ahead */
    const cornerFactor = 1 - sat(abs(err)*0.8);
    let target = a.cruise * (0.35 + cornerFactor*0.65);
    for (const o of this.cars) {
      if (o === car) continue;
      const ox = o.p[0]-car.p[0], oz = o.p[2]-car.p[2];
      const fwd = -sin(car.yaw)*ox + cos(car.yaw)*oz;
      const side = cos(car.yaw)*ox + sin(car.yaw)*oz;
      if (fwd > 0 && fwd < 16 && abs(side) < 2.6) target = min(target, o.speed*0.85);
    }
    /* yield to the player on foot */
    const pfx = px-car.p[0], pfz = pz-car.p[2];
    const pf = -sin(car.yaw)*pfx + cos(car.yaw)*pfz;
    const ps = cos(car.yaw)*pfx + sin(car.yaw)*pfz;
    if (pf > 0 && pf < 13 && abs(ps) < 2.4) target = 0;
    if (car.speed < target) { car.throttle = .8; car.brake = 0; }
    else { car.throttle = 0; car.brake = sat((car.speed-target)*0.35); }
    car.update(dt);
  },
};
</script>
