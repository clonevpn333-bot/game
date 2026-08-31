'use strict';
/**
 * Fixed-capacity object pool — §1.1 "Pools are sized at load and never grow
 * during play". Growing a pool mid-frame is exactly the allocation spike the
 * target hardware cannot absorb, so exhaustion recycles the oldest live object
 * instead (or drops, if the pool is configured to).
 */
(function (global) {
    const PE = (global.PE = global.PE || {});

    function Pool(capacity, factory, reset, opts) {
        this.capacity = capacity | 0;
        this._reset   = reset || null;
        this._items   = new Array(this.capacity);
        this._live    = new Array(this.capacity);   // dense list of active items
        this.size     = 0;                          // active count
        this._free    = this.capacity;
        this._cursor  = 0;                          // round-robin recycle cursor
        this.recycleOldest = !opts || opts.recycleOldest !== false;
        this.exhausted = 0;                         // diagnostic counter

        for (let i = 0; i < this.capacity; i++) this._items[i] = factory(i);
        // Free list as a stack of indices into _items.
        this._stack = new Int32Array(this.capacity);
        for (let i = 0; i < this.capacity; i++) this._stack[i] = this.capacity - 1 - i;
    }

    Pool.prototype.acquire = function () {
        if (this._free > 0) {
            const idx = this._stack[--this._free];
            const obj = this._items[idx];
            obj.__poolIndex = idx;
            obj.__poolSlot  = this.size;
            this._live[this.size++] = obj;
            if (this._reset) this._reset(obj);
            return obj;
        }
        this.exhausted++;
        if (!this.recycleOldest || this.size === 0) return null;
        // Recycle round-robin so one long-lived entity can't monopolise the pool.
        const victim = this._live[this._cursor % this.size];
        this._cursor++;
        if (this._reset) this._reset(victim);
        return victim;
    };

    /** O(1) release via swap-with-last; iteration order is not stable. */
    Pool.prototype.release = function (obj) {
        const slot = obj.__poolSlot;
        if (slot === undefined || slot < 0 || slot >= this.size || this._live[slot] !== obj) return false;
        const last = this._live[--this.size];
        this._live[slot] = last;
        last.__poolSlot  = slot;
        this._live[this.size] = null;
        obj.__poolSlot = -1;
        this._stack[this._free++] = obj.__poolIndex;
        return true;
    };

    Pool.prototype.at = function (i) { return this._live[i]; };

    Pool.prototype.releaseAll = function () {
        for (let i = 0; i < this.size; i++) {
            const o = this._live[i];
            o.__poolSlot = -1;
            this._stack[this._free++] = o.__poolIndex;
            this._live[i] = null;
        }
        this.size = 0;
    };

    /**
     * Allocation-free sweep. `fn(obj, dt)` returns false to release the object.
     * Iterates backwards so swap-removal never skips an entry.
     */
    Pool.prototype.update = function (fn, dt) {
        for (let i = this.size - 1; i >= 0; i--) {
            const o = this._live[i];
            if (fn(o, dt) === false) this.release(o);
        }
    };

    PE.Pool = Pool;
})(typeof window !== 'undefined' ? window : globalThis);
