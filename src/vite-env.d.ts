/// <reference types="vite/client" />

interface ThreeGameDiagnostics {
  renderer: { calls: number; triangles: number; geometries: number; textures: number };
  fps: number;
  state: Record<string, unknown>;
  physics: Record<string, unknown>;
}

interface ThreeGameTestHooks {
  states: string[];
  seed(value: number): unknown;
  setState(name: string): Promise<{ state: string }>;
  setPausedForScreenshot(paused: boolean): unknown;
  setReducedMotion(enabled: boolean): unknown;
  hideDebugUi(hidden: boolean): unknown;
  teleport(x: number, y: number, z: number): void;
  simulate(seconds: number): unknown;
  getState(): unknown;
  skipDialogue(): void;
  game: unknown;
}

interface Window {
  __THREE_GAME_DIAGNOSTICS__?: ThreeGameDiagnostics;
  __THREE_GAME_TEST_HOOKS__?: ThreeGameTestHooks;
}
