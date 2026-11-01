import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import TIMING from "./timing.json";

// ROADSTER BODY · one designed layout, never stickers: a fixed HUD (top: launch clock + G-meter + one stat slot) and ONE
// caption zone (lower third, centred). Everything enters with expo/back snaps and leaves with a fast cut.
const Y = "#FFD23F", W = "#F4F2EC", R = "#FF4D3D", C = "#7FE3FF", INK = "rgba(6,6,12,0.9)";
const FA = "Anton", FG = "Grotesk";
const ex = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const K = (t: number, ks: [number, number][]) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb] = ks[i]; return va + (vb - va) * ex((t - a) / (b - a)); } return ks[ks.length - 1][1]; };

// launch clock: frozen time that SNAPS forward on the beats (bullet time)
const CLOCK: [number, number][] = [[5.0, 0], [6.3, 0], [6.5, 0.05], [7.9, 0.05], [8.05, 0.1], [13.1, 0.1], [13.3, 0.2], [29.2, 0.2], [30.5, 0.9]];
const GM: [number, number][] = [[5.0, 0], [6.3, 0], [6.85, 2.7], [29.2, 2.7], [30.6, 0]];
const STATS: [number, number, string, string][] = [
  [0.35, 2.9, "0–60 MPH", "0.9 s · TESLA'S CLAIM"],
  [8.8, 12.4, "YOUR HEAD", "11 LB → 33 LB"],
  [12.7, 16.7, "ORGANS", "LAG ~0.1 s BEHIND"],
  [19.2, 23.1, "FIGHTER PILOT", "HEAD-TO-TOE G · BLACKOUT ≈ 5 G"],
  [23.3, 28.4, "YOU, SITTING BACK", "CHEST-TO-BACK G · 3 G IS EASY"],
  [31.4, 33.6, "DISTANCE", "≈ 40 FT · ONE CITY BUS"],
  [35.6, 38.7, "LOOSE STUFF", "STILL DOING 60 MPH"],
];
const EM: Record<string, string> = { SIXTY: Y, "SECOND.": Y, "BODY?": Y, THREE: R, "G'S.": R, SNAPS: R, ELEVEN: W, THIRTY: Y, "POUNDS.": Y, ORGANS: C, STOMACH: C, "SPINE.": C, "SURPRISE.": Y, "WON'T": Y, BLACK: Y, "OUT.": Y, DRAINS: R, "DOWN,": R, "BRAIN.": R, LEVEL: C, "OXYGEN.": C, "SIXTY.": Y, FORTY: Y, "BUS.": Y, "STOPPING.": R, FLYING: R, NECK: Y, "SURVIVE?": Y };
type Wd = { w: string; s: number; e: number };
const chunks: { words: Wd[]; a: number; b: number }[] = [];
(TIMING as any).lines.forEach((L: any) => { let cur: Wd[] = []; const fl = () => { if (cur.length) chunks.push({ words: cur, a: cur[0].s, b: 0 }); cur = []; }; L.words.forEach((x: any) => { cur.push({ ...x, w: x.w.toUpperCase() }); if (cur.length >= 3 || /[,.!?]$/.test(x.w)) fl(); }); fl(); });
chunks.forEach((c, i) => { const n = chunks[i + 1]; c.b = n ? Math.min(n.a - 0.03, c.words[c.words.length - 1].e + 0.5) : c.words[c.words.length - 1].e + 0.6; });

const Captions: React.FC<{ T: number; frame: number; fps: number }> = ({ T, frame, fps }) => {
  const c = chunks.find((k) => T >= k.a - 0.04 && T < k.b);
  if (!c || T > 41.1) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1270, height: 220, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "0 22px", fontFamily: FA, fontSize: 96, lineHeight: 1.08, textAlign: "center" }}>
      {c.words.map((x, i) => {
        const f0 = Math.round(x.s * fps) - 1; if (frame < f0) return <span key={i} style={{ opacity: 0 }}>{x.w}</span>;
        const k = spring({ frame: frame - f0, fps, config: { damping: 14, stiffness: 520, mass: 0.35 } });
        const col = EM[x.w] || W;
        return <span key={i} style={{ display: "inline-block", color: col, transform: `translateY(${(1 - k) * 34}px) scale(${interpolate(k, [0, 1], [0.82, 1])})`, opacity: clamp(k * 3), textShadow: `0 6px 0 ${INK}, 0 0 28px rgba(0,0,0,0.75)`, letterSpacing: 1 }}>{x.w}</span>;
      })}
    </div>
  );
};

