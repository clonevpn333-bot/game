--!nonstrict
-- Owns the round's world: builds static geometry from WorldGen, holds the authoritative prop table
-- in a spatial hash, and replicates compact prop state (never prop instances) to clients.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local SpatialHash = require(Shared.Util.SpatialHash)
local PropCodec = require(Shared.Util.PropCodec)
local WorldGen = require(Shared.Logic.WorldGen)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Kits = require(Shared.Data.Kits)
local Mutations = require(Shared.Data.Mutations)
local Tuning = require(Shared.Config.Tuning)

local WorldService = {}

export type PropState = {
	id: number,
	uid: number,
	def: any,
	x: number,
	y: number, -- ground level
	z: number,
	cy: number, -- world y of the contact sphere centre
	yaw: number,
	scale: number, -- placement scale (without mutation scale)
	effScale: number, -- placement scale * mutation scale
	mutation: number,
	absorbSize: number,
	radius: number,
	volume: number,
	landmark: boolean,
	critter: boolean,
	loot: boolean,
	activeAt: number, -- loot can't be grabbed until it lands
	expiresAt: number?,
}

WorldService.kit = nil
WorldService.seed = 0
WorldService.generation = nil
WorldService.props = {} :: { [number]: PropState }
WorldService.hash = SpatialHash.new(32)
WorldService.maxRadius = 0
WorldService.nextId = 1
WorldService.landmarkId = 0
WorldService.mapFolder = nil :: Model?
WorldService.roundId = 0

WorldService.PropRemoved = Signal.new()
WorldService.WorldLoaded = Signal.new()

local pendingRemovals = {}
local pendingMutations = {}
local pendingLoot = {}
local lootCount = 0

local function makeState(id: number, uid: number, x: number, y: number, z: number, yaw: number, scale: number, mutation: number, loot: boolean): PropState
	local def = PropLibrary.get(uid)
	local mut = Mutations.get(mutation)
	local eff = scale * (if mut then mut.scale else 1)
	local m = def.metrics
	return {
		id = id,
		uid = uid,
		def = def,
		x = x,
		y = y,
		z = z,
		cy = y + m.centerY * eff,
		yaw = yaw,
		scale = scale,
		effScale = eff,
		mutation = mutation,
		absorbSize = m.absorbSize * eff,
		radius = m.contactRadius * eff,
		volume = m.volume * eff * eff * eff,
		landmark = def.landmark,
		critter = def.critter ~= nil,
		loot = loot,
		activeAt = 0,
		expiresAt = nil,
	}
end

local function hexColor(hex: string): Color3
	return Color3.fromHex(hex)
end

local function buildGeometry(result, kit): Model
	local model = Instance.new("Model")
	model.Name = "Map"
	model.ModelStreamingMode = Enum.ModelStreamingMode.Persistent
	for i, g in result.geometry do
		local part
		if g.shape == "Wedge" then
			part = Instance.new("WedgePart")
		else
			part = Instance.new("Part")
			if g.shape == "Cylinder" then
				part.Shape = Enum.PartType.Cylinder
			end
		end
		part.Name = g.kind .. i
		part.Size = Vector3.new(g.size[1], g.size[2], g.size[3])
		part.CFrame = CFrame.new(g.pos[1], g.pos[2], g.pos[3]) * CFrame.Angles(0, math.rad(g.yaw), 0)
		part.Color = hexColor(g.color)
		local okMat, mat = pcall(function()
			return Enum.Material[g.material]
		end)
		part.Material = if okMat and mat then mat else Enum.Material.SmoothPlastic
		part.Anchored = true
		part.CanCollide = g.collide
		part.CanTouch = false
		part.CanQuery = g.collide
		part.Transparency = g.transparency or 0
		part.CastShadow = g.kind ~= "tile" and g.kind ~= "barrier" and g.kind ~= "window"
		part.TopSurface = Enum.SurfaceType.Smooth
		part.BottomSurface = Enum.SurfaceType.Smooth
		if g.kind == "ramp" or g.kind == "floor" or g.kind == "platform" then
			part:SetAttribute("Walkable", true)
		end
		part.Parent = model
	end
	model:SetAttribute("KitId", kit.id)
	return model
end

