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
  // HOOK — on frame 1
  { top: 110, out: 2.0, lines: [
    { size: 120, w: [w("SHE", 0, { fx: "hold" }), w("FELL", 0, { fx: "hold" })] },
    { size: 138, w: [w("33,000", 0, { fx: "hold", c: "y", em: true }), w("FEET.", 0, { fx: "hold", c: "y" })] },
  ] },
  { top: 170, out: 2.75, lines: [{ size: 112, w: [w("NO", 2.16, { fx: "slam", c: "r" }), w("PARACHUTE.", 2.16, { fx: "slam", c: "r" })] }] },
  // SECOND HOOK on the 3.0 hit
  { top: 110, out: 5.4, lines: [
    { size: 96, w: [w("AND", 3.0, { fx: "slam" }), w("SHE", 3.0, { fx: "slam" }), w("WAS", 3.0, { fx: "slam" })] },
    { size: 112, w: [w("NEVER", 3.6, { c: "y", em: true }), w("SUPPOSED", 3.92, { c: "y" })] },
    { size: 88, w: [w("TO", 4.38), w("BE", 4.56), w("ON", 4.75), w("THAT", 4.93), w("PLANE.", 5.12)] },
  ] },
  { top: 140, out: 6.85, lines: [{ size: 108, w: [w("THE", 5.54), w("AIRLINE", 5.76)] }, { size: 112, w: [w("CONFUSED", 6.14, { c: "y", em: true }), w("HER", 6.68, { c: "y" })] }] },
  { top: 110, out: 8.85, lines: [{ size: 96, w: [w("WITH", 6.9), w("ANOTHER", 7.12)] }, { size: 92, w: [w("STEWARDESS", 7.66)] }, { size: 112, w: [w("NAMED", 8.2), w("VESNA.", 8.58, { c: "y", em: true })] }] },
  { top: 130, out: 10.75, lines: [{ size: 220, w: [w("1972", 9.3, { fx: "pop", c: "y" })] }] },
  // THE BLAST
  { top: 120, out: 12.6, lines: [{ size: 160, w: [w("A", 11.0, { fx: "slam" }), w("BLAST", 11.0, { fx: "slam", c: "y" })] }, { size: 88, w: [w("TORE", 11.45), w("HER", 11.68), w("JET", 11.9), w("APART.", 12.13, { c: "y" })] }] },
  { top: 150, out: 13.95, lines: [{ size: 104, w: [w("EVERYONE", 12.78), w("ELSE", 13.32)] }, { size: 140, w: [w("DIED.", 13.54, { c: "r", fx: "pop" })] }] },
  { top: 130, out: 15.4, lines: [{ size: 120, w: [w("SHE", 14.09), w("FELL,", 14.34, { c: "y" })] }, { size: 104, w: [w("PINNED", 14.82), w("INSIDE", 15.16)] }] },
  { top: 130, out: 16.9, lines: [{ size: 100, w: [w("THE", 15.55), w("WRECKAGE", 15.69)] }, { size: 104, w: [w("BY", 16.02), w("A", 16.22), w("FOOD", 16.41, { c: "y", em: true }), w("CART.", 16.61, { c: "y" })] }] },
  // THE CRASH
  { top: 120, out: 18.5, lines: [{ size: 120, w: [w("IT", 17.0, { fx: "slam" }), w("HIT", 17.0, { fx: "slam" }), w("A", 17.46)] }, { size: 120, w: [w("SNOWY", 17.67, { c: "y" }), w("FOREST.", 18.04, { c: "y" })] }] },
  { top: 120, out: 20.15, lines: [{ size: 108, w: [w("A", 18.69), w("VILLAGER", 18.89)] }, { size: 90, w: [w("HEARD", 19.39), w("SCREAMING.", 19.59, { c: "y", em: true })] }] },
  { top: 140, out: 21.15, lines: [{ size: 112, w: [w("FRACTURED", 20.3)] }, { size: 140, w: [w("SKULL.", 20.8, { c: "r" })] }] },
  { top: 140, out: 22.05, lines: [{ size: 112, w: [w("BROKEN", 21.28)] }, { size: 140, w: [w("LEGS.", 21.7, { c: "r" })] }] },
  { top: 160, out: 22.95, lines: [{ size: 220, w: [w("ALIVE.", 22.18, { fx: "slam", c: "y" })] }] },
  { top: 110, out: 24.3, lines: [{ size: 100, w: [w("SHE", 23.04), w("SET", 23.28), w("THE", 23.51)] }, { size: 120, w: [w("WORLD", 23.75, { c: "y" }), w("RECORD.", 23.99, { c: "y", em: true })] }] },
  { top: 110, out: 26.6, lines: [{ size: 96, w: [w("HIGHEST", 24.63), w("FALL", 25.05)] }, { size: 108, w: [w("EVER", 25.28), w("SURVIVED.", 25.69, { c: "y" })] }] },
  // CLIFFHANGER
  { top: 130, out: 28.15, lines: [{ size: 104, w: [w("BUT", 27.04), w("DECADES", 27.27)] }, { size: 120, w: [w("LATER,", 27.84, { c: "y" })] }] },
  { top: 130, out: 29.2, lines: [{ size: 104, w: [w("TWO", 28.25), w("JOURNALISTS", 28.48)] }, { size: 112, w: [w("SAID", 28.8)] }] },
  { top: 110, out: 30.7, lines: [{ size: 112, w: [w("THAT", 29.28), w("RECORD...", 29.51)] }, { size: 170, w: [w("WAS", 30.06, { c: "r" }), w("A", 30.18, { c: "r" }), w("LIE.", 30.28, { c: "r", fx: "slam" })] }] },
  // OUTRO — the reason to follow
  { top: 1052, out: 35.3, lines: [{ size: 112, w: [w("SUBSCRIBE", 31.0, { fx: "slam" })] }] },
  { top: 1215, out: 35.3, lines: [{ size: 104, w: [w("FOR", 31.8), w("PART", 32.0, { c: "y" }), w("2", 32.25, { c: "y", fx: "pop" })] }] },
  { top: 120, out: 35.3, lines: [{ size: 64, mono: true, w: [w("PART 2:", 32.75, { mono: true })] }, { size: 96, w: [w("WAS", 33.0), w("IT", 33.15), w("A", 33.3), w("COVER-UP?", 33.45, { c: "y", em: true })] }] },
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
