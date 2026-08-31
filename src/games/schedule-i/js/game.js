'use strict';

const Game = {
    canvas: null,
    ctx:    null,
    last:   0,
    paused: false,
    _fps:   0,
    _fpsAcc: 0,
    _fpsFrames: 0,
    camX:   0,
    camY:   0,
    started: false,
    screen: 'title',   // 'title' | 'playing' | 'paused'

    init() {
        this.canvas = document.getElementById('gc');
        this.canvas.width  = CFG.W;
        this.canvas.height = CFG.H;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        Input.init(this.canvas);
        World.init();
        NPCManager.init();
        Phone.init();

        // Starting position — motel area
        Player.x = 21 * CFG.TS;
        Player.y = 8  * CFG.TS;

        // Unlock first customer after short delay
        PE.Teardown.timeout(() => NPCManager.unlockCustomer('benji'), CFG.MSG_DELAY_MS);

        // Canvas click handler
        PE.Teardown.on(this.canvas, 'click', e => this._handleClick(e));

        // Keyboard shortcuts that close panels
        PE.Teardown.on(window, 'keydown', e => {
            if (e.code === 'Escape') this._handleEsc();
        });

        // Bound once: allocating a closure per frame is exactly the GC pressure
        // the portal's allocation rules exist to avoid.
        this._boundLoop = ts => this._loop(ts);

        this.started = true;
        PE.Teardown.raf(this._boundLoop);
    },

    _loop(ts) {
        if (PE.Teardown.destroyed) return;
        const dt = Math.min((ts - this.last) / 1000, 0.05);
        this.last = ts;
        if (this.paused) {
            PE.Teardown.raf(this._boundLoop);
            return;
        }
        if (this.screen === 'title') {
            this._drawTitle();
        } else {
            this._update(dt);
            this._render();
        }
        Input.flush();

        this._fpsAcc += dt;
        this._fpsFrames++;
        if (this._fpsAcc >= 1) {
            this._fps = this._fpsFrames / this._fpsAcc;
            this._fpsAcc = 0;
            this._fpsFrames = 0;
        }

        PE.Teardown.raf(this._boundLoop);
    },

    _update(dt) {
        GameState.tick(dt);
        PoliceSystem.update(dt);
        Player.update(dt);

        if (GameState.uiMode === 'playing') {
            NPCManager.update(dt);
            // Keyboard shortcuts
            if (Input.phone)    Phone.open();
            if (Input.inv)      GameState.uiMode = GameState.uiMode === 'inventory' ? 'playing' : 'inventory';
            if (Input.map)      GameState.uiMode = GameState.uiMode === 'map'       ? 'playing' : 'map';
            if (Input.interact) Interaction.tryInteract();
        } else if (GameState.uiMode === 'inventory') {
            NPCManager.update(dt);
            if (Input.inv || Input.esc) GameState.uiMode = 'playing';
        } else if (GameState.uiMode === 'map') {
            if (Input.map || Input.esc) GameState.uiMode = 'playing';
        }

        // Camera — smooth follow
        const targetX = Player.x - CFG.W / 2;
        const targetY = Player.y - CFG.H / 2;
        this.camX = U.lerp(this.camX, targetX, 8 * dt);
        this.camY = U.lerp(this.camY, targetY, 8 * dt);
        this.camX = U.clamp(this.camX, 0, World.mapW * CFG.TS - CFG.W);
        this.camY = U.clamp(this.camY, 0, World.mapH * CFG.TS - CFG.H);
    },

    _render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CFG.W, CFG.H);

        World.draw(ctx, this.camX, this.camY);
        NPCManager.draw(ctx, this.camX, this.camY);
        Player.draw(ctx, this.camX, this.camY);

        // Interaction prompt for nearby buildings
        this._drawNearbyPrompt(ctx);

        // All UI
        UI.drawAll(ctx);

        // Paused overlay
        if (this.screen === 'paused') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, CFG.W, CFG.H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 36px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', CFG.W/2, CFG.H/2);
            ctx.textAlign = 'left';
        }
    },

    _drawTitle() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, CFG.W, CFG.H);

        // Background city silhouette
        ctx.fillStyle = '#0f0f22';
        for (let i = 0; i < 20; i++) {
            const bw = 40 + (i * 37) % 60;
            const bh = 80 + (i * 53) % 200;
            ctx.fillRect(i * 66, CFG.H - bh, bw, bh);
        }

        // Title
        ctx.fillStyle = '#f44336';
        ctx.font = 'bold 88px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('SCHEDULE', CFG.W/2, CFG.H/2 - 60);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 120px "Courier New"';
        ctx.fillText('I', CFG.W/2, CFG.H/2 + 60);

        ctx.fillStyle = '#90a4ae';
        ctx.font = '16px "Courier New"';
        ctx.fillText('A Drug Empire Simulation', CFG.W/2, CFG.H/2 + 100);

        // Flashing start prompt
        if (Math.floor(Date.now() / 600) % 2 === 0) {
            ctx.fillStyle = '#fff';
            ctx.font = '20px "Courier New"';
            ctx.fillText('Press ENTER or click to start', CFG.W/2, CFG.H/2 + 150);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('WASD Move  ·  Shift Sprint  ·  E Interact  ·  F Phone  ·  I Inventory  ·  M Map', 20, CFG.H - 12);

        // Check for start input
        if (Input.pressed('Enter') || Input.pressed('Space')) {
            this.screen = 'playing';
        }
    },

    _drawNearbyPrompt(ctx) {
        if (GameState.uiMode !== 'playing') return;
        const b = World.buildingAt(Player.tx, Player.ty);
        if (b) {
            const bx = (b.tx + b.tw/2) * CFG.TS - this.camX;
            const by = b.ty * CFG.TS - this.camY - 8;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '12px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`[E] Enter ${b.name}`, bx, by);
            ctx.textAlign = 'left';
        }
    },

    // ── Click dispatch ────────────────────────────────────────────────────
    _handleClick(e) {
        if (this.screen === 'title') { this.screen = 'playing'; return; }

        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (CFG.W / rect.width);
        const my = (e.clientY - rect.top)  * (CFG.H / rect.height);

        // Phone handles its own clicks
        if (GameState.uiMode === 'phone') { Phone.handleClick(mx, my); return; }

        // Close button (all panels share _lastPanelClose)
        const cls = UI._lastPanelClose;
        if (cls && mx>cls.x && mx<cls.x+cls.w && my>cls.y && my<cls.y+cls.h) {
            UI.closeAllPanels(); return;
        }

        switch (GameState.uiMode) {
            case 'shop':      this._clickShop(mx, my);      break;
            case 'deal':      this._clickDeal(mx, my);      break;
            case 'property':  this._clickProperty(mx, my);  break;
            case 'mixing':    this._clickMix(mx, my);       break;
            case 'inventory': this._clickInventory(mx, my); break;
            case 'dialog':    this._clickDialog(mx, my);    break;
            case 'laundry':   this._clickLaundry(mx, my);   break;
            case 'atm':       this._clickATM(mx, my);       break;
            case 'casino':    this._clickCasino(mx, my);    break;
            case 'dealer':    this._clickDealer(mx, my);    break;
        }
    },

    _clickShop(mx, my) {
        const shop = GameState.activeShop;
        const items = shop === 'store'
            ? SHOP_ITEMS.filter(i => ['grow','supply','seed','additive'].includes(i.category))
            : SHOP_ITEMS.filter(i => i.category === 'additive');
        for (const item of items) {
            if (item._buyBtnX && mx > item._buyBtnX && mx < item._buyBtnX + 58
                && my > item._buyBtnY && my < item._buyBtnYBot) {
                EconomySystem.buyItem(item);
                return;
            }
        }
    },

    _clickDeal(mx, my) {
        const invKeys = Object.keys(Player.inventory);
        for (const key of invKeys) {
            const slot = Player.inventory[key];
            if (!slot) continue;
            // – button
            if (slot._dealY && slot._dealMinusX && mx > slot._dealMinusX && mx < slot._dealMinusX + 22
                && my > slot._dealY + 38 && my < slot._dealY + 56) {
                const gKey = slot._dealGKey || key;
                UI._dealGrams[gKey] = Math.max(0.5, (UI._dealGrams[gKey] || 3.5) - 0.5);
                return;
            }
            // + button
            if (slot._dealPlusX && mx > slot._dealPlusX && mx < slot._dealPlusX + 22
                && my > slot._dealY + 38 && my < slot._dealY + 56) {
                const gKey = slot._dealGKey || key;
                UI._dealGrams[gKey] = Math.min(slot.grams, (UI._dealGrams[gKey] || 3.5) + 0.5);
                return;
            }
            // Sell button
            if (slot._sellBtnX && mx > slot._sellBtnX && mx < slot._sellBtnX + 76
                && my > slot._sellBtnY && my < slot._sellBtnY + 36) {
                const gKey = slot._dealGKey || key;
                const grams = UI._dealGrams[gKey] || 3.5;
                EconomySystem.deal(GameState.dealTarget, key, grams);
                return;
            }
        }
    },

    _clickProperty(mx, my) {
        // Buy property button
        const bb = GameState._propBuyBtn;
        if (bb && mx > bb.x && mx < bb.x + bb.w && my > bb.y && my < bb.y + bb.h) {
            EconomySystem.buyProperty(bb.propId);
            GameState._propBuyBtn = null;
            return;
        }
        // Pot buttons
        for (const btn of (GameState._potBtns || [])) {
            if (!btn) continue;
            if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) {
                if (btn.action === 'harvest') GrowSystem.harvest(btn.potId);
                else if (btn.action === 'water')   GrowSystem.water(btn.potId);
                else if (btn.action === 'plant')   this._showPlantMenu(btn.propId, btn.slot);
                return;
            }
        }
    },

    _showPlantMenu(propId, slotIdx) {
        // Find available seeds
        const seeds = Object.entries(Player.supplies)
            .filter(([k,v]) => k.endsWith('_seed') && v > 0)
            .map(([k]) => k.replace('_seed',''));
        if (seeds.length === 0) {
            UI.notify('No seeds in inventory. Buy some at the store!', '#f44336');
            return;
        }
        // Pick the first available seed for simplicity; in a real game show a submenu
        const strainId = seeds[0];
        GrowSystem.plant(propId, slotIdx, strainId);
    },

    _clickMix(mx, my) {
        for (const add of Object.values(ADDITIVES)) {
            if (!add._mixBtn) continue;
            const b = add._mixBtn;
            if (b.has && mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) {
                MixSystem.mix(GameState.activeMix.key, add.id);
                return;
            }
        }
    },

    _clickInventory(mx, my) {
        const invKeys = Object.keys(Player.inventory);
        for (const key of invKeys) {
            const slot = Player.inventory[key];
            if (!slot || !slot._mixBtnY) continue;
            if (mx > slot._mixBtnX && mx < slot._mixBtnX + 66
                && my > slot._mixBtnY && my < slot._mixBtnYBot) {
                GameState.activeMix = { ...slot, key };
                GameState.uiMode = 'mixing';
                return;
            }
        }
    },

    _clickDialog(mx, my) {
        for (const btn of UI._dialogBtns) {
            if (mx > btn.bx && mx < btn.bx + btn.bw && my > btn.by && my < btn.by + btn.bh) {
                this._handleDialogAction(btn.action, btn);
                return;
            }
        }
    },

    _handleDialogAction(action, btn) {
        switch (action) {
            case 'dismiss':
                UI.closeAllPanels(); break;
            case 'search':
                PoliceSystem.bodySearch(); UI.closeAllPanels(); break;
            case 'run_police':
                PoliceSystem.flee(); UI.closeAllPanels(); break;
            case 'run':
                PoliceSystem.flee(); UI.closeAllPanels(); break;
            case 'bust':
                PoliceSystem.bust(); break;
            case 'hire_dealer':
                DealerSystem.hire(btn.npcId); UI.closeAllPanels(); break;
        }
    },

    _clickLaundry(mx, my) {
        for (const lb of (GameState._laundryBtns || [])) {
            if (!lb) continue;
            if (mx > lb.x && mx < lb.x + lb.w && my > lb.y && my < lb.y + lb.h) {
                EconomySystem.launder(lb.amount);
                return;
            }
        }
    },

    _clickATM(mx, my) {
        const wd = GameState._atmWithdraw;
        if (wd && mx > wd.x && mx < wd.x + wd.w && my > wd.y && my < wd.y + wd.h) {
            if (GameState.bankBalance > 0) {
                Player.cash += GameState.bankBalance;
                UI.notify(`Withdrew ${U.money(GameState.bankBalance)} from ATM.`, '#64b5f6');
                GameState.bankBalance = 0;
            } else {
                UI.notify('No funds in bank.', '#f44336');
            }
        }
    },

    _clickCasino(mx, my) {
        const c = UI._casino;
        const deal = GameState._casinoDeal;
        const bets  = GameState._casinoBets || [];
        const hit   = GameState._casinoHit;
        const stand = GameState._casinoStand;
        const again = GameState._casinoAgain;

        if (again && mx > again.x && mx < again.x + again.w && my > again.y && my < again.y + again.h) {
            c.state = 'bet'; return;
        }
        for (const b of bets) {
            if (mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h) {
                c.bet = b.val; return;
            }
        }
        if (deal && mx > deal.x && mx < deal.x + deal.w && my > deal.y && my < deal.y + deal.h) {
            this._casinoDeal(c); return;
        }
        if (hit && mx > hit.x && mx < hit.x + hit.w && my > hit.y && my < hit.y + hit.h) {
            this._casinoHit(c); return;
        }
        if (stand && mx > stand.x && mx < stand.x + stand.w && my > stand.y && my < stand.y + stand.h) {
            this._casinoStand(c); return;
        }
    },

    _casinoBuildDeck() {
        const suits = ['♠','♥','♦','♣'];
        const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const deck  = [];
        for (const s of suits) for (const r of ranks) deck.push(r + s);
        return U.shuffle(deck);
    },

    _casinoCardValue(card) {
        const r = card.slice(0, -1);
        if (r === 'A') return 11;
        if (['J','Q','K'].includes(r)) return 10;
        return parseInt(r);
    },

    _casinoHandValue(cards) {
        let total = 0, aces = 0;
        for (const c of cards) {
            const v = this._casinoCardValue(c);
            total += v;
            if (v === 11) aces++;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    },

    _casinoDeal(c) {
        if (!Player.spend(c.bet)) { UI.notify('Not enough cash.', '#f44336'); return; }
        c.deck = this._casinoBuildDeck();
        c.playerCards = [c.deck.pop(), c.deck.pop()];
        c.dealerCards = [c.deck.pop(), c.deck.pop()];
        c.playerVal   = this._casinoHandValue(c.playerCards);
        c.dealerVal   = this._casinoCardValue(c.dealerCards[1]);
        c.state = 'playing';
        if (c.playerVal === 21) this._casinoStand(c);
    },

    _casinoHit(c) {
        c.playerCards.push(c.deck.pop());
        c.playerVal = this._casinoHandValue(c.playerCards);
        if (c.playerVal > 21) {
            c.state  = 'done';
            c.result = `BUST — Lost ${U.money(c.bet)}`;
        }
    },

    _casinoStand(c) {
        // Dealer draws to 17
        c.dealerVal = this._casinoHandValue(c.dealerCards);
        while (c.dealerVal < 17) {
            c.dealerCards.push(c.deck.pop());
            c.dealerVal = this._casinoHandValue(c.dealerCards);
        }
        c.state = 'done';
        const pv = c.playerVal;
        const dv = c.dealerVal;
        if (pv > 21) {
            c.result = `BUST — Lost ${U.money(c.bet)}`;
        } else if (dv > 21 || pv > dv) {
            const win = c.bet * (pv === 21 && c.playerCards.length === 2 ? 2.5 : 2);
            Player.earn(win, 'casino win');
            c.result = `WIN! +${U.money(win)}`;
        } else if (pv === dv) {
            Player.cash += c.bet;
            c.result = 'PUSH — Bet returned';
        } else {
            c.result = `DEALER WINS — Lost ${U.money(c.bet)}`;
        }
    },

    _clickDealer(mx, my) {
        // Simplified dealer panel — supply product
        const npc = GameState.activeDealerNpc;
        if (!npc) return;
        const invKeys = Object.keys(Player.inventory);
        if (invKeys.length > 0) {
            const key = invKeys[0];
            DealerSystem.supply(npc.id, key, 14);
            UI.notify(`Supplied 14g to ${npc.name}.`, '#64b5f6');
        } else {
            UI.notify('No product to supply.', '#f44336');
        }
        UI.closeAllPanels();
    },

    _handleEsc() {
        if (GameState.uiMode === 'phone')     { Phone.close(); return; }
        if (GameState.uiMode === 'mixing')    { GameState.uiMode = 'inventory'; return; }
        if (GameState.uiMode !== 'playing')   { UI.closeAllPanels(); return; }
        this.screen = this.screen === 'paused' ? 'playing' : 'paused';
    },
};

// ── Entry point ────────────────────────────────────────────────────────────
// The portal starts the game once the save has been handed over; standalone
// play falls back to auto-start on load.
window.addEventListener('load', () => { if (!window.PORTAL_DEFER) Game.init(); });
