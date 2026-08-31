'use strict';

// ── Base Entity ───────────────────────────────────────────────────────────
class Entity {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.w = 22; this.h = 22;     // hitbox half-dims: actual is 2w × 2h
        this.facing = 'down';          // 'up' 'down' 'left' 'right'
        this.active = true;
    }

    move(dx, dy, dt) {
        if (dx !== 0) {
            const nx = this.x + dx * dt;
            if (World.canMoveTo(nx, this.y, this.w, this.h)) this.x = nx;
        }
        if (dy !== 0) {
            const ny = this.y + dy * dt;
            if (World.canMoveTo(this.x, ny, this.w, this.h)) this.y = ny;
        }
        if (dx < 0) this.facing = 'left';
        else if (dx > 0) this.facing = 'right';
        else if (dy < 0) this.facing = 'up';
        else if (dy > 0) this.facing = 'down';
    }

    get tx() { return Math.floor(this.x / CFG.TS); }
    get ty() { return Math.floor(this.y / CFG.TS); }

    distTo(other) { return U.dist(this.x, this.y, other.x, other.y); }

    // Draw cartoon-style character
    drawCharacter(ctx, sx, sy, bodyColor, headColor, hatColor, label) {
        const W = 20, H = 24;
        const hx = sx - W/2, hy = sy - H/2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + H/2 + 2, W/2, 4, 0, 0, Math.PI*2);
        ctx.fill();

        // Legs (animated)
        const legAnim = Math.sin(Date.now() * 0.012) * (this.vx||this.vy ? 6 : 0);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(hx + 4,  hy + H - 5,  5, 8 - Math.abs(legAnim));
        ctx.fillRect(hx + W - 9, hy + H - 5, 5, 8 + Math.abs(legAnim));

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(hx, hy + 8, W, H - 4, 4);
        ctx.fill();

        // Arms
        const armSwing = Math.sin(Date.now() * 0.012) * (this.vx||this.vy ? 10 : 0);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(hx - 5, hy + 10 + armSwing, 6, 10);
        ctx.fillRect(hx + W - 1, hy + 10 - armSwing, 6, 10);

        // Neck
        ctx.fillStyle = headColor;
        ctx.fillRect(sx - 4, hy + 6, 8, 6);

        // Head
        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.roundRect(hx + 1, hy - 10, W - 2, 20, 6);
        ctx.fill();

        // Hat (if any)
        if (hatColor) {
            ctx.fillStyle = hatColor;
            ctx.fillRect(hx - 1, hy - 14, W + 2, 6);
            ctx.fillRect(hx + 3, hy - 22, W - 6, 10);
        }

        // Eyes
        const eyeY = hy - 4;
        const blink = (Math.sin(Date.now() * 0.0015) > 0.97) ? 1 : 3;
        ctx.fillStyle = '#111';
        ctx.fillRect(hx + 4, eyeY, 4, blink);
        ctx.fillRect(hx + W - 8, eyeY, 4, blink);
        // Pupils
        if (blink > 1) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(hx + 5, eyeY + 1, 2, 2);
            ctx.fillRect(hx + W - 7, eyeY + 1, 2, 2);
        }

        // Label
        if (label) {
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            const lw = ctx.measureText(label).width;
            ctx.fillRect(sx - lw/2 - 3, hy - 28, lw + 6, 13);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, sx, hy - 18);
            ctx.textAlign = 'left';
        }
    }
}

