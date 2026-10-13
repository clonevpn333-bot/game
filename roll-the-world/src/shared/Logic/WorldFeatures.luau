--!strict
-- Set pieces that give each map its own shape (not just its own colors). A kit lists `features`;
-- each one adds terrain and structures the ball interacts with, and registers walkable tops
-- (props can spawn there) and solid footprints (props stay off them):
--   hill     plateau + four slopes to roll up and over (grassy mounds, dunes, frosting heaps)
--   stairs   a run of shallow steps up to a landing (spice-rack steps, block stairs)
--   bridge   raised deck with ramps at both ends and posts underneath (things hide below)
--   pool     low rim + water surface + floor tint (pond, paddling pool, tide pool, spill)
--   bowl     sunken arena: four inward slopes around a flat floor (mixing bowl, skate bowl)
--   pillars  upright trunks/poles with optional canopy or stripes (trees, candy canes)
--   path     a winding non-solid strip across the map (stone path, chocolate river, shoreline)
--   rug      a round or square flat patch (rug, beach towel, picnic blanket)
-- Pure Luau and seeded, like the rest of WorldGen.

local Rng = require(script.Parent.Parent.Util.Rng)

local WorldFeatures = {}

type Geometry = { [string]: any }
type Platform = { [string]: any }

export type Ctx = {
	rng: Rng.Rng,
	H: number,
	out: { Geometry },
	platforms: { Platform },
	blocked: { Platform },
}

local function geo(ctx: Ctx, kind: string, shape: string, sx: number, sy: number, sz: number, x: number, y: number, z: number, yaw: number, color: string, material: string, collide: boolean, extra: { [string]: any }?)
	local g: Geometry = {
		shape = shape,
		size = { sx, sy, sz },
		pos = { x, y, z },
		yaw = yaw,
		color = color,
		material = material,
		collide = collide,
		kind = kind,
	}
	if extra then
		for k, v in extra do
			g[k] = v
		end
	end
	table.insert(ctx.out, g)
end

local function overlaps(ctx: Ctx, x: number, z: number, sx: number, sz: number, margin: number): boolean
	for _, b in ctx.blocked do
		if math.abs(b.x - x) < (b.sx + sx) / 2 + margin and math.abs(b.z - z) < (b.sz + sz) / 2 + margin then
			return true
		end
	end
	return false
end

local function block(ctx: Ctx, kind: string, x: number, z: number, sx: number, sz: number, height: number)
	table.insert(ctx.blocked, { id = kind, kind = kind, x = x, z = z, sx = sx, sz = sz, height = height, spawn = false })
end

local function platform(ctx: Ctx, id: string, kind: string, x: number, z: number, sx: number, sz: number, height: number)
	local p = { id = id, kind = kind, x = x, z = z, sx = sx, sz = sz, height = height, spawn = false }
	table.insert(ctx.platforms, p)
	table.insert(ctx.blocked, p)
end

-- Find a free spot of footprint (sx, sz) within the ring (fractions of H from the centre).
local function findSpot(ctx: Ctx, spec: any, sx: number, sz: number): (number?, number?)
	local ring = spec.ring or { 0.3, 0.85 }
	local limit = ctx.H - 60
	for _ = 1, 60 do
		local a = ctx.rng:range(0, math.pi * 2)
		local r = ctx.rng:range(ring[1], ring[2]) * ctx.H
		local x, z = math.cos(a) * r, math.sin(a) * r
		if math.abs(x) + sx / 2 < limit and math.abs(z) + sz / 2 < limit and not overlaps(ctx, x, z, sx, sz, spec.margin or 40) then
			return x, z
		end
	end
	return nil, nil
end

local function count(ctx: Ctx, spec: any): number
	return if spec.count then ctx.rng:int(spec.count[1], spec.count[2]) else 1
end

-- HILL -------------------------------------------------------------------------------------------

