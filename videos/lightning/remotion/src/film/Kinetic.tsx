import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// WHY WE WONDER · kinetic typography layer (replaces subtitle captions). Every on-screen word is a designed word:
// it rises into a line mask on the frame it is spoken (spring), emphasis words land in curiosity yellow with an
// underline that draws on, big beats SLAM in on the music hit, and each phrase exits upward, staggered word by word.
// Copy is segmented by meaning (Hook → Build → Punch → Resolve), 1–2 emphasis words per phrase.

type Fx = "rise" | "slam" | "hold" | "pop";
type W = { t: string; at: number; c?: "y" | "r" | "i" | "cy"; fx?: Fx; em?: boolean; mono?: boolean };
type Line = { w: W[]; size: number; split?: [number, number]; mono?: boolean };
type Phrase = { top: number; out: number; lines: Line[]; gap?: number; cut?: boolean };

const Y = "#F2C230", IV = "#F2E8D0", RED = "#FF5A40", CY = "#9FE6F2";
const col = (c?: W["c"]) => (c === "y" ? Y : c === "r" ? RED : c === "cy" ? CY : IV);
const w = (t: string, at: number, o: Partial<W> = {}): W => ({ t, at, ...o });

// onsets from vo/assets/timing.json (locked to the 120 bpm grid)
const PHRASES: Phrase[] = [
  // HOOK — on frame 1, the counter slams with every strike
  { top: 90, out: 2.85, lines: [
    { size: 96, w: [w("THIS", 0, { fx: "hold" }), w("MAN", 0, { fx: "hold" }), w("WAS", 0, { fx: "hold" })] },
    { size: 104, w: [w("STRUCK", 0, { fx: "hold", c: "y" }), w("BY", 0, { fx: "hold" })] },
    { size: 124, w: [w("LIGHTNING", 0, { fx: "hold", c: "y", em: true })] },
  ] },
  { top: 520, out: 0.5, cut: true, lines: [{ size: 210, w: [w("×1", 0, { fx: "hold", c: "y" })] }] },
  { top: 520, out: 0.9, cut: true, lines: [{ size: 210, w: [w("×2", 0.5, { fx: "slam", c: "y" })] }] },
  { top: 520, out: 1.15, cut: true, lines: [{ size: 210, w: [w("×3", 0.9, { fx: "slam", c: "y" })] }] },
  { top: 520, out: 1.35, cut: true, lines: [{ size: 210, w: [w("×4", 1.15, { fx: "slam", c: "y" })] }] },
  { top: 520, out: 1.55, cut: true, lines: [{ size: 210, w: [w("×5", 1.35, { fx: "slam", c: "y" })] }] },
  { top: 520, out: 1.75, cut: true, lines: [{ size: 210, w: [w("×6", 1.55, { fx: "slam", c: "y" })] }] },
  { top: 500, out: 2.85, lines: [{ size: 230, w: [w("7", 1.75, { fx: "slam", c: "r" })] }, { size: 120, w: [w("TIMES.", 2.2, { fx: "slam", c: "r" })] }] },
  // SECOND HOOK
  { top: 110, out: 5.35, lines: [{ size: 104, w: [w("AND", 3.0, { fx: "slam" }), w("HE", 3.0, { fx: "slam" }), w("SWORE", 3.52)] }, { size: 112, w: [w("A", 3.76, { c: "y" }), w("STORM", 4.0, { c: "y" }), w("CLOUD", 4.24, { c: "y" })] }, { size: 140, w: [w("CHASED", 4.47, { fx: "slam", c: "r" }), w("HIM.", 4.89, { c: "r" })] }] },
  { top: 120, out: 7.45, lines: [{ size: 112, w: [w("ROY", 5.54, { c: "y" }), w("SULLIVAN", 5.79, { c: "y" })] }, { size: 92, w: [w("WAS", 6.42), w("A", 6.68), w("PARK", 6.93), w("RANGER.", 7.18)] }] },
  { top: 120, out: 9.6, lines: [{ size: 140, w: [w("LIGHTNING", 7.62, { fx: "slam", c: "y" })] }, { size: 104, w: [w("FOUND", 8.07), w("HIM", 8.32)] }, { size: 120, w: [w("EVERYWHERE.", 8.57, { fx: "pop", c: "y", em: true })] }] },
  { top: 130, out: 10.9, lines: [{ size: 100, w: [w("IN", 9.79), w("A", 10.04)] }, { size: 140, w: [w("FIRE", 10.29, { fx: "slam", c: "y" }), w("TOWER.", 10.54, { fx: "slam", c: "y" })] }] },
  { top: 130, out: 11.68, lines: [{ size: 100, w: [w("IN", 10.97), w("HIS", 11.22)] }, { size: 150, w: [w("TRUCK.", 11.3, { fx: "slam", c: "y" })] }] },
  { top: 130, out: 13.15, lines: [{ size: 100, w: [w("IN", 11.72), w("HIS", 11.96), w("OWN", 12.21)] }, { size: 130, w: [w("FRONT", 12.3, { fx: "slam", c: "y" }), w("YARD.", 12.71, { c: "y" })] }] },
  { top: 110, out: 14.65, lines: [{ size: 100, w: [w("IT", 13.28), w("BURNED", 13.47), w("OFF", 13.81)] }, { size: 116, w: [w("HIS", 14.0), w("EYEBROWS,", 14.19, { c: "y", em: true })] }] },
  { top: 110, out: 16.25, lines: [{ size: 96, w: [w("AND", 14.74), w("SET", 14.96), w("HIS", 15.17), w("HAIR", 15.39, { c: "y" })] }, { size: 150, w: [w("ON", 15.61, { fx: "slam", c: "r" }), w("FIRE.", 15.82, { fx: "slam", c: "r" })] }] },
  { top: 130, out: 17.15, lines: [{ size: 220, w: [w("TWICE.", 16.38, { fx: "slam", c: "y" })] }] },
  { top: 110, out: 18.85, lines: [{ size: 100, w: [w("ONE", 17.27), w("DAY", 17.5), w("HE", 17.74), w("SAW", 17.97)] }, { size: 120, w: [w("A", 18.2, { c: "y" }), w("DARK", 18.44, { c: "y" }), w("CLOUD.", 18.67, { c: "y" })] }] },
  { top: 130, out: 19.7, lines: [{ size: 120, w: [w("HE", 18.9), w("DROVE", 19.14)] }, { size: 130, w: [w("AWAY.", 19.37, { fx: "pop" })] }] },
  { top: 130, out: 20.95, lines: [{ size: 110, w: [w("IT", 19.77)] }, { size: 160, w: [w("FOLLOWED", 20.01, { fx: "slam", c: "r" })] }, { size: 110, w: [w("HIM.", 20.59, { c: "r" })] }] },
  { top: 120, out: 22.35, lines: [{ size: 104, w: [w("HE", 21.05), w("STEPPED", 21.21), w("OUT", 21.48)] }, { size: 96, w: [w("OF", 21.64), w("THE", 21.8), w("TRUCK...", 21.96)] }] },
  { top: 120, out: 23.65, lines: [{ size: 104, w: [w("AND", 22.38), w("THE", 22.5), w("BOLT", 22.6, { c: "y" })] }, { size: 240, w: [w("HIT.", 23.0, { fx: "slam", c: "y" })] }] },
  { top: 110, out: 26.4, lines: [{ size: 108, w: [w("EVEN", 23.78), w("HIS", 24.16), w("WIFE", 24.38, { c: "y", em: true })] }, { size: 140, w: [w("GOT", 24.6), w("STRUCK,", 24.82, { fx: "slam", c: "r" })] }, { size: 92, w: [w("HANGING", 25.29), w("LAUNDRY.", 25.71, { c: "y" })] }] },
  { top: 130, out: 27.6, lines: [{ size: 120, w: [w("STRIKE", 26.53, { fx: "slam" })] }, { size: 200, w: [w("SEVEN:", 26.78, { fx: "slam", c: "y" })] }] },
  { top: 140, out: 28.35, lines: [{ size: 120, w: [w("HE", 27.21), w("WAS", 27.45)] }, { size: 130, w: [w("FISHING.", 27.7, { c: "y" })] }] },
  { top: 110, out: 30.65, lines: [{ size: 108, w: [w("THEN", 28.44), w("A", 28.65), w("BEAR", 28.86, { c: "y", em: true })] }, { size: 96, w: [w("TRIED", 29.07), w("TO", 29.28), w("STEAL", 29.49)] }, { size: 140, w: [w("HIS", 29.7), w("TROUT.", 29.91, { fx: "slam", c: "y" })] }] },
  // OUTRO — the question
  { top: 110, out: 33.05, lines: [{ size: 100, w: [w("WOULD", 30.78), w("YOU", 31.01), w("STAND", 31.25)] }, { size: 100, w: [w("NEXT", 31.48), w("TO", 31.71), w("HIM", 31.95)] }, { size: 140, w: [w("IN", 32.18, { c: "y" }), w("A", 32.41, { c: "y" }), w("STORM?", 32.65, { fx: "pop", c: "y", em: true })] }] },
  { top: 1366, out: 35.8, lines: [{ size: 84, w: [w("SUBSCRIBE", 34.8, { fx: "slam" }), w("FOR", 35.0), w("MORE", 35.1, { c: "y" })] }] },
];

const LEAD = 2; // frames: a word starts moving just before it is heard

const Word: React.FC<{ wd: W; idx: number; outF: number; size: number; mono?: boolean }> = ({ wd, idx, outF, size, mono }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = Math.round(wd.at * fps) - LEAD;
  const fx = wd.fx || "rise";
  const s = fx === "hold" ? 1 : spring({ frame: frame - f0, fps, config: fx === "slam" ? { damping: 12, stiffness: 320, mass: 0.45 } : { damping: 15, stiffness: 240, mass: 0.5 } });
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
        if (p.cut && frame >= Math.round(p.out * fps)) return null;   // hard cut (strike counter)
        const outF = p.cut ? 1e9 : Math.round(p.out * fps);
        // a slam shakes the whole phrase for a few frames
        const sl = p.lines.flatMap((l) => l.w).find((x) => x.fx === "slam");
        const sd = sl ? frame - Math.round(sl.at * fps) : 99;
        const shake = sd >= 0 && sd < 8 ? Math.sin(sd * 2.6) * (8 - sd) * 2.4 : 0;
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
