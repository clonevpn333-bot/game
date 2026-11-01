import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// One persistent WebGL canvas for the whole film; `make(canvas)` returns a world whose render(T) draws global time T.
export const Stage: React.FC<{ make: (c: HTMLCanvasElement) => { render: (T: number) => void } }> = ({ make }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ render: (T: number) => void } | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!world.current) world.current = make(ref.current);
    world.current.render(frame / fps);
  }, [frame, fps, make]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
