<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 12b — CITY LIFE AND LAW ENFORCEMENT

   Night City has to look like it has somewhere to be. Rather than simulate
   nine million persistent agents, every pedestrian the streamer spawns is
   given a *plausible current purpose* derived from the clock, their
   archetype and the district they are standing in — commuting, working,
   shopping, drinking, heading home. The behaviour is what you observe, so
   the behaviour is what gets simulated.
   ========================================================================== */
const LIFE = {
  /* Daily rhythm. Weights are picked per NPC when they spawn and again when
     they finish an errand, so the mix on the street changes across the day. */
  agendaFor(hour, arch, R) {
    const night = hour >= 21 || hour < 5;
    const rush  = (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20);
    const work  = hour >= 9 && hour < 18;
    let table;
    if (arch === "corpo")
      table = rush ? [["commute",6],["transit",3],["work",1]]
            : work ? [["work",7],["retail",2],["commute",1]]
            : night ? [["leisure",4],["home",5],["commute",1]]
                    : [["home",5],["retail",3],["commute",2]];
    else if (arch === "worker")
      table = rush ? [["commute",7],["transit",2],["work",1]]
            : work ? [["work",8],["retail",1],["commute",1]]
                   : [["home",5],["leisure",3],["retail",2]];
    else if (arch === "punk" || arch === "joytoy")
      table = night ? [["leisure",8],["loiter",3],["retail",1]]
                    : [["loiter",5],["retail",3],["home",2]];
    else if (arch === "vendor" || arch === "ripper")
      table = [["work",9],["retail",1]];
    else if (arch === "cop")
      table = [["patrol",9],["loiter",1]];
    else
      table = rush ? [["commute",5],["transit",2],["retail",2],["home",1]]
            : night ? [["leisure",4],["home",4],["loiter",2]]
                    : [["retail",4],["home",3],["loiter",2],["commute",1]];
    return wpick(table, R);
  },

  /* Choose a world position that matches the agenda. Destinations are pulled
     from real city data — actual buildings, actual metro stations — and then
     nudged onto the pavement so nobody stands in a traffic lane. */
  destinationFor(n, R) {
    const hour = (RENDER.env.time / 3600) % 24;
    const a = n.agenda;
    const near = CITY.bldGrid.query(n.x, n.z, 240, []);
    const pickBuilding = (pred) => {
      let best = null, tries = 0;
      for (let i = 0; i < near.length && tries < 40; i++) {
        const b = near[(R()*near.length)|0];
        tries++;
        if (!b || (pred && !pred(b))) continue;
        best = b; break;
      }
      return best;
    };
    let target = null, kind = a;
    if (a === "transit") {
      let bs = null, bd = 1e9;
      for (const s of CITY.metro.stations) {
        const d = hypot(s.x-n.x, s.z-n.z);
        if (d < bd) { bd = d; bs = s; }
      }
      if (bs && bd < 320) target = { x: bs.x + (R()-.5)*18, z: bs.z + (R()-.5)*10 };
    } else if (a === "work") {
      const b = pickBuilding(b => b.style === STYLE.NEOMIL || b.style === STYLE.INDUSTRIAL || b.h > 40);
      if (b) target = this.doorstep(b, R);
    } else if (a === "home") {
      const b = pickBuilding(b => b.style === STYLE.ENTROPISM || b.style === STYLE.SLUM ||
                                  b.style === STYLE.KITSCH);
      if (b) target = this.doorstep(b, R);
    } else if (a === "retail" || a === "leisure") {
      /* head toward light: neon clusters are where the shops and bars are */
      const lights = WORLD.lightHash.query(n.x, n.z, 120, []);
      if (lights.length) {
        const l = lights[(R()*lights.length)|0];
        target = { x: l.x + (R()-.5)*6, z: l.z + (R()-.5)*6 };
      }
    }
    if (!target) {
      /* commute / patrol / loiter, and every fallback: walk the street grid */
      const node = TRAFFIC.nearestNode(n.x + (R()-.5)*(a === "loiter" ? 40 : 190),
                                       n.z + (R()-.5)*(a === "loiter" ? 40 : 190));
      if (node) target = this.pavement(node, R);
    }
    n.destKind = kind;
    return target;
  },

  /* offset a road node onto the pavement so pedestrians use the footway */
  pavement(node, R) {
    let ex = 0, ez = 0;
    if (node.e && node.e.length) {
      const e = CITY.edges[node.e[(R()*node.e.length)|0]];
      const o = CITY.nodes[e.a === node.id ? e.b : e.a];
      const dx = o.x-node.x, dz = o.z-node.z, l = hypot(dx,dz)||1;
      ex = -dz/l; ez = dx/l;                       // perpendicular to the road
    }
    const side = R() < .5 ? 1 : -1;
    const off = 9 + R()*3;
    return { x: node.x + ex*off*side, z: node.z + ez*off*side };
  },
  /* a point just outside a building's entrance face */
  doorstep(b, R) {
    const c = cos(b.rot), s = sin(b.rot);
    const side = (R()*4)|0;
    const nx = [1,-1,0,0][side], nz = [0,0,1,-1][side];
    const ox = (nx*(b.hw+2.2))*c - (nz*(b.hd+2.2))*s;
    const oz = (nx*(b.hw+2.2))*s + (nz*(b.hd+2.2))*c;
    return { x: b.x + ox, z: b.z + oz, arrive: b };
  },

  /* Called when an NPC reaches its destination: linger, then pick a new
     purpose. This is what makes the crowd read as errands rather than a
     random walk. */
  onArrive(n, R) {
    const hour = (RENDER.env.time / 3600) % 24;
    if (n.destKind === "work" || n.destKind === "home") {
      /* step inside: fade out and respawn elsewhere, which is how a crowd
         system of this size fakes persistence honestly */
      n.enteringT = 1.2;
    } else if (n.destKind === "retail" || n.destKind === "leisure") {
      n.state = "idle"; n.stateT = 0; n.lingerT = 6 + R()*14;
    } else if (n.destKind === "transit") {
      n.enteringT = 1.6;
    } else {
      n.state = "idle"; n.stateT = 0; n.lingerT = 2 + R()*6;
    }
    n.agenda = this.agendaFor(hour, n.arch, R);
  },

  /* population density by hour — quiet at 4am, packed at 19:00 */
  crowdScale(hour) {
    const h = ((hour % 24) + 24) % 24;
    if (h < 5)  return 0.28;
    if (h < 7)  return 0.45;
    if (h < 10) return 1.00;
    if (h < 16) return 0.82;
    if (h < 20) return 1.00;
    if (h < 23) return 0.88;
    return 0.50;
  },
};