// ── Player ────────────────────────────────────────────────────────────────
const Player = {
    x: (CFG.WW / 2) * CFG.TS,
    y: (CFG.WH / 2) * CFG.TS,
    w: 11, h: 11,
    facing: 'down',
    vx: 0, vy: 0,
    active: true,

    // Core stats
    cash: CFG.START_CASH,
    xp: 0,
    rank: 0,
    heat: 0,
    energy: 100,   // 0-100, depletes when sprinting
    hidden: false, // hiding in dumpster

    // Inventory: { [productKey]: { strainId, effects, grams, packaging } }
    inventory: {},
    // Supplies: { [itemId]: count }
    supplies: { baggie: 20 },
    // Active pots (across all owned properties)
    // Managed by GrowSystem

    get tx() { return Math.floor(this.x / CFG.TS); },
    get ty() { return Math.floor(this.y / CFG.TS); },

    get rankData() { return CFG.RANKS[Math.min(this.rank, CFG.RANKS.length - 1)]; },

    addXP(n) {
        this.xp += n;
        while (this.rank < CFG.RANKS.length - 1 &&
               this.xp >= CFG.RANKS[this.rank + 1].xp) {
            this.rank++;
            UI.notify(`🏆 RANK UP! You are now: ${CFG.RANKS[this.rank].name}`, '#ffd700');
        }
    },

    earn(amount, source = '') {
        this.cash += amount;
        this.addXP(Math.floor(amount / 5));
        if (source) UI.notify(`+${U.money(amount)} — ${source}`, '#4caf50');
    },

    spend(amount) {
        if (this.cash < amount) return false;
        this.cash -= amount;
        return true;
    },

    addInventory(strainId, effects, grams) {
        const key = strainId + ':' + effects.join(',');
        if (!this.inventory[key]) {
            this.inventory[key] = { strainId, effects: [...effects], grams: 0, key };
        }
        this.inventory[key].grams += grams;
    },

    removeInventory(key, grams) {
        if (!this.inventory[key]) return false;
        if (this.inventory[key].grams < grams) return false;
        this.inventory[key].grams -= grams;
        if (this.inventory[key].grams <= 0) delete this.inventory[key];
        return true;
    },

    totalGrams() {
        return Object.values(this.inventory).reduce((s, v) => s + v.grams, 0);
    },

    // Pixel-level movement
    update(dt) {
        if (GameState.uiMode !== 'playing') return;
        if (this.hidden) return;

        const speed = Input.sprint && this.energy > 0
            ? CFG.SPRINT : CFG.SPEED;

        const dx = Input.axis('ArrowLeft','KeyA') + Input.axis('ArrowLeft','ArrowLeft')
                 || Input.left;
        const dy = Input.axis('ArrowUp','KeyW') + Input.axis('ArrowUp','ArrowUp')
                 || 0;

        let mx = Input.left;
        let my = Input.up;

        // Re-read properly
        mx = (Input.down('KeyA') || Input.down('ArrowLeft') ? -1 : 0)
           + (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0);
        my = (Input.down('KeyW') || Input.down('ArrowUp')   ? -1 : 0)
           + (Input.down('KeyS') || Input.down('ArrowDown') ? 1 : 0);

        if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }

        const spd = (Input.sprint && this.energy > 10) ? CFG.SPRINT : CFG.SPEED;

        if (mx !== 0) {
            const nx = this.x + mx * spd * dt;
            if (World.canMoveTo(nx, this.y, this.w, this.h)) this.x = nx;
        }
        if (my !== 0) {
            const ny = this.y + my * spd * dt;
            if (World.canMoveTo(this.x, ny, this.w, this.h)) this.y = ny;
        }

        if (mx < 0) this.facing = 'left';
        else if (mx > 0) this.facing = 'right';
        else if (my < 0) this.facing = 'up';
        else if (my > 0) this.facing = 'down';

        this.vx = mx; this.vy = my;

        // Energy drain/regen
        if (Input.sprint && (mx||my)) this.energy = Math.max(0, this.energy - 15 * dt);
        else this.energy = Math.min(100, this.energy + 8 * dt);

        // Clamp to world bounds
        this.x = U.clamp(this.x, this.w, World.mapW * CFG.TS - this.w);
        this.y = U.clamp(this.y, this.h, World.mapH * CFG.TS - this.h);
    },

    draw(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        const e = new Entity(0, 0);
        e.vx = this.vx; e.vy = this.vy;
        e.drawCharacter(ctx, sx, sy, '#1e90ff', '#FDBCB4', null, null);

        // Sprint particles
        if (Input.sprint && (this.vx || this.vy) && this.energy > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(
                    sx - this.vx * U.rng(10,25) + U.rng(-5,5),
                    sy - this.vy * U.rng(10,25) + U.rng(-5,5),
                    2, 2
                );
            }
        }
    },
};

