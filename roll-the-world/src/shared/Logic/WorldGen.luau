--!strict
-- Seeded world generation from a World Kit. Pure Luau (no Roblox types) so the same seed always
-- produces the same map and it can be tested headless.
--
-- Output: static geometry (floor, walls, platforms, ramps) the server builds as anchored parts,
-- plus a compact prop list the server sends to clients (clients build the visuals).

local Rng = require(script.Parent.Parent.Util.Rng)
local SpatialHash = require(script.Parent.Parent.Util.SpatialHash)
local PropLibrary = require(script.Parent.PropLibrary)
local Rarity = require(script.Parent.Parent.Config.Rarity)
local Mutations = require(script.Parent.Parent.Data.Mutations)

export type Geometry = {
	shape: string, -- "Block" | "Wedge" | "Cylinder"
	size: { number },
	pos: { number },
	yaw: number, -- degrees
	color: string,
	material: string,
	collide: boolean,
	transparency: number?,
	kind: string,
}

export type Placed = {
	id: number,
	uid: number,
	x: number,
	y: number,
	z: number,
	yaw: number, -- radians
	scale: number,
	mutation: number,
}

export type Platform = {
	id: string,
	kind: string,
	x: number,
	z: number,
	sx: number,
	sz: number,
	height: number,
	spawn: boolean,
}

export type Result = {
	kitId: string,
	seed: number,
	arenaHalf: number,
	geometry: { Geometry },
	props: { Placed },
	platforms: { Platform },
	spawns: { { number } },
	spawnCenter: { number },
	landmarkId: number,
	stats: { [string]: number },
}

local WorldGen = {}

local WALL_THICK = 40
local EDGE_MARGIN = 50

local function geo(out: { Geometry }, kind: string, shape: string, sx: number, sy: number, sz: number, x: number, y: number, z: number, yaw: number, color: string, material: string, collide: boolean, transparency: number?)
	table.insert(out, {
		shape = shape,
		size = { sx, sy, sz },
		pos = { x, y, z },
		yaw = yaw,
		color = color,
		material = material,
		collide = collide,
		transparency = transparency,
		kind = kind,
	})
end

local function insideRect(p: Platform, x: number, z: number, margin: number): boolean
	return math.abs(x - p.x) <= p.sx / 2 - margin and math.abs(z - p.z) <= p.sz / 2 - margin
end

local function rectsOverlap(a: Platform, x: number, z: number, sx: number, sz: number, margin: number): boolean
	return math.abs(a.x - x) < (a.sx + sx) / 2 + margin and math.abs(a.z - z) < (a.sz + sz) / 2 + margin
end

-- Floor + walls --------------------------------------------------------------------------------

