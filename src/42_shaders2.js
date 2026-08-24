/* ==================== ENTITY / VIEWMODEL / POST SHADERS ================= */

SH.entityVS = `#version 300 es
` + SH.common + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in float aLayer;
layout(location=4) in vec4 aColor;      // rgb tint, a = overlay strength
layout(location=5) in vec2 aLight;      // sky, block

uniform mat4 uVP;
out vec3 vWorld; out vec3 vNormal; out vec2 vUV; out float vLayer;
out vec4 vColor; out vec2 vLight;
void main(){
  vWorld = aPos; vNormal = aNormal; vUV = aUV; vLayer = aLayer;
  vColor = aColor; vLight = aLight;
  gl_Position = uVP * vec4(aPos,1.0);
}`;

SH.entityFS = `#version 300 es
` + SH.common + SH.sky + `
in vec3 vWorld; in vec3 vNormal; in vec2 vUV; in float vLayer;
in vec4 vColor; in vec2 vLight;
uniform mediump sampler2DArray uAtlas;
uniform highp sampler2DShadow uShadowMap;
uniform mat4 uShadowMat;
uniform vec3 uCamPos;
uniform vec3 uSkyLightCol;
uniform vec3 uBlockLightCol;
uniform float uAmbient;
uniform float uFogStart;
uniform float uFogEnd;
uniform int uUnderwater;
uniform vec3 uUnderwaterCol;
uniform float uShadowTexel;
uniform int uShadowOn;
uniform vec4 uOverlayCol;
layout(location=0) out vec4 oColor;

float shadowFactorE(vec3 world, vec3 N, float ndl){
  if (uShadowOn == 0) return 1.0;
  vec4 sp = uShadowMat * vec4(world + N*0.05, 1.0);
  vec3 pc = sp.xyz/sp.w*0.5+0.5;
  if (pc.x<0.002||pc.x>0.998||pc.y<0.002||pc.y>0.998||pc.z>1.0) return 1.0;
  float bias = max(0.0018*(1.0-ndl), 0.0006);
  float s=0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++)
    s += texture(uShadowMap, vec3(pc.xy+vec2(float(x),float(y))*uShadowTexel, pc.z-bias));
  return s/9.0;
}
void main(){
  vec4 texel = texture(uAtlas, vec3(vUV, vLayer));
  if (texel.a < 0.35) discard;
  vec3 albedo = texel.rgb * vColor.rgb;
  vec3 N = normalize(vNormal);
  float ndl = max(dot(N, uSunDir), 0.0);
  float sky = vLight.x, blk = vLight.y;
  float sh = shadowFactorE(vWorld, N, ndl);
  vec3 light = uSkyLightCol*(uAmbient + 0.52*sky*sky)
             + uSunCol*(ndl*sh*sky*sky*uDay)*0.85
             + uBlockLightCol*pow(blk,1.55)*1.05;
  // Face shading matched to the terrain's, so a mob standing next to a block
  // reads with the same solidity instead of looking flat and pasted on.
  float fs = N.y > 0.5 ? 1.0 : (N.y < -0.5 ? 0.52 : (abs(N.x) > 0.5 ? 0.68 : 0.85));
  light *= fs;
  vec3 col = albedo * light;
  col = mix(col, uOverlayCol.rgb, uOverlayCol.a * vColor.a);
  float d = length(vWorld - uCamPos);
  vec3 dir = normalize(vWorld - uCamPos);
  float f = clamp((d-uFogStart)/max(uFogEnd-uFogStart,1.0),0.0,1.0); f*=f;
  vec3 fogCol = mix(skyGradient(dir), uFogTint, 0.38);
  if (uUnderwater==1){ fogCol=uUnderwaterCol; f=min(f,0.6);
    col = mix(col, uUnderwaterCol*(0.25+0.75*sky), clamp(d/26.0,0.0,1.0)); }
  col = mix(col, fogCol, f);
  oColor = vec4(col, 1.0);
}`;

/* first-person arms / held item: rendered with its own near projection */
SH.viewVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in float aLayer;
layout(location=4) in vec4 aColor;
layout(location=5) in vec2 aLight;
uniform mat4 uVP;
out vec3 vNormal; out vec2 vUV; out float vLayer; out vec4 vColor; out vec2 vLight; out vec3 vPos;
void main(){
  vNormal = aNormal; vUV = aUV; vLayer = aLayer; vColor = aColor; vLight = aLight; vPos = aPos;
  gl_Position = uVP * vec4(aPos, 1.0);
}`;
SH.viewFS = `#version 300 es
precision highp float;
in vec3 vNormal; in vec2 vUV; in float vLayer; in vec4 vColor; in vec2 vLight; in vec3 vPos;
uniform mediump sampler2DArray uAtlas;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyLightCol;
uniform vec3 uBlockLightCol;
uniform float uAmbient;
uniform float uDay;
uniform vec4 uOverlayCol;
layout(location=0) out vec4 oColor;
void main(){
  vec4 texel = texture(uAtlas, vec3(vUV, vLayer));
  if (texel.a < 0.35) discard;
  vec3 N = normalize(vNormal);
  float sky = vLight.x, blk = vLight.y;
  // a fixed key light keeps the arms readable regardless of where the sun is
  vec3 key = normalize(vec3(0.35, 0.75, 0.55));
  float kd = max(dot(N, key), 0.0);
  float fill = max(dot(N, normalize(vec3(-0.5,0.2,0.4))), 0.0);
  // the hand always keeps a little light of its own, so it never goes black
  vec3 amb = uSkyLightCol*(uAmbient+0.62*sky*sky) + uBlockLightCol*pow(blk,1.55)*1.05 + vec3(0.14,0.135,0.13);
  float fs = N.y > 0.5 ? 1.0 : (N.y < -0.5 ? 0.58 : (abs(N.x) > 0.5 ? 0.74 : 0.88));
  vec3 light = (amb * (0.52 + 0.34*kd + 0.14*fill) + uSunCol*kd*sky*uDay*0.30) * fs;
  vec3 col = texel.rgb * vColor.rgb * light;
  col = mix(col, uOverlayCol.rgb, uOverlayCol.a*vColor.a);
  oColor = vec4(col, 1.0);
}`;

