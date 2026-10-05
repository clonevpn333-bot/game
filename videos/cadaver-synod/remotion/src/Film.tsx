import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "@fontsource/fraunces/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/unifrakturmaguntia/400.css";
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
import { Shot12 } from "./scenes/Shot12";
import { Shot13 } from "./scenes/Shot13";

// WHY WE WONDER · episode 5: the Cadaver Synod. Dark-fantasy engraving 2D + 3D nave/shards/tumbling bones (procedural Canvas).
const S = (id: string) => ({ from: fromFrame(shotById(id)), durationInFrames: lenFrames(shotById(id)), name: id });
const st = (id: string) => shotById(id).start;

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#04060B" }}>
    <Sequence {...S("hook")}><Shot01 start={st("hook")} /></Sequence>
    <Sequence {...S("rome")}><Shot02 start={st("rome")} /></Sequence>
    <Sequence {...S("popes")}><Shot03 start={st("popes")} /></Sequence>
    <Sequence {...S("exhume")}><Shot04 start={st("exhume")} /></Sequence>
    <Sequence {...S("nave")}><Shot05 start={st("nave")} /></Sequence>
    <Sequence {...S("deacon")}><Shot06 start={st("deacon")} /></Sequence>
    <Sequence {...S("guilty")}><Shot07 start={st("guilty")} /></Sequence>
    <Sequence {...S("fingers")}><Shot08 start={st("fingers")} /></Sequence>
    <Sequence {...S("tiber")}><Shot09 start={st("tiber")} /></Sequence>
    <Sequence {...S("uprising")}><Shot10 start={st("uprising")} /></Sequence>
    <Sequence {...S("prison")}><Shot11 start={st("prison")} /></Sequence>
    <Sequence {...S("title")}><Shot12 start={st("title")} /></Sequence>
    <Sequence {...S("outro")}><Shot13 start={st("outro")} /></Sequence>
    <Sequence name="captions"><Captions /></Sequence>
    <Audio src={staticFile("vo.wav")} name="narration" />
    {score ? <Audio src={staticFile("score.wav")} name="score" volume={0.42} /> : null}
  </AbsoluteFill>
);
