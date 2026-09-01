/**
 * Game launcher — iframe isolation, the postMessage bridge, and teardown (§2.2).
 *
 * Exactly one live game frame at a time. Navigating away destroys the frame,
 * which is the primary memory-reclamation mechanism (§1.1): dropping the frame
 * releases its whole heap, its GL contexts and its audio graph in one go,
 * which no amount of manual nulling can match.
 *
 * Isolation caveat, stated plainly: `allow-scripts` + `allow-same-origin`
 * together mean the sandbox is a *resource* boundary (crashes, leaks, runaway
 * loops), not a security boundary against same-origin script. Bundles in
 * games/ are first-party code reviewed like any other file in this repo. If
 * third-party titles are ever hosted, they must move to a separate origin —
 * see docs/ARCHITECTURE.md.
 */

import * as storage from './storage.js';
import { detect, meetsTier, heapMB } from './capabilities.js';

const PROTOCOL = 1;
const READY_TIMEOUT_MS = 12000;
const SHUTDOWN_ACK_MS = 250;

let active = null;   // the one live session

function randomToken() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function activeSession() { return active; }

/** Bundle embedded by tools/build-single.mjs, base64 in a script tag. */
function embeddedBundle(id) {
  const el = document.getElementById(`bundle-${id}`);
  if (!el) return null;
  try {
    const bytes = Uint8Array.from(atob(el.textContent.trim()), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.warn('[launcher] embedded bundle failed to decode', id, err);
    return null;
  }
}

export class GameSession {
  constructor(game, mount, hooks = {}, initialSettings = null) {
    this.game = game;
    this.mount = mount;
    this.hooks = hooks;
    this.token = randomToken();
    this.iframe = null;
    this.ready = false;
    this.destroyed = false;
    this.startedAt = 0;
    this.readyAt = 0;
    this.lastStats = null;
    this.pointerLocked = false;
    this.baselineHeapMB = heapMB();
    this._onMessage = null;
    this._onVisibility = null;
    this._readyTimer = 0;
    // Seeded before the handshake: engines that cache their pixel ratio at
    // construction only ever see the value handed over in portal:hello, so a
    // quality choice has to be in place before the game boots.
    this._settings = { resolutionScale: null, ...(initialSettings || {}) };
    // Learned from the frame's own hello. A srcdoc frame loaded from file://
    // has an opaque origin, so replying to location.origin silently drops
    // every message; replying to the origin it actually announced does not.
    this._replyOrigin = null;
  }

  async start() {
    const game = this.game;
    this.startedAt = performance.now();

    const caps = detect();
    if (!meetsTier(caps.tier, game.minRendererTier)) {
      throw new UnsupportedError(game, caps);
    }

    const save = await storage.getSave(game.id);

    const iframe = document.createElement('iframe');
    iframe.className = 'game-frame';
    iframe.title = game.title;
    // allow-pointer-lock is mandatory: mouse-look titles are unplayable
    // without it, and some sandbox token sets block it silently (§2.2).
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
    // Both gates have to be open: the sandbox token above, and the
    // Permissions-Policy delegation here. Without `pointer-lock` in `allow`,
    // a nested frame's requestPointerLock() is refused with no error in some
    // Chrome builds — which is exactly how mouse-look silently died.
    iframe.setAttribute('allow', 'fullscreen; pointer-lock; autoplay; gamepad');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.tabIndex = 0;

    this._onMessage = (e) => this._handleMessage(e);
    window.addEventListener('message', this._onMessage);

    this._onVisibility = () => {
      if (document.visibilityState === 'hidden') this.pause();
      else this.resume();
    };
    document.addEventListener('visibilitychange', this._onVisibility);

    // The hello handshake starts when the frame's document announces itself,
    // so the reply is queued the moment the game's bridge posts game:hello.
    this._pendingHello = { save: save?.data ?? null, caps };

    this.iframe = iframe;
    this.mount.appendChild(iframe);

    const embedded = embeddedBundle(game.id);
    if (embedded) {
      // Single-file distribution: the bundle travels inside the page, so the
      // frame is populated from srcdoc rather than fetched. Everything else —
      // sandbox, handshake, teardown — is unchanged.
      iframe.srcdoc = embedded;
    } else {
      // Content-hashed URL: a version bump changes the URL, so the service
      // worker can serve it cache-first forever (§2.3).
      iframe.src = `${game.entry}?v=${game.hash}`;
    }

    this._readyTimer = setTimeout(() => {
      if (!this.ready && !this.destroyed) {
        this.hooks.onError?.({ message: `${game.title} did not report ready within ${READY_TIMEOUT_MS / 1000}s.`, fatal: true });
      }
    }, READY_TIMEOUT_MS);

    active = this;
    storage.setMeta('lastPlayed', { id: game.id, at: Date.now() });
    storage.touchBundle(`${game.entry}?v=${game.hash}`, game.id, game.version);
    return this;
  }

  _isFromFrame(e) {
    return this.iframe && e.source === this.iframe.contentWindow;
  }

  _handleMessage(e) {
    if (this.destroyed || !this._isFromFrame(e)) return;
    // Same-origin frames report our own origin; opaque-origin sandboxes report
    // "null". Anything else is not our game.
    if (e.origin !== location.origin && e.origin !== 'null') return;

    const d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string') return;
    if (d.type.slice(0, 5) !== 'game:') return;
    if (d.type !== 'game:hello' && d.token !== this.token) return;

    switch (d.type) {
      case 'game:hello':
        this._replyOrigin = e.origin === 'null' ? '*' : e.origin;
        this._sendHello(d);
        break;

      case 'game:ready':
        this.ready = true;
        this.readyAt = performance.now();
        clearTimeout(this._readyTimer);
        this.hooks.onReady?.({ ms: this.readyAt - this.startedAt, needs: d.needs || null });
        this.focus();
        break;

      case 'game:save':
        storage.putSave(this.game.id, d.data, this.game.version)
          .then(() => this.hooks.onSaved?.(Date.now()));
        break;

      case 'game:score':   this.hooks.onScore?.(d.score, d.label); break;
      case 'game:progress':this.hooks.onProgress?.(d.value); break;

      case 'game:stats':
        this.lastStats = d;
        this.hooks.onStats?.(d);
        break;

      case 'game:pointerlock':
        this.pointerLocked = !!d.locked;
        this.hooks.onPointerLock?.(this.pointerLocked, d.error || null);
        break;

      case 'game:error':
        this.hooks.onError?.({ message: d.message, stack: d.stack, fatal: false });
        break;

      case 'game:exit': this.hooks.onExit?.(); break;

      case 'game:shutdown-ack':
        this._ackResolve?.();
        break;
    }
  }

  _sendHello(helloMsg) {
    if (helloMsg.protocol !== PROTOCOL) {
      this.hooks.onError?.({
        message: `${this.game.title} speaks bridge protocol ${helloMsg.protocol}, portal speaks ${PROTOCOL}.`,
        fatal: true,
      });
      return;
    }
    const caps = this._pendingHello.caps;
    this.post('portal:hello', {
      tier: caps.tier,
      caps: {
        tier: caps.tier, instancing: caps.instancing, maxTextureSize: caps.maxTextureSize,
        deviceMemory: caps.deviceMemory, cores: caps.cores, software: caps.software,
        workerRendering: caps.workerRendering, touch: caps.touch, reducedMotion: caps.reducedMotion,
      },
      save: this._pendingHello.save,
      settings: this._settings,
    });
  }

  post(type, payload) {
    if (this.destroyed || !this.iframe?.contentWindow) return false;
    const msg = payload ? { type, token: this.token, ...payload } : { type, token: this.token };
    try {
      this.iframe.contentWindow.postMessage(msg, this._replyOrigin || location.origin);
      return true;
    } catch { return false; }
  }

  pause()  { this.post('portal:pause'); }
  resume() { this.post('portal:resume'); }
  lowMemory(level = 1) { this.post('portal:lowmem', { level }); }

  setResolutionScale(scale) {
    this._settings = { ...this._settings, resolutionScale: scale };
    this.post('portal:settings', { settings: this._settings });
  }

  focus() {
    try { this.iframe?.contentWindow?.focus(); this.iframe?.focus(); } catch { /* detached */ }
  }

  /**
   * Deterministic teardown (§1.1). Asks the game to flush and release, waits
   * briefly for the ack, then destroys the frame regardless — a hung title
   * must never be able to block the portal.
   */
  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this._readyTimer);

    const acked = new Promise((resolve) => {
      this._ackResolve = resolve;
      setTimeout(resolve, SHUTDOWN_ACK_MS);
    });
    this.post('portal:shutdown');
    await acked;

    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch { /* not locked */ }
    }
    window.removeEventListener('message', this._onMessage);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this._onMessage = null;
    this._onVisibility = null;
    this._ackResolve = null;

    const frame = this.iframe;
    if (frame) {
      // about:blank first: it drops the document (and its heap, GL contexts and
      // audio graph) before the element leaves the tree, which reclaims sooner
      // and more reliably than removal alone.
      try { frame.src = 'about:blank'; } catch { /* already navigating */ }
      frame.remove();
    }
    this.iframe = null;
    this.mount = null;
    this.hooks = {};
    this._pendingHello = null;
    if (active === this) active = null;
  }

  /** Heap delta vs. the reading taken at launch — feeds the ±10% criterion. */
  heapDeltaMB() {
    const now = heapMB();
    if (now == null || this.baselineHeapMB == null) return null;
    return now - this.baselineHeapMB;
  }
}

export class UnsupportedError extends Error {
  constructor(game, caps) {
    super(`${game.title} needs ${game.minRendererTier}; this device reports ${caps.tier}.`);
    this.name = 'UnsupportedError';
    this.game = game;
    this.caps = caps;
  }
}

export async function launch(game, mount, hooks, initialSettings) {
  if (active) await active.destroy();
  const session = new GameSession(game, mount, hooks, initialSettings);
  await session.start();
  return session;
}

export async function closeActive() {
  if (active) await active.destroy();
}
