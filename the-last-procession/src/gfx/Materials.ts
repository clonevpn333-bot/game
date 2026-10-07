import * as THREE from 'three';
import { ghibli } from './Toon';

/** Shared rim-light uniforms (set per scene from the sky palette). */
export const RIM = {
  color: { value: new THREE.Color('#ffd9b0') },
  strength: { value: 0.2 },
};

/**
 * Character surface in the painted style: vertex colours + per-vertex metal,
 * subsurface warmth and glow (the "surf" attribute baked by the sculptor), and
 * ink lines along material seams (the "ink" attribute).
 */
export function sculptMaterial(opts: { glow?: number; instanced?: boolean } = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ vertexColors: true });
  const glow = { value: opts.glow ?? 2.2 };
  m.userData.glow = glow;
  m.onBeforeCompile = (s) => {
    s.uniforms.uGlow = glow;
    ghibli(s, {
      brushScale: 0.25,
      grain: 0,
      wobble: 0.35,
      vertDecl: 'attribute vec4 surf;\nattribute float tint;\nattribute float ink;\nvarying vec4 vSurf;\nvarying float vInk;',
      vertBody: 'vSurf = surf; vInk = ink;',
      fragDecl: 'varying vec4 vSurf; varying float vInk; uniform float uGlow;',
      color: 'diffuseColor.rgb *= 1.0 - vSurf.y * 0.25;',
      emissive: `vec3 vn = normalize(vNormal);
        totalEmissiveRadiance += diffuseColor.rgb * (smoothstep(0.28, 0.34, vn.y) - smoothstep(0.6, 0.68, vn.y) * 0.6) * vSurf.y * 0.9;
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.55, 0.45) * vSurf.z * 0.08;
        totalEmissiveRadiance += diffuseColor.rgb * vSurf.w * uGlow;`,
      ink: 'vInk',
    });
    if (opts.instanced) s.vertexShader = s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.rgb = mix(color.rgb, color.rgb * instanceColor, tint);\n#endif');
  };
  m.customProgramCacheKey = () => `sculpt-${opts.instanced ? 'i' : 's'}`;
  return m;
}

/** Eye texture: sclera with a coloured iris band and pupil around the +Y pole. */
export function eyeTexture(iris: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  // canvas y=0 is v=1 (the pole facing forward)
  grad.addColorStop(0, '#05040a');
  grad.addColorStop(0.07, '#05040a');
  grad.addColorStop(0.085, iris);
  grad.addColorStop(0.15, new THREE.Color(iris).multiplyScalar(0.55).getStyle());
  grad.addColorStop(0.185, '#1a1414');
  grad.addColorStop(0.2, '#f4efe8');
  grad.addColorStop(1, '#dcd3cf');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let radial: THREE.CanvasTexture | null = null;
export function radialTexture(): THREE.CanvasTexture {
  if (radial) return radial;
  radial = canvasTex(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  });
  radial.colorSpace = THREE.NoColorSpace;
  return radial;
}

/** Plaster/stone facade with shuttered windows, timber bands and flower boxes. */
export function facadeTexture(seed: number): THREE.CanvasTexture {
  return canvasTex(512, (g, s) => {
    const r = rng(seed);
    g.fillStyle = '#efe4cf';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '120,90,60' : '255,250,235'},${r() * 0.06})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 2 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
    const rows = 4;
    const cols = 3;
    for (let y = 0; y < rows; y++) {
      const ry = (y * s) / rows;
      g.fillStyle = 'rgba(110,70,45,0.85)';
      g.fillRect(0, ry + s / rows - 10, s, 7); // timber band
      for (let x = 0; x < cols; x++) {
        const cx = (x + 0.5) * (s / cols);
        const cy = ry + s / rows * 0.48;
        const w = 50;
        const h = 76;
        const lit = r() > 0.6;
        g.fillStyle = 'rgba(70,50,40,0.9)';
        g.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);
        g.fillStyle = lit ? '#ffcb78' : '#2e3446';
        g.fillRect(cx - w / 2, cy - h / 2, w, h);
        g.strokeStyle = 'rgba(70,50,40,0.9)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx, cy - h / 2);
        g.lineTo(cx, cy + h / 2);
        g.moveTo(cx - w / 2, cy - 4);
        g.lineTo(cx + w / 2, cy - 4);
        g.stroke();
        // shutters
        const sh = ['#4a6b8a', '#7a8a4a', '#9a4a3a', '#5a7a6a'][Math.floor(r() * 4)];
        g.fillStyle = sh;
        g.fillRect(cx - w / 2 - 22, cy - h / 2, 18, h);
        g.fillRect(cx + w / 2 + 4, cy - h / 2, 18, h);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = 0; k < 9; k++) {
          g.fillRect(cx - w / 2 - 22, cy - h / 2 + 4 + k * 8, 18, 2);
          g.fillRect(cx + w / 2 + 4, cy - h / 2 + 4 + k * 8, 18, 2);
        }
        // flower box
        if (r() > 0.45) {
          g.fillStyle = '#6a4630';
          g.fillRect(cx - w / 2 - 2, cy + h / 2 + 2, w + 4, 8);
          for (let k = 0; k < 12; k++) {
            g.fillStyle = ['#d8473a', '#f0c040', '#e88aa0', '#5a8a3a'][Math.floor(r() * 4)];
            g.beginPath();
            g.arc(cx - w / 2 + 2 + k * 4.4, cy + h / 2, 3.5, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    }
  });
}

