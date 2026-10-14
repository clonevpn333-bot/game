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
      this.readyTimeout = opts.readyTimeout || 10000;   // iframe never says "ready"
      this.startTimeout = opts.startTimeout || 4000;    // ready, but autoplay never began -> ask for a tap
      this.stallTimeout = opts.stallTimeout || 15000;   // buffering forever
      this.frame = null; this.state = 'idle'; this.video = null; this.timers = {}; this.token = 0; this.muted = false;
      this._onMsg = this._onMsg.bind(this);
      window.addEventListener('message', this._onMsg);
    }
    _clear(name) { if (name) { clearTimeout(this.timers[name]); delete this.timers[name]; } else { Object.values(this.timers).forEach(clearTimeout); this.timers = {}; } }
    _set(name, ms, fn) { this._clear(name); const t = this.token; this.timers[name] = setTimeout(() => { if (t === this.token) fn(); }, ms); }

    load(video, { autoplay = true, loop = false } = {}) {
      this.destroyFrame();
      this.token++; this.video = video; this.state = 'loading'; this.autoplay = autoplay; this.loadedAt = performance.now();
      const q = new URLSearchParams({ autoplay: autoplay ? '1' : '0', controls: '1', progress_bar: '1', play_button: '0', volume_control: '0', fullscreen_button: '0',
        timestamp: '0', loop: loop ? '1' : '0', music_info: '1', description: '0', rel: '0', native_context_menu: '0', closed_caption: '0' });
      const f = document.createElement('iframe');
      f.className = 'tt-frame';
      f.title = `TikTok video by ${video.creator ? '@' + video.creator : 'unknown creator'}: ${video.title}`;
      f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.setAttribute('allowfullscreen', '');
      f.src = `${ORIGIN}/player/v1/${video.id}?${q}`;
      this.frame = f; this.host.appendChild(f);
      this._set('ready', this.readyTimeout, () => this._fail('timeout'));
    }
    destroyFrame() {
      this._clear();
      if (this.frame) { this.frame.src = 'about:blank'; this.frame.remove(); this.frame = null; }
      this.state = 'idle';
    }
    destroy() { this.destroyFrame(); window.removeEventListener('message', this._onMsg); }

    _fail(kind, code) { if (this.state === 'error') return; this._clear(); this.state = 'error'; this.h.onFail && this.h.onFail(kind, code, this.video); }

    _onMsg(e) {
      if (e.origin !== ORIGIN || !this.frame || e.source !== this.frame.contentWindow) return;
      let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d || d['x-tiktok-player'] !== true || !this.video) return;
      switch (d.type) {
        case 'onPlayerReady':
          this._clear('ready'); if (this.state === 'loading') this.state = 'ready';
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
