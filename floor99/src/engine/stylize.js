// Stylized shading layer injected into every MeshStandard/Physical material:
//  - colored fresnel rim light (reads silhouettes against busy, dark sets)
//  - soft wrap on the diffuse term for chunkier, more "toy-like" forms
//  - a cool/warm hemispheric tint so form reads even in shadow
// Floors set STYLE.rim / STYLE.rimStrength to match their palette (lava orange, aquarium cyan...).
import * as THREE from 'three';

export const STYLE = {
  rim: { value: new THREE.Color('#ff7ab8') },
  rimStrength: { value: 0.6 },
  skyTint: { value: new THREE.Color('#6a7cff') },
  groundTint: { value: new THREE.Color('#ff8a3a') },
  tintStrength: { value: 0.05 },
};

export function setStyle({ rim, rimStrength, sky, ground, tint } = {}) {
  if (rim) STYLE.rim.value.set(rim);
  if (rimStrength !== undefined) STYLE.rimStrength.value = rimStrength;
  if (sky) STYLE.skyTint.value.set(sky);
  if (ground) STYLE.groundTint.value.set(ground);
  if (tint !== undefined) STYLE.tintStrength.value = tint;
}

let installed = false;
export function installStylizedShading() {
  if (installed) return;
  installed = true;
  const patch = function (shader) {
    shader.uniforms.uRim = STYLE.rim;
    shader.uniforms.uRimStrength = STYLE.rimStrength;
    shader.uniforms.uSkyTint = STYLE.skyTint;
    shader.uniforms.uGroundTint = STYLE.groundTint;
    shader.uniforms.uTintStrength = STYLE.tintStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStyleWorldNormal;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvStyleWorldNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimStrength; uniform vec3 uSkyTint; uniform vec3 uGroundTint; uniform float uTintStrength; varying vec3 vStyleWorldNormal;')
      .replace('#include <opaque_fragment>', `
        {
          vec3 vdir = normalize(vViewPosition);
          float ndv = clamp(dot(normal, vdir), 0.0, 1.0); // vViewPosition points toward the camera
          float rim = pow(1.0 - ndv, 3.0);
          // rim reads strongest on upward/sideways faces, like a backlight from the stage rig
          float up = clamp(vStyleWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
          // floors/ceilings seen at grazing angles must not light up: rim only on walls & silhouettes
          float side = 1.0 - smoothstep(0.55, 0.9, abs(vStyleWorldNormal.y));
          outgoingLight += uRim * rim * uRimStrength * side * (0.25 + 0.75 * max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)));
          // hemispheric bounce tint: cool from above, warm bounce from below
          vec3 hemi = mix(uGroundTint, uSkyTint, up);
          outgoingLight += hemi * diffuseColor.rgb * uTintStrength;
        }
        #include <opaque_fragment>`);
  };
  THREE.MeshStandardMaterial.prototype.onBeforeCompile = patch;
  THREE.MeshStandardMaterial.prototype.customProgramCacheKey = () => 'f99-stylized';
}
