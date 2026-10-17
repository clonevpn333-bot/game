import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Clean shape transitions: the incoming shot is revealed through an animated clip shape with a thin gold edge.
export type TransKind = { kind: "iris" | "keyhole" | "diag" | "split" | "rise"; x?: number; y?: number };
const W = 1080, H = 1920, GOLD = "#F2C230";
const ease = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p));

function keyholePath(x: number, y: number, s: number) {
  // circle (r 60) over a flared stem, unit keyhole scaled by s around (x, y)
  const r = 60 * s, top = y - 40 * s;
  const k = 0.5523 * r;
  const stem = `L ${x + 34 * s} ${y + 10 * s} L ${x + 72 * s} ${y + 140 * s} L ${x - 72 * s} ${y + 140 * s} L ${x - 34 * s} ${y + 10 * s} `;
  return `M ${x - 34 * s} ${y + 10 * s} C ${x - r} ${top + k} ${x - r} ${top - r + 0} ${x} ${top - r} C ${x + r} ${top - r} ${x + r} ${top + k} ${x + 34 * s} ${y + 10 * s} ` + stem + "Z";
}

export const Trans: React.FC<{ t: TransKind; frames: number; children: React.ReactNode }> = ({ t, frames, children }) => {
  const f = useCurrentFrame();
  const p = ease(f / frames);
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const x = t.x ?? W / 2, y = t.y ?? H / 2;
  let clip = "", edge: React.ReactNode = null;
  if (t.kind === "iris") {
    const r = 2300 * p * p;
    clip = `circle(${r}px at ${x}px ${y}px)`;
    edge = <circle cx={x} cy={y} r={r} fill="none" stroke={GOLD} strokeWidth={6} />;
  } else if (t.kind === "keyhole") {
    const s = 0.05 + 40 * p * p * p;
    const d = keyholePath(x, y, s);
    clip = `path('${d}')`;
    edge = <path d={d} fill="none" stroke={GOLD} strokeWidth={6} />;
  } else if (t.kind === "diag") {
    const e = -700 + (W + 1400) * p;
    clip = `polygon(0px 0px, ${e + 700}px 0px, ${e}px ${H}px, 0px ${H}px)`;
    edge = <line x1={e + 700} y1={0} x2={e} y2={H} stroke={GOLD} strokeWidth={6} />;
  } else if (t.kind === "split") {
    const h = (W / 2) * p;
    clip = `inset(0px ${W / 2 - h}px 0px ${W / 2 - h}px)`;
    edge = <g stroke={GOLD} strokeWidth={6}><line x1={W / 2 - h} y1={0} x2={W / 2 - h} y2={H} /><line x1={W / 2 + h} y1={0} x2={W / 2 + h} y2={H} /></g>;
  } else {
    const e = H * (1 - p);
    clip = `inset(${e}px 0px 0px 0px)`;
    edge = <line x1={0} y1={e} x2={W} y2={e} stroke={GOLD} strokeWidth={6} />;
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>
      <AbsoluteFill><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{edge}</svg></AbsoluteFill>
    </AbsoluteFill>
  );
};
