import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import { FPS, fromFrame, lenFrames, shotById } from "./film/pf";
import { Kinetic } from "./film/Kinetic";
import { ProcShot } from "./film/ProcCanvas";
import { Trans, TransKind } from "./film/Trans";

// WHY WE WONDER · episode 9: Struck 7 Times (Roy Sullivan). Hard cuts on the strikes; the bolt is the curiosity line.
const OV = 8; // transition overlap in frames
const SHOTS: { id: string; t?: TransKind }[] = [
  { id: "hook" }, { id: "chase" }, { id: "ranger", t: { kind: "iris", x: 540, y: 1100 } }, { id: "places" }, { id: "burns" },
  { id: "cloud", t: { kind: "diag" } }, { id: "wife" }, { id: "fish", t: { kind: "split" } }, { id: "outro", t: { kind: "iris", x: 540, y: 1150 } },
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
    <Sequence name="kinetic type"><Kinetic /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
