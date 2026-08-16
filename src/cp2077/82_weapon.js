<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 10 — WEAPONS
   Three weapon systems, matching the setting's taxonomy:
     POWER — conventional ballistics, rounds ricochet off hard surfaces
     TECH  — rail-driven, charges up, punches through cover
     SMART — guided rounds that track a locked silhouette
   ========================================================================== */
const WSYS = { POWER:0, TECH:1, SMART:2, MELEE:3, THROWN:4 };
const WSYS_NAME = ["POWER", "TECH", "SMART", "MELEE", "THROWN"];

const WEAPONS = {
  fist: { name:"Fists", cls:"Melee", sys:WSYS.MELEE, dmg:12, rpm:150, mag:0, reload:0,
    spread:0, recoil:0, range:2.1, hands:2, tier:1, price:0,
    desc:"Ten thousand years of engineering and it still comes down to this." },

  corvid: { name:"Corvid 9", cls:"Pistol", sys:WSYS.POWER, dmg:34, rpm:400, mag:15, reload:1.5,
    spread:0.013, recoil:1.5, range:60, hands:0, tier:2, price:2100, crit:1.9, ricochet:true,
    desc:"Kabuki back-room build. Frame's printed, slide's stolen. Fires anyway." },
  overture: { name:"Kilo Overture", cls:"Revolver", sys:WSYS.POWER, dmg:118, rpm:96, mag:6, reload:2.6,
    spread:0.011, recoil:5.4, range:75, hands:0, tier:4, price:14500, crit:2.4, ricochet:true,
    desc:"Six rounds of .50 calibre apology. Recoil will re-break your wrist." },
  shrike: { name:"Shrike SMG", cls:"SMG", sys:WSYS.POWER, dmg:21, rpm:900, mag:35, reload:1.9,
    spread:0.028, recoil:1.0, range:42, hands:1, tier:2, price:5200, crit:1.5,
    desc:"Spray-and-hope. Cheap, loud, and the only thing between you and a Maelstrom pack." },
  hornet: { name:"Hornet", cls:"Smart SMG", sys:WSYS.SMART, dmg:19, rpm:780, mag:40, reload:2.2,
    spread:0.05, recoil:0.7, range:48, hands:1, tier:4, price:22000, crit:1.2, homing:true,
    desc:"Paint a silhouette, hold the trigger, let the rounds do the aiming." },
  ashura: { name:"Ashura AR-7", cls:"Assault Rifle", sys:WSYS.POWER, dmg:33, rpm:620, mag:30, reload:2.1,
    spread:0.017, recoil:1.9, range:88, hands:1, tier:3, price:11800, crit:1.6, ricochet:true,
    desc:"Militech pattern, third-party everything. The city's default answer." },
  bulldog: { name:"Bulldog 12", cls:"Shotgun", sys:WSYS.POWER, dmg:23, pellets:9, rpm:74, mag:6, reload:2.9,
    spread:0.075, recoil:6.2, range:22, hands:1, tier:3, price:9400, crit:1.3,
    desc:"Door key, argument-ender, unlicensed surgical instrument." },
  longshadow: { name:"Longshadow TR", cls:"Sniper", sys:WSYS.TECH, dmg:245, rpm:44, mag:5, reload:3.1,
    spread:0.001, recoil:7.5, range:400, hands:1, tier:5, price:48000, crit:3.0,
    charge:0.85, pierce:2, scope:4.2,
    desc:"Rail-driven. Charge it, and the wall stops mattering." },
  kestrel: { name:"Kestrel Rail", cls:"Tech Rifle", sys:WSYS.TECH, dmg:96, rpm:130, mag:12, reload:2.4,
    spread:0.006, recoil:3.2, range:150, hands:1, tier:4, price:31000, crit:2.0,
    charge:0.5, pierce:1,
    desc:"Holds the charge until you let go. Punches straight through two Maelstrom and a wall." },
  bison: { name:"Bison LMG", cls:"LMG", sys:WSYS.POWER, dmg:28, rpm:700, mag:80, reload:4.4,
    spread:0.034, recoil:2.4, range:70, hands:1, tier:4, price:27000, crit:1.3, ricochet:true,
    desc:"Eighty rounds. Ninety kilos of opinion." },
  kagejin: { name:"Kagejin", cls:"Katana", sys:WSYS.MELEE, dmg:96, rpm:110, mag:0, reload:0,
    spread:0, recoil:0, range:2.6, hands:2, tier:4, price:19000, crit:2.6, deflect:true,
    desc:"Monomolecular edge. Tyger Claw pattern. Deflects rounds if your reflexes are paid up." },
  crowbar: { name:"Crowbar", cls:"Blunt", sys:WSYS.MELEE, dmg:44, rpm:90, mag:0, reload:0,
    spread:0, recoil:0, range:2.2, hands:2, tier:1, price:300, crit:1.4,
    desc:"Opens doors, closes conversations." },
  frag: { name:"Frag Grenade", cls:"Grenade", sys:WSYS.THROWN, dmg:170, rpm:60, mag:1, reload:0.8,
    spread:0, recoil:0, range:40, hands:0, tier:2, price:180, radius:6.5,
    desc:"Three second fuse. Count it out loud, chooms appreciate the warning." },
  emp: { name:"EMP Grenade", cls:"Grenade", sys:WSYS.THROWN, dmg:40, rpm:60, mag:1, reload:0.8,
    spread:0, recoil:0, range:40, hands:0, tier:3, price:340, radius:9, emp:true,
    desc:"Cooks cyberware and drones. Wetware walks away confused." },
};

