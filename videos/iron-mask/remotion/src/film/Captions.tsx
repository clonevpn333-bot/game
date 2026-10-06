import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import raw from "./captions.json";
import { SHOTS } from "./pf";

// HOMO CURIOSUS captions: Fraunces, 2–4 words per page, the spoken word lit in curiosity yellow.
// Each page sits in its shot's caption band (docs/storyboard.md) so it never covers the subject.
type Cap = Caption & { line: number };
const CAPS = raw as Cap[];

const BAND: Record<string, number | null> = {
  "hook": null, "king": 1390, "locked": 1100, "order": 1400, "prisons": 1330, "bastille": 1330, "burned": 1330,
  "twin": null, "velvet": 1330, "outro": null,
};

type Page = { words: Cap[]; startMs: number; endMs: number };

function paginate(caps: Cap[]): Page[] {
  const pages: Page[] = [];
  const byLine = new Map<number, Cap[]>();
  caps.forEach((c) => byLine.set(c.line, [...(byLine.get(c.line) ?? []), c]));
  for (const words of byLine.values()) {
    let cur: Cap[] = [];
    words.forEach((w, i) => {
      cur.push(w);
      const punct = /[,.?!]$/.test(w.text.trim());
      const left = words.length - i - 1;
      if ((cur.length >= 4 || (punct && cur.length >= 2) || (cur.length >= 3 && left === 1 ? false : cur.length >= 3 && left >= 2)) && left !== 1) {
        pages.push({ words: cur, startMs: cur[0].startMs, endMs: w.endMs });
        cur = [];
      }
    });
    if (cur.length) pages.push({ words: cur, startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs });
  }
  // a page holds until the next page starts (or 350 ms after its last word, whichever is first)
  return pages.map((p, i) => ({ ...p, endMs: Math.min(p.endMs + 350, pages[i + 1]?.startMs ?? Infinity) }));
}

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const pages = useMemo(() => paginate(CAPS), []);
  const page = pages.find((p) => ms >= p.startMs - 40 && ms < p.endMs);
  if (!page) return null;
  const shot = SHOTS.find((s) => page.startMs / 1000 >= s.start && page.startMs / 1000 < s.end);
  const top = shot ? BAND[shot.id] : null;
  if (top == null) return null;
  const navy = shot?.mode === "schematic";
  const pageIn = interpolate(ms, [page.startMs - 40, page.startMs + 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pageOut = interpolate(ms, [page.endMs - 90, page.endMs], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          left: 70,
          right: 70,
          height: 120,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0 22px",
          fontFamily: "Fraunces",
          fontWeight: 600,
          fontSize: 66,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          opacity: Math.min(pageIn, pageOut),
        }}
      >
        {page.words.map((w) => {
          const k = interpolate(ms, [w.startMs - 30, w.startMs + 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const lit = ms >= w.startMs - 30 && ms < w.endMs + 60;
          return (
            <span
              key={w.startMs}
              style={{
                display: "inline-block",
                color: lit ? "#F2C230" : "#F2E8D0",
                WebkitTextStroke: navy ? "0px transparent" : "12px #1F1610",
                paintOrder: "stroke fill",
                textShadow: navy ? "0 0 26px rgba(7,12,30,0.95), 0 4px 0 #070C1E" : "0 6px 0 #1F1610",
                transform: `translateY(${(1 - k) * 18}px) rotate(${(1 - k) * -2}deg)`,
                opacity: 0.25 + 0.75 * k,
              }}
            >
              {w.text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
