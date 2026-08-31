'use strict';
/**
 * Game-side half of the portal <-> game postMessage bridge (§2.2).
 *
 * Protocol (v1), all messages { type, token, ... }:
 *
 *   game   -> portal : game:hello      first contact, no token yet
 *   portal -> game   : portal:hello    { token, tier, caps, save, settings }
 *   game   -> portal : game:ready      { needs: { tier, pointerLock } }
 *   game   -> portal : game:save       { data }        persisted via IndexedDB
 *   game   -> portal : game:score      { score, label }
 *   game   -> portal : game:stats      { fps, frameMs, heapMB, scale, entities }
 *   game   -> portal : game:exit       user chose to quit
 *   game   -> portal : game:error      { message, stack }
 *   game   -> portal : game:pointerlock{ locked }
 *   portal -> game   : portal:pause | portal:resume | portal:shutdown
 *   portal -> game   : portal:lowmem   release what you can, you are near budget
 *   portal -> game   : portal:settings { resolutionScale, audio, auto }
 *
 * The game never touches portal storage directly: save state round-trips
 * through this bridge, which is what §2.2's acceptance criterion asks for.
 * Standalone (opened outside the portal) degrades to a local IndexedDB store
 * so a bundle stays playable as a plain file.
 */
(function (global) {
    const PE = (global.PE = global.PE || {});
    const PROTOCOL = 1;

    const Bridge = {
        connected:  false,
        standalone: false,
        token:      null,
        id:         null,
        tier:       null,
        caps:       null,
        settings:   null,
        _handlers:  null,
        _saveTimer: 0,
        _pendingSave: null,
        _origin:    null,
        _onMessage: null,
        _helloTimer: 0,

        connect(opts) {
            this._handlers = opts || {};
            this.id = opts.id || 'unknown';
            const parent = global.parent;
            const embedded = parent && parent !== global;

            // location.origin is "null" for an opaque-origin sandbox; postMessage
            // then has to target '*' because there is no origin to name.
            this._origin = (location.origin && location.origin !== 'null') ? location.origin : '*';

            const self = this;
            this._onMessage = function (e) { self._handle(e); };
            global.addEventListener('message', this._onMessage);

            // Report uncaught errors to the portal so a broken title surfaces
            // in the launcher instead of dying silently inside the frame.
            global.addEventListener('error', function (e) {
                self.post('game:error', { message: String(e.message || e), stack: e.error && e.error.stack || '' });
            });
            global.addEventListener('unhandledrejection', function (e) {
                self.post('game:error', { message: 'unhandled rejection: ' + String(e.reason), stack: '' });
            });

            if (!embedded) { this._goStandalone(); return this; }

            parent.postMessage({ type: 'game:hello', protocol: PROTOCOL, id: this.id }, this._origin);
            this._helloTimer = setTimeout(function () {
                if (!self.connected) self._goStandalone();
            }, 1500);
            return this;
        },

        _goStandalone() {
            this.standalone = true;
            this.connected  = false;
            const self = this;
            localLoad(this.id).then(function (save) {
                self._fire('onHello', { tier: null, caps: null, save: save, settings: null, standalone: true });
            });
        },

        _handle(e) {
            const d = e.data;
            if (!d || typeof d !== 'object' || typeof d.type !== 'string') return;
            if (d.type.slice(0, 7) !== 'portal:') return;
            // After the handshake every message must carry our token; a frame
            // that can post to us is not automatically the portal.
            if (this.token && d.token !== this.token) return;

            switch (d.type) {
                case 'portal:hello':
                    if (this.connected) return;
                    clearTimeout(this._helloTimer);
                    this.connected = true;
                    this.token     = d.token;
                    this.tier      = d.tier;
                    this.caps      = d.caps || null;
                    this.settings  = d.settings || null;
                    this._fire('onHello', { tier: d.tier, caps: d.caps, save: d.save, settings: d.settings, standalone: false });
                    break;
                case 'portal:pause':    this._fire('onPause'); break;
                case 'portal:resume':   this._fire('onResume'); break;
                case 'portal:lowmem':   this._fire('onLowMemory', d.level || 1); break;
                case 'portal:settings':
                    this.settings = d.settings || null;
                    this._fire('onSettings', d.settings);
                    break;
                case 'portal:shutdown':
                    this.flush();
                    this._fire('onShutdown');
                    this.post('game:shutdown-ack', null);
                    this.dispose();
                    break;
            }
        },

        _fire(name, arg) {
            const fn = this._handlers && this._handlers[name];
            if (typeof fn === 'function') {
                try { fn(arg); } catch (err) { this.post('game:error', { message: String(err), stack: err && err.stack || '' }); }
            }
        },

        post(type, payload) {
            if (this.standalone || !global.parent || global.parent === global) return false;
            const msg = payload ? Object.assign({ type: type, token: this.token }, payload)
                                : { type: type, token: this.token };
            try { global.parent.postMessage(msg, this._origin); } catch (e) { return false; }
            return true;
        },

        /** Declare what the game needs; the portal has already gated on this,
         *  but a standalone-opened bundle can warn for itself. */
        ready(needs) { this.post('game:ready', { needs: needs || null }); },

        progress(v) { this.post('game:progress', { value: v }); },

        score(score, label) { this.post('game:score', { score: score, label: label || '' }); },

        /** Debounced save — games call this freely; it coalesces to <=1 write/2s. */
        save(data) {
            this._pendingSave = data;
            if (this._saveTimer) return;
            const self = this;
            this._saveTimer = setTimeout(function () { self.flush(); }, 2000);
        },

        flush() {
            if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = 0; }
            if (this._pendingSave == null) return;
            const data = this._pendingSave;
            this._pendingSave = null;
            if (this.standalone) localSave(this.id, data);
            else this.post('game:save', { data: data });
        },

        stats(s) { this.post('game:stats', s); },

        pointerLock(locked) { this.post('game:pointerlock', { locked: !!locked }); },

        exit() { this.flush(); this.post('game:exit', null); },

        dispose() {
            if (this._onMessage) global.removeEventListener('message', this._onMessage);
            this._onMessage = null;
            this._handlers  = null;
            this.connected  = false;
        },
    };

    // --- standalone-only local persistence (never localStorage, per §1.4) ---
    function idb() {
        return new Promise(function (resolve, reject) {
            const req = indexedDB.open('pe-standalone', 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('saves'); };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror   = function () { reject(req.error); };
        });
    }
    function localSave(id, data) {
        return idb().then(function (db) {
            const tx = db.transaction('saves', 'readwrite');
            tx.objectStore('saves').put({ data: data, at: Date.now() }, id);
            return new Promise(function (res) { tx.oncomplete = function () { db.close(); res(); }; });
        }).catch(function () { /* private mode / quota — play on without saves */ });
    }
    function localLoad(id) {
        return idb().then(function (db) {
            const tx = db.transaction('saves', 'readonly');
            const rq = tx.objectStore('saves').get(id);
            return new Promise(function (res) {
                rq.onsuccess = function () { db.close(); res(rq.result ? rq.result.data : null); };
                rq.onerror   = function () { db.close(); res(null); };
            });
        }).catch(function () { return null; });
    }

    PE.Bridge = Bridge;
    PE.PROTOCOL = PROTOCOL;
})(typeof window !== 'undefined' ? window : globalThis);
