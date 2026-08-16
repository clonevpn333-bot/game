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
    W.mat(TEX.id("rubber"), 1, 0, 0).col(.09,.09,.10,0).uv(2.4);
    W.lathe([0,-0.12, 0.34,-0.12, 0.36,-0.06, 0.36,0.06, 0.34,0.12, 0,0.12], 16, 0,0,0, 1,1,0);
    W.mat(TEX.id("metalPanel"), .35, 1, 0).col(.52,.53,.56,0).uv(3);
    W.lathe([0,-0.055, 0.21,-0.05, 0.235,0, 0.21,0.05, 0,0.055], 14, 0,0,0, 1,1,0);
    W.mat(TEX.id("gunmetal"), .3, 1, 0).col(.3,.31,.33,0).uv(4);
    for (let i = 0; i < 5; i++) {
      const a = i/5*TAU;
      W.box(cos(a)*0.06-0.012, -0.062, sin(a)*0.06-0.012, cos(a)*0.06+0.012, 0.062, sin(a)*0.06+0.012);
    }
    this.wheelMesh = W.build();
    return this;
  },

  build(kind) {
    const C = VEHICLE_CLASSES[kind];
    const B = new MeshBuilder();
    const car = TEX.id("carPaint"), gls = TEX.id("glassPanel"), met = TEX.id("metalPanel");
    const gun = TEX.id("gunmetal"), rub = TEX.id("rubber"), tec = TEX.id("tech");
    const L = C.len, W = C.wid, H = C.hgt;
    const hw = W*.5, hl = L*.5;
    if (C.bike) return this.buildBike(B, C);

    const lowSlung = kind === "sport" || kind === "hyper";
    const boxy = kind === "van" || kind === "suv" || kind === "police";
    const sillY = 0.30, beltY = lowSlung ? 0.80 : (boxy ? 1.10 : 0.92);
    const roofY = H;

    /* ---- lower body: a swept 8-point section extruded along the length -- */
    B.mat(car, 1, 1, 0).col(1,1,1,0).uv(.55);
    const sections = [
      { z:-hl,        w:hw*0.80, y0:0.34, y1:beltY*0.86 },
      { z:-hl*0.86,   w:hw*0.94, y0:0.26, y1:beltY*0.94 },
      { z:-hl*0.50,   w:hw*1.00, y0:0.22, y1:beltY },
      { z: 0,         w:hw*1.00, y0:0.22, y1:beltY },
      { z: hl*0.50,   w:hw*1.00, y0:0.22, y1:beltY },
      { z: hl*0.86,   w:hw*0.94, y0:0.26, y1:beltY*0.96 },
      { z: hl,        w:hw*0.78, y0:0.34, y1:beltY*0.80 },
    ];
    const ring = (s) => {
      /* 10-point rounded rectangle in the XY plane at depth z */
      const p = [];
      const w = s.w, y0 = s.y0, y1 = s.y1, r = min(w, (y1-y0))*0.30;
      p.push([-w+r, y0], [w-r, y0], [w, y0+r], [w, y1-r*0.6], [w-r*0.6, y1],
             [-w+r*0.6, y1], [-w, y1-r*0.6], [-w, y0+r]);
      return p;
    };
    for (let i = 0; i < sections.length-1; i++) {
      const A = ring(sections[i]), Bg = ring(sections[i+1]);
      const za = sections[i].z, zb = sections[i+1].z;
      for (let k = 0; k < A.length; k++) {
        const k2 = (k+1)%A.length;
        B.quad([A[k][0], A[k][1], za], [A[k2][0], A[k2][1], za],
               [Bg[k2][0], Bg[k2][1], zb], [Bg[k][0], Bg[k][1], zb], 1, 1);
      }
    }
    /* end caps */
    for (const s of [sections[0], sections[sections.length-1]]) {
      const A = ring(s);
      const cxs = 0, cys = (s.y0+s.y1)*.5;
      for (let k = 0; k < A.length; k++) {
        const k2 = (k+1)%A.length;
        const sgn = s.z < 0 ? 1 : -1;
        const a = B.vert(cxs, cys, s.z, 0,0,sgn, 0,0);
        const b2 = B.vert(A[k][0], A[k][1], s.z, 0,0,sgn, A[k][0], A[k][1]);
        const c = B.vert(A[k2][0], A[k2][1], s.z, 0,0,sgn, A[k2][0], A[k2][1]);
        if (sgn > 0) B.idx.push(a, c, b2); else B.idx.push(a, b2, c);
      }
    }
    /* ---- greenhouse ---------------------------------------------------- */
    const cabZ0 = boxy ? -hl*0.30 : -hl*0.10, cabZ1 = boxy ? hl*0.62 : hl*0.50;
    const rake = lowSlung ? 0.42 : 0.28;
    B.mat(met, .5, 1, 0).col(.12,.12,.14,0).uv(.8);
    /* A/B/C pillars */
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*hw*0.92-0.05, beltY, cabZ1-0.08, sx*hw*0.92+0.05, roofY, cabZ1+0.02);
      B.box(sx*hw*0.94-0.05, beltY, cabZ0-0.02, sx*hw*0.94+0.05, roofY, cabZ0+0.08);
      B.box(sx*hw*0.94-0.05, beltY, (cabZ0+cabZ1)*.5-0.04, sx*hw*0.94+0.05, roofY, (cabZ0+cabZ1)*.5+0.04);
    }
    /* roof */
    B.mat(car, 1, 1, 0).col(1,1,1,0).uv(.55);
    B.box(-hw*0.92, roofY-0.06, cabZ0, hw*0.92, roofY, cabZ1);
    /* glazing */
    B.mat(gls, .55, .6, 0).col(.16,.19,.22,0).uv(.6);
    B.quad([-hw*0.86, beltY, cabZ1], [hw*0.86, beltY, cabZ1],
           [hw*0.80, roofY-0.04, cabZ1-rake], [-hw*0.80, roofY-0.04, cabZ1-rake]);   // windscreen
    B.quad([hw*0.80, roofY-0.04, cabZ0+rake*0.8], [hw*0.86, beltY, cabZ0],
           [-hw*0.86, beltY, cabZ0], [-hw*0.80, roofY-0.04, cabZ0+rake*0.8]);        // rear glass
    for (let sx = -1; sx <= 1; sx += 2) {
      B.quad([sx*hw*0.93, beltY, cabZ0+0.06], [sx*hw*0.93, beltY, cabZ1-0.06],
             [sx*hw*0.88, roofY-0.05, cabZ1-0.14], [sx*hw*0.88, roofY-0.05, cabZ0+0.14]);
    }
    /* ---- lights, grille, exhaust, plates ------------------------------- */
    B.mat(tec, .18, .4, 0).col(.9,.95,1, .9).uv(2);
    B.box(-hw*0.80, beltY*0.62, hl-0.06, -hw*0.30, beltY*0.62+0.10, hl+0.02);
    B.box( hw*0.30, beltY*0.62, hl-0.06,  hw*0.80, beltY*0.62+0.10, hl+0.02);
    B.mat(tec, .18, .4, 0).col(1,.10,.16, 1.0).uv(2);
    B.box(-hw*0.84, beltY*0.62, -hl-0.02, -hw*0.22, beltY*0.62+0.11, -hl+0.05);
    B.box( hw*0.22, beltY*0.62, -hl-0.02,  hw*0.84, beltY*0.62+0.11, -hl+0.05);
    B.mat(gun, .6, 1, 0).col(.1,.1,.11,0).uv(2);
    B.box(-hw*0.55, beltY*0.30, hl-0.02, hw*0.55, beltY*0.55, hl+0.03);
    B.mat(gun, .45, 1, 0).col(.35,.35,.37,0).uv(3);
    B.cylinder(-hw*0.5, 0.24, -hl-0.02, 0.052, 0.052, 0.10, 8, true, 3);
    B.cylinder(-hw*0.34, 0.24, -hl-0.02, 0.052, 0.052, 0.10, 8, true, 3);
    /* mirrors */
    B.mat(car, 1, 1, 0).col(1,1,1,0);
    for (let sx = -1; sx <= 1; sx += 2)
      B.box(sx*hw*0.96, beltY+0.04, cabZ1-0.34, sx*(hw*0.96+0.14), beltY+0.16, cabZ1-0.18);
    /* ---- class-specific dressing --------------------------------------- */
    if (kind === "police") {
      B.mat(gun, .5, 1, 0).col(.06,.06,.07,0).uv(2);
      B.box(-hw*0.6, roofY, (cabZ0+cabZ1)*.5-0.16, hw*0.6, roofY+0.10, (cabZ0+cabZ1)*.5+0.16);
      B.mat(tec, .2, .5, 0).col(.15,.35,1, 2.4).uv(3);
      B.box(-hw*0.58, roofY+0.10, (cabZ0+cabZ1)*.5-0.14, -0.02, roofY+0.19, (cabZ0+cabZ1)*.5+0.14);
      B.mat(tec, .2, .5, 0).col(1,.1,.2, 2.4).uv(3);
      B.box(0.02, roofY+0.10, (cabZ0+cabZ1)*.5-0.14, hw*0.58, roofY+0.19, (cabZ0+cabZ1)*.5+0.14);
      B.mat(met, .8, 1, 0).col(.05,.05,.06,0).uv(1);
      B.box(-hw*1.02, 0.30, hl*0.55, hw*1.02, 0.62, hl+0.10);
    }
    if (kind === "hyper" || kind === "sport") {
      B.mat(gun, .35, 1, 0).col(.08,.08,.09,0).uv(2);
      B.box(-hw*0.92, beltY*0.92, -hl-0.16, hw*0.92, beltY*0.92+0.05, -hl+0.06);
      for (let sx = -1; sx <= 1; sx += 2)
        B.box(sx*hw*0.86, beltY*0.60, -hl-0.14, sx*hw*0.92, beltY*0.95, -hl+0.02);
    }
    if (kind === "van" || kind === "suv") {
      B.mat(met, .9, 1, 0).col(.3,.3,.32,0).uv(1.4);
      B.box(-hw*0.86, roofY, cabZ0+0.1, hw*0.86, roofY+0.10, cabZ1-0.1);
      for (let i = 0; i < 4; i++)
        B.box(-hw*0.86, roofY+0.10, cabZ0+0.2+i*0.5, hw*0.86, roofY+0.16, cabZ0+0.26+i*0.5);
    }
    /* interior — visible in first person while driving */
    B.mat(TEX.id("leather"), 1, .1, 0).col(.10,.10,.12,0).uv(1.6);
    B.box(-hw*0.86, beltY-0.30, cabZ1-0.42, hw*0.86, beltY-0.22, cabZ1-0.10);   // dash
    for (let sx = -1; sx <= 1; sx += 2) {
      B.box(sx*hw*0.42-0.24, 0.42, cabZ1-0.98, sx*hw*0.42+0.24, 0.62, cabZ1-0.52); // seat base
      B.box(sx*hw*0.42-0.24, 0.62, cabZ1-1.02, sx*hw*0.42+0.24, 1.14, cabZ1-0.92); // backrest
    }
    B.mat(TEX.id("holoPanel"), .15, .4, 0).col(.05,.5,.7, 1.1).uv(2);
    B.box(-0.18, beltY-0.28, cabZ1-0.44, 0.30, beltY-0.16, cabZ1-0.40);
    B.mat(gun, .5, 1, 0).col(.12,.12,.14,0).uv(3);
    B.cylinder(-hw*0.42, beltY-0.20, cabZ1-0.56, 0.16, 0.16, 0.03, 14, true, 3);

    const m = B.build();
    m.cls = C; m.kind = kind;
    /* wheel anchors */
    const wz = hl*0.66, wx = hw*0.92, wy = 0.34;
    m.wheels = [[-wx, wy, wz], [wx, wy, wz], [-wx, wy, -wz], [wx, wy, -wz]];
    m.wheelR = kind === "suv" || kind === "van" ? 0.40 : 0.36;
    m.seatL = [-hw*0.42, 0.98, cabZ1-0.72];
    m.seatR = [ hw*0.42, 0.98, cabZ1-0.72];
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
    const rx = c,  rz = s;                        // right
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
    Q4.euler(q, this.pitch, this.yaw, this.roll);
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
    for (const c of this.cars) this.driveAI(c, dt, px, pz);
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
    if (!a || !a.next) { this.pickNext(car); car.throttle = 0; car.update(dt); return; }
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
