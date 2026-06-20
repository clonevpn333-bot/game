'use strict';

/* =====================================================================
   input.js — keyboard + mouse. Edge-triggered helpers via _justPressed.
   ===================================================================== */

const Input = {
    keys: {},
    _justPressed: {},
    mouse: { x: 0, y: 0, down: false, clicked: false },

    init(canvas) {
        const block = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                       'Digit1', 'Digit2', 'Digit3', 'Digit4'];
        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) this._justPressed[e.code] = true;
            this.keys[e.code] = true;
            if (block.includes(e.code)) e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });

        const toLocal = e => {
            const r = canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - r.left) * (CFG.W / r.width);
            this.mouse.y = (e.clientY - r.top)  * (CFG.H / r.height);
        };
        canvas.addEventListener('mousemove', toLocal);
        canvas.addEventListener('mousedown', e => { toLocal(e); this.mouse.down = true; });
        canvas.addEventListener('mouseup',   e => { toLocal(e); this.mouse.down = false; this.mouse.clicked = true; });
    },

    // Call at end of each frame
    flush() {
        this._justPressed = {};
        this.mouse.clicked = false;
    },

    down(code)    { return !!this.keys[code]; },
    pressed(code) { return !!this._justPressed[code]; },
    axis(neg, neg2, pos, pos2) {
        const n = this.down(neg) || this.down(neg2);
        const p = this.down(pos) || this.down(pos2);
        return (n ? -1 : 0) + (p ? 1 : 0);
    },

    // ---- Named game controls -----------------------------------------
    get moveX() { return this.axis('ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'); },
    get moveY() { return this.axis('ArrowUp',   'KeyW', 'ArrowDown',  'KeyS'); },
    get jump()  { return this.pressed('Space'); },
    get dive()  { return this.pressed('ShiftLeft') || this.pressed('ShiftRight'); },
    get grab()       { return this.down('KeyJ') || this.down('KeyL'); },
    get grabPressed(){ return this.pressed('KeyJ') || this.pressed('KeyL'); },
    get confirm(){ return this.pressed('Enter') || this.pressed('Space'); },
    get esc()   { return this.pressed('Escape'); },
    // spectator camera: cycle which bean you're watching
    get specPrev(){ return this.pressed('ArrowLeft') || this.pressed('KeyA') || this.pressed('KeyJ'); },
    get specNext(){ return this.pressed('ArrowRight') || this.pressed('KeyD') || this.pressed('KeyL') || this.pressed('Space'); },

    // Returns emote slot 0..3 just pressed, or -1
    emoteSlot() {
        for (let i = 0; i < 4; i++) if (this.pressed('Digit' + (i + 1))) return i;
        return -1;
    },
};
