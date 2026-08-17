<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 12 — NPCs, CROWDS AND COMBAT AI
   ========================================================================== */
const SKIN_TONES = [
  [.94,.80,.70],[.90,.74,.62],[.84,.66,.53],[.74,.55,.42],
  [.62,.44,.33],[.48,.33,.24],[.36,.24,.18],[.27,.18,.14],
  [.88,.71,.58],[.70,.50,.38],
];
const HAIR_COLS = [
  [.05,.04,.04],[.12,.08,.06],[.26,.16,.08],[.45,.32,.14],[.72,.62,.42],
  [.72,.08,.14],[.05,.85,.9],[.85,.15,.7],[.6,.6,.65],[.15,.9,.45],[.55,.2,.95],
];

const NPC_ARCH = {
  civ:      { name:"Citizen",       hp:80,  aggro:0, speed:1.35, armed:null, wt:34 },
  corpo:    { name:"Corpo",         hp:90,  aggro:0, speed:1.45, armed:null, wt:7 },
  worker:   { name:"Worker",        hp:95,  aggro:0, speed:1.25, armed:null, wt:12 },
  punk:     { name:"Streetkid",     hp:85,  aggro:0, speed:1.55, armed:null, wt:11 },
  vendor:   { name:"Vendor",        hp:80,  aggro:0, speed:0.9,  armed:null, wt:4, idleSit:true },
  joytoy:   { name:"Joytoy",        hp:75,  aggro:0, speed:1.1,  armed:null, wt:3 },
  ripper:   { name:"Ripperdoc",     hp:100, aggro:0, speed:1.0,  armed:null, wt:1 },
  cop:      { name:"NCPD Officer",  hp:180, aggro:0, speed:1.7,  armed:"corvid", wt:5, faction:"ncpd" },
  maxtac:   { name:"MaxTac",        hp:520, aggro:1, speed:2.2,  armed:"ashura", wt:0, faction:"ncpd", elite:true },
  tyger:    { name:"Tyger Claw",    hp:150, aggro:0, speed:1.8,  armed:"shrike", wt:0, faction:"tyger" },
  maelstrom:{ name:"Maelstrom",     hp:210, aggro:1, speed:1.7,  armed:"ashura", wt:0, faction:"maelstrom" },
  valentino:{ name:"Valentino",     hp:160, aggro:0, speed:1.75, armed:"corvid", wt:0, faction:"valentino" },
  sixth:    { name:"6th Street",    hp:185, aggro:0, speed:1.65, armed:"ashura", wt:0, faction:"sixth" },
  voodoo:   { name:"Voodoo Boy",    hp:145, aggro:1, speed:1.7,  armed:"shrike", wt:0, faction:"voodoo" },
  animal:   { name:"Animal",        hp:290, aggro:1, speed:1.6,  armed:null, wt:0, faction:"animals", brute:true },
  scav:     { name:"Scavenger",     hp:165, aggro:1, speed:1.7,  armed:"bulldog", wt:0, faction:"scav" },
  merc:     { name:"Hired Gun",     hp:200, aggro:1, speed:1.8,  armed:"ashura", wt:0, faction:"merc" },
  netrunner:{ name:"Netrunner",     hp:120, aggro:1, speed:1.5,  armed:"corvid", wt:0, faction:"merc", hacker:true },
  sniper:   { name:"Marksman",      hp:150, aggro:1, speed:1.4,  armed:"longshadow", wt:0, faction:"merc", sniper:true },
};

