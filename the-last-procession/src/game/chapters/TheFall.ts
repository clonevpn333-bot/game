import * as THREE from 'three';
import { toonMat } from '../../world/Compat2';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, orbitShot, type CamMode } from '../Camera';
import { G, gearGeo, merge, xf } from '../../world/Compat';
import { metalSet } from '../../world/Compat';
import { colossusMaterial } from '../../gfx/Materials';
import { Behemoth } from '../../world/Colossus';
import { glowCard } from '../../world/Props';
import { clamp, damp, easeInOut, fbm, V3, wrapAngle } from '../../util/math';

const SHAFT_R = 30;
const FALL_SPEED = 25;
const BOTTOM = -640;

interface Ring {
  y: number;
  group: THREE.Group;
  gap: number; // gap width (rad)
  gaps: number; // number of gaps
  spin: number;
  passed: boolean;
}
interface Bar {
  y: number;
  group: THREE.Group;
  spin: number;
  passed: boolean;
}

/** Builds the planet-machine diorama used by the reveal (and reused in the finale). */
export class PlanetMachine {
  readonly group = new THREE.Group();
  readonly planet: THREE.Mesh;
  readonly core: THREE.Mesh;
  readonly routes: THREE.Mesh[] = [];
  readonly walkers: THREE.Sprite[] = [];
  readonly nodes: THREE.Sprite[] = [];
  private readonly atmo: THREE.Mesh;
  private readonly curves: THREE.Curve<THREE.Vector3>[] = [];
  reveal = 0; // routes drawn 0..1
  xray = 0; // planet transparency to show the core
  coreWake = 0.3; // how awake the thing inside is
  complete = 0; // pattern locks together (finale)
  readonly inner: Behemoth;