export function roofTexture(seed: number): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = '#b4553a';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 12) {
      for (let x = (y / 12) % 2 ? -9 : 0; x < s; x += 18) {
        const v = 0.75 + r() * 0.4;
        g.fillStyle = `rgb(${Math.floor(190 * v)},${Math.floor(90 * v)},${Math.floor(62 * v)})`;
        g.beginPath();
        g.roundRect?.(x + 1, y + 1, 16, 11, [0, 0, 7, 7]);
        g.fill();
        g.fillStyle = 'rgba(40,10,5,0.35)';
        g.fillRect(x + 1, y + 10, 16, 2);
      }
    }
  });
}

export function stoneTexture(base: string, seed: number, courses = 8): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const h = s / courses;
    for (let y = 0; y < courses; y++) {
      let x = (y % 2) * -h;
      while (x < s) {
        const w = h * (1.4 + r() * 1.2);
        const v = 0.85 + r() * 0.25;
        g.fillStyle = `rgba(${Math.floor(255 * v)},${Math.floor(245 * v)},${Math.floor(225 * v)},0.2)`;
        g.fillRect(x + 1, y * h + 1, w - 2, h - 2);
        g.strokeStyle = 'rgba(60,40,40,0.35)';
        g.lineWidth = 1.5;
        g.strokeRect(x, y * h, w, h);
        x += w;
      }
    }
  });
}

export function cobbleTexture(seed: number, repeat: number): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = '#6b5b4f';
    g.fillRect(0, 0, s, s);
    const n = 10;
    const cs = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 0.72 + r() * 0.38;
        g.fillStyle = `rgb(${Math.floor(176 * v)},${Math.floor(160 * v)},${Math.floor(140 * v)})`;
        const ox = (y % 2) * cs * 0.5 + (r() - 0.5) * 2;
        g.beginPath();
        g.ellipse(x * cs + ox + cs / 2, y * cs + cs / 2, cs / 2 - 2, cs / 2 - 2.5, r(), 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.beginPath();
        g.ellipse(x * cs + ox + cs / 2 - 3, y * cs + cs / 2 - 3, cs / 4, cs / 5, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, repeat);
}

