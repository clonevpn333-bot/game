--!strict
-- Recipe helpers for building props out of primitives. A recipe is pure data (no Instances, no
-- Color3) so it can be validated in tests and built identically on any client.
--
-- Conventions: units are studs at the prop's nominal scale, origin is the centre of the prop's
-- footprint at ground level (y = 0 is the floor), +Z is the prop's "front".
-- Colors are hex strings. Rotations are degrees, applied Y then X then Z (CFrame.fromEulerAnglesYXZ).

export type Shape = "Block" | "Ball" | "Cylinder" | "Wedge" | "CornerWedge" | "Mesh"

export type PartSpec = {
	shape: Shape,
	size: { number }, -- x, y, z (for Cylinder: length along its axis, then diameter, diameter)
	pos: { number },
	rot: { number }?,
	upright: boolean?, -- Cylinder axis points up (+Y) instead of +X
	color: string,
	material: string?,
	transparency: number?,
	reflectance: number?,
	neon: boolean?,
	tag: string?, -- "eye", "leg", "wing", "tail", "head", "body", "accent" (used by critter animation)
	mesh: { [string]: any }?, -- MeshKit descriptor when shape == "Mesh"
	meshCenter: { number }?, -- bbox centre of the generated mesh in its own space
	sharp: boolean?, -- opt out of automatic bevelling for blocks/cylinders
}

export type Opts = {
	rot: { number }?,
	mat: string?,
	t: number?,
	refl: number?,
	tag: string?,
	neon: boolean?,
	sharp: boolean?,
}

local MeshKit = require(script.Parent.Parent.Parent.Logic.MeshKit)

local Shapes = {}

local function finish(spec: PartSpec, opts: Opts?): PartSpec
	if opts then
		spec.rot = opts.rot
		spec.material = opts.mat
		spec.transparency = opts.t
		spec.reflectance = opts.refl
		spec.tag = opts.tag
		spec.sharp = opts.sharp
		if opts.neon then
			spec.neon = true
			spec.material = "Neon"
		end
	end
	return spec
end

