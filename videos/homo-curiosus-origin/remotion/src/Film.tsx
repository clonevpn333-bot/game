import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "@fontsource/fraunces/600.css";
import "@fontsource/jetbrains-mono/500.css";
import { fromFrame, lenFrames, shotById } from "./film/pf";
import { Captions } from "./film/Captions";
import { Shot01 } from "./scenes/Shot01";
import { Shot02 } from "./scenes/Shot02";
import { Shot03 } from "./scenes/Shot03";
import { Shot04 } from "./scenes/Shot04";
import { Shot05 } from "./scenes/Shot05";
import { Shot06 } from "./scenes/Shot06";
import { Shot07 } from "./scenes/Shot07";
import { Shot08 } from "./scenes/Shot08";
import { Shot09 } from "./scenes/Shot09";
import { Shot10 } from "./scenes/Shot10";

// HOMO CURIOSUS — origin. Remotion is the editor: shot order, exact frames, audio, captions.
// Every shot is its own component (src/scenes/ShotNN.tsx) and can be rebuilt alone.
const S = (id: string) => ({ from: fromFrame(shotById(id)), durationInFrames: lenFrames(shotById(id)), name: id });

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#070C1E" }}>
    <Sequence {...S("cave-hand")}><Shot01 /></Sequence>
    <Sequence {...S("ochre-breath")}><Shot02 /></Sequence>
    <Sequence {...S("question-wall")}><Shot03 /></Sequence>
    <Sequence {...S("star-lines")}><Shot04 /></Sequence>
    <Sequence {...S("bronze-computer")}><Shot05 /></Sequence>
    <Sequence {...S("twelve-seconds")}><Shot06 /></Sequence>
    <Sequence {...S("line-to-moon")}><Shot07 /></Sequence>
    <Sequence {...S("bigger-question")}><Shot08 /></Sequence>
    <Sequence {...S("homo-curiosus")}><Shot09 /></Sequence>
    <Sequence {...S("stay-curious")}><Shot10 /></Sequence>
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
