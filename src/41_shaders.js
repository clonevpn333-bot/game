/* =========================================================================
 * SHADERS (GLSL ES 3.00)
 * ========================================================================= */

var SH = {};

SH.common = `
precision highp float;
precision highp int;
const float PI = 3.14159265;

vec3 hash33(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453123);
}
float hash12(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash12(i), b = hash12(i+vec2(1,0)), c = hash12(i+vec2(0,1)), d = hash12(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm2(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ s += vnoise(p)*a; p *= 2.03; a *= 0.5; }
  return s;
}
`;

/* ---- sky, shared by the sky pass and by fog ---------------------------- */
SH.sky = `
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunCol;
uniform float uDay;        // 0 night .. 1 day
uniform float uRain;
uniform float uTime;
uniform float uMoonPhase;
uniform vec3 uFogTint;
uniform int uDimension;

vec3 skyGradient(vec3 dir){
  float h = clamp(dir.y*0.5+0.5, 0.0, 1.0);
  float t = pow(clamp(dir.y,0.0,1.0), 0.55);
  vec3 col = mix(uHorizon, uZenith, t);
  // warm glow banked around the sun near the horizon
  float sunDot = max(dot(normalize(dir), uSunDir), 0.0);
  float horizonGlow = pow(1.0 - abs(dir.y), 5.0) * pow(sunDot*0.5+0.5, 6.0);
  col += uSunCol * horizonGlow * 0.85 * (1.0 - uRain*0.7);
  col += uSunCol * pow(sunDot, 22.0) * 0.35;
  if (dir.y < 0.0) col = mix(col, uHorizon*0.55, clamp(-dir.y*2.4,0.0,1.0));
  return col;
}
`;

/* ============================== TERRAIN ================================= */
SH.chunkVS = `#version 300 es
` + SH.common + `
layout(location=0) in uvec3 aPos;
layout(location=1) in uvec2 aUV;
layout(location=2) in uint  aLayer;
layout(location=3) in uvec2 aLightAO;
layout(location=4) in uvec2 aShadeFlags;

uniform mat4 uVP;
uniform vec3 uChunkOrigin;
uniform vec3 uCamPos;
uniform float uTime;
uniform float uWind;
uniform sampler2D uTintTex;
uniform vec3 uWaterTint;

out vec2 vUV;
out float vLayer;
out vec3 vWorld;
out vec3 vNormal;
out vec4 vLight;
out vec3 vTint;
out float vWave;

const vec3 NORMALS[6] = vec3[6](
  vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1));

void main(){
  vec3 p = vec3(aPos) * (1.0/16.0) + uChunkOrigin;
  uint flags = aShadeFlags.y;
  uint wave  = (flags >> 5u) & 3u;
  uint tintId= (flags >> 3u) & 3u;

  vUV = vec2(aUV) * (1.0/16.0);
  vLayer = float(aLayer);

  float waveAmt = 0.0;
  if (wave == 1u) {
    // plants sway from the ground up: v==0 is the top of the sprite
    waveAmt = clamp(1.0 - vUV.y, 0.0, 1.0);
  } else if (wave == 2u) {
    waveAmt = 0.55;
  }
  if (waveAmt > 0.0) {
    float t = uTime * 1.7;
    float ph = p.x * 0.42 + p.z * 0.31 + p.y * 0.17;
    float sway = sin(t + ph) * 0.5 + sin(t*1.63 + ph*2.11) * 0.28 + sin(t*0.41 + ph*0.7)*0.22;
    float amp = waveAmt * (0.055 + uWind * 0.10);
    p.x += sway * amp;
    p.z += cos(t*0.83 + ph*1.31) * amp * 0.75;
    p.y -= abs(sway) * amp * 0.30;
  }
  vWave = waveAmt;

  int lx = clamp(int(aPos.x) >> 4, 0, 15);
  int lz = clamp(int(aPos.z) >> 4, 0, 15);
  vec3 tint = vec3(1.0);
  if (tintId == 1u)      tint = texelFetch(uTintTex, ivec2(lx, lz), 0).rgb;
  else if (tintId == 2u) tint = texelFetch(uTintTex, ivec2(lx+16, lz), 0).rgb;
  else if (tintId == 3u) tint = uWaterTint;
  vTint = tint;

  vNormal = NORMALS[int(flags & 7u)];
  vWorld = p;
  float sky = float((aLightAO.x >> 4u) & 15u) / 15.0;
  float blk = float(aLightAO.x & 15u) / 15.0;
  vLight = vec4(sky, blk, float(aLightAO.y)/255.0, float(aShadeFlags.x)/255.0);
  gl_Position = uVP * vec4(p, 1.0);
}`;

