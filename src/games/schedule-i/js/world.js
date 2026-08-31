'use strict';

// ── Tile colour palette ───────────────────────────────────────────────────
const TILE_COLORS = {
    [T.GRASS]:    '#4a7c3f',
    [T.ROAD]:     '#3a3a3a',
    [T.SIDEWALK]: '#9e9e8a',
    [T.WALL]:     '#8b7355',
    [T.FLOOR]:    '#c8b89a',
    [T.WATER]:    '#3a7bc8',
    [T.TREE]:     '#2d6b2d',
    [T.FENCE]:    '#7a5c3e',
    [T.DIRT]:     '#a0785a',
    [T.PARKING]:  '#555555',
    [T.SAND]:     '#d4b896',
    [T.COUNTER]:  '#c09a5a',
    [T.BED]:      '#5c8ec2',
    [T.DESK]:     '#9c7a4e',
};

// ── Building definitions ──────────────────────────────────────────────────
//  [tx, ty, tw, th, wallColor, floorColor, name, type, interactTile]
const BUILDING_DEFS = [
    // Motel district
    [17, 2,  8, 6,  '#8B4513','#c8b89a','Ecstasy Motel',      'motel',   [20,5]],
    [26, 2,  5, 4,  '#4a7c9e','#d0e8e0',"Maxi's Convenience", 'store',   [28,5]],
    [34, 3,  4, 3,  '#6a5acd','#e8e0f0','Corner Laundromat',  'laundry', [35,5]],
    // Suburbs
    [51, 6,  5, 4,  '#cd853f','#e8d8b0','Bungalow',            'house',   [53,9]],
    [58, 7,  4, 3,  '#8fbc8f','#d8f0d8','Green House',         'house',   [59,9]],
    [65, 5,  5, 4,  '#daa520','#f5e8c0','Fancy House',         'house',   [67,8]],
    [72, 6,  4, 3,  '#b06040','#e0c8a8','Red House',           'house',   [73,8]],
    // Police / services
    [35,33,  7, 5,  '#2a4a8a','#d0d8f0','Police Station',      'police',  [38,37]],
    [44,34,  5, 4,  '#c8a020','#f8f0d0','City Hall',           'city',    [46,37]],
    // Downtown
    [52,50,  6, 5,  '#9a1a1a','#f0d0d0','Red Light Bar',       'bar',     [54,54]],
    [60,48,  7, 6,  '#1a1a5a','#d0d0f8','Lucky 7 Casino',      'casino',  [63,53]],
    [68,50,  5, 4,  '#3a8a3a','#d0f0d0','Pawn Shop',           'pawn',    [70,53]],
    [76,51,  4, 3,  '#5a3a8a','#e0d0f0','Club Neon',           'club',    [77,53]],
    // Industrial
    [10,52, 10, 7,  '#4a4a4a','#808080','Big Warehouse',       'warehouse',[14,58]],
    [22,53,  6, 5,  '#5a4a3a','#a09080','Chemical Supply Co.', 'supplier', [24,57]],
    [30,55,  5, 4,  '#3a3a4a','#909090','Chop Shop',           'chop',    [32,58]],
    // Port
    [68,68,  8, 5,  '#3a5a4a','#90b090','Port Authority',      'port',    [71,72]],
    [78,65,  5, 4,  '#4a4a3a','#90908a','Storage Unit',        'storage', [80,68]],
];

// Interactable objects in the world  [tx, ty, type, data]
const INTERACT_OBJECTS = [
    // Park bench / deal zones
    { tx:20, ty:18, type:'park',    label:'City Park',    action:'deal_zone' },
    { tx:45, ty:20, type:'park',    label:'Suburb Park',  action:'deal_zone' },
    { tx:58, ty:60, type:'park',    label:'Downtown Plaza',action:'deal_zone'},
    // ATM
    { tx:27, ty:6,  type:'atm',     label:'ATM',          action:'atm'      },
    { tx:54, ty:49, type:'atm',     label:'ATM',          action:'atm'      },
    // Dumpsters (hide from police)
    { tx:15, ty:7,  type:'dumpster',label:'Dumpster',     action:'hide'     },
    { tx:40, ty:52, type:'dumpster',label:'Dumpster',     action:'hide'     },
    { tx:70, ty:62, type:'dumpster',label:'Dumpster',     action:'hide'     },
];