const NPCS = {
  bodies: [], byArch: {}, list: [], dead: [], MAXCROWD: 44,
  R: rng(0x4E50), spawnTimer: 0,

  /* ---- pre-generate a wardrobe of bodies so the crowd never repeats ----- */
  buildBodies(count) {
    const R = this.R;
    const archKeys = Object.keys(NPC_ARCH);
    for (const ak of archKeys) this.byArch[ak] = [];
    const variantsFor = { civ:8, corpo:3, worker:3, punk:4, vendor:2, joytoy:2, ripper:1,
      cop:2, maxtac:1, tyger:3, maelstrom:3, valentino:3, sixth:3, voodoo:2,
      animal:2, scav:2, merc:2, netrunner:1, sniper:1 };
    for (const ak of archKeys) {
      const n = variantsFor[ak] || 1;
      for (let i = 0; i < n; i++) {
        const cfg = this.makeConfig(ak, R);
        const mesh = BODY.build(cfg);
        if (!mesh) continue;
        mesh.arch = ak;
        this.bodies.push(mesh);
        this.byArch[ak].push(mesh);
      }
    }
    return this;
  },

  makeConfig(arch, R) {
    const fem = R() < .5;
    const height = fem ? rrange(R, 1.58, 1.75) : rrange(R, 1.68, 1.92);
    const build = arch === "animal" ? rrange(R, .85, 1) :
                  arch === "maelstrom" || arch === "sixth" ? rrange(R, .5, .9) :
                  fem ? rrange(R, .12, .5) : rrange(R, .28, .72);
    const skin = SKIN_TONES[(R()*SKIN_TONES.length)|0];
    const wild = arch === "punk" || arch === "tyger" || arch === "voodoo" || arch === "joytoy";
    const hairCol = wild ? HAIR_COLS[5 + ((R()*6)|0)] : HAIR_COLS[(R()*5)|0];
    const face = {
      chin: rrange(R,.5,1.5), brow: rrange(R,.4,1.6), nose: rrange(R,.5,1.6),
      cheek: rrange(R,.4,1.5), lips: rrange(R,.5,1.6),
      hair: arch === "maelstrom" && R()<.5 ? 0 : (R() < .12 ? 0 : rrange(R,.5,1.2)),
      hairCol, eyeCol: R()<.16 ? [.9,.4,.05] : [.22,.32,.42], eyeGlow: 0,
      jaw: rrange(R,.5,1.5),
      hairStyle: wild ? irange(R,0,3) : (R()<.2 ? 2 : (R()<.15 ? 3 : 0)),
    };
    /* faction-coded wardrobes — you read gang affiliation at 40 m */
    const pal = {
      civ:      [[.20,.22,.28],[.32,.30,.28],[.14,.16,.20],[.42,.36,.30],[.24,.28,.24]],
      corpo:    [[.10,.11,.14],[.16,.17,.20],[.08,.09,.11]],
      worker:   [[.55,.42,.10],[.22,.30,.42],[.40,.38,.32]],
      punk:     [[.62,.08,.32],[.06,.62,.68],[.72,.55,.05],[.35,.10,.62]],
      vendor:   [[.42,.32,.18],[.20,.30,.26]],
      joytoy:   [[.85,.06,.42],[.62,.10,.82],[.05,.86,.86]],
      ripper:   [[.16,.30,.34]],
      cop:      [[.06,.09,.20]],
      maxtac:   [[.05,.05,.07]],
      tyger:    [[.60,.05,.12],[.82,.42,.02],[.10,.10,.12]],
      maelstrom:[[.07,.07,.08],[.42,.03,.05]],
      valentino:[[.55,.05,.12],[.72,.55,.08],[.12,.10,.30]],
      sixth:    [[.22,.30,.16],[.35,.30,.18],[.16,.20,.14]],
      voodoo:   [[.05,.30,.18],[.10,.12,.30],[.35,.10,.42]],
      animal:   [[.32,.28,.22],[.42,.20,.10]],
      scav:     [[.14,.16,.16],[.26,.24,.20]],
      merc:     [[.12,.14,.16],[.20,.20,.22]],
      netrunner:[[.06,.20,.28],[.10,.10,.30]],
      sniper:   [[.16,.18,.14]],
    }[arch] || [[.3,.3,.3]];
    const tc = pal[(R()*pal.length)|0];
    const armored = ["cop","maxtac","maelstrom","sixth","merc","scav","sniper","animal"].indexOf(arch) >= 0;
    const clothes = {
      torso: R() < .1 && (arch==="animal") ? "none" : (R()<.3 ? "coat" : (R()<.5 ? "jacket" : "shirt")),
      torsoCol: tc, sleeves: R() < .8 ? (R()<.6?"long":"short") : null,
      pads: armored || R() < .3, padCol: [tc[0]*.6, tc[1]*.6, tc[2]*.6],
      bulk: armored ? .10 : 0,
      legs: R() < .06 ? "shorts" : (R()<.25 ? "leather" : "fabric"),
      legCol: [tc[0]*.42+.04, tc[1]*.42+.04, tc[2]*.42+.05],
      bootCol: [.08+R()*.1, .08+R()*.09, .09+R()*.1], bootHigh: R() < .4,
      head: arch==="maxtac" ? "respirator" : (R()<.12 ? "cap" : (R()<.18 ? "visor" : (R()<.22 ? "beanie" : "none"))),
      headCol: tc,
    };
    const cyberChance = { corpo:.5, punk:.6, tyger:.75, maelstrom:.98, sixth:.6, voodoo:.7,
      animal:.9, scav:.6, merc:.7, netrunner:.8, maxtac:1, cop:.3, civ:.22 }[arch] || .25;
    const cyber = {};
    if (R() < cyberChance) {
      if (R() < .5) cyber.optics = true, cyber.opticCol = R()<.5?[0,.9,1]:[1,.3,.05];
      if (R() < .35) cyber.armR = true;
      if (R() < .2) cyber.armL = true;
      if (R() < .25) cyber.jaw = true;
      if (R() < .2) cyber.spine = true;
      if (R() < .18) cyber.legs = true, cyber.legCol = R()<.5?[.2,1,.7]:[1,.4,.1];
      if (arch === "maelstrom") { cyber.optics = true; cyber.opticCol = [1,.08,.06]; face.eyeCol=[1,.1,.05]; face.eyeGlow=2.2; }
      if (arch === "maxtac") { cyber.optics = true; cyber.armR = cyber.armL = true; cyber.legs = true; }
    }
    return { height, build, skin, face, clothes, cyber, seed: (R()*1e9)|0, arch, fem, lod: 1 };
  },

  /* ---------------------------------------------------------------------- */
  spawn(arch, x, z, opts) {
    const R = this.R;
    const pool = this.byArch[arch] && this.byArch[arch].length ? this.byArch[arch] : this.bodies;
    const mesh = pool[(R()*pool.length)|0];
    const A = NPC_ARCH[arch];
    const n = {
      arch, A, mesh, x, y: CITY.height(x, z), z,
      vx:0, vz:0, yaw: R()*TAU, targetYaw: 0, speed: 0,
      hp: A.hp, maxHp: A.hp, state: "idle", stateT: 0, phase: R(), seed: R()*10,
      sk: new Skeleton(mesh.height/1.78),
      model: M4.n(), prevModel: M4.n(), boneBuf: null,
      weapon: A.armed ? new WeaponInst(A.armed) : null,
      target: null, alertT: 0, fireT: 0, burstN: 0, coverX:0, coverZ:0,
      path: null, pathT: 0, dest: null, hitT: 0, hitDx:0, hitDz:0, deathT: 0,
      faction: A.faction || "civ", hostile: false, aware: 0, lastSeen: 0,
      dialogue: null, id: NPCS.nextId++, sitting: !!(A.idleSit && R()<.6),
      scanned: false, loot: null, quest: null, name: null,
    };
    n.sk.pose();
    if (opts) Object.assign(n, opts);
    this.list.push(n);
    return n;
  },

  /* ---- ambient crowd that follows the player around the city ----------- */
  updateCrowd(dt, px, pz, hostileMode) {
    this.spawnTimer -= dt;
    const R = this.R;
    for (let i = this.list.length-1; i >= 0; i--) {
      const n = this.list[i];
      const d = hypot(n.x-px, n.z-pz);
      if (n.state === "dead" && n.deathT > 26) { this.list.splice(i,1); continue; }
      if (d > 260 && !n.quest && n.state !== "dead") { this.list.splice(i,1); continue; }
    }
    const hour = (RENDER.env.time / 3600) % 24;
    const cap = max(6, (this.MAXCROWD * LIFE.crowdScale(hour)) | 0);
    if (this.spawnTimer <= 0 && this.list.length < cap) {
      this.spawnTimer = 0.16;
      const a = R()*TAU, dd = 42 + R()*95;
      const x = px + cos(a)*dd, z = pz + sin(a)*dd;
      if (!CITY.inWater(x, z) && CITY.cityFalloff(x, z) < .45) {
        const dist = CITY.districtAt(x, z);
        const gangKey = { "Maelstrom":"maelstrom", "Tyger Claws":"tyger", "Valentinos":"valentino",
          "6th Street":"sixth", "Voodoo Boys":"voodoo", "Animals":"animal", "Scavengers":"scav",
          "Wraiths":"scav", "Corporate":"corpo", "Arasaka Security":"merc", "Private Security":"merc" }[dist.gang];
        let arch;
        const roll = R();
        if (roll < 0.14 && gangKey) arch = gangKey;
        else if (roll < 0.18) arch = "cop";
        else {
          const table = [];
          for (const k in NPC_ARCH) if (NPC_ARCH[k].wt) table.push([k, NPC_ARCH[k].wt * (k==="corpo" ? (dist.wealth*2.2) : 1)]);
          arch = wpick(table, R);
        }
        const n = this.spawn(arch, x, z);
        n.agenda = LIFE.agendaFor(hour, arch, R);
        n.state = n.sitting ? "sit" : "walk";
        this.repath(n);
      }
    }
    for (const n of this.list) this.update(n, dt, px, pz, hostileMode);
  },

  repath(n) {
    /* purpose first, position second — LIFE decides where this person is
       actually trying to get to at this hour */
    const hour = (RENDER.env.time / 3600) % 24;
    if (!n.agenda) n.agenda = LIFE.agendaFor(hour, n.arch, this.R);
    const d = LIFE.destinationFor(n, this.R);
    if (d) n.dest = d;
    else {
      const node = TRAFFIC.nearestNode(n.x + (this.R()-.5)*80, n.z + (this.R()-.5)*80);
      if (node) n.dest = LIFE.pavement(node, this.R);
    }
    n.pathT = 10 + this.R()*14;
  },

  update(n, dt, px, pz, hostileMode) {
    n.stateT += dt;
    if (n.hitT > 0) n.hitT -= dt*3.2;
    const distP = hypot(n.x-px, n.z-pz);

    if (n.state === "dead") {
      n.deathT += dt;
      ANIM.death(n.sk, n.deathT, n.seed > 5 ? 1 : 0);
      n.sk.pose();
      this.updateMatrix(n);
      return;
    }

    /* --- perception --------------------------------------------------- */
    if (n.hostile || (n.A.aggro && hostileMode)) {
      if (distP < 62) n.aware = min(1, n.aware + dt * (distP < 24 ? 2.4 : 0.9));
      else n.aware = max(0, n.aware - dt*0.4);
      if (n.aware > 0.6) { n.state = "combat"; n.target = { x: px, z: pz }; }
    }

    switch (n.state) {
      case "idle": {
        n.speed = damp(n.speed, 0, 8, dt);
        ANIM.idle(n.sk, n.stateT + n.seed, n.seed, n.weapon ? (n.weapon.W.hands||0) : null);
        const wait = n.lingerT || (3 + n.seed);
        if (n.stateT > wait) { n.lingerT = 0; n.state = "walk"; n.stateT = 0; this.repath(n); }
        break; }
      case "sit": {
        n.speed = 0;
        ANIM.sit(n.sk, n.stateT + n.seed, n.seed);
        break; }
      case "talk": {
        n.speed = damp(n.speed, 0, 8, dt);
        ANIM.talk(n.sk, n.stateT + n.seed, n.seed, n.talkEnergy === undefined ? 1 : n.talkEnergy);
        if (n.faceTarget) {
          const want = atan2(-(n.faceTarget.x - n.x), n.faceTarget.z - n.z);
          n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-7*dt));
        }
        break; }
      case "walk": {
        n.pathT -= dt;
        if (!n.dest || n.pathT <= 0) this.repath(n);
        if (n.dest) {
          const dx = n.dest.x-n.x, dz = n.dest.z-n.z, d = hypot(dx,dz);
          if (d < 2.4) { LIFE.onArrive(n, this.R); this.repath(n); }
          else {
            const want = atan2(-dx, dz);
            n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-4.5*dt));
            /* separate from neighbours so the crowd doesn't clump */
            let sx = 0, sz = 0;
            for (const o of this.list) {
              if (o === n || o.state === "dead") continue;
              const ox = n.x-o.x, oz = n.z-o.z, od = ox*ox+oz*oz;
              if (od < 2.6 && od > 1e-4) { const k = 1/od; sx += ox*k; sz += oz*k; }
            }
            const pdx = n.x-px, pdz = n.z-pz, pd2 = pdx*pdx+pdz*pdz;
            if (pd2 < 2.2 && pd2 > 1e-4) { const k = 2.4/pd2; sx += pdx*k; sz += pdz*k; }
            const tgt = n.A.speed;
            n.speed = damp(n.speed, tgt, 5, dt);
            n.vx = -sin(n.yaw)*n.speed + clamp(sx, -1.6, 1.6);
            n.vz =  cos(n.yaw)*n.speed + clamp(sz, -1.6, 1.6);
            const c1 = CITY.collide(n.x + n.vx*dt, n.z + n.vz*dt, 0.38, n.y);
            /* if the wall stopped us, repath rather than grind against it */
            if (hypot(c1[0]-(n.x+n.vx*dt), c1[1]-(n.z+n.vz*dt)) > 0.02) n.pathT = 0;
            n.x = c1[0]; n.z = c1[1];
            n.y = damp(n.y, CITY.height(n.x, n.z), 12, dt);
          }
        }
        n.phase += n.speed * dt * 0.62;
        ANIM.locomotion(n.sk, n.phase, n.speed, n.stateT, n.seed);
        if (n.weapon && n.weapon.W.hands !== undefined && n.faction !== "civ")
          ANIM.aimOverlay(n.sk, n.weapon.W.hands, 0.18);
        break; }
      case "flee": {
        const dx = n.x-px, dz = n.z-pz, d = hypot(dx,dz)||1;
        const want = atan2(-dx/d, dz/d);
        n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-8*dt));
        n.speed = damp(n.speed, n.A.speed*2.35, 7, dt);
        const c2 = CITY.collide(n.x - sin(n.yaw)*n.speed*dt, n.z + cos(n.yaw)*n.speed*dt, 0.38, n.y);
        n.x = c2[0]; n.z = c2[1];
        n.y = damp(n.y, CITY.height(n.x, n.z), 12, dt);
        n.phase += n.speed*dt*0.44;
        ANIM.locomotion(n.sk, n.phase, n.speed, n.stateT, n.seed);
        if (n.stateT > 10) { n.state = "walk"; n.stateT = 0; this.repath(n); }
        break; }
      case "combat": this.combat(n, dt, px, pz); break;
    }
    /* stepping indoors: shrink out of sight, then recycle the body */
    if (n.enteringT > 0) {
      n.enteringT -= dt;
      if (n.enteringT <= 0) {
        const i = this.list.indexOf(n);
        if (i >= 0) this.list.splice(i, 1);
        return;
      }
    }
    ANIM.hit(n.sk, max(0, n.hitT), n.hitDx, n.hitDz);
    n.sk.pose();
    this.updateMatrix(n);
  },

  combat(n, dt, px, pz) {
    const dx = px-n.x, dz = pz-n.z, d = hypot(dx,dz)||1;
    const want = atan2(-dx/d, dz/d);
    n.yaw = angLerp(n.yaw, want, 1 - Math.exp(-9*dt));
    const W = n.weapon ? n.weapon.W : null;
    const ideal = n.A.brute ? 2.4 : n.A.sniper ? 55 : (W && W.cls === "Shotgun" ? 8 : 15);
    let move = 0;
    if (d > ideal*1.35) move = 1;
    else if (d < ideal*0.65) move = -1;
    /* lateral strafing keeps firefights from being static */
    const strafe = sin(n.stateT*1.4 + n.seed)*0.85;
    n.speed = damp(n.speed, abs(move) > 0 ? n.A.speed*1.5 : n.A.speed*0.55, 6, dt);
    const fx = -sin(n.yaw), fz = cos(n.yaw);
    const rx = cos(n.yaw), rz = sin(n.yaw);
    const c3 = CITY.collide(n.x + (fx*move + rx*strafe*0.6) * n.speed * dt,
                            n.z + (fz*move + rz*strafe*0.6) * n.speed * dt, 0.38, n.y);
    n.x = c3[0]; n.z = c3[1];
    n.y = damp(n.y, CITY.height(n.x, n.z), 12, dt);
    n.phase += n.speed*dt*0.55;
    if (abs(move) > 0.1 || abs(strafe) > 0.3)
      ANIM.locomotion(n.sk, n.phase, n.speed, n.stateT, n.seed, strafe*0.5);
    else ANIM.idle(n.sk, n.stateT+n.seed, n.seed);
    const pitchToTarget = clamp(atan2(1.55 - (n.y+1.5), d) * -1, -0.5, 0.5);
    if (W) ANIM.aimOverlay(n.sk, W.hands||0, 0.9, pitchToTarget);
    else ANIM.aimOverlay(n.sk, 2, 0.9);

    if (n.weapon) {
      n.weapon.update(dt);
      n.fireT -= dt;
      if (d < (W.range||40) && n.fireT <= 0 && n.aware > 0.75) {
        if (n.weapon.needsReload()) { n.weapon.startReload(); n.fireT = W.reload; }
        else if (n.weapon.canFire()) {
          n.weapon.fire();
          n.burstN++;
          GAME.npcShoot(n, px, pz);
          n.fireT = n.weapon.fireInterval;
          if (n.burstN > 3 + (this.R()*5|0)) { n.burstN = 0; n.fireT = 0.5 + this.R()*1.4; }
        }
      }
    } else if (d < 2.6 && n.fireT <= 0) {
      n.fireT = 1.1;
      GAME.npcMelee(n);
    } else n.fireT -= dt;
  },

  updateMatrix(n) {
    M4.cpy(n.prevModel, n.model);
    const q = Q4.n();
    Q4.euler(q, 0, -n.yaw, 0);
    M4.trs(n.model, n.x, n.y, n.z, q[0], q[1], q[2], q[3], 1, 1, 1);
  },

  damage(n, amt, dx, dz, crit) {
    if (n.state === "dead") return 0;
    n.hp -= amt;
    n.hitT = 1;
    n.hitDx = dx; n.hitDz = dz;
    n.aware = 1;
    if (n.hp <= 0) {
      n.state = "dead"; n.deathT = 0; n.hp = 0;
      return 2;
    }
    if (n.faction === "civ") { n.state = "flee"; n.stateT = 0; }
    else { n.hostile = true; n.state = "combat"; }
    return 1;
  },
  alertArea(x, z, r, faction) {
    for (const n of this.list) {
      if (n.state === "dead") continue;
      if (hypot(n.x-x, n.z-z) > r) continue;
      if (n.faction === "civ") { if (n.state !== "flee") { n.state = "flee"; n.stateT = 0; } }
      else if (!faction || n.faction === faction) { n.hostile = true; n.aware = 1; n.state = "combat"; }
    }
  },
  nextId: 1,
};
</script>
