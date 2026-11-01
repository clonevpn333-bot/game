import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import TIMING from "./timing.json";

// HAUNTED SHIFT · kinetic captions (2–3 words at a time, each word POPS on the frame it is spoken; emphasis words in
// slime green / pumpkin orange / blood red; the biggest beats SLAM with a shake) + film FX + the end card.
const FONT = "Luckiest";
const C: Record<string, string> = { g: "#9BFF5A", o: "#FF9A1E", r: "#FF4A3A", w: "#FFFFFF" };
const EM: Record<string, string> = {
  "UPSIDE": "o", "DOWN.": "o", CRAZY: "r", "PART?": "r", BARELY: "g", SPEED: "g", HALLOWEEN: "o", "NIGHT.": "o", "HOME?": "g", "NOPE!": "r", FLOOR: "o", CLAIMS: "o", ZERO: "g", SIXTY: "g", "SECOND.": "g",
  THREE: "r", "G'S.": "r", DOUBLE: "o", ASTRONAUTS: "g", "LIFTOFF.": "g", "GRIP": "o", "HARD.": "o", "CHEATS,": "r", "THRUSTERS.": "g", "THRUSTERS?": "g", COLD: "g", GAS: "g", "BALLOON.": "r",
  GHOST: "g", "GAINING.": "r", "RAMP.": "o", "CURVE,": "o", STRAIGHT: "o", "STRAIGHT.": "o", PRESSES: "g", "TRACK.": "g", TWENTY: "g", "ENOUGH.": "g", "2012,": "o", TWO: "o", REAL: "o",
  "LAUNCH.": "o", "FLIP.": "r", "FLY.": "g", "HER.": "g", "CAR.": "g", "SEAT.": "r", "2028.": "o", MISSED: "r", "BEFORE.": "r", "IT?": "o",
};
const SLAM = new Set(["UPSIDE", "BARELY", "NOPE!", "THREE", "CHEATS,", "BALLOON.", "TWENTY", "LAUNCH.", "FLIP.", "FLY.", "SEAT.", "MISSED"]);
type Wd = { w: string; s: number; e: number };
type Chunk = { words: Wd[]; a: number; b: number; who: string };
const chunks: Chunk[] = [];
(TIMING as any).lines.forEach((L: any, li: number) => {
  const ws: Wd[] = L.words.map((x: any) => ({ ...x, w: x.w.toUpperCase().replace("BRAAAINS!", "BRAAAAINS!") }));
  let cur: Wd[] = [];
  const flush = () => { if (cur.length) chunks.push({ words: cur, a: cur[0].s, b: 0, who: L.who }); cur = []; };
  ws.forEach((x) => { cur.push(x); if (cur.length >= 3 || /[,.!?]$/.test(x.w) || (cur.length >= 2 && x.w.length > 8)) flush(); });
  flush();
  const next = (TIMING as any).lines[li + 1];
  void next;
});
chunks.forEach((c, i) => { const n = chunks[i + 1]; const end = c.words[c.words.length - 1].e + 0.35; c.b = n ? Math.min(n.a - 0.02, end + 0.6) : end + 0.6; });

const Word: React.FC<{ x: Wd; size: number }> = ({ x, size }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const f0 = Math.round(x.s * fps) - 1;
  if (frame < f0) return <span style={{ opacity: 0, display: "inline-block" }}>{x.w}</span>;
  const slam = SLAM.has(x.w);
  const sp = spring({ frame: frame - f0, fps, config: slam ? { damping: 10, stiffness: 300, mass: 0.5 } : { damping: 11, stiffness: 380, mass: 0.4 } });
  const sc = slam ? interpolate(sp, [0, 1], [2.4, 1]) : interpolate(sp, [0, 1], [0.4, 1]);
  const rot = slam ? 0 : interpolate(sp, [0, 1], [-8, 0]) * (random(x.w + x.s) > 0.5 ? 1 : -1);
  const col = C[EM[x.w] || "w"];
  return (
    <span style={{ display: "inline-block", transform: `scale(${sc}) rotate(${rot}deg)`, color: col, fontSize: slam ? size * 1.35 : size, WebkitTextStroke: `${Math.round(size * 0.1)}px #12081a`, paintOrder: "stroke fill", textShadow: `0 ${size * 0.07}px 0 #12081a, 0 0 ${size * 0.4}px rgba(0,0,0,0.6)`, margin: `0 ${size * 0.13}px`, lineHeight: 1.05 }}>{x.w}</span>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const T = frame / fps;
  const c = chunks.find((k) => T >= k.a - 0.05 && T < k.b);
  if (!c || T > 53.15) return null;
  const slamW = c.words.find((x) => SLAM.has(x.w));
  const sd = slamW ? frame - Math.round(slamW.s * fps) : 99;
  const shake = sd >= 0 && sd < 8 ? Math.sin(sd * 2.7) * (8 - sd) * 2.6 : 0;
  const size = c.words.some((x) => x.w.length > 9) ? 92 : 108;
  const dialog = c.who !== "nar";
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1150, display: "flex", flexWrap: "wrap", justifyContent: "center", fontFamily: FONT, transform: `translateX(${shake}px)`, textAlign: "center" }}>
      {dialog ? <div style={{ position: "absolute", top: -64, left: 0, right: 0, textAlign: "center", fontSize: 40, color: C.o, WebkitTextStroke: "6px #12081a", paintOrder: "stroke fill", letterSpacing: 2 }}>{({ ghost: "GHOST", you: "YOU" } as any)[c.who]}</div> : null}
      {c.words.map((x, i) => <Word key={i} x={x} size={size} />)}
    </div>
  );
};