// ── NPC types ─────────────────────────────────────────────────────────────
const NPC_DEFS = [
    {
        id:'benji', name:'Benji', role:'customer',
        bodyColor:'#ff8c00', headColor:'#FDBCB4', hatColor:null,
        tx:20, ty:19,
        prefs:['og_kush','sour_diesel'], maxSpendDay:120,
        introMsg:"Yo! You the new supplier? I need something to take the edge off. Text me when you got product.",
        greeting:"What you got for me today?",
        unlockRank:0,
    },
    {
        id:'tina', name:'Tina', role:'customer',
        bodyColor:'#ff69b4', headColor:'#c8a882', hatColor:null,
        tx:58, ty:22,
        prefs:['granddaddy_purple','white_widow'], maxSpendDay:180,
        introMsg:"My friend told me about you. I like the good stuff, don't bring me any trash.",
        greeting:"You better have something worth my time.",
        unlockRank:1,
    },
    {
        id:'carlos', name:'Carlos', role:'customer',
        bodyColor:'#228b22', headColor:'#8B6914', hatColor:null,
        tx:64, ty:60,
        prefs:['green_crack','sour_diesel'], maxSpendDay:250,
        introMsg:"I heard you're building something here. I buy in bulk — don't waste my time with small amounts.",
        greeting:"How much you moving today?",
        unlockRank:1,
    },
    {
        id:'raj', name:'Raj', role:'customer',
        bodyColor:'#4169e1', headColor:'#9a7a50', hatColor:null,
        tx:47, ty:21,
        prefs:['white_widow','granddaddy_purple'], maxSpendDay:200,
        introMsg:"New in town? Word travels fast. I'm looking for a reliable source. Quality only.",
        greeting:"Anything good this week?",
        unlockRank:2,
    },
    {
        id:'molly', name:'Molly', role:'customer',
        bodyColor:'#9932cc', headColor:'#FDBCB4', hatColor:null,
        tx:72, ty:52,
        prefs:['og_kush','green_crack'], maxSpendDay:300,
        introMsg:"I've been waiting for someone like you. The last supplier was unreliable. Don't let me down.",
        greeting:"Please tell me you have something.",
        unlockRank:2,
    },
    {
        id:'leo', name:'Leo', role:'customer',
        bodyColor:'#8b0000', headColor:'#c8a882', hatColor:'#333',
        tx:14, ty:58,
        prefs:['white_widow','sour_diesel'], maxSpendDay:400,
        introMsg:"You've got a rep now. I deal with serious people. Let's see if you can keep up with demand.",
        greeting:"I need volume. You got volume?",
        unlockRank:3,
    },
    // Dealers (work for you)
    {
        id:'dealer_mia', name:'Mia', role:'dealer',
        bodyColor:'#ff4500', headColor:'#FDBCB4', hatColor:null,
        tx:24, ty:36,
        hireCost:500, cutPct:0.35,
        introMsg:"I can move product for you. Give me supply and I'll handle the street sales.",
        unlockRank:2,
    },
    {
        id:'dealer_dom', name:'Dom', role:'dealer',
        bodyColor:'#2f4f4f', headColor:'#8B6914', hatColor:'#1a1a1a',
        tx:56, ty:36,
        hireCost:800, cutPct:0.30,
        introMsg:"Heard you're growing your operation. I've got contacts downtown. Pay me right, I'll make you money.",
        unlockRank:3,
    },
    // Police officers (patrol)
    {
        id:'cop_1', name:'Officer Davis', role:'police',
        bodyColor:'#1a3a6a', headColor:'#FDBCB4', hatColor:'#1a1a5a',
        patrolPath:[[38,34],[38,38],[42,38],[42,34]], patrolIdx:0, patrolWait:0,
        tx:38, ty:36,
    },
    {
        id:'cop_2', name:'Officer Chen', role:'police',
        bodyColor:'#1a3a6a', headColor:'#c8a882', hatColor:'#1a1a5a',
        patrolPath:[[20,32],[28,32],[28,42],[20,42]], patrolIdx:0, patrolWait:0,
        tx:20, ty:32,
    },
    {
        id:'cop_3', name:'Officer Park', role:'police',
        bodyColor:'#1a3a6a', headColor:'#9a7a50', hatColor:'#1a1a5a',
        patrolPath:[[55,45],[65,45],[65,55],[55,55]], patrolIdx:0, patrolWait:0,
        tx:55, ty:45,
    },
    // Ambient civilians
    {id:'civ_1',name:'',role:'ambient',bodyColor:'#ff6347',headColor:'#FDBCB4',hatColor:null,tx:22,ty:15,wanderRadius:5},
    {id:'civ_2',name:'',role:'ambient',bodyColor:'#3cb371',headColor:'#c8a882',hatColor:null,tx:48,ty:18,wanderRadius:6},
    {id:'civ_3',name:'',role:'ambient',bodyColor:'#da70d6',headColor:'#FDBCB4',hatColor:null,tx:60,ty:52,wanderRadius:4},
    {id:'civ_4',name:'',role:'ambient',bodyColor:'#daa520',headColor:'#8B6914',hatColor:null,tx:30,ty:55,wanderRadius:5},
    {id:'civ_5',name:'',role:'ambient',bodyColor:'#20b2aa',headColor:'#FDBCB4',hatColor:null,tx:70,ty:25,wanderRadius:7},
];

