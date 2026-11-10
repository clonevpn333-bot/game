// The Director sequences realities and orchestrates transformations.
//
// A transformation is never a cut: the outgoing chapter keeps simulating and
// rendering while the incoming one fades up its own renderer, and both read a
// shared HANDOFF record (player screen position, velocity, carried objects,
// the last framebuffer…) so the hand-over is spatially continuous.
export const CHAPTERS = [
  null,
  { id: 1, key: 'ch1', title: 'PIXEL PANIC', format: 'TRUE 2D PIXEL ART', load: () => import('../ch1/chapter1.js'), status: 'playable' },
  { id: 2, key: 'ch2', title: 'INK & VIOLENCE', format: 'HAND-DRAWN CARTOON', load: () => import('../ch2/chapter2.js'), status: 'playable' },
  { id: 3, key: 'ch3', title: 'FOLD THE WORLD', format: '2.5D PAPERCRAFT', load: () => import('../ch3/chapter3.js'), status: 'playable' },
  { id: 4, key: 'ch4', title: 'DOMINO CITY', format: 'ISOMETRIC DIORAMA', load: () => import('../ch4/chapter4.js'), status: 'playable' },
  { id: 5, key: 'ch5', title: '1996', format: 'RETRO PSEUDO-3D', load: null, status: 'planned' },
  { id: 6, key: 'ch6', title: 'BLOCK COLLAPSE', format: 'DESTRUCTIBLE VOXELS', load: null, status: 'planned' },
  { id: 7, key: 'ch7', title: 'FULL RESOLUTION', format: 'HIGH-DETAIL 3D', load: null, status: 'planned' },
  { id: 8, key: 'ch8', title: 'CLAY HEART', format: 'STOP-MOTION CLAY', load: null, status: 'planned' },
  { id: 9, key: 'ch9', title: 'BREAK THE PAGE', format: 'INKED COMIC', load: null, status: 'planned' },
  { id: 10, key: 'ch10', title: 'FRAMEBREAK', format: 'HYBRID', load: null, status: 'planned' },
];

export class Director {
  constructor(game) {
    this.game = game;
    this.current = null;     // chapter in control
    this.outgoing = null;    // previous chapter, still alive during a transformation
    this.modules = {};       // loaded chapter instances by id
    this.loading = {};
    this.onPause = null; this.onEnd = null;
  }
  available(id) { return !!CHAPTERS[id]?.load; }

  async preload(id) {
    if (this.modules[id]) return this.modules[id];
    if (this.loading[id]) return this.loading[id];
    const def = CHAPTERS[id]; if (!def?.load) return null;
    this.loading[id] = (async () => {
      try {
        const mod = await def.load();
        const ch = new mod.default(this.game);
        await ch.load?.();
        this.modules[id] = ch; return ch;
      } catch (e) { console.warn('chapter ' + id + ' unavailable:', e.message); this.loading[id] = null; return null; }
    })();
    return this.loading[id];
  }

  // Hard start (new game / continue / replay): no outgoing reality.
  async startChapter(id, opts = {}) {
    this.stop();
    const ch = await this.preload(id); if (!ch) return false;
    this.current = ch; this.game.paused = false; this.game.dialogue.clear();
    ch.start({ checkpoint: opts.checkpoint ?? null, handoff: null, replay: !!opts.replay });
    if (!opts.replay) this.game.save.setCheckpoint(id, opts.checkpoint ?? null);
    this.game.events.emit('chapter:start', { id });
    return true;
  }

  // Seamless hand-over, called by the outgoing chapter mid-transformation.
  // Returns false if the next reality is not built yet (caller shows the
  // honest "to be continued" card instead).
  handoff(id, state) {
    const next = this.modules[id];
    if (!next) return false;
    const prev = this.current;
    this.game.save.complete(prev.id);
    this.outgoing = prev; this.current = next;
    next.start({ checkpoint: null, handoff: { ...state, from: prev } });
    this.game.save.setCheckpoint(id, null);
    this.game.events.emit('chapter:start', { id, handoff: true });
    return true;
  }
  // The incoming chapter calls this when it no longer needs the old reality.
  releaseOutgoing() { if (this.outgoing) { this.outgoing.stop?.(); this.outgoing = null; } }

  stop() {
    this.outgoing?.stop?.(); this.outgoing = null;
    this.current?.stop?.(); this.current = null;
    this.game.music.stop(0.3); this.game.dialogue.clear();
    this.game.show3d(false); this.game.clear2d(); this.game.audio.muffle(0);
    this.game.timeScale = 1;
  }
  canPause() { return !this.current?.noPause; }
  pause() { this.onPause?.(); }
  // Chapter finished with nothing built after it.
  end(info) { this.onEnd?.(info); }

  update(dt) {
    this.outgoing?.update(dt, true);
    this.current?.update(dt, false);
  }
  render(dt) {
    if (!this.current) return;
    // The incoming chapter decides how the outgoing one is composited.
    if (this.outgoing && !this.current.compositesOutgoing) this.outgoing.render(dt, true);
    this.current.render(dt, false);
  }
}