local function buildArena(kit: any, out: { Geometry })
	local H = kit.arenaHalf
	local floor = kit.floor
	local full = H * 2 + WALL_THICK * 2
	geo(out, "floor", "Block", full, 20, full, 0, -10, 0, 0, floor.color, floor.material, true)
	-- Decorative checker tiles laid just above the slab (non-colliding, no seams for the ball).
	local tile = floor.tile
	if tile then
		local n = math.ceil(H * 2 / tile.size)
		local start = -n * tile.size / 2 + tile.size / 2
		for ix = 0, n - 1 do
			for iz = 0, n - 1 do
				if (ix + iz) % 2 == 1 then
					local x = start + ix * tile.size
					local z = start + iz * tile.size
					if math.abs(x) < H and math.abs(z) < H then
						geo(out, "tile", "Block", tile.size, 0.06, tile.size, x, 0.03, z, 0, tile.colors[2], tile.material, false)
					end
				end
			end
		end
	end

	local walls = kit.walls
	local h = walls.height
	for side = 0, 3 do
		local yaw = side * 90
		local nx, nz = 0, 0
		if side == 0 then
			nz = 1
		elseif side == 1 then
			nx = 1
		elseif side == 2 then
			nz = -1
		else
			nx = -1
		end
		local cx, cz = nx * (H + WALL_THICK / 2), nz * (H + WALL_THICK / 2)
		local length = full
		local sx, sz = if nx == 0 then length else WALL_THICK, if nx == 0 then WALL_THICK else length
		geo(out, "wall", "Block", sx, h, sz, cx, h / 2, cz, 0, walls.color, walls.material, true)
		-- Invisible barrier so huge hopping balls can never leave the arena.
		geo(out, "barrier", "Block", sx, 1600, sz, cx, h + 800, cz, 0, "#ffffff", "SmoothPlastic", true, 1)
		-- Baseboard + top trim.
		local bx, bz = nx * (H - 2), nz * (H - 2)
		local tsx, tsz = if nx == 0 then H * 2 else 4, if nx == 0 then 4 else H * 2
		geo(out, "decor", "Block", tsx, 14, tsz, bx, 7, bz, 0, walls.baseboard, "SmoothPlastic", true)
		geo(out, "decor", "Block", tsx, 10, tsz, bx, h - 5, bz, 0, walls.trim, "SmoothPlastic", false)

		if walls.stripes then
			local count = math.floor(H * 2 / walls.stripes.width)
			for i = 0, count - 1, 2 do
				local offset = -H + walls.stripes.width * (i + 0.5)
				local px = if nx == 0 then offset else nx * (H - 0.6)
				local pz = if nx == 0 then nz * (H - 0.6) else offset
				local ssx = if nx == 0 then walls.stripes.width else 1
				local ssz = if nx == 0 then 1 else walls.stripes.width
				geo(out, "decor", "Block", ssx, h - 30, ssz, px, (h - 30) / 2 + 14, pz, 0, walls.stripes.colors[2], "SmoothPlastic", false)
			end
		end
		if walls.windows and (side == 0 or side == 1) then
			local win = walls.windows
			for i = 1, win.count do
				local offset = -H + (H * 2) * i / (win.count + 1)
				local px = if nx == 0 then offset else nx * (H - 1)
				local pz = if nx == 0 then nz * (H - 1) else offset
				local wsx = if nx == 0 then 150 else 2
				local wsz = if nx == 0 then 2 else 150
				geo(out, "decor", "Block", wsx + (if nx == 0 then 16 else 0), 196, wsz + (if nx == 0 then 0 else 16), px, h * 0.62, pz, 0, "#ffffff", "SmoothPlastic", false)
				geo(out, "window", "Block", wsx, 180, wsz, px - nx * 0.6, h * 0.62, pz - nz * 0.6, 0, win.glow, "Neon", false)
				geo(out, "decor", "Block", if nx == 0 then 8 else 3, 180, if nx == 0 then 3 else 8, px - nx * 1.2, h * 0.62, pz - nz * 1.2, 0, "#ffffff", "SmoothPlastic", false)
			end
		end
		if walls.cabinets and side == 2 then
			-- A row of low cabinets along the back wall: big early obstacles that later get dwarfed.
			local cab = walls.cabinets
			local count = 6
			for i = 0, count - 1 do
				local w = (H * 2 - 40) / count
				local x = -H + 20 + w * (i + 0.5)
				local z = nz * (H - cab.depth / 2 - 2)
				geo(out, "cabinet", "Block", w - 6, cab.height, cab.depth, x, cab.height / 2, z, 0, cab.color, "SmoothPlastic", true)
				geo(out, "decor", "Block", w - 2, 6, cab.depth + 4, x, cab.height + 3, z, 0, "#f4f1ec", "Marble", true)
				geo(out, "decor", "Block", w * 0.4, 3, 2, x, cab.height * 0.75, z - nz * (cab.depth / 2 + 1), 0, cab.handle, "Metal", false)
			end
		end
		if walls.fence then
			local f = walls.fence
			local count = math.floor(H * 2 / f.postSpacing)
			for i = 0, count do
				local offset = -H + i * (H * 2 / count)
				local px = if nx == 0 then offset else nx * (H - 4)
				local pz = if nx == 0 then nz * (H - 4) else offset
				geo(out, "decor", "Block", 10, h + 20, 10, px, (h + 20) / 2, pz, 0, f.color, "WoodPlanks", true)
				geo(out, "decor", "Wedge", 10, 8, 10, px, h + 24, pz, yaw, f.color, "WoodPlanks", false)
			end
		end
	end
end

-- Platforms + ramps ----------------------------------------------------------------------------

