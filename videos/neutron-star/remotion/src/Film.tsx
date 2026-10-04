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
import { Shot11 } from "./scenes/Shot11";

// WHY WE WONDER · episode 4: the neutron star. Blueprint-navy 2D + per-pixel 3D bodies (procedural Canvas) + PiPs.
const S = (id: string) => ({ from: fromFrame(shotById(id)), durationInFrames: lenFrames(shotById(id)), name: id });
const st = (id: string) => shotById(id).start;

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#04060B" }}>
    <Sequence {...S("teaspoon")}><Shot01 start={st("teaspoon")} /></Sequence>
    <Sequence {...S("reveal")}><Shot02 start={st("reveal")} /></Sequence>
    <Sequence {...S("supernova")}><Shot03 start={st("supernova")} /></Sequence>
    <Sequence {...S("the-sun")}><Shot04 start={st("the-sun")} /></Sequence>
    <Sequence {...S("city")}><Shot05 start={st("city")} /></Sequence>
    <Sequence {...S("spin")}><Shot06 start={st("spin")} /></Sequence>
    <Sequence {...S("pen-drop")}><Shot07 start={st("pen-drop")} /></Sequence>
    <Sequence {...S("craziest")}><Shot08 start={st("craziest")} /></Sequence>
    <Sequence {...S("crash")}><Shot09 start={st("crash")} /></Sequence>
    <Sequence {...S("ring")}><Shot10 start={st("ring")} /></Sequence>
    <Sequence {...S("outro")}><Shot11 start={st("outro")} /></Sequence>
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
