import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// WHY WE WONDER · kinetic typography layer (replaces subtitle captions). Every on-screen word is a designed word:
// it rises into a line mask on the frame it is spoken (spring), emphasis words land in curiosity yellow with an
// underline that draws on, big beats SLAM in on the music hit, and each phrase exits upward, staggered word by word.
// Copy is segmented by meaning (Hook → Build → Punch → Resolve), 1–2 emphasis words per phrase.

type Fx = "rise" | "slam" | "hold" | "pop";
type W = { t: string; at: number; c?: "y" | "r" | "i" | "cy"; fx?: Fx; em?: boolean; mono?: boolean };
type Line = { w: W[]; size: number; split?: [number, number]; mono?: boolean };
type Phrase = { top: number; out: number; lines: Line[]; gap?: number };

const Y = "#F2C230", IV = "#F2E8D0", RED = "#FF5A40", CY = "#9FE6F2";
const col = (c?: W["c"]) => (c === "y" ? Y : c === "r" ? RED : c === "cy" ? CY : IV);
const w = (t: string, at: number, o: Partial<W> = {}): W => ({ t, at, ...o });

// onsets from vo/assets/timing.json (locked to the 120 bpm grid)
const PHRASES: Phrase[] = [
  // HOOK — on frame 1 (narration at normal speed)
  { top: 100, out: 2.78, lines: [
    { size: 96, w: [w("HER", 0, { fx: "hold" }), w("33,000-FOOT", 0, { fx: "hold", c: "y", em: true })] },
    { size: 112, w: [w("FALL", 0, { fx: "hold", c: "y" }), w("MAY", 0, { fx: "hold" }), w("BE", 0, { fx: "hold" })] },
    { size: 150, w: [w("A", 2.4, { c: "r" }), w("LIE.", 2.5, { fx: "slam", c: "r" })] },
  ] },
  // SECOND HOOK on the 2.5 hit
  { top: 120, out: 4.7, lines: [{ size: 100, w: [w("JOURNALISTS", 3, { fx: "slam" })] }, { size: 100, w: [w("CLAIMED", 3.63), w("HER", 4.03), w("JET", 4.27)] }] },
  { top: 140, out: 6.35, lines: [{ size: 150, w: [w("SHOT", 4.83, { fx: "slam", c: "r" }), w("DOWN.", 4.95, { fx: "slam", c: "r" })] }, { size: 100, w: [w("BY", 5.53), w("MISTAKE?", 5.7, { c: "y", em: true })] }] },
  { top: 130, out: 8, lines: [{ size: 120, w: [w("NOT", 6.54), w("BY", 6.77), w("A", 7)] }, { size: 150, w: [w("BOMB,", 7.23, { c: "y" })] }] },
  { top: 120, out: 10.1, lines: [{ size: 100, w: [w("BUT", 7.92), w("BY", 8.14), w("A", 8.37)] }, { size: 92, w: [w("CZECHOSLOVAK", 8.6, { c: "y" })] }, { size: 108, w: [w("FIGHTER", 9.34), w("JET.", 9.74)] }] },
  { top: 120, out: 13.45, lines: [{ size: 92, w: [w("IF", 10.29), w("THEY'RE", 10.51), w("RIGHT,", 10.74, { c: "y" })] }, { size: 92, w: [w("SHE", 11.19), w("DIDN'T", 11.6), w("FALL", 12.02)] }, { size: 120, w: [w("33,000", 12.43, { c: "r" }), w("FEET.", 12.85, { c: "r" })] }] },
  { top: 130, out: 15.35, lines: [{ size: 100, w: [w("MAYBE", 13.65), w("JUST", 13.87)] }, { size: 116, w: [w("A", 14.09, { c: "y" }), w("FEW", 14.31, { c: "y" }), w("HUNDRED", 14.53, { c: "y", em: true })] }, { size: 100, w: [w("METERS.", 14.91, { c: "y" })] }] },
  { top: 120, out: 16.8, lines: [{ size: 100, w: [w("AND", 15.54), w("THE", 15.75)] }, { size: 98, w: [w("MIRACLE", 15.97, { c: "y" }), w("RECORD?", 16.5, { c: "y" })] }] },
  { top: 140, out: 18.45, lines: [{ size: 116, w: [w("A", 16.87), w("COVER", 17.08, { c: "r", fx: "pop" }), w("STORY,", 17.45, { c: "r" })] }, { size: 80, w: [w("THEY", 17.82), w("CLAIMED.", 18.04)] }] },
  // PIVOT
  { top: 120, out: 20.5, lines: [{ size: 140, w: [w("BUT", 19, { fx: "slam", c: "y" })] }, { size: 100, w: [w("THE", 19.27), w("BLACK", 19.5), w("BOXES", 19.72)] }] },
  { top: 130, out: 21.9, lines: [{ size: 92, w: [w("PUT", 20.12), w("THE", 20.34), w("BLAST", 20.57, { c: "r" })] }, { size: 86, w: [w("AT", 20.8), w("CRUISING", 21.03, { c: "y", em: true }), w("HEIGHT.", 21.42, { c: "y" })] }] },
  { top: 120, out: 24.6, lines: [{ size: 100, w: [w("AND", 22.04), w("VESNA", 22.29, { c: "y" })] }, { size: 100, w: [w("HERSELF", 22.73)] }, { size: 116, w: [w("REJECTED", 23.17, { c: "r", fx: "pop" })] }, { size: 90, w: [w("THE", 23.8), w("THEORY.", 24.05)] }] },
  { top: 120, out: 26, lines: [{ size: 116, w: [w("THE", 24.78), w("TRUTH?", 24.99, { c: "y" })] }, { size: 80, w: [w("SHE", 25.2), w("COULDN'T", 25.41), w("TELL", 25.62), w("US.", 25.83)] }] },
  { top: 120, out: 27.85, lines: [{ size: 76, w: [w("SHE", 26.04), w("NEVER", 26.25, { c: "y", em: true }), w("REMEMBERED", 26.61)] }, { size: 120, w: [w("THE", 27.29), w("FALL.", 27.5, { c: "y" })] }] },
  // OUTRO
  { top: 1060, out: 30.35, lines: [{ size: 92, w: [w("OFFICIALLY,", 28.04, { c: "y" })] }, { size: 84, w: [w("SHE", 28.78), w("STILL", 29.02), w("HOLDS", 29.25)] }, { size: 84, w: [w("THE", 29.48), w("RECORD.", 29.71, { c: "y" })] }] },
  { top: 140, out: 34.3, lines: [{ size: 104, w: [w("WHICH", 30.53), w("DO", 30.75), w("YOU", 30.97)] }, { size: 140, w: [w("BELIEVE?", 31.19, { c: "y", fx: "pop", em: true })] }] },
  { top: 1352, out: 34.3, lines: [{ size: 52, mono: true, w: [w("COMMENT", 31.8, { mono: true }), w("BELOW", 31.95, { mono: true, c: "y" })] }] },
];