/* --------------------------------------------------------- particles --- */
SH.partVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aCorner;
layout(location=2) in vec4 aColor;
layout(location=3) in vec2 aSizeLayer;
layout(location=4) in vec2 aLight;
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
out vec4 vColor; out vec2 vUV; out float vLayer; out vec2 vLight; out vec3 vWorld;
void main(){
  vec3 p = aPos + uRight*aCorner.x*aSizeLayer.x + uUp*aCorner.y*aSizeLayer.x;
  vColor = aColor; vUV = aCorner*0.5+0.5; vLayer = aSizeLayer.y; vLight = aLight; vWorld = p;
  gl_Position = uVP * vec4(p,1.0);
}`;
SH.partFS = `#version 300 es
` + SH.common + SH.sky + `
in vec4 vColor; in vec2 vUV; in float vLayer; in vec2 vLight; in vec3 vWorld;
uniform mediump sampler2DArray uAtlas;
uniform vec3 uCamPos;
uniform vec3 uSkyLightCol;
uniform vec3 uBlockLightCol;
uniform float uAmbient;
uniform float uFogStart; uniform float uFogEnd;
uniform int uTextured;
layout(location=0) out vec4 oColor;
void main(){
  vec4 t = vec4(1.0);
  if (uTextured == 1) { t = texture(uAtlas, vec3(vUV, vLayer)); if (t.a < 0.35) discard; }
  vec3 light = uSkyLightCol*(uAmbient+0.85*vLight.x*vLight.x)
             + uSunCol*vLight.x*vLight.x*uDay*0.7
             + uBlockLightCol*pow(vLight.y,1.55)*1.2;
  vec3 col = t.rgb * vColor.rgb * light;
  float d = length(vWorld-uCamPos);
  float f = clamp((d-uFogStart)/max(uFogEnd-uFogStart,1.0),0.0,1.0); f*=f;
  col = mix(col, mix(skyGradient(normalize(vWorld-uCamPos)), uFogTint, 0.55), f);
  oColor = vec4(col, vColor.a * t.a);
}`;

/* rain and snow: long screen-aligned streaks falling around the player */
SH.weatherVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aCorner;
layout(location=2) in vec2 aParam;   // x = size, y = kind (0 rain, 1 snow)
uniform mat4 uVP;
uniform vec3 uRight;
uniform float uTime;
out vec2 vUV; out float vKind;
void main(){
  float s = aParam.x;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 p = aPos + uRight*aCorner.x*s*(aParam.y>0.5?0.13:0.055) + up*aCorner.y*s*(aParam.y>0.5?0.13:1.05);
  vUV = aCorner*0.5+0.5; vKind = aParam.y;
  gl_Position = uVP*vec4(p,1.0);
}`;
SH.weatherFS = `#version 300 es
precision highp float;
in vec2 vUV; in float vKind;
uniform float uAlpha;
uniform vec3 uColor;
layout(location=0) out vec4 oColor;
void main(){
  float a;
  if (vKind > 0.5) {
    float d = length(vUV-0.5)*2.0;
    a = smoothstep(1.0, 0.2, d);
  } else {
    a = smoothstep(1.0, 0.35, abs(vUV.x-0.5)*2.0) * smoothstep(1.0,0.1,abs(vUV.y-0.5)*1.4);
  }
  oColor = vec4(uColor, a*uAlpha);
}`;

/* ------------------------------------------------------------- post ---- */
SH.postVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

