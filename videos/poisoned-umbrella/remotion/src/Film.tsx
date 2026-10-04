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

// THE POISONED UMBRELLA (WHY WE WONDER). Remotion edits: shot order, frames, audio, captions.
const S = (id: string) => ({ from: fromFrame(shotById(id)), durationInFrames: lenFrames(shotById(id)), name: id });

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#04060B" }}>
    <Sequence {...S("rain-hook")}><Shot01 /></Sequence>
    <Sequence {...S("bridge-1978")}><Shot02 /></Sequence>
    <Sequence {...S("the-sting")}><Shot03 /></Sequence>
    <Sequence {...S("four-days")}><Shot04 /></Sequence>
    <Sequence {...S("pinhead-dive")}><Shot05 /></Sequence>
    <Sequence {...S("pellet")}><Shot06 /></Sequence>
    <Sequence {...S("ricin")}><Shot07 /></Sequence>
    <Sequence {...S("evidence")}><Shot08 /></Sequence>
    <Sequence {...S("umbrella-gun")}><Shot09 /></Sequence>
    <Sequence {...S("no-one")}><Shot10 /></Sequence>
    <Sequence {...S("weapon-end")}><Shot11 /></Sequence>
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
