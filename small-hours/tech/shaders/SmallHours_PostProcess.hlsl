// =============================================================================
//  SMALL HOURS — Degraded-Media Post-Process Chain
//  "Photographic until it isn't."  The Fears-to-Fathom camcorder/VHS look.
// -----------------------------------------------------------------------------
//  Target: Unreal Engine 5 Custom Post-Process node (HLSL). Also portable to any
//  full-screen pass — a GLSL/Canvas sibling drives the browser POC in ../../poc/.
//
//  This is the LAST pass in the stack. It runs over a fully realistic, Lumen-lit
//  render. Realism in -> uncanny "footage of a real night" out.
//
//  Single most important authored input:  Degradation (0..1)
//    0.0 = clean-frame reveal (the half-second the mask slips; see Art Bible §2)
//    0.3 = baseline night
//    1.0 = signal collapse at peak dread
//  Driven at runtime by the Fear/Dread system (see docs/03_GAMEPLAY_SYSTEMS.md).
// =============================================================================

// ---- Inputs (wire these as Custom-node inputs / material params in UE) -------
//   Tex            : SceneColor (already tonemapped) sampler
//   UV             : screen UV (0..1)
//   Time           : seconds (real-time; also used by the diegetic clock)
//   Degradation    : 0..1 master dial
//   Aberration     : base chromatic-aberration strength (px), e.g. 1.5
//   GrainAmount    : base grain, e.g. 0.06
//   InternalRes    : target vertical resolution for the downscale, e.g. 540.0
//   ScreenSize     : float2 backbuffer size in px
//   FilterEnabled  : 1 = full chain, 0 = bypass (accessibility / clean reveal)

// ---------- small helpers ----------------------------------------------------
float  hash21(float2 p){ p = frac(p*float2(123.34,345.45)); p += dot(p,p+34.345); return frac(p.x*p.y); }
float  rand (float2 p, float t){ return frac(sin(dot(p, float2(12.9898,78.233))+t)*43758.5453); }
float3 rgb2yiq(float3 c){ return float3(dot(c,float3(0.299,0.587,0.114)),
                                        dot(c,float3(0.596,-0.274,-0.322)),
                                        dot(c,float3(0.211,-0.523,0.312))); }
float3 yiq2rgb(float3 c){ return float3(c.x + 0.956*c.y + 0.621*c.z,
                                        c.x - 0.272*c.y - 0.647*c.z,
                                        c.x - 1.106*c.y + 1.703*c.z); }