// ── World class ────────────────────────────────────────────────────────────
const World = {
    map: null,          // Uint8Array [WW * WH]
    mapW: CFG.WW,
    mapH: CFG.WH,
    buildingMap: null,  // which building index occupies each tile (-1 = none)
    buildings: [],

    init() {
        this.map        = new Uint8Array(this.mapW * this.mapH);
        this.buildingMap = new Int16Array(this.mapW * this.mapH).fill(-1);
        this.buildings   = [];
        this._generate();
    },

    _set(tx, ty, tile) {
        if (tx >= 0 && tx < this.mapW && ty >= 0 && ty < this.mapH)
            this.map[ty * this.mapW + tx] = tile;
    },

    _get(tx, ty) {
        if (tx < 0 || tx >= this.mapW || ty < 0 || ty >= this.mapH) return T.WALL;
        return this.map[ty * this.mapW + tx];
    },

    _fillRect(tx, ty, tw, th, tile) {
        for (let y = ty; y < ty+th; y++)
            for (let x = tx; x < tx+tw; x++)
                this._set(x, y, tile);
    },

    _setBuilding(tx, ty, tw, th, idx) {
        for (let y = ty; y < ty+th; y++)
            for (let x = tx; x < tx+tw; x++) {
                if (x >= 0 && x < this.mapW && y >= 0 && y < this.mapH)
                    this.buildingMap[y * this.mapW + x] = idx;
            }
    },

    _generate() {
        // 1. Base grass
        this.map.fill(T.GRASS);

        // 2. Trees scattered
        for (let i = 0; i < 300; i++) {
            const tx = U.rng(0, this.mapW-1);
            const ty = U.rng(0, this.mapH-1);
            this._set(tx, ty, T.TREE);
        }

        // 3. Main roads grid (every 16 tiles)
        for (let y = 0; y < this.mapH; y++) {
            for (let x = 0; x < this.mapW; x++) {
                const onMainX = (x === 16 || x === 32 || x === 48 || x === 64 || x === 80);
                const onMainY = (y === 16 || y === 32 || y === 48 || y === 64 || y === 80);
                if (onMainX || onMainY) {
                    // Two-lane road (width 2)
                    const RX = onMainX ? [x,x+1] : [x];
                    const RY = onMainY ? [y,y+1] : [y];
                    for (const rx of RX) for (const ry of RY) this._set(rx, ry, T.ROAD);
                }
                // Sidewalks on both sides of roads
                const nearRoadX = (x===15||x===18||x===31||x===34||x===47||x===50||x===63||x===66||x===79||x===82);
                const nearRoadY = (y===15||y===18||y===31||y===34||y===47||y===50||y===63||y===66||y===79||y===82);
                if (nearRoadX || nearRoadY) this._set(x, y, T.SIDEWALK);
            }
        }

        // 4. Water (port district)
        this._fillRect(72, 70, 24, 26, T.WATER);

        // 5. Parking lots
        this._fillRect(26, 8,  6, 3, T.PARKING);
        this._fillRect(62, 44, 8, 3, T.PARKING);
        this._fillRect(10, 48, 8, 3, T.PARKING);

        // 6. Park / open areas (overwrite trees)
        this._fillRect(17, 14, 12, 10, T.GRASS);
        this._fillRect(42, 14, 10,  8, T.GRASS);
        this._fillRect(55, 57, 10,  8, T.GRASS);

        // 7. Buildings
        for (const [bx,by,bw,bh,wc,fc,name,type,itile] of BUILDING_DEFS) {
            const idx = this.buildings.length;
            // Outer wall
            this._fillRect(bx, by, bw, bh, T.WALL);
            // Interior floor
            this._fillRect(bx+1, by+1, bw-2, bh-2, T.FLOOR);
            this._setBuilding(bx, by, bw, bh, idx);
            this.buildings.push({
                tx:bx, ty:by, tw:bw, th:bh,
                wallColor:wc, floorColor:fc,
                name, type,
                door: itile,   // where to stand to enter/exit
                idx,
            });
        }

        // 8. Industrial dirt
        this._fillRect(8, 49, 28, 15, T.DIRT);
        // Restore roads over dirt
        for (let x=0; x<this.mapW; x++) {
            for (let y=0; y<this.mapH; y++) {
                const t = this._get(x,y);
                if (t===T.ROAD) { /* keep road */ }
            }
        }
    },

    isSolid(tx, ty) {
        const t = this._get(tx, ty);
        return t === T.WALL || t === T.WATER || t === T.TREE || t === T.FENCE;
    },

    // Pixel-level collision for entity movement
    canMoveTo(px, py, hw, hh) {
        // Check 4 corners of the hitbox
        const corners = [
            [px - hw, py - hh], [px + hw - 1, py - hh],
            [px - hw, py + hh - 1], [px + hw - 1, py + hh - 1],
        ];
        for (const [cx, cy] of corners) {
            const tx = Math.floor(cx / CFG.TS);
            const ty = Math.floor(cy / CFG.TS);
            if (this.isSolid(tx, ty)) return false;
        }
        return true;
    },

    buildingAt(tx, ty) {
        if (tx < 0 || tx >= this.mapW || ty < 0 || ty >= this.mapH) return null;
        const idx = this.buildingMap[ty * this.mapW + tx];
        return idx >= 0 ? this.buildings[idx] : null;
    },

    // ── Rendering ──────────────────────────────────────────────────────────
    draw(ctx, camX, camY) {
        const TS = CFG.TS;
        const startTX = Math.max(0, Math.floor(camX / TS));
        const startTY = Math.max(0, Math.floor(camY / TS));
        const endTX   = Math.min(this.mapW, startTX + Math.ceil(CFG.W / TS) + 2);
        const endTY   = Math.min(this.mapH, startTY + Math.ceil(CFG.H / TS) + 2);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const tile  = this._get(tx, ty);
                const bIdx  = this.buildingMap[ty * this.mapW + tx];
                const sx    = tx * TS - camX;
                const sy    = ty * TS - camY;

                // Use building-specific colours for wall/floor tiles
                if (bIdx >= 0) {
                    const b = this.buildings[bIdx];
                    ctx.fillStyle = (tile === T.WALL) ? b.wallColor : b.floorColor;
                } else {
                    ctx.fillStyle = TILE_COLORS[tile] || '#ff00ff';
                }
                ctx.fillRect(sx, sy, TS, TS);

                // Tile details
                if (tile === T.ROAD) this._drawRoadDetail(ctx, sx, sy, tx, ty, TS);
                if (tile === T.TREE) this._drawTree(ctx, sx, sy, TS);
                if (tile === T.WATER) this._drawWater(ctx, sx, sy, TS);
                if (tile === T.GRASS) this._drawGrass(ctx, sx, sy, tx, ty, TS);
            }
        }

        // Draw building names
        this._drawBuildingLabels(ctx, camX, camY, TS);

        // Draw interactive object icons
        for (const obj of INTERACT_OBJECTS) {
            const sx = obj.tx * TS - camX + TS/2;
            const sy = obj.ty * TS - camY + TS/2;
            if (sx < -32 || sx > CFG.W+32 || sy < -32 || sy > CFG.H+32) continue;
            if (obj.type === 'park') {
                ctx.fillStyle = 'rgba(80,200,80,0.25)';
                ctx.fillRect(sx - TS, sy - TS, TS*3, TS*3);
            } else if (obj.type === 'atm') {
                ctx.fillStyle = '#2a6fd4';
                ctx.fillRect(sx-8, sy-14, 16, 20);
                ctx.fillStyle = '#fff';
                ctx.font = '8px monospace';
                ctx.fillText('ATM', sx-7, sy-2);
            }
        }
    },

    _drawRoadDetail(ctx, sx, sy, tx, ty, TS) {
        // Center dashes
        const isVert = (tx===16||tx===17||tx===32||tx===33||tx===48||tx===49||tx===64||tx===65||tx===80||tx===81);
        ctx.fillStyle = '#f0c800';
        if (isVert) {
            if (ty % 4 === 0) ctx.fillRect(sx + TS/2 - 1, sy + 4, 2, TS - 8);
        } else {
            if (tx % 4 === 0) ctx.fillRect(sx + 4, sy + TS/2 - 1, TS - 8, 2);
        }
    },

    _drawTree(ctx, sx, sy, TS) {
        ctx.fillStyle = '#1a4a1a';
        ctx.beginPath();
        ctx.arc(sx + TS/2, sy + TS/2, TS/2 - 2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#2d7a2d';
        ctx.beginPath();
        ctx.arc(sx + TS/2 - 2, sy + TS/2 - 2, TS/2 - 5, 0, Math.PI*2);
        ctx.fill();
    },

    _drawWater(ctx, sx, sy, TS) {
        const t = (Date.now() / 1500);
        ctx.fillStyle = `hsl(${210 + Math.sin(t + sx*0.01)*8}, 65%, ${35 + Math.sin(t*1.3+sy*0.01)*5}%)`;
        ctx.fillRect(sx, sy, TS, TS);
        // Wave lines
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const wy = sy + 6 + i * 9 + Math.sin(t + sx * 0.05 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(sx, wy);
            ctx.lineTo(sx + TS, wy);
            ctx.stroke();
        }
    },

    _drawGrass(ctx, sx, sy, tx, ty, TS) {
        // Subtle variation
        const h = ((tx * 73 + ty * 137) % 20);
        if (h < 5) {
            ctx.fillStyle = '#3d6e34';
            ctx.fillRect(sx + 4, sy + 4, 3, 3);
        } else if (h < 8) {
            ctx.fillStyle = '#5a9050';
            ctx.fillRect(sx + 16, sy + 10, 2, 2);
        }
    },

    _drawBuildingLabels(ctx, camX, camY, TS) {
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        for (const b of this.buildings) {
            const cx = (b.tx + b.tw/2) * TS - camX;
            const cy = (b.ty + 1) * TS - camY + TS/2;
            if (cx < -60 || cx > CFG.W+60 || cy < -20 || cy > CFG.H+20) continue;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            const tw = ctx.measureText(b.name).width;
            ctx.fillRect(cx - tw/2 - 3, cy - 11, tw+6, 14);
            ctx.fillStyle = '#ffe080';
            ctx.fillText(b.name, cx, cy);
        }
        ctx.textAlign = 'left';
    },
};