function WorldService:applyLighting(kit)
	local l = kit.lighting
	if not l then
		return
	end
	Lighting.ClockTime = l.ClockTime
	Lighting.Brightness = l.Brightness
	Lighting.Ambient = hexColor(l.Ambient)
	Lighting.OutdoorAmbient = hexColor(l.OutdoorAmbient)
	Lighting.ColorShift_Top = hexColor(l.ColorShift_Top)
	Lighting.FogColor = hexColor(l.FogColor)
	Lighting.FogEnd = l.FogEnd
	Lighting.ExposureCompensation = l.ExposureCompensation or 0
	local function ensure(className: string, name: string)
		local inst = Lighting:FindFirstChild(name)
		if not inst then
			inst = Instance.new(className)
			inst.Name = name
			inst.Parent = Lighting
		end
		return inst
	end
	if l.atmosphere then
		local a = ensure("Atmosphere", "KitAtmosphere")
		a.Density = l.atmosphere.Density
		a.Offset = l.atmosphere.Offset
		a.Color = hexColor(l.atmosphere.Color)
		a.Decay = hexColor(l.atmosphere.Decay)
		a.Glare = l.atmosphere.Glare
		a.Haze = l.atmosphere.Haze
	end
	if l.color then
		local c = ensure("ColorCorrectionEffect", "KitColor")
		c.Saturation = l.color.Saturation
		c.Contrast = l.color.Contrast
		c.Brightness = l.color.Brightness
		c.TintColor = hexColor(l.color.TintColor)
	end
	if l.bloom then
		local b = ensure("BloomEffect", "KitBloom")
		b.Intensity = l.bloom.Intensity
		b.Size = l.bloom.Size
		b.Threshold = l.bloom.Threshold
	end
	if l.sunRays then
		local s = ensure("SunRaysEffect", "KitSunRays")
		s.Intensity = l.sunRays.Intensity
		s.Spread = l.sunRays.Spread
	end
end

function WorldService:clear()
	if self.mapFolder then
		self.mapFolder:Destroy()
		self.mapFolder = nil
	end
	self.props = {}
	self.hash = SpatialHash.new(32)
	self.maxRadius = 0
	table.clear(pendingRemovals)
	table.clear(pendingMutations)
	table.clear(pendingLoot)
	lootCount = 0
end

