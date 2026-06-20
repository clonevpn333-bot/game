'use strict';

/* =====================================================================
   ui.js — DOM/HTML overlay on top of the WebGL canvas: title menu,
   customise, how-to, trophies, in-game HUD and result screens.
   Fall Guys "bubblegum" look: rounded candy cards, bold type, soft shadows.
   ===================================================================== */

const UI = {
    data: null, hooks: null, els: {}, _toasts: [],

    rarity(r) {
        return { common: '#b9c2cc', uncommon: '#46d36a', rare: '#3fa9ff', epic: '#b06bff', legendary: '#ffd23f' }[r] || '#fff';
    },

    _el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    },
    _btn(label, cls, onClick) {
        const b = this._el('button', 'br-btn ' + (cls || ''), label);
        b.onclick = onClick;
        return b;
    },

    mount(root, data, hooks) {
        this.data = data; this.hooks = hooks;
        this._injectCSS();

        this.layer = this._el('div', 'br-layer');
        root.appendChild(this.layer);

        // big panels
        for (const id of ['menu', 'customize', 'howto', 'trophies', 'shop', 'fallpass', 'loading', 'eliminated', 'victory']) {
            const p = this._el('div', 'br-panel br-' + id);
            this.els[id] = p; this.layer.appendChild(p);
        }
        // play overlays
        this.els.hud = this._el('div', 'br-hud'); this.layer.appendChild(this.els.hud);
        this.els.intro = this._el('div', 'br-intro'); this.layer.appendChild(this.els.intro);
        this.els.banner = this._el('div', 'br-banner'); this.layer.appendChild(this.els.banner);
        this.els.toasts = this._el('div', 'br-toasts'); this.layer.appendChild(this.els.toasts);

        this._buildHUD();
        this.hideAll();
    },

    // Only the top-level panels & play overlays get hidden here — NOT nested
    // helpers like the lobby/preview bean canvases or the HUD chips, which live
    // *inside* a panel/overlay. Blanket-hiding those (the old bug) collapsed the
    // 3D bean boxes to 0×0 and left the HUD counters stuck at display:none.
    _tops: ['menu', 'customize', 'howto', 'trophies', 'shop', 'fallpass', 'loading',
        'eliminated', 'victory', 'hud', 'intro', 'banner'],
    hideAll() {
        for (const k of this._tops) if (this.els[k]) this.els[k].style.display = 'none';
    },
    _showBig(id) {
        this.hideAll();
        this._activeBig = id;
        this.els[id].style.display = 'flex';
    },

    // ================================================== MENU
    showMenu() {
        const s = this.hooks.getSave();
        const p = this.els.menu; p.innerHTML = '';
        const row = this._el('div', 'br-lobby');
        this.els.lobbyBean = this._el('div', 'br-lobby-bean');   // engine mounts your 3D bean here
        row.appendChild(this.els.lobbyBean);
        const right = this._el('div', 'br-lobby-right');
        right.appendChild(this._el('div', 'br-title', 'BEAN<span>ROYALE</span>'));
        right.appendChild(this._el('div', 'br-sub', 'Dive, bounce &amp; grab your way to the Crown!'));
        const col = this._el('div', 'br-col');
        col.appendChild(this._btn('▶  PLAY SHOW', 'br-big', this.hooks.onPlay));
        const pp = this.hooks.getPass ? this.hooks.getPass() : null;
        const claimable = pp && pp.claimable ? `<span class="br-badge">${pp.claimable}</span>` : '';
        col.appendChild(this._btn(`🎖️  FALL PASS${claimable}`, 'br-gold', this.hooks.onFallPass));
        col.appendChild(this._btn('🎨  CUSTOMISE', 'br-blue', this.hooks.onCustomize));
        col.appendChild(this._btn('🛒  SHOP', 'br-pink', this.hooks.onShop));
        col.appendChild(this._btn('🏆  TROPHIES', 'br-purple', this.hooks.onTrophies));
        col.appendChild(this._btn('?  HOW TO', 'br-pink', this.hooks.onHowTo));
        right.appendChild(col);
        row.appendChild(right);
        p.appendChild(row);
        p.appendChild(this._el('div', 'br-foot',
            `👑 ${s.crowns} &nbsp;·&nbsp; ⓚ ${s.kudos} Kudos &nbsp;·&nbsp; Streak ${s.streak} (best ${s.bestStreak})`));
        this._showBig('menu');
    },

    // ================================================== CUSTOMISE
    showCustomize() {
        this._renderCustomize();
        this._showBig('customize');
    },
    _renderCustomize() {
        const s = this.hooks.getSave(), d = this.data, p = this.els.customize;
        p.innerHTML = '';
        p.appendChild(this._el('div', 'br-h', 'CUSTOMISE YOUR BEAN'));
        p.appendChild(this._el('div', 'br-kudos', `ⓚ ${s.kudos} Kudos &nbsp;·&nbsp; only your unlocked items show here — grab more in the 🛒 Shop`));
        const wrap = this._el('div', 'br-cust-wrap');

        // preview box (engine mounts a 3D canvas here)
        this.els.preview = this._el('div', 'br-preview');
        wrap.appendChild(this.els.preview);

        const right = this._el('div', 'br-cust-right');
        const slots = [
            ['color', 'Colour', d.COLORS, s.color, x => x.name],
            ['pattern', 'Pattern', d.PATTERNS, s.pattern, x => x.name],
            ['faceplate', 'Faceplate', d.FACEPLATES, s.faceplate, x => x.name],
            ['upper', 'Upper', d.COSTUMES_UPPER, s.upper, x => x.name],
            ['lower', 'Lower', d.COSTUMES_LOWER, s.lower, x => x.name],
        ];
        for (const [key, label, arr, idx, namer] of slots) {
            const cur = arr[idx];
            const row = this._el('div', 'br-slot');
            row.appendChild(this._el('span', 'br-slot-label', label));
            row.appendChild(this._btn('‹', 'br-arrow', () => { this.hooks.onCycle(key, -1); this._renderCustomize(); }));
            const v = this._el('span', 'br-slot-val', namer(cur) + `<em style="color:${this.rarity(cur.rarity)}">${cur.rarity}</em>`);
            v.style.color = this.rarity(cur.rarity);
            row.appendChild(v);
            row.appendChild(this._btn('›', 'br-arrow', () => { this.hooks.onCycle(key, 1); this._renderCustomize(); }));
            right.appendChild(row);
        }
        // emotes
        right.appendChild(this._el('div', 'br-h2', 'GESTURE LOADOUT &nbsp;(keys 1–4)'));
        const erow = this._el('div', 'br-emotes');
        for (let i = 0; i < 4; i++) {
            const em = d.EMOTES[s.emotes[i]];
            const cell = this._el('div', 'br-emote');
            cell.appendChild(this._el('div', 'br-emote-name', (i + 1) + '· ' + em.name));
            const ctr = this._el('div', 'br-emote-ctr');
            ctr.appendChild(this._btn('‹', 'br-arrow sm', () => { this.hooks.onEmoteCycle(i, -1); this._renderCustomize(); }));
            ctr.appendChild(this._el('span', 'br-emote-snd', '♪ ' + em.sound));
            ctr.appendChild(this._btn('›', 'br-arrow sm', () => { this.hooks.onEmoteCycle(i, 1); this._renderCustomize(); }));
            cell.appendChild(ctr);
            erow.appendChild(cell);
        }
        right.appendChild(erow);
        wrap.appendChild(right);
        p.appendChild(wrap);

        const bar = this._el('div', 'br-cust-bar');
        bar.appendChild(this._btn('‹ BACK', 'br-pink', this.hooks.onMenu));
        bar.appendChild(this._btn('🛒 SHOP', 'br-blue', this.hooks.onShop));
        bar.appendChild(this._btn('START SHOW ▶', 'br-big', this.hooks.onPlay));
        p.appendChild(bar);
    },
    previewContainer() { return this._activeBig === 'menu' ? this.els.lobbyBean : this.els.preview; },

    // ================================================== SHOP (rotating)
    _slotArr(slot) {
        return { upper: this.data.COSTUMES_UPPER, lower: this.data.COSTUMES_LOWER,
            color: this.data.COLORS, pattern: this.data.PATTERNS, faceplate: this.data.FACEPLATES }[slot];
    },
    _slotLabel(slot) { return { upper: 'Top', lower: 'Bottom', color: 'Colour', pattern: 'Pattern', faceplate: 'Faceplate' }[slot]; },
    _countdown(ms) {
        const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },
    showShop() {
        const s = this.hooks.getSave(), p = this.els.shop; p.innerHTML = '';
        const PRICE = { common: 0, uncommon: 500, rare: 1200, epic: 3000, legendary: 8000 };
        const rot = this.hooks.getShopRotation();
        p.appendChild(this._el('div', 'br-h', '🛒 ITEM SHOP'));
        p.appendChild(this._el('div', 'br-kudos', `ⓚ ${s.kudos} Kudos — earn more by playing Shows & climbing the Fall Pass!`));
        const bar = this._el('div', 'br-shop-rotbar');
        bar.appendChild(this._el('div', 'br-shop-rotlabel',
            `🔥 FEATURED TODAY &nbsp;·&nbsp; refreshes in <b>${this._countdown(this.hooks.getNextRotationMs())}</b>`));
        bar.appendChild(this._btn('🔄 Reroll · ⓚ150', 'br-blue sm', () => { this.hooks.onShopReroll(); this.showShop(); }));
        p.appendChild(bar);

        const grid = this._el('div', 'br-shop-grid');
        for (const { slot, idx } of rot) {
            const arr = this._slotArr(slot); if (!arr) continue;
            const item = arr[idx]; if (!item) continue;
            const owned = !!(s.owned[slot] && s.owned[slot][idx]);
            const equipped = s[slot] === idx;
            const price = PRICE[item.rarity] || 0;
            const card = this._el('div', 'br-shop-card' + (equipped ? ' eq' : '') + (owned ? ' own' : ''));
            card.style.borderColor = this.rarity(item.rarity);
            const act = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : ('ⓚ ' + price);
            card.innerHTML = `<div class="br-shop-slot">${this._slotLabel(slot)}</div>` +
                `<div class="br-shop-name">${item.name}</div>` +
                `<div class="br-shop-rar" style="color:${this.rarity(item.rarity)}">${item.rarity}</div>` +
                `<div class="br-shop-act">${act}</div>`;
            if (!owned && price > s.kudos) card.classList.add('br-cant');
            card.onclick = () => { this.hooks.onShopBuy(slot, idx); this.showShop(); };
            grid.appendChild(card);
        }
        p.appendChild(grid);
        p.appendChild(this._el('div', 'br-shop-note', 'Only featured items can be bought right now — the store rotates daily. Everything you own is equippable in 🎨 Customise.'));
        p.appendChild(this._btn('‹ BACK', 'br-pink', this.hooks.onMenu));
        this._showBig('shop');
    },

    // ================================================== FALL PASS
    showFallPass() {
        const s = this.hooks.getSave(), p = this.els.fallpass; p.innerHTML = '';
        const prog = this.hooks.getPassProgress();
        p.appendChild(this._el('div', 'br-h', '🎖️ FALL PASS'));
        const sub = prog.max
            ? `Tier ${prog.tier} · MAX — every reward unlocked, legend!`
            : `Tier ${prog.tier} · ${s.fame} Fame &nbsp;·&nbsp; ${prog.span - prog.into} Fame to Tier ${prog.tier + 1}`;
        p.appendChild(this._el('div', 'br-kudos', sub));
        const pbar = this._el('div', 'br-pass-bar');
        pbar.appendChild(this._el('i')).style.width = Math.round(prog.frac * 100) + '%';
        p.appendChild(pbar);

        const scroll = this._el('div', 'br-pass-scroll');
        for (const t of this.data.FALL_PASS) {
            const reached = s.fame >= t.fame;
            const claimed = !!s.passClaimed[t.tier];
            const claimable = reached && !claimed;
            const milestone = t.tier % 5 === 0;
            const card = this._el('div', 'br-pass-tier' + (claimed ? ' done' : '') + (claimable ? ' ready' : '') + (milestone ? ' mile' : ''));
            const r = t.reward;
            let rt, ri;
            if (r.kudos) { rt = `ⓚ ${r.kudos}`; ri = '💰'; }
            else if (r.crown) { rt = `${r.crown} Crown`; ri = '👑'; }
            else { const it = this._slotArr(r.slot)[r.idx]; rt = it.name; ri = '🎁';
                card.style.setProperty('--rar', this.rarity(it.rarity)); }
            card.innerHTML =
                `<div class="br-pass-tnum">T${t.tier}</div>` +
                `<div class="br-pass-ricon">${ri}</div>` +
                `<div class="br-pass-rname">${rt}</div>` +
                `<div class="br-pass-state">${claimed ? '✓ Claimed' : claimable ? 'CLAIM' : t.fame + ' Fame'}</div>`;
            if (claimable) card.onclick = () => { this.hooks.onPassClaim(t.tier); this.showFallPass(); };
            scroll.appendChild(card);
        }
        p.appendChild(scroll);
        p.appendChild(this._el('div', 'br-shop-note', 'Earn Fame by playing Shows — qualifying, surviving and winning. Claim each tier to bank Kudos and unlock exclusive cosmetics.'));
        p.appendChild(this._btn('‹ BACK', 'br-pink', this.hooks.onMenu));
        this._showBig('fallpass');
    },

    // ================================================== HOW TO
    showHowTo() {
        const p = this.els.howto; p.innerHTML = '';
        p.appendChild(this._el('div', 'br-h', 'HOW TO PLAY'));
        const rows = [
            ['Move', 'WASD / Arrow Keys'], ['Jump', 'Space — hop sweepers &amp; low bars'],
            ['Dive', 'Shift — fast lunge (then a slow recovery)'], ['Grab', 'J / L — grab a rival; release to fling'],
            ['Gesture', '1–4 — perform your equipped emotes'], ['Goal', 'Qualify each round until one bean takes the Crown.'],
        ];
        const list = this._el('div', 'br-howlist');
        for (const [k, v] of rows) {
            const r = this._el('div', 'br-howrow');
            r.appendChild(this._el('span', 'br-howk', k));
            r.appendChild(this._el('span', 'br-howv', v));
            list.appendChild(r);
        }
        p.appendChild(list);
        p.appendChild(this._el('div', 'br-h2', 'ROUNDS'));
        const rl = this._el('div', 'br-howlist');
        for (const def of this.data.SHOW) {
            const r = this._el('div', 'br-howrow');
            r.appendChild(this._el('span', 'br-howk', def.name));
            r.appendChild(this._el('span', 'br-howv', `[${def.category}] ${def.tagline}`));
            rl.appendChild(r);
        }
        p.appendChild(rl);
        p.appendChild(this._btn('‹ BACK', 'br-pink', this.hooks.onMenu));
        this._showBig('howto');
    },

    // ================================================== TROPHIES
    showTrophies() {
        const s = this.hooks.getSave(), p = this.els.trophies; p.innerHTML = '';
        p.appendChild(this._el('div', 'br-h', '🏆 TROPHIES'));
        p.appendChild(this._el('div', 'br-sub2', `Crowns ${s.crowns} · Best Streak ${s.bestStreak}`));
        const list = this._el('div', 'br-trlist');
        for (const a of this.data.ACHIEVEMENTS) {
            const got = !!s.achievements[a.id];
            const r = this._el('div', 'br-trophy' + (got ? ' got' : ''));
            r.appendChild(this._el('span', 'br-tricon', got ? '✔' : '🔒'));
            const tx = this._el('div', 'br-trtext');
            tx.appendChild(this._el('div', 'br-trname', a.name));
            tx.appendChild(this._el('div', 'br-trdesc', a.desc));
            r.appendChild(tx);
            list.appendChild(r);
        }
        p.appendChild(list);
        p.appendChild(this._btn('‹ BACK', 'br-pink', this.hooks.onMenu));
        this._showBig('trophies');
    },

    // ================================================== HUD
    _buildHUD() {
        const h = this.els.hud;
        this.els.hudName = this._el('div', 'br-chip br-left');
        this.els.hudCount = this._el('div', 'br-chip br-right');
        this.els.hudSpec = this._el('div', 'br-spec');
        this.els.hudHint = this._el('div', 'br-hint',
            'WASD move · SPACE jump · SHIFT dive · J grab · 1-4 gesture');
        h.appendChild(this.els.hudName); h.appendChild(this.els.hudCount);
        h.appendChild(this.els.hudSpec); h.appendChild(this.els.hudHint);
    },
    showHUD() {
        this.hideAll();
        this.els.hud.style.display = 'block';
        // make sure the chips themselves are visible (they may have been left
        // hidden by an earlier state); hudSpec is toggled per-frame in updateHUD
        this.els.hudName.style.display = 'block';
        this.els.hudCount.style.display = 'block';
        this.els.hudHint.style.display = 'block';
    },
    _catColor(c) { return { Race: '#5ad1ff', Survival: '#ffd23f', Final: '#ff5fa2', Hunt: '#ff9447', Logic: '#9a6cff' }[c] || '#fff'; },
    updateHUD(hud) {
        const cat = this._catColor(hud.category);
        this.els.hudName.innerHTML = `<b>${hud.name}</b><span style="color:${cat}">${hud.category.toUpperCase()}</span>`;
        let r;
        if (hud.kind === 'race' || hud.kind === 'tiptoe')
            r = `<span style="color:#46d36a">QUALIFIED</span><b>${hud.qualifiedCount} / ${hud.qualifyCount}</b>`;
        else if (hud.kind === 'survival')
            r = `<span style="color:#ffd23f">SURVIVE&nbsp;·&nbsp;${hud.aliveCount} LEFT</span><b>${this._t(hud.timer)}</b>`;
        else if (hud.kind === 'tag')
            r = `<span style="color:${hud.youHaveTail ? '#46d36a' : '#ff5fa2'}">${hud.youHaveTail ? '🏷️ TAIL SAFE' : '❌ GRAB A TAIL!'}&nbsp;·&nbsp;${hud.tailCount} tails</span><b>${this._t(hud.timer)}</b>`;
        else if (hud.kind === 'mountain')
            r = `<span style="color:#ffd23f">🏔️ TO THE CROWN</span><b>${hud.aliveCount} racing</b>`;
        else
            r = `<span style="color:#ff5fa2">${hud.aliveCount <= 2 ? 'FINAL TWO!' : 'BEANS LEFT'}</span><b>${hud.aliveCount}</b>`;
        this.els.hudCount.innerHTML = r;
        if (this.els.hudSpec) {
            this.els.hudSpec.style.display = hud.spectating ? 'block' : 'none';
            if (hud.spectating) this.els.hudSpec.innerHTML = '👀 SPECTATING — watching the round play out';
        }
    },
    _t(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },

    // ============================== ROUND-SELECT REEL (loading screen)
    showLoading(info) {
        info = info || {};
        const p = this.els.loading; p.innerHTML = '';
        p.appendChild(this._el('div', 'br-load-tag', `ROUND ${info.index || 1} OF ${info.total || 1}`));
        p.appendChild(this._el('div', 'br-reel-title', 'SELECTING ROUND…'));

        const win = this._el('div', 'br-reel-window');
        const strip = this._el('div', 'br-reel-strip');
        const reel = info.reel && info.reel.length ? info.reel : [{ name: info.name, category: info.category }];
        const ICON = { Race: '🏁', Survival: '⏱️', Final: '👑', Hunt: '🏷️', Logic: '🧠' };
        for (const d of reel) {
            const c = this._catColor(d.category);
            const card = this._el('div', 'br-reel-card');
            card.style.setProperty('--c', c);
            card.innerHTML =
                `<span class="br-reel-ico">${ICON[d.category] || '🎮'}</span>` +
                `<span class="br-reel-txt"><b class="br-reel-name">${d.name}</b>` +
                `<span class="br-reel-cat" style="color:${c}">${(d.category || '').toUpperCase()}</span></span>`;
            strip.appendChild(card);
        }
        win.appendChild(strip);
        win.appendChild(this._el('div', 'br-reel-marker'));
        p.appendChild(win);
        p.appendChild(this._el('div', 'br-reel-tag', info.tagline || 'Get ready, bean!'));
        this._showBig('loading');

        // slot-machine landing: scroll fast from the top and ease onto the real round
        const CH = 84, CENTER = 2, land = info.land || 0;
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0px)';
        void strip.offsetHeight;                      // force reflow so the transition fires
        const cards = strip.children;
        requestAnimationFrame(() => {
            strip.style.transition = 'transform 2.0s cubic-bezier(.10,.60,.15,1)';
            strip.style.transform = `translateY(${-(land - CENTER) * CH}px)`;
            if (cards[land]) setTimeout(() => cards[land].classList.add('br-reel-hit'), 1950);
        });
    },

    // ================================================== INTRO CARD
    showIntro(intro) {
        this.hideAll();
        const cat = this._catColor(intro.category);
        const cd = intro.countdown == null ? '' : `<div class="br-count">${intro.countdown > 0 ? intro.countdown : 'GO!'}</div>`;
        const q = intro.qualify ? `<div class="br-qual">Top ${intro.qualify} qualify</div>` : '';
        this.els.intro.innerHTML =
            `<div class="br-intro-card"><div class="br-intro-cat" style="color:${cat}">${intro.category.toUpperCase()}</div>` +
            `<div class="br-intro-name">${intro.name}</div>` +
            `<div class="br-intro-tag">${intro.tagline}</div>${q}${cd}</div>`;
        this.els.intro.style.display = 'flex';
    },

    // ================================================== ENDING BANNER
    showEndingBanner(res) {
        let txt, col, sub = '';
        if (res.outcome === 'qualify') { txt = 'QUALIFIED!'; col = '#46d36a'; sub = res.bigTease ? 'Style points! 😎' : 'You placed #' + res.place; }
        else if (res.outcome === 'win') { txt = '👑 VICTORY 👑'; col = '#ffd23f'; }
        else { txt = 'ELIMINATED'; col = '#ff4d6d'; }
        this.els.banner.innerHTML = `<div class="br-banner-in" style="color:${col}">${txt}<div class="br-banner-sub">${sub}</div></div>`;
        this.els.banner.style.display = 'flex';
    },

    // ================================================== RESULT SCREENS
    showEliminated(info) {
        const p = this.els.eliminated; p.innerHTML = '';
        p.appendChild(this._el('div', 'br-result-big', 'ELIMINATED'));
        p.appendChild(this._el('div', 'br-result-sub', `Knocked out in ${info.roundName} — placed #${info.place}`));
        p.appendChild(this._el('div', 'br-result-sub2', `You cleared ${info.roundsCleared} of ${info.totalRounds} rounds`));
        if (info.earned != null) p.appendChild(this._el('div', 'br-earned', `+${info.earned} Kudos  ·  ⓚ ${info.kudos} total`));
        if (info.fame) p.appendChild(this._el('div', 'br-result-sub2', `🎖️ +${info.fame} Fame toward your Fall Pass`));
        const bar = this._el('div', 'br-col br-row');
        bar.appendChild(this._btn('↻ PLAY AGAIN', 'br-big', this.hooks.onPlay));
        bar.appendChild(this._btn('☰ MAIN MENU', 'br-blue', this.hooks.onMenu));
        p.appendChild(bar);
        this._showBig('eliminated');
    },
    showVictory(info) {
        const s = this.hooks.getSave(), p = this.els.victory; p.innerHTML = '';
        p.appendChild(this._el('div', 'br-crown', '👑'));
        p.appendChild(this._el('div', 'br-result-big', 'WINNER WINNER!'));
        p.appendChild(this._el('div', 'br-result-sub', 'You grabbed the Crown!'));
        p.appendChild(this._el('div', 'br-result-sub2', `Crowns: ${s.crowns} · Win Streak: ${s.streak}`));
        if (info.earned != null) p.appendChild(this._el('div', 'br-earned', `+${info.earned} Kudos  ·  ⓚ ${info.kudos} total`));
        if (info.fame) p.appendChild(this._el('div', 'br-result-sub2', `🎖️ +${info.fame} Fame toward your Fall Pass`));
        const bar = this._el('div', 'br-col br-row');
        bar.appendChild(this._btn('↻ PLAY AGAIN', 'br-big', this.hooks.onPlay));
        bar.appendChild(this._btn('☰ MAIN MENU', 'br-blue', this.hooks.onMenu));
        p.appendChild(bar);
        // confetti
        const conf = this._el('div', 'br-confetti');
        for (let i = 0; i < 40; i++) {
            const c = this._el('i');
            c.style.left = Math.random() * 100 + '%';
            c.style.background = ['#ffd23f', '#5ad1ff', '#46d36a', '#fff', '#ff5fa2'][i % 5];
            c.style.animationDelay = (Math.random() * 2) + 's';
            c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
            conf.appendChild(c);
        }
        p.appendChild(conf);
        this._showBig('victory');
    },

    // ================================================== TOASTS
    toast(ach) {
        const t = this._el('div', 'br-toast', `<small>🏆 Trophy Unlocked</small><b>${ach.name}</b>`);
        this.els.toasts.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3600);
    },

    // ================================================== CSS
    _injectCSS() {
        const css = `
.br-layer{position:absolute;inset:0;pointer-events:none;font-family:system-ui,'Segoe UI',Roboto,sans-serif;overflow:hidden;color:#fff;z-index:10}
.br-panel{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center;padding:24px}
.br-menu,.br-customize,.br-howto,.br-trophies,.br-shop,.br-fallpass{background:linear-gradient(160deg,#6a5cff,#a24bd6 55%,#ff5fa2)}
.br-eliminated{background:linear-gradient(160deg,#3a2350,#1c1430)}
.br-victory{background:linear-gradient(160deg,#7b46d6,#ff5fa2)}
.br-loading{background:linear-gradient(160deg,#6a5cff,#a24bd6 55%,#ff5fa2)}
.br-load-tag{font-weight:800;letter-spacing:.16em;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a}
.br-load-name{font-size:clamp(40px,7vw,76px);font-weight:900;color:#ffd23f;text-shadow:0 6px 0 #2a1c4a;margin:8px 0}
.br-load-cat{font-weight:800;letter-spacing:.12em;text-shadow:0 2px 0 #2a1c4a}
.br-load-bar{width:min(360px,70vw);height:14px;background:rgba(20,15,40,.4);border-radius:8px;overflow:hidden;margin:26px 0 16px}
.br-load-bar i{display:block;height:100%;width:42%;background:#ffd23f;border-radius:8px;animation:brload 1.1s ease-in-out infinite}
@keyframes brload{0%{margin-left:-42%}100%{margin-left:100%}}
.br-load-spin{width:42px;height:42px;border:5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:brspin .8s linear infinite}
@keyframes brspin{to{transform:rotate(360deg)}}
.br-load-hint{margin-top:14px;font-weight:700;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a;animation:blink 1.2s step-end infinite}
.br-title{font-size:clamp(48px,9vw,118px);font-weight:900;letter-spacing:.04em;line-height:.92;color:#ffd23f;text-shadow:0 6px 0 #2a1c4a;animation:brbob 2.6s ease-in-out infinite}
.br-title span{display:block;color:#fff;text-shadow:0 6px 0 #2a1c4a}
@keyframes brbob{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-10px) rotate(1deg)}}
.br-sub{margin:18px 0 26px;font-size:clamp(14px,1.6vw,20px);font-weight:600;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a}
.br-sub2{margin:6px 0 18px;font-weight:700;opacity:.95}
.br-col{display:flex;flex-direction:column;gap:14px;width:min(360px,80vw)}
.br-row{flex-direction:row;width:auto;gap:18px;margin-top:26px}
.br-btn{pointer-events:auto;border:none;cursor:pointer;font-family:inherit;font-weight:800;color:#2a1c4a;background:#ffd23f;
  padding:16px 26px;border-radius:16px;font-size:18px;box-shadow:0 5px 0 #b07d00,0 8px 18px rgba(0,0,0,.3);
  transition:transform .08s,box-shadow .08s,filter .12s}
.br-btn:hover{filter:brightness(1.07);transform:translateY(-2px)}
.br-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #b07d00}
.br-big{font-size:22px;padding:18px 28px}
.br-blue{background:#5ad1ff;box-shadow:0 5px 0 #2a7fb0,0 8px 18px rgba(0,0,0,.3)}
.br-purple{background:#b06bff;color:#fff;box-shadow:0 5px 0 #6a32c8,0 8px 18px rgba(0,0,0,.3)}
.br-pink{background:#ff8fb0;box-shadow:0 5px 0 #c24a73,0 8px 18px rgba(0,0,0,.3)}
.br-foot{position:absolute;bottom:22px;font-weight:700;text-shadow:0 2px 0 #2a1c4a}
.br-lobby{display:flex;align-items:center;gap:36px;flex-wrap:wrap;justify-content:center}
.br-lobby-bean{width:300px;height:380px;position:relative;flex:none}
.br-lobby-bean canvas{position:absolute;inset:0;width:100%!important;height:100%!important}
.br-lobby-right{display:flex;flex-direction:column;align-items:flex-start;text-align:left}
.br-lobby-right .br-title{font-size:clamp(40px,6.5vw,92px)}
.br-lobby-right .br-sub{margin:10px 0 20px}
.br-lobby-right .br-col{width:300px}
.br-h{font-size:clamp(28px,4vw,42px);font-weight:900;color:#ffd23f;text-shadow:0 4px 0 #2a1c4a;margin-bottom:14px}
.br-h2{font-size:18px;font-weight:800;color:#ffe9c2;margin:18px 0 8px;align-self:flex-start}
/* customise */
.br-cust-wrap{display:flex;gap:24px;width:min(1080px,94vw);align-items:stretch}
.br-preview{width:300px;min-height:430px;background:rgba(20,15,40,.30);border-radius:20px;position:relative;overflow:hidden}
.br-preview canvas{position:absolute;inset:0;width:100%!important;height:100%!important}
.br-cust-right{flex:1;display:flex;flex-direction:column;justify-content:center}
.br-slot{display:flex;align-items:center;gap:12px;background:rgba(20,15,40,.28);border-radius:14px;padding:8px 12px;margin-bottom:10px}
.br-slot-label{width:96px;text-align:left;font-weight:800}
.br-slot-val{flex:1;font-weight:800;font-size:18px}
.br-slot-val em{display:block;font-size:11px;font-style:normal;letter-spacing:.08em}
.br-arrow{padding:8px 16px;border-radius:12px;background:#fff;color:#2a1c4a;font-size:22px;box-shadow:0 4px 0 #b8b8b8}
.br-arrow.sm{padding:4px 12px;font-size:16px}
.br-emotes{display:flex;gap:8px}
.br-emote{flex:1;background:rgba(20,15,40,.28);border-radius:12px;padding:8px;text-align:center}
.br-emote-name{font-weight:800;font-size:13px;margin-bottom:6px}
.br-emote-ctr{display:flex;align-items:center;justify-content:space-between;gap:4px}
.br-emote-snd{font-size:10px;color:#dfe6ff}
.br-cust-bar{display:flex;justify-content:space-between;gap:10px;width:min(1080px,94vw);margin-top:22px}
.br-kudos{font-weight:800;color:#ffd23f;text-shadow:0 2px 0 #2a1c4a;margin-bottom:12px}
.br-earned{margin-top:10px;font-weight:800;color:#ffd23f;font-size:20px;text-shadow:0 2px 0 #2a1c4a}
.br-shop-scroll{width:min(1000px,94vw);max-height:60vh;overflow-y:auto;padding:4px 8px}
.br-shop-sec{font-weight:900;color:#ffe9c2;text-align:left;margin:14px 0 8px;font-size:18px;text-shadow:0 2px 0 #2a1c4a}
.br-shop-grid{width:min(940px,94vw);display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;max-height:54vh;overflow-y:auto;padding:4px}
.br-shop-card{pointer-events:auto;cursor:pointer;background:rgba(20,15,40,.34);border:2px solid #888;border-radius:12px;padding:10px;text-align:center;transition:transform .08s}
.br-shop-card:hover{transform:translateY(-2px)}
.br-shop-card.eq{box-shadow:0 0 0 3px #46d36a inset}
.br-shop-card.br-cant{opacity:.45}
.br-shop-name{font-weight:800;font-size:14px}
.br-shop-rar{font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:2px 0 6px}
.br-shop-act{font-weight:800;background:rgba(255,210,63,.18);border-radius:8px;padding:4px;font-size:13px}
.br-shop-card.own .br-shop-act{background:rgba(70,211,106,.2)}
.br-shop-slot{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#cfd6e6;opacity:.8}
.br-shop-rotbar{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.br-shop-rotlabel{font-weight:800;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a}
.br-shop-rotlabel b{color:#ffd23f}
.br-shop-note{font-size:12px;color:#dfe6ff;opacity:.85;margin:12px 0 16px;max-width:min(720px,92vw)}
.br-gold{background:linear-gradient(180deg,#ffe06a,#ffc23f);box-shadow:0 5px 0 #b07d00,0 8px 18px rgba(0,0,0,.3);position:relative}
.br-badge{position:absolute;top:-8px;right:-8px;background:#ff3b6b;color:#fff;font-size:13px;min-width:22px;height:22px;line-height:22px;border-radius:11px;padding:0 6px;box-shadow:0 2px 0 #9c1f3f}
.br-btn.sm{padding:10px 16px;font-size:14px}
/* fall pass */
.br-pass-bar{width:min(820px,92vw);height:16px;background:rgba(20,15,40,.45);border-radius:9px;overflow:hidden;margin:6px 0 16px}
.br-pass-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff9447);border-radius:9px;transition:width .4s}
.br-pass-scroll{display:flex;gap:12px;overflow-x:auto;width:min(960px,94vw);padding:8px 6px 16px;scroll-snap-type:x proximity}
.br-pass-tier{flex:0 0 132px;scroll-snap-align:center;background:rgba(20,15,40,.34);border:2px solid rgba(255,255,255,.12);border-radius:16px;padding:12px 8px;text-align:center;position:relative;opacity:.92}
.br-pass-tier.mile{border-color:#ffd23f;background:rgba(255,210,63,.12)}
.br-pass-tier.done{opacity:.5}
.br-pass-tier.ready{cursor:pointer;border-color:#46d36a;box-shadow:0 0 0 3px rgba(70,211,106,.35),0 6px 16px rgba(0,0,0,.3);animation:brpulse 1.3s ease-in-out infinite}
.br-pass-tier.ready:hover{transform:translateY(-3px)}
.br-pass-tnum{font-weight:900;font-size:13px;color:#ffe9c2;letter-spacing:.06em}
.br-pass-ricon{font-size:34px;margin:6px 0}
.br-pass-rname{font-weight:800;font-size:13px;min-height:32px;color:var(--rar,#fff)}
.br-pass-state{margin-top:8px;font-weight:800;font-size:12px;background:rgba(255,255,255,.1);border-radius:8px;padding:5px}
.br-pass-tier.ready .br-pass-state{background:#46d36a;color:#0c2a16}
.br-pass-tier.done .br-pass-state{color:#46d36a}
/* round-select reel */
.br-reel-title{font-weight:900;letter-spacing:.16em;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a;margin:8px 0 14px;font-size:clamp(16px,2.4vw,24px)}
.br-reel-window{position:relative;width:min(560px,92vw);height:420px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent);
  mask-image:linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent)}
.br-reel-strip{position:absolute;left:0;right:0;top:0;will-change:transform}
.br-reel-card{height:84px;box-sizing:border-box;margin:0;display:flex;align-items:center;gap:14px;padding:0 26px;
  border-radius:16px;background:rgba(20,15,40,.42);border:2px solid var(--c,#fff);
  box-shadow:inset 0 0 22px rgba(0,0,0,.25)}
.br-reel-ico{font-size:30px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.4))}
.br-reel-txt{display:flex;flex-direction:column;align-items:flex-start;text-align:left}
.br-reel-name{font-size:24px;font-weight:900;color:#fff;text-shadow:0 3px 0 #2a1c4a;line-height:1.05}
.br-reel-cat{font-size:12px;font-weight:800;letter-spacing:.12em}
.br-reel-marker{position:absolute;left:0;right:0;top:50%;height:84px;transform:translateY(-50%);
  border:3px solid #ffd23f;border-radius:18px;box-shadow:0 0 26px rgba(255,210,63,.55);pointer-events:none}
.br-reel-marker::before,.br-reel-marker::after{content:'▶';position:absolute;top:50%;transform:translateY(-50%);color:#ffd23f;font-size:20px;text-shadow:0 2px 0 #2a1c4a}
.br-reel-marker::before{left:-26px}.br-reel-marker::after{content:'◀';right:-26px}
.br-reel-card.br-reel-hit{animation:brhit .4s ease}
@keyframes brhit{0%{transform:scale(1)}40%{transform:scale(1.07)}100%{transform:scale(1)}}
.br-reel-tag{margin-top:16px;font-weight:700;color:#ffe9c2;text-shadow:0 2px 0 #2a1c4a;font-size:clamp(14px,1.8vw,18px);max-width:min(620px,92vw)}
/* how-to / trophies */
.br-howlist{display:flex;flex-direction:column;gap:8px;width:min(820px,92vw)}
.br-howrow{display:flex;gap:18px;background:rgba(20,15,40,.25);border-radius:10px;padding:8px 14px}
.br-howk{width:130px;text-align:left;font-weight:800;color:#5ad1ff}
.br-howv{flex:1;text-align:left;font-weight:600}
.br-trlist{display:flex;flex-direction:column;gap:8px;width:min(740px,92vw);margin-bottom:18px;max-height:60vh;overflow:auto}
.br-trophy{display:flex;gap:14px;align-items:center;background:rgba(255,255,255,.06);border-radius:12px;padding:10px 16px;text-align:left}
.br-trophy.got{background:rgba(255,210,63,.16)}
.br-tricon{font-size:22px}
.br-trname{font-weight:800;color:#cfd6e6}.br-trophy.got .br-trname{color:#ffd23f}
.br-trdesc{font-size:13px;color:#cfd6e6}
/* HUD */
.br-hud{position:absolute;inset:0;pointer-events:none}
.br-chip{position:absolute;top:16px;background:rgba(20,15,40,.55);border-radius:14px;padding:10px 18px;backdrop-filter:blur(3px)}
.br-chip b{display:block;font-size:22px;font-weight:900}
.br-chip span{font-size:13px;font-weight:800;letter-spacing:.06em}
.br-left{left:16px}.br-right{right:16px;text-align:right}
.br-hint{position:absolute;left:16px;bottom:14px;background:rgba(20,15,40,.45);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700}
.br-spec{position:absolute;top:84px;left:50%;transform:translateX(-50%);background:rgba(20,15,40,.6);color:#ffd23f;font-weight:800;border-radius:12px;padding:8px 18px;font-size:15px;letter-spacing:.04em;border:2px solid #ffd23f;animation:brpulse 1.4s ease-in-out infinite}
@keyframes brpulse{0%,100%{opacity:.85}50%{opacity:1}}
/* intro */
.br-intro{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,8,24,.5)}
.br-intro-card{text-align:center;animation:brpop .4s cubic-bezier(.2,1.4,.4,1)}
@keyframes brpop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
.br-intro-cat{font-size:26px;font-weight:800;letter-spacing:.12em;text-shadow:0 3px 0 #2a1c4a}
.br-intro-name{font-size:clamp(44px,8vw,84px);font-weight:900;color:#ffd23f;text-shadow:0 6px 0 #2a1c4a}
.br-intro-tag{font-size:clamp(15px,2vw,22px);font-weight:600;margin-top:10px;text-shadow:0 2px 0 #2a1c4a}
.br-qual{margin-top:14px;font-weight:800;color:#46d36a;text-shadow:0 2px 0 #2a1c4a}
.br-count{font-size:64px;font-weight:900;margin-top:6px;text-shadow:0 4px 0 #2a1c4a}
/* banner */
.br-banner{position:absolute;inset:0;display:none;align-items:flex-start;justify-content:center;padding-top:8vh}
.br-banner-in{font-size:clamp(40px,7vw,72px);font-weight:900;text-shadow:0 5px 0 #2a1c4a;text-align:center;animation:brpop .35s cubic-bezier(.2,1.4,.4,1)}
.br-banner-sub{font-size:22px;color:#fff;font-weight:700;margin-top:8px}
/* results */
.br-result-big{font-size:clamp(40px,7vw,76px);font-weight:900;color:#ffd23f;text-shadow:0 5px 0 #2a1c4a}
.br-eliminated .br-result-big{color:#ff4d6d}
.br-result-sub{font-size:24px;font-weight:700;margin-top:14px}
.br-result-sub2{font-size:18px;color:#dfe6ff;margin-top:6px}
.br-crown{font-size:96px;animation:brbob 2s ease-in-out infinite}
.br-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.br-confetti i{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;animation:brfall linear infinite}
@keyframes brfall{to{transform:translateY(110vh) rotate(720deg)}}
/* toasts */
.br-toasts{position:absolute;top:18px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center}
.br-toast{background:#2a1c4a;border:2px solid #ffd23f;border-radius:12px;padding:10px 18px;opacity:0;transform:translateY(-14px);transition:.35s;text-align:center}
.br-toast.show{opacity:1;transform:none}
.br-toast small{display:block;color:#ffd23f;font-weight:800;font-size:12px}
.br-toast b{font-size:17px}
`;
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
    },
};
