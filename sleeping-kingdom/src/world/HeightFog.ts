import * as THREE from 'three';

/**
 * Height fog for every built-in material: mist pools in valleys and thins on the heights, and
 * glows toward the moon. It is driven by a plain THREE.Fog whose fields are repurposed:
 * `near` = density, `far` = the height the mist settles at. three.js refreshes those two
 * uniforms every frame for every fogged material, so no per-material plumbing is needed.
 */
export function installHeightFog(): void {
  THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif`;
  THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
#endif`;
  THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
  #else
    vec3 fRd = vFogWorld - cameraPosition;
    float fDist = length( fRd );
    float fK = 0.028;
    float fH0 = cameraPosition.y - fogFar;
    float fDy = fRd.y;
    float fT = abs( fDy * fK ) > 1e-4 ? ( 1.0 - exp( - fK * fDy ) ) / ( fK * fDy ) : 1.0;
    float fInt = fogNear * fDist * exp( - fK * fH0 ) * fT * 2.6 + fogNear * fogNear * fDist * fDist * 0.25;
    float fogFactor = 1.0 - exp( - max( fInt, 0.0 ) );
    vec3 fDir = fRd / max( fDist, 1e-3 );
    float fSc = pow( max( dot( fDir, normalize( vec3( -0.35, 0.42, -0.84 ) ) ), 0.0 ), 5.0 );
    vec3 fCol = fogColor * ( 1.0 + fSc * 0.9 ) + vec3( 0.12, 0.13, 0.18 ) * fSc;
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fCol, fogFactor );
  #endif
#endif`;
}