local function buildPlatformGeometry(spec: any, p: Platform, out: { Geometry }, rng: Rng.Rng, blocked: { Platform })
	local h = p.height
	if spec.kind == "table" then
		local topT = 6
		geo(out, "platform", "Block", p.sx, topT, p.sz, p.x, h - topT / 2, p.z, 0, spec.top.color, spec.top.material, true)
		if spec.cloth then
			geo(out, "decor", "Block", p.sx * 0.7, 0.4, p.sz + 4, p.x, h + 0.2, p.z, 0, spec.cloth, "Fabric", false)
			geo(out, "decor", "Block", p.sx * 0.7, h * 0.35, 0.6, p.x, h - h * 0.175, p.z + p.sz / 2 + 2, 0, spec.cloth, "Fabric", false)
			geo(out, "decor", "Block", p.sx * 0.7, h * 0.35, 0.6, p.x, h - h * 0.175, p.z - p.sz / 2 - 2, 0, spec.cloth, "Fabric", false)
		end
		local legW = math.max(8, p.sx * 0.05)
		for _, sx in { -1, 1 } do
			for _, sz in { -1, 1 } do
				geo(out, "platform", "Block", legW, h - topT, legW, p.x + sx * (p.sx / 2 - legW), (h - topT) / 2, p.z + sz * (p.sz / 2 - legW), 0, spec.side.color, spec.side.material, true)
			end
		end
		return
	end

	-- Solid block platform with a top slab and trim lip.
	geo(out, "platform", "Block", p.sx, h - 1, p.sz, p.x, (h - 1) / 2, p.z, 0, spec.side.color, spec.side.material, true)
	geo(out, "platform", "Block", p.sx, 1, p.sz, p.x, h - 0.5, p.z, 0, spec.top.color, spec.top.material, true)
	if spec.trim then
		geo(out, "decor", "Block", p.sx + 2, spec.trim.height, p.sz + 2, p.x, h - 1 - spec.trim.height / 2, p.z, 0, spec.trim.color, "SmoothPlastic", false)
	end

	local ramps = spec.ramps
	if not ramps then
		return
	end
	-- Candidate edges: +X, -X, +Z, -Z. Long edges are preferred.
	local edges = {
		{ 1, 0, p.sz },
		{ -1, 0, p.sz },
		{ 0, 1, p.sx },
		{ 0, -1, p.sx },
	}
	rng:shuffle(edges)
	table.sort(edges, function(a, b)
		return a[3] > b[3]
	end)
	local len = math.max(h * 3, 40)
	local placed = 0
	for _, edge in edges do
		if placed >= ramps.count then
			break
		end
		local ox, oz, edgeLen = edge[1], edge[2], edge[3]
		local along = rng:range(-edgeLen * 0.3, edgeLen * 0.3)
		local cx = p.x + ox * (p.sx / 2 + len / 2) + (if ox == 0 then along else 0)
		local cz = p.z + oz * (p.sz / 2 + len / 2) + (if oz == 0 then along else 0)
		local sx = if ox == 0 then ramps.width else len
		local sz = if ox == 0 then len else ramps.width
		local fits = math.abs(cx) + sx / 2 < p.sx + 9999 -- always true; kept for clarity
		local clear = true
		for _, other in blocked do
			if other ~= p and rectsOverlap(other, cx, cz, sx, sz, 4) then
				clear = false
				break
			end
		end
		if fits and clear then
			-- Wedge high end (+Z local) faces the platform.
			local yaw = math.deg(math.atan2(-ox, -oz))
			geo(out, "ramp", "Wedge", ramps.width, h, len, cx, h / 2, cz, yaw, ramps.color, ramps.material, true)
			table.insert(blocked, { id = "ramp", kind = "ramp", x = cx, z = cz, sx = sx, sz = sz, height = 0, spawn = false })
			placed += 1
		end
	end
end

