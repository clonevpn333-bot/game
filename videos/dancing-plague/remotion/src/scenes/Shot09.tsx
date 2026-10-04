import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 09 · mind-dance — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => { const on = t > 35.15; return { ...W2(960, 1760), scale: 0.2, hop: on ? Math.abs(Math.sin((t - 35.15) * 10)) * 0.4 : 0, turn: on ? 0 : -0.6, armL: on ? 2 : 0.4, armR: on ? 2 : 0.4, face: on ? { eyes: 'open', wide: 1, mouth: 'o', mouthOpen: 1 } : { eyes: 'open', mouth: 'flat', lookX: -0.7 } }; };
export const Shot09: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="mind-dance" />
    <PipLayer rig={rig} start={start} />
  </>
);