SH.chunkFS = `#version 300 es
` + SH.common + SH.sky + `
in vec2 vUV;
in float vLayer;
in vec3 vWorld;
in vec3 vNormal;
in vec4 vLight;
in vec3 vTint;
in float vWave;

uniform mediump sampler2DArray uAtlas;
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec3 uCamPos;
uniform vec3 uSkyLightCol;
uniform vec3 uBlockLightCol;
uniform float uAmbient;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uAlphaTest;
uniform int uUnderwater;
uniform vec3 uUnderwaterCol;
uniform float uShadowTexel;
uniform int uShadowOn;

layout(location=0) out vec4 oColor;

float shadowFactor(vec3 world, float ndl){
  if (uShadowOn == 0) return 1.0;
  vec4 sp = uShadowMat * vec4(world + vNormal * 0.06, 1.0);
  vec3 pc = sp.xyz / sp.w * 0.5 + 0.5;
  if (pc.x < 0.002 || pc.x > 0.998 || pc.y < 0.002 || pc.y > 0.998 || pc.z > 1.0) return 1.0;
  float bias = max(0.0016 * (1.0 - ndl), 0.00045);
  float s = 0.0;
  for (int y=-1;y<=1;y++)
    for (int x=-1;x<=1;x++)
      s += texture(uShadowMap, vec3(pc.xy + vec2(float(x),float(y))*uShadowTexel, pc.z - bias));
  return s / 9.0;
}

void main(){
  vec4 texel = texture(uAtlas, vec3(vUV, vLayer));
  if (uAlphaTest > 0.5 && texel.a < 0.5) discard;
  vec3 albedo = texel.rgb * vTint;

  vec3 N = normalize(vNormal);
  float ndl = max(dot(N, uSunDir), 0.0);
  float sky = vLight.x, blk = vLight.y, ao = vLight.z, shade = vLight.w;

  float sunVis = sky * sky;
  float sh = ndl > 0.0 ? shadowFactor(vWorld, ndl) : 1.0;
  vec3 sunTerm = uSunCol * (ndl * sh * sunVis * uDay);
  vec3 skyTerm = uSkyLightCol * (uAmbient + 0.85 * sky * sky) * shade;
  vec3 blockTerm = uBlockLightCol * pow(blk, 1.55) * 1.25;

  vec3 light = (skyTerm + sunTerm * 1.15 + blockTerm) * ao;
  vec3 col = albedo * light;

  // distance fog, tinted toward the sky the camera is looking at
  float d = length(vWorld - uCamPos);
  vec3 dir = normalize(vWorld - uCamPos);
  float f = clamp((d - uFogStart) / max(uFogEnd - uFogStart, 1.0), 0.0, 1.0);
  f = f*f;
  vec3 fogCol = mix(skyGradient(dir), uFogTint, 0.55);
  if (uUnderwater == 1) {
    float wf = clamp(d / 26.0, 0.0, 1.0);
    col = mix(col, uUnderwaterCol * (0.25 + 0.75*sky), wf*wf);
    f = min(f, 0.55);
    fogCol = uUnderwaterCol;
  }
  col = mix(col, fogCol, f);
  oColor = vec4(col, texel.a);
}`;