-- `prepare(world)` may adjust props (e.g. mode/mutator mutations) before anyone is sent the map.
function WorldService:load(kitId: string, seed: number, prepare: ((any) -> ())?)
	local kit = Kits.get(kitId)
	assert(kit, "unknown kit " .. tostring(kitId))
	self:clear()
	local started = os.clock()
	local result = WorldGen.generate(kit, seed)
	self.kit = kit
	self.seed = seed
	self.generation = result
	self.roundId += 1
	self.landmarkId = result.landmarkId
	for _, p in result.props do
		-- Use the quantised scale so server contact maths matches what clients render.
		local scale = PropCodec.roundTripScale(p.scale)
		local state = makeState(p.id, p.uid, p.x, p.y, p.z, p.yaw, scale, p.mutation, false)
		self.props[p.id] = state
		self.hash:insert(p.id, p.x, p.z, state.radius)
		self.maxRadius = math.max(self.maxRadius, state.radius)
	end
	self.nextId = #result.props + 1
	if prepare then
		local ok, err = pcall(prepare, self)
		if not ok then
			warn("[World] prepare failed: " .. tostring(err))
		end
		table.clear(pendingMutations) -- already part of the snapshot below
	end
	self.mapFolder = buildGeometry(result, kit)
	self.mapFolder.Parent = Workspace
	self:applyLighting(kit)
	print(string.format("[World] %s seed %d: %d props, %d parts in %.0f ms", kit.id, seed, #result.props, #result.geometry, (os.clock() - started) * 1000))
	for _, player in Players:GetPlayers() do
		self:sendTo(player)
	end
	self.WorldLoaded:Fire(kit, seed)
end

-- Full world snapshot for one client (on load and for players joining mid-round).
function WorldService:sendTo(player: Player)
	if not self.kit then
		return
	end
	local records = {}
	for _, p in self.props do
		table.insert(records, {
			id = p.id,
			uid = p.uid,
			x = p.x,
			y = p.y,
			z = p.z,
			yaw = p.yaw,
			scale = p.scale,
			mutation = p.mutation,
		})
	end
	table.sort(records, function(a, b)
		return a.id < b.id
	end)
	Net.fire("WorldLoad", player, {
		kitId = self.kit.id,
		seed = self.seed,
		roundId = self.roundId,
		landmarkId = self.landmarkId,
		arenaHalf = self.kit.arenaHalf,
		spawnCenter = self.generation.spawnCenter,
	}, PropCodec.encode(records))
end

function WorldService:get(id: number): PropState?
	return self.props[id]
end

function WorldService:queryNear(x: number, z: number, radius: number, out: { number }?): { number }
	return self.hash:query(x, z, radius + self.maxRadius, out)
end

-- Remove a prop for everyone. absorberKey is the absorbing ball's id (0 = vanished).
function WorldService:removeProp(id: number, absorberKey: number)
	local p = self.props[id]
	if not p then
		return nil
	end
	self.props[id] = nil
	self.hash:remove(id)
	if p.loot then
		lootCount -= 1
	end
	table.insert(pendingRemovals, { id, absorberKey })
	self.PropRemoved:Fire(p, absorberKey)
	return p
end

function WorldService:moveProp(id: number, x: number, y: number, z: number, yaw: number?)
	local p = self.props[id]
	if not p then
		return
	end
	p.x, p.y, p.z = x, y, z
	p.cy = y + p.def.metrics.centerY * p.effScale
	if yaw then
		p.yaw = yaw
	end
	self.hash:move(id, x, z, p.radius)
end

function WorldService:setMutation(id: number, mutation: number)
	local p = self.props[id]
	if not p or p.landmark then
		return
	end
	local updated = makeState(p.id, p.uid, p.x, p.y, p.z, p.yaw, p.scale, mutation, p.loot)
	updated.activeAt = p.activeAt
	updated.expiresAt = p.expiresAt
	self.props[id] = updated
	self.hash:move(id, p.x, p.z, updated.radius)
	self.maxRadius = math.max(self.maxRadius, updated.radius)
	table.insert(pendingMutations, { id, mutation })
end

-- Spawns grabbable loot that arcs from `from` to its landing spot. Returns the new ids.
-- entries: { uid, mutation, scale, from: Vector3, to: Vector3 }
function WorldService:spawnLoot(entries: { any }): { number }
	local ids = {}
	local now = os.clock()
	local H = self.kit and self.kit.arenaHalf or 600
	for _, e in entries do
		if lootCount >= Tuning.World.MaxLoot then
			break
		end
		local to: Vector3 = e.to
		local x = math.clamp(to.X, -H + 20, H - 20)
		local z = math.clamp(to.Z, -H + 20, H - 20)
		local id = self.nextId
		self.nextId += 1
		local scale = PropCodec.roundTripScale(e.scale or 1)
		local state = makeState(id, e.uid, x, to.Y, z, math.random() * math.pi * 2, scale, e.mutation or 0, true)
		state.activeAt = now + (e.settle or Tuning.World.LootSettleTime)
		state.expiresAt = now + Tuning.World.LootLifetime
		self.props[id] = state
		self.hash:insert(id, x, z, state.radius)
		self.maxRadius = math.max(self.maxRadius, state.radius)
		lootCount += 1
		local from: Vector3 = e.from
		table.insert(pendingLoot, {
			record = { id = id, uid = e.uid, x = x, y = to.Y, z = z, yaw = state.yaw, scale = scale, mutation = state.mutation },
			from = from,
			settle = e.settle or Tuning.World.LootSettleTime,
		})
		table.insert(ids, id)
	end
	return ids
end

-- Ground height at (x, z) using the generated platform list (used for loot landing and critters).
function WorldService:groundAt(x: number, z: number): number
	local gen = self.generation
	if not gen then
		return 0
	end
	for _, p in gen.platforms do
		if math.abs(x - p.x) <= p.sx / 2 and math.abs(z - p.z) <= p.sz / 2 then
			return p.height
		end
	end
	return 0
end

function WorldService:platformAt(x: number, z: number)
	local gen = self.generation
	if not gen then
		return nil
	end
	for _, p in gen.platforms do
		if math.abs(x - p.x) <= p.sx / 2 and math.abs(z - p.z) <= p.sz / 2 then
			return p
		end
	end
	return nil
end

function WorldService:spawnPoints(): { Vector3 }
	local out = {}
	if self.generation then
		for _, s in self.generation.spawns do
			table.insert(out, Vector3.new(s[1], s[2], s[3]))
		end
	end
	return out
end

local function flush()
	if #pendingRemovals > 0 then
		Net.fireAll("PropsRemoved", pendingRemovals)
		pendingRemovals = {}
	end
	if #pendingMutations > 0 then
		Net.fireAll("PropsMutated", pendingMutations)
		pendingMutations = {}
	end
	if #pendingLoot > 0 then
		local records, origins, settles = {}, {}, {}
		for i, l in pendingLoot do
			records[i] = l.record
			origins[i] = l.from
			settles[i] = l.settle
		end
		Net.fireAll("LootSpawned", PropCodec.encode(records), origins, settles)
		pendingLoot = {}
	end
end

function WorldService:start()
	local accumulator = 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		if accumulator >= 1 / 20 then
			accumulator = 0
			flush()
		end
	end)
	-- Expire old loot so the map doesn't fill with debris.
	task.spawn(function()
		while true do
			task.wait(5)
			local now = os.clock()
			for id, p in self.props do
				if p.loot and p.expiresAt and now > p.expiresAt then
					self:removeProp(id, 0)
				end
			end
		end
	end)
	Players.PlayerAdded:Connect(function(player)
		-- Clients request the snapshot once their controllers are ready (see Action "ready").
		player:SetAttribute("WorldRequested", false)
	end)
end

return WorldService
