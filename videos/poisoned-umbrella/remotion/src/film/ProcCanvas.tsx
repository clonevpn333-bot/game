import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FILM, shotById } from "./pf";

// One procedural-film shot drawn on a Canvas at the Sequence-local frame. Pure function of the frame:
// the same frame always yields the same pixels (seeded engine, no clocks).
export const ProcShot: React.FC<{ id: string }> = ({ id }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shot = shotById(id);
  const T = shot.start + frame / fps;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) FILM.drawShotAt(ctx, id, T);
  }, [id, T]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

// A transparent overlay scene (registered by a shot file under its own id) drawn over 3D layers.
export const ProcOverlay: React.FC<{ sceneId: string; shotId: string }> = ({ sceneId, shotId }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const shot = shotById(shotId);
  const T = shot.start + frame / fps;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) FILM.drawOverlayAt(ctx, sceneId, shotId, T);
  }, [sceneId, shotId, T]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
