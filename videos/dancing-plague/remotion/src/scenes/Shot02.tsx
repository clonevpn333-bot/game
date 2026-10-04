import React from "react";
import { ProcShot, ProcOverlay } from "../film/ProcCanvas";
import { PipLayer, type PipState } from "../three/Pip";
import { port } from "../three/rig";

// Shot 02 · she-dances — woodcut 2D (pf) + Pip in 3D (three.js) + porthole ring overlay
const rig = (t: number): PipState => port(860, 330, 140, { turn: -0.35, hop: t > 7.05 && t < 7.45 ? 0.25 : 0, face: t > 7.05 ? { eyes: 'open', wide: 1, mouth: 'o', mouthOpen: 0.9, lookX: -0.5 } : { eyes: 'open', mouth: 'flat', lookX: -0.6, lookY: 0.3 } });
const CLIP = [860, 330, 140];
export const Shot02: React.FC<{ start: number }> = ({ start }) => (
  <>
    <ProcShot id="she-dances" />
    <PipLayer rig={rig} start={start} clip={CLIP} />
    <ProcOverlay sceneId="she-dances-fg" shotId="she-dances" />
  </>
);