SH.brightFS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform float uThreshold;
layout(location=0) out vec4 oColor;
void main(){
  vec3 c = texture(uTex, vUV).rgb;
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  float k = max(l - uThreshold, 0.0) / max(l, 0.0001);
  oColor = vec4(c*k, 1.0);
}`;

SH.blurFS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uDir;
layout(location=0) out vec4 oColor;
void main(){
  vec3 s = texture(uTex, vUV).rgb * 0.227027;
  s += (texture(uTex, vUV + uDir*1.3846).rgb + texture(uTex, vUV - uDir*1.3846).rgb) * 0.316216;
  s += (texture(uTex, vUV + uDir*3.2308).rgb + texture(uTex, vUV - uDir*3.2308).rgb) * 0.070270;
  oColor = vec4(s, 1.0);
}`;

/* volumetric shafts: radial blur of the sky-visible parts of the frame */
SH.godFS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform sampler2D uDepth;
uniform vec2 uSunUV;
uniform float uStrength;
layout(location=0) out vec4 oColor;
void main(){
  vec2 dir = vUV - uSunUV;
  float dist = length(dir);
  dir /= max(dist, 0.0001);
  vec3 acc = vec3(0.0);
  float w = 1.0, tot = 0.0;
  const int N = 24;
  for (int i=0;i<N;i++){
    float t = float(i)/float(N);
    vec2 uv = vUV - dir * dist * t * 0.85;
    float d = texture(uDepth, uv).r;
    vec3 c = texture(uTex, uv).rgb;
    float sky = d > 0.99995 ? 1.0 : 0.0;
    acc += c * w * (0.35 + 0.65*sky);
    tot += w;
    w *= 0.945;
  }
  acc /= max(tot, 0.0001);
  float falloff = exp(-dist*1.9);
  oColor = vec4(acc * uStrength * falloff, 1.0);
}`;

SH.compositeFS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uGod;
uniform float uBloomAmt;
uniform float uGodAmt;
uniform float uExposure;
uniform float uVignette;
uniform vec3 uTintCol;
uniform float uTintAmt;
uniform float uTime;
layout(location=0) out vec4 oColor;

vec3 tonemap(vec3 x){
  // ACES-ish filmic curve, kept gentle so the palette stays natural
  const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
void main(){
  vec3 col = texture(uScene, vUV).rgb;
  col += texture(uBloom, vUV).rgb * uBloomAmt;
  col += texture(uGod, vUV).rgb * uGodAmt;
  col *= uExposure;
  col = tonemap(col);
  // a gentle grade: the tonemap flattens the palette, so put a little
  // saturation and contrast back before the tint and vignette
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(mix(vec3(lum), col, 1.22), 0.0, 1.0);
  col = clamp((col - 0.5) * 1.06 + 0.5, 0.0, 1.0);
  col = mix(col, uTintCol, uTintAmt);
  float d = length(vUV-0.5);
  col *= 1.0 - uVignette*smoothstep(0.35,0.95,d);
  // a hint of dither breaks up banding in the sky gradient
  float dth = fract(sin(dot(vUV*vec2(1024.0,768.0), vec2(12.9898,78.233)))*43758.5453);
  col += (dth-0.5)/255.0;
  // The palette is hand-painted in display space, so the pipeline stays there
  // too: no extra gamma encode, which is what keeps the colours from washing
  // out into pastel.
  oColor = vec4(col, 1.0);
}`;

SH.fxaaFS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
layout(location=0) out vec4 oColor;
float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec3 rgbNW = texture(uTex, vUV+vec2(-1.0,-1.0)*uTexel).rgb;
  vec3 rgbNE = texture(uTex, vUV+vec2( 1.0,-1.0)*uTexel).rgb;
  vec3 rgbSW = texture(uTex, vUV+vec2(-1.0, 1.0)*uTexel).rgb;
  vec3 rgbSE = texture(uTex, vUV+vec2( 1.0, 1.0)*uTexel).rgb;
  vec3 rgbM  = texture(uTex, vUV).rgb;
  float lNW=lum(rgbNW), lNE=lum(rgbNE), lSW=lum(rgbSW), lSE=lum(rgbSE), lM=lum(rgbM);
  float lMin = min(lM, min(min(lNW,lNE), min(lSW,lSE)));
  float lMax = max(lM, max(max(lNW,lNE), max(lSW,lSE)));
  if (lMax - lMin < max(0.05, lMax*0.125)) { oColor = vec4(rgbM,1.0); return; }
  vec2 dir = vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
  float red = max((lNW+lNE+lSW+lSE)*0.25*0.25, 0.0078);
  float rcp = 1.0/(min(abs(dir.x),abs(dir.y))+red);
  dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*uTexel;
  vec3 a = 0.5*(texture(uTex, vUV+dir*(1.0/3.0-0.5)).rgb + texture(uTex, vUV+dir*(2.0/3.0-0.5)).rgb);
  vec3 b = a*0.5 + 0.25*(texture(uTex, vUV-dir*0.5).rgb + texture(uTex, vUV+dir*0.5).rgb);
  float lB = lum(b);
  oColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
}`;
