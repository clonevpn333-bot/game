'use strict';
// Evan's flip phone: texting, contacts, calls.

const Phone = {
  open: false,
  available: true,
  signal: 3,
  battery: 3,
  screen: 'home',
  sel: 0,
  thread: null,
  threads: {},          // name -> [{me, text, time, read}]
  replies: {},          // name -> {options:[], cb}
  contacts: ['Mom', 'Marcy', 'Ray', 'Home', 'Dad'],
  callHandlers: {},
  incomingCall: null,
  ringLoop: null,

  init() {
    Bus.on('keydown', code => {
      if (!G.running || G.paused) return;
      if (code === 'Tab' && this.available && (G.mode === 'walk' || G.mode === 'locked' || G.mode === 'hide' || G.mode === 'car') && !UI.docOpen && !UI.pcOpen) this.toggle();
    });
  },
  reset() { this.threads = {}; this.replies = {}; this.incomingCall = null; this.screen = 'home'; if (this.ringLoop) { this.ringLoop.stop(); this.ringLoop = null; } this.close(true); },
  unread() { let n = 0; for (const k in this.threads) for (const m of this.threads[k]) if (!m.me && !m.read) n++; return n; },
  toggle() { this.open ? this.close() : this.show(); },
  show() {
    this.open = true; $('phone').classList.remove('hidden');
    if (this.incomingCall) this.screen = 'incoming';
    else if (this.unread()) { this.screen = 'inbox'; this.sel = 0; }
    else this.screen = 'home';
    SND.sfx('click', { f: 1800, bus: 'ui' });
    this.render();
  },
  close(silent) { if (!this.open && silent) return; this.open = false; $('phone').classList.add('hidden'); if (!silent) SND.sfx('click', { f: 1400, bus: 'ui' }); },

  // ---- messaging ----
  receive(from, text, o = {}) {
    (this.threads[from] = this.threads[from] || []).push({ me: false, text, time: Story.clockStr(), read: false });
    if (this.signal > 0 || o.force) {
      SND.sfx('vibrate', { n: 2, vol: 0.6 }); SND.sfx('smsTone', { delay: 0.05, vol: 0.5 });
      UI.toast(`✉ New message — ${from}`, 4);
      UI.hint('<b style="border:1px solid #777;padding:0 5px">TAB</b> check phone', 4);
    }
    if (this.open) this.render();
  },
  sendMine(to, text) { (this.threads[to] = this.threads[to] || []).push({ me: true, text, time: Story.clockStr(), read: true }); },
  // offer reply choices on a thread; cb(index) when sent
  offerReplies(to, options, cb) { this.replies[to] = { options, cb }; if (this.open) this.render(); },
  hasReplies(to) { return !!this.replies[to]; },

  // ---- calls ----
  // handler(name) -> async; returns when call ends
  onCall(name, fn) { this.callHandlers[name] = fn; },
  async dial(name) {
    this.close(true);
    if (this.signal <= 0) { UI.toast('No service', 2.5); SND.sfx('beep', { f: 600, dur: 0.4, bus: 'ui' }); return; }
    Story.flags['called_' + name] = (Story.flags['called_' + name] || 0) + 1;
    const h = this.callHandlers[name];
    UI.callUI(`📞 Calling ${U.esc(name)}…`);
    const rb = SND.loop('ringback', { bus: 'voice', vol: 0.5 });
    await Story.wait(h && h.quick ? 2 : 4.5);
    rb.stop(0.05);
    if (h) { await (h.fn || h)(); }
    else { // generic voicemail
      UI.callUI(`📞 ${U.esc(name)} — voicemail`);
      await Story.say('', `(${name}'s voicemail picks up.)`, 2.5, 'phone');
    }
    SND.sfx('hangup', { bus: 'ui', vol: 0.4 });
    UI.callUI(null);
  },
  ringIncoming(name, cb) {
    this.incomingCall = { name, cb };
    if (this.ringLoop) this.ringLoop.stop();
    this.ringLoop = SND.loop('cellRing', { bus: 'ui', vol: 0.5 });
    UI.toast(`📞 Incoming call — ${name}`, 6);
    UI.hint('<b style="border:1px solid #777;padding:0 5px">TAB</b> answer phone', 6);
    if (this.open) { this.screen = 'incoming'; this.render(); }
  },
  stopIncoming() { this.incomingCall = null; if (this.ringLoop) { this.ringLoop.stop(0.05); this.ringLoop = null; } if (this.open) { this.screen = 'home'; this.render(); } },

  // ---- input & rendering ----
  update() {
    if (!this.open) return;
    if (Input.pressed('Escape')) { this.close(); return; }
    const n = this.items().length;
    if (Input.pressed('KeyW') || Input.pressed('ArrowUp')) { this.sel = (this.sel - 1 + Math.max(1, n)) % Math.max(1, n); SND.sfx('button', { bus: 'ui' }); this.render(); }
    if (Input.pressed('KeyS') || Input.pressed('ArrowDown')) { this.sel = (this.sel + 1) % Math.max(1, n); SND.sfx('button', { bus: 'ui' }); this.render(); }
    if (Input.pressed('KeyE') || Input.pressed('Enter')) { Input.consume('KeyE'); SND.sfx('button', { bus: 'ui' }); this.select(); }
    if (Input.pressed('KeyQ') || Input.pressed('Backspace')) { SND.sfx('button', { bus: 'ui' }); this.back(); }
  },
  items() {
    switch (this.screen) {
      case 'home': return ['menu'];
      case 'menu': return ['Messages', 'Contacts'];
      case 'inbox': return this.inboxList();
      case 'thread': return this.replies[this.thread] ? ['Reply'] : [];
      case 'reply': return this.replies[this.thread] ? this.replies[this.thread].options : [];
      case 'contacts': return this.contacts;
      case 'incoming': return ['Answer'];
      default: return [];
    }
  },
  inboxList() { const names = Object.keys(this.threads).filter(k => this.threads[k].length); names.sort((a, b) => this.lastIdx(b) - this.lastIdx(a)); return names; },
  lastIdx(name) { const t = this.threads[name]; return t && t.length ? t[t.length - 1]._i || (t[t.length - 1]._i = ++Phone._ctr) : 0; },
  _ctr: 0,
  select() {
    const it = this.items();
    switch (this.screen) {
      case 'home': this.screen = 'menu'; this.sel = this.unread() ? 0 : 0; break;
      case 'menu': this.screen = this.sel === 0 ? 'inbox' : 'contacts'; this.sel = 0; break;
      case 'inbox': if (it[this.sel]) { this.thread = it[this.sel]; this.screen = 'thread'; this.sel = 0; for (const m of this.threads[this.thread]) m.read = true; } break;
      case 'thread': if (this.replies[this.thread]) { this.screen = 'reply'; this.sel = 0; } break;
      case 'reply': {
        const r = this.replies[this.thread]; if (!r) break;
        const txt = r.options[this.sel]; delete this.replies[this.thread];
        if (this.signal <= 0) { this.sendMine(this.thread, txt + '  [FAILED]'); UI.toast('Message failed — no service', 3); }
        else { this.sendMine(this.thread, txt); SND.sfx('beep', { f: 2200, dur: 0.06, bus: 'ui' }); if (r.cb) r.cb(this.sel, txt); }
        this.screen = 'thread'; this.sel = 0; break;
      }
      case 'contacts': { const name = it[this.sel]; if (name) this.dial(name); return; }
      case 'incoming': { const c = this.incomingCall; this.stopIncoming(); this.close(true); if (c && c.cb) c.cb(); return; }
    }
    this.render();
  },
  back() {
    switch (this.screen) {
      case 'home': this.close(); return;
      case 'menu': this.screen = 'home'; break;
      case 'inbox': case 'contacts': this.screen = 'menu'; break;
      case 'thread': this.screen = 'inbox'; break;
      case 'reply': this.screen = 'thread'; break;
      case 'incoming': this.close(); return;
    }
    this.sel = 0; this.render();
  },
  render() {
    $('ph-signal').textContent = this.signal > 0 ? '▂▄▆█'.slice(0, this.signal) : 'No Svc';
    $('ph-clock').textContent = Story.clockStr();
    $('ph-batt').textContent = '▮'.repeat(this.battery);
    const c = $('ph-content'); const it = this.items();
    const list = arr => arr.map((x, i) => `<div class="it ${i === this.sel ? 'sel' : ''}">${U.esc(x)}</div>`).join('');
    let sk = ['Select', 'Back'];
    switch (this.screen) {
      case 'home': { const n = this.unread(); c.innerHTML = `<div class="big">${Story.clockStr()}</div><div class="center">Fri Oct 15</div><br><div class="center">${n ? `✉ ${n} new message${n > 1 ? 's' : ''}` : (this.signal > 0 ? 'US CELLULAR' : 'NO SERVICE')}</div>`; sk = ['Menu', 'Close']; break; }
      case 'menu': c.innerHTML = `<div class="from">Menu</div>` + list(['✉ Messages' + (this.unread() ? ` (${this.unread()})` : ''), '☎ Contacts']); break;
      case 'inbox': c.innerHTML = `<div class="from">Inbox</div>` + (it.length ? it.map((n, i) => { const t = this.threads[n]; const last = t[t.length - 1]; const un = t.some(m => !m.me && !m.read); return `<div class="it ${i === this.sel ? 'sel' : ''}">${un ? '✉ ' : ''}${U.esc(n)}: ${U.esc(last.text)}</div>`; }).join('') : '<div class="center">(empty)</div>'); break;
      case 'thread': {
        const t = this.threads[this.thread] || [];
        const show = t.slice(-5);
        c.innerHTML = `<div class="from">${U.esc(this.thread)}</div>` + show.map(m => `<div class="msg" style="${m.me ? 'text-align:right;opacity:.75' : ''}">${m.me ? '' : ''}${U.esc(m.text)}<span style="font-size:14px;opacity:.6"> ${m.time}</span></div>`).join('') + (this.replies[this.thread] ? `<div class="it sel">↩ Reply</div>` : '');
        sk = [this.replies[this.thread] ? 'Reply' : '', 'Back'];
        c.scrollTop = 9999; break;
      }
      case 'reply': c.innerHTML = `<div class="from">Reply to ${U.esc(this.thread)}</div>` + list(it); sk = ['Send', 'Back']; break;
      case 'contacts': c.innerHTML = `<div class="from">Contacts</div>` + list(it); sk = ['Call', 'Back']; break;
      case 'incoming': c.innerHTML = `<div class="center" style="margin-top:30px">Incoming call</div><div class="big">${U.esc(this.incomingCall ? this.incomingCall.name : '')}</div>`; sk = ['Answer', 'Ignore']; break;
    }
    $('ph-sk-l').textContent = sk[0]; $('ph-sk-r').textContent = sk[1];
  },
};
