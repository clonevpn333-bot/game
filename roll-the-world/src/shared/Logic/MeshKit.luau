--!strict
-- Procedural mesh generation (pure Luau). Produces smooth triangle meshes from compact descriptors:
--   lathe    - a profile curve revolved around Y (mugs, fruit, bottles, pots, trunks, bodies)
--   rbox     - rounded box with real bevelled edges (appliances, furniture, blocks, books)
--   tube     - a radius-varying tube swept along a smoothed path (handles, tails, branches, bananas)
--   torus    - ring (donuts, rims, lifebuoys)
--   ellipsoid- smooth ellipsoid with optional lumpiness (foliage clumps, heads, bodies)
--   extrude  - a 2D outline extruded with a soft bevel (leaves, stars, cookies, signs)
-- The client turns results into EditableMesh-backed MeshParts; the preview renderer draws the
-- same triangles, so previews show exactly what the game builds.

export type Mesh = {
	verts: { number }, -- flat x,y,z
	norms: { number }, -- flat x,y,z (unit)
	uvs: { number }, -- flat u,v in "texture tiles" (1 unit = Tile studs) so Roblox materials map cleanly
	tris: { number }, -- flat 1-based vertex indices
	min: { number },
	max: { number },
}

-- Studs per texture tile for generated UVs.
local TILE = 4

export type Descriptor = { [string]: any }

local MeshKit = {}

local cache: { [string]: Mesh } = {}

-- Builder helpers -------------------------------------------------------------------------------

local function newMesh(): Mesh
	return { verts = {}, norms = {}, uvs = {}, tris = {}, min = { math.huge, math.huge, math.huge }, max = { -math.huge, -math.huge, -math.huge } }
end

