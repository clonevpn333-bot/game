<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 05 — GEOMETRY CONSTRUCTION
   A streaming mesh builder plus the primitive vocabulary the city, the
   vehicles, the weapons and the human bodies are all assembled from.

   Static vertex, 40B:  pos f32x3 | nrm f32x3 | uv f32x2 | col u8x4 | mat u8x4
   Skinned vertex, 48B: ...static... | boneIdx u8x4 | boneWgt u8x4
   mat = [texLayer/255, rough*0.5, metal*0.5, shadingModel*64/255]
   ========================================================================== */
const VSTRIDE = 40, SSTRIDE = 48;
const LAYOUT_STATIC = [
  { loc: 0, size: 3, type: 0x1406, offset: 0 },              // FLOAT
  { loc: 1, size: 3, type: 0x1406, offset: 12 },
  { loc: 2, size: 2, type: 0x1406, offset: 24 },
  { loc: 3, size: 4, type: 0x1401, norm: 1, offset: 32 },    // UNSIGNED_BYTE
  { loc: 4, size: 4, type: 0x1401, norm: 1, offset: 36 },
];
const LAYOUT_SKIN = LAYOUT_STATIC.concat([
  { loc: 5, size: 4, type: 0x1401, norm: 0, offset: 40 },
  { loc: 6, size: 4, type: 0x1401, norm: 1, offset: 44 },
]);