/* --------------------------------------------------------- water pass -- */
SH.waterFS = `#version 300 es
` + SH.common + SH.sky + `
in vec2 vUV;
in float vLayer;
in vec3 vWorld;
in vec3 vNormal;
in vec4 vLight;
in vec3 vTint;
in float vWave;

uniform mediump sampler2DArray uAtlas;
uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec3 uCamPos;
uniform vec3 uSkyLightCol;
uniform vec3 uBlockLightCol;
uniform float uAmbient;
uniform float uFogStart;
uniform float uFogEnd;
uniform vec2 uScreen;
uniform int uUnderwater;
uniform vec3 uUnderwaterCol;
uniform float uNear;
uniform float uFar;
uniform int uIsLava;
uniform float uShadowTexel;
uniform int uShadowOn;

layout(location=0) out vec4 oColor;

float linDepth(float d){
  float z = d*2.0-1.0;
  return (2.0*uNear*uFar)/(uFar+uNear-z*(uFar-uNear));
}
vec3 waterNormal(vec2 p, float t){
  // three drifting wave trains give a surface that never repeats visibly
  float e = 0.35;
  vec2 q = p*0.55;
  float h  = sin(q.x*1.7 + t*1.3)*0.5 + sin(q.y*1.3 - t*1.1)*0.5
           + sin((q.x+q.y)*0.9 + t*0.7)*0.35 + fbm2(q*0.6 + t*0.05)*0.6;
  float hx = sin((q.x+e)*1.7 + t*1.3)*0.5 + sin(q.y*1.3 - t*1.1)*0.5
           + sin((q.x+e+q.y)*0.9 + t*0.7)*0.35 + fbm2((q+vec2(e,0.0))*0.6 + t*0.05)*0.6;
  float hz = sin(q.x*1.7 + t*1.3)*0.5 + sin((q.y+e)*1.3 - t*1.1)*0.5
           + sin((q.x+q.y+e)*0.9 + t*0.7)*0.35 + fbm2((q+vec2(0.0,e))*0.6 + t*0.05)*0.6;
  vec3 n = normalize(vec3(-(hx-h)*0.55, 1.0, -(hz-h)*0.55));
  return n;
}
void main(){
  vec4 texel = texture(uAtlas, vec3(vUV, vLayer));
  vec3 N = normalize(vNormal);
  bool top = N.y > 0.5;
  vec3 V = normalize(uCamPos - vWorld);
  float t = uTime;

  if (uIsLava == 1) {
    vec3 lc = texel.rgb;
    float glow = 0.7 + 0.5*fbm2(vWorld.xz*0.6 + vec2(t*0.15, -t*0.11));
    oColor = vec4(lc * glow * 1.6, 1.0);
    return;
  }

  vec3 wn = top ? waterNormal(vWorld.xz, t) : N;
  float sky = vLight.x, blk = vLight.y;

  // refraction: offset the already-rendered opaque scene behind us
  vec2 uvS = gl_FragCoord.xy / uScreen;
  float sceneD = linDepth(texture(uSceneDepth, uvS).r);
  float fragD  = linDepth(gl_FragCoord.z);
  float thickness = clamp(sceneD - fragD, 0.0, 12.0);
  vec2 offs = wn.xz * 0.045 * clamp(thickness, 0.0, 3.0);
  vec2 uvR = clamp(uvS + offs, vec2(0.001), vec2(0.999));
  float sceneD2 = linDepth(texture(uSceneDepth, uvR).r);
  if (sceneD2 < fragD) uvR = uvS;
  vec3 behind = texture(uSceneColor, uvR).rgb;

  // absorption through the water column
  vec3 waterCol = vTint;
  float absorb = 1.0 - exp(-thickness * 0.30);
  vec3 refr = mix(behind, waterCol * (0.30 + 0.70*sky), absorb);

  // reflection: sky plus a sun specular
  vec3 R = reflect(-V, wn);
  vec3 refl = skyGradient(normalize(R));
  float spec = pow(max(dot(R, uSunDir), 0.0), 190.0);
  refl += uSunCol * spec * 2.6 * uDay;

  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(V, wn), 0.0), 5.0);
  if (uUnderwater == 1) fres *= 0.25;
  vec3 col = mix(refr, refl, clamp(fres,0.0,1.0));
  col += uBlockLightCol * pow(blk,1.6) * 0.35;

  float d = length(vWorld - uCamPos);
  vec3 dir = normalize(vWorld - uCamPos);
  float f = clamp((d - uFogStart) / max(uFogEnd - uFogStart, 1.0), 0.0, 1.0);
  f = f*f;
  vec3 fogCol = mix(skyGradient(dir), uFogTint, 0.55);
  if (uUnderwater == 1) { fogCol = uUnderwaterCol; f = min(f, 0.6); }
  col = mix(col, fogCol, f);

  float alpha = uUnderwater == 1 ? 0.55 : clamp(0.62 + fres*0.38, 0.0, 1.0);
  oColor = vec4(col, alpha);
}`;

/* ------------------------------------------------------- shadow depth -- */
SH.shadowVS = `#version 300 es
precision highp float;
layout(location=0) in uvec3 aPos;
layout(location=1) in uvec2 aUV;
layout(location=2) in uint  aLayer;
layout(location=3) in uvec2 aLightAO;
layout(location=4) in uvec2 aShadeFlags;
uniform mat4 uVP;
uniform vec3 uChunkOrigin;
out vec2 vUV;
out float vLayer;
void main(){
  vec3 p = vec3(aPos) * (1.0/16.0) + uChunkOrigin;
  vUV = vec2(aUV) * (1.0/16.0);
  vLayer = float(aLayer);
  gl_Position = uVP * vec4(p,1.0);
}`;
SH.shadowFS = `#version 300 es
precision mediump float;
in vec2 vUV; in float vLayer;
uniform mediump sampler2DArray uAtlas;
uniform float uAlphaTest;
void main(){
  if (uAlphaTest > 0.5) { if (texture(uAtlas, vec3(vUV, vLayer)).a < 0.5) discard; }
}`;