/** Tileable ground detail (grain, pebbles, dirt) used by the terrain shader. */
export function groundDetailTexture(seed: number): THREE.CanvasTexture {
  const t = canvasTex(512, (g, s) => {
    const r = rng(seed);
    g.fillStyle = '#808080';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) {
      const v = Math.floor(90 + r() * 80);
      g.fillStyle = `rgba(${v},${v},${v},${0.2 + r() * 0.3})`;
      const w = 1 + r() * 4;
      g.fillRect(r() * s, r() * s, w, w * (0.4 + r()));
    }
    for (let i = 0; i < 260; i++) {
      const v = Math.floor(120 + r() * 100);
      g.fillStyle = `rgba(${v},${v},${v},0.6)`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Shared clock for animated world shaders. */
export const WORLD_TIME = { value: 0 };

/**
 * Colossus hull in the painted style: vertex-coloured plates with inked panel
 * seams (triplanar in object space so the pattern rides each moving part),
 * per-plate tone variation, rare glowing glyph inlays that pulse in a slow
 * wave climbing the body, and earthy grime near the ground.
 */
export function colossusMaterial(o: { panel: number; glow: THREE.Color; grime?: string; grimeHeight?: number; metal?: number; rough?: number; moss?: number; mossColor?: string; haze?: number }): THREE.MeshToonMaterial & { userData: { glow: { value: number }; glowColor: { value: THREE.Color } } } {
  const m = new THREE.MeshToonMaterial({ vertexColors: true });
  const glow = { value: 1 };
  const glowColor = { value: o.glow.clone() };
  m.userData.glow = glow;
  m.userData.glowColor = glowColor;
  m.userData.haze = { value: new THREE.Vector4(0.8, 0.85, 0.95, o.haze ?? 0) };
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = WORLD_TIME;
    s.uniforms.uGlow = glow;
    s.uniforms.uGlowColor = glowColor;
    s.uniforms.uPanel = { value: o.panel };
    s.uniforms.uGrime = { value: new THREE.Color(o.grime ?? '#3a3026') };
    s.uniforms.uGrimeH = { value: o.grimeHeight ?? 30 };
    s.uniforms.uMoss = { value: o.moss ?? 0.6 };
    s.uniforms.uHaze = m.userData.haze;
    s.uniforms.uMossColor = { value: new THREE.Color(o.mossColor ?? '#6f8a3e') };
    ghibli(s, {
      brushScale: o.panel * 0.6,
      vertDecl: 'varying vec3 vObjN; varying float vWorldY;',
      vertBody: 'vObjN = normal; vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;',
      fragDecl: `varying vec3 vObjN; varying float vWorldY;
        uniform float uTime, uGlow, uPanel, uGrimeH, uMoss; uniform vec3 uGlowColor, uGrime, uMossColor; uniform vec4 uHaze;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 panel2(vec2 p){
          vec2 q = p / uPanel;
          float row = floor(q.y);
          q.x += h21(vec2(row, 3.1)) * 0.7 + mod(row, 2.0) * 0.5;
          vec2 id = floor(q);
          vec2 f = fract(q);
          float h = h21(id);
          vec2 fw = fwidth(q) * 1.2;
          vec2 e2 = min(f, 1.0 - f) / max(fw, vec2(1e-4));
          float seam = 1.0 - smoothstep(0.6, 1.4, min(e2.x, e2.y));
          float inl = 0.0;
          if (h > 0.975) {
            vec2 g = abs(f - 0.5);
            float frame = abs(max(g.x, g.y) - 0.3) / max(fw.x, 1e-4);
            float bar = abs(g.x - 0.06 * step(0.95, h)) / max(fw.x, 1e-4);
            inl = (1.0 - smoothstep(0.5, 1.5, frame)) + (1.0 - smoothstep(0.5, 1.5, bar)) * step(g.y, 0.3);
          }
          return vec3(seam, h, inl);
        }`,
      color: `vec3 an = abs(normalize(vObjN));
        vec3 w = pow(an, vec3(4.0)); w /= (w.x + w.y + w.z);
        vec3 px = panel2(vTObj.zy), py = panel2(vTObj.xz + 17.0), pz = panel2(vTObj.xy + 31.0);
        vec3 pn = px * w.x + py * w.y + pz * w.z;
        diffuseColor.rgb *= 0.92 + pn.y * 0.16;
        float grime = 1.0 - smoothstep(0.0, uGrimeH, vWorldY);
        diffuseColor.rgb = mix(diffuseColor.rgb, uGrime, grime * 0.55);
        // moss and weathering on upward faces (ancient, overgrown machines)
        float mossN = tNoise(vTObj / uPanel * 0.35) * 0.65 + tNoise(vTObj / uPanel * 1.7) * 0.35;
        float moss = smoothstep(0.35, 0.85, normalize(vObjN).y) * smoothstep(0.48, 0.62, mossN) * uMoss;
        diffuseColor.rgb = mix(diffuseColor.rgb, uMossColor * (0.85 + tNoise(vTObj * 0.9) * 0.3), moss);
        diffuseColor.rgb *= 0.9 + 0.2 * tNoise(vTObj / uPanel * 0.15 + 9.0);
        float tSeam = pn.x * (1.0 - moss);
        float inlay = pn.z * (0.55 + 0.45 * sin(uTime * 1.1 - vWorldY * 0.04 + pn.y * 6.28));`,
      emissive: 'totalEmissiveRadiance += uGlowColor * inlay * uGlow * 2.2;\n        totalEmissiveRadiance += uHaze.rgb * uHaze.a; diffuseColor.rgb *= 1.0 - uHaze.a;',
      ink: 'tSeam * 0.55',
    });
  };
  m.customProgramCacheKey = () => `colossus-${o.panel}`;
  return m as THREE.MeshToonMaterial & { userData: { glow: { value: number }; glowColor: { value: THREE.Color } } };
}

/** Pure emissive glow (cores, slits, lanterns) — bloom picks these up. */
export function glowMaterial(color: THREE.ColorRepresentation, intensity = 3): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: true });
  m.userData.base = new THREE.Color(color);
  return m;
}