/* ==========================================================================
   VIEWMODEL GEOMETRY
   ======================================================================== */
const WMESH = {
  cache: {},
  get(id) { if (!this.cache[id]) this.cache[id] = this.build(id); return this.cache[id]; },
  buildAll() { for (const k in WEAPONS) this.get(k); },

  build(id) {
    const W = WEAPONS[id];
    const B = new MeshBuilder();
    const gun = TEX.id("gunmetal"), met = TEX.id("metalPanel"), pol = TEX.id("holoPanel");
    const lea = TEX.id("leather"), tec = TEX.id("tech"), rub = TEX.id("rubber");
    /* Local frame: +Z is muzzle, +Y up, origin at the grip's web. */
    const G = (r,g,b,e) => B.col(r,g,b,e||0);

    const grip = () => {
      B.mat(rub, 1, .1, 0); G(.09,.09,.10);
      B.box(-0.021, -0.150, -0.040, 0.021, 0.008, 0.026);
      B.mat(lea, 1, .1, 0); G(.13,.12,.12);
      B.box(-0.023, -0.120, -0.036, 0.023, -0.030, 0.024);
    };
    const rail = (z0, z1, y) => {
      B.mat(gun, .55, 1, 0); G(.17,.17,.19);
      for (let z = z0; z < z1; z += 0.016)
        B.box(-0.010, y, z, 0.010, y+0.006, z+0.010);
    };
    const irons = (z0, z1, y) => {
      B.mat(gun, .5, 1, 0); G(.20,.20,.22);
      B.box(-0.010, y, z1-0.012, 0.010, y+0.016, z1-0.004);     // front post
      B.box(-0.016, y, z0, -0.008, y+0.014, z0+0.008);           // rear notch
      B.box( 0.008, y, z0,  0.016, y+0.014, z0+0.008);
      B.mat(tec, .2, .4, 0); G(.1,1,.6, 1.6);
      B.box(-0.0025, y+0.014, z1-0.010, 0.0025, y+0.017, z1-0.006);
    };

    switch (W.cls) {
      case "Pistol": case "Revolver": {
        grip();
        B.mat(gun, .5, 1, 0); G(.19,.19,.21);
        B.box(-0.020, 0.000, -0.052, 0.020, 0.048, 0.126);           // slide
        B.mat(gun, .62, 1, 0); G(.15,.15,.17);
        B.box(-0.018, -0.012, -0.048, 0.018, 0.004, 0.100);          // frame
        B.mat(met, .4, 1, 0); G(.24,.24,.27);
        B.cylinder(0, 0.024, 0.126, 0.011, 0.011, 0.030, 10, true, 6); // muzzle
        if (W.cls === "Revolver") {
          B.mat(met, .45, 1, 0); G(.26,.26,.29);
          const c0 = B.nv;
          B.cylinder(0, 0, 0, 0.026, 0.026, 0.048, 12, true, 6);
          const M = M4.n(); M4.trs(M, 0, 0.024, 0.004, 0.7071, 0, 0, 0.7071, 1, 1, 1);
          B.transform(c0, M);
          for (let i = 0; i < 6; i++) { const a = i/6*TAU;
            B.mat(gun, .7, 1, 0); G(.05,.05,.06);
            B.box(cos(a)*0.017-0.004, 0.024+sin(a)*0.017-0.004, -0.020,
                  cos(a)*0.017+0.004, 0.024+sin(a)*0.017+0.004, 0.024); }
          B.mat(met, .4, 1, 0); G(.22,.22,.25);
          B.box(-0.008, 0.030, 0.030, 0.008, 0.044, 0.150);          // top strap
        }
        B.mat(gun, .6, 1, 0); G(.12,.12,.14);
        B.box(-0.014, -0.070, -0.020, 0.014, -0.006, 0.014);          // magwell
        B.mat(gun, .7, 1, 0); G(.10,.10,.11);
        B.box(-0.006, -0.040, 0.012, 0.006, -0.014, 0.034);           // trigger guard
        irons(-0.046, 0.120, 0.048);
        break; }

      case "SMG": case "Smart SMG": {
        grip();
        B.mat(gun, .52, 1, 0); G(.17,.17,.19);
        B.box(-0.028, 0.000, -0.090, 0.028, 0.060, 0.150);            // receiver
        B.mat(gun, .62, 1, 0); G(.13,.13,.15);
        B.box(-0.020, -0.130, -0.016, 0.020, 0.004, 0.030);           // magazine
        B.mat(met, .4, 1, 0); G(.22,.22,.25);
        B.cylinder(0, 0.030, 0.150, 0.010, 0.010, 0.060, 10, true, 6);
        B.mat(gun, .45, 1, 0); G(.20,.20,.22);
        B.box(-0.014, 0.014, 0.150, 0.014, 0.046, 0.196);             // handguard
        B.mat(gun, .5, 1, 0); G(.16,.16,.18);
        B.box(-0.016, 0.006, -0.170, 0.016, 0.048, -0.086);           // folding stock
        rail(-0.060, 0.140, 0.060);
        if (W.sys === WSYS.SMART) {
          B.mat(tec, .3, 1, 0); G(.3,.32,.38);
          B.box(-0.024, 0.062, -0.010, 0.024, 0.092, 0.062);          // targeting head
          B.mat(pol, .12, .4, 0); G(.1,.9,1, 2.6);
          B.box(-0.020, 0.066, 0.060, 0.020, 0.088, 0.064);
        } else irons(-0.056, 0.140, 0.060);
        break; }

      case "Assault Rifle": case "LMG": {
        grip();
        B.mat(gun, .5, 1, 0); G(.18,.18,.20);
        B.box(-0.030, 0.000, -0.120, 0.030, 0.064, 0.190);            // upper+lower
        B.mat(gun, .6, 1, 0); G(.13,.13,.15);
        if (W.cls === "LMG") {
          B.box(-0.052, -0.130, -0.020, 0.052, 0.006, 0.096);         // box mag
          B.mat(met, .45, 1, 0); G(.3,.3,.33);
          B.box(-0.008, 0.062, 0.100, 0.008, 0.086, 0.230);           // carry handle
        } else {
          B.box(-0.019, -0.150, -0.010, 0.019, 0.006, 0.048);         // stanag mag
        }
        B.mat(met, .4, 1, 0); G(.23,.23,.26);
        B.cylinder(0, 0.032, 0.190, 0.0095, 0.0095, 0.150, 10, true, 6);
        B.mat(gun, .45, 1, 0); G(.19,.19,.21);
        B.box(-0.020, 0.010, 0.190, 0.020, 0.056, 0.300);             // handguard
        for (let i = 0; i < 7; i++) {                                  // vent slots
          B.mat(gun, .8, 1, 0); G(.06,.06,.07);
          B.box(-0.021, 0.020, 0.200+i*0.014, 0.021, 0.034, 0.206+i*0.014);
        }
        B.mat(met, .35, 1, 0); G(.26,.26,.29);
        B.cylinder(0, 0.032, 0.336, 0.016, 0.016, 0.046, 10, true, 6); // brake
        B.mat(gun, .5, 1, 0); G(.15,.15,.17);
        B.box(-0.020, -0.010, -0.230, 0.020, 0.056, -0.116);          // stock
        B.mat(lea, 1, .1, 0); G(.10,.10,.11);
        B.box(-0.022, -0.014, -0.248, 0.022, 0.058, -0.226);          // buttpad
        rail(-0.100, 0.180, 0.064);
        irons(-0.090, 0.290, 0.064);
        break; }

      case "Shotgun": {
        grip();
        B.mat(gun, .55, 1, 0); G(.16,.16,.18);
        B.box(-0.026, 0.000, -0.110, 0.026, 0.058, 0.140);
        B.mat(met, .42, 1, 0); G(.21,.21,.24);
        B.cylinder(0, 0.032, 0.140, 0.0165, 0.0165, 0.230, 12, true, 5);  // barrel
        B.mat(met, .5, 1, 0); G(.18,.18,.20);
        B.cylinder(0, 0.004, 0.140, 0.0135, 0.0135, 0.200, 10, true, 5);  // tube mag
        B.mat(lea, 1, .1, 0); G(.16,.13,.10);
        B.box(-0.022, -0.006, 0.190, 0.022, 0.024, 0.286);                // pump
        B.mat(gun, .5, 1, 0); G(.15,.15,.17);
        B.box(-0.022, -0.020, -0.220, 0.022, 0.052, -0.104);              // stock
        /* shell carrier on the receiver — reads instantly as a shotgun */
        for (let i = 0; i < 5; i++) { B.mat(met, .4, 1, 0); G(.42,.24,.10);
          B.cylinder(-0.028, 0.012+i*0.0, -0.090+i*0.020, 0.009, 0.009, 0.006, 8, true, 6); }
        irons(-0.090, 0.350, 0.058);
        break; }

      case "Sniper": case "Tech Rifle": {
        grip();
        B.mat(gun, .45, 1, 0); G(.15,.15,.18);
        B.box(-0.028, 0.000, -0.150, 0.028, 0.062, 0.220);
        B.mat(met, .35, 1, 0); G(.20,.20,.24);
        B.cylinder(0, 0.032, 0.220, 0.0105, 0.0105, W.cls==="Sniper"?0.400:0.230, 12, true, 6);
        /* rail accelerator coils — the visual signature of a tech weapon */
        const coilN = W.cls === "Sniper" ? 7 : 5;
        for (let i = 0; i < coilN; i++) {
          const z = 0.250 + i*(W.cls==="Sniper"?0.050:0.038);
          B.mat(met, .4, 1, 0); G(.30,.30,.34);
          B.cylinder(0, 0.032, z, 0.024, 0.024, 0.016, 12, true, 5);
          B.mat(tec, .25, 1, 0); G(.1,.7,1, 1.9);
          B.cylinder(0, 0.032, z+0.016, 0.021, 0.021, 0.004, 12, true, 6);
        }
        B.mat(gun, .5, 1, 0); G(.14,.14,.16);
        B.box(-0.019, -0.120, 0.010, 0.019, 0.004, 0.070);
        B.box(-0.024, -0.020, -0.290, 0.024, 0.056, -0.140);
        /* scope */
        B.mat(gun, .35, 1, 0); G(.10,.10,.12);
        B.cylinder(0, 0.086, -0.090, 0.026, 0.026, 0.230, 14, true, 5);
        B.mat(gun, .5, 1, 0); G(.14,.14,.16);
        B.box(-0.010, 0.062, -0.070, 0.010, 0.086, -0.050);
        B.box(-0.010, 0.062, 0.090, 0.010, 0.086, 0.110);
        B.mat(pol, .1, .3, 0); G(.06,.16,.24, .5);
        B.cylinder(0, 0.086, 0.139, 0.024, 0.024, 0.004, 14, true, 6);
        /* bipod */
        B.mat(gun, .6, 1, 0); G(.13,.13,.15);
        for (let s = -1; s <= 1; s += 2)
          B.box(s*0.018-0.004, -0.090, 0.230, s*0.018+0.004, 0.004, 0.244);
        break; }

      case "Katana": {
        B.mat(lea, 1, .1, 0); G(.08,.08,.09);
        B.box(-0.014, -0.170, -0.012, 0.014, 0.010, 0.012);            // tsuka
        for (let i = 0; i < 8; i++) { B.mat(lea, 1, .1, 0); G(.30,.05,.09);
          B.box(-0.016, -0.160+i*0.021, -0.014, 0.016, -0.150+i*0.021, 0.014); }
        B.mat(met, .3, 1, 0); G(.34,.28,.10);
        B.box(-0.034, 0.010, -0.030, 0.034, 0.020, 0.030);             // tsuba
        B.mat(met, .12, 1, 0); G(.78,.80,.86);
        /* blade with a real cross-section: shinogi ridge + curved tip */
        const segs = 22, blen = 0.86;
        const base = B.nv;
        for (let i = 0; i <= segs; i++) {
          const t = i/segs;
          const z = 0.024 + t*blen;
          const curve = -t*t*0.048;
          const w = 0.0165*(1 - t*0.32) * (t > 0.93 ? (1-(t-0.93)/0.07) : 1);
          const h = 0.0032;
          B.vert(-w, 0.022+curve, z, -1, 0, 0, t*4, 0);
          B.vert( 0, 0.022+curve+h, z, 0, 1, 0, t*4, .5);
          B.vert( w, 0.022+curve, z, 1, 0, 0, t*4, 1);
          B.vert( 0, 0.022+curve-h*3.4, z, 0, -1, 0, t*4, 1.5);
        }
        for (let i = 0; i < segs; i++) {
          const a = base+i*4, b = a+4;
          for (let k = 0; k < 4; k++) {
            const k2 = (k+1)%4;
            B.idx.push(a+k, b+k, a+k2, a+k2, b+k, b+k2);
          }
        }
        B.mat(tec, .1, .9, 0); G(.2,.95,1, 1.3);                       // monomolecular glow
        B.box(-0.0015, 0.019, 0.030, 0.0015, 0.0205, 0.880);
        break; }

      case "Blunt": {
        B.mat(lea, 1, .1, 0); G(.10,.10,.11);
        B.box(-0.016, -0.150, -0.016, 0.016, 0.0, 0.016);
        B.mat(met, .55, 1, 0); G(.38,.30,.18);
        B.cylinder(0, 0, 0, 0.014, 0.014, 0.62, 8, true, 3);
        B.mat(met, .5, 1, 0); G(.34,.27,.16);
        B.box(-0.016, 0.60, -0.014, 0.016, 0.66, 0.052);
        break; }

      case "Grenade": {
        B.mat(met, .55, 1, 0); G(W.emp ? .18 : .22, W.emp ? .34 : .26, W.emp ? .42 : .18);
        B.sphere(0, 0, 0, 0.043, 12, 10, 1.22);
        B.mat(gun, .5, 1, 0); G(.16,.16,.18);
        B.cylinder(0, 0.044, 0, 0.016, 0.014, 0.024, 10, true, 6);
        B.box(-0.006, 0.030, 0.014, 0.006, 0.062, 0.020);
        B.mat(tec, .2, .5, 0); G(W.emp?.1:1, W.emp?.9:.2, W.emp?1:.15, 2.2);
        B.box(-0.014, 0.010, 0.042, 0.014, 0.024, 0.045);
        break; }

      default: {   /* Fists — a pair of gloved hands */
        B.mat(TEX.id("skin"), 1, 1, 1); G(.78,.58,.49);
        B.box(-0.045, -0.05, -0.02, 0.045, 0.05, 0.10);
        B.mat(lea, 1, .1, 0); G(.11,.11,.12);
        B.box(-0.048, -0.053, -0.06, 0.048, 0.053, 0.0);
        break; }
    }
    const m = B.build();
    m.wid = id;
    /* muzzle position in weapon space, for flash + tracer origin */
    m.muzzle = W.cls === "Sniper" ? [0, 0.032, 0.62] :
               W.cls === "Assault Rifle" || W.cls === "LMG" ? [0, 0.032, 0.38] :
               W.cls === "Shotgun" ? [0, 0.032, 0.37] :
               W.cls === "SMG" || W.cls === "Smart SMG" ? [0, 0.030, 0.21] :
               W.cls === "Tech Rifle" ? [0, 0.032, 0.46] : [0, 0.024, 0.16];
    m.ejector = [0.028, 0.040, -0.02];
    return m;
  },
};

