import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { AbsoluteFill } from "remotion";
import { Kinetic } from "./film/Kinetic";
import "@fontsource/fraunces/700.css";
import "@fontsource/jetbrains-mono/600.css";

const KineticOnly: React.FC = () => <AbsoluteFill style={{ backgroundColor: "#1B2440" }}><Kinetic /></AbsoluteFill>;
import { DURATION_S, FPS } from "./film/pf";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Episode8P1"
    component={Film}
    durationInFrames={Math.round(DURATION_S * FPS)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ score: true }}
  />
  <Composition id="KineticOnly" component={KineticOnly} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