local function placePlatforms(kit: any, rng: Rng.Rng, out: { Geometry }): ({ Platform }, { Platform })
	local H = kit.arenaHalf
	local platforms: { Platform } = {}
	local blocked: { Platform } = {}
	local specsFor: { [Platform]: any } = {}
	for _, spec in kit.platforms do
		local count = if spec.count then rng:int(spec.count[1], spec.count[2]) else 1
		for _ = 1, count do
			for _attempt = 1, 40 do
				local sx = spec.size[1] + rng:range(-spec.jitter, spec.jitter)
				local sz = spec.size[2] + rng:range(-spec.jitter, spec.jitter)
				if rng:chance(0.5) and spec.placement ~= "center" then
					sx, sz = sz, sx
				end
				local x, z
				if spec.placement == "center" then
					x, z = rng:range(-30, 30), rng:range(-30, 30)
				else
					local a = rng:range(0, math.pi * 2)
					local r = rng:range(spec.ring[1], spec.ring[2]) * H
					x, z = math.cos(a) * r, math.sin(a) * r
				end
				local limit = H - EDGE_MARGIN - 130
				if math.abs(x) + sx / 2 < limit and math.abs(z) + sz / 2 < limit then
					local ok = true
					for _, other in blocked do
						if rectsOverlap(other, x, z, sx, sz, 150) then
							ok = false
							break
						end
					end
					if ok then
						local p: Platform = {
							id = spec.id,
							kind = spec.kind,
							x = x,
							z = z,
							sx = sx,
							sz = sz,
							height = spec.height,
							spawn = spec.spawn == true,
						}
						table.insert(platforms, p)
						table.insert(blocked, p)
						specsFor[p] = spec
						break
					end
				end
			end
		end
	end
	for _, p in platforms do
		buildPlatformGeometry(specsFor[p], p, out, rng, blocked)
	end
	return platforms, blocked
end

-- Props ----------------------------------------------------------------------------------------

type PlaceCtx = {
	rng: Rng.Rng,
	kit: any,
	H: number,
	platforms: { Platform },
	blocked: { Platform },
	hash: SpatialHash.SpatialHash,
	props: { Placed },
	spawnCenter: { number },
	nextId: number,
}

-- Returns surface height at (x, z) for a prop with this footprint/height, or nil if not allowed.
local function surfaceAt(ctx: PlaceCtx, x: number, z: number, footprint: number, height: number): number?
	if math.abs(x) > ctx.H - EDGE_MARGIN - footprint or math.abs(z) > ctx.H - EDGE_MARGIN - footprint then
		return nil
	end
	for _, b in ctx.blocked do
		if b.kind == "ramp" then
			if math.abs(x - b.x) < b.sx / 2 + footprint and math.abs(z - b.z) < b.sz / 2 + footprint then
				return nil
			end
		end
	end
	for _, p in ctx.platforms do
		local inside = math.abs(x - p.x) < p.sx / 2 + footprint and math.abs(z - p.z) < p.sz / 2 + footprint
		if inside then
			if insideRect(p, x, z, footprint) then
				if p.kind == "table" and height < p.height - 10 then
					return 0 -- tucked under the table
				end
				return p.height
			end
			return nil -- straddling an edge
		end
	end
	return 0
end

local function tryPlace(ctx: PlaceCtx, def: PropLibrary.PropDef, x: number, z: number, scale: number, mutation: number, spacing: number): Placed?
	local m = def.metrics
	local fp = m.footprint * scale
	local y = surfaceAt(ctx, x, z, fp, m.sy * scale)
	if not y then
		return nil
	end
	local near = ctx.hash:query(x, z, fp * spacing + 1)
	for _, otherId in near do
		local other = ctx.props[otherId]
		local ofp = PropLibrary.ByUid[other.uid].metrics.footprint * other.scale
		local dx, dz = other.x - x, other.z - z
		local minDist = (fp + ofp) * spacing
		if dx * dx + dz * dz < minDist * minDist and math.abs(other.y - y) < 5 then
			return nil
		end
	end
	local id = ctx.nextId
	ctx.nextId += 1
	local placed: Placed = {
		id = id,
		uid = def.uid,
		x = x,
		y = y,
		z = z,
		yaw = ctx.rng:range(0, math.pi * 2),
		scale = scale,
		mutation = mutation,
	}
	ctx.props[id] = placed
	ctx.hash:insert(id, x, z, fp)
	return placed
end

local function rollMutation(rng: Rng.Rng, def: PropLibrary.PropDef): number
	if def.landmark then
		return 0
	end
	for _, mut in Mutations.List do
		if mut.weight > 0 and rng:chance(mut.weight) then
			return mut.index
		end
	end
	return 0
end

local function sampleInRing(ctx: PlaceCtx, ring: { number }): (number, number)
	local rng = ctx.rng
	local H = ctx.H
	local cx, cz = ctx.spawnCenter[1], ctx.spawnCenter[3]
	for _ = 1, 24 do
		local x, z = rng:range(-H, H), rng:range(-H, H)
		local d = math.sqrt((x - cx) ^ 2 + (z - cz) ^ 2) / H
		if d >= ring[1] and d <= ring[2] then
			return x, z
		end
	end
	-- Fall back to polar sampling inside the ring.
	local a = rng:range(0, math.pi * 2)
	local r = rng:range(ring[1], ring[2]) * H
	return cx + math.cos(a) * r, cz + math.sin(a) * r