// ── NPC Manager ────────────────────────────────────────────────────────────
const NPCManager = {
    npcs: [],

    init() {
        this.npcs = NPC_DEFS.map(def => {
            const npc = Object.assign({}, def);
            npc.x = (def.tx + 0.5) * CFG.TS;
            npc.y = (def.ty + 0.5) * CFG.TS;
            npc.vx = 0; npc.vy = 0;
            // Customer state
            npc.unlocked    = (def.unlockRank === 0);
            npc.introduced  = false;
            npc.hired       = false;
            npc.spentToday  = 0;
            // Patrol/wander state
            npc.patrolIdx   = 0;
            npc.moveTimer   = 0;
            npc.wanderTarget = null;
            npc.w = 10; npc.h = 10;
            return npc;
        });
    },

    update(dt) {
        for (const npc of this.npcs) {
            if (!npc.active) continue;
            if (npc.role === 'ambient') this._updateWander(npc, dt);
            if (npc.role === 'police')  this._updatePatrol(npc, dt);
            if ((npc.role === 'customer' || npc.role === 'dealer') && npc.unlocked)
                this._updateCustomer(npc, dt);
        }
    },

    _updateWander(npc, dt) {
        npc.moveTimer -= dt;
        if (!npc.wanderTarget || npc.moveTimer <= 0) {
            const ox = (npc.tx || Math.floor(npc.x/CFG.TS));
            const oy = (npc.ty || Math.floor(npc.y/CFG.TS));
            const r  = npc.wanderRadius || 4;
            npc.wanderTarget = {
                x: (ox + U.rng(-r, r) + 0.5) * CFG.TS,
                y: (oy + U.rng(-r, r) + 0.5) * CFG.TS,
            };
            npc.moveTimer = U.rng(2, 6);
        }
        this._moveToward(npc, npc.wanderTarget.x, npc.wanderTarget.y, 50, dt);
    },

    _updatePatrol(npc, dt) {
        if (!npc.patrolPath || npc.patrolPath.length === 0) return;
        npc.patrolWait -= dt;
        if (npc.patrolWait > 0) return;

        const target = npc.patrolPath[npc.patrolIdx];
        const tx = (target[0] + 0.5) * CFG.TS;
        const ty = (target[1] + 0.5) * CFG.TS;
        const d  = U.dist(npc.x, npc.y, tx, ty);

        if (d < 8) {
            npc.patrolIdx = (npc.patrolIdx + 1) % npc.patrolPath.length;
            npc.patrolWait = U.rng(1, 3);
        } else {
            this._moveToward(npc, tx, ty, 70, dt);
        }

        // Police: check if close to player and heat is high
        if (GameState.heat > CFG.BUST_THRESHOLD) {
            const dp = U.dist(npc.x, npc.y, Player.x, Player.y);
            if (dp < 120) {
                // Chase!
                this._moveToward(npc, Player.x, Player.y, 90, dt);
                if (dp < 35) {
                    PoliceSystem.bust();
                }
            }
        } else {
            // Random search
            const dp = U.dist(npc.x, npc.y, Player.x, Player.y);
            if (dp < 80 && GameState.heat > 30) {
                this._moveToward(npc, Player.x, Player.y, 75, dt);
                if (dp < 35) PoliceSystem.bodySearch();
            }
        }
    },

    _updateCustomer(npc, dt) {
        // Idle near their spawn point
        npc.moveTimer -= dt;
        if (npc.moveTimer <= 0) {
            npc.wanderTarget = {
                x: (npc.tx + U.rng(-2,2) + 0.5) * CFG.TS,
                y: (npc.ty + U.rng(-2,2) + 0.5) * CFG.TS,
            };
            npc.moveTimer = U.rng(3, 8);
        }
        if (npc.wanderTarget) {
            this._moveToward(npc, npc.wanderTarget.x, npc.wanderTarget.y, 45, dt);
        }
    },

    _moveToward(npc, tx, ty, speed, dt) {
        const dx = tx - npc.x;
        const dy = ty - npc.y;
        const d  = Math.hypot(dx, dy);
        if (d < 4) { npc.vx = 0; npc.vy = 0; return; }
        const nx = dx / d * speed * dt;
        const ny = dy / d * speed * dt;
        if (World.canMoveTo(npc.x + nx, npc.y, npc.w, npc.h)) npc.x += nx;
        if (World.canMoveTo(npc.x, npc.y + ny, npc.w, npc.h)) npc.y += ny;
        npc.vx = nx / dt; npc.vy = ny / dt;
        if (dx < 0) npc.facing = 'left';
        else if (dx > 0) npc.facing = 'right';
        else if (dy < 0) npc.facing = 'up';
        else npc.facing = 'down';
    },

    draw(ctx, camX, camY) {
        const ent = new Entity(0, 0);
        for (const npc of this.npcs) {
            if (!npc.active) continue;
            // Skip customers that aren't unlocked
            if (npc.role === 'customer' && !npc.unlocked) continue;
            if (npc.role === 'dealer'   && !npc.hired)    continue;

            const sx = npc.x - camX;
            const sy = npc.y - camY;
            if (sx < -40 || sx > CFG.W+40 || sy < -40 || sy > CFG.H+40) continue;

            ent.vx = npc.vx; ent.vy = npc.vy;
            const label = npc.role === 'police' ? npc.name : (npc.name || null);
            ent.drawCharacter(ctx, sx, sy,
                npc.bodyColor, npc.headColor, npc.hatColor,
                label
            );

            // Police badge
            if (npc.role === 'police') {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 9px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('POLICE', sx, sy + 14);
                ctx.textAlign = 'left';
            }

            // Interact prompt
            if (npc.role !== 'ambient') {
                const dp = U.dist(npc.x, npc.y, Player.x, Player.y);
                if (dp < CFG.INTERACT) {
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.font = '11px "Courier New"';
                    ctx.textAlign = 'center';
                    ctx.fillText('[E] Talk', sx, sy - 34);
                    ctx.textAlign = 'left';
                }
            }
        }
    },

    getNearest(x, y, range, role) {
        let best = null, bestD = range;
        for (const npc of this.npcs) {
            if (!npc.active) continue;
            if (role && npc.role !== role) continue;
            if (npc.role === 'customer' && !npc.unlocked) continue;
            if (npc.role === 'dealer'   && !npc.hired)    continue;
            const d = U.dist(npc.x, npc.y, x, y);
            if (d < bestD) { bestD = d; best = npc; }
        }
        return best;
    },

    getById(id) { return this.npcs.find(n => n.id === id); },

    unlockCustomer(id) {
        const npc = this.getById(id);
        if (npc && !npc.unlocked) {
            npc.unlocked = true;
            Phone.addContact(npc);
            Phone.receiveMessage(npc.id, npc.introMsg);
            UI.notify(`📱 New contact: ${npc.name}`, '#4caf50');
        }
    },
};
