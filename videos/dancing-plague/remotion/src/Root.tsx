import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { DURATION_S, FPS } from "./film/pf";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Episode3"
    component={Film}
    durationInFrames={Math.round(DURATION_S * FPS)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ score: true }}
  />
);
