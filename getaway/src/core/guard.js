// GETAWAY! — fault isolation. Every system runs as a guarded stage: if it throws, the error is logged, the stage's
// state is repaired (reset hook) when it keeps failing, and the rest of the frame carries on. Nothing one system does
// can stop the game loop. F9 opens the error log (copyable), so a bug report can say exactly what broke.
import { G } from './context.js';

const MAX_LOG = 60;
export const Guard = {
  log: [], counts: {}, offUntil: {}, total: 0, _toastT: 0,
  // run one stage; `reset` repairs that system's state after repeated failures
  run(name, fn, reset) {
    const now = performance.now(); if (this.offUntil[name] > now) return;
    try { fn(); } catch (e) {
      const c = (this.counts[name] = (this.counts[name] || 0) + 1); this.report(name, e);
      if (reset && (c === 2 || c % 10 === 0)) { try { reset(); this.note(`${name}: state reset to recover`); } catch (e2) { this.report(name + ' (reset)', e2); } }
      if (c % 25 === 0) { this.offUntil[name] = now + 1500; this.note(`${name}: paused 1.5 s after repeated errors`); } // stop a per-frame error storm
    }
  },
  report(where, e) {
    this.total++; const msg = (e && (e.message || String(e))) || 'unknown error'; const stack = e && e.stack ? String(e.stack).split('\n').slice(0, 6).join('\n') : '';
    const last = this.log[this.log.length - 1];
    if (last && last.where === where && last.msg === msg) { last.n++; last.t = G.time || 0; } else { this.log.push({ where, msg, stack, n: 1, t: G.time || 0, wall: new Date().toLocaleTimeString() }); if (this.log.length > MAX_LOG) this.log.shift(); }
    if (last && last.where === where && last.msg === msg && last.n > 3) return; // don't spam the console
    console.error(`[recovered] ${where}:`, e); this.toast();
  },
  note(text) { this.log.push({ where: 'guard', msg: text, stack: '', n: 1, t: G.time || 0, wall: new Date().toLocaleTimeString() }); if (this.log.length > MAX_LOG) this.log.shift(); },
  toast() {
    const now = performance.now(); if (now - this._toastT < 8000) return; this._toastT = now;
    let el = document.getElementById('guard-toast'); if (!el) { el = document.createElement('div'); el.id = 'guard-toast'; el.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:99999;background:rgba(10,12,16,.82);color:#ffb02e;font:600 13px Rajdhani,system-ui,sans-serif;letter-spacing:.05em;padding:6px 12px;border-radius:5px;pointer-events:none'; document.body.appendChild(el); }
    el.textContent = 'Recovered from an error — game kept running (F9: details)'; el.style.display = 'block'; clearTimeout(this._tt); this._tt = setTimeout(() => { el.style.display = 'none'; }, 4000);
  },
  panel() {
    let p = document.getElementById('guard-panel'); if (p) { p.remove(); return; }
    p = document.createElement('div'); p.id = 'guard-panel'; p.style.cssText = 'position:fixed;inset:8% 10%;z-index:100000;background:rgba(8,10,14,.95);color:#dde;font:12px ui-monospace,monospace;padding:14px;border:1px solid #ffb02e;border-radius:8px;display:flex;flex-direction:column;gap:8px';
    const txt = this.log.length ? this.log.map((l) => `[${l.wall}] ${l.where}${l.n > 1 ? ` ×${l.n}` : ''}: ${l.msg}${l.stack ? '\n   ' + l.stack.replace(/\n/g, '\n   ') : ''}`).join('\n') : 'No errors so far.';
    p.innerHTML = '<b style="color:#ffd36b;font:700 15px Rajdhani,system-ui">ERROR LOG — copy this into a bug report (F9 to close)</b>'; const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = `GETAWAY! error log (${this.total} errors, all recovered)\n${navigator.userAgent}\n\n${txt}`; ta.style.cssText = 'flex:1;background:#0b0e13;color:#cfd6e0;border:0;font:inherit;resize:none';
    p.appendChild(ta); document.body.appendChild(p); ta.select();
  },
};
// errors outside the frame loop (async mission scripts, timers, audio callbacks) land in the same log
addEventListener('error', (e) => Guard.report('script', e.error || e.message));
addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && r.constructor && r.constructor.name === 'Abort') return; Guard.report('async', r); });
addEventListener('keydown', (e) => { if (e.code === 'F9') { e.preventDefault(); Guard.panel(); } });