end

-- Pick a point on top of a random platform (area weighted) that lies within the ring.
local function samplePlatformTop(ctx: PlaceCtx, ring: { number }): (number?, number?)
	local rng = ctx.rng
	local H = ctx.H
	local cx, cz = ctx.spawnCenter[1], ctx.spawnCenter[3]
	local candidates = {}
	for _, p in ctx.platforms do
		table.insert(candidates, p)
	end
	if #candidates == 0 then
		return nil, nil
	end
	for _ = 1, 12 do
		local p = rng:weighted(candidates, function(c)
			return c.sx * c.sz
		end) :: Platform
		local x = p.x + rng:range(-p.sx / 2, p.sx / 2)
		local z = p.z + rng:range(-p.sz / 2, p.sz / 2)
		local d = math.sqrt((x - cx) ^ 2 + (z - cz) ^ 2) / H
		if d >= ring[1] - 0.05 and d <= ring[2] + 0.05 then
			return x, z
		end
	end
	return nil, nil
end

local function bandCandidates(kitId: string, lo: number, hi: number): { PropLibrary.PropDef }
	local out = {}
	for _, def in PropLibrary.ByKit[kitId] do
		local s = def.metrics.absorbSize
		if not def.critter and not def.landmark and s > lo and s <= hi then
			table.insert(out, def)
		end
	end
	return out
end

local function defWeight(def: PropLibrary.PropDef): number
	return Rarity.get(def.rarity).weight * def.weight
end

local function placeClusters(ctx: PlaceCtx, stats: { [string]: number })
	local rng = ctx.rng
	for _, cluster in ctx.kit.clusters do
		local count = rng:int(cluster.count[1], cluster.count[2])
		for _ = 1, count do
			local cx, cz = sampleInRing(ctx, cluster.ring)
			local placedAny = 0
			for _, item in cluster.items do
				local def = PropLibrary.find(ctx.kit.id, item[1])
				if def then
					for _ = 1, item[2] do
						for _attempt = 1, 6 do
							local a = rng:range(0, math.pi * 2)
							local r = cluster.radius * math.sqrt(rng:float())
							local scale = math.clamp(1 + rng:gauss() * 0.08, 0.85, 1.18)
							if tryPlace(ctx, def, cx + math.cos(a) * r, cz + math.sin(a) * r, scale, rollMutation(rng, def), 0.7) then
								placedAny += 1
								break
							end
						end
					end
				else
					warn("[WorldGen] cluster " .. cluster.id .. " references unknown prop " .. tostring(item[1]))
				end
			end
			stats.clusterProps = (stats.clusterProps or 0) + placedAny
		end
	end
end

local function placeBands(ctx: PlaceCtx, stats: { [string]: number })
	local rng = ctx.rng
	local lo = 0
	for bandIndex, band in ctx.kit.bands do
		local candidates = bandCandidates(ctx.kit.id, lo, band.max)
		local placed = 0
		if #candidates > 0 then
			for _ = 1, band.count do
				local def = rng:weighted(candidates, defWeight) :: PropLibrary.PropDef
				local scale = math.clamp(1 + rng:gauss() * 0.1, 0.82, 1.2)
				for _attempt = 1, 8 do
					local x, z
					if rng:chance(band.topBias) then
						x, z = samplePlatformTop(ctx, band.ring)
					end
					if not x then
						x, z = sampleInRing(ctx, band.ring)
					end
					if tryPlace(ctx, def, x :: number, z :: number, scale, rollMutation(rng, def), 0.9) then
						placed += 1
						break
					end
				end
			end
		end
		stats["band" .. bandIndex] = placed
		lo = band.max
	end
end

local function placeCritters(ctx: PlaceCtx, stats: { [string]: number })
	local rng = ctx.rng
	local n = 0
	for _, entry in ctx.kit.critters do
		local def = PropLibrary.find(ctx.kit.id, entry.id)
		if def and (entry.chance == nil or rng:chance(entry.chance)) then
			local count = rng:int(entry.count[1], entry.count[2])
			for _ = 1, count do
				for _attempt = 1, 10 do
					local x, z = sampleInRing(ctx, { 0.05, 1.2 })
					if tryPlace(ctx, def, x, z, math.clamp(1 + rng:gauss() * 0.06, 0.9, 1.12), rollMutation(rng, def), 1.2) then
						n += 1
						break
					end
				end
			end
		end
	end
	stats.critters = n