local function hill(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local sx = spec.size[1] + ctx.rng:range(-(spec.jitter or 0), spec.jitter or 0)
		local sz = spec.size[2] + ctx.rng:range(-(spec.jitter or 0), spec.jitter or 0)
		local h = spec.height
		local slope = spec.slope or 3.2
		local len = h * slope
		local x, z = findSpot(ctx, spec, sx + len * 2, sz + len * 2)
		if not x or not z then
			continue
		end
		local top, side = spec.top, spec.side or spec.top
		geo(ctx, "platform", "Block", sx, h, sz, x, h / 2, z, 0, top.color, top.material, true)
		-- Slopes: full-length wedges on X sides, inset wedges on Z sides (corners stay smooth enough).
		geo(ctx, "ramp", "Wedge", sz + len * 1.2, h, len, x + sx / 2 + len / 2, h / 2, z, -90, side.color, side.material, true)
		geo(ctx, "ramp", "Wedge", sz + len * 1.2, h, len, x - sx / 2 - len / 2, h / 2, z, 90, side.color, side.material, true)
		geo(ctx, "ramp", "Wedge", sx, h, len, x, h / 2, z + sz / 2 + len / 2, 180, side.color, side.material, true)
		geo(ctx, "ramp", "Wedge", sx, h, len, x, h / 2, z - sz / 2 - len / 2, 0, side.color, side.material, true)
		if spec.cap then
			-- A softer rounded cap (decor) so it reads as a mound, not a box.
			geo(ctx, "decor", "Cylinder", 1.2, sx * 0.9, sz * 0.9, x, h + 0.1, z, 0, spec.cap.color, spec.cap.material or top.material, false, { roll = 90 })
		end
		platform(ctx, spec.id or "Hill", "hill", x, z, sx, sz, h)
		block(ctx, "ramp", x, z, sx + len * 2, sz + len * 2, 0)
	end
end

-- STAIRS -----------------------------------------------------------------------------------------

local function stairs(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local n = spec.steps
		local stepH, stepD, width = spec.stepHeight, spec.stepDepth, spec.width
		local landing = spec.landing or { width, width }
		local runLen = n * stepD + landing[2]
		local alongX = ctx.rng:chance(0.5)
		local sx, sz = if alongX then runLen else width, if alongX then width else runLen
		local x, z = findSpot(ctx, spec, sx, sz)
		if not x or not z then
			continue
		end
		local dir = if ctx.rng:chance(0.5) then 1 else -1
		for i = 1, n do
			local h = i * stepH
			local offset = -runLen / 2 + (i - 0.5) * stepD
			local px = if alongX then x + offset * dir else x
			local pz = if alongX then z else z + offset * dir
			local color = if spec.colors then spec.colors[(i - 1) % #spec.colors + 1] else spec.color
			geo(ctx, "ramp", "Block", if alongX then stepD else width, h, if alongX then width else stepD, px, h / 2, pz, 0, color, spec.material, true)
		end
		local topH = (n + 1) * stepH
		local lo = -runLen / 2 + n * stepD + landing[2] / 2
		local lx = if alongX then x + lo * dir else x
		local lz = if alongX then z else z + lo * dir
		local lsx = if alongX then landing[2] else landing[1]
		local lsz = if alongX then landing[1] else landing[2]
		geo(ctx, "platform", "Block", lsx, topH, lsz, lx, topH / 2, lz, 0, spec.landingColor or spec.color, spec.material, true)
		block(ctx, "ramp", x, z, sx, sz, 0)
		platform(ctx, spec.id or "Stairs", "block", lx, lz, lsx, lsz, topH)
	end
end

-- BRIDGE -----------------------------------------------------------------------------------------

local function bridge(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local L, W, h = spec.length, spec.width, spec.height
		local rampLen = h * (spec.slope or 3)
		local total = L + rampLen * 2
		local alongX = ctx.rng:chance(0.5)
		local sx, sz = if alongX then total else W, if alongX then W else total
		local x, z = findSpot(ctx, spec, sx, sz)
		if not x or not z then
			continue
		end
		local deckT = 2
		local dsx, dsz = if alongX then L else W, if alongX then W else L
		geo(ctx, "platform", "Block", dsx, deckT, dsz, x, h - deckT / 2, z, 0, spec.deck.color, spec.deck.material, true)
		-- Planks / stripes across the deck.
		local planks = math.floor(L / 8)
		for i = 0, planks - 1, 2 do
			local o = -L / 2 + (i + 0.5) * 8
			geo(ctx, "decor", "Block", if alongX then 7 else W, 0.2, if alongX then W else 7, if alongX then x + o else x, h + 0.1, if alongX then z else z + o, 0, spec.deck.stripe or spec.deck.color, spec.deck.material, false)
		end
		-- Ramps up both ends.
		for _, s in { -1, 1 } do
			local o = s * (L / 2 + rampLen / 2)
			local rx = if alongX then x + o else x
			local rz = if alongX then z else z + o
			local yaw = if alongX then (if s > 0 then -90 else 90) else (if s > 0 then 180 else 0)
			geo(ctx, "ramp", "Wedge", W, h, rampLen, rx, h / 2, rz, yaw, spec.deck.color, spec.deck.material, true)
		end
		-- Posts and rails.
		local posts = math.max(2, math.floor(L / 40))
		for i = 0, posts do
			local o = -L / 2 + L * i / posts
			for _, side in { -1, 1 } do
				local px = if alongX then x + o else x + side * (W / 2 - 2)
				local pz = if alongX then z + side * (W / 2 - 2) else z + o
				geo(ctx, "decor", "Cylinder", h - deckT, 4, 4, px, (h - deckT) / 2, pz, 0, spec.post or spec.deck.color, spec.deck.material, true, { roll = 90 })
				if spec.rail then
					geo(ctx, "decor", "Cylinder", 10, 2, 2, px, h + 5, pz, 0, spec.rail, spec.deck.material, false, { roll = 90 })
				end
			end
		end
		if spec.rail then
			for _, side in { -1, 1 } do
				local rx = if alongX then x else x + side * (W / 2 - 2)
				local rz = if alongX then z + side * (W / 2 - 2) else z
				geo(ctx, "decor", "Block", if alongX then L else 2, 2, if alongX then 2 else L, rx, h + 10, rz, 0, spec.rail, spec.deck.material, false)
			end
		end
		platform(ctx, spec.id or "Bridge", "bridge", x, z, dsx, dsz, h)
		local o = L / 2 + rampLen / 2
		for _, s in { -1, 1 } do
			block(ctx, "ramp", if alongX then x + s * o else x, if alongX then z else z + s * o, if alongX then rampLen else W, if alongX then W else rampLen, 0)
		end
	end
end

-- POOL -------------------------------------------------------------------------------------------

local function pool(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local sx = spec.size[1] + ctx.rng:range(-(spec.jitter or 0), spec.jitter or 0)
		local sz = spec.size[2] + ctx.rng:range(-(spec.jitter or 0), spec.jitter or 0)
		local x, z = findSpot(ctx, spec, sx + 20, sz + 20)
		if not x or not z then
			continue
		end
		local rimH, rimW = spec.rimHeight or 3, spec.rimWidth or 6
		local rim = spec.rim
		if spec.round then
			-- Round pond: a ring of rim stones.
			local stones = math.floor((sx + sz) * 0.12)
			for i = 1, stones do
				local a = i / stones * math.pi * 2
				local px, pz = x + math.cos(a) * sx / 2, z + math.sin(a) * sz / 2
				local s = rimW * (0.9 + ((i * 37) % 7) / 14)
				geo(ctx, "decor", "Ball", s, rimH * 1.4, s, px, rimH * 0.4, pz, 0, rim.color, rim.material, true)
			end
			geo(ctx, "decor", "Cylinder", 0.4, sx, sz, x, 0.3, z, 0, spec.bottom or spec.water.color, "SmoothPlastic", false, { roll = 90 })
			geo(ctx, "water", "Cylinder", 0.3, sx - 2, sz - 2, x, rimH * 0.5, z, 0, spec.water.color, "Glass", false, { roll = 90, transparency = spec.water.transparency or 0.45 })
		else
			for _, s in { -1, 1 } do
				geo(ctx, "decor", "Block", sx + rimW, rimH, rimW, x, rimH / 2, z + s * sz / 2, 0, rim.color, rim.material, true)
				geo(ctx, "decor", "Block", rimW, rimH, sz, x + s * sx / 2, rimH / 2, z, 0, rim.color, rim.material, true)
			end
			geo(ctx, "decor", "Block", sx, 0.4, sz, x, 0.3, z, 0, spec.bottom or spec.water.color, "SmoothPlastic", false)
			geo(ctx, "water", "Block", sx - 1, 0.3, sz - 1, x, rimH * 0.55, z, 0, spec.water.color, "Glass", false, { transparency = spec.water.transparency or 0.45 })
		end
		-- Floating decor (lily pads, rubber rings...): flat discs on the water.
		for i = 1, spec.floaters and spec.floaters.count or 0 do
			local fx = x + ctx.rng:range(-sx * 0.35, sx * 0.35)
			local fz = z + ctx.rng:range(-sz * 0.35, sz * 0.35)
			local d = spec.floaters.size * ctx.rng:range(0.7, 1.2)
			geo(ctx, "decor", "Cylinder", 0.4, d, d, fx, rimH * 0.55 + 0.3, fz, 0, spec.floaters.colors[(i - 1) % #spec.floaters.colors + 1], "SmoothPlastic", false, { roll = 90 })
		end
		-- Rims are solid footprints; the inside stays open floor so things can sit in the water.
		for _, s in { -1, 1 } do
			block(ctx, "solid", x, z + s * sz / 2, sx + rimW, rimW + 4, 0)
			block(ctx, "solid", x + s * sx / 2, z, rimW + 4, sz, 0)
		end
	end
end

-- BOWL -------------------------------------------------------------------------------------------

local function bowl(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local inner, h = spec.inner, spec.height
		local len = h * (spec.slope or 2.6)
		local outer = inner + len * 2
		local x, z = findSpot(ctx, spec, outer, outer)
		if not x or not z then
			continue
		end
		local c = spec.wall
		for i = 0, 3 do
			local yaw = i * 90
			local a = math.rad(yaw)
			local ox, oz = math.sin(a), math.cos(a)
			-- Wedge high side faces outward: the inside slopes down to the floor.
			geo(ctx, "ramp", "Wedge", inner, h, len, x + ox * (inner / 2 + len / 2), h / 2, z + oz * (inner / 2 + len / 2), yaw, c.color, c.material, true)
		end
		for _, sx in { -1, 1 } do
			for _, sz in { -1, 1 } do
				local cx, cz = x + sx * (inner / 2 + len / 2), z + sz * (inner / 2 + len / 2)
				geo(ctx, "platform", "Block", len, h, len, cx, h / 2, cz, 0, c.color, c.material, true)
				platform(ctx, spec.id or "BowlRim", "block", cx, cz, len, len, h)
			end
		end
		if spec.rim then
			for i = 0, 3 do
				local a = math.rad(i * 90)
				local ox, oz = math.sin(a), math.cos(a)
				geo(ctx, "decor", "Block", if oz ~= 0 then outer else 3, 3, if oz ~= 0 then 3 else outer, x + ox * (outer / 2 - 1.5), h + 1.5, z + oz * (outer / 2 - 1.5), 0, spec.rim, c.material, false)
			end
		end
		if spec.floor then
			geo(ctx, "decor", "Block", inner, 0.4, inner, x, 0.3, z, 0, spec.floor.color, spec.floor.material or "SmoothPlastic", false)
		end
		for i = 0, 3 do
			local a = math.rad(i * 90)
			local ox, oz = math.sin(a), math.cos(a)
			block(ctx, "ramp", x + ox * (inner / 2 + len / 2), z + oz * (inner / 2 + len / 2), if oz ~= 0 then inner else len, if oz ~= 0 then len else inner, 0)
		end
	end
end

-- PILLARS ----------------------------------------------------------------------------------------

local function pillars(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local r = spec.radius * ctx.rng:range(0.85, 1.15)
		local h = spec.height * ctx.rng:range(0.85, 1.15)
		local foot = (spec.canopy and spec.canopy.solidFoot) or r * 2
		local x, z = findSpot(ctx, spec, foot + 10, foot + 10)
		if not x or not z then
			continue
		end
		if spec.stripes then
			local segs = math.max(2, math.floor(h / spec.stripes.size))
			local segH = h / segs
			for i = 0, segs - 1 do
				geo(ctx, "pillar", "Cylinder", segH, r * 2, r * 2, x, segH * (i + 0.5), z, 0, spec.stripes.colors[i % #spec.stripes.colors + 1], spec.material, true, { roll = 90 })
			end
		else
			geo(ctx, "pillar", "Cylinder", h, r * 2, r * 2, x, h / 2, z, 0, spec.color, spec.material, true, { roll = 90 })
			-- Root flare.
			geo(ctx, "decor", "Cylinder", r * 0.6, r * 2.8, r * 2.8, x, r * 0.3, z, 0, spec.color, spec.material, true, { roll = 90 })
		end
		local canopy = spec.canopy
		if canopy then
			if canopy.shape == "disc" then
				geo(ctx, "decor", "Cylinder", canopy.thick or 6, canopy.size, canopy.size, x, h + (canopy.thick or 6) / 2, z, 0, canopy.color, canopy.material, false, { roll = 90 })
				if canopy.swirl then
					geo(ctx, "decor", "Cylinder", (canopy.thick or 6) + 0.4, canopy.size * 0.6, canopy.size * 0.6, x, h + (canopy.thick or 6) / 2, z, 0, canopy.swirl, canopy.material, false, { roll = 90 })
				end
			else
				-- A cloud of leafy balls.
				for i = 1, canopy.blobs or 5 do
					local a = i / (canopy.blobs or 5) * math.pi * 2
					local s = canopy.size * ctx.rng:range(0.55, 0.8)
					local off = canopy.size * 0.3
					local color = if canopy.colors then canopy.colors[(i - 1) % #canopy.colors + 1] else canopy.color
					geo(ctx, "decor", "Ball", s, s * 0.8, s, x + math.cos(a) * off, h + canopy.size * 0.1 + ((i % 2) * s * 0.15), z + math.sin(a) * off, 0, color, canopy.material, false)
				end
				geo(ctx, "decor", "Ball", canopy.size * 0.75, canopy.size * 0.6, canopy.size * 0.75, x, h + canopy.size * 0.35, z, 0, canopy.color, canopy.material, false)
			end
		end
		block(ctx, "solid", x, z, foot, foot, 0)
	end
end

-- PATH / RUG -------------------------------------------------------------------------------------

local function path(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local H = ctx.H - 40
		-- Start on one edge, wander across to the far side.
		local side = ctx.rng:int(0, 3)
		local t = ctx.rng:range(-H * 0.6, H * 0.6)
		local x, z, heading
		if side == 0 then
			x, z, heading = t, -H, 0
		elseif side == 1 then
			x, z, heading = t, H, math.pi
		elseif side == 2 then
			x, z, heading = -H, t, math.pi / 2
		else
			x, z, heading = H, t, -math.pi / 2
		end
		local seg = spec.segment or 50
		local w = spec.width
		local y = spec.y or 0.3 -- clear of the floor + tiles so it never z-fights at a distance
		local base = heading
		local bend = 0
		for i = 1, 200 do
			-- Meander, but keep heading across the map so it always reaches the far side.
			bend = math.clamp(bend + ctx.rng:range(-(spec.wiggle or 0.35), spec.wiggle or 0.35), -0.9, 0.9)
			heading = base + bend
			local nx, nz = x + math.sin(heading) * seg, z + math.cos(heading) * seg
			if math.abs(nx) > H or math.abs(nz) > H then
				break
			end
			local mx, mz = (x + nx) / 2, (z + nz) / 2
			-- Overlapping segments + round joints keep curves continuous.
			geo(ctx, spec.kind or "path", "Block", w, 0.4, seg + 2, mx, y, mz, math.deg(heading), spec.color, spec.material, false, { transparency = spec.transparency })
			geo(ctx, spec.kind or "path", "Cylinder", 0.4, w, w, nx, y + 0.02, nz, 0, spec.color, spec.material, false, { roll = 90, transparency = spec.transparency })
			-- Reserve the route so later set pieces don't bury it (props may still sit on it).
			block(ctx, "path", mx, mz, w + 16, w + 16, 0)
			if spec.edge and i % 2 == 0 then
				for _, s in { -1, 1 } do
					local ex = mx + math.cos(heading) * s * (w / 2 + 3)
					local ez = mz - math.sin(heading) * s * (w / 2 + 3)
					geo(ctx, "decor", "Ball", spec.edge.size, spec.edge.size * 0.6, spec.edge.size, ex, spec.edge.size * 0.2, ez, 0, spec.edge.colors[(i // 2) % #spec.edge.colors + 1], spec.edge.material, false)
				end
			end
			x, z = nx, nz
		end
	end
end

local function rug(ctx: Ctx, spec: any)
	for _ = 1, count(ctx, spec) do
		local sx = spec.size[1] * ctx.rng:range(0.9, 1.1)
		local sz = spec.size[2] * ctx.rng:range(0.9, 1.1)
		local x, z = findSpot(ctx, spec, sx, sz)
		if not x or not z then
			continue
		end
		local y = 0.3
		if spec.round then
			for i, color in spec.colors do
				local k = 1 - (i - 1) / (#spec.colors + 0.5)
				geo(ctx, "rug", "Cylinder", 0.4, sx * k, sz * k, x, y + i * 0.08, z, 0, color, spec.material, false, { roll = 90 })
			end
		else
			local yaw = ctx.rng:range(-25, 25)
			geo(ctx, "rug", "Block", sx, 0.4, sz, x, y, z, yaw, spec.colors[1], spec.material, false)
			-- Stripes.
			local stripes = #spec.colors - 1
			for i = 1, stripes do
				local o = -sz / 2 + sz * i / (stripes + 1)
				local a = math.rad(yaw)
				geo(ctx, "rug", "Block", sx, 0.4, sz * 0.08, x + math.sin(a) * o, y + 0.1, z + math.cos(a) * o, yaw, spec.colors[i + 1], spec.material, false)
			end
		end
	end
end

local BUILDERS: { [string]: (Ctx, any) -> () } = {
	hill = hill,
	stairs = stairs,
	bridge = bridge,
	pool = pool,
	bowl = bowl,
	pillars = pillars,
	path = path,
	rug = rug,
}

-- Paths and rugs go first (they're flat decor and never block anything); solid pieces after.
local ORDER = { path = 1, rug = 2, bowl = 3, hill = 4, pool = 5, bridge = 6, stairs = 7, pillars = 8 }

function WorldFeatures.build(kit: any, ctx: Ctx): { [string]: number }
	local stats: { [string]: number } = {}
	local list = table.clone(kit.features or {})
	table.sort(list, function(a, b)
		return (ORDER[a.type] or 9) < (ORDER[b.type] or 9)
	end)
	for _, spec in list do
		local fn = BUILDERS[spec.type]
		assert(fn, "unknown world feature type " .. tostring(spec.type))
		local before = #ctx.out
		fn(ctx, spec)
		stats[spec.type] = (stats[spec.type] or 0) + (#ctx.out - before)
	end
	return stats
end

return WorldFeatures