class MeshBuilder {
  constructor(skinned) {
    this.skinned = !!skinned;
    this.stride = skinned ? SSTRIDE : VSTRIDE;
    this.cap = 4096;
    this.buf = new ArrayBuffer(this.cap * this.stride);
    this.f32 = new Float32Array(this.buf);
    this.u8 = new Uint8Array(this.buf);
    this.nv = 0;
    this.idx = [];
    /* current material state */
    this.mLayer = 0; this.mRough = 1; this.mMetal = 1; this.mModel = 0;
    this.cR = 255; this.cG = 255; this.cB = 255; this.cE = 0;
    this.bi = [0,0,0,0]; this.bw = [255,0,0,0]; this._raw = [0,0,0,0];
    this.uvScale = 1; this.uvScaleV = 1; this.uvOffU = 0; this.uvOffV = 0;
    this.bmin = [1e9,1e9,1e9]; this.bmax = [-1e9,-1e9,-1e9];
  }
  _grow(need) {
    if (this.nv + need <= this.cap) return;
    while (this.cap < this.nv + need) this.cap *= 2;
    const nb = new ArrayBuffer(this.cap * this.stride);
    new Uint8Array(nb).set(this.u8.subarray(0, this.nv * this.stride));
    this.buf = nb; this.f32 = new Float32Array(nb); this.u8 = new Uint8Array(nb);
  }
  mat(layer, rough, metal, model) {
    this.mLayer = layer | 0;
    this.mRough = rough === undefined ? 1 : rough;
    this.mMetal = metal === undefined ? 1 : metal;
    this.mModel = model || 0;
    return this;
  }
  col(r, g, b, e) {
    this.cR = sat(r)*255|0; this.cG = sat(g)*255|0; this.cB = sat(b)*255|0;
    this.cE = sat(e || 0)*255|0; return this;
  }
  colv(c, e) { return this.col(c[0], c[1], c[2], e); }
  bones(i0,w0,i1,w1,i2,w2,i3,w3) {
    this.bi[0]=i0|0; this.bi[1]=i1|0; this.bi[2]=i2|0; this.bi[3]=i3|0;
    const t = (w0||0)+(w1||0)+(w2||0)+(w3||0) || 1;
    this.bw[0]=sat((w0||0)/t)*255|0; this.bw[1]=sat((w1||0)/t)*255|0;
    this.bw[2]=sat((w2||0)/t)*255|0; this.bw[3]=sat((w3||0)/t)*255|0;
    return this;
  }
  bone1(i) { return this.bones(i,1,0,0,0,0,0,0); }
  uv(scale, ou, ov, scaleV) {
    this.uvScale = scale; this.uvScaleV = scaleV === undefined ? scale : scaleV;
    this.uvOffU = ou||0; this.uvOffV = ov||0; return this;
  }
  /* raw 0..1 material bytes — used by the forward neon/holo pass, which
     reinterprets the four channels as kind / flicker / scroll / intensity */
  matRaw(a, b, c, d) {
    this.mLayer = -1;
    this._raw = [sat(a)*255|0, sat(b)*255|0, sat(c)*255|0, sat(d)*255|0];
    return this;
  }
  vert(x, y, z, nx, ny, nz, u, v) {
    this._grow(1);
    const o = this.nv * this.stride, f = o >> 2;
    this.f32[f]=x; this.f32[f+1]=y; this.f32[f+2]=z;
    this.f32[f+3]=nx; this.f32[f+4]=ny; this.f32[f+5]=nz;
    this.f32[f+6]=u*this.uvScale+this.uvOffU; this.f32[f+7]=v*this.uvScaleV+this.uvOffV;
    this.u8[o+32]=this.cR; this.u8[o+33]=this.cG; this.u8[o+34]=this.cB; this.u8[o+35]=this.cE;
    if (this.mLayer < 0) {
      this.u8[o+36]=this._raw[0]; this.u8[o+37]=this._raw[1];
      this.u8[o+38]=this._raw[2]; this.u8[o+39]=this._raw[3];
    } else {
      this.u8[o+36]=this.mLayer; this.u8[o+37]=sat(this.mRough*.5)*255|0;
      this.u8[o+38]=sat(this.mMetal*.5)*255|0; this.u8[o+39]=(this.mModel*64)|0;
    }
    if (this.skinned) {
      this.u8[o+40]=this.bi[0]; this.u8[o+41]=this.bi[1]; this.u8[o+42]=this.bi[2]; this.u8[o+43]=this.bi[3];
      this.u8[o+44]=this.bw[0]; this.u8[o+45]=this.bw[1]; this.u8[o+46]=this.bw[2]; this.u8[o+47]=this.bw[3];
    }
    if (x < this.bmin[0]) this.bmin[0]=x; if (x > this.bmax[0]) this.bmax[0]=x;
    if (y < this.bmin[1]) this.bmin[1]=y; if (y > this.bmax[1]) this.bmax[1]=y;
    if (z < this.bmin[2]) this.bmin[2]=z; if (z > this.bmax[2]) this.bmax[2]=z;
    return this.nv++;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quadI(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  /* CCW quad from four corners, flat-shaded with a computed normal */
  quad(p0, p1, p2, p3, uvw, uvh) {
    const ux = p1[0]-p0[0], uy = p1[1]-p0[1], uz = p1[2]-p0[2];
    const vx = p3[0]-p0[0], vy = p3[1]-p0[1], vz = p3[2]-p0[2];
    let nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
    const l = hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
    const w = uvw === undefined ? hypot(ux,uy,uz) : uvw;
    const h = uvh === undefined ? hypot(vx,vy,vz) : uvh;
    const a = this.vert(p0[0],p0[1],p0[2], nx,ny,nz, 0,0);
    const b = this.vert(p1[0],p1[1],p1[2], nx,ny,nz, w,0);
    const c = this.vert(p2[0],p2[1],p2[2], nx,ny,nz, w,h);
    const d = this.vert(p3[0],p3[1],p3[2], nx,ny,nz, 0,h);
    this.quadI(a,b,c,d);
  }
  /* axis-aligned box; `faces` bitmask +X -X +Y -Y +Z -Z = 1,2,4,8,16,32 */
  box(x0, y0, z0, x1, y1, z1, faces, uvs) {
    faces = faces === undefined ? 63 : faces;
    const s = uvs === undefined ? 1 : uvs;
    const W = x1-x0, H = y1-y0, D = z1-z0;
    if (faces & 16) this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1], W*s, H*s); // +Z
    if (faces & 32) this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0], W*s, H*s); // -Z
    if (faces & 1)  this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1], D*s, H*s); // +X
    if (faces & 2)  this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0], D*s, H*s); // -X
    if (faces & 4)  this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0], W*s, D*s); // +Y
    if (faces & 8)  this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1], W*s, D*s); // -Y
    return this;
  }
  /* box transformed by yaw about its own centre — angled buildings, props */
  boxYaw(cx, cy, cz, hw, hh, hd, yaw, faces, uvs) {
    const c = cos(yaw), s = sin(yaw);
    const P = (x,z,y) => [cx + x*c - z*s, cy + y, cz + x*s + z*c];
    const f = faces === undefined ? 63 : faces, u = uvs === undefined ? 1 : uvs;
    const A=P(-hw,-hd,-hh), B=P(hw,-hd,-hh), C=P(hw,hd,-hh), D=P(-hw,hd,-hh);
    const E=P(-hw,-hd,hh), F=P(hw,-hd,hh), G=P(hw,hd,hh), H=P(-hw,hd,hh);
    if (f&32) this.quad(B,A,E,F, hw*2*u, hh*2*u);
    if (f&16) this.quad(D,C,G,H, hw*2*u, hh*2*u);
    if (f&1)  this.quad(C,B,F,G, hd*2*u, hh*2*u);
    if (f&2)  this.quad(A,D,H,E, hd*2*u, hh*2*u);
    if (f&4)  this.quad(E,F,G,H, hw*2*u, hd*2*u);
    if (f&8)  this.quad(D,A,B,C, hw*2*u, hd*2*u);
    return this;
  }
  cylinder(cx, cy, cz, r0, r1, h, seg, caps, uvs) {
    seg = seg || 12; const s = uvs === undefined ? 1 : uvs;
    const base = this.nv;
    for (let i = 0; i <= seg; i++) {
      const a = i/seg*TAU, ca = cos(a), sa = sin(a);
      const slope = (r0-r1)/h;
      let nx = ca, ny = slope, nz = sa;
      const l = hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
      this.vert(cx+ca*r0, cy, cz+sa*r0, nx,ny,nz, i/seg*TAU*max(r0,r1)*s, 0);
      this.vert(cx+ca*r1, cy+h, cz+sa*r1, nx,ny,nz, i/seg*TAU*max(r0,r1)*s, h*s);
    }
    for (let i = 0; i < seg; i++) {
      const a = base+i*2;
      this.idx.push(a, a+2, a+3, a, a+3, a+1);
    }
    if (caps) {
      if (r1 > 0) { const c = this.vert(cx, cy+h, cz, 0,1,0, 0,0);
        for (let i = 0; i < seg; i++) { const a = i/seg*TAU, b = (i+1)/seg*TAU;
          const p = this.vert(cx+cos(a)*r1, cy+h, cz+sin(a)*r1, 0,1,0, cos(a)*r1*s, sin(a)*r1*s);
          const q = this.vert(cx+cos(b)*r1, cy+h, cz+sin(b)*r1, 0,1,0, cos(b)*r1*s, sin(b)*r1*s);
          this.idx.push(c, p, q); } }
      if (r0 > 0) { const c = this.vert(cx, cy, cz, 0,-1,0, 0,0);
        for (let i = 0; i < seg; i++) { const a = i/seg*TAU, b = (i+1)/seg*TAU;
          const p = this.vert(cx+cos(a)*r0, cy, cz+sin(a)*r0, 0,-1,0, cos(a)*r0*s, sin(a)*r0*s);
          const q = this.vert(cx+cos(b)*r0, cy, cz+sin(b)*r0, 0,-1,0, cos(b)*r0*s, sin(b)*r0*s);
          this.idx.push(c, q, p); } }
    }
    return this;
  }
  sphere(cx, cy, cz, r, seg, rings, sy) {
    seg = seg||16; rings = rings||10; sy = sy===undefined?1:sy;
    const base = this.nv;
    for (let j = 0; j <= rings; j++) {
      const v = j/rings, th = v*PI, st = sin(th), ct = cos(th);
      for (let i = 0; i <= seg; i++) {
        const u = i/seg, ph = u*TAU;
        const nx = st*cos(ph), ny = ct, nz = st*sin(ph);
        this.vert(cx+nx*r, cy+ny*r*sy, cz+nz*r, nx, ny/sy, nz, u*r*3, v*r*3);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base + j*(seg+1)+i, b = a+seg+1;
      this.idx.push(a, b, a+1, a+1, b, b+1);
    }
    return this;
  }
  /* extrude a closed CCW polygon [x,z,...] from y0 to y1 with walls + cap */
  prism(poly, y0, y1, cap, uvs) {
    const s = uvs === undefined ? 1 : uvs;
    const n = poly.length/2;
    let run = 0;
    for (let i = 0; i < n; i++) {
      const j = (i+1)%n;
      const x0=poly[i*2], z0=poly[i*2+1], x1=poly[j*2], z1=poly[j*2+1];
      const len = hypot(x1-x0, z1-z0);
      this.quad([x0,y0,z0],[x1,y0,z1],[x1,y1,z1],[x0,y1,z0], len*s, (y1-y0)*s);
      run += len;
    }
    if (cap) {
      /* fan triangulation is valid for the convex plots the city generator makes */
      let cxs = 0, czs = 0;
      for (let i = 0; i < n; i++) { cxs += poly[i*2]; czs += poly[i*2+1]; }
      cxs /= n; czs /= n;
      const c = this.vert(cxs, y1, czs, 0,1,0, cxs*s, czs*s);
      for (let i = 0; i < n; i++) {
        const j = (i+1)%n;
        const a = this.vert(poly[i*2], y1, poly[i*2+1], 0,1,0, poly[i*2]*s, poly[i*2+1]*s);
        const b = this.vert(poly[j*2], y1, poly[j*2+1], 0,1,0, poly[j*2]*s, poly[j*2+1]*s);
        this.idx.push(c, a, b);
      }
    }
    return this;
  }
  /* lathe a 2D silhouette [r,y,...] around +Y — limbs, torsos, bottles, tyres */
  lathe(pts, seg, cx, cy, cz, sx, sz, twist) {
    seg = seg||12; sx = sx===undefined?1:sx; sz = sz===undefined?1:sz;
    const base = this.nv, n = pts.length/2;
    for (let j = 0; j < n; j++) {
      const r = pts[j*2], y = pts[j*2+1];
      /* silhouette-tangent normal so lit limbs read as rounded, not faceted */
      const pj = max(0, j-1), nj = min(n-1, j+1);
      const dr = pts[nj*2]-pts[pj*2], dy = pts[nj*2+1]-pts[pj*2+1];
      const nl = hypot(dr,dy)||1;
      const nr = dy/nl, nyv = -dr/nl;
      for (let i = 0; i <= seg; i++) {
        const a = i/seg*TAU + (twist||0)*(y);
        const ca = cos(a), sa = sin(a);
        let nx = ca*nr*sz, ny = nyv, nz = sa*nr*sx;
        const l = hypot(nx,ny,nz)||1;
        this.vert(cx+ca*r*sx, cy+y, cz+sa*r*sz, nx/l, ny/l, nz/l, i/seg*2.2, y*1.4);
      }
    }
    for (let j = 0; j < n-1; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      this.idx.push(a, b, a+1, a+1, b, b+1);
    }
    return this;
  }
  /* ---- transform everything added since a marker (for prefab assembly) --- */
  mark() { return this.nv; }
  transform(from, m) {
    const p = V3.n(), o = V3.n();
    for (let i = from; i < this.nv; i++) {
      const f = (i*this.stride)>>2;
      V3.set(p, this.f32[f], this.f32[f+1], this.f32[f+2]);
      V3.xfm(o, p, m); this.f32[f]=o[0]; this.f32[f+1]=o[1]; this.f32[f+2]=o[2];
      V3.set(p, this.f32[f+3], this.f32[f+4], this.f32[f+5]);
      V3.xfmD(o, p, m); V3.nrm(o, o);
      this.f32[f+3]=o[0]; this.f32[f+4]=o[1]; this.f32[f+5]=o[2];
    }
    return this;
  }
  translate(from, dx, dy, dz) {
    for (let i = from; i < this.nv; i++) { const f = (i*this.stride)>>2;
      this.f32[f]+=dx; this.f32[f+1]+=dy; this.f32[f+2]+=dz; }
    return this;
  }
  /* append another builder's contents, optionally transformed */
  append(other, m) {
    const base = this.nv, n = other.nv;
    this._grow(n);
    this.u8.set(other.u8.subarray(0, n*other.stride), this.nv*this.stride);
    const from = this.nv; this.nv += n;
    for (let i = 0; i < other.idx.length; i++) this.idx.push(other.idx[i] + base);
    if (m) this.transform(from, m);
    for (let i = 0; i < 3; i++) {
      this.bmin[i] = min(this.bmin[i], other.bmin[i]);
      this.bmax[i] = max(this.bmax[i], other.bmax[i]);
    }
    return this;
  }
  get empty() { return this.nv === 0; }
  /* smooth normals by area-weighted averaging within a position/epsilon grid */
  smoothNormals(eps) {
    eps = eps || 0.001;
    const map = new Map(), inv = 1/eps;
    const acc = new Float32Array(this.nv*3);
    for (let t = 0; t < this.idx.length; t += 3) {
      const ia=this.idx[t], ib=this.idx[t+1], ic=this.idx[t+2];
      const fa=(ia*this.stride)>>2, fb=(ib*this.stride)>>2, fc=(ic*this.stride)>>2;
      const ax=this.f32[fa],ay=this.f32[fa+1],az=this.f32[fa+2];
      const bx=this.f32[fb],by=this.f32[fb+1],bz=this.f32[fb+2];
      const cx=this.f32[fc],cy=this.f32[fc+1],cz=this.f32[fc+2];
      const ux=bx-ax,uy=by-ay,uz=bz-az, vx=cx-ax,vy=cy-ay,vz=cz-az;
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      acc[ia*3]+=nx; acc[ia*3+1]+=ny; acc[ia*3+2]+=nz;
      acc[ib*3]+=nx; acc[ib*3+1]+=ny; acc[ib*3+2]+=nz;
      acc[ic*3]+=nx; acc[ic*3+1]+=ny; acc[ic*3+2]+=nz;
    }
    for (let i = 0; i < this.nv; i++) {
      const f = (i*this.stride)>>2;
      const k = (round(this.f32[f]*inv)) + "," + (round(this.f32[f+1]*inv)) + "," + (round(this.f32[f+2]*inv));
      let e = map.get(k);
      if (!e) { e = [0,0,0,[]]; map.set(k, e); }
      e[0]+=acc[i*3]; e[1]+=acc[i*3+1]; e[2]+=acc[i*3+2]; e[3].push(i);
    }
    for (const e of map.values()) {
      const l = hypot(e[0],e[1],e[2])||1;
      for (const i of e[3]) { const f=(i*this.stride)>>2;
        this.f32[f+3]=e[0]/l; this.f32[f+4]=e[1]/l; this.f32[f+5]=e[2]/l; }
    }
    return this;
  }
  build(dyn) {
    if (!this.nv) return null;
    const verts = new Uint8Array(this.buf, 0, this.nv*this.stride);
    const idx = this.nv > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx);
    const m = GX.mesh(verts, idx, this.skinned ? LAYOUT_SKIN : LAYOUT_STATIC, this.stride, dyn);
    m.bmin = this.bmin.slice(); m.bmax = this.bmax.slice();
    m.radius = hypot(this.bmax[0]-this.bmin[0], this.bmax[1]-this.bmin[1], this.bmax[2]-this.bmin[2])*.5;
    m.cx = (this.bmin[0]+this.bmax[0])*.5; m.cy = (this.bmin[1]+this.bmax[1])*.5;
    m.cz = (this.bmin[2]+this.bmax[2])*.5;
    m.verts = this.nv; m.tris = this.idx.length/3;
    return m;
  }
  reset() { this.nv = 0; this.idx.length = 0;
    this.bmin=[1e9,1e9,1e9]; this.bmax=[-1e9,-1e9,-1e9]; return this; }
}

