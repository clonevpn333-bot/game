import React from "react";
import { ProcShot, ProcOverlay } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { port } from "../three/rig";

// Shot 04 · the-crowd — woodcut 2D (pf) + Pip in 3D (three.js) + porthole ring overlay
const rig = (t: number): PipState => port(880, 1210, 120, { turn: -0.4, hop: Math.abs(Math.sin(t * 6)) * (t < 14 ? 0.08 : 0.2), face: t > 14 ? { eyes: 'open', wide: 1, mouth: 'scream', lookX: -0.6 } : { eyes: 'open', mouth: 'o', mouthOpen: 0.4, lookX: -0.6 } });
const CLIP = [880, 1210, 120];
export const Shot04: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="the-crowd" />
    <PipLayer rig={rig} start={start} clip={CLIP} />
    <ProcOverlay sceneId="the-crowd-fg" shotId="the-crowd" />
  </>
);
