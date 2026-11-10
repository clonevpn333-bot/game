// Performance monitor (toggle with F3). Tracks frame time and exposes a
// rolling FPS figure that quality-scaling code can consult.
export class Perf {
  constructor(game) {
    this.game = game; this.fps = 60; this.ms = 16; this.samples = []; this.worst = 0;
    this.el = document.createElement('div'); this.el.id = 'perf'; this.el.style.display = 'none';
    document.getElementById('stage').appendChild(this.el);
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { e.preventDefault(); game.settings.showPerf = !game.settings.showPerf; game.save.write(); } });
    this._t0 = 0; this._n = 0;
  }
  begin(dt) {
    this._t0 = performance.now();
    this.samples.push(dt); if (this.samples.length > 90) this.samples.shift();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.fps = 1 / Math.max(avg, 1e-4); this.worst = Math.max(...this.samples) * 1000;
  }
  end() {
    this.ms = performance.now() - this._t0;
    const show = this.game.settings.showPerf;
    if (this.el.style.display !== (show ? 'block' : 'none')) this.el.style.display = show ? 'block' : 'none';
    if (show && ++this._n % 15 === 0) {
      const ch = this.game.director.current;
      this.el.textContent = `${this.fps.toFixed(0)} fps · cpu ${this.ms.toFixed(1)} ms · worst ${this.worst.toFixed(0)} ms · ${this.game.W}×${this.game.H}` + (ch?.perfInfo ? ' · ' + ch.perfInfo() : '');
    }
  }
}
