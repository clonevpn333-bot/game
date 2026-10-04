import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "@fontsource/fraunces/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
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

// WHY WE WONDER · episode 3. Woodcut 2D world (procedural Canvas) + Pip (three.js) + PiPs, edited in Remotion.
const S = (id: string) => ({ from: fromFrame(shotById(id)), durationInFrames: lenFrames(shotById(id)), name: id });
const st = (id: string) => shotById(id).start;

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#04060B" }}>
    <Sequence {...S("street-1518")}><Shot01 start={st("street-1518")} /></Sequence>
    <Sequence {...S("she-dances")}><Shot02 start={st("she-dances")} /></Sequence>
    <Sequence {...S("no-music")}><Shot03 start={st("no-music")} /></Sequence>
    <Sequence {...S("the-crowd")}><Shot04 start={st("the-crowd")} /></Sequence>
    <Sequence {...S("the-cure")}><Shot05 start={st("the-cure")} /></Sequence>
    <Sequence {...S("worse")}><Shot06 start={st("worse")} /></Sequence>
    <Sequence {...S("ergot")}><Shot07 start={st("ergot")} /></Sequence>
    <Sequence {...S("fear")}><Shot08 start={st("fear")} /></Sequence>
    <Sequence {...S("mind-dance")}><Shot09 start={st("mind-dance")} /></Sequence>
    <Sequence {...S("outro")}><Shot10 start={st("outro")} /></Sequence>
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