/* ==========================================================================
   RUNTIME WEAPON STATE
   ======================================================================== */
class WeaponInst {
  constructor(id, mods) {
    this.id = id;
    this.W = WEAPONS[id];
    this.ammo = this.W.mag;
    this.reserve = this.W.mag * 5;
    this.cool = 0; this.reloading = 0; this.charge = 0;
    this.recoil = 0; this.recoilY = 0; this.recoilX = 0;
    this.bob = 0; this.swayX = 0; this.swayY = 0;
    this.ads = 0; this.spin = 0; this.lastFire = -99;
    this.mods = mods || {};
    this.heat = 0;
    this.mesh = WMESH.get(id);
  }
  get fireInterval() { return 60 / (this.W.rpm * (this.mods.rpm || 1)); }
  get damage() { return this.W.dmg * (this.mods.dmg || 1); }
  get spread() { return this.W.spread * (this.mods.spread || 1); }
  canFire() {
    return this.cool <= 0 && this.reloading <= 0 &&
           (this.W.mag === 0 || this.ammo > 0);
  }
  needsReload() { return this.W.mag > 0 && this.ammo <= 0 && this.reserve > 0; }
  startReload() {
    if (this.W.mag === 0 || this.reloading > 0) return false;
    if (this.ammo >= this.W.mag || this.reserve <= 0) return false;
    this.reloading = this.W.reload * (this.mods.reload || 1);
    return true;
  }
  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = this.W.mag - this.ammo;
        const take = min(need, this.reserve);
        this.ammo += take; this.reserve -= take;
      }
    }
    this.recoil = damp(this.recoil, 0, 9, dt);
    this.recoilY = damp(this.recoilY, 0, 7, dt);
    this.recoilX = damp(this.recoilX, 0, 7, dt);
    this.heat = max(0, this.heat - dt*0.7);
  }
  fire() {
    this.cool = this.fireInterval;
    if (this.W.mag > 0) this.ammo--;
    const r = this.W.recoil * (this.mods.recoil || 1);
    this.recoil = min(1.4, this.recoil + r*0.16);
    this.recoilY += r * 0.0055;
    this.recoilX += (Math.random()-0.5) * r * 0.0042;
    this.heat = min(1, this.heat + 0.14);
    this.spin += 1;
  }
}
</script>
