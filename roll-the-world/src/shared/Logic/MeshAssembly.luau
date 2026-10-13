--!strict
-- Turns a prop recipe into a handful of merged, smooth meshes (one per color/material group),
-- with automatic bevels on blocks and cylinders and baked "toy" shading (soft contact shadow at
-- the base, gentle sky light from above). Pure Luau: the client feeds the result into
-- EditableMesh, and the preview renderer draws exactly the same triangles.

local MeshKit = require(script.Parent.MeshKit)
local PropMetrics = require(script.Parent.PropMetrics)

export type Group = {
	key: string,
	color: string,
	material: string,
	transparency: number,
	reflectance: number,
	neon: boolean,
	tag: string?,
	pivot: { number }?, -- for animated groups: the source part's position (rotation pivot)
	verts: { number },
	norms: { number },
	uvs: { number },
	shade: { number }, -- per-vertex brightness multiplier (0..1)
	tris: { number },
}

local MeshAssembly = {}

-- Tags whose parts stay separate so critters / Nana can animate them.
local ANIMATED = { leg = true, wing = true, tail = true, head = true, arm = true, needle = true, yarn = true }

MeshAssembly.BevelFraction = 0.2
MeshAssembly.AoBase = 0.6

local function scaledCylinder(length: number, diameter: number, sharp: boolean, detail: number): any
	local r = diameter / 2
	local h = length / 2
	local seg = math.clamp(math.floor(diameter * 6 * detail), 8, 32)
	if sharp then
		return MeshKit.generate({ kind = "lathe", profile = { { 0, -h }, { r, -h }, { r, h }, { 0, h } }, seg = seg, smooth = 1 })
	end
	local b = math.min(r, h) * MeshAssembly.BevelFraction * 1.4
	return MeshKit.generate({
		kind = "lathe",
		profile = { { 0, -h }, { r - b, -h }, { r - b * 0.3, -h + b * 0.3 }, { r, -h + b }, { r, h - b }, { r - b * 0.3, h - b * 0.3 }, { r - b, h }, { 0, h } },
		seg = seg,
		smooth = 1,
	})
end

-- Flat-shaded prism matching Roblox's WedgePart (full height at +Z, slope facing -Z/+Y).
local function wedgeMesh(sx: number, sy: number, sz: number): any
	local x, y, z = sx / 2, sy / 2, sz / 2
	local faces = {
		{ { -x, -y, -z }, { x, -y, -z }, { x, -y, z }, { -x, -y, z } }, -- bottom
		{ { -x, -y, z }, { x, -y, z }, { x, y, z }, { -x, y, z } }, -- back
		{ { -x, -y, -z }, { -x, y, z }, { x, y, z }, { x, -y, -z } }, -- slope
	}
	local tri = {
		{ { -x, -y, -z }, { -x, -y, z }, { -x, y, z } }, -- left
		{ { x, -y, -z }, { x, y, z }, { x, -y, z } }, -- right
	}
	local m = { verts = {}, norms = {}, uvs = {}, tris = {} }
	local function addFace(points: { { number } })
		local a, b, c = points[1], points[2], points[3]
		local ux, uy, uz = b[1] - a[1], b[2] - a[2], b[3] - a[3]
		local wx, wy, wz = c[1] - a[1], c[2] - a[2], c[3] - a[3]
		local nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
		local len = math.sqrt(nx * nx + ny * ny + nz * nz)
		nx, ny, nz = nx / len, ny / len, nz / len
		-- Ensure outward normal (away from the prism centroid).
		local cx, cy, cz = 0, 0, 0
		for _, p in points do
			cx += p[1]
			cy += p[2]
			cz += p[3]
		end
		cx, cy, cz = cx / #points, cy / #points, cz / #points
		local flip = (nx * cx + ny * (cy + y / 3) + nz * (cz - z / 3)) < 0
		local base = #m.verts // 3
		for _, p in points do
			table.insert(m.verts, p[1])
			table.insert(m.verts, p[2])
			table.insert(m.verts, p[3])
			table.insert(m.norms, if flip then -nx else nx)
			table.insert(m.norms, if flip then -ny else ny)
			table.insert(m.norms, if flip then -nz else nz)
			table.insert(m.uvs, (p[1] + p[3]) / 4)
			table.insert(m.uvs, (p[2] + p[3]) / 4)
		end
		for k = 2, #points - 1 do
			if flip then
				table.insert(m.tris, base + 1)
				table.insert(m.tris, base + k + 1)
				table.insert(m.tris, base + k)
			else
				table.insert(m.tris, base + 1)
				table.insert(m.tris, base + k)
				table.insert(m.tris, base + k + 1)
			end
		end
	end
	for _, f in faces do
		addFace(f)
	end
	for _, f in tri do
		addFace(f)
	end
	return m
end

-- Detail level (0.3..1) from a prop's absorb size: crumbs get light meshes, landmarks get full detail.
function MeshAssembly.detailFor(absorbSize: number): number
	if absorbSize <= 1.5 then
		return 0.34
	elseif absorbSize <= 5 then
		return 0.5
	elseif absorbSize <= 15 then
		return 0.72
	elseif absorbSize <= 40 then
		return 0.88
	end
	return 1
end

local SEG_KEYS: { [string]: number } = { seg = 8, segU = 8, segV = 6, sides = 6 }

local function scaled(desc: any, detail: number): any
	if detail >= 0.999 then
		return desc
	end
	local copy: { [string]: any } = table.clone(desc)
	for key, minimum in SEG_KEYS do
		if copy[key] then
			copy[key] = math.max(minimum, math.floor(copy[key] * detail + 0.5))
		end
	end
	if copy.smooth and copy.smooth > 1 then
		copy.smooth = math.max(1, math.floor(copy.smooth * detail + 0.5))
	end
	return copy