// white flashes on the big hits (lightning at 2.3, the jump scare, the bolt-like snap of heads)
const FLASH = [[0.0, 0.2, 0.75], [10.16, 0.15, 0.4], [41.76, 0.15, 0.55], [42.32, 0.12, 0.45], [42.87, 0.15, 0.4], [46.9, 0.12, 0.35]];
const Fx: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const T = frame / fps;
  let fl = 0; FLASH.forEach(([a, d, k]) => { if (T >= a && T < a + d) fl = Math.max(fl, k * (1 - (T - a) / d)); });
  const live = false;
  const badge = T >= 10.3 && T < 13.7 ? "TESLA'S CLAIM — NOT INDEPENDENTLY TESTED" : T >= 32.5 && T < 36.3 ? "AT THE TOP: v = √(g·r) ≈ 20 MPH FOR AN 8 M LOOP" : T >= 36.45 && T < 40.5 ? "2012 · TWO CARS · ONE 6-STORY DOUBLE LOOP" : T >= 48.0 && T < 51.6 ? "FIRST PROMISED FOR 2020" : "";
  const gb = T >= 14.4 && T < 17.85 ? spring({ frame: frame - Math.round(14.4 * fps), fps, config: { damping: 14, stiffness: 120 } }) : 0;
  const end = T >= 53.15;
  const ep = spring({ frame: frame - Math.round(53.15 * fps), fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
  const grain = Array.from({ length: 50 }, (_, i) => ({ x: random(`gx${frame}${i}`) * 1080, y: random(`gy${frame}${i}`) * 1920, a: random(`ga${frame}${i}`) * 0.12 }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(8,2,16,0.55) 100%)" }} />
      {grain.map((g, i) => <div key={i} style={{ position: "absolute", left: g.x, top: g.y, width: 3, height: 3, background: `rgba(255,255,255,${g.a})` }} />)}
      {live ? (
        <>
          <div style={{ position: "absolute", top: 120, left: 60, display: "flex", gap: 14, alignItems: "center", fontFamily: "Arial", fontWeight: 900, fontSize: 38 }}>
            <div style={{ background: "#ff1e4a", color: "#fff", padding: "6px 18px", borderRadius: 10 }}>LIVE</div>
            <div style={{ background: "rgba(0,0,0,0.45)", color: "#fff", padding: "6px 16px", borderRadius: 10 }}>👁 {(1200 + Math.floor((T - 21.8) * 830)).toLocaleString("en-US")}</div>
          </div>
          {Array.from({ length: 7 }, (_, i) => { const t0 = 21.9 + i * 0.32, u = (T - t0) / 1.6; if (u < 0 || u > 1) return null; return <div key={i} style={{ position: "absolute", left: 880 + Math.sin(u * 6 + i) * 50, top: 1500 - u * 650, fontSize: 70, opacity: 1 - u }}>{["❤️", "😂", "🔥", "💀", "❤️", "😂", "🧟"][i]}</div>; })}
        </>
      ) : null}
      {badge ? <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center" }}><div style={{ background: "rgba(18,8,26,0.82)", color: "#F2C230", fontFamily: "Arial", fontWeight: 900, fontSize: 34, padding: "10px 24px", borderRadius: 14, border: "3px solid #F2C230" }}>{badge}</div></div> : null}
      {gb > 0 ? (
        <div style={{ position: "absolute", top: 260, left: 90, right: 90, fontFamily: FONT }}>
          {[["ROCKET LIFTOFF", 1.3, "#9fe6ff"], ["ROADSTER (CLAIM)", 2.7, "#FF4A3A"]].map(([n, v, c], i) => (
            <div key={i} style={{ marginBottom: 26 }}>
              <div style={{ color: "#fff", fontSize: 44, WebkitTextStroke: "6px #12081a", paintOrder: "stroke fill" }}>{n as string} · {(v as number).toFixed(1)} G</div>
              <div style={{ height: 46, width: `${(v as number) / 3 * 100 * Math.min(1, gb * (i ? 1 : 1.4))}%`, background: c as string, borderRadius: 12, border: "5px solid #12081a" }} />
            </div>
          ))}
        </div>
      ) : null}
      {fl > 0 ? <AbsoluteFill style={{ background: `rgba(235,240,255,${fl})` }} /> : null}
      {end ? (
        <AbsoluteFill style={{ background: `rgba(10,4,18,${0.55 * Math.min(1, ep)})`, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
          <div style={{ transform: `scale(${interpolate(ep, [0, 1], [2.2, 1])})`, background: "#D0281E", color: "#fff", fontSize: 92, padding: "26px 54px 14px", borderRadius: 80, WebkitTextStroke: "8px #12081a", paintOrder: "stroke fill", boxShadow: "0 10px 0 #12081a" }}>SUBSCRIBE FOR MORE</div>
          <div style={{ marginTop: 40, fontSize: 52, color: C.o, WebkitTextStroke: "6px #12081a", paintOrder: "stroke fill", opacity: Math.min(1, ep), letterSpacing: 4 }}>WHY WE WONDER</div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const Overlay: React.FC = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const f = new FontFace(FONT, `url(${staticFile("fonts/luckiest.woff2")})`);
    f.load().then((ff) => { (document.fonts as any).add(ff); continueRender(h); }, () => continueRender(h));
  }, [h]);
  return (<AbsoluteFill><Fx /><Captions /></AbsoluteFill>);
};
