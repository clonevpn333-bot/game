import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  Effect,
  EffectAttribute,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';

const DREAM_FRAG = /* glsl */ `
uniform float time;
uniform float warp;
uniform float edgeBlur;
uniform float desat;
uniform float glitch;
uniform float aberration;
uniform float lift;
uniform float flash;
uniform vec3 flashColor;
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float contrast;

float gh(float n){ return fract(sin(n * 91.3458) * 47453.5453); }

vec2 dreamUv(vec2 uv) {
  uv += vec2(sin(uv.y * 5.0 + time * 0.55), cos(uv.x * 4.0 + time * 0.45)) * warp * 0.0045;
  if (glitch > 0.0) {
    float band = floor(uv.y * 38.0 + floor(time * 14.0) * 3.0);
    float g = step(1.0 - glitch * 0.18, gh(band + floor(time * 9.0)));
    uv.x += (gh(band * 1.7) - 0.5) * 0.06 * g * glitch;
  }
  return uv;
}

void mainImage(const in vec4 inputColor, const in vec2 uv0, out vec4 outputColor) {
  vec2 uv = dreamUv(uv0);
  vec3 c = (warp > 0.0 || glitch > 0.0) ? texture2D(inputBuffer, uv).rgb : inputColor.rgb;
  vec2 dc = uv - 0.5;
  float d = length(dc);
  float b = smoothstep(0.22, 0.78, d) * edgeBlur;
  if (b > 0.002) {
    vec3 acc = c;
    float r = b * 9.0;
    acc += texture2D(inputBuffer, uv + texelSize * vec2( r, 0.0)).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2(-r, 0.0)).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2(0.0,  r)).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2(0.0, -r)).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2( r,  r) * 0.7).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2(-r,  r) * 0.7).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2( r, -r) * 0.7).rgb;
    acc += texture2D(inputBuffer, uv + texelSize * vec2(-r, -r) * 0.7).rgb;
    c = acc / 9.0;
  }
  float ab = aberration * (0.4 + d * 1.6);
  if (ab > 0.0001) {
    c.r = mix(c.r, texture2D(inputBuffer, uv + dc * ab * 0.03).r, 0.85);
    c.b = mix(c.b, texture2D(inputBuffer, uv - dc * ab * 0.03).b, 0.85);
  }
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(l), desat);
  vec3 tone = mix(shadowTint, highlightTint, smoothstep(0.05, 0.85, l));
  c *= tone;
  c = (c - 0.5) * contrast + 0.5;
  // dreamy lift: raise blacks toward a soft tint
  c = c + (vec3(1.0) - c) * lift * 0.25 * shadowTint;
  c = mix(c, flashColor, flash);
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}
`;

export class DreamEffect extends Effect {
  constructor() {
    super('DreamEffect', DREAM_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['time', new THREE.Uniform(0)],
        ['warp', new THREE.Uniform(0.4)],
        ['edgeBlur', new THREE.Uniform(0.6)],
        ['desat', new THREE.Uniform(0)],
        ['glitch', new THREE.Uniform(0)],
        ['aberration', new THREE.Uniform(0)],
        ['lift', new THREE.Uniform(0.3)],
        ['flash', new THREE.Uniform(0)],
        ['flashColor', new THREE.Uniform(new THREE.Color(1, 1, 1))],
        ['shadowTint', new THREE.Uniform(new THREE.Color(0.95, 0.9, 1.05))],
        ['highlightTint', new THREE.Uniform(new THREE.Color(1.04, 1.0, 0.96))],
        ['contrast', new THREE.Uniform(1)],
      ]),
    });
  }
  u(name: string): THREE.Uniform {
    return this.uniforms.get(name)!;
  }
}

export interface PostParams {
  bloom: number;
  bloomThreshold: number;
  warp: number;
  edgeBlur: number;
  desat: number;
  grain: number;
  vignette: number;
  lift: number;
  shadowTint: THREE.ColorRepresentation;
  highlightTint: THREE.ColorRepresentation;
  contrast: number;
  exposure: number;
  glitch: number;
}

export const DEFAULT_POST: PostParams = {
  bloom: 0.9,
  bloomThreshold: 0.72,
  warp: 0.5,
  edgeBlur: 0.65,
  desat: 0,
  grain: 0.08,
  vignette: 0.35,
  lift: 0.35,
  shadowTint: '#f2e6ff',
  highlightTint: '#fff6ea',
  contrast: 1.0,
  exposure: 1.0,
  glitch: 0,
};

export class PostPipeline {
  readonly composer: EffectComposer;
  readonly bloom: BloomEffect;
  readonly dream: DreamEffect;
  readonly vignette: VignetteEffect;
  readonly noise: NoiseEffect;
  readonly toneMapping: ToneMappingEffect;
  private readonly renderPass: RenderPass;
  /** Transient event values layered on top of the chapter preset. */
  aberrationPulse = 0;
  flash = 0;
  glitchPulse = 0;
  private base: PostParams = { ...DEFAULT_POST };

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, mobile: boolean) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: mobile ? 0 : Math.min(4, renderer.capabilities.maxSamples),
    });
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new BloomEffect({
      mipmapBlur: true,
      intensity: 0.9,
      luminanceThreshold: 0.72,
      luminanceSmoothing: 0.25,
      radius: 0.78,
    });
    this.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.composer.addPass(new EffectPass(camera, this.bloom, this.toneMapping));
    this.dream = new DreamEffect();
    this.vignette = new VignetteEffect({ darkness: 0.35, offset: 0.32 });
    this.noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: false });
    this.noise.blendMode.opacity.value = 0.08;
    this.composer.addPass(new EffectPass(camera, this.dream, this.vignette, this.noise));
  }

  setCamera(camera: THREE.Camera): void {
    this.renderPass.mainCamera = camera;
  }

  apply(p: PostParams): void {
    this.base = { ...p };
    this.bloom.intensity = p.bloom;
    this.bloom.luminanceMaterial.threshold = p.bloomThreshold;
    this.dream.u('warp').value = p.warp;
    this.dream.u('edgeBlur').value = p.edgeBlur;
    this.dream.u('desat').value = p.desat;
    this.dream.u('lift').value = p.lift;
    (this.dream.u('shadowTint').value as THREE.Color).set(p.shadowTint);
    (this.dream.u('highlightTint').value as THREE.Color).set(p.highlightTint);
    this.dream.u('contrast').value = p.contrast;
    this.vignette.darkness = p.vignette;
    this.noise.blendMode.opacity.value = p.grain;
  }

  get params(): PostParams {
    return this.base;
  }

  update(dt: number, time: number, reducedMotion: boolean): void {
    this.aberrationPulse = Math.max(0, this.aberrationPulse - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.glitchPulse = Math.max(0, this.glitchPulse - dt * 1.2);
    this.dream.u('time').value = time;
    this.dream.u('aberration').value = reducedMotion ? 0 : this.aberrationPulse;
    this.dream.u('flash').value = this.flash;
    this.dream.u('glitch').value = reducedMotion ? 0 : Math.min(1, this.base.glitch + this.glitchPulse);
    this.dream.u('warp').value = reducedMotion ? 0 : this.base.warp;
  }

  setFlashColor(c: THREE.ColorRepresentation): void {
    (this.dream.u('flashColor').value as THREE.Color).set(c);
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h, false);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
