'use strict';
/**
 * Blockfall — a seven-bag tetromino stacker with a ghost piece, hold, a next
 * queue, and lock delay. The board is a flat Uint8Array and pieces are integer
 * rotations, so nothing here allocates while you play.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown;
    const COLS = 10, ROWS = 20, CELL = 30;
    const BOARD_W = COLS * CELL, BOARD_H = ROWS * CELL;
    const SIDE = 148, W = BOARD_W + SIDE * 2, H = BOARD_H + 40;
    const OX = SIDE, OY = 20;

    // Each shape is four rotations of four [x,y] cells, authored directly so
    // rotation is a lookup rather than a matrix multiply.
    const SHAPES = {
        I: { c: '#5BE0E0', r: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]] },
        J: { c: '#6E8BFF', r: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]] },
        L: { c: '#FFA13D', r: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]] },
        O: { c: '#FFD24D', r: [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]] },
        S: { c: '#5FD79B', r: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]] },
        T: { c: '#C08BFF', r: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]] },
        Z: { c: '#FF6B6B', r: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]] },
    };
    const NAMES = Object.keys(SHAPES);
    const COLOR_INDEX = NAMES.reduce((m, n, i) => (m[n] = i + 1, m), {});

    const board = new Uint8Array(COLS * ROWS);
    const state = {
        mode: 'title', score: 0, best: 0, lines: 0, level: 1,
        piece: null, rot: 0, px: 0, py: 0, hold: null, held: false,
        fall: 0, lock: 0, clearing: null, clearT: 0, flash: 0,
    };
    let bag = [], queue = [];

    function nextName() {
        if (!bag.length) {
            bag = NAMES.slice();
            for (let i = bag.length - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        return bag.pop();
    }

    function spawn(name) {
        state.piece = name || (queue.shift() || nextName());
        while (queue.length < 4) queue.push(nextName());
        state.rot = 0; state.px = 3; state.py = -1;
        state.fall = 0; state.lock = 0;
        if (collides(state.px, state.py, state.rot)) {
            state.mode = 'dead';
            if (state.score > state.best) state.best = state.score;
            Bridge.score(state.score, 'points');
            persist();
        }
    }

    const cells = () => SHAPES[state.piece].r[state.rot];

    function collides(px, py, rot) {
        const cs = SHAPES[state.piece].r[rot];
        for (let i = 0; i < 4; i++) {
            const x = px + cs[i][0], y = py + cs[i][1];
            if (x < 0 || x >= COLS || y >= ROWS) return true;
            if (y >= 0 && board[y * COLS + x]) return true;
        }
        return false;
    }

    function lock() {
        const cs = cells();
        for (let i = 0; i < 4; i++) {
            const x = state.px + cs[i][0], y = state.py + cs[i][1];
            if (y >= 0) board[y * COLS + x] = COLOR_INDEX[state.piece];
        }
        const full = [];
        for (let y = 0; y < ROWS; y++) {
            let solid = true;
            for (let x = 0; x < COLS; x++) if (!board[y * COLS + x]) { solid = false; break; }
            if (solid) full.push(y);
        }
        if (full.length) {
            state.clearing = full;
            state.clearT = 0.24;
            state.flash = 1;
            state.lines += full.length;
            state.score += [0, 100, 300, 500, 800][full.length] * state.level;
            state.level = 1 + Math.floor(state.lines / 10);
            if (state.score > state.best) state.best = state.score;
            persist();
        } else {
            state.held = false;
            spawn();
        }
    }

    function collapse() {
        for (const y of state.clearing) {
            board.copyWithin(COLS, 0, y * COLS);
            board.fill(0, 0, COLS);
        }
        state.clearing = null;
        state.held = false;
        spawn();
    }

    function reset() {
        board.fill(0);
        state.score = 0; state.lines = 0; state.level = 1;
        state.hold = null; state.held = false; state.clearing = null;
        bag = []; queue = [];
        state.mode = 'playing';
        spawn();
    }

    function drop() {
        while (!collides(state.px, state.py + 1, state.rot)) { state.py++; state.score += 2; }
        lock();
    }

    function rotate(dir) {
        const nr = (state.rot + dir + 4) % 4;
        // Wall kicks, tried in order: in place, then one or two cells aside.
        for (const dx of [0, -1, 1, -2, 2]) {
            if (!collides(state.px + dx, state.py, nr)) { state.px += dx; state.rot = nr; state.lock = 0; return; }
        }
    }

    function step(dt) {
        state.flash *= 0.88;
        if (state.mode !== 'playing') return;
        if (state.clearing) {
            state.clearT -= dt;
            if (state.clearT <= 0) collapse();
            return;
        }
        const speed = Math.max(0.06, 0.62 - (state.level - 1) * 0.055);
        state.fall += dt;
        if (state.fall >= speed) {
            state.fall = 0;
            if (!collides(state.px, state.py + 1, state.rot)) state.py++;
            else {
                // Lock delay: a moment to slide the piece before it sets.
                state.lock += speed;
                if (state.lock >= 0.5) lock();
            }
        }
    }

    let canvas, ctx, scaler, loop;
    const colorOf = (i) => SHAPES[NAMES[i - 1]].c;

    function render(alpha, dt) {
        ctx.setTransform(scaler.scale(), 0, 0, scaler.scale(), 0, 0);
        ctx.fillStyle = '#0B0A0F';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#15131C';
        roundRect(OX - 6, OY - 6, BOARD_W + 12, BOARD_H + 12, 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 1; x < COLS; x++) { ctx.moveTo(OX + x * CELL, OY); ctx.lineTo(OX + x * CELL, OY + BOARD_H); }
        for (let y = 1; y < ROWS; y++) { ctx.moveTo(OX, OY + y * CELL); ctx.lineTo(OX + BOARD_W, OY + y * CELL); }
        ctx.stroke();

        for (let y = 0; y < ROWS; y++) {
            const clearing = state.clearing && state.clearing.includes(y);
            for (let x = 0; x < COLS; x++) {
                const v = board[y * COLS + x];
                if (!v) continue;
                block(OX + x * CELL, OY + y * CELL, clearing ? '#FFFFFF' : colorOf(v), clearing ? state.clearT / 0.24 : 1);
            }
        }

        if (state.mode === 'playing' && !state.clearing) {
            // ghost
            let gy = state.py;
            while (!collides(state.px, gy + 1, state.rot)) gy++;
            const cs = cells();
            for (let i = 0; i < 4; i++) {
                const x = state.px + cs[i][0], y = gy + cs[i][1];
                if (y < 0) continue;
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 2;
                ctx.strokeRect(OX + x * CELL + 3, OY + y * CELL + 3, CELL - 6, CELL - 6);
            }
            for (let i = 0; i < 4; i++) {
                const x = state.px + cs[i][0], y = state.py + cs[i][1];
                if (y < 0) continue;
                block(OX + x * CELL, OY + y * CELL, SHAPES[state.piece].c, 1);
            }
        }

        panel();
        if (state.flash > 0.02) {
            ctx.fillStyle = `rgba(255,176,32,${(state.flash * 0.16).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
        }
        if (state.mode !== 'playing') overlay();
        scaler.sample(dt * 1000, performance.now());
    }

    function block(x, y, color, a) {
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        roundRect(x + 5, y + 5, CELL - 10, (CELL - 10) * 0.38, 3);
        ctx.globalAlpha = 1;
    }

    function miniPiece(name, cx, cy) {
        const cs = SHAPES[name].r[0];
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = SHAPES[name].c;
            roundRect(cx + cs[i][0] * 18 - 18, cy + cs[i][1] * 18 - 9, 16, 16, 4);
        }
    }

    function panel() {
        ctx.font = '11px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#918AA3';
        ctx.fillText('HOLD', 22, 34);
        ctx.fillStyle = '#15131C';
        roundRect(16, 44, 108, 78, 10);
        if (state.hold) miniPiece(state.hold, 58, 76);

        ctx.fillStyle = '#918AA3';
        ctx.fillText('SCORE', 22, 168);
        ctx.font = '700 24px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#F4F1EC';
        ctx.fillText(String(state.score), 22, 196);
        ctx.font = '11px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#918AA3';
        ctx.fillText(`BEST ${state.best}`, 22, 216);
        ctx.fillText(`LINES ${state.lines}`, 22, 236);
        ctx.fillText(`LEVEL ${state.level}`, 22, 256);

        const rx = OX + BOARD_W + 26;
        ctx.fillText('NEXT', rx, 34);
        for (let i = 0; i < Math.min(4, queue.length); i++) {
            ctx.fillStyle = '#15131C';
            roundRect(rx - 6, 44 + i * 84, 108, 74, 10);
            miniPiece(queue[i], rx + 36, 74 + i * 84);
        }
        ctx.font = '10px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#5F586F';
        ctx.fillText('← → move', rx - 6, H - 52);
        ctx.fillText('↑ rotate  ↓ soft', rx - 6, H - 36);
        ctx.fillText('SPACE drop  C hold', rx - 6, H - 20);
    }

    function overlay() {
        ctx.fillStyle = 'rgba(11,10,15,0.84)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFB020';
        ctx.font = '700 44px "Archivo", system-ui, sans-serif';
        ctx.fillText(state.mode === 'dead' ? 'TOPPED OUT' : 'BLOCKFALL', W / 2, H / 2 - 18);
        ctx.fillStyle = '#F4F1EC';
        ctx.font = '15px ui-monospace, Menlo, monospace';
        if (state.mode === 'dead') ctx.fillText(`${state.score} points · ${state.lines} lines`, W / 2, H / 2 + 14);
        ctx.fillStyle = '#918AA3';
        ctx.fillText('arrows · space to drop · C to hold', W / 2, H / 2 + 46);
        ctx.fillStyle = '#F4F1EC';
        ctx.fillText('press ENTER', W / 2, H / 2 + 74);
        ctx.textAlign = 'left';
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath(); ctx.fill();
    }

    const persist = () => Bridge.save({ v: 1, best: state.best });

    function boot(hello) {
        canvas = document.getElementById('c');
        ctx = canvas.getContext('2d', { alpha: false });
        document.getElementById('boot')?.remove();
        if (hello?.save?.v === 1) state.best = hello.save.best | 0;

        scaler = new PE.ResolutionScaler(canvas, {
            logicalWidth: W, logicalHeight: H, targetFps: 60,
            initialScale: typeof hello?.settings?.resolutionScale === 'number'
                ? hello.settings.resolutionScale : 1,
        });

        Teardown.on(window, 'keydown', (e) => {
            if (e.code === 'Enter' && state.mode !== 'playing') { reset(); return; }
            if (state.mode !== 'playing' || state.clearing) return;
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA':
                    if (!collides(state.px - 1, state.py, state.rot)) { state.px--; state.lock = 0; } break;
                case 'ArrowRight': case 'KeyD':
                    if (!collides(state.px + 1, state.py, state.rot)) { state.px++; state.lock = 0; } break;
                case 'ArrowDown': case 'KeyS':
                    if (!collides(state.px, state.py + 1, state.rot)) { state.py++; state.score++; state.fall = 0; } break;
                case 'ArrowUp': case 'KeyX': rotate(1); break;
                case 'KeyZ': rotate(-1); break;
                case 'Space': drop(); break;
                case 'KeyC': {
                    if (state.held) break;
                    const prev = state.hold;
                    state.hold = state.piece;
                    state.held = true;
                    spawn(prev || undefined);
                    break;
                }
                default: return;
            }
            e.preventDefault();
        });
        Teardown.on(canvas, 'pointerdown', () => { if (state.mode !== 'playing') reset(); });

        loop = new PE.Loop({
            hz: 60, step, render,
            onStats: (s) => Bridge.stats({ fps: s.fps, frameMs: s.frameMs, scale: scaler.scale() }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'blockfall', onHello: boot,
        onPause: () => loop?.pause(), onResume: () => loop?.resume(),
        onSettings: (s) => {
            if (!scaler) return;
            if (typeof s?.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
