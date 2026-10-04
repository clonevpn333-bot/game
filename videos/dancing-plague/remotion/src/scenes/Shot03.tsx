import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 03 · no-music — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => ({ ...W2(800, 1850), scale: 0.5, turn: -0.3, armL: t > 7.85 ? 2.5 : 0.4, armR: t > 7.85 ? 2.5 : 0.4, sq: t > 7.85 && t < 8.0 ? 0.15 : 0, face: { eyes: 'open', wide: 1, mouth: 'o', mouthOpen: 1, browUp: 1, lookX: -0.5 } });
export const Shot03: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="no-music" />
    <PipLayer rig={rig} start={start} />
  </>
);
