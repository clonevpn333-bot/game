// Loads the procedural-film engine (../pf) into this bundle: core → lib → cast → timeline → scenes.
// The scene files are plain scripts that register on window.FILM; import order is the contract order.
import "../../../pf/src/core.js";
import "../../../pf/src/lib.js";
import "../../../pf/src/props.js";
import "../../../pf/src/cast.js";
import "../../../pf/src/timeline.js";
import "../../../pf/src/scenes/01-rain-hook.js";
import "../../../pf/src/scenes/02-bridge-1978.js";
import "../../../pf/src/scenes/03-the-sting.js";
import "../../../pf/src/scenes/04-four-days.js";
import "../../../pf/src/scenes/05-pinhead-dive.js";
import "../../../pf/src/scenes/06-pellet.js";
import "../../../pf/src/scenes/07-ricin.js";
import "../../../pf/src/scenes/08-evidence.js";
import "../../../pf/src/scenes/09-umbrella-gun.js";
import "../../../pf/src/scenes/10-no-one.js";
import "../../../pf/src/scenes/11-weapon-end.js";

export type PfShot = { id: string; start: number; end: number; dur: number; mode: string; title: string };

type FilmGlobal = {
  prepare: () => { shots: PfShot[]; duration: number };
  drawShotAt: (ctx: CanvasRenderingContext2D, id: string, T: number) => void;
  drawOverlayAt: (ctx: CanvasRenderingContext2D, sceneId: string, shotId: string, T: number) => void;
  registry: Record<string, unknown>;
  TIMELINE: { bpm: number; fps: number; duration: number };
};

export const FILM = (window as unknown as { FILM: FilmGlobal }).FILM;
export const SHOTS: PfShot[] = FILM.prepare().shots;
export const FPS = 24;
export const DURATION_S = FILM.prepare().duration;
export const shotById = (id: string): PfShot => {
  const s = SHOTS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown shot ${id}`);
  return s;
};
export const fromFrame = (s: PfShot) => Math.round(s.start * FPS);
export const lenFrames = (s: PfShot) => Math.round(s.end * FPS) - Math.round(s.start * FPS);
