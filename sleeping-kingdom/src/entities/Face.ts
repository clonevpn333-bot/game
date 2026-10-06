import * as THREE from 'three';

/**
 * PS2-style faces: a low-poly head carrying a painted face texture. The eyes, nose and mouth
 * are painted, not modelled; blinking and speech swap frames on a small sprite sheet, the way
 * games of that era animated faces.
 *
 * Sheet layout (3 x 2 frames): eyes open / half / closed across, mouth closed / open down.
 * Talking alternates mouth rows; a "mid" mouth comes from the half-eye column's mouth slot.
 */
export type FaceMood = 'calm' | 'fear' | 'grim' | 'old';

const COLS = 3;
const ROWS = 3;
const F = 96;
const sheets = new Map<string, HTMLCanvasElement>();

function hex(c: THREE.Color): string {
  return `#${c.getHexString()}`;
}

function paintSheet(skin: string, mood: FaceMood, feminine: boolean, iris: string): HTMLCanvasElement {
  const key = `${skin}|${mood}|${feminine}|${iris}`;
  const hit = sheets.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = F * COLS;
  c.height = F * ROWS;
  const ctx = c.getContext('2d')!;
  const base = new THREE.Color(skin);
  const shade = hex(base.clone().multiplyScalar(0.72));
  const deep = hex(base.clone().multiplyScalar(0.45));
  const light = hex(base.clone().lerp(new THREE.Color('#ffffff'), 0.18));
  const lipCol = hex(base.clone().multiplyScalar(0.7).lerp(new THREE.Color('#8a3028'), 0.35));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ox = col * F;
      const oy = row * F;
      const X = (u: number) => ox + u * F;
      const Y = (v: number) => oy + v * F;
      ctx.fillStyle = skin;
      ctx.fillRect(ox, oy, F, F);
      // Soft modelling: cheek shadow under the bones, light down the nose ridge and forehead.
      const grad = ctx.createRadialGradient(X(0.5), Y(0.42), F * 0.05, X(0.5), Y(0.5), F * 0.5);
      grad.addColorStop(0, light);
      grad.addColorStop(0.6, skin);
      grad.addColorStop(1, shade);
      ctx.fillStyle = grad;
      ctx.fillRect(ox, oy, F, F);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#c0605a';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(X(0.5 + sx * 0.15), Y(0.6), F * 0.05, F * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Brows.
      const browLift = mood === 'fear' ? -0.03 : 0;
      const browTilt = mood === 'grim' ? 0.035 : mood === 'fear' ? -0.03 : 0.008;
      ctx.strokeStyle = deep;
      ctx.lineWidth = feminine ? 1.6 : 2.6;
      ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(X(0.5 + sx * 0.06), Y(0.37 + browLift + browTilt));
        ctx.quadraticCurveTo(X(0.5 + sx * 0.12), Y(0.345 + browLift), X(0.5 + sx * 0.19), Y(0.37 + browLift - browTilt * 0.4));
        ctx.stroke();
      }
      // Eyes: open, half, closed.
      for (const sx of [-1, 1]) {
        const ex = X(0.5 + sx * 0.12);
        const ey = Y(0.44);
        const w = F * 0.055;
        const h = F * (col === 0 ? 0.028 : col === 1 ? 0.014 : 0.002);
        // Socket shadow.
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.ellipse(ex, ey - F * 0.004, w * 1.25, F * 0.034, 0, 0, Math.PI * 2);
        ctx.fill();
        if (col < 2) {
          ctx.fillStyle = '#e8e2d6';
          ctx.beginPath();
          ctx.ellipse(ex, ey, w, h, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(ex, ey, w, h, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = iris;
          ctx.beginPath();
          ctx.arc(ex + sx * F * 0.004, ey + F * 0.003, F * 0.022, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#080606';
          ctx.beginPath();
          ctx.arc(ex + sx * F * 0.004, ey + F * 0.003, F * 0.01, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(ex - F * 0.008, ey - F * 0.01, F * 0.008, F * 0.008);
          ctx.restore();
        }
        // Upper lid / lashes.
        ctx.strokeStyle = '#1a100c';
        ctx.lineWidth = feminine ? 2.2 : 1.8;
        ctx.beginPath();
        ctx.ellipse(ex, ey + (col === 2 ? 0 : 0), w * 1.02, h + 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        if (col === 2) {
          ctx.beginPath();
          ctx.moveTo(ex - w, ey);
          ctx.quadraticCurveTo(ex, ey + F * 0.012, ex + w, ey);
          ctx.stroke();
        }
        if (mood === 'old') {
          ctx.strokeStyle = shade;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ex + sx * w * 1.1, ey + F * 0.01);
          ctx.lineTo(ex + sx * w * 1.6, ey + F * 0.03);
          ctx.stroke();
        }
      }
      // Nose: shadow down one side, nostrils, a light on the tip.
      ctx.strokeStyle = shade;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(0.47), Y(0.45));
      ctx.quadraticCurveTo(X(0.455), Y(0.56), X(0.47), Y(0.6));
      ctx.stroke();
      ctx.fillStyle = deep;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(X(0.5 + sx * 0.022), Y(0.615), F * 0.011, F * 0.006, sx * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(X(0.5), Y(0.59), F * 0.014, F * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();
      // Mouth: row 0 closed, row 1 open, row 2 half.
      const mx = X(0.5);
      const my = Y(0.72);
      const mw = F * (feminine ? 0.055 : 0.065);
      const open = row === 1 ? 0.03 : row === 2 ? 0.014 : mood === 'fear' ? 0.01 : 0;
      ctx.fillStyle = lipCol;
      ctx.beginPath();
      ctx.ellipse(mx, my, mw * 1.05, F * (0.012 + open * 0.6), 0, 0, Math.PI * 2);
      ctx.fill();
      if (open > 0) {
        ctx.fillStyle = '#1a0806';
        ctx.beginPath();
        ctx.ellipse(mx, my + F * 0.002, mw * 0.8, F * open, 0, 0, Math.PI * 2);
        ctx.fill();
        if (row === 1) {
          ctx.fillStyle = '#d8d0c0';
          ctx.fillRect(mx - mw * 0.5, my - F * open * 0.8, mw, F * 0.008);
        }
      } else {
        ctx.strokeStyle = deep;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const turn = mood === 'grim' || mood === 'old' ? F * 0.008 : -F * 0.003;
        ctx.moveTo(mx - mw, my + turn);
        ctx.quadraticCurveTo(mx, my - F * 0.004, mx + mw, my + turn);
        ctx.stroke();
      }
      ctx.fillStyle = shade;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(mx, Y(0.8), F * 0.03, F * 0.008, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  sheets.set(key, c);
  return c;
}

export class FaceAnim {
  readonly mesh: THREE.Mesh;
  private readonly tex: THREE.CanvasTexture;
  private blinkT = 1 + Math.random() * 3;
  private blink = 0;
  private mouthT = 0;
  private mouth = 0;
  talking = false;

  constructor(skin: string, mood: FaceMood, feminine: boolean, radius: number) {
    const irises = ['#3a2a1a', '#2a3a4a', '#3a4a2a', '#4a3020'];
    const sheet = paintSheet(skin, mood, feminine, irises[Math.floor(Math.random() * irises.length)]);
    this.tex = new THREE.CanvasTexture(sheet);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.repeat.set(1 / COLS, 1 / ROWS);
    this.tex.anisotropy = 1;
    // The face wraps the front of the head: a low-poly patch of the head sphere, slightly proud of it.
    const len = Math.PI * 0.95;
    const g = new THREE.SphereGeometry(radius, 7, 5, Math.PI / 2 - len / 2, len, Math.PI * 0.22, Math.PI * 0.56);
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.75 });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.userData.keep = true;
    this.mesh.castShadow = false;
    this.setFrame(0, 0);
  }

  private setFrame(eye: number, mouthRow: number): void {
    this.tex.offset.set(eye / COLS, 1 - (mouthRow + 1) / ROWS);
  }

  update(dt: number): void {
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.16;
      this.blinkT = 2 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt);
    const eye = this.blink > 0.1 ? 1 : this.blink > 0 ? 2 : 0;
    if (this.talking) {
      this.mouthT -= dt;
      if (this.mouthT <= 0) {
        this.mouthT = 0.07 + Math.random() * 0.09;
        const r = Math.random();
        this.mouth = r < 0.35 ? 1 : r < 0.75 ? 2 : 0;
      }
    } else this.mouth = 0;
    this.setFrame(eye, this.mouth);
  }
}
