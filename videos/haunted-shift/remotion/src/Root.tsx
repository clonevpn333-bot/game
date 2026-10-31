import React from "react";
import { Composition } from "remotion";
import { Stage } from "./three/Stage";
import { Film } from "./Film";
// @ts-ignore
import { makeLab } from "./three/lab.js";
// @ts-ignore
import { makeFilm } from "./three/film.js";

const World: React.FC = () => <Stage make={makeFilm} />;
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="HauntedShift" component={Film} durationInFrames={30 * 61} fps={30} width={1080} height={1920} defaultProps={{ score: true }} />
    <Composition id="World" component={World} durationInFrames={30 * 61} fps={30} width={1080} height={1920} />
    <Composition id="Lab" component={() => <Stage make={makeLab} />} durationInFrames={30 * 8} fps={30} width={1080} height={1920} />
  </>
);