const LEAD = 2; // frames: a word starts moving just before it is heard

const Word: React.FC<{ wd: W; idx: number; outF: number; size: number; mono?: boolean }> = ({ wd, idx, outF, size, mono }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = Math.round(wd.at * fps) - LEAD;
  const fx = wd.fx || "rise";
  const s = fx === "hold" ? 1 : spring({ frame: frame - f0, fps, config: fx === "slam" ? { damping: 13, stiffness: 260, mass: 0.5 } : { damping: 16, stiffness: 190, mass: 0.55 } });
  if (fx !== "hold" && frame < f0) return <span style={{ display: "inline-block", opacity: 0 }}>{wd.t}</span>;
  const eo = interpolate(frame, [outF + idx * 0.5, outF + idx * 0.5 + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let tf = "", op = 1;
  if (fx === "rise") { tf = `translateY(${(1 - s) * 105}%)`; op = interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }); }
  if (fx === "slam") { tf = `scale(${interpolate(s, [0, 1], [2.3, 1])})`; op = interpolate(s, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }); }
  if (fx === "pop") { tf = `translateY(${(1 - s) * 60}%) scale(${interpolate(s, [0, 1], [0.6, 1])})`; op = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }); }
  if (fx === "hold") tf = "";
  // emphasis pulse on the spoken onset
  if (wd.em) { const ps = Math.round(wd.at * fps); const pk = interpolate(frame, [ps, ps + 3, ps + 9], [1, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); tf += ` scale(${pk})`; }
  tf += ` translateY(${-105 * eo}%)`;
  op *= 1 - eo;
  const ul = wd.em ? spring({ frame: frame - f0 - 4, fps, config: { damping: 20, stiffness: 160 } }) : 0;
  return (
    <span style={{ display: "inline-block", position: "relative", transform: tf, opacity: op, color: col(wd.c), fontFamily: mono || wd.mono ? "JetBrains Mono" : "Fraunces", fontWeight: mono || wd.mono ? 600 : 700, transformOrigin: "50% 60%" }}>
      {wd.t}
      {wd.em ? <span style={{ position: "absolute", left: "2%", right: "2%", bottom: -size * 0.04, height: Math.max(5, size * 0.06), background: Y, transform: `scaleX(${ul * (1 - eo)})`, transformOrigin: "0% 50%", borderRadius: 3 }} /> : null}
    </span>
  );
};

