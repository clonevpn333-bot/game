import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Stage } from "./three/Stage";
import { Overlay } from "./Overlay";
// @ts-ignore
import { makeFilm } from "./three/film.js";

export const Film: React.FC<{ score: boolean }> = ({ score }) => (
  <AbsoluteFill style={{ backgroundColor: "#0a0814" }}>
    <Stage make={makeFilm} />
    <Overlay />
    <Audio src={staticFile("vo.wav")} />
    {score ? <Audio src={staticFile("score.wav")} /> : null}
  </AbsoluteFill>
);