/* ================================ SKY =================================== */
SH.skyVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uInvVP;
uniform vec3 uCamPos;
out vec3 vDir;
void main(){
  vec4 far = uInvVP * vec4(aPos, 1.0, 1.0);
  vec4 near = uInvVP * vec4(aPos, -1.0, 1.0);
  vDir = normalize(far.xyz/far.w - near.xyz/near.w);
  gl_Position = vec4(aPos, 1.0, 1.0);
}`;
SH.skyFS = `#version 300 es
` + SH.common + SH.sky + `
in vec3 vDir;
uniform vec3 uCamPos;
uniform float uCloudY;
uniform int uUnderwater;
uniform vec3 uUnderwaterCol;
layout(location=0) out vec4 oColor;

float starField(vec3 dir){
  vec3 p = dir * 90.0;
  vec3 c = floor(p);
  float best = 0.0;
  for (int i=0;i<2;i++){
    vec3 h = hash33(c + float(i)*13.7);
    if (h.z > 0.965) {
      vec3 sp = c + h;
      float d = length(p - sp);
      best = max(best, smoothstep(0.55, 0.0, d) * (0.35 + h.x*0.65));
    }
  }
  return best;
}

void main(){
  vec3 dir = normalize(vDir);
  vec3 col = skyGradient(dir);

  if (uDimension == 0) {
    // stars, fading in as the sun goes down
    float night = clamp(1.0 - uDay*1.6, 0.0, 1.0);
    if (night > 0.01 && dir.y > -0.06) {
      float s = starField(dir);
      col += vec3(0.85,0.88,1.0) * s * night * (1.0-uRain) * 1.25;
    }
    // sun disc with a soft limb
    float sd = dot(dir, uSunDir);
    float sun = smoothstep(0.99930, 0.99975, sd);
    col += uSunCol * sun * 9.0;
    col += uSunCol * pow(max(sd,0.0), 400.0) * 1.2;

    // moon with phase carved out of the disc
    float md = dot(dir, uMoonDir);
    if (md > 0.9985) {
      vec3 mx = normalize(cross(uMoonDir, vec3(0.0,1.0,0.0)));
      vec3 my = cross(mx, uMoonDir);
      vec2 lp = vec2(dot(dir,mx), dot(dir,my)) / 0.055;
      float r = length(lp);
      if (r < 1.0) {
        float phase = uMoonPhase;
        float term = cos(phase * 2.0 * PI);
        float lit = 1.0;
        float edge = lp.x;
        if (phase < 0.5) lit = (edge > term) ? 1.0 : 0.0;
        else lit = (edge < -term) ? 1.0 : 0.0;
        float tex = 0.82 + 0.18*vnoise(lp*4.0);
        col = mix(col, vec3(0.92,0.92,0.86)*tex, lit * smoothstep(1.0,0.85,r));
      }
    }

    // a flat cloud deck, the way the game does it
    if (dir.y > 0.015) {
      float t = (uCloudY - uCamPos.y) / dir.y;
      if (t > 0.0 && t < 6000.0) {
        vec2 cp = (uCamPos.xz + dir.xz * t) * 0.0055;
        cp += vec2(uTime*0.006, uTime*0.0025);
        float n = fbm2(cp);
        float cover = mix(0.56, 0.30, uRain);
        float c = smoothstep(cover, cover+0.16, n);
        float fade = clamp(1.0 - t/3400.0, 0.0, 1.0);
        vec3 cloudCol = mix(vec3(0.42,0.46,0.55), vec3(1.02,1.0,0.98), uDay);
        cloudCol = mix(cloudCol, cloudCol*0.62, uRain);
        cloudCol += uSunCol * pow(max(dot(dir,uSunDir),0.0), 8.0) * 0.35 * uDay;
        col = mix(col, cloudCol, c * 0.72 * fade);
      }
    }
  } else if (uDimension == 2) {
    float s = starField(dir);
    col += vec3(0.7,0.6,0.95) * s * 0.7;
  }

  if (uUnderwater == 1) col = uUnderwaterCol;
  oColor = vec4(col, 1.0);
}`;
