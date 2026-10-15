/* TikTokPlayer: one official-embed iframe at a time, driven by TikTok's documented postMessage protocol.
 *   https://developers.tiktok.com/doc/embed-player
 * An iframe `load` event proves nothing (TikTok serves an error page with 200), so we only trust
 * onPlayerReady / onStateChange / onPlayerError messages from https://www.tiktok.com, backed by wall-clock watchdogs. */
(function () {
  'use strict';
  const ORIGIN = 'https://www.tiktok.com';

  class TikTokPlayer {
    constructor(host, handlers = {}, opts = {}) {
      this.host = host; this.h = handlers;
      /* Timeouts adapt: the first video of a visit also downloads TikTok's player bundle (measured 13 s on slow 3G),
       * and slow/data-saver connections get double time. Explicit opts (tests) are used as-is. */
      this.fixed = !!opts.readyTimeout;
      this.baseReady = opts.readyTimeout || 12000;      // iframe never says "ready"
      this.startTimeout = opts.startTimeout || 5000;    // ready, but autoplay never began -> ask for a tap
      this.baseStall = opts.stallTimeout || 45000;      // buffering forever (a buffering clip exists, it is just slow)
      this.warm = false;                                // true once any video has become ready
      this.frame = null; this.state = 'idle'; this.video = null; this.timers = {}; this.token = 0; this.muted = false;
      this._onMsg = this._onMsg.bind(this);
      window.addEventListener('message', this._onMsg);
    }
    get slow() { const c = navigator.connection; return !!(c && (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || ''))); }
    get readyTimeout() { return this.fixed ? this.baseReady : this.baseReady * (this.warm ? 1 : 2.5) * (this.slow ? 2 : 1); }
    get stallTimeout() { return this.fixed ? this.baseStall : this.baseStall * (this.slow ? 2 : 1); }
    _clear(name) { if (name) { clearTimeout(this.timers[name]); delete this.timers[name]; } else { Object.values(this.timers).forEach(clearTimeout); this.timers = {}; } }
    _set(name, ms, fn) { this._clear(name); const t = this.token; this.timers[name] = setTimeout(() => { if (t === this.token) fn(); }, ms); }

    _makeFrame(video, { autoplay, loop, hidden }) {
      const q = new URLSearchParams({ autoplay: autoplay ? '1' : '0', controls: '1', progress_bar: '1', play_button: '0', volume_control: '0', fullscreen_button: '0',
        timestamp: '0', loop: loop ? '1' : '0', music_info: '1', description: '0', rel: '0', native_context_menu: '0', closed_caption: '0' });
      const f = document.createElement('iframe');
      f.className = 'tt-frame' + (hidden ? ' tt-pre' : '');
      f.title = `TikTok video by ${video.creator ? '@' + video.creator : 'unknown creator'}: ${video.title}`;
      f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.setAttribute('allowfullscreen', '');
      f.src = `${ORIGIN}/player/v1/${video.id}?${q}`;
      return f;
    }

    load(video, { autoplay = true, loop = false } = {}) {
      this.destroyFrame();
      this.token++; this.video = video; this.state = 'loading'; this.autoplay = autoplay; this.loadedAt = performance.now();
      const pre = this.pre;
      if (pre && pre.video.id === video.id && pre.ready && !pre.failed && pre.loop === loop) {
        /* Instant path: the hidden player already loaded this video. Reveal it and press play. */
        this.pre = null; clearTimeout(pre.timer); this.frame = pre.frame; this.frame.classList.remove('tt-pre'); this.warm = true; this.state = 'ready'; this.muted = true;   // we muted it while preloading
        this.h.onMute && this.h.onMute(true); this.h.onReady && this.h.onReady(video); this._send('seekTo', 0); this._send('play'); this.promoted = true;
        this._set('start', this.startTimeout, () => { if (this.state === 'ready') this.h.onNeedsTap && this.h.onNeedsTap(); });
        return;
      }
      this.promoted = false; this.dropPreload();
      this.frame = this._makeFrame(video, { autoplay, loop, hidden: false }); this.host.appendChild(this.frame);
      this._set('ready', this.readyTimeout, () => this._fail('timeout'));
    }

    /* Load the next video invisibly (autoplay off) so a swipe is instant, and learn early if it is dead. */
    preload(video, { loop = false } = {}) {
      if (this.pre && this.pre.video.id === video.id) return;
      if (video.id === (this.video && this.video.id)) return;
      this.dropPreload();
      /* autoplay=0 makes TikTok's player go completely silent (no ready event, ignores play), so preload with autoplay=1 and mute+pause on ready. */
      const frame = this._makeFrame(video, { autoplay: true, loop, hidden: true });
      const pre = this.pre = { video, frame, loop, ready: false, failed: false };
      pre.timer = setTimeout(() => { if (this.pre === pre) this.dropPreload(); }, 30000);   // never hold a hidden player forever
      this.host.appendChild(frame);
    }
    dropPreload() { if (this.pre) { clearTimeout(this.pre.timer); this.pre.frame.src = 'about:blank'; this.pre.frame.remove(); this.pre = null; } }
    destroyFrame() {
      this._clear();
      if (this.frame) { this.frame.src = 'about:blank'; this.frame.remove(); this.frame = null; }
      this.state = 'idle';
    }
    destroy() { this.destroyFrame(); this.dropPreload(); window.removeEventListener('message', this._onMsg); }

    _fail(kind, code) { if (this.state === 'error') return; this._clear(); this.state = 'error'; this.h.onFail && this.h.onFail(kind, code, this.video); }

    _onPreMsg(e) {
      const pre = this.pre; let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d || d['x-tiktok-player'] !== true) return;
      if (d.type === 'onPlayerReady') { pre.ready = true; this._sendTo(pre.frame, 'mute'); this._sendTo(pre.frame, 'pause'); }
      else if (d.type === 'onPlayerError') {
        const code = typeof d.value === 'object' && d.value ? d.value.code ?? d.value.errorCode : d.value; const kind = window.RewindCore.classifyError(code);
        pre.failed = true; const v = pre.video; this.dropPreload(); this.h.onPreloadFail && this.h.onPreloadFail(v, kind);
      }
    }
    _onMsg(e) {
      if (e.origin === ORIGIN && this.pre && e.source === this.pre.frame.contentWindow) return this._onPreMsg(e);
      if (e.origin !== ORIGIN || !this.frame || e.source !== this.frame.contentWindow) return;
      let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d || d['x-tiktok-player'] !== true || !this.video) return;
      switch (d.type) {
        case 'onPlayerReady':
          this._clear('ready'); this.warm = true; if (this.state === 'loading') this.state = 'ready';
          this.h.onReady && this.h.onReady(this.video);
          if (this.autoplay) this._set('start', this.startTimeout, () => { if (this.state === 'ready') this.h.onNeedsTap && this.h.onNeedsTap(); });
          break;
        case 'onStateChange': {
          const s = typeof d.value === 'object' && d.value ? d.value.state ?? d.value.value : d.value;
          if (s === 1) { this._clear('start'); this._clear('stall'); this._clear('ready'); this.state = 'playing'; this.h.onPlaying && this.h.onPlaying(this.video); }
          else if (s === 2) { this._clear('stall'); this.state = 'paused'; this.h.onPaused && this.h.onPaused(); }
          else if (s === 0) { this._clear(); this.state = 'ended'; this.h.onEnded && this.h.onEnded(this.video); }
          else if (s === 3) { this._set('stall', this.stallTimeout, () => this._fail('stall')); this.h.onBuffering && this.h.onBuffering(); }
          break;
        }
        case 'onPlayerError': {
          const code = typeof d.value === 'object' && d.value ? d.value.code ?? d.value.errorCode : d.value;
          const kind = window.RewindCore.classifyError(code);
          if (kind === 'autoplay') { this._clear('start'); this.h.onNeedsTap && this.h.onNeedsTap(code); }
          else this._fail(kind, code);
          break;
        }
        case 'onMute': this.muted = !!(d.value && typeof d.value === 'object' ? d.value.muted ?? d.value : d.value); this.h.onMute && this.h.onMute(this.muted); break;
        case 'onCurrentTime': this.h.onTime && this.h.onTime(d.value); break;
        default: break;
      }
    }

    _sendTo(frame, type, value) { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type, 'x-tiktok-player': true, ...(value !== undefined ? { value } : {}) }, ORIGIN); }
    _send(type, value) { if (this.frame && this.frame.contentWindow) this.frame.contentWindow.postMessage({ type, 'x-tiktok-player': true, ...(value !== undefined ? { value } : {}) }, ORIGIN); }
    play() { this._send('play'); }
    pause() { this._send('pause'); }
    toggle() { this.state === 'playing' ? this.pause() : this.play(); }
    mute() { this.muted = true; this._send('mute'); this.h.onMute && this.h.onMute(true); }
    unmute() { this.muted = false; this._send('unMute'); this.h.onMute && this.h.onMute(false); }
    toggleMute() { this.muted ? this.unmute() : this.mute(); }
  }
  window.TikTokPlayer = TikTokPlayer;
})();
