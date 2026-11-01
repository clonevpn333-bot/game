// GETAWAY! — global game context (single shared registry of systems)
export const G = {
  scene: null, camera: null, renderer: null, composer: null,
  input: null, audio: null, music: null, save: null, settings: null,
  world: null, sky: null, fx: null, rigid: null, props: null,
  vehicles: null, traffic: null, peds: null, crowd: null, player: null,
  combat: null, police: null, cam: null, hud: null, menus: null, mission: null,
  time: 0, dt: 0, timeScale: 1, slowmo: 0, paused: true, mode: 'menu', // menu | play
  frame: 0, quality: 'high', debug: false,
  events: new Map(),
  on(name, fn) { let l = this.events.get(name); if (!l) this.events.set(name, (l = [])); l.push(fn); return () => l.splice(l.indexOf(fn), 1); },
  emit(name, ...args) { const l = this.events.get(name); if (l) for (const fn of [...l]) fn(...args); },
};
if (typeof window !== 'undefined') window.__G = G;
