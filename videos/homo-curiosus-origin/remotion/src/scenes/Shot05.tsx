import React from "react";
import { ProcOverlay, ProcShot } from "../film/ProcCanvas";

// Shot 05 · bronze-computer — Canvas background + Three.js layer + Canvas overlay.
// The Three.js layer is added by its owner in ../three/ (placeholder until then).
export const Shot05: React.FC = () => (
  <>
    <ProcShot id="bronze-computer" />
    <ProcOverlay sceneId="bronze-computer-fg" shotId="bronze-computer" />
  </>
);
