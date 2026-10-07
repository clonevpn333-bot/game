'use strict';

const Input = {
    keys: {},
    _justPressed: {},
    mouse: { x: 0, y: 0, down: false, _jd: false, _ju: false },

    init(canvas) {
        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) this._justPressed[e.code] = true;
            this.keys[e.code] = true;
            if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
                e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.code] = false; });

        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            const sx = CFG.W / r.width;
            const sy = CFG.H / r.height;
            this.mouse.x = (e.clientX - r.left) * sx;
            this.mouse.y = (e.clientY - r.top)  * sy;
        });
        canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse._jd = true; });
        canvas.addEventListener('mouseup',   () => { this.mouse.down = false; this.mouse._ju = true; });
    },

    flush() {
        this._justPressed = {};
        this.mouse._jd = false;
        this.mouse._ju = false;
    },

    down(code)    { return !!this.keys[code]; },
    pressed(code) { return !!this._justPressed[code]; },
    axis(neg, pos) {
        return (this.down(neg) ? -1 : 0) + (this.down(pos) ? 1 : 0);
    },

    // Named shortcuts
    get left()   { return this.axis('ArrowLeft',  'KeyA'); },
    get right()  { return this.axis('ArrowRight', 'KeyD'); },
    get up()     { return this.axis('ArrowUp',    'KeyW'); },
    get down2()  { return this.axis('ArrowDown',  'KeyS'); },
    get sprint() { return this.down('ShiftLeft') || this.down('ShiftRight'); },
    get interact(){ return this.pressed('KeyE'); },
    get phone()  { return this.pressed('KeyF'); },
    get map()    { return this.pressed('KeyM'); },
    get inv()    { return this.pressed('KeyI'); },
    get esc()    { return this.pressed('Escape'); },
};