const Hud: React.FC<{ T: number; frame: number; fps: number }> = ({ T, frame, fps }) => {
  const on = T >= 5.0 && T < 38.8, inK = ex(clamp((T - 5.0) / 0.35)) * (1 - clamp((T - 38.5) / 0.3));
  const clock = K(T, CLOCK), g = K(T, GM), gOver = g * (1 + 0.08 * Math.exp(-(T - 6.85) * 6) * Math.sin((T - 6.85) * 30) * (T > 6.85 ? 1 : 0));
  const st = STATS.find(([a, b]) => T >= a && T < b);
  const stK = st ? spring({ frame: frame - Math.round(st[0] * fps), fps, config: { damping: 16, stiffness: 420, mass: 0.4 } }) : 0;
  const lastSnap = CLOCK.filter(([t], i) => i > 0 && CLOCK[i][1] !== CLOCK[i - 1][1] && t <= T).pop();
  const flash = lastSnap ? Math.max(0, 1 - (T - lastSnap[0]) / 0.25) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {on ? (
        <div style={{ position: "absolute", top: 110, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-start", opacity: inK, transform: `translateY(${(1 - inK) * -30}px)` }}>
          <div>
            <div style={{ fontFamily: FG, fontSize: 26, letterSpacing: 6, color: C, opacity: 0.9 }}>TIME SINCE LAUNCH</div>
            <div style={{ fontFamily: FA, fontSize: 132, color: W, lineHeight: 1, textShadow: `0 0 ${18 + flash * 40}px rgba(127,227,255,${0.35 + flash * 0.6})`, transform: `scale(${1 + flash * 0.08})`, transformOrigin: "0% 50%" }}>{clock.toFixed(2)}<span style={{ fontSize: 64, color: C }}> s</span></div>
          </div>
          <div style={{ width: 300, textAlign: "right" }}>
            <div style={{ fontFamily: FG, fontSize: 26, letterSpacing: 6, color: C, opacity: 0.9 }}>G-FORCE</div>
            <div style={{ fontFamily: FA, fontSize: 92, color: g > 2 ? R : W, lineHeight: 1.05 }}>{gOver.toFixed(1)}<span style={{ fontSize: 50 }}> G</span></div>
            <div style={{ height: 14, background: "rgba(255,255,255,0.12)", borderRadius: 7, overflow: "hidden" }}><div style={{ height: "100%", width: `${clamp(gOver / 3) * 100}%`, background: `linear-gradient(90deg, ${C}, ${R})`, borderRadius: 7 }} /></div>
          </div>
        </div>
      ) : null}
      {st ? (
        <div style={{ position: "absolute", top: on ? 330 : 130, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `translateY(${(1 - stK) * -24}px) scaleX(${0.6 + 0.4 * stK})`, opacity: clamp(stK * 2), background: "rgba(8,8,16,0.72)", border: `2px solid rgba(127,227,255,0.55)`, borderRadius: 18, padding: "14px 30px", textAlign: "center", backdropFilter: "blur(2px)" }}>
            <div style={{ fontFamily: FG, fontSize: 24, letterSpacing: 6, color: C }}>{st[2]}</div>
            <div style={{ fontFamily: FA, fontSize: 54, color: W, letterSpacing: 1 }}>{st[3]}</div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Overlay: React.FC = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([["Anton", "fonts/anton.woff2"], ["Grotesk", "fonts/grotesk.woff2"]].map(([n, u]) => new FontFace(n, `url(${staticFile(u)})`).load().then((f) => (document.fonts as any).add(f))))
      .then(() => continueRender(h), () => continueRender(h));
  }, [h]);
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const T = frame / fps;
  // pilot tunnel vision (on "drains down … away from the brain")
  const tun = T >= 20.9 && T < 23.25 ? ex(clamp((T - 20.9) / 1.6)) * (1 - clamp((T - 23.05) / 0.2)) : 0;
  const end = T >= 41.15, ep = spring({ frame: frame - Math.round(41.15 * fps), fps, config: { damping: 14, stiffness: 300, mass: 0.5 } });
  const flash = [[0.0, 0.18, 0.55], [6.25, 0.12, 0.45], [35.6, 0.1, 0.35], [37.3, 0.1, 0.4]].reduce((m, [a, d, k]) => (T >= a && T < a + d ? Math.max(m, k * (1 - (T - a) / d)) : m), 0);
  const grain = Array.from({ length: 36 }, (_, i) => ({ x: random(`x${frame}${i}`) * 1080, y: random(`y${frame}${i}`) * 1920, a: random(`a${frame}${i}`) * 0.08 }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(2,2,8,0.6) 100%)" }} />
      {tun > 0 ? <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(0,0,0,0) ${Math.round(70 - tun * 52)}%, rgba(0,0,0,${0.96 * tun}) ${Math.round(88 - tun * 40)}%)` }} /> : null}
      {grain.map((g, i) => <div key={i} style={{ position: "absolute", left: g.x, top: g.y, width: 3, height: 3, background: `rgba(255,255,255,${g.a})` }} />)}
      <Hud T={T} frame={frame} fps={fps} />
      <Captions T={T} frame={frame} fps={fps} />
      {flash > 0 ? <AbsoluteFill style={{ background: `rgba(230,240,255,${flash})` }} /> : null}
      {end ? (
        <AbsoluteFill style={{ background: `rgba(4,4,10,${0.6 * Math.min(1, ep)})`, alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${interpolate(ep, [0, 1], [1.5, 1])})`, opacity: Math.min(1, ep * 2), fontFamily: FA, fontSize: 104, color: W, letterSpacing: 2, textAlign: "center" }}>SUBSCRIBE<br /><span style={{ color: Y }}>FOR MORE</span></div>
          <div style={{ marginTop: 34, fontFamily: FG, fontSize: 30, letterSpacing: 10, color: C, opacity: Math.min(1, ep) }}>WHY WE WONDER</div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