end

local function placeLandmark(ctx: PlaceCtx): number
	local def = PropLibrary.find(ctx.kit.id, ctx.kit.landmark.id)
	assert(def, "kit " .. ctx.kit.id .. " has no landmark prop")
	local rng = ctx.rng
	local H = ctx.H
	local fp = def.metrics.footprint
	local inset = H - fp - EDGE_MARGIN - 90
	for _attempt = 1, 30 do
		local x, z
		if ctx.kit.landmark.placement == "corner" then
			x = (if rng:chance(0.5) then 1 else -1) * inset * 0.92
			z = (if rng:chance(0.5) then 1 else -1) * inset * 0.92
		else
			local side = rng:int(0, 3)
			local along = rng:range(-inset * 0.6, inset * 0.6)
			if side == 0 then
				x, z = along, inset
			elseif side == 1 then
				x, z = inset, along
			elseif side == 2 then
				x, z = along, -inset * 0.75 -- back wall has cabinets
			else
				x, z = -inset, along
			end
		end
		local placed = tryPlace(ctx, def, x, z, 1, 0, 0.6)
		if placed then
			-- Face the arena centre.
			placed.yaw = math.atan2(-x, -z)
			return placed.id
		end
	end
	-- Guaranteed fallback: force it in on the floor near an edge.
	local id = ctx.nextId
	ctx.nextId += 1
	ctx.props[id] = { id = id, uid = def.uid, x = 0, y = 0, z = inset, yaw = math.pi, scale = 1, mutation = 0 }
	ctx.hash:insert(id, 0, inset, fp)
	return id
end

local function makeSpawns(spawnPlatform: Platform?, count: number, rng: Rng.Rng): { { number } }
	local spawns = {}
	if not spawnPlatform then
		for i = 1, count do
			local a = i / count * math.pi * 2
			table.insert(spawns, { math.cos(a) * 40, 4, math.sin(a) * 40 })
		end
		return spawns
	end
	local p = spawnPlatform
	local cols = 6
	local rows = math.ceil(count / cols)
	for i = 0, count - 1 do
		local c, r = i % cols, i // cols
		local x = p.x - p.sx * 0.38 + (c + 0.5) / cols * p.sx * 0.76 + rng:range(-6, 6)
		local z = p.z - p.sz * 0.3 + (r + 0.5) / rows * p.sz * 0.6 + rng:range(-6, 6)
		table.insert(spawns, { x, p.height + 3, z })
	end
	return spawns
end

function WorldGen.generate(kit: any, seed: number): Result
	local rng = Rng.new(seed)
	local geometry: { Geometry } = {}
	buildArena(kit, geometry)
	local platforms, blocked = placePlatforms(kit, rng:fork(1), geometry)

	local spawnPlatform: Platform? = nil
	for _, p in platforms do
		if p.spawn then
			spawnPlatform = p
			break
		end
	end
	local spawnCenter = if spawnPlatform then { spawnPlatform.x, spawnPlatform.height, spawnPlatform.z } else { 0, 0, 0 }

	local ctx: PlaceCtx = {
		rng = rng:fork(2),
		kit = kit,
		H = kit.arenaHalf,
		platforms = platforms,
		blocked = blocked,
		hash = SpatialHash.new(32),
		props = {},
		spawnCenter = spawnCenter,
		nextId = 1,
	}
	local stats: { [string]: number } = {}
	local landmarkId = placeLandmark(ctx)
	placeClusters(ctx, stats)
	placeBands(ctx, stats)
	placeCritters(ctx, stats)

	local props: { Placed } = {}
	for i = 1, ctx.nextId - 1 do
		local p = ctx.props[i]
		if p then
			table.insert(props, p)
		end
	end
	stats.total = #props

	return {
		kitId = kit.id,
		seed = seed,
		arenaHalf = kit.arenaHalf,
		geometry = geometry,
		props = props,
		platforms = platforms,
		spawns = makeSpawns(spawnPlatform, 24, rng:fork(3)),
		spawnCenter = spawnCenter,
		landmarkId = landmarkId,
		stats = stats,
	}
end

return WorldGen