/* ==========================================================================
   NCPD
   Two layers: ambient patrols that exist whether or not you misbehave, and a
   dispatch ladder that escalates with your wanted level. Response spawns at
   the edge of perception and converges — you should see them arrive, not
   find them already standing behind you.
   ======================================================================== */
const POLICE = {
  units: [], cars: [], R: rng(0x4E43_50), dispatchT: 0, sirenT: 0,
  lastCrimeX: 0, lastCrimeZ: 0, searchT: 0,

  /* escalation ladder by wanted star */
  TIER: [
    { foot: 0, car: 0, arch: "cop",    label: "" },
    { foot: 2, car: 1, arch: "cop",    label: "NCPD PATROL RESPONDING" },
    { foot: 4, car: 1, arch: "cop",    label: "NCPD UNITS CONVERGING" },
    { foot: 5, car: 2, arch: "cop",    label: "NCPD TACTICAL DEPLOYED" },
    { foot: 6, car: 2, arch: "merc",   label: "PSYCHO SQUAD INBOUND" },
    { foot: 4, car: 2, arch: "maxtac", label: "MAXTAC HAS YOUR LOCATION" },
  ],

  reset() {
    for (const c of this.cars) { const i = TRAFFIC.cars.indexOf(c); if (i >= 0) TRAFFIC.cars.splice(i, 1); }
    this.cars.length = 0; this.units.length = 0;
  },

  /* record where the crime happened — units search here, not at your feet */
  reportCrime(x, z) { this.lastCrimeX = x; this.lastCrimeZ = z; this.searchT = 40; },

  update(dt, P) {
    const R = this.R;
    this.sirenT += dt;
    if (this.searchT > 0) this.searchT -= dt;

    /* prune dead or distant units */
    for (let i = this.units.length-1; i >= 0; i--) {
      const u = this.units[i];
      if (u.state === "dead" || NPCS.list.indexOf(u) < 0) { this.units.splice(i, 1); continue; }
      if (hypot(u.x-P.x, u.z-P.z) > 300) {
        const k = NPCS.list.indexOf(u); if (k >= 0) NPCS.list.splice(k, 1);
        this.units.splice(i, 1);
      }
    }
    for (let i = this.cars.length-1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.destroyed || hypot(c.p[0]-P.x, c.p[2]-P.z) > 340) {
        const k = TRAFFIC.cars.indexOf(c); if (k >= 0) TRAFFIC.cars.splice(k, 1);
        this.cars.splice(i, 1);
      }
    }

    const w = P.wanted;
    if (w <= 0) {
      /* ambient presence only: an occasional cruiser and a beat officer */
      if (this.cars.length < 1 && R() < dt*0.10) this.spawnCar(P, false);
      if (this.units.length < 1 && R() < dt*0.08) this.spawnFoot(P, "cop", false);
      for (const c of this.cars) { c.siren = false; }
      return;
    }

    const tier = this.TIER[min(w, this.TIER.length-1)];
    this.dispatchT -= dt;
    if (this.dispatchT <= 0) {
      this.dispatchT = 2.6;
      if (this.units.length < tier.foot) this.spawnFoot(P, tier.arch, true);
      if (this.cars.length < tier.car) this.spawnCar(P, true);
    }

    /* sirens + light bars while responding */
    for (const c of this.cars) {
      c.siren = true;
      c.headlights = true;
      if (this.sirenT % 0.9 < dt) AUDIO.siren([c.p[0], c.p[1]+1, c.p[2]], this.sirenT);
      /* drive at the last known crime scene rather than magically at you */
      const tx = this.searchT > 0 ? this.lastCrimeX : P.x;
      const tz = this.searchT > 0 ? this.lastCrimeZ : P.z;
      this.driveTo(c, tx, tz, dt);
    }
  },

  spawnFoot(P, arch, hostile) {
    const R = this.R;
    /* arrive from a street, at the edge of hearing */
    const a = R()*TAU, d = 55 + R()*45;
    const x = P.x + cos(a)*d, z = P.z + sin(a)*d;
    if (CITY.inWater(x, z)) return;
    const node = TRAFFIC.nearestNode(x, z);
    const sx = node ? node.x : x, sz = node ? node.z : z;
    const u = NPCS.spawn(arch, sx, sz, {
      hostile: !!hostile, aware: hostile ? 0.85 : 0,
      quest: false, ncpd: true, name: arch === "maxtac" ? "MaxTac Operator" : "NCPD Officer",
    });
    u.faction = "ncpd";
    if (hostile) u.state = "combat";
    else { u.agenda = "patrol"; u.state = "walk"; }
    this.units.push(u);
    if (hostile && this.units.length === 1) {
      const t = this.TIER[min(P.wanted, this.TIER.length-1)];
      if (t.label) UI.note(t.label, "bad");
    }
  },
  spawnCar(P, responding) {
    const R = this.R;
    const a = R()*TAU, d = 110 + R()*80;
    const x = P.x + cos(a)*d, z = P.z + sin(a)*d;
    if (CITY.inWater(x, z) || CITY.cityFalloff(x, z) > .5) return;
    const node = TRAFFIC.nearestNode(x, z);
    if (!node) return;
    const c = new Car("police", node.x, node.z, R()*TAU, [.06,.07,.12]);
    c.headlights = true;
    c.policeControlled = true;
    c.siren = !!responding;
    c.ai = { node, next: null, t: 0, cruise: responding ? 22 : 11 };
    TRAFFIC.pickNext(c);
    TRAFFIC.cars.push(c);
    this.cars.push(c);
  },
  /* steer a cruiser toward a point using the road graph, then bail out on foot */
  driveTo(c, tx, tz, dt) {
    const d = hypot(c.p[0]-tx, c.p[2]-tz);
    if (d < 22) {
      c.throttle = 0; c.brake = 1;
      if (c.speed < 2 && !c.dropped) {
        c.dropped = true;
        for (let i = 0; i < 2; i++) {
          const u = NPCS.spawn("cop", c.p[0] + (Math.random()-.5)*4, c.p[2] + (Math.random()-.5)*4,
            { hostile: true, aware: 0.9, ncpd: true, name: "NCPD Officer" });
          u.faction = "ncpd"; u.state = "combat";
          this.units.push(u);
        }
      }
      c.update(dt);
      return;
    }
    const a = c.ai;
    if (!a) { c.update(dt); return; }
    /* re-target the graph walk toward the objective each time we hit a node */
    if (!a.next || hypot(c.p[0]-a.next.x, c.p[2]-a.next.z) < 8) {
      a.node = a.next || a.node;
      let best = null, bs = 1e9;
      const n = a.node;
      if (n && n.e) for (const ei of n.e) {
        const e = CITY.edges[ei];
        const o = CITY.nodes[e.a === n.id ? e.b : e.a];
        const sc = hypot(o.x-tx, o.z-tz);
        if (sc < bs) { bs = sc; best = o; }
      }
      a.next = best || TRAFFIC.nearestNode(tx, tz);
    }
    if (a.next) {
      const dx = a.next.x-c.p[0], dz = a.next.z-c.p[2];
      const want = atan2(-dx, dz);
      c.steer = clamp(angDiff(c.yaw, want)*1.6, -1, 1);
      c.throttle = c.speed < a.cruise ? 1 : 0;
      c.brake = c.speed > a.cruise*1.2 ? 0.5 : 0;
    }
    c.update(dt);
  },
};
</script>
