'use strict';

// ── Notification queue ────────────────────────────────────────────────────
const Notifications = {
    queue: [],
    push(text, color) {
        this.queue.push({ text, color: color || '#ffffff', born: Date.now(), ttl: CFG.NOTIF_MS });
    },
    draw(ctx) {
        const now = Date.now();
        this.queue = this.queue.filter(n => now - n.born < n.ttl);
        let y = CFG.H - 80;
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const n   = this.queue[i];
            const age = (now - n.born) / n.ttl;
            const alpha = age > 0.75 ? 1 - (age - 0.75) / 0.25 : 1;
            const w = ctx.measureText(n.text).width + 24;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath();
            ctx.roundRect(CFG.W / 2 - w/2, y - 18, w, 24, 6);
            ctx.fill();
            ctx.fillStyle = n.color;
            ctx.font = '13px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(n.text, CFG.W / 2, y);
            ctx.textAlign = 'left';
            y -= 30;
        }
        ctx.globalAlpha = 1;
    },
};

// ── Main UI manager ───────────────────────────────────────────────────────
const UI = {
    notify: (t, c) => Notifications.push(t, c),

    // ── HUD ─────────────────────────────────────────────────────────────
    drawHUD(ctx) {
        // Top bar background
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, CFG.W, 44);

        // Cash
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 18px "Courier New"';
        ctx.fillText(U.money(Player.cash), 12, 28);

        // Bank
        if (GameState.bankBalance > 0) {
            ctx.fillStyle = '#64b5f6';
            ctx.font = '12px "Courier New"';
            ctx.fillText(`🏦 ${U.money(GameState.bankBalance)}`, 12, 42);
        }

        // Rank
        const rk = Player.rankData;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(`⭐ ${rk.name}`, CFG.W / 2, 18);
        // XP bar
        const nextRank = CFG.RANKS[Math.min(Player.rank + 1, CFG.RANKS.length - 1)];
        const xpFrac   = (Player.xp - rk.xp) / Math.max(1, nextRank.xp - rk.xp);
        ctx.fillStyle = '#333';
        ctx.fillRect(CFG.W/2 - 80, 22, 160, 8);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(CFG.W/2 - 80, 22, 160 * Math.min(1, xpFrac), 8);
        ctx.textAlign = 'left';

        // Day + Time (right side)
        ctx.fillStyle = '#e2e2e2';
        ctx.font = '13px "Courier New"';
        ctx.textAlign = 'right';
        ctx.fillText(`${U.weekday(GameState.day)}  ${U.timeStr(GameState.gameMins)}`, CFG.W - 12, 18);
        ctx.fillText(`Day ${GameState.day + 1}`, CFG.W - 12, 34);
        ctx.textAlign = 'left';

        // Heat bar (top right area)
        this._drawHeat(ctx);

        // Phone notification dot
        const unread = Phone.totalUnread();
        if (unread > 0) {
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(CFG.W - 200, 12, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(unread, CFG.W - 200, 16);
            ctx.textAlign = 'left';
        }

        // Controls reminder (bottom left)
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, CFG.H - 28, 340, 28);
        ctx.fillStyle = '#90a4ae';
        ctx.font = '10px "Courier New"';
        ctx.fillText('[WASD] Move  [Shift] Sprint  [E] Interact  [F] Phone  [I] Inventory  [M] Map', 8, CFG.H - 10);

        // Energy bar (bottom center)
        if (Player.energy < 90) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(CFG.W/2 - 60, CFG.H - 20, 120, 12);
            ctx.fillStyle = `hsl(${Player.energy * 1.2}, 80%, 50%)`;
            ctx.fillRect(CFG.W/2 - 60, CFG.H - 20, 120 * Player.energy / 100, 12);
            ctx.fillStyle = '#fff';
            ctx.font = '9px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('ENERGY', CFG.W/2, CFG.H - 10);
            ctx.textAlign = 'left';
        }
    },

    _drawHeat(ctx) {
        const x = CFG.W - 250;
        const stars = 5;
        const heatPct = GameState.heat / CFG.MAX_HEAT;
        const filled  = Math.ceil(heatPct * stars);

        ctx.fillStyle = '#e2e2e2';
        ctx.font = '11px "Courier New"';
        ctx.fillText('HEAT:', x, 18);

        for (let i = 0; i < stars; i++) {
            const starX = x + 42 + i * 20;
            const lit   = i < filled;
            if (PoliceSystem.wantedFlash > 0 && lit) {
                ctx.fillStyle = Date.now() % 400 < 200 ? '#ff1744' : '#ff8a80';
            } else {
                ctx.fillStyle = lit ? '#f44336' : '#444';
            }
            ctx.font = '16px "Courier New"';
            ctx.fillText('★', starX, 22);
        }
        ctx.font = '13px "Courier New"';
    },

    // ── Minimap ──────────────────────────────────────────────────────────
    drawMinimap(ctx) {
        const mw = 140, mh = 140;
        const mx = CFG.W - mw - 8;
        const my = 52;
        const scaleX = mw / World.mapW;
        const scaleY = mh / World.mapH;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);

        // Sample tiles (every 2nd tile for performance)
        for (let ty = 0; ty < World.mapH; ty += 2) {
            for (let tx = 0; tx < World.mapW; tx += 2) {
                const t = World._get(tx, ty);
                ctx.fillStyle = this._mmColor(t);
                ctx.fillRect(mx + tx * scaleX, my + ty * scaleY, scaleX * 2 + 1, scaleY * 2 + 1);
            }
        }

        // NPCs
        for (const npc of NPCManager.npcs) {
            if (!npc.active) continue;
            if (npc.role === 'customer' && !npc.unlocked) continue;
            ctx.fillStyle = npc.role === 'police' ? '#2196f3'
                          : npc.role === 'dealer'  ? '#ff9800' : '#4caf50';
            ctx.fillRect(mx + (npc.x / CFG.TS) * scaleX - 1.5, my + (npc.y / CFG.TS) * scaleY - 1.5, 3, 3);
        }

        // Player dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
            mx + (Player.x / CFG.TS) * scaleX,
            my + (Player.y / CFG.TS) * scaleY,
            3, 0, Math.PI*2
        );
        ctx.fill();

        // Border
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx - 2, my - 2, mw + 4, mh + 4);

        // Legend
        ctx.fillStyle = '#90a4ae';
        ctx.font = '9px "Courier New"';
        ctx.fillText('⬜ You  🟦 Police  🟩 Contact', mx, my + mh + 12);
    },

    _mmColor(t) {
        switch(t) {
            case T.ROAD:     return '#555';
            case T.SIDEWALK: return '#888';
            case T.WALL:     return '#8b7355';
            case T.FLOOR:    return '#c8a0';
            case T.WATER:    return '#3a7bc8';
            case T.TREE:     return '#1a6a1a';
            case T.DIRT:     return '#8a6040';
            case T.PARKING:  return '#444';
            default:         return '#3a6030';
        }
    },

    // ── Full Map Panel ───────────────────────────────────────────────────
    drawMapPanel(ctx) {
        if (GameState.uiMode !== 'map') return;
        const pw = 700, ph = 560;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        ctx.fillStyle = '#e2e2e2';
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('MAP', px + pw/2, py + 26);
        ctx.textAlign = 'left';

        const mw = pw - 20, mh = ph - 60;
        const mx = px + 10, my = py + 40;
        const scaleX = mw / World.mapW;
        const scaleY = mh / World.mapH;

        // Full map render
        for (let ty = 0; ty < World.mapH; ty++) {
            for (let tx = 0; tx < World.mapW; tx++) {
                const t = World._get(tx, ty);
                ctx.fillStyle = this._mmColor(t);
                ctx.fillRect(mx + tx * scaleX, my + ty * scaleY, scaleX + 0.5, scaleY + 0.5);
            }
        }

        // Building labels
        ctx.font = '8px "Courier New"';
        ctx.fillStyle = '#ffe082';
        ctx.textAlign = 'center';
        for (const b of World.buildings) {
            const bx = mx + (b.tx + b.tw/2) * scaleX;
            const by = my + (b.ty + b.th/2) * scaleY;
            ctx.fillText(b.name, bx, by);
        }

        // Player
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(mx + (Player.x / CFG.TS) * scaleX, my + (Player.y / CFG.TS) * scaleY, 4, 0, Math.PI*2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[M] or [ESC] Close', px + 8, py + ph - 6);
    },

    // ── Inventory Panel ──────────────────────────────────────────────────
    drawInventoryPanel(ctx) {
        if (GameState.uiMode !== 'inventory') return;
        const pw = 600, ph = 500;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;

        this._drawPanel(ctx, px, py, pw, ph, 'INVENTORY');

        // Product inventory
        ctx.fillStyle = '#90caf9';
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillText('PRODUCT', px + 16, py + 60);

        const invKeys = Object.keys(Player.inventory);
        if (invKeys.length === 0) {
            ctx.fillStyle = '#607d8b';
            ctx.font = '12px "Courier New"';
            ctx.fillText('Nothing on you.', px + 16, py + 82);
        }

        for (let i = 0; i < invKeys.length; i++) {
            const key  = invKeys[i];
            const slot = Player.inventory[key];
            const strain = STRAINS[slot.strainId];
            const iy = py + 68 + i * 52;

            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(px + 8, iy, pw - 16, 48);

            // Colour swatch
            ctx.fillStyle = strain?.color || '#888';
            ctx.fillRect(px + 14, iy + 8, 24, 32);

            ctx.fillStyle = '#e2e2e2';
            ctx.font = 'bold 13px "Courier New"';
            ctx.fillText(strain?.name || slot.strainId, px + 46, iy + 20);

            ctx.fillStyle = '#90caf9';
            ctx.font = '11px "Courier New"';
            ctx.fillText(`${slot.grams.toFixed(1)}g  ·  ${U.money(calcBatchValue(slot.strainId, slot.effects, slot.grams))}`, px + 46, iy + 36);

            // Effects
            ctx.fillStyle = '#ba68c8';
            ctx.font = '10px "Courier New"';
            ctx.fillText(slot.effects.join(' · '), px + 220, iy + 20);

            // Mix button
            ctx.fillStyle = '#7b1fa2';
            ctx.fillRect(px + pw - 80, iy + 10, 66, 28);
            ctx.fillStyle = '#fff';
            ctx.font = '11px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('🧪 Mix', px + pw - 47, iy + 28);
            ctx.textAlign = 'left';
            slot._mixBtnY = iy + 10;
            slot._mixBtnYBot = iy + 38;
            slot._mixBtnX = px + pw - 80;
        }

        // Supplies
        const supplyY = py + 68 + invKeys.length * 52 + 20;
        ctx.fillStyle = '#90caf9';
        ctx.font = 'bold 12px "Courier New"';
        ctx.fillText('SUPPLIES', px + 16, supplyY);

        const supEntries = Object.entries(Player.supplies).filter(([,v]) => v > 0);
        ctx.fillStyle = '#e2e2e2';
        ctx.font = '11px "Courier New"';
        let sCol = 0;
        for (const [id, qty] of supEntries) {
            const sx = px + 16 + (sCol % 3) * 190;
            const sy = supplyY + 14 + Math.floor(sCol / 3) * 18;
            const def = ADDITIVES[id] || SHOP_ITEMS.find(s => s.id === id);
            const name = def?.name || id;
            ctx.fillText(`${def?.icon || '▪'} ${name}: ${qty}`, sx, sy);
            sCol++;
        }

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[I] or [ESC] Close', px + 8, py + ph - 8);
    },

    // ── Shop Panel ───────────────────────────────────────────────────────
    _shopScroll: 0,
    drawShopPanel(ctx) {
        if (GameState.uiMode !== 'shop') return;
        const shop = GameState.activeShop;
        if (!shop) return;

        const pw = 560, ph = 500;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;

        const title = shop === 'store' ? "Maxi's Convenience" : 'Chemical Supply Co.';
        this._drawPanel(ctx, px, py, pw, ph, title.toUpperCase());

        const items = shop === 'store'
            ? SHOP_ITEMS.filter(i => ['grow','supply','seed','additive'].includes(i.category))
            : SHOP_ITEMS.filter(i => ['additive'].includes(i.category));

        ctx.fillStyle = '#90caf9';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText('ITEM', px + 16, py + 58);
        ctx.fillText('PRICE', px + pw - 130, py + 58);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const iy   = py + 64 + i * 40;
            if (iy > py + ph - 50) break;

            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(px + 8, iy, pw - 16, 36);

            ctx.fillStyle = '#e2e2e2';
            ctx.font = '12px "Courier New"';
            ctx.fillText((item.icon || '▪') + ' ' + item.name, px + 16, iy + 14);
            ctx.fillStyle = '#90a4ae';
            ctx.font = '10px "Courier New"';
            ctx.fillText(item.desc, px + 16, iy + 28);

            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText(U.money(item.cost), px + pw - 130, iy + 14);

            // Buy button
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(px + pw - 70, iy + 4, 58, 28);
            ctx.fillStyle = '#fff';
            ctx.font = '11px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('BUY', px + pw - 41, iy + 22);
            ctx.textAlign = 'left';
            item._buyBtnY = iy + 4; item._buyBtnYBot = iy + 32;
            item._buyBtnX = px + pw - 70;
        }

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText(`Cash: ${U.money(Player.cash)}  ·  [ESC] Close`, px + 8, py + ph - 8);
    },

    // ── Deal Panel ───────────────────────────────────────────────────────
    _dealGrams: {},
    drawDealPanel(ctx) {
        if (GameState.uiMode !== 'deal') return;
        const npc = GameState.dealTarget;
        if (!npc) return;

        const pw = 520, ph = 420;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        this._drawPanel(ctx, px, py, pw, ph, `DEAL — ${npc.name.toUpperCase()}`);

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText(`Budget today: ${U.money(npc.maxSpendDay - npc.spentToday)} remaining`, px + 16, py + 56);

        // Preferred strains hint
        ctx.fillStyle = '#ba68c8';
        ctx.fillText(`Likes: ${npc.prefs.map(p => STRAINS[p]?.name || p).join(', ')}`, px + 16, py + 70);

        const invKeys = Object.keys(Player.inventory);
        if (invKeys.length === 0) {
            ctx.fillStyle = '#f44336';
            ctx.font = '14px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText("You have no product to sell.", px + pw/2, py + ph/2);
            ctx.textAlign = 'left';
        }

        for (let i = 0; i < invKeys.length; i++) {
            const key   = invKeys[i];
            const slot  = Player.inventory[key];
            const strain = STRAINS[slot.strainId];
            const iy    = py + 84 + i * 64;
            if (iy > py + ph - 60) break;

            const preferred = npc.prefs.includes(slot.strainId);
            ctx.fillStyle = preferred ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.04)';
            ctx.fillRect(px + 8, iy, pw - 16, 58);

            if (preferred) {
                ctx.fillStyle = '#4caf50';
                ctx.font = '9px "Courier New"';
                ctx.fillText('★ PREFERRED', px + pw - 100, iy + 12);
            }

            ctx.fillStyle = strain?.color || '#888';
            ctx.fillRect(px + 14, iy + 8, 20, 40);

            ctx.fillStyle = '#e2e2e2';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText(`${strain?.name || slot.strainId}  (${slot.grams.toFixed(1)}g)`, px + 42, iy + 18);

            const pricePG = calcGramPrice(slot.strainId, slot.effects);
            ctx.fillStyle = '#4caf50';
            ctx.font = '11px "Courier New"';
            ctx.fillText(`${U.money(pricePG)}/g  ·  Effects: ${slot.effects.join(', ')}`, px + 42, iy + 34);

            // Gram selector buttons
            const gKey   = key;
            if (!this._dealGrams[gKey]) this._dealGrams[gKey] = 3.5;
            const grams  = this._dealGrams[gKey];

            ctx.fillStyle = '#263238';
            ctx.fillRect(px + 42, iy + 40, 200, 14);

            // –
            ctx.fillStyle = '#c62828';
            ctx.fillRect(px + 42, iy + 38, 22, 18);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('–', px + 53, iy + 51);

            ctx.fillStyle = '#e2e2e2';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText(`${grams.toFixed(1)}g = ${U.money(pricePG * grams)}`, px + 142, iy + 51);

            // +
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(px + 220, iy + 38, 22, 18);
            ctx.fillStyle = '#fff';
            ctx.fillText('+', px + 231, iy + 51);
            ctx.textAlign = 'left';

            slot._dealY     = iy;
            slot._dealGKey  = gKey;
            slot._dealMinusX = px + 42;
            slot._dealPlusX  = px + 220;

            // Sell button
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(px + pw - 90, iy + 10, 76, 36);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('SELL', px + pw - 52, iy + 32);
            ctx.textAlign = 'left';
            slot._sellBtnX = px + pw - 90;
            slot._sellBtnY = iy + 10;
        }

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Leave', px + 8, py + ph - 8);
    },

    // ── Property Panel ───────────────────────────────────────────────────
    drawPropertyPanel(ctx) {
        if (GameState.uiMode !== 'property') return;
        const b = GameState.activeBuilding;
        if (!b) return;

        const prop = PROPERTIES.find(p => p.id === b.type) ||
                     PROPERTIES.find(p => p.name === b.name);
        if (!prop) return;

        const pw = 540, ph = 460;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        const owned = GameState.properties.includes(prop.id);

        this._drawPanel(ctx, px, py, pw, ph, b.name.toUpperCase());

        if (!owned) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 18px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`FOR SALE — ${U.money(prop.cost)}`, px + pw/2, py + 62);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#90a4ae';
            ctx.font = '12px "Courier New"';
            ctx.fillText(`Pot slots: ${prop.potSlots}  ·  Dealer slots: ${prop.dealerSlots}`, px + 16, py + 84);
            ctx.fillText(prop.desc, px + 16, py + 104);

            const canAfford = Player.cash >= prop.cost;
            ctx.fillStyle = canAfford ? '#1b5e20' : '#555';
            ctx.fillRect(px + pw/2 - 80, py + 130, 160, 40);
            ctx.fillStyle = canAfford ? '#fff' : '#888';
            ctx.font = 'bold 14px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('BUY PROPERTY', px + pw/2, py + 156);
            ctx.textAlign = 'left';
            GameState._propBuyBtn = { x: px + pw/2 - 80, y: py + 130, w: 160, h: 40, propId: prop.id };
        } else {
            GameState._propBuyBtn = null;
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText('✓ OWNED', px + 16, py + 62);
            ctx.fillStyle = '#90a4ae';
            ctx.font = '12px "Courier New"';
            ctx.fillText(`Pot slots: ${prop.potSlots}  ·  Dealer slots: ${prop.dealerSlots}`, px + 16, py + 80);

            // Show pots
            const pots = GrowSystem.getPotsForProperty(prop.id);
            ctx.fillStyle = '#90caf9';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText('GROW POTS:', px + 16, py + 106);

            for (let i = 0; i < prop.potSlots; i++) {
                const pot  = pots[i];
                const px2  = px + 16 + (i % 4) * 124;
                const py2  = py + 114 + Math.floor(i / 4) * 90;

                ctx.strokeStyle = '#4a4a8a';
                ctx.lineWidth = 1;
                ctx.strokeRect(px2, py2, 116, 80);
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(px2 + 1, py2 + 1, 114, 78);

                if (!pot) {
                    ctx.fillStyle = '#607d8b';
                    ctx.font = '10px "Courier New"';
                    ctx.textAlign = 'center';
                    ctx.fillText('Empty', px2 + 58, py2 + 26);
                    // Plant button
                    const hasSeeds = Object.keys(Player.supplies).some(k => k.endsWith('_seed'));
                    ctx.fillStyle = hasSeeds ? '#1b5e20' : '#333';
                    ctx.fillRect(px2 + 14, py2 + 38, 88, 26);
                    ctx.fillStyle = '#fff';
                    ctx.fillText('Plant', px2 + 58, py2 + 55);
                    ctx.textAlign = 'left';
                    // Store btn coords
                    if (!GameState._potBtns) GameState._potBtns = [];
                    GameState._potBtns[i] = { x: px2 + 14, y: py2 + 38, w: 88, h: 26,
                        action: 'plant', propId: prop.id, slot: i };
                } else {
                    const strain = STRAINS[pot.strainId];
                    ctx.fillStyle = strain?.color || '#4caf50';
                    ctx.font = 'bold 9px "Courier New"';
                    ctx.textAlign = 'center';
                    ctx.fillText(strain?.name || pot.strainId, px2 + 58, py2 + 14);

                    // Progress bar
                    const hoursGrown = (GameState.gameMins - pot.plantedAt) / 60;
                    const prog = Math.min(1, hoursGrown / CFG.GROW_READY);
                    ctx.fillStyle = '#333';
                    ctx.fillRect(px2 + 8, py2 + 20, 100, 8);
                    ctx.fillStyle = '#4caf50';
                    ctx.fillRect(px2 + 8, py2 + 20, 100 * prog, 8);
                    ctx.fillStyle = '#e2e2e2';
                    ctx.font = '8px "Courier New"';
                    ctx.fillText(GrowSystem.STAGES[pot.stage], px2 + 58, py2 + 35);

                    if (!GameState._potBtns) GameState._potBtns = [];
                    if (pot.stage >= 4) {
                        ctx.fillStyle = '#ffd700';
                        ctx.fillRect(px2 + 8, py2 + 44, 100, 24);
                        ctx.fillStyle = '#000';
                        ctx.fillText('Harvest', px2 + 58, py2 + 60);
                        GameState._potBtns[i] = { x: px2+8, y: py2+44, w: 100, h: 24, action:'harvest', potId: pot.id };
                    } else {
                        ctx.fillStyle = pot.watered ? '#1565c0' : '#c62828';
                        ctx.fillRect(px2 + 8, py2 + 44, 100, 24);
                        ctx.fillStyle = '#fff';
                        ctx.fillText(pot.watered ? '💧 Watered' : '💧 Water!', px2 + 58, py2 + 60);
                        GameState._potBtns[i] = { x: px2+8, y: py2+44, w: 100, h: 24, action:'water', potId: pot.id };
                    }
                    ctx.textAlign = 'left';
                }
            }
        }

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Leave', px + 8, py + ph - 8);
    },

    // ── Mixing Panel ─────────────────────────────────────────────────────
    drawMixPanel(ctx) {
        if (GameState.uiMode !== 'mixing') return;
        const mix = GameState.activeMix;
        if (!mix) { GameState.uiMode = 'inventory'; return; }

        const pw = 500, ph = 400;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        const strain = STRAINS[mix.strainId];

        this._drawPanel(ctx, px, py, pw, ph, 'MIXING LAB');

        ctx.fillStyle = strain?.color || '#888';
        ctx.fillRect(px + 16, py + 52, 24, 40);
        ctx.fillStyle = '#e2e2e2';
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillText(`${strain?.name || mix.strainId}  ·  ${mix.grams.toFixed(1)}g`, px + 48, py + 70);
        ctx.fillStyle = '#ba68c8';
        ctx.font = '12px "Courier New"';
        ctx.fillText('Effects: ' + (mix.effects.join(' · ') || 'none'), px + 48, py + 88);
        ctx.fillStyle = '#4caf50';
        ctx.fillText('Value: ' + U.money(calcBatchValue(mix.strainId, mix.effects, mix.grams)), px + 48, py + 104);

        ctx.fillStyle = '#90caf9';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText('AVAILABLE ADDITIVES (click to add):', px + 16, py + 128);

        const adds = Object.values(ADDITIVES);
        for (let i = 0; i < adds.length; i++) {
            const add  = adds[i];
            const qty  = Player.supplies[add.id] || 0;
            const ax   = px + 16 + (i % 3) * 156;
            const ay   = py + 136 + Math.floor(i / 3) * 50;

            const has  = qty > 0;
            ctx.fillStyle = has ? 'rgba(21,101,192,0.4)' : 'rgba(80,80,80,0.3)';
            ctx.fillRect(ax, ay, 148, 42);
            ctx.strokeStyle = has ? '#1565c0' : '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(ax, ay, 148, 42);

            ctx.fillStyle = has ? '#fff' : '#607d8b';
            ctx.font = '12px "Courier New"';
            ctx.fillText(`${add.icon} ${add.name}`, ax + 6, ay + 16);
            ctx.font = '10px "Courier New"';
            ctx.fillStyle = has ? '#90caf9' : '#555';
            ctx.fillText(`→ ${add.adds}  (x${qty})`, ax + 6, ay + 30);

            add._mixBtn = { x: ax, y: ay, w: 148, h: 42, has };
        }

        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Back to Inventory', px + 8, py + ph - 8);
    },

    // ── Dialog Box ───────────────────────────────────────────────────────
    _dialogBtns: [],
    drawDialog(ctx) {
        if (GameState.uiMode !== 'dialog') return;
        const d = GameState.activeDialog;
        if (!d) return;

        const pw = 480, ph = 220;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 10);
        ctx.fill();
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 15px "Courier New"';
        ctx.fillText(d.speaker, px + 16, py + 26);

        ctx.fillStyle = '#e2e2e2';
        ctx.font = '12px "Courier New"';
        const lines = U.wrapText(ctx, d.text, pw - 32);
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], px + 16, py + 50 + i * 18);
        }

        this._dialogBtns = [];
        const bw = 140, bh = 32;
        const totalW = d.buttons.length * bw + (d.buttons.length - 1) * 12;
        let bx = px + (pw - totalW) / 2;

        for (const btn of d.buttons) {
            const by = py + ph - 48;
            ctx.fillStyle = btn.action === 'bust' || btn.action === 'dismiss' ? '#555' : '#1565c0';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, bx + bw/2, by + 21);
            ctx.textAlign = 'left';
            this._dialogBtns.push({ ...btn, bx, by, bw, bh });
            bx += bw + 12;
        }
    },

    // ── Laundry / ATM Panels ──────────────────────────────────────────────
    drawLaundryPanel(ctx) {
        if (GameState.uiMode !== 'laundry') return;
        const pw = 380, ph = 280;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        this._drawPanel(ctx, px, py, pw, ph, 'LAUNDROMAT');
        ctx.fillStyle = '#90a4ae';
        ctx.font = '12px "Courier New"';
        ctx.fillText(`Cash on hand: ${U.money(Player.cash)}`, px+16, py+60);
        ctx.fillText(`Bank balance: ${U.money(GameState.bankBalance)}`, px+16, py+78);
        ctx.fillText(`Laundering fee: ${(CFG.LAUNDER_FEE*100).toFixed(0)}%`, px+16, py+96);

        // Amount buttons
        const amounts = [500, 1000, 2000, 5000];
        for (let i = 0; i < amounts.length; i++) {
            const amt = amounts[i];
            const bx = px + 16 + (i%2)*170;
            const by = py + 116 + Math.floor(i/2)*50;
            const canDo = Player.cash >= amt;
            ctx.fillStyle = canDo ? '#1565c0' : '#333';
            ctx.fillRect(bx, by, 154, 38);
            ctx.fillStyle = canDo ? '#fff' : '#666';
            ctx.font = '12px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`Launder ${U.money(amt)}`, bx + 77, by + 24);
            ctx.textAlign = 'left';
            if (!GameState._laundryBtns) GameState._laundryBtns = [];
            GameState._laundryBtns[i] = { x:bx, y:by, w:154, h:38, amount:amt };
        }
        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Leave', px+8, py+ph-8);
    },

    drawATMPanel(ctx) {
        if (GameState.uiMode !== 'atm') return;
        const pw = 340, ph = 220;
        const px = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        this._drawPanel(ctx, px, py, pw, ph, 'ATM');
        ctx.fillStyle = '#e2e2e2';
        ctx.font = '13px "Courier New"';
        ctx.fillText(`Bank Balance: ${U.money(GameState.bankBalance)}`, px+16, py+64);
        ctx.fillText(`Cash: ${U.money(Player.cash)}`, px+16, py+84);

        ctx.fillStyle = '#1565c0';
        ctx.fillRect(px+16, py+108, 140, 36);
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('Withdraw All', px+86, py+131);
        ctx.textAlign = 'left';
        GameState._atmWithdraw = { x:px+16, y:py+108, w:140, h:36 };
        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Leave', px+8, py+ph-8);
    },

    // ── Casino Panel (Blackjack) ──────────────────────────────────────────
    _casino: {
        active: false, bet: 100,
        deck: [], playerCards: [], dealerCards: [],
        playerVal: 0, dealerVal: 0,
        state: 'bet', // 'bet','playing','done'
        result: '',
    },

    drawCasinoPanel(ctx) {
        if (GameState.uiMode !== 'casino') return;
        const c   = this._casino;
        const pw  = 600, ph = 460;
        const px  = (CFG.W - pw) / 2, py = (CFG.H - ph) / 2;
        this._drawPanel(ctx, px, py, pw, ph, '🃏 LUCKY 7 BLACKJACK');

        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(px + 10, py + 46, pw - 20, ph - 70);

        if (c.state === 'bet') {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`Bet: ${U.money(c.bet)}`, px + pw/2, py + 120);
            const bets = [50, 100, 250, 500, 1000];
            for (let i = 0; i < bets.length; i++) {
                const bx = px + 30 + i * 106;
                ctx.fillStyle = '#c8a000';
                ctx.fillRect(bx, py + 140, 94, 32);
                ctx.fillStyle = '#000';
                ctx.fillText(U.money(bets[i]), bx + 47, py + 161);
            }
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(px + pw/2 - 70, py + 190, 140, 40);
            ctx.fillStyle = '#fff';
            ctx.fillText('DEAL', px + pw/2, py + 216);
            ctx.textAlign = 'left';
            GameState._casinoDeal  = { x: px + pw/2 - 70, y: py + 190, w: 140, h: 40 };
            GameState._casinoBets  = bets.map((v,i) => ({ x: px+30+i*106, y: py+140, w:94, h:32, val:v }));
        } else {
            this._drawCards(ctx, px, py, pw, c);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(`Dealer: ${c.dealerVal}   Player: ${c.playerVal}`, px + pw/2, py + 200);

            if (c.state === 'playing') {
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(px + pw/2 - 130, py + 220, 110, 36);
                ctx.fillStyle = '#c62828';
                ctx.fillRect(px + pw/2 + 20,  py + 220, 110, 36);
                ctx.fillStyle = '#fff';
                ctx.fillText('HIT', px + pw/2 - 75, py + 243);
                ctx.fillText('STAND', px + pw/2 + 75, py + 243);
                GameState._casinoHit   = { x: px+pw/2-130, y:py+220, w:110, h:36 };
                GameState._casinoStand = { x: px+pw/2+20,  y:py+220, w:110, h:36 };
            } else if (c.state === 'done') {
                ctx.fillStyle = c.result.includes('WIN') ? '#ffd700' : '#f44336';
                ctx.font = 'bold 22px "Courier New"';
                ctx.fillText(c.result, px + pw/2, py + 240);
                ctx.fillStyle = '#1565c0';
                ctx.fillRect(px + pw/2 - 60, py + 258, 120, 34);
                ctx.fillStyle = '#fff';
                ctx.font = '13px "Courier New"';
                ctx.fillText('Play Again', px + pw/2, py + 280);
                GameState._casinoAgain = { x: px+pw/2-60, y:py+258, w:120, h:34 };
            }
            ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#607d8b';
        ctx.font = '11px "Courier New"';
        ctx.fillText('[ESC] Leave', px + 8, py + ph - 8);
    },

    _drawCards(ctx, px, py, pw, c) {
        const cw = 40, ch = 58;
        ctx.textAlign = 'center';
        // Dealer cards
        for (let i = 0; i < c.dealerCards.length; i++) {
            const card = c.state === 'playing' && i === 0 ? '??' : c.dealerCards[i];
            const cx = px + pw/2 - (c.dealerCards.length * 46)/2 + i * 46;
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx, py + 56, cw, ch);
            ctx.fillStyle = card.includes('♥')||card.includes('♦') ? '#c62828' : '#111';
            ctx.font = '12px "Courier New"';
            ctx.fillText(card, cx + cw/2, py + 56 + ch/2 + 4);
        }
        // Player cards
        for (let i = 0; i < c.playerCards.length; i++) {
            const card = c.playerCards[i];
            const cx = px + pw/2 - (c.playerCards.length * 46)/2 + i * 46;
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx, py + 134, cw, ch);
            ctx.fillStyle = card.includes('♥')||card.includes('♦') ? '#c62828' : '#111';
            ctx.font = '12px "Courier New"';
            ctx.fillText(card, cx + cw/2, py + 134 + ch/2 + 4);
        }
        ctx.textAlign = 'left';
    },

    // ── Shared panel chrome ───────────────────────────────────────────────
    _drawPanel(ctx, px, py, pw, ph, title) {
        ctx.fillStyle = 'rgba(15,20,40,0.96)';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 12);
        ctx.fill();
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#16213e';
        ctx.fillRect(px, py, pw, 42);
        ctx.fillStyle = '#e2e2e2';
        ctx.font = 'bold 15px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(title, px + pw/2, py + 27);
        ctx.textAlign = 'left';

        // Close X
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(px + pw - 36, py + 8, 26, 26);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('✕', px + pw - 23, py + 26);
        ctx.textAlign = 'left';

        this._lastPanelClose = { x: px + pw - 36, y: py + 8, w: 26, h: 26 };
    },

    // ── Public API called by game loop ────────────────────────────────────
    showShop(type) {
        GameState.activeShop = type;
        GameState.uiMode = 'shop';
    },

    showPropertyPanel(b) {
        GameState.activeBuilding = b;
        GameState._potBtns = [];
        GameState.uiMode = 'property';
    },

    showDealPanel(npc) {
        GameState.uiMode = 'deal';
    },

    showDealerPanel(npc) {
        GameState.uiMode = 'dealer';
        GameState.activeDealerNpc = npc;
    },

    showLaundryPanel() {
        GameState.uiMode = 'laundry';
        GameState._laundryBtns = [];
    },

    showCasinoPanel() {
        GameState.uiMode = 'casino';
        this._casino.state = 'bet';
        this._casino.active = true;
    },

    showPawnPanel() {
        GameState.uiMode = 'dialog';
        this.showDialog('Pawn Shop', 'We buy stolen goods. Come back when you have something.', [
            { label:'OK', action:'dismiss' }
        ]);
    },

    showATMPanel() {
        GameState.uiMode = 'atm';
    },

    showDialog(speaker, text, buttons) {
        GameState.activeDialog = { speaker, text, buttons };
        GameState.uiMode = 'dialog';
    },

    closeAllPanels() {
        GameState.uiMode = 'playing';
        GameState.activeShop = null;
        GameState.activeDialog = null;
        GameState.activeMix = null;
        GameState.activeBuilding = null;
        GameState.dealTarget = null;
        GameState._propBuyBtn = null;
        GameState._potBtns = [];
        GameState._laundryBtns = [];
        GameState._atmWithdraw = null;
    },

    // ── Draw everything for current mode ─────────────────────────────────
    drawAll(ctx) {
        this.drawHUD(ctx);
        this.drawMinimap(ctx);
        Phone.draw(ctx);
        this.drawDialog(ctx);
        this.drawShopPanel(ctx);
        this.drawInventoryPanel(ctx);
        this.drawDealPanel(ctx);
        this.drawPropertyPanel(ctx);
        this.drawMixPanel(ctx);
        this.drawMapPanel(ctx);
        this.drawLaundryPanel(ctx);
        this.drawATMPanel(ctx);
        this.drawCasinoPanel(ctx);
        Notifications.draw(ctx);
    },
};
