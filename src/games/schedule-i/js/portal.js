'use strict';
/**
 * Portal integration for Schedule I.
 *
 * Owns everything that talks to the launcher: handshake, save/load round-trip,
 * pause on backgrounding, dynamic resolution, and teardown. The game itself
 * stays unaware it is embedded.
 */
window.PORTAL_DEFER = true;   // game.js checks this before auto-starting

(function () {
    const Bridge   = PE.Bridge;
    const Teardown = PE.Teardown;
    const SAVE_VERSION = 1;
    let scaler = null;
    let autosave = 0;

    // ---- serialization -----------------------------------------------------
    function snapshot() {
        const npcs = {};
        for (const n of NPCManager.npcs) {
            npcs[n.id] = { u: n.unlocked ? 1 : 0, i: n.introduced ? 1 : 0, h: n.hired ? 1 : 0 };
        }
        return {
            v: SAVE_VERSION,
            state: {
                day: GameState.day,
                gameMins: GameState.gameMins,
                heat: GameState.heat,
                lastDealTime: GameState.lastDealTime,
                properties: GameState.properties,
                pots: GameState.pots,
                dealers: GameState.dealers,
                bankBalance: GameState.bankBalance,
                flags: GameState.flags,
            },
            player: {
                x: Player.x, y: Player.y, facing: Player.facing,
                cash: Player.cash, xp: Player.xp, rank: Player.rank,
                heat: Player.heat, energy: Player.energy,
                inventory: Player.inventory, supplies: Player.supplies,
            },
            npcs,
        };
    }

    function restore(save) {
        if (!save || save.v !== SAVE_VERSION) return false;
        const s = save.state, p = save.player;
        if (s) {
            GameState.day = s.day | 0;
            GameState.gameMins = +s.gameMins || 0;
            GameState.heat = +s.heat || 0;
            GameState.lastDealTime = +s.lastDealTime || 0;
            if (Array.isArray(s.properties)) GameState.properties = s.properties;
            if (Array.isArray(s.pots)) GameState.pots = s.pots;
            if (s.dealers) GameState.dealers = s.dealers;
            GameState.bankBalance = +s.bankBalance || 0;
            if (s.flags) GameState.flags = s.flags;
        }
        if (p) {
            Player.x = +p.x; Player.y = +p.y;
            Player.facing = p.facing || 'down';
            Player.cash = +p.cash || 0;
            Player.xp = +p.xp || 0;
            Player.rank = p.rank | 0;
            Player.heat = +p.heat || 0;
            Player.energy = p.energy == null ? 100 : +p.energy;
            if (p.inventory) Player.inventory = p.inventory;
            if (p.supplies) Player.supplies = p.supplies;
        }
        if (save.npcs) {
            for (const n of NPCManager.npcs) {
                const rec = save.npcs[n.id];
                if (!rec) continue;
                n.unlocked = !!rec.u; n.introduced = !!rec.i; n.hired = !!rec.h;
            }
        }
        return true;
    }

    // ---- resolution --------------------------------------------------------
    function attachScaler() {
        scaler = new PE.ResolutionScaler(Game.canvas, {
            logicalWidth: CFG.W,
            logicalHeight: CFG.H,
            targetFps: 60,
            initialScale: PE.ResolutionScaler.suggestInitialScale(),
            onResize(w, h, s) {
                // Resizing the backing store resets the 2D transform, so the
                // logical-to-backing scale has to be re-applied every time.
                // (The scale arrives as an argument: this fires from inside the
                // constructor, before `scaler` is assigned.)
                Game.ctx.setTransform(s, 0, 0, s, 0, 0);
                Game.ctx.imageSmoothingEnabled = false;
            },
        });

        const origRender = Game._render.bind(Game);
        let frameStart = 0;
        Game._render = function () {
            frameStart = performance.now();
            origRender();
            scaler.sample(performance.now() - frameStart, frameStart);
        };
    }

    // ---- lifecycle ---------------------------------------------------------
    function start(save) {
        Game.init();
        if (save) {
            const ok = restore(save);
            if (ok) Teardown.timeout(() => UI.notify('💾 Save loaded', '#8bc34a'), 400);
        }
        attachScaler();

        autosave = Teardown.interval(() => {
            if (Game.started && Game.screen !== 'title') Bridge.save(snapshot());
        }, 15000);

        Teardown.interval(() => {
            if (!Game.started) return;
            const mem = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
            Bridge.stats({ fps: Game._fps || 0, heapMB: Math.round(mem), scale: scaler ? scaler.scale() : 1 });
        }, 2000);

        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'schedule-i',

        onHello(ctx) { start(ctx.save); },

        onPause() {
            Game.paused = true;
            if (Game.screen === 'playing') Game.screen = 'paused';
            Bridge.save(snapshot());
            Bridge.flush();
        },

        onResume() {
            Game.paused = false;
            if (Game.screen === 'paused') Game.screen = 'playing';
        },

        onLowMemory() {
            // Nothing large is cached in this title; flush the save so the
            // portal can reclaim the frame at any moment without data loss.
            Bridge.flush();
        },

        onSettings(s) {
            if (s && scaler) {
                if (typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
                else scaler.setAuto(true);
            }
        },

        onShutdown() {
            if (Game.started && Game.screen !== 'title') { Bridge.save(snapshot()); Bridge.flush(); }
            clearInterval(autosave);
            Game.paused = true;
            Teardown.destroyAll();
        },
    });

    // Save on tab hide too: a killed tab never gets a shutdown message.
    Teardown.on(document, 'visibilitychange', () => {
        if (document.visibilityState === 'hidden' && Game.started) {
            Bridge.save(snapshot());
            Bridge.flush();
        }
    });
})();
