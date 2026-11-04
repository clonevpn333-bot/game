// Simulated studio chat: reacts to what just happened (kills, headshots, weapon, boss phase, votes,
// low HP, deaths), runs faster as the fanbase grows, and carries little threads of the story
// (floor-specific chatter, lore drops, recurring viewers). Purely cosmetic; B hides it.
import { BUILD } from '../build.js';
import { FLOOR_CHAT, LORE_CHAT } from '../game/story.js';

const NAMES = ['LagGoblin', 'ToastEnjoyer', 'HaloPRTeam', 'DefinitelyIris', 'ClankerUnion', '99FanClub', 'DustpanCEO', 'AirFryerMain', 'Floor13Leaks', 'RatWithWiFi', 'MomImOnTV', 'NoScopeNana', 'ChairGaming', 'TaxEvaderBot', 'CertifiedYapper', 'WKeyWarrior', 'BlueRingEnjoyer', 'AverageDoorFan', 'MicrowaveMage', 'RespawnInvestor', 'BudgetBatman', 'PatchNotesPls', 'GrappleGremlin', 'MainCharacter99'];
const COLORS = ['#78e9ff', '#ffa5d4', '#ffd36d', '#aaffbd', '#b8a4ff'];
const LINES = {
  ambient: ['new here, why does the host want him dead', 'chat am I late', 'anyone else watching instead of sleeping', 'the bots are unionizing after this', '99 emote when', 'Iris fan club checking in', 'no spoilers for the next floor pls', 'music kinda hits ngl', 'why are the sponsors selling jump boots', 'the building has beef with this man personally', 'I skipped dinner for this broadcast', 'bro is speedrunning the insurance claim', 'Halo laughing like he does not own the building', 'this soundtrack has no business going this hard', 'I would simply take the stairs', 'protect this contestant at all costs', 'Halo please unban me from floor seven', 'not the dustpan sponsorship again'],
  kill: ['HE COOKED', 'someone clip that immediately', 'scrap delivery has arrived', 'that robot just got sent to the lobby', 'W aim. W fit. W lawsuit.', 'he is the main character I fear', 'one bot down, nine thousand invoices to go', 'that was disrespectful. do it again.', '99 IS HIM', 'robot folded like a camping chair', 'the clanker union will remember this'],
  head: ['THE OPTICS ARE GONE', 'actual laser aim', 'that bot saw the patch notes early', 'nah the headshot was personal', 'he clicked uninstall', 'camera ready? camera DEAD.'],
  hurt: ['bro is tanking the content', 'dodge button found dead in a ditch', 'HP bar doing a disappearing act', 'please stop blocking bullets with your forehead', '99 you are stressing me OUT', 'the floor is winning the argument'],
  low: ['HEAL HEAL HEAL', 'stop peeking you have no HP', 'my goat please break line of sight', 'the health bar is a rumor', 'one repair cell and a dream'],
  death: ['nah run that back', 'we do not count the warmup', 'gg building diff', 'I blinked. what happened', 'believers are refinancing', 'the building won custody'],
  slide: ['bro is floor inspecting again', 'slide tech looks clean tbf', 'knees carrying the broadcast', 'movement merchants rise up'],
  doubleJump: ['HOPCORP STOCKS TO THE MOON', 'gravity filed a complaint', 'bro bought the deluxe knees', 'double jump was actually cinema'],
  grapple: ['THE MOVEMENT', 'bro is a ceiling enthusiast', 'spider-man if rent was due', 'the blue rings are his natural habitat'],
  melee: ['HANDS RATED E FOR EVERY ROBOT', 'bro brought cutlery to a gunfight', 'the disrespect is astronomical', 'close range emotional damage', 'he is personally returning the warranty'],
  vote: ['vote for violence, respectfully', 'democracy has never been so flammable', 'I picked the worst option. you are welcome.', 'CHAT STOP TRYING TO END THE RUN', 'the producers definitely count these fairly', 'let him COOK. or be cooked.'],
  donate: ['for the repair bill, king', 'buy yourself a health bar', 'for Iris and her unpaid overtime', 'do the cool thing again', 'one more run for the believers', 'Halo owes me a refund, sending this to you instead', 'I sold my microwave for this broadcast', 'for the robot funeral fund'],
  weapon: {
    revolver: ['that revolver kick is NASTY', 'six rounds, six personal grudges', 'peacemaker putting in overtime', 'one tap enjoyers eating tonight'],
    shotgun: ['SHOTGUN STOCKS UP', "sponsor's choice just repossessed that bot", 'close range tax collected', 'the loud end is doing numbers'],
    rifle: ['ratings rifle is printing scrap', 'tracking actually clean rn', 'he is holding the angle for once', 'mag dump economy thriving'],
    rail: ['IT WENT THROUGH HIM', 'railgun just ended a family tree', 'line them up again omg', 'that charge was worth the wait'],
    gravity: ['the furniture is fighting back', 'he threw a whole coworker', 'barrel delivery service is LIVE', 'gravity cannon my beloved'],
    smg: ['the ad break SMG never stops talking', 'bullet hose economy', 'he is spraying AND praying', 'commercial interruption delivered'],
    launcher: ['CONFETTI WARCRIME', 'party popper of doom', 'that splash damage was a celebration', 'happy birthday to nobody'],
    minigun: ['THE ENCORE HAS BEGUN', 'spin up and spin out', 'the floor is now a recycling plant', 'it is giving finale'],
    beam: ['SPOTLIGHT ON THEM. PERMANENTLY.', 'the laser is laser-ing', 'beam me up, scrap me down', 'he is literally cancelling them'],
    arc: ['chain lightning got the whole group chat', 'SHOCKING. genuinely.', 'electric bill: paid', 'the arc caster is diabolical'],
  },
};
const fmtFans = (f) => (f >= 1e6 ? (f / 1e6).toFixed(1) + 'M' : f >= 1e3 ? (f / 1e3).toFixed(1) + 'K' : String(f));
// Chat rate scales with the fanbase: a quiet trickle at 0 fans, a waterfall at a million.
function chatPeriod(fans, voting) {
  const scale = Math.min(1, Math.log10(1 + Math.max(0, Number(fans) || 0)) / 5), period = 6.5 - 6.15 * Math.pow(scale, 0.72);
  return Math.max(BUILD.fast ? 0.42 : 0.24, period * (voting ? 0.55 : 1));
}

