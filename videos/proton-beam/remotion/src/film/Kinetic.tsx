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
  // HOOK — the whole idea on frame 1
  { top: 110, out: 1.6, lines: [
    { size: 100, w: [w("A", 0, { fx: "hold" }), w("PROTON", 0, { fx: "hold", em: true }), w("BEAM", 0, { fx: "hold" })] },
    { size: 112, w: [w("SHOT", 0, { fx: "hold", c: "y" }), w("THROUGH", 0, { fx: "hold", c: "y" })] },
    { size: 156, w: [w("HIS", 0, { fx: "hold", c: "y" }), w("HEAD.", 0, { fx: "hold", c: "y", em: true })] },
  ] },
  { top: 170, out: 3.1, lines: [{ size: 118, w: [w("SOVIET", 2.04), w("UNION", 2.3, { c: "y" })] }] },
  { top: 150, out: 4.1, lines: [{ size: 118, w: [w("PARTICLE", 3.3)] }, { size: 112, w: [w("ACCELERATOR", 3.45, { c: "y" })] }] },
  { top: 170, out: 6.8, lines: [{ size: 116, w: [w("HE", 5.56), w("LEANED", 5.6), w("IN", 5.95, { c: "y" })] }] },
  { top: 150, out: 8.2, lines: [{ size: 118, w: [w("TO", 6.95), w("CHECK", 7.17)] }, { size: 108, w: [w("A", 7.4, { c: "y" }), w("BROKEN", 7.62, { c: "y", em: true }), w("PART.", 8.01, { c: "y" })] }] },
  { top: 150, out: 10.1, lines: [{ size: 112, w: [w("THE", 8.53), w("SAFETY", 8.73)] }, { size: 124, w: [w("SYSTEM", 9.21, { c: "y" })] }] },
  { top: 150, out: 11.55, lines: [{ size: 120, w: [w("THE", 10.41), w("BEAM", 10.64)] }, { size: 116, w: [w("WAS", 10.88), w("STILL", 11.11, { c: "y", em: true }), w("ON.", 11.35, { c: "y" })] }] },
  // PUNCH — the flash on the drop
  { top: 140, out: 13.45, lines: [{ size: 170, w: [w("A", 12.04, { fx: "slam" }), w("FLASH", 12.04, { fx: "slam" })] }, { size: 96, w: [w("BRIGHTER", 12.56, { c: "y" }), w("THAN", 13.01, { c: "y" })] }] },
  { top: 720, out: 14.2, lines: [{ size: 230, w: [w("1,000", 13.53, { fx: "pop", c: "y" })] }, { size: 90, mono: true, w: [w("SUNS", 13.99, { mono: true })] }] },
  { top: 140, out: 15.25, gap: 18, lines: [
    { size: 120, mono: true, w: [w("PAIN:", 14.2, { mono: true }), w("0", 14.25, { mono: true, c: "r", fx: "slam" })] },
    { size: 100, w: [w("HE", 14.42), w("FELT", 14.55), w("NOTHING.", 14.77, { c: "y", em: true })] },
  ] },
  { top: 150, out: 16.7, lines: [{ size: 112, w: [w("THE", 15.53), w("DOSE", 15.75), w("WAS", 15.97)] }, { size: 150, w: [w("ENORMOUS.", 16.19, { c: "y", fx: "pop" })] }] },
  { top: 150, out: 18.4, lines: [{ size: 96, split: [17.1, 1], w: [w("HALF", 16.98), w("HIS", 17.17), w("FACE", 17.37)] }, { size: 118, w: [w("SWELLED", 17.56, { c: "y" }), w("UP.", 17.9, { c: "y" })] }] },
  { top: 150, out: 21.1, lines: [{ size: 104, w: [w("SENT", 18.85), w("TO", 19.22), w("A", 19.4), w("CLINIC", 19.59)] }, { size: 160, w: [w("TO", 20.19, { c: "r" }), w("DIE.", 20.44, { c: "r", fx: "slam" })] }] },
  // RESOLVE
  { top: 170, out: 22.95, lines: [{ size: 176, w: [w("HE", 21.5, { fx: "slam" }), w("DIDN'T.", 21.5, { fx: "slam", c: "y" })] }] },
  { top: 170, out: 24.15, lines: [{ size: 104, w: [w("FINISHED", 23.2), w("HIS", 23.39), w("PhD", 23.5, { c: "y", fx: "pop" })] }] },
  { top: 170, out: 24.9, lines: [{ size: 112, w: [w("BACK", 24.39), w("TO", 24.64), w("WORK", 24.88, { c: "y" })] }] },
  { top: 150, out: 26.9, lines: [{ size: 112, w: [w("AT", 25.13), w("THE", 25.38), w("SAME", 25.63)] }, { size: 150, w: [w("MACHINE.", 25.88, { c: "y", em: true })] }] },
  // outro fact (under his head)
  { top: 1060, out: 30.4, gap: 6, lines: [
    { size: 76, w: [w("THE", 27.05), w("ONLY", 27.46, { c: "y" }), w("PERSON", 27.83)] },
    { size: 76, w: [w("KNOWN", 28.19), w("TO", 28.39), w("BE", 28.6), w("HIT", 29.02)] },
    { size: 76, w: [w("BY", 29.22), w("A", 29.43), w("PARTICLE", 29.64, { c: "y" }), w("BEAM.", 30.0, { c: "y" })] },
  ] },
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