// =============================================================================
float3 SmallHoursPost(Texture2D Tex, SamplerState S, float2 UV, float Time,
                      float Degradation, float Aberration, float GrainAmount,
                      float InternalRes, float2 ScreenSize, float FilterEnabled)
{
    if (FilterEnabled < 0.5) return Tex.Sample(S, UV).rgb;   // bypass / clean reveal

    float deg = saturate(Degradation);
    float2 uv = UV;

    // -- 8. LENS: subtle barrel distortion (stronger as the signal degrades) ---
    float2 c   = uv - 0.5;
    float  r2  = dot(c, c);
    float  barrel = 1.0 + (0.06 + 0.10*deg) * r2;
    uv = 0.5 + c * barrel;

    // -- 5b. TIME-BASE WOBBLE: per-scanline horizontal warble -----------------
    float line = floor(uv.y * InternalRes);
    float wobble = (sin(line*0.7 + Time*3.0) * 0.0006
                 +  sin(line*3.1 + Time*11.0) * 0.0003) * (0.4 + deg);
    uv.x += wobble;

    // -- 1. INTERNAL-RES DOWNSCALE: quantise UVs to a low-res grid -------------
    float2 grid = float2(InternalRes * (ScreenSize.x/ScreenSize.y), InternalRes);
    float2 luv  = (floor(uv * grid) + 0.5) / grid;
    luv = lerp(uv, luv, 0.85);   // not a hard pixelation; just "soft tape res"

    // -- 3. CHROMATIC ABERRATION: radial RGB split (fear pushes it out) --------
    float  ab  = (Aberration + 6.0*deg) / ScreenSize.x;
    float2 dir = normalize(c + 1e-5) * (0.4 + 0.6*r2);
    float3 col;
    col.r = Tex.Sample(S, luv + dir*ab*1.0).r;
    col.g = Tex.Sample(S, luv                 ).g;
    col.b = Tex.Sample(S, luv - dir*ab*1.0).b;

    // -- 2. CHROMA SUBSAMPLE + BLEED: blur chroma horizontally in YIQ ---------
    //    Reds/blues smear past their edges — the unmistakable analog tell.
    float3 yiq = rgb2yiq(col);
    float  bleed = (2.0 + 4.0*deg) / ScreenSize.x;
    float3 yL = rgb2yiq(Tex.Sample(S, luv + float2(-bleed,0)).rgb);
    float3 yR = rgb2yiq(Tex.Sample(S, luv + float2( bleed,0)).rgb);
    yiq.yz = (yiq.yz + yL.yz + yR.yz) / 3.0;   // average only I/Q (chroma)
    col = yiq2rgb(yiq);

    // -- 4. HALATION / BLOOM: bright sources blow out warm --------------------
    float luma = dot(col, float3(0.299,0.587,0.114));
    float hot  = saturate((luma - 0.75) * 4.0);
    col += hot * float3(0.20, 0.12, 0.06) * (0.5 + deg);

    // -- 5a. TRACKING / DROPOUT: occasional torn horizontal bands -------------
    float tnoise = rand(float2(line, floor(Time*12.0)), Time);
    float tear   = step(0.985 - 0.05*deg, tnoise);          // rare unless deg high
    uv.x += tear * (tnoise-0.5) * 0.08;
    col   = lerp(col, float3(0.8,0.8,0.8)*tnoise, tear*0.6); // brief signal loss

    // -- 5c. HEAD-SWITCHING NOISE: jittering static band at the BOTTOM --------
    float bandTop = 0.06 + 0.02*sin(Time*5.0);              // bottom ~6% of frame
    if (UV.y > 1.0 - bandTop)
    {
        float n = rand(float2(UV.x*ScreenSize.x, floor(Time*60.0)), Time);
        float fall = saturate((UV.y - (1.0-bandTop)) / bandTop);
        col = lerp(col, float3(n,n,n), fall * (0.7 + 0.3*deg));
    }

    // -- 6. SCANLINES + INTERLACE COMBING on motion ---------------------------
    float scan = 0.92 + 0.08*sin(UV.y * InternalRes * 3.14159);
    col *= scan;
    float field = fmod(floor(UV.y*InternalRes) + floor(Time*50.0), 2.0);
    col *= 1.0 - 0.05*field*deg;                            // even/odd field dim

    // -- 7. GRAIN: fine luma grain + coarse crawling tape grain ---------------
    float g1 = (hash21(UV*ScreenSize + Time*60.0) - 0.5);
    float g2 = (rand(floor(UV*float2(120,90)), floor(Time*24.0)) - 0.5);
    col += g1 * (GrainAmount + 0.10*deg);                   // film grain
    col += g2 * (0.04 + 0.08*deg) * float3(1.0,0.9,1.1);    // colored tape grain

    // -- 9. GRADE (LUT stand-in): crush blacks slightly green, sallow skin ----
    col = pow(saturate(col), float3(1.05, 1.0, 1.08));      // lift greens in mids
    col.g += 0.015;                                          // sickly base tint
    col = lerp(col, dot(col,float3(0.33,0.34,0.33)).xxx, 0.10*deg); // desat w/ dread

    // -- 8b. VIGNETTE ---------------------------------------------------------
    float vig = smoothstep(0.95, 0.35, r2*1.3);
    col *= lerp(1.0, vig, 0.6 + 0.3*deg);

    return saturate(col);
}

// -----------------------------------------------------------------------------
//  DIEGETIC HUD (composite in a separate pass / UMG over this output):
//    REC ● (blinking), live timecode bound to the REAL system clock,
//    battery icon, "SP" (standard play). See docs/01_ART_BIBLE.md §2 & §11.
//
//  ESCALATION (the signature beat): drive `Degradation` up with the Dread
//  system, then FORCE FilterEnabled -> 0 for ~0.5s at the worst moment for a
//  clean, silent, high-res frame on the Visitor, then slam it back. Nothing in
//  this file is scarier than turning it briefly OFF.
// =============================================================================