-- Axis-aligned box centred at (x, y, z).
function Shapes.box(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Block", size = { sx, sy, sz }, pos = { x, y, z }, color = color }, opts)
end

-- Sphere of diameter d centred at (x, y, z).
function Shapes.ball(d: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Ball", size = { d, d, d }, pos = { x, y, z }, color = color }, opts)
end

-- Upright cylinder (axis +Y) of diameter d and height h centred at (x, y, z).
function Shapes.cyl(d: number, h: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Cylinder", size = { h, d, d }, pos = { x, y, z }, upright = true, color = color }, opts)
end

-- Cylinder lying along X (wheels, rolling pins, logs). Use opts.rot to point it elsewhere.
function Shapes.cylX(d: number, len: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Cylinder", size = { len, d, d }, pos = { x, y, z }, color = color }, opts)
end

function Shapes.wedge(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Wedge", size = { sx, sy, sz }, pos = { x, y, z }, color = color }, opts)
end

function Shapes.corner(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "CornerWedge", size = { sx, sy, sz }, pos = { x, y, z }, color = color }, opts)
end

-- Ellipsoid approximation: a ball part stretched via the builder's SpecialMesh scale.
-- Kept as a Ball shape with non-uniform size; PropBuilder renders it with a sphere mesh.
function Shapes.blob(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	return finish({ shape = "Ball", size = { sx, sy, sz }, pos = { x, y, z }, color = color }, opts)
end

-- Smooth meshes ---------------------------------------------------------------------------------
-- These generate real triangle meshes (see Logic/MeshKit). x, y, z place the mesh's own origin.

local function meshSpec(desc: { [string]: any }, x: number, y: number, z: number, color: string, opts: Opts?): PartSpec
	local mesh = MeshKit.generate(desc)
	local size = { mesh.max[1] - mesh.min[1], mesh.max[2] - mesh.min[2], mesh.max[3] - mesh.min[3] }
	local center = { (mesh.max[1] + mesh.min[1]) / 2, (mesh.max[2] + mesh.min[2]) / 2, (mesh.max[3] + mesh.min[3]) / 2 }
	return finish({ shape = "Mesh", mesh = desc, meshCenter = center, size = size, pos = { x, y, z }, color = color }, opts)
end

-- Revolve a profile { {radius, y}, ... } (bottom to top) around the vertical axis.
-- extra: { seg, smooth, lobes, lobeDepth, twist, squash = {sx, sz} }
function Shapes.lathe(profile: { { number } }, x: number, y: number, z: number, color: string, opts: Opts?, extra: { [string]: any }?): PartSpec
	local desc: { [string]: any } = { kind = "lathe", profile = profile, seg = 24, smooth = 3 }
	if extra then
		for k, v in extra do
			desc[k] = v
		end
	end
	return meshSpec(desc, x, y, z, color, opts)
end

-- Rounded box with real bevels; radius defaults to 18% of the smallest side.
function Shapes.rbox(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?, radius: number?): PartSpec
	local r = radius or math.min(sx, sy, sz) * 0.18
	return meshSpec({ kind = "rbox", size = { sx, sy, sz }, radius = r, seg = 3 }, x, y, z, color, opts)
end

-- Tube swept along a path of points (smoothed), radius scalar or per point.
function Shapes.tube(path: { { number } }, radius: number | { number }, color: string, opts: Opts?, extra: { [string]: any }?): PartSpec
	local desc: { [string]: any } = { kind = "tube", path = path, radius = radius, sides = 12, smooth = 4, caps = "round" }
	if extra then
		for k, v in extra do
			desc[k] = v
		end
	end
	return meshSpec(desc, 0, 0, 0, color, opts)
end

function Shapes.torus(major: number, minor: number, x: number, y: number, z: number, color: string, opts: Opts?, extra: { [string]: any }?): PartSpec
	local desc: { [string]: any } = { kind = "torus", major = major, minor = minor, segU = 28, segV = 14 }
	if extra then
		for k, v in extra do
			desc[k] = v
		end
	end
	return meshSpec(desc, x, y, z, color, opts)
end

-- Smooth ellipsoid; lump > 0 gives organic cloud/foliage silhouettes.
function Shapes.ell(sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, opts: Opts?, extra: { [string]: any }?): PartSpec
	local desc: { [string]: any } = { kind = "ellipsoid", size = { sx, sy, sz }, segU = 24, segV = 16 }
	if extra then
		for k, v in extra do
			desc[k] = v
		end
	end
	return meshSpec(desc, x, y, z, color, opts)
end

-- Extrude a 2D outline {{x, z}, ...} upward by height with a soft bevel.
function Shapes.extrude(outline: { { number } }, height: number, x: number, y: number, z: number, color: string, opts: Opts?, extra: { [string]: any }?): PartSpec
	local desc: { [string]: any } = { kind = "extrude", outline = outline, height = height }
	if extra then
		for k, v in extra do
			desc[k] = v
		end
	end
	return meshSpec(desc, x, y, z, color, opts)
end

-- Regular star / flower outline helper for extrude.
function Shapes.starOutline(points: number, outer: number, inner: number): { { number } }
	local out = {}
	for i = 0, points * 2 - 1 do
		local a = i / (points * 2) * math.pi * 2 + math.pi / 2
		local r = if i % 2 == 0 then outer else inner
		table.insert(out, { math.cos(a) * r, math.sin(a) * r })
	end
	return out
end

-- Two cartoon eyes (white + pupil + highlight) placed symmetrically at +/- x on the +Z face.
function Shapes.eyes(spacing: number, d: number, y: number, z: number, out: { PartSpec }, pupilColor: string?)
	for _, side in { -1, 1 } do
		local x = side * spacing / 2
		table.insert(out, Shapes.ball(d, x, y, z, "#ffffff", { tag = "eye", mat = "SmoothPlastic" }))
		table.insert(out, Shapes.ball(d * 0.55, x, y, z + d * 0.3, pupilColor or "#1c1430", { tag = "eye" }))
		table.insert(out, Shapes.ball(d * 0.2, x + d * 0.12, y + d * 0.14, z + d * 0.48, "#ffffff", { tag = "eye", neon = true }))
	end
end

-- Concatenate part lists.
function Shapes.join(...: { PartSpec }): { PartSpec }
	local out = {}
	for i = 1, select("#", ...) do
		for _, p in (select(i, ...)) do
			table.insert(out, p)
		end
	end
	return out
end

-- Copy a list of parts offset/scaled (for reusing sub-assemblies like wheels or legs).
function Shapes.transform(parts: { PartSpec }, scale: number, dx: number, dy: number, dz: number): { PartSpec }
	local out = {}
	for _, p in parts do
		local copy = table.clone(p)
		copy.size = { p.size[1] * scale, p.size[2] * scale, p.size[3] * scale }
		copy.pos = { p.pos[1] * scale + dx, p.pos[2] * scale + dy, p.pos[3] * scale + dz }
		table.insert(out, copy)
	end
	return out
end

-- Lighten (+) or darken (-) a hex color by amount in [-1, 1]. Pure, so recipes can derive shades.
function Shapes.shade(hex: string, amount: number): string
	local h = hex:gsub("#", "")
	local r = tonumber(h:sub(1, 2), 16) or 0
	local g = tonumber(h:sub(3, 4), 16) or 0
	local b = tonumber(h:sub(5, 6), 16) or 0
	local function adjust(c: number): number
		if amount >= 0 then
			return math.floor(c + (255 - c) * amount + 0.5)
		end
		return math.floor(c * (1 + amount) + 0.5)
	end
	return string.format("#%02x%02x%02x", adjust(r), adjust(g), adjust(b))
end

return Shapes