/* ---------------------------------------------------------------------------
   Greebling: the detail pass that makes a 200 m Neo-Militarist slab read as a
   building instead of a cuboid. Applied to any facade rectangle.
   ------------------------------------------------------------------------- */
const GREEBLE = {
  /* horizontal floor banding with recessed spandrels */
  bands(B, x0, y0, z, x1, y1, dir, floorH, depth, layer) {
    const n = max(1, ((y1-y0)/floorH)|0);
    B.mat(layer, 1, 1, 0);
    for (let i = 0; i < n; i++) {
      const yy = y0 + i*floorH;
      if (dir === 0) B.box(x0, yy+floorH*.72, z, x1, yy+floorH*.86, z+depth);
      else B.box(z, yy+floorH*.72, x0, z+depth, yy+floorH*.86, x1);
    }
  },
  /* vertical pilasters / mullion fins */
  fins(B, x0, x1, y0, y1, z, dir, count, w, depth, layer) {
    B.mat(layer, 1, 1, 0);
    for (let i = 0; i <= count; i++) {
      const t = i/count, x = lerp(x0, x1, t);
      if (dir === 0) B.box(x-w, y0, z, x+w, y1, z+depth);
      else B.box(z, y0, x-w, z+depth, y1, x+w);
    }
  },
  /* rooftop clutter: HVAC, water tanks, aerials, sat dishes, vents */
  roof(B, cx, cz, hw, hd, y, r, layers) {
    const count = 3 + (r()*7|0);
    for (let i = 0; i < count; i++) {
      const x = cx + (r()-.5)*hw*1.7, z = cz + (r()-.5)*hd*1.7;
      const t = r();
      if (t < .32) {                       // HVAC box
        const w = 1 + r()*3, d = 1 + r()*3, h = .8 + r()*2.2;
        B.mat(layers.metal, .95, 1, 0).col(.55,.56,.58,0);
        B.box(x-w, y, z-d, x+w, y+h, z+d);
        B.mat(layers.perf, 1, 1, 0);
        B.box(x-w*.7, y+h, z-d*.7, x+w*.7, y+h+.25, z+d*.7);
      } else if (t < .52) {                // water / coolant tank
        const rr = .8 + r()*1.6, h = 2 + r()*3.5;
        B.mat(layers.metal, 1, 1, 0).col(.42,.44,.46,0);
        B.cylinder(x, y+.5, z, rr, rr, h, 12, true, .5);
        B.mat(layers.rust, 1, 1, 0);
        B.box(x-rr*.2, y, z-rr*.2, x+rr*.2, y+.5, z+rr*.2);
      } else if (t < .68) {                // antenna mast + guy wires
        const h = 4 + r()*16;
        B.mat(layers.metal, 1, 1, 0).col(.4,.41,.43,0);
        B.cylinder(x, y, z, .18, .06, h, 6, false, 1);
        for (let k = 0; k < 3; k++) {
          const a = k/3*TAU;
          B.box(x-.05, y+h*.55, z-.05, x+.05, y+h*.62, z+.05);
        }
        B.mat(layers.sign, 1, 1, 0).col(1,.1,.15,1);
        B.box(x-.14, y+h, z-.14, x+.14, y+h+.28, z+.14);
      } else if (t < .82) {                // satellite dish
        const rr = 1 + r()*1.8;
        B.mat(layers.metal, .8, 1, 0).col(.62,.62,.63,0);
        B.cylinder(x, y+.4, z, rr, rr*.75, .35, 14, true, .5);
        B.box(x-.1, y, z-.1, x+.1, y+.5, z+.1);
      } else if (t < .93) {                // stair / lift head-house
        const w = 1.6+r()*2, d = 1.6+r()*2, h = 2.4+r()*2;
        B.mat(layers.wall, 1, 1, 0).col(.42,.42,.43,0);
        B.box(x-w, y, z-d, x+w, y+h, z+d);
      } else {                             // vent stack cluster
        for (let k = 0; k < 3; k++) {
          B.mat(layers.metal, 1, 1, 0).col(.5,.5,.52,0);
          B.cylinder(x+k*.7-.7, y, z, .22, .22, 1+r()*1.6, 8, true, 1);
        }
      }
    }
    /* parapet */
    B.mat(layers.wall, 1, 1, 0).col(.4,.4,.41,0);
    B.box(cx-hw, y, cz-hd, cx+hw, y+.55, cz-hd+.35);
    B.box(cx-hw, y, cz+hd-.35, cx+hw, y+.55, cz+hd);
    B.box(cx-hw, y, cz-hd, cx-hw+.35, y+.55, cz+hd);
    B.box(cx+hw-.35, y, cz-hd, cx+hw, y+.55, cz+hd);
  },
  /* fire escape: the signature of an Entropism tenement */
  fireEscape(B, x, y0, z, w, floors, floorH, dir, layers) {
    B.mat(layers.perf, 1, 1, 0).col(.28,.26,.24,0);
    const d = dir === 0 ? 1 : 0;
    for (let f = 0; f < floors; f++) {
      const y = y0 + f*floorH;
      if (d) { B.box(x, y, z-w*.5, x+1.5, y+.12, z+w*.5);
               B.box(x+1.4, y, z-w*.5, x+1.5, y+1.05, z+w*.5); }
      else   { B.box(x-w*.5, y, z, x+w*.5, y+.12, z+1.5);
               B.box(x-w*.5, y, z+1.4, x+w*.5, y+1.05, z+1.5); }
      /* ladder to the next level */
      if (f < floors-1) {
        if (d) B.box(x+.5, y, z+w*.3, x+.62, y+floorH, z+w*.42);
        else   B.box(x+w*.3, y, z+.5, x+w*.42, y+floorH, z+.62);
      }
    }
  },
  /* AC units bolted to a wall, the small chaos that reads as "lived in" */
  acUnits(B, x0, x1, y0, y1, z, dir, r, layers, density) {
    const n = ((x1-x0)*(y1-y0)*(density||0.012))|0;
    B.mat(layers.metal, 1, 1, 0);
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, r()), y = y0 + r()*(y1-y0-2) + 1;
      const w = .35+r()*.3, h = .3+r()*.22, dd = .3+r()*.25;
      B.col(.52+r()*.14, .52+r()*.14, .5+r()*.14, 0);
      if (dir === 0) B.box(x-w, y, z, x+w, y+h, z+dd);
      else B.box(z, y, x-w, z+dd, y+h, x+w);
    }
  },
};
</script>