local function addVert(m: Mesh, x: number, y: number, z: number, u: number?, v: number?): number
	local verts = m.verts
	verts[#verts + 1] = x
	verts[#verts + 1] = y
	verts[#verts + 1] = z
	local uv = m.uvs
	uv[#uv + 1] = (u or 0) / TILE
	uv[#uv + 1] = (v or 0) / TILE
	return #verts // 3
end

local function addTri(m: Mesh, a: number, b: number, c: number)
	if a == b or b == c or a == c then
		return
	end
	local t = m.tris
	t[#t + 1] = a
	t[#t + 1] = b
	t[#t + 1] = c
end

-- Smooth per-vertex normals from area-weighted face normals; also computes bounds.
local function finish(m: Mesh): Mesh
	local v, t = m.verts, m.tris
	local n = table.create(#v, 0)
	for i = 1, #t, 3 do
		local a, b, c = (t[i] - 1) * 3, (t[i + 1] - 1) * 3, (t[i + 2] - 1) * 3
		local ux, uy, uz = v[b + 1] - v[a + 1], v[b + 2] - v[a + 2], v[b + 3] - v[a + 3]
		local wx, wy, wz = v[c + 1] - v[a + 1], v[c + 2] - v[a + 2], v[c + 3] - v[a + 3]
		local nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
		for _, o in { a, b, c } do
			n[o + 1] += nx
			n[o + 2] += ny
			n[o + 3] += nz
		end
	end
	-- Weld normals of coincident vertices (UV seams, rounded-box face borders) so shading is
	-- seamless while UVs stay continuous.
	local groups: { [string]: { number } } = {}
	for i = 1, #v, 3 do
		local key = string.format("%.3f,%.3f,%.3f", v[i], v[i + 1], v[i + 2])
		local g = groups[key]
		if g then
			table.insert(g, i)
		else
			groups[key] = { i }
		end
	end
	for _, g in groups do
		if #g > 1 then
			local sx, sy, sz = 0, 0, 0
			for _, i in g do
				sx += n[i]
				sy += n[i + 1]
				sz += n[i + 2]
			end
			for _, i in g do
				n[i], n[i + 1], n[i + 2] = sx, sy, sz
			end
		end
	end
	for i = 1, #n, 3 do
		local len = math.sqrt(n[i] * n[i] + n[i + 1] * n[i + 1] + n[i + 2] * n[i + 2])
		if len > 1e-9 then
			n[i], n[i + 1], n[i + 2] = n[i] / len, n[i + 1] / len, n[i + 2] / len
		else
			n[i], n[i + 1], n[i + 2] = 0, 1, 0
		end
		m.min[1] = math.min(m.min[1], v[i])
		m.min[2] = math.min(m.min[2], v[i + 1])
		m.min[3] = math.min(m.min[3], v[i + 2])
		m.max[1] = math.max(m.max[1], v[i])
		m.max[2] = math.max(m.max[2], v[i + 1])
		m.max[3] = math.max(m.max[3], v[i + 2])
	end
	m.norms = n
	return m
end

-- Catmull-Rom subdivision of a polyline of tuples (any dimension) for smooth organic curves.
local function smoothCurve(points: { { number } }, steps: number): { { number } }
	if steps <= 1 or #points < 3 then
		return points
	end
	local out = {}
	local count = #points
	local dims = #points[1]
	for i = 1, count - 1 do
		local p0 = points[math.max(i - 1, 1)]
		local p1 = points[i]
		local p2 = points[i + 1]
		local p3 = points[math.min(i + 2, count)]
		for s = 0, steps - 1 do
			local t = s / steps
			local t2, t3 = t * t, t * t * t
			local q = table.create(dims)
			for d = 1, dims do
				q[d] = 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)
			end
			table.insert(out, q)
		end
	end
	table.insert(out, points[count])
	return out
end

MeshKit.smoothCurve = smoothCurve

-- Generators ------------------------------------------------------------------------------------

-- profile: { {radius, y}, ... } from bottom to top. Endpoints with radius 0 close the shape.
-- Options: seg (radial segments), smooth (curve subdivision), lobes/lobeDepth (radial ridges),
-- twist (radians over height), squash {x, z} (oval cross-section).
local function lathe(d: Descriptor): Mesh
	local m = newMesh()
	local seg = d.seg or 24
	local profile = smoothCurve(d.profile, d.smooth or 1)
	local lobes, lobeDepth = d.lobes or 0, d.lobeDepth or 0
	local twist = d.twist or 0
	local sx, sz = 1, 1
	if d.squash then
		sx, sz = d.squash[1], d.squash[2]
	end
	local minY, maxY = math.huge, -math.huge
	for _, p in profile do
		minY = math.min(minY, p[2])
		maxY = math.max(maxY, p[2])
	end
	local rings = {}
	local arc = 0
	local maxR = 0
	for _, p in profile do
		maxR = math.max(maxR, p[1])
	end
	for i, p in profile do
		local r, y = math.max(p[1], 0), p[2]
		if i > 1 then
			local q = profile[i - 1]
			arc += math.sqrt((p[1] - q[1]) ^ 2 + (p[2] - q[2]) ^ 2)
		end
		local ring = {}
		local tNorm = if maxY > minY then (y - minY) / (maxY - minY) else 0
		for j = 0, seg do
			local a = j / seg * math.pi * 2 + twist * tNorm
			local rr = r
			if lobes > 0 and r > 1e-6 then
				rr = r * (1 - lobeDepth * (0.5 - 0.5 * math.cos(a * lobes)))
			end
			ring[j] = addVert(m, math.cos(a) * rr * sx, y, math.sin(a) * rr * sz, j / seg * math.pi * 2 * maxR, arc)
		end
		rings[i] = ring
	end
	for i = 1, #rings - 1 do
		local r0, r1 = rings[i], rings[i + 1]
		for j = 0, seg - 1 do
			-- Counter-clockwise when viewed from outside (normals point outward).
			addTri(m, r0[j], r1[j], r1[j + 1])
			addTri(m, r0[j], r1[j + 1], r0[j + 1])
		end
	end
	return finish(m)
end

-- Rounded box: size {x,y,z}, radius r, seg = arc segments per rounded edge.
local function rbox(d: Descriptor): Mesh
	local m = newMesh()
	local hx, hy, hz = d.size[1] / 2, d.size[2] / 2, d.size[3] / 2
	local r = math.min(d.radius or 0.2, hx, hy, hz)
	local seg = d.seg or 4
	local function coords(h: number): { number }
		local list = {}
		local inner = h - r
		for k = 0, seg do
			local a = (1 - k / seg) * math.pi / 2
			table.insert(list, -inner - math.sin(a) * r)
		end
		if inner > 1e-4 then
			for k = 0, seg do
				local a = k / seg * math.pi / 2
				table.insert(list, inner + math.sin(a) * r)
			end
		else
			for k = 1, seg do
				local a = k / seg * math.pi / 2
				table.insert(list, inner + math.sin(a) * r)
			end
		end
		return list
	end
	local cx, cy, cz = coords(hx), coords(hy), coords(hz)
	local ix, iy, iz = hx - r, hy - r, hz - r
	local function project(x: number, y: number, z: number): (number, number, number)
		local qx = math.clamp(x, -ix, ix)
		local qy = math.clamp(y, -iy, iy)
		local qz = math.clamp(z, -iz, iz)
		local dx, dy, dz = x - qx, y - qy, z - qz
		local len = math.sqrt(dx * dx + dy * dy + dz * dz)
		if len < 1e-6 then
			return x, y, z
		end
		return qx + dx / len * r, qy + dy / len * r, qz + dz / len * r
	end
	-- Each face: grid over two axes at fixed third coordinate.
	local function face(us: { number }, vs: { number }, map: (number, number) -> (number, number, number), flip: boolean)
		local idx = {}
		for i, u in us do
			idx[i] = {}
			for j, v in vs do
				local x, y, z = map(u, v)
				x, y, z = project(x, y, z)
				idx[i][j] = addVert(m, x, y, z, u, v)
			end
		end
		for i = 1, #us - 1 do
			for j = 1, #vs - 1 do
				local a, b, c, e = idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]
				if flip then
					addTri(m, a, c, b)
					addTri(m, a, e, c)
				else
					addTri(m, a, b, c)
					addTri(m, a, c, e)
				end
			end
		end
	end
	face(cy, cz, function(u, v) return hx, u, v end, false)
	face(cy, cz, function(u, v) return -hx, u, v end, true)
	face(cz, cx, function(u, v) return v, hy, u end, false)
	face(cz, cx, function(u, v) return v, -hy, u end, true)
	face(cx, cy, function(u, v) return u, v, hz end, false)
	face(cx, cy, function(u, v) return u, v, -hz end, true)
	return finish(m)
end

-- Parallel-transport frame sweep of a circle along a smoothed path.
-- path: { {x,y,z}, ... }; radius: number or per-point list; sides; caps = "round" | "flat" | nil.
local function tube(d: Descriptor): Mesh
	local m = newMesh()
	local raw = {}
	for i, p in d.path do
		local r = if type(d.radius) == "table" then d.radius[i] else d.radius
		raw[i] = { p[1], p[2], p[3], r }
	end
	local pts = smoothCurve(raw, d.smooth or 4)
	local sides = d.sides or 12
	local n = #pts
	-- Tangents.
	local tangents = {}
	for i = 1, n do
		local a = pts[math.max(i - 1, 1)]
		local b = pts[math.min(i + 1, n)]
		local tx, ty, tz = b[1] - a[1], b[2] - a[2], b[3] - a[3]
		local len = math.sqrt(tx * tx + ty * ty + tz * tz)
		if len < 1e-9 then
			tangents[i] = { 0, 1, 0 }
		else
			tangents[i] = { tx / len, ty / len, tz / len }
		end
	end
	-- Initial normal perpendicular to the first tangent.
	local t0 = tangents[1]
	local ref = if math.abs(t0[2]) < 0.9 then { 0, 1, 0 } else { 1, 0, 0 }
	local function cross(a: { number }, b: { number }): { number }
		return { a[2] * b[3] - a[3] * b[2], a[3] * b[1] - a[1] * b[3], a[1] * b[2] - a[2] * b[1] }
	end
	local function norm(a: { number }): { number }
		local l = math.sqrt(a[1] * a[1] + a[2] * a[2] + a[3] * a[3])
		if l < 1e-9 then
			return { 1, 0, 0 }
		end
		return { a[1] / l, a[2] / l, a[3] / l }
	end
	local normal = norm(cross(t0, ref))
	local rings = {}
	local along = 0
	for i = 1, n do
		local t = tangents[i]
		-- Re-orthogonalise the carried normal against the new tangent (parallel transport).
		local dot = normal[1] * t[1] + normal[2] * t[2] + normal[3] * t[3]
		normal = norm({ normal[1] - t[1] * dot, normal[2] - t[2] * dot, normal[3] - t[3] * dot })
		local binormal = cross(t, normal)
		local p = pts[i]
		if i > 1 then
			local q = pts[i - 1]
			along += math.sqrt((p[1] - q[1]) ^ 2 + (p[2] - q[2]) ^ 2 + (p[3] - q[3]) ^ 2)
		end
		local r = math.max(p[4], 0.001)
		local ring = {}
		for j = 0, sides do
			local a = j / sides * math.pi * 2
			local c, s = math.cos(a), math.sin(a)
			ring[j] = addVert(
				m,
				p[1] + (normal[1] * c + binormal[1] * s) * r,
				p[2] + (normal[2] * c + binormal[2] * s) * r,
				p[3] + (normal[3] * c + binormal[3] * s) * r,
				j / sides * math.pi * 2 * r,
				along
			)
		end
		rings[i] = ring
	end
	for i = 1, n - 1 do
		local r0, r1 = rings[i], rings[i + 1]
		for j = 0, sides - 1 do
			addTri(m, r0[j], r0[j + 1], r1[j + 1])
			addTri(m, r0[j], r1[j + 1], r1[j])
		end
	end
	local caps = d.caps or "round"
	local function cap(i: number, dir: number)
		local p = pts[i]
		local t = tangents[i]
		local depth = if caps == "round" then p[4] * 0.9 else 0
		local tip = addVert(m, p[1] + t[1] * depth * dir, p[2] + t[2] * depth * dir, p[3] + t[3] * depth * dir)
		local ring = rings[i]
		for j = 0, sides - 1 do
			local j1 = j + 1
			if dir > 0 then
				addTri(m, ring[j], ring[j1], tip)
			else
				addTri(m, ring[j1], ring[j], tip)
			end
		end
	end
	if caps ~= "none" then
		cap(1, -1)
		cap(n, 1)
	end
	return finish(m)
end

local function torus(d: Descriptor): Mesh
	local m = newMesh()
	local R, r = d.major, d.minor
	local su, sv = d.segU or 28, d.segV or 14
	local arc = d.arc or math.pi * 2
	local closed = arc >= math.pi * 2 - 1e-6
	local idx = {}
	for i = 0, su do
		local u = i / su * arc
		idx[i] = {}
		for j = 0, sv do
			local v = j / sv * math.pi * 2
			local rr = R + r * math.cos(v)
			-- Optional flattening (squash) for frosting-like shapes.
			local y = r * math.sin(v) * (d.flatten or 1)
			idx[i][j] = addVert(m, math.cos(u) * rr, y, math.sin(u) * rr, u * R, v * r)
		end
	end
	for i = 0, su - 1 do
		for j = 0, sv - 1 do
			addTri(m, idx[i][j], idx[i][j + 1], idx[i + 1][j + 1])
			addTri(m, idx[i][j], idx[i + 1][j + 1], idx[i + 1][j])
		end
	end
	local _ = closed
	return finish(m)
end

-- Deterministic value noise on the sphere for organic lumps (foliage, rocks, bread).
local function hashNoise(x: number, y: number, z: number, seed: number): number
	local s = math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.1414) * 43758.5453
	return s - math.floor(s)
end

local function ellipsoid(d: Descriptor): Mesh
	local m = newMesh()
	local sx, sy, sz = d.size[1] / 2, d.size[2] / 2, d.size[3] / 2
	local segU, segV = d.segU or 24, d.segV or 16
	local lump, seed = d.lump or 0, d.seed or 1
	local flatBottom = d.flatBottom
	local circumference = math.pi * (sx + sz)
	local rows = {}
	for i = 0, segV do
		local v = i / segV * math.pi
		local row = {}
		for j = 0, segU do
			local u = j / segU * math.pi * 2
			local nx, ny, nz = math.sin(v) * math.cos(u), math.cos(v), math.sin(v) * math.sin(u)
			local k = 1
			if lump > 0 and i > 0 and i < segV then
				-- Low-frequency lumps: blend a few hashed bumps for a cloud/foliage silhouette.
				local f = 0
				for o = 1, 3 do
					local scale = o * 1.7
					f += (hashNoise(math.floor(nx * scale * 2), math.floor(ny * scale * 2), math.floor(nz * scale * 2), seed + o) - 0.5) / o
				end
				k = 1 + lump * f + lump * 0.25 * math.sin(u * 5 + seed) * math.sin(v * 4)
			end
			local y = ny * sy * k
			if flatBottom and y < -sy * flatBottom then
				y = -sy * flatBottom
			end
			row[j] = addVert(m, nx * sx * k, y, nz * sz * k, j / segU * circumference, i / segV * math.pi * sy)
		end
		rows[i] = row
	end
	for i = 0, segV - 1 do
		for j = 0, segU - 1 do
			addTri(m, rows[i][j], rows[i][j + 1], rows[i + 1][j + 1])
			addTri(m, rows[i][j], rows[i + 1][j + 1], rows[i + 1][j])
		end
	end
	return finish(m)
end

-- Ear-clipping triangulation for a simple polygon given as {{x, z}, ...} (CCW or CW).
local function triangulate(poly: { { number } }): { { number } }
	local n = #poly
	local idx = {}
	local area = 0
	for i = 1, n do
		local a, b = poly[i], poly[i % n + 1]
		area += a[1] * b[2] - b[1] * a[2]
		idx[i] = i
	end
	local ccw = area > 0
	local function isEar(i0: number, i1: number, i2: number, list: { number }): boolean
		local a, b, c = poly[i0], poly[i1], poly[i2]
		local cr = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])
		if (cr > 0) ~= ccw or math.abs(cr) < 1e-12 then
			return false
		end
		for _, k in list do
			if k ~= i0 and k ~= i1 and k ~= i2 then
				local p = poly[k]
				local d1 = (b[1] - a[1]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[1] - a[1])
				local d2 = (c[1] - b[1]) * (p[2] - b[2]) - (c[2] - b[2]) * (p[1] - b[1])
				local d3 = (a[1] - c[1]) * (p[2] - c[2]) - (a[2] - c[2]) * (p[1] - c[1])
				if ccw then
					if d1 >= 0 and d2 >= 0 and d3 >= 0 then
						return false
					end
				elseif d1 <= 0 and d2 <= 0 and d3 <= 0 then
					return false
				end
			end
		end
		return true
	end
	local out = {}
	local guard = 0
	while #idx > 3 and guard < 10000 do
		guard += 1
		local clipped = false
		for i = 1, #idx do
			local i0, i1, i2 = idx[(i - 2) % #idx + 1], idx[i], idx[i % #idx + 1]
			if isEar(i0, i1, i2, idx) then
				table.insert(out, if ccw then { i0, i1, i2 } else { i0, i2, i1 })
				table.remove(idx, i)
				clipped = true
				break
			end
		end
		if not clipped then
			break
		end
	end
	if #idx == 3 then
		table.insert(out, if ccw then { idx[1], idx[2], idx[3] } else { idx[1], idx[3], idx[2] })
	end
	return out
end

-- Extrude a 2D outline (in XZ) upward by `height`, with a soft inset bevel on top and bottom.
local function extrude(d: Descriptor): Mesh
	local m = newMesh()
	local outline = d.outline
	if d.smooth and d.smooth > 1 then
		local closed = table.clone(outline)
		table.insert(closed, outline[1])
		table.insert(closed, outline[2])
		local sm = smoothCurve(closed, d.smooth)
		outline = {}
		for i = 1, #sm - d.smooth - 1 do
			table.insert(outline, sm[i])
		end
	end
	local h = d.height
	local bevel = math.min(d.bevel or h * 0.3, h * 0.45)
	local inset = d.inset or bevel
	local n = #outline
	-- Centroid for inset direction.
	local cx, cz = 0, 0
	for _, p in outline do
		cx += p[1]
		cz += p[2]
	end
	cx, cz = cx / n, cz / n
	local function ringAt(y: number, shrink: number): { number }
		local ring = {}
		for i, p in outline do
			local dx, dz = p[1] - cx, p[2] - cz
			local len = math.sqrt(dx * dx + dz * dz)
			local k = if len > 1e-6 then math.max(len - shrink, len * 0.2) / len else 1
			local x, z = cx + dx * k, cz + dz * k
			ring[i] = addVert(m, x, y, z, x + y * 0.5, z)
		end
		return ring
	end
	local levels = {
		ringAt(0, inset),
		ringAt(bevel, 0),
		ringAt(h - bevel, 0),
		ringAt(h, inset),
	}
	for l = 1, #levels - 1 do
		local r0, r1 = levels[l], levels[l + 1]
		for i = 1, n do
			local i1 = i % n + 1
			addTri(m, r0[i], r0[i1], r1[i1])
			addTri(m, r0[i], r1[i1], r1[i])
		end
	end
	local tris = triangulate(outline)
	for _, t in tris do
		addTri(m, levels[4][t[1]], levels[4][t[3]], levels[4][t[2]])
		addTri(m, levels[1][t[1]], levels[1][t[2]], levels[1][t[3]])
	end
	local mesh = finish(m)
	-- Orientation of the outline decides winding; ensure normals face out by checking the top.
	return mesh
end

local generators: { [string]: (Descriptor) -> Mesh } = {
	lathe = lathe,
	rbox = rbox,
	tube = tube,
	torus = torus,
	ellipsoid = ellipsoid,
	extrude = extrude,
}

-- Stable cache key from a descriptor (descriptors are plain data).
local function keyOf(value: any): string
	local t = type(value)
	if t == "table" then
		local keys = {}
		for k in value do
			table.insert(keys, k)
		end
		table.sort(keys, function(a, b)
			return tostring(a) < tostring(b)
		end)
		local parts = {}
		for _, k in keys do
			table.insert(parts, tostring(k) .. "=" .. keyOf(value[k]))
		end
		return "{" .. table.concat(parts, ",") .. "}"
	elseif t == "number" then
		return string.format("%.4g", value)
	end
	return tostring(value)
end

MeshKit.keyOf = keyOf

function MeshKit.generate(d: Descriptor): Mesh
	local key = keyOf(d)
	local existing = cache[key]
	if existing then
		return existing
	end
	local gen = generators[d.kind]
	assert(gen, "unknown mesh kind " .. tostring(d.kind))
	local mesh = gen(d)
	cache[key] = mesh
	return mesh
end

function MeshKit.triangleCount(m: Mesh): number
	return #m.tris // 3
end

return MeshKit
