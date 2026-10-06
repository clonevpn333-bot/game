import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import { FPS, fromFrame, lenFrames, shotById } from "./film/pf";
import { Captions } from "./film/Captions";
import { ProcShot } from "./film/ProcCanvas";
import { Trans, TransKind } from "./film/Trans";

// WHY WE WONDER · episode 6: the Man in the Iron Mask. Engraved 2D + engraved 3D (bust, Bastille), clean shape transitions.
const OV = 8; // transition overlap in frames
const SHOTS: { id: string; t?: TransKind }[] = [
  { id: "hook" },
  { id: "king", t: { kind: "keyhole", x: 475, y: 885 } },
  { id: "locked", t: { kind: "iris", x: 540, y: 820 } },
  { id: "order", t: { kind: "iris", x: 540, y: 1500 } },
  { id: "prisons", t: { kind: "diag" } },
  { id: "jailer", t: { kind: "split" } },
  { id: "hidden", t: { kind: "iris", x: 540, y: 900 } },
  { id: "bastille", t: { kind: "iris", x: 600, y: 600 } },
  { id: "burned", t: { kind: "rise" } },
  { id: "twin", t: { kind: "split" } },
  { id: "velvet", t: { kind: "iris", x: 810, y: 820 } },
  { id: "outro" },
];

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#04060B" }}>
    {SHOTS.map(({ id, t }) => {
      const s = shotById(id), from = fromFrame(s), len = lenFrames(s);
      if (!t) return <Sequence key={id} from={from} durationInFrames={len} name={id}><ProcShot id={id} /></Sequence>;
      return (
        <Sequence key={id} from={from - OV} durationInFrames={len + OV} name={id}>
          <Trans t={t} frames={OV}><ProcShot id={id} lead={OV / FPS} /></Trans>
        </Sequence>
      );
    })}
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
