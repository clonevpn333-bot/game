import React from "react";
import { ProcShot } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { W2 } from "../three/rig";

// Shot 06 · worse — woodcut 2D (pf) + Pip in 3D (three.js)
const rig = (t: number): PipState => { const u = t - 19.5; return { ...W2(540, 1860), scale: 0.48, spin: u * u * 5 + u * 2, lean: Math.sin(t * 9) * 0.2, hop: Math.abs(Math.sin(t * 8)) * 0.2, armL: 2.2, armR: 2.2, face: { eyes: 'x', mouth: 'wobble', sweat: 1 } }; };
export const Shot06: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="worse" />
    <PipLayer rig={rig} start={start} />
  </>
);
