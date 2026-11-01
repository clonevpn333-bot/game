// GETAWAY! — renderer + post processing (bloom, color grade, vignette, speed/impact FX)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.35 }, damage: { value: 0 }, speed: { value: 0 }, flash: { value: 0 }, saturation: { value: 1.08 }, time: { value: 0 }, slowmo: { value: 0 }, underwater: { value: 0 }, letterbox: { value: 0 }, aspect: { value: 1.7 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette, damage, speed, flash, saturation, time, slowmo, underwater, letterbox, aspect; varying vec2 vUv;
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      // radial speed blur
      vec3 col = vec3(0.0); float sp = speed * 0.022; int N = 6;
      if (sp > 0.001) { for (int i=0;i<6;i++){ float t = float(i)/5.0; col += texture2D(tDiffuse, uv - c * sp * t).rgb; } col /= 6.0; } else col = texture2D(tDiffuse, uv).rgb;
      // chromatic aberration on impacts/slowmo
      float ca = (damage*0.004 + slowmo*0.003); if (ca > 0.0) { col.r = texture2D(tDiffuse, uv + c*ca).r; col.b = texture2D(tDiffuse, uv - c*ca).b; }
      float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, saturation - slowmo*0.35);
      col = mix(col, col*vec3(1.05,0.98,0.92), slowmo*0.5);
      if (underwater > 0.0) col = mix(col, vec3(0.05,0.25,0.3)*l*2.0 + col*0.3, underwater*0.8);
      float v = smoothstep(0.85, 0.2, length(c*vec2(1.0,0.85)));
      col *= mix(1.0, v, vignette + damage*0.5);
      col = mix(col, vec3(0.6,0.0,0.0), damage*0.35*(1.0-v));
      col += flash;
      float lb = letterbox * 0.12; if (uv.y < lb || uv.y > 1.0 - lb) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createRenderer(container, settings) {
  const renderer = new THREE.WebGLRenderer({ antialias: settings.quality !== 'low', powerPreference: 'high-performance', stencil: false });
  const pr = settings.quality === 'ultra' ? Math.min(2, devicePixelRatio) : settings.quality === 'high' ? Math.min(1.5, devicePixelRatio) : settings.quality === 'medium' ? 1 : 0.75;
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = settings.shadows && settings.quality !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createComposer(renderer, scene, camera, settings) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.45, 0.6, 0.86);
  bloom.enabled = settings.bloom && settings.quality !== 'low';
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.addPass(new OutputPass());
  composer.bloom = bloom; composer.grade = grade;
  return composer;
}