  constructor() {
    const R = 120;
    // procedural continents
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d')!;
    const img = g.createImageData(1024, 512);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 1024; x++) {
        const lon = (x / 1024) * Math.PI * 2;
        const lat = (y / 512) * Math.PI;
        const px = Math.sin(lat) * Math.cos(lon);
        const py = Math.cos(lat);
        const pz = Math.sin(lat) * Math.sin(lon);
        const n = fbm(px * 2.2 + 5, pz * 2.2 + py * 1.3, 5);
        const land = n > 0.1;
        const i = (y * 1024 + x) * 4;
        const ice = Math.abs(py) > 0.88;
        const m = fbm(px * 9, pz * 9 + py * 4, 3);
        const col = ice
          ? [228, 234, 240]
          : land
            ? n > 0.32
              ? [150 + m * 60, 130 + m * 40, 100 + m * 30]
              : [70 + m * 60 + n * 80, 110 + m * 50, 50 + m * 30]
            : [20 + n * 40, 50 + (n + 0.5) * 70, 110 + (n + 0.5) * 90];
        img.data.set([col[0], col[1], col[2], 255], i);
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), toonMat({ map: tex, roughness: 0.85, transparent: true }));
    this.group.add(this.planet);
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 48, 32), new THREE.MeshBasicMaterial({ color: '#7fc0ff', transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.group.add(this.atmo);
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.42, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a2a').multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0 }));
    this.group.add(this.core);
    // what sleeps inside the world: a machine of turning bands around one iris
    this.inner = new Behemoth(R * 0.4);
    this.inner.setHaze('#000000', 0);
    this.inner.root.visible = false;
    this.group.add(this.inner.root);
    // routes: arcs that converge on six nodes in a mandala around the pole
    const nodeDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      nodeDirs.push(V3(Math.cos(a) * 0.62, 0.78, Math.sin(a) * 0.62).normalize());
    }
    nodeDirs.push(V3(0, 1, 0));
    for (let i = 0; i < 18; i++) {
      const start = V3(Math.cos(i * 2.39) * 1, -0.3 + Math.sin(i * 1.7) * 0.6, Math.sin(i * 2.39)).normalize();
      const end = nodeDirs[i % 7];
      const mid = start.clone().add(end).normalize().multiplyScalar(1.03);
      const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(mid, 0.5).normalize(), mid, mid.clone().lerp(end, 0.5).normalize(), end].map((v) => v.clone().multiplyScalar(R * 1.012)));
      this.curves.push(curve);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.7, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 3 ? '#ffd27a' : '#8ff7ff').multiplyScalar(2.2) }));
      tube.geometry.setDrawRange(0, 0);
      this.routes.push(tube);
      this.group.add(tube);
      const w = glowCard(i % 3 ? '#ffd27a' : '#8ff7ff', 9, 0.9);
      this.walkers.push(w);
      this.group.add(w);
    }
    for (const d of nodeDirs) {
      const n = glowCard('#ffffff', 16, 0);
      n.position.copy(d).multiplyScalar(R * 1.02);
      this.nodes.push(n);
      this.group.add(n);
    }
    // the mechanism beneath: rings linking the nodes
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(1.8), transparent: true, opacity: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62 * 1.02, 0.6, 6, 96), ringMat);
    ring.position.y = R * 0.78;
    ring.rotation.x = Math.PI / 2;
    ring.name = 'lockRing';
    this.group.add(ring);
  }

  update(dt: number, time: number): void {
    this.planet.rotation.y += dt * 0.02;
    const drawn = clamp(this.reveal, 0, 1);
    this.routes.forEach((r, i) => {
      const idx = (r.geometry.index?.count ?? 0) * clamp(drawn * 1.25 - (i % 6) * 0.04, 0, 1);
      r.geometry.setDrawRange(0, Math.floor(idx / 3) * 3);
      r.rotation.y = this.planet.rotation.y;
      const w = this.walkers[i];
      const u = clamp(drawn * 1.25 - (i % 6) * 0.04, 0, 1) * (0.92 + Math.sin(time * 0.5 + i) * 0.04);
      w.position.copy(this.curves[i].getPointAt(clamp(u, 0, 1))).applyAxisAngle(V3(0, 1, 0), this.planet.rotation.y);
      w.material.opacity = drawn > 0.01 ? 0.9 : 0;
    });
    this.nodes.forEach((n, i) => {
      n.material.opacity = clamp(drawn * 2 - 1, 0, 1) * (0.6 + Math.sin(time * 3 + i) * 0.3);
      n.position.applyAxisAngle(V3(0, 1, 0), dt * 0.02);
    });
    const pm = this.planet.material as THREE.MeshStandardMaterial;
    pm.opacity = 1 - this.xray * 0.75;
    pm.depthWrite = this.xray < 0.5;
    const cm = this.core.material as THREE.MeshBasicMaterial;
    cm.opacity = this.xray * (0.5 + Math.sin(time * (2 + this.coreWake * 4)) * 0.3 * this.coreWake);
    cm.color.set(this.complete > 0.5 ? '#6a8aff' : '#ff3a2a').multiplyScalar(1.4 + this.coreWake);
    this.core.rotation.y += dt * (0.1 + this.coreWake);
    this.inner.root.visible = this.xray > 0.05;
    this.inner.wake = this.coreWake;
    this.inner.root.rotation.y += dt * 0.05;
    this.inner.update(dt, time);
    cm.opacity *= 0.35;
    this.core.scale.setScalar(1 + Math.sin(time * 3) * 0.03 * this.coreWake);
    const lock = this.group.getObjectByName('lockRing') as THREE.Mesh;
    (lock.material as THREE.MeshBasicMaterial).opacity = this.complete;
    lock.rotation.z += dt * 0.3 * this.complete;
  }
}

// ============================================================================
// CHAPTER SIX — THE FALL
// ============================================================================
export class TheFall extends Chapter {
  static meta = { num: 'Chapter Six', title: 'The Fall', subtitle: 'Through the clockwork heart of a god, to the truth.' };
  readonly id = 'fall';
  readonly num = TheFall.meta.num;
  readonly title = TheFall.meta.title;
  readonly subtitle = TheFall.meta.subtitle;
  readonly checkpoints = ['intro', 'fall', 'core', 'reveal', 'after'];
  private rings: Ring[] = [];
  private bars: Bar[] = [];
  private fy = 0;
  private fx = 0;
  private fz = 0;
  private stun = 0;
  private coreGroup = new THREE.Group();
  private coreRings: THREE.Object3D[] = [];
  private machine!: PlanetMachine;
  private walkway!: THREE.Mesh;