export class StudioChat {
  constructor(app) {
    this.app = app;
    this.queue = []; this.time = 0; this.next = 2; this.ambient = 6; this.lastDonate = -30; this.lastEvent = {}; this.hidden = false;
    this.lastContext = { key: 'ambient', time: -100 }; this.lastFanCount = -1; this.currentTopic = 'ambient'; this.lastSeenFloor = null;
    this.storyIdx = 0;
    this.el = document.createElement('aside');
    this.el.id = 'studioChat';
    this.el.innerHTML = '<div class="sc-head"><span>● STUDIO CHAT</span><small>0 FANS</small></div><div class="sc-feed"></div><div class="sc-foot">Simulated audience · B hide · studio credits</div>';
    document.getElementById('app').appendChild(this.el);
    this.feed = this.el.querySelector('.sc-feed');
    this.headerFans = this.el.querySelector('.sc-head small');
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB' && !e.repeat) { this.hidden = !this.hidden; this.el.classList.toggle('sc-hidden', this.hidden); }
    });
  }
  pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  add(text, kind = 'normal', user) {
    const limit = BUILD.fast ? 12 : 18;
    if (this.queue.length >= limit) this.queue.shift();
    this.queue.push({ text, kind, user: user || this.pick(NAMES), topic: this.currentTopic, expires: this.time + (kind === 'donation' || kind === 'story' ? 18 : 9) });
  }
  react(key) { this.add(this.pick(LINES[key] || LINES.ambient)); }
  clear() { this.vote = null; this.queue.length = 0; }
  donate() {
    const fans = this.app.save?.data.fans || 0, wait = Math.max(22, 55 - Math.log10(1 + fans) * 6);
    if (this.time - this.lastDonate < wait) return;
    this.lastDonate = this.time;
    let line = this.pick(LINES.donate);
    const boss = this.app.game?.enemies?.find((e) => e.alive && e.isBoss);
    if (this.lastContext.key === 'head') line = 'for that headshot. do it again';
    else if (this.lastContext.key === 'low') line = 'please spend this on a repair cell';
    else if (boss) line = `finish the ${(boss.bossName || 'boss').toLowerCase()}. I believe`;
    this.add(line, 'donation');
  }
  onEvent(event, data, game) {
    const gate = event === 'kill' ? 0.55 : event === 'playerHurt' ? 4 : 1.8;
    if (this.time - (this.lastEvent[event] ?? -100) < gate) return;
    this.lastEvent[event] = this.time; this.currentTopic = event;
    if (event === 'voteStart') {
      this.vote = data; this.voteTick = 0; this.queue = this.queue.filter((m) => m.kind === 'donation');
      this.currentTopic = 'vote'; this.add('poll is up. be normal.', 'mod', 'StudioMod'); this.voteMessage(); this.donate();
    } else if (event === 'voteResult') {
      this.vote = null; this.queue = this.queue.filter((m) => m.topic !== 'vote');
      this.add((data.winner?.label || 'chaos').toLowerCase() + ' won ' + (data.rigged ? '...that tally looked suspicious' : 'we did this to ourselves'), 'mod', 'StudioMod');
      this.add(data.rigged ? 'rigged but funny' : 'democracy was a mistake');
    } else if (event === 'kill') {
      const head = data?.info?.head || data?.tags?.some((t) => t[0] === 'HEADSHOT'), weapon = data?.weapon || data?.info?.weapon || game.player?.arsenal?.current?.id;
      this.lastContext = { key: head ? 'head' : weapon === 'blades' || weapon === 'hammer' ? 'melee' : 'kill', weapon, time: this.time };
      this.react(this.lastContext.key);
      if (LINES.weapon[weapon] && Math.random() < 0.6) this.add(this.pick(LINES.weapon[weapon]));
      if (game.combo.count >= 3) { this.add(game.combo.count + ' COMBO. DO NOT CHOKE'); if (Math.random() < 0.3) this.donate(); }
    } else if (event === 'playerHurt') {
      const key = data.hp < 30 ? 'low' : 'hurt'; this.lastContext = { key, time: this.time }; this.react(key);
    } else if (event === 'death') {
      this.clear(); this.lastContext = { key: 'death', time: this.time }; this.react('death'); this.add('gg go next');
    } else if (['slide', 'doubleJump', 'grapple', 'wallrun', 'reflect'].includes(event)) {
      const key = ['wallrun', 'reflect'].includes(event) ? 'grapple' : event; this.lastContext = { key, time: this.time }; this.react(key);
    } else if (event === 'weaponSwitch') {
      if (LINES.weapon[data]) this.add('swapped to ' + (game.player?.arsenal?.current?.def.short || data).toLowerCase() + ', let him cook');
    } else if (event === 'foremanArm') { this.lastContext = { key: 'boss', time: this.time }; this.add('ARM DOWN'); this.add('now get the other joint'); }
    else if (event === 'eventStart') { this.lastContext = { key: 'event', time: this.time }; this.add((data.def?.label || 'chaos').toLowerCase() + ' is live. chat owes him an apology'); }
    else if (event === 'story') { this.add(data.text, 'story', data.user); }
    this.currentTopic = 'ambient';
  }
  voteMessage() {
    if (!this.vote?.options?.length) return;
    const label = this.pick(this.vote.options).label.toLowerCase();
    this.currentTopic = 'vote';
    this.add(this.pick(['all in on ' + label, label + ' voters where you at', 'why are we picking ' + label + ' lmao', 'I voted ' + label + '. no regrets', 'mods count my ' + label + ' vote twice']));
    if (Math.random() < 0.35) this.react('vote');
    this.currentTopic = 'ambient';
  }
  // a message related to what is on screen right now
  relatedMessage(game) {
    if (!game || !game.player?.alive) { this.react(this.app.state === 'dead' ? 'death' : 'ambient'); return; }
    const boss = game.enemies?.find((e) => e.alive && e.isBoss);
    if (boss && boss.chatHint && this.lastBossMode !== boss.mode && this.time - (this.lastBossChat || 0) > 4) {
      this.lastBossMode = boss.mode; this.lastBossChat = this.time;
      this.add(boss.chatHint(boss.mode)); return;
    }
    if (game.player.hp < 30) { this.react('low'); return; }
    if (this.time - this.lastContext.time < 7 && LINES[this.lastContext.key]) { this.react(this.lastContext.key); return; }
    // story threads: floor chatter and the occasional lore leak
    const fl = FLOOR_CHAT[game.floorDef.id];
    if (fl && Math.random() < 0.3) { this.add(this.pick(fl)); return; }
    if (Math.random() < 0.08) { const [user, text] = LORE_CHAT[this.storyIdx++ % LORE_CHAT.length]; this.add(text, 'story', user); return; }
    if (Math.random() < 0.22 && this.lastPoster) this.add('@' + this.lastPoster + ' ' + this.pick(['fr', 'nah let him cook', 'you said he was washed 10 seconds ago', 'believers only', 'clip it then']));
    else this.react('ambient');
  }
  update(dt, state, paused) {
    this.el.style.display = ['game', 'elevator', 'lounge', 'dead', 'complete'].includes(state) ? '' : 'none';
    if (paused) return;
    this.time += dt;
    const game = this.app.game, fans = this.app.save?.data.fans || 0;
    if (fans !== this.lastFanCount) { this.lastFanCount = fans; this.headerFans.textContent = fmtFans(fans) + ' FANS'; }
    if (this.vote && !game?.audience?.voting) { this.vote = null; this.queue = this.queue.filter((m) => m.topic !== 'vote'); }
    const period = chatPeriod(fans, !!this.vote);
    if (game?.floorDef?.id !== undefined && this.lastSeenFloor !== game.floorDef.id) {
      this.lastSeenFloor = game.floorDef.id;
      this.add('floor ' + game.floorDef.id + ' · ' + game.floorDef.name.toLowerCase(), 'mod', 'StudioMod');
    }
    this.next -= dt; this.ambient -= dt;
    if (this.vote) { this.voteTick -= dt; if (this.voteTick <= 0) { this.voteTick = Math.max(0.45, period * 0.9); this.voteMessage(); } }
    else if (this.ambient <= 0) { this.ambient = Math.max(0.4, period * (0.8 + Math.random() * 0.6)); this.relatedMessage(game); if (Math.random() < 0.1) this.donate(); }
    this.queue = this.queue.filter((m) => m.expires >= this.time);
    if (this.next > 0 || !this.queue.length) return;
    this.next = period * (0.7 + Math.random() * 0.6);
    const msg = this.queue.shift(), row = document.createElement('div');
    row.className = 'sc-row ' + msg.kind;
    const name = document.createElement('b'); name.textContent = msg.user;
    name.style.color = msg.kind === 'story' ? '#7dffb0' : this.pick(COLORS);
    row.appendChild(name);
    if (msg.kind === 'donation') { const amt = document.createElement('span'); amt.className = 'sc-credit'; amt.textContent = '★ ' + this.pick([50, 100, 250, 500, 999]) + ' studio credits'; row.appendChild(amt); }
    const text = document.createElement('span'); text.textContent = msg.text; row.appendChild(text);
    this.feed.appendChild(row); this.lastPoster = msg.user;
    while (this.feed.children.length > (BUILD.fast ? 6 : 8)) this.feed.firstChild.remove();
    this.feed.scrollTop = this.feed.scrollHeight;
  }
}