end

-- Local-space mesh for one part spec (before the part's rotation/position are applied).
function MeshAssembly.localMesh(spec: any, detail: number?): (any, boolean)
	local size = spec.size
	local d = detail or 1
	if spec.shape == "Mesh" then
		return MeshKit.generate(scaled(spec.mesh, d)), false
	elseif spec.shape == "Ball" then
		local seg = math.clamp(math.floor(math.max(size[1], size[2], size[3]) * 5 * d), 8, 28)
		return MeshKit.generate({ kind = "ellipsoid", size = { size[1], size[2], size[3] }, segU = seg, segV = math.max(6, math.floor(seg * 0.66)) }), false
	elseif spec.shape == "Cylinder" then
		-- Roblox cylinders lie along X; the lathe is built along Y, so rotate Y -> X.
		return scaledCylinder(size[1], math.min(size[2], size[3]), spec.sharp or spec.neon, d), true
	elseif spec.shape == "Wedge" or spec.shape == "CornerWedge" then
		return wedgeMesh(size[1], size[2], size[3]), false
	end
	local minSide = math.min(size[1], size[2], size[3])
	local radius = if spec.sharp or minSide < 0.12 then minSide * 0.02 else math.clamp(minSide * MeshAssembly.BevelFraction, 0.02, 4)
	local arcSeg = if d < 0.45 then 1 elseif radius > 0.6 then 4 else if d < 0.8 then 2 else 3
	return MeshKit.generate({ kind = "rbox", size = { size[1], size[2], size[3] }, radius = radius, seg = arcSeg }), false
end

local function groupKey(spec: any, index: number): (string, string?)
	local tag = spec.tag
	local animated = tag and ANIMATED[tag]
	local key = table.concat({
		spec.color,
		spec.material or "SmoothPlastic",
		tostring(spec.transparency or 0),
		tostring(spec.reflectance or 0),
		if spec.neon then "N" else "",
		if animated then tag .. index else "",
	}, "|")
	return key, if animated then tag else nil
end

function MeshAssembly.assemble(parts: { any }, shade: boolean?, detail: number?): { Group }
	local groups: { [string]: Group } = {}
	local order: { string } = {}
	for index, spec in parts do
		if (spec.transparency or 0) >= 0.99 then
			continue
		end
		local mesh, yToX = MeshAssembly.localMesh(spec, detail)
		local key, tag = groupKey(spec, index)
		local g = groups[key]
		if not g then
			g = {
				key = key,
				color = spec.color,
				material = if spec.neon then "Neon" else (spec.material or "SmoothPlastic"),
				transparency = spec.transparency or 0,
				reflectance = spec.reflectance or 0,
				neon = spec.neon == true,
				tag = tag,
				pivot = if tag then { spec.pos[1], spec.pos[2], spec.pos[3] } else nil,
				verts = {},
				norms = {},
				uvs = {},
				shade = {},
				tris = {},
			}
			groups[key] = g
			table.insert(order, key)
		end
		local r = PropMetrics.partRotation(spec)
		local px, py, pz = spec.pos[1], spec.pos[2], spec.pos[3]
		local base = #g.verts // 3
		local v, n, uv = mesh.verts, mesh.norms, mesh.uvs
		for i = 1, #v, 3 do
			local x, y, z = v[i], v[i + 1], v[i + 2]
			local nx, ny, nz = n[i], n[i + 1], n[i + 2]
			if yToX then
				-- Rotate -90 degrees about Z: (x, y) -> (y, -x)
				x, y = y, -x
				nx, ny = ny, -nx
			end
			table.insert(g.verts, r[1] * x + r[2] * y + r[3] * z + px)
			table.insert(g.verts, r[4] * x + r[5] * y + r[6] * z + py)
			table.insert(g.verts, r[7] * x + r[8] * y + r[9] * z + pz)
			table.insert(g.norms, r[1] * nx + r[2] * ny + r[3] * nz)
			table.insert(g.norms, r[4] * nx + r[5] * ny + r[6] * nz)
			table.insert(g.norms, r[7] * nx + r[8] * ny + r[9] * nz)
		end
		for i = 1, #uv do
			table.insert(g.uvs, uv[i])
		end
		for _, t in mesh.tris do
			table.insert(g.tris, t + base)
		end
	end

	local list: { Group } = {}
	for _, key in order do
		table.insert(list, groups[key])
	end

	-- Baked shading: soft contact darkening near the ground + slightly darker downward faces.
	local minY, maxY = math.huge, -math.huge
	for _, g in list do
		for i = 2, #g.verts, 3 do
			minY = math.min(minY, g.verts[i])
			maxY = math.max(maxY, g.verts[i])
		end
	end
	local height = math.max(maxY - minY, 0.1)
	local band = math.max(height * 0.35, 0.4)
	for _, g in list do
		for i = 1, #g.verts, 3 do
			local s = 1
			if shade ~= false and not g.neon then
				local t = math.clamp((g.verts[i + 1] - minY) / band, 0, 1)
				t = t * t * (3 - 2 * t)
				local ao = MeshAssembly.AoBase + (1 - MeshAssembly.AoBase) * t
				local sky = 0.86 + 0.14 * math.clamp(g.norms[i + 1] * 0.5 + 0.5, 0, 1)
				s = ao * sky
			end
			table.insert(g.shade, s)
		end
	end
	return list
end

function MeshAssembly.triangleCount(groups: { Group }): number
	local n = 0
	for _, g in groups do
		n += #g.tris // 3
	end
	return n
end

return MeshAssembly