const LineView: React.FC<{ ln: Line; outF: number; base: number }> = ({ ln, outF, base }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = ln.w.some((x) => x.fx === "slam" || x.fx === "pop");
  const row = (
    <div style={{ display: "flex", justifyContent: "center", gap: `0 ${ln.size * 0.26}px`, whiteSpace: "nowrap", fontSize: ln.size, lineHeight: 1.0, letterSpacing: ln.mono ? "0.04em" : "-0.01em", padding: `${ln.size * 0.1}px 0 ${ln.size * 0.12}px`, overflow: slam ? "visible" : "hidden" }}>
      {ln.w.map((wd, i) => <Word key={i} wd={wd} idx={base + i} outF={outF} size={ln.size} mono={ln.mono} />)}
    </div>
  );
  if (ln.split == null) return row;
  // the beam line (x = 540) runs through the gap between two word groups, which spring apart from it
  const [sat, si] = ln.split;
  const g = 14 + spring({ frame: frame - Math.round(sat * fps), fps, config: { damping: 12, stiffness: 200 } }) * 22;
  const half = (ws: W[], off: number, side: "l" | "r") => (
    <div style={{ position: "absolute", top: 0, [side === "l" ? "right" : "left"]: `calc(50% + ${g}px)`, width: "max-content", display: "flex", gap: `0 ${ln.size * 0.26}px`, whiteSpace: "nowrap", fontSize: ln.size, lineHeight: 1.0, letterSpacing: "-0.01em", padding: `${ln.size * 0.1}px 0 ${ln.size * 0.12}px`, overflow: "hidden" }}>
      {ws.map((wd, i) => <Word key={i} wd={wd} idx={base + off + i} outF={outF} size={ln.size} />)}
    </div>
  );
  return (
    <div style={{ position: "relative", width: "100%", height: ln.size * 1.22 }}>
      {half(ln.w.slice(0, si), 0, "l")}
      {half(ln.w.slice(si), si, "r")}
    </div>
  );
};

export const Kinetic: React.FC = () => {
  // never draw a frame before Fraunces + JetBrains Mono are ready
  const [handle] = useState(() => delayRender("kinetic fonts"));
  useEffect(() => {
    Promise.all(["700 100px Fraunces", "600 100px \"JetBrains Mono\""].map((f) => document.fonts.load(f))).then(() => continueRender(handle), () => continueRender(handle));
  }, [handle]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {PHRASES.map((p, i) => {
        const first = Math.min(...p.lines.flatMap((l) => l.w.map((x) => x.at)));
        if (T < first - 0.2 || T > p.out + 0.5) return null;
        const outF = Math.round(p.out * fps);
        // a slam shakes the whole phrase for a few frames
        const sl = p.lines.flatMap((l) => l.w).find((x) => x.fx === "slam");
        const sd = sl ? frame - Math.round(sl.at * fps) : 99;
        const shake = sd >= 0 && sd < 7 ? Math.sin(sd * 2.6) * (7 - sd) * 1.6 : 0;
        let base = 0;
        return (
          <div key={i} style={{ position: "absolute", top: p.top, left: 40, right: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: p.gap ?? 0, transform: `translateX(${shake}px) scale(${i === 0 ? interpolate(frame, [0, 5], [1.04, 1], { extrapolateRight: "clamp" }) : 1})`, transformOrigin: "50% 0%", textTransform: "none", textShadow: "0 4px 0 rgba(4,6,14,0.9), 0 0 34px rgba(4,6,14,0.85)" }}>
            {p.lines.map((ln, j) => { const v = <LineView key={j} ln={ln} outF={outF} base={base} />; base += ln.w.length; return v; })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