  build(): void {
    const M = metalSet('bronze');
    const iron = metalSet('iron');
    // shaft walls
    const wallMat = colossusMaterial({ panel: 5, glow: new THREE.Color('#ffc46a'), grime: '#3a2a1a', moss: 0 });
    wallMat.side = THREE.BackSide;
    const wallGeo = new THREE.CylinderGeometry(SHAFT_R + 2, SHAFT_R + 2, 760, 48, 40, true);
    const wcol = new Float32Array(wallGeo.attributes.position.count * 3).fill(0);
    for (let i = 0; i < wcol.length; i += 3) wcol.set([0.62, 0.48, 0.32], i);
    wallGeo.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = -330;
    this.group.add(wall);
    // rune strips + wall gears for depth cues while falling
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(2) });
    const strips: THREE.BufferGeometry[] = [];
    const wallGears: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      strips.push(xf(G.box(0.5, 760, 0.5), [Math.cos(a) * (SHAFT_R + 1.6), -330, Math.sin(a) * (SHAFT_R + 1.6)]));
    }
    for (let k = 0; k < 26; k++) {
      const a = k * 2.1;
      wallGears.push(xf(gearGeo(4 + (k % 3) * 2, 0.5, 14, 1), [Math.cos(a) * (SHAFT_R + 1), -20 - k * 24, Math.sin(a) * (SHAFT_R + 1)], [0, -a + Math.PI / 2, 0]));
    }
    this.group.add(new THREE.Mesh(merge(strips), glow));
    this.group.add(new THREE.Mesh(merge(wallGears), M.trim));
    // light shafts from vents
    for (let i = 0; i < 14; i++) {
      const s = glowCard('#ffd8a0', 40, 0.12);
      s.position.set(Math.cos(i) * 18, -40 - i * 44, Math.sin(i) * 18);
      this.group.add(s);
    }
    // gear rings with gaps
    for (let i = 0; i < 10; i++) {
      const gaps = i < 4 ? 1 : 2;
      const gap = i < 4 ? 1.25 - i * 0.08 : 0.9;
      const group = new THREE.Group();
      const y = -70 - i * 56;
      group.position.y = y;
      const per = (Math.PI * 2) / gaps;
      const parts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < gaps; k++) {
        const start = k * per + gap / 2;
        parts.push(xf(new THREE.RingGeometry(2.4, SHAFT_R + 1, 40, 1, start, per - gap), [0, 0, 0], [-Math.PI / 2, 0, 0]));
        // spokes for readability
        for (let s = 0; s < 4; s++) {
          const a = start + ((per - gap) * (s + 0.5)) / 4;
          parts.push(xf(G.box(SHAFT_R - 3, 0.8, 0.9), [Math.cos(a) * (SHAFT_R / 2 + 1), 0.5, -Math.sin(a) * (SHAFT_R / 2 + 1)], [0, a, 0]));
        }
      }
      const discMat = iron.hull.clone() as THREE.MeshToonMaterial;
      discMat.side = THREE.DoubleSide;
      discMat.transparent = true;
      discMat.color.set('#8a8078');
      const disc = new THREE.Mesh(merge(parts), discMat);
      disc.name = 'disc';
      disc.receiveShadow = true;
      group.add(disc);
      const rim = new THREE.Mesh(gearGeo(SHAFT_R - 0.5, 0.9, 48, 1.4), M.trim);
      rim.rotation.x = Math.PI / 2;
      group.add(rim);
      // the gap glows: read it from far above
      for (let k = 0; k < gaps; k++) {
        const g = new THREE.Mesh(new THREE.RingGeometry(3, SHAFT_R - 1, 24, 1, k * per - gap / 2, gap), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8ff7ff').multiplyScalar(1.8), transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
        g.rotation.x = -Math.PI / 2;
        g.position.y = -0.4;
        group.add(g);
      }
      this.group.add(group);
      this.rings.push({ y, group, gap, gaps, spin: (i % 2 ? 1 : -1) * (0.25 + i * 0.03), passed: false });
    }
    // sweeping bars between some rings
    for (const i of [2, 4, 6, 7, 8]) {
      const group = new THREE.Group();
      group.position.y = -70 - i * 56 - 28;
      const bar = new THREE.Mesh(merge([xf(G.box(SHAFT_R * 2, 2.2, 2.6), [0, 0, 0]), xf(G.cyl(3, 3, 3, 12), [0, 0, 0])]), iron.dark);
      const edge = new THREE.Mesh(G.box(SHAFT_R * 2, 0.3, 2.8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a3a').multiplyScalar(2) }));
      edge.position.y = 1.2;
      group.add(bar, edge);
      this.group.add(group);
      this.bars.push({ y: group.position.y, group, spin: i % 2 ? 0.7 : -0.6, passed: false });
    }
    // the core chamber at the bottom
    this.coreGroup.position.y = BOTTOM - 20;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(SHAFT_R + 2, 48), toonMat({ color: '#0a2a30', emissive: '#0a3a40', roughness: 0.05, metalness: 0.6 }));
    pool.rotation.x = -Math.PI / 2;
    this.coreGroup.add(pool);
    this.walkway = new THREE.Mesh(merge([xf(G.box(4, 0.6, 26), [0, 0.3, -8]), xf(G.cyl(5, 5.5, 1.4, 20), [0, 0.7, 6])]), M.hull);
    this.walkway.receiveShadow = true;
    this.coreGroup.add(this.walkway);
    const coreSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8ff7ff').multiplyScalar(2.2) }));
    coreSphere.position.set(0, 6.5, 6);
    this.coreGroup.add(coreSphere);
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(gearGeo(5.5 + i * 2, 0.35, 24, 0.6), M.trim);
      r.position.copy(coreSphere.position);
      this.coreGroup.add(r);
      this.coreRings.push(r);
    }
    const cl = new THREE.PointLight('#8ff7ff', 60, 60, 1.5);
    cl.position.set(0, 7, 6);
    this.coreGroup.add(cl);
    this.group.add(this.coreGroup);
    // the reveal diorama lives far above the world
    this.machine = new PlanetMachine();
    this.machine.group.position.set(0, 6000, 0);
    this.machine.group.visible = false;
    this.group.add(this.machine.group);
  }

  ground(): number {
    return BOTTOM - 20 + 0.6;
  }

  tick(dt: number): void {
    const camY = this.g.cam.camera.position.y;
    for (const r of this.rings) {
      r.group.rotation.y += r.spin * dt;
      // never let a ring hide the fallers from the overhead camera
      const between = camY > r.y - 0.5 && r.y > this.fy - 1.5;
      const disc = r.group.getObjectByName('disc') as THREE.Mesh;
      const m = disc.material as THREE.MeshStandardMaterial;
      m.opacity += ((between ? 0.12 : 1) - m.opacity) * Math.min(1, dt * 14);
      m.depthWrite = m.opacity > 0.9;
    }
    for (const b of this.bars) b.group.rotation.y += b.spin * dt;
    this.coreRings.forEach((r, i) => {
      r.rotation.x += dt * (0.3 + i * 0.2);
      r.rotation.y += dt * (0.2 + i * 0.15);
    });
    if (this.machine.group.visible) this.machine.update(dt, this.time);
    if (Math.random() < 0.3) this.g.particles.motes(V3((Math.random() - 0.5) * 40, this.fy - 30 - Math.random() * 40, (Math.random() - 0.5) * 40), '#ffd8a0', 1, 1);
  }

  private placeFallers(): void {
    const k = this.hero.char;
    k.root.position.set(this.fx, this.fy, this.fz);
    k.groundY = this.fy - 100;
    this.hero.pos.copy(k.root.position);
    k.yaw = k.targetYaw = 0;
    k.root.rotation.y = 0;
    this.lyra.root.position.set(this.fx + 1.1, this.fy + 0.15, this.fz - 0.2);
    this.lyra.yaw = this.lyra.targetYaw = 0.15;
    this.lyra.root.rotation.y = 0.15;
    this.lyra.groundY = this.fy - 100;
    this.focus.copy(this.hero.pos);
  }

  private fallCam(): CamMode {
    const pos = new THREE.Vector3();
    let init = false;
    return (dt, _t, out) => {
      const want = V3(this.fx * 0.7, this.fy + 11, this.fz * 0.7 - 7);
      if (!init || dt === 0) {
        pos.copy(want);
        init = true;
      } else pos.lerp(want, damp(8, dt));
      out.pos.copy(pos);
      out.look.set(this.fx * 0.9, this.fy - 18, this.fz * 0.9 + 3);
      out.fov = 72;
      out.roll = Math.sin(this.time * 0.6) * 0.05;
    };
  }

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('interior');
    audio.setAmbience('machine', 1);
    audio.setAmbience('wind', 0.3);

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('inside');
      this.fy = 4;
      this.fx = 0;
      this.fz = -14;
      this.stage(V3(0, 4, -14), 0, V3(1.2, 4, -14), 0);
      const ledge = new THREE.Mesh(G.box(8, 1, 6), metalSet('bronze').hull);
      ledge.position.set(0, 3.5, -14);
      this.group.add(ledge);
      this.hero.char.root.position.y = 4;
      this.lyra.root.position.y = 4;
      this.hero.char.groundY = this.lyra.groundY = 4;
      this.cut(dollyShot(V3(0, 30, 10), V3(0, 18, 4), V3(0, -60, 0), V3(0, 2, -14), 7, 60, 50), 0, 'shaft-top');
      this.go(this.fadeIn(2));
      await this.card(this.num, this.title, 'Inside the Carillon', 2.8);
      this.cut(fixedShot(V3(3, 6, -9), V3(0.5, 5.2, -14), 40), 0, 'ledge-two');
      this.lyra.lookAtTarget = V3(0, -200, 0);
      await this.say('LYRA', "It goes all the way down. I can hear the heart at the bottom. It's the same sound — the clocks.");
      await this.say('KAEL', "Then we find the stairs.");
      audio.sfx('creak', 1, 0.6);
      this.g.cam.shake(0.8);
      await this.say('LYRA', '<i>(the floor tilts — the giant takes a step)</i> Kael—!', { hold: 1.4 });
      audio.sfx('crash', 1, 0.6);
      ledge.removeFromParent();
      this.hero.char.setMode('fall', 0.2);
      this.lyra.setMode('fall', 0.2);
      await this.animate(1.0, (k) => {
        this.fy = 4 - k * k * 14;
        this.placeFallers();
      });
      await this.say('KAEL', "Take my hand! Don't let go!", { hold: 1.4 });
    }

    if (this.reached(from, 'fall')) {
      this.music('action');
      audio.intensity = 1;
      await this.segment(
        'fall',
        () => {
          this.fy = -10;
          this.fx = 0;
          this.fz = 0;
          this.stun = 0;
          this.hero.object.visible = true;
          this.lyra.root.visible = true;
          this.hero.char.setMode('fall', 0);
          this.lyra.setMode('fall', 0);
          for (const r of this.rings) r.passed = false;
          for (const b of this.bars) b.passed = false;
          this.placeFallers();
          ui.objective('Steer through the gaps');
          this.cut(this.fallCam(), 0.4, 'fall-top');
        },
        (dt) => {
          const h = this.hero;
          const mv = this.g.input.move;
          h.invuln = Math.max(0, h.invuln - dt);
          this.stun = Math.max(0, this.stun - dt);
          const sp = this.stun > 0 ? 6 : 15;
          this.fx = this.fx - mv.x * sp * dt;
          this.fz = this.fz + mv.y * sp * dt;
          const rr = Math.hypot(this.fx, this.fz);
          if (rr > SHAFT_R - 4) {
            this.fx *= (SHAFT_R - 4) / rr;
            this.fz *= (SHAFT_R - 4) / rr;
          }
          const prevY = this.fy;
          this.fy -= FALL_SPEED * dt * (this.stun > 0 ? 0.6 : 1);
          this.hero.char.body.visible = h.invuln <= 0 || Math.floor(h.invuln * 14) % 2 === 0;
          // ring crossings
          for (const r of this.rings) {
            if (r.passed || !(prevY > r.y && this.fy <= r.y)) continue;
            r.passed = true;
            const ang = Math.atan2(-this.fz, this.fx) - r.group.rotation.y; // ring geometry was rotated by -90° about x
            const per = (Math.PI * 2) / r.gaps;
            let inGap = false;
            for (let k = 0; k < r.gaps; k++) if (Math.abs(wrapAngle(ang - k * per)) < r.gap / 2 - 0.05) inGap = true;
            if (Math.hypot(this.fx, this.fz) < 2.4) inGap = false;
            if (!inGap) this.crash(V3(this.fx, r.y, this.fz));
            else {
              audio.sfx('whoosh', 0.9);
              this.g.cam.punch(-6);
            }
          }
          for (const b of this.bars) {
            if (b.passed || !(prevY > b.y + 1.2 && this.fy <= b.y + 1.2)) continue;
            b.passed = true;
            // distance from the bar's line (through the axis at angle rotation.y)
            const a = b.group.rotation.y;
            const dir = V3(Math.cos(a), 0, -Math.sin(a));
            const d = Math.abs(V3(this.fx, 0, this.fz).cross(dir).y);
            if (d < 2.4) this.crash(V3(this.fx, b.y, this.fz));
            else audio.sfx('whoosh', 0.6, 1.4);
          }
          this.placeFallers();
          ui.progress(this.fy / BOTTOM);
          const next = this.rings.find((r) => !r.passed && r.y < this.fy);
          if (next && this.fy - next.y < 45) ui.prompt('move', 'Steer into the glowing gap', this.fy - next.y < 20);
          else ui.prompt(null);
          // a side insert halfway down, for scale
          if (this.g.cam.label === 'fall-top' && this.fy < -330 && this.fy > -360) {
            this.cut(fixedShot(V3(SHAFT_R - 3, this.fy - 40, 0), () => this.hero.pos.clone(), 58), 0, 'fall-side');
          } else if (this.g.cam.label === 'fall-side' && this.g.cam.modeTime > 1.6) this.cut(this.fallCam(), 0, 'fall-top2');
          return this.fy < BOTTOM + 30 ? 'win' : undefined;
        },
        { onFoot: false },
      );
    }

    if (this.reached(from, 'core')) {
      this.checkpoint('core');
      this.cinematic(true);
      this.music('inside');
      ui.qte(null);
      const base = BOTTOM - 20;
      // splash down
      this.g.particles.emit('dust', V3(0, base + 1, 0), 60, { color: '#bfefff', size: 2, sizeEnd: 3, life: 1.6, speed: 10, spread: 1, dir: V3(0, 1, 0), gravity: 9, alpha: 0.7 });
      audio.sfx('crash', 1, 1.4);
      this.stage(V3(-0.6, base + 0.6, -6), 0, V3(0.8, base + 0.6, -5.4), 0);
      this.hero.char.groundY = this.lyra.groundY = base + 0.6;
      this.hero.char.root.position.y = this.lyra.root.position.y = base + 0.6;
      this.cut(dollyShot(V3(-8, base + 3, -16), V3(-5, base + 4, -12), V3(0, base + 2, -5), V3(0, base + 6, 6), 6, 44, 38), 0, 'core-reveal');
      await this.wait(1.5);
      this.lyra.lookAtTarget = V3(0, base + 6.5, 6);
      this.hero.char.lookAtTarget = V3(0, base + 6.5, 6);
      await this.say('KAEL', 'Are you hurt? ...Lyra?');
      await this.say('LYRA', "This is where I was. All that time. Right here.");
      await this.walkTo(this.lyra, V3(0, base + 0.6, 1.8), 1.1);
      this.lyra.setMode('reach');
      this.cut(fixedShot(V3(2.5, base + 2.4, -0.5), V3(0, base + 2.8, 3), 36), 0, 'lyra-reach');
      await this.wait(1.4);
      audio.sfx('choir', 1);
      await this.flash(0.9, 1.4);
    }

    if (this.reached(from, 'reveal')) {
      this.checkpoint('reveal');
      this.cinematic(true);
      this.music('reveal');
      this.sky('space');
      const M = this.machine;
      M.group.visible = true;
      M.reveal = 0;
      M.xray = 0;
      M.coreWake = 0.3;
      const c = M.group.position;
      this.cut(orbitShot(() => c, 560, 150, -0.6, 0.4, 26, 36), 0, 'planet');
      await this.say('LYRA', "They aren't migrating. They never were.", { hold: 3.2 });
      await this.animate(7, (k) => (M.reveal = easeInOut(k)));
      await this.say('LYRA', "Every three hundred years they walk the same roads, and arrive at the same places — at the same moment.", { hold: 4 });
      this.cut(dollyShot(V3(c.x, c.y + 470, c.z + 80), V3(c.x, c.y + 360, c.z + 40), c, c, 7, 40, 44), 0, 'planet-pole');
      await this.say('LYRA', "Their roads draw a shape. Your cities were built on its joints, and nobody ever noticed.", { hold: 4 });
      await this.say('LYRA', "Beneath the ground they connect. The whole world is one machine — and they are its hands.", { hold: 4 });
      this.cut(orbitShot(() => c, 300, 30, 0.6, 1.5, 14, 40), 1.2, 'planet-core');
      await this.animate(4, (k) => {
        M.xray = k;
        M.coreWake = 0.3 + k * 0.7;
      });
      audio.sfx('boom', 0.8, 0.5);
      await this.say('LYRA', "And it was built to keep something <i>asleep</i>.", { hold: 3.5 });
      await this.say('LYRA', "The Procession is a lullaby. Every three hundred years, the world sings it again.", { hold: 4 });
      await this.say('LYRA', "This time one of them stopped walking. The Pilgrim. It stopped... because I came out.", { hold: 4.2 });
      await this.fadeOut(1.2);
      M.group.visible = false;
      this.sky('interior');
    }

    // back in the chamber
    this.checkpoint('after');
    this.cinematic(true);
    this.music('farewell');
    const base = BOTTOM - 20;
    this.stage(V3(-0.6, base + 0.6, 0.4), 0.2, V3(0.4, base + 0.6, 1.8), Math.PI + 0.3);
    this.hero.char.groundY = this.lyra.groundY = base + 0.6;
    this.hero.char.root.position.y = this.lyra.root.position.y = base + 0.6;
    this.lyra.setMode('idle');
    this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
    this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
    this.go(this.fadeIn(1.2));
    this.cut(fixedShot(V3(-2.6, base + 2.1, 3.4), V3(0, base + 1.9, 1.0), 34), 0, 'after-two');
    await this.say('KAEL', 'Lyra. Whatever you saw—');
    await this.say('LYRA', 'I was the note, Kael. The missing note. I was supposed to stay inside the Pilgrim.');
    this.cut(fixedShot(V3(1.6, base + 2.0, -1.4), V3(-0.6, base + 1.7, 0.4), 32), 0, 'after-kael');
    await this.say('KAEL', "No. You were a girl who counted to nine billion because nobody was there to talk to.");
    this.cut(fixedShot(V3(-2.0, base + 2.0, 4.2), V3(0.4, base + 1.6, 1.8), 32), 0, 'after-lyra');
    await this.say('LYRA', "...Both things can be true.");
    await this.say('LYRA', "Every Processional is going to the Field of Bells. If the Pilgrim doesn't arrive with them, the song ends unfinished.");
    this.cut(fixedShot(V3(1.6, base + 2.0, -1.4), V3(-0.6, base + 1.7, 0.4), 32), 0, 'after-kael2');
    await this.say('KAEL', '...Then I\'ll take you to the Field of Bells. And on the way, I\'ll think of something else.');
    await this.say('LYRA', '<i>(smiling)</i> You always say that like it\'s a plan.');
    await this.fadeOut(1.6);
  }

  private crash(at: THREE.Vector3): void {
    const h = this.hero;
    this.stun = 0.8;
    this.g.particles.sparks(at.clone().add(V3(0, 1, 0)), '#ffcf7a', 24);
    this.g.audio.sfx('clang', 1, 0.5);
    this.g.audio.sfx('gear', 1);
    this.g.cam.shake(0.6);
    if (h.invuln <= 0) {
      h.resolve = Math.max(0, h.resolve - 1);
      h.invuln = 0.9;
      this.g.audio.sfx('hurt');
    }
  }
}
