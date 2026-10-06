import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  GodRaysEffect,
  KernelSize,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/**
 * Night grade, applied in linear HDR before tone mapping: split-tone (cool shadows, warm
 * highlights), saturation, vignette, hurt pulse at the edges, lightning flash and fade.
 */
class GradeEffect extends Effect {
  constructor() {
    super(
      'Grade',
      /* glsl */ `
      uniform float uVignette, uHurt, uFlash, uFade, uSaturation, uTime, uGrain, uExposure;
      uniform vec3 uShadowTint, uHighTint;
      float g_rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb * uExposure;
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(lum), c, uSaturation);
        float hl = smoothstep(0.03, 0.9, lum);
        c *= mix(uShadowTint, uHighTint, hl);
        float d = length(uv - 0.5);
        c *= mix(1.0, smoothstep(0.88, 0.22, d), uVignette);
        float hurtMask = smoothstep(0.25, 0.75, d) * uHurt;
        c = mix(c, vec3(0.6, 0.03, 0.02) * (0.6 + lum), hurtMask);
        c += vec3(1.0, 0.95, 0.85) * uFlash;
        c += (g_rand(uv * vec2(1931.0, 1087.0) + fract(uTime * 7.13)) - 0.5) * uGrain * (0.25 + lum);
        c *= 1.0 - uFade;
        outputColor = vec4(max(c, 0.0), inputColor.a);
      }`,
      {
        uniforms: new Map<string, THREE.Uniform>([
          ['uTime', new THREE.Uniform(0)],
          ['uExposure', new THREE.Uniform(1.3)],
          ['uVignette', new THREE.Uniform(0.72)],
          ['uGrain', new THREE.Uniform(0.03)],
          ['uHurt', new THREE.Uniform(0)],
          ['uFlash', new THREE.Uniform(0)],
          ['uFade', new THREE.Uniform(0)],
          ['uSaturation', new THREE.Uniform(1.06)],
          ['uShadowTint', new THREE.Uniform(new THREE.Color(0.82, 0.9, 1.18))],
          ['uHighTint', new THREE.Uniform(new THREE.Color(1.1, 1.0, 0.88))],
        ]),
      },
    );
  }
}

/**
 * A whisper of the PS2 era after tone mapping: ordered dithering into a 6-bit palette. Done in
 * sRGB space so the shadows band evenly.
 */
class DitherEffect extends Effect {
  constructor() {
    super(
      'Dither',
      /* glsl */ `
      float d_b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float d_b4(vec2 a){ return d_b2(0.5 * a) * 0.25 + d_b2(a); }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 s = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));
        s = floor(s * 64.0 + d_b4(gl_FragCoord.xy) - 0.5 + 0.5) / 64.0;
        outputColor = vec4(pow(clamp(s, 0.0, 1.0), vec3(2.2)), inputColor.a);
      }`,
    );
  }
}

/** Fraction of native resolution the 3D frame is rendered at. */
export const RENDER_SCALE = 1;

type U = { value: number };
export type RenderPipeline = {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  grade: { uniforms: { uTime: U; uHurt: U; uFlash: U; uChroma: U; uSaturation: U } };
  dof: DepthOfFieldEffect;
  dofPass: EffectPass;
  ao: N8AOPostPass;
  godRays: GodRaysEffect;
  /** The moon disc the god rays radiate from. */
  sun: THREE.Mesh;
  resize: (camera: THREE.PerspectiveCamera, maxDpr: number) => void;
  render: () => void;
};

export function createPipeline(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera): RenderPipeline {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, depth: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping happens in the post stack (AgX); the renderer outputs linear HDR.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;

  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  // Ground-contact shadows and crevice darkness: makes the stone, roots and armour sit in the world.
  const ao = new N8AOPostPass(scene, camera, 1, 1);
  ao.configuration.aoRadius = 2.2;
  ao.configuration.distanceFalloff = 1.2;
  ao.configuration.intensity = 3.2;
  ao.configuration.halfRes = true;
  ao.configuration.gammaCorrection = false;
  ao.setQualityMode('Medium');
  composer.addPass(ao);

  // Cinematic depth of field: only switched on in cutscenes.
  const dof = new DepthOfFieldEffect(camera, { focusDistance: 4, focusRange: 3, bokehScale: 3.2, resolutionScale: 0.5 });
  const dofPass = new EffectPass(camera, dof);
  dofPass.enabled = false;
  composer.addPass(dofPass);

  // Moon shafts through cloud, trees and spires.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(60, 24),
    new THREE.MeshBasicMaterial({ color: '#dfe6ff', transparent: true, fog: false, depthWrite: false }),
  );
  sun.frustumCulled = false;
  sun.renderOrder = -5;
  const godRays = new GodRaysEffect(camera, sun, {
    density: 0.9,
    decay: 0.93,
    weight: 0.42,
    exposure: 0.52,
    samples: 48,
    clampMax: 1,
    kernelSize: KernelSize.SMALL,
    blur: true,
    resolutionScale: 0.5,
  });
  const bloom = new BloomEffect({ mipmapBlur: true, intensity: 1.05, luminanceThreshold: 0.72, luminanceSmoothing: 0.25, radius: 0.72 });
  composer.addPass(new EffectPass(camera, godRays, bloom));

  const grade = new GradeEffect();
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  (tone as unknown as { exposure?: number }).exposure = 1;
  const dither = new DitherEffect();
  dither.blendMode.blendFunction = BlendFunction.NORMAL;
  composer.addPass(new EffectPass(camera, grade, tone));
  composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: SMAAPreset.HIGH }), dither));

  const gu = grade.uniforms as Map<string, THREE.Uniform>;
  const uniforms = {
    uTime: gu.get('uTime') as U,
    uHurt: gu.get('uHurt') as U,
    uFlash: gu.get('uFlash') as U,
    uSaturation: gu.get('uSaturation') as U,
    // Chromatic split was folded into the hurt pulse; kept as a sink so callers stay simple.
    uChroma: { value: 0 },
  };

  let lastW = 0;
  let lastH = 0;
  let lastDpr = 0;
  const resize = (cam: THREE.PerspectiveCamera, maxDpr: number) => {
    const w = Math.max(1, Math.floor(canvas.clientWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight));
    const mobile = Math.min(w, h) < 600;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? Math.min(maxDpr, 1.25) : Math.min(maxDpr, 1.5)) * RENDER_SCALE;
    if (w === lastW && h === lastH && dpr === lastDpr) return;
    lastW = w;
    lastH = h;
    lastDpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.userData.aspectFovBoost = w / h < 1 ? 14 : 0;
    cam.updateProjectionMatrix();
  };

  return {
    renderer,
    composer,
    grade: { uniforms },
    dof,
    dofPass,
    ao,
    godRays,
    sun,
    resize,
    render: () => {
      renderer.info.reset();
      composer.render();
    },
  };
}
