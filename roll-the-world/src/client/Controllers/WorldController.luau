--!nonstrict
-- Client side of the world: builds prop visuals from the compact server snapshot (only near the
-- camera, distance-scaled per prop), predicts absorbs for instant feel and sends claims, animates
-- removals/loot/critters, toggles collision on props that are too big (bonk!), highlights
-- "almost" targets, and tracks the next size goal for the HUD.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local SpatialHash = require(Shared.Util.SpatialHash)
local PropCodec = require(Shared.Util.PropCodec)
local MathUtil = require(Shared.Util.MathUtil)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Absorb = require(Shared.Logic.Absorb)
local Mutations = require(Shared.Data.Mutations)
local Rarity = require(Shared.Config.Rarity)
local Tuning = require(Shared.Config.Tuning)
local Kits = require(Shared.Data.Kits)
local PropBuilder = require(Shared.PropBuilder)

local WorldController = {}

WorldController.props = {} :: { [number]: any }
WorldController.hash = SpatialHash.new(32)
WorldController.maxRadius = 1
WorldController.kitId = nil
WorldController.roundId = 0
WorldController.landmarkId = 0
WorldController.ready = false
WorldController.templateProgress = 0
WorldController.nextGoal = nil -- { uid, needDiameter }
WorldController.bigGoal = nil
WorldController.spawnCenter = nil :: { number }?
WorldController.arenaHalf = 600

WorldController.WorldLoaded = Signal.new()
WorldController.PropAbsorbed = Signal.new() -- (prop, absorberKey, isLocalPrediction)
WorldController.GoalUnlocked = Signal.new() -- (uid)
WorldController.TemplateProgress = Signal.new() -- (done, total)
WorldController.SpawnAreaReady = Signal.new() -- fired once the props around spawn + skyline are built
WorldController.spawnAreaReady = false

local controllers
local state, settings
local folder: Folder
local myUserId = Players.LocalPlayer.UserId
local claims = {}
local arcs = {} -- loot / knock-off flight animations
local critterVisuals = {} -- id -> { model, parts, offsets, display = CFrame, target }
local highlightPool = {}
local unlockedUids = {}
local queryScratch = {}

function WorldController:init(c)
	controllers = c
end

local function propRenderDistance(p): number
	if p.landmark then
		return math.huge
	end
	local g = Tuning.Graphics
	local q = if settings then settings:qualityFactor() else 1
	return math.clamp(p.absorbSize * g.PropRenderScale, g.PropRenderMin, g.PropRenderMax) * q
end

local function makeEntry(r, loot: boolean)
	local def = PropLibrary.get(r.uid)
	if not def then
		return nil
	end
	local mut = Mutations.get(r.mutation)
	local eff = r.scale * (if mut then mut.scale else 1)
	local m = def.metrics
	local p = {
		id = r.id,
		uid = r.uid,
		def = def,
		x = r.x,
		y = r.y,
		z = r.z,
		yaw = r.yaw,
		scale = r.scale,
		eff = eff,
		mutation = r.mutation,
		absorbSize = m.absorbSize * eff,
		radius = m.contactRadius * eff,
		cy = r.y + m.centerY * eff,
		landmark = def.landmark,
		critter = def.critter ~= nil,
		loot = loot,
		activeAt = 0,
		state = "world",
		model = nil,
		collides = false,
	}
	p.renderDist = propRenderDistance(p)
	return p
end

local function placeModel(p)
	local model = p.model
	if not model then
		return
	end
	model:PivotTo(CFrame.new(p.x, p.y, p.z) * CFrame.Angles(0, p.yaw, 0))
end

local function addSparkle(p)
	local rarity = Rarity.get(p.def.rarity)
	local mut = Mutations.get(p.mutation)
	if not (rarity.sparkle or mut) or not p.model or not p.model.PrimaryPart then
		return
	end
	local vfx = controllers.VFXController
	if vfx then
		vfx:attachGlint(p.model.PrimaryPart, if mut and mut.color then Color3.fromHex(mut.color) else rarity.color, mut ~= nil)
	end
end

local function spawnVisual(p, force: boolean?): boolean
	if p.model then
		return true
	end
	if p.state ~= "world" and not force then
		return true
	end
	if not PropBuilder.hasTemplate(p.uid) then
		return false
	end
	local model = PropBuilder.create(p.uid, p.id, p.scale, p.mutation)
	if not model then
		return false
	end
	p.model = model
	local hitbox = model.PrimaryPart
	if hitbox then
		hitbox.CollisionGroup = "Props"
		hitbox.CanCollide = p.collides
		hitbox.CanQuery = p.collides
		hitbox:SetAttribute("PropId", p.id)
	end
	placeModel(p)
	model.Parent = folder
	addSparkle(p)
	if p.critter then
		WorldController:registerCritterVisual(p)
	end
	if p.landmark and controllers.HudController then
		controllers.HudController:attachLandmarkMarker(p)
	end
	return true
end

local function despawnVisual(p)
	if p.model then
		critterVisuals[p.id] = nil
		p.model:Destroy()
		p.model = nil
	end
end

function WorldController:clear()
	for _, p in self.props do
		if p.model then
			p.model:Destroy()
		end
	end
	table.clear(self.props)
	table.clear(critterVisuals)
	table.clear(arcs)
	table.clear(claims)
	table.clear(unlockedUids)
	self.hash = SpatialHash.new(32)
	self.maxRadius = 1
	self.nextGoal = nil
	self.bigGoal = nil
end

function WorldController:get(id: number)
	return self.props[id]
end

-- Prioritised background template building. Order matters for the first second of play:
--   1. the landmark and big props (the skyline you see in the spawn swoop),
--   2. everything near spawn (what you roll into immediately),
--   3. the rest, by how common it is.
-- SpawnAreaReady fires as soon as groups 1 and 2 are done.
local function prepareTemplates(kitId: string, spawnCenter)
	local counts = {}
	local nearScore = {}
	for _, p in WorldController.props do
		counts[p.uid] = (counts[p.uid] or 0) + 1
		local dx, dz = p.x - spawnCenter[1], p.z - spawnCenter[3]
		if dx * dx + dz * dz < 220 * 220 then
			nearScore[p.uid] = (nearScore[p.uid] or 0) + 1
		end
	end
	local uids = {}
	local priority = {}
	local defs: { any } = PropLibrary.ByKit[kitId] or {}
	for _, def in defs do
		table.insert(uids, def.uid)
		if def.landmark then
			priority[def.uid] = 3
		elseif def.metrics.absorbSize > 40 and (counts[def.uid] or 0) > 0 then
			priority[def.uid] = 2
		elseif (nearScore[def.uid] or 0) > 0 then
			priority[def.uid] = 1
		else
			priority[def.uid] = 0
		end
	end
	table.sort(uids, function(a, b)
		local pa, pb = priority[a], priority[b]
		if pa ~= pb then
			return pa > pb
		end
		local na, nb = nearScore[a] or 0, nearScore[b] or 0
		if na ~= nb then
			return na > nb
		end
		return (counts[a] or 0) > (counts[b] or 0)
	end)
	local needed = 0
	for _, uid in uids do
		if priority[uid] > 0 then
			needed += 1
		end
	end
	local roundId = WorldController.roundId
	PropBuilder.prepareAsync(uids, function(done, total)
		if WorldController.roundId ~= roundId then
			return
		end
		WorldController.templateProgress = done / total
		WorldController.TemplateProgress:Fire(done, total)
		if not WorldController.spawnAreaReady and done >= needed then
			WorldController.spawnAreaReady = true
			WorldController.SpawnAreaReady:Fire()
		end
	end)
	if not WorldController.spawnAreaReady and WorldController.roundId == roundId then
		WorldController.spawnAreaReady = true
		WorldController.SpawnAreaReady:Fire()
	end
end

local function onWorldLoad(info, buf)
	local self = WorldController
	self:clear()
	self.kitId = info.kitId
	self.roundId = info.roundId
	self.landmarkId = info.landmarkId
	self.ready = false
	self.spawnAreaReady = false
	self.arenaHalf = info.arenaHalf
	self.spawnCenter = info.spawnCenter
	local folderName = "ClientProps"
	folder = Workspace:FindFirstChild(folderName) or Instance.new("Folder")
	folder.Name = folderName
	folder.Parent = Workspace
	for _, r in PropCodec.decode(buf) do
		local p = makeEntry(r, false)
		if p then
			self.props[p.id] = p
			self.hash:insert(p.id, p.x, p.z, p.radius)
			self.maxRadius = math.max(self.maxRadius, p.radius)
		end
	end
	self.ready = true
	self.WorldLoaded:Fire(info)
	task.spawn(prepareTemplates, info.kitId, info.spawnCenter or { 0, 0, 0 })
	-- Warm the other kits of this tier in the background so the next round loads instantly.
	task.delay(20, function()
		for _, kit in Kits.forTier(Kits.get(info.kitId).tier) do
			if kit.id ~= info.kitId then
				local uids = {}
				for _, def in PropLibrary.ByKit[kit.id] do
					table.insert(uids, def.uid)
				end
				PropBuilder.prepareAsync(uids)
			end
		end
	end)
end

-- Fly-in or poof for a removed prop. absorberKey = ball owner's userId (0 = vanished).
local function handleRemoval(p, absorberKey: number)
	local balls = controllers.BallVisualController
	WorldController.hash:remove(p.id)
	WorldController.props[p.id] = nil
	if p.state == "predicted" then
		if absorberKey == myUserId then
			p.state = "gone"
			return
		end
		-- Someone else got it first: reassign the visual to their ball.
		if balls then
			balls:reassign(myUserId, absorberKey, p)
		end
		p.state = "gone"
		return
	end
	p.state = "gone"
	if absorberKey ~= 0 and balls and balls:hasBall(absorberKey) then
		if not p.model then
			spawnVisual(p, true)
		end
		balls:absorbProp(absorberKey, p)
		WorldController.PropAbsorbed:Fire(p, absorberKey, false)
	else
		if p.model and controllers.VFXController then
			controllers.VFXController:poof(p.model:GetPivot().Position, p.absorbSize)
		end
		despawnVisual(p)
	end
end

local function onPropsRemoved(list)
	for _, entry in list do
		local id, absorberKey = entry[1], entry[2]
		local p = WorldController.props[id]
		if p then
			handleRemoval(p, absorberKey)
		end
	end
end

local function onLoot(buf, origins, settles)
	local self = WorldController
	local now = os.clock()
	for i, r in PropCodec.decode(buf) do
		local p = makeEntry(r, true)
		if p then
			local settle = settles[i] or Tuning.World.LootSettleTime
			p.activeAt = now + settle
			self.props[p.id] = p
			self.hash:insert(p.id, p.x, p.z, p.radius)
			self.maxRadius = math.max(self.maxRadius, p.radius)
			local from = origins[i]
			if typeof(from) == "Vector3" and spawnVisual(p) and p.model then
				table.insert(arcs, {
					prop = p,
					from = from,
					to = Vector3.new(p.x, p.y, p.z),
					t0 = now,
					dur = settle,
					spin = (math.random() - 0.5) * 12,
					height = math.max(6, (from - Vector3.new(p.x, p.y, p.z)).Magnitude * 0.35),
				})
			end
		end
	end
end

local function onMutated(list)
	for _, entry in list do
		local p = WorldController.props[entry[1]]
		if p then
			local r = { id = p.id, uid = p.uid, x = p.x, y = p.y, z = p.z, yaw = p.yaw, scale = p.scale, mutation = entry[2] }
			local updated = makeEntry(r, p.loot)
			updated.state = p.state
			despawnVisual(p)
			WorldController.props[p.id] = updated
			WorldController.hash:move(p.id, p.x, p.z, updated.radius)
			if controllers.VFXController then
				controllers.VFXController:poof(Vector3.new(p.x, p.cy, p.z), p.absorbSize, Color3.fromRGB(255, 220, 110))
			end
		end
	end
end

-- Critters ------------------------------------------------------------------------------------

function WorldController:registerCritterVisual(p)
	local model = p.model
	if not model or not model.PrimaryPart then
		return
	end
	local pivot = model:GetPivot()
	local parts, offsets, tags, pivots = {}, {}, {}, {}
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			table.insert(parts, d)
			table.insert(offsets, pivot:ToObjectSpace(d.CFrame))
			table.insert(tags, d:GetAttribute("Tag"))
			local pv = d:GetAttribute("Pivot")
			table.insert(pivots, if typeof(pv) == "Vector3" then pv * p.eff else nil)
		end
	end
	critterVisuals[p.id] = {
		prop = p,
		parts = parts,
		offsets = offsets,
		tags = tags,
		pivots = pivots,
		display = pivot,
		phase = math.random() * 10,
		state = 0,
		reactUntil = 0,
	}
end

local function onCritterState(buf)
	local now = os.clock()
	for _, r in PropCodec.decodeCritters(buf) do
		local p = WorldController.props[r.id]
		if p and p.state == "world" then
			p.x, p.y, p.z, p.yaw = r.x, r.y, r.z, r.yaw
			p.cy = r.y + p.def.metrics.centerY * p.eff
			WorldController.hash:move(p.id, p.x, p.z, p.radius)
			local vis = critterVisuals[p.id]
			if vis then
				if r.state == 2 and vis.state ~= 2 and controllers.VFXController then
					controllers.VFXController:emoji(Vector3.new(p.x, p.cy + p.def.metrics.sy * p.eff * 0.7, p.z), "❗", 0.8)
				end
				vis.state = r.state
				vis.lastUpdate = now
			end
		end
	end
end

local function animateCritters(dt: number)
	local cframes, partsList = {}, {}
	for id, vis in critterVisuals do
		local p = vis.prop
		if not p.model or p.state ~= "world" then
			critterVisuals[id] = nil
			continue
		end
		local target = CFrame.new(p.x, p.y, p.z) * CFrame.Angles(0, p.yaw, 0)
		vis.display = vis.display:Lerp(target, MathUtil.damp(10, dt))
		local moving = vis.state ~= 0
		local style = p.def.critter.style
		local speedMul = if vis.state == 2 or vis.state == 3 then 2.2 else 1
		vis.phase += dt * (if moving then 9 * speedMul else 2)
		local ph = vis.phase
		local h = p.def.metrics.sy * p.eff
		local bob, tilt, roll = 0, 0, 0
		if style == "hop" then
			bob = if moving then math.abs(math.sin(ph * 0.6)) * h * 0.5 else math.abs(math.sin(ph)) * h * 0.03
		elseif style == "waddle" then
			roll = math.sin(ph) * (if moving then 0.18 else 0.04)
			bob = math.abs(math.sin(ph)) * h * 0.06
		elseif style == "fly" then
			bob = (p.def.critter.hover or 3) * p.eff + math.sin(ph * 0.5) * h * 0.4
			roll = math.sin(ph * 0.3) * 0.1
		elseif style == "glide" then
			bob = 0
			tilt = math.sin(ph * 0.4) * 0.03
		elseif style == "wiggle" then
			roll = math.sin(ph * 1.3) * 0.12
		else -- scurry / trot / run
			bob = if moving then math.abs(math.sin(ph)) * h * 0.08 else 0
			tilt = if moving then -0.08 * speedMul else 0
		end
		local base = vis.display * CFrame.new(0, bob, 0) * CFrame.Angles(tilt, 0, roll)
		for i, part in vis.parts do
			local offset = vis.offsets[i]
			local tag = vis.tags[i]
			local pivot = vis.pivots[i]
			if pivot and (tag == "leg" or tag == "wing" or tag == "tail" or tag == "head") then
				-- Rotate about the part's own pivot point (top of a leg, root of a wing...).
				local angle = 0
				local axis = "X"
				if tag == "leg" then
					local side = if pivot.X >= 0 then 1 else -1
					local front = if pivot.Z >= 0 then 1 else -1
					angle = if moving then math.sin(ph + (side * front > 0 and 0 or math.pi)) * 0.7 else 0
				elseif tag == "wing" then
					axis = "Z"
					local side = if pivot.X >= 0 then 1 else -1
					angle = side * (if style == "fly" then math.sin(ph * 3.2) * 0.9 else (if moving then math.sin(ph * 1.5) * 0.35 else 0))
				elseif tag == "tail" then
					axis = "Y"
					angle = math.sin(ph * 0.8) * 0.35
				elseif tag == "head" then
					angle = math.sin(ph * 0.5) * 0.08
				end
				local rot = if axis == "X" then CFrame.Angles(angle, 0, 0) elseif axis == "Y" then CFrame.Angles(0, angle, 0) else CFrame.Angles(0, 0, angle)
				local pivotCF = CFrame.new(pivot)
				offset = pivotCF * rot * pivotCF:Inverse() * offset
			end
			table.insert(partsList, part)
			table.insert(cframes, base * offset)
		end
	end
	if #partsList > 0 then
		Workspace:BulkMoveTo(partsList, cframes, Enum.BulkMoveMode.FireCFrameChanged)
	end
end

-- Arcs (loot, knocked props) -------------------------------------------------------------------

local function animateArcs()
	local now = os.clock()
	for i = #arcs, 1, -1 do
		local a = arcs[i]
		local p = a.prop
		if not p.model or p.state ~= "world" then
			table.remove(arcs, i)
			continue
		end
		local t = math.clamp((now - a.t0) / a.dur, 0, 1)
		local pos = a.from:Lerp(a.to, t) + Vector3.new(0, math.sin(t * math.pi) * a.height, 0)
		local spin = CFrame.Angles(a.spin * (1 - t) * t, p.yaw + a.spin * t, 0)
		p.model:PivotTo(CFrame.new(pos) * spin)
		if t >= 1 then
			placeModel(p)
			if controllers.VFXController then
				controllers.VFXController:dust(a.to, math.max(1, p.absorbSize * 0.6))
			end
			table.remove(arcs, i)
		end
	end
end

-- Prediction + claims -------------------------------------------------------------------------

local function predict()
	if not state:isRolling() or state.round.state ~= "Playing" then
		return
	end
	local ball = state.ball
	local d = state.diameter
	local r = d / 2
	local pos = ball.Position
	local ctx = state:absorbContext()
	local now = os.clock()
	local threshold = Absorb.threshold(d, ctx)
	local vacuumMax = d * Tuning.Absorb.VacuumReach
	table.clear(queryScratch)
	WorldController.hash:query(pos.X, pos.Z, r + WorldController.maxRadius + vacuumMax + 2, queryScratch)
	for _, id in queryScratch do
		local p = WorldController.props[id]
		if p and p.state == "world" and (not p.loot or now >= p.activeAt) then
			local reach = 0.4 + Absorb.vacuumReach(d, p.absorbSize, threshold)
			if Absorb.canAbsorbProp(d, p.absorbSize, p.landmark, ctx) and Absorb.inContact(pos.X, pos.Y, pos.Z, r, p.x, p.cy, p.z, p.radius, reach) then
				if not p.model then
					spawnVisual(p, true)
				end
				p.state = "predicted"
				p.predictedAt = now
				table.insert(claims, p.id)
				local balls = controllers.BallVisualController
				if balls then
					balls:absorbProp(myUserId, p)
				end
				WorldController.PropAbsorbed:Fire(p, myUserId, true)
			end
		end
	end
	if #claims > 0 then
		local batch = {}
		for i = 1, math.min(#claims, 48) do
			batch[i] = claims[i]
		end
		for _ = 1, #batch do
			table.remove(claims, 1)
		end
		Net.send("AbsorbClaim", batch)
	end
end

-- Predictions the server never confirmed are restored (rare: e.g. another player got there first
-- and the removal is still in flight, or a claim was rejected).
local function reconcile()
	local now = os.clock()
	for _, p in WorldController.props do
		if p.state == "predicted" and now - (p.predictedAt or now) > 1.6 then
			p.state = "world"
			local balls = controllers.BallVisualController
			if balls then
				balls:release(myUserId, p)
			end
			if p.model then
				p.model:Destroy()
				p.model = nil
			end
		end
	end
end

-- Rendering, collision, highlights, goals ------------------------------------------------------

local function renderPass()
	if not WorldController.ready then
		return
	end
	local cam = Workspace.CurrentCamera
	local focus = cam.CFrame.Position
	if state.ball and state.ball.Parent then
		focus = state.ball.Position
	elseif WorldController.spawnCenter and state.round.state == "Playing" then
		-- Not rolling yet: build around spawn so the area is full when the ball drops in.
		local c = WorldController.spawnCenter
		focus = Vector3.new(c[1], c[2], c[3])
	end
	local d = state.diameter
	local threshold = Absorb.threshold(d, state:absorbContext())
	local toSpawn = {}
	for _, p in WorldController.props do
		if p.state ~= "world" then
			continue
		end
		local dx, dz = p.x - focus.X, p.z - focus.Z
		local distSq = dx * dx + dz * dz
		-- Render distance grows with the ball a little so big rollers see the next feeding grounds.
		local rd = p.renderDist * (1 + math.min(d / 120, 1.5))
		if p.model then
			if distSq > (rd * 1.15) ^ 2 then
				despawnVisual(p)
			end
		elseif distSq < rd * rd then
			table.insert(toSpawn, { p = p, d = distSq })
		end
		-- Collision only on props too big to absorb (they bonk); everything smaller rolls in.
		if p.model and distSq < (d * 3 + 40) ^ 2 then
			local collide = p.absorbSize > threshold or (p.landmark and not state:isFinalRoll())
			if collide ~= p.collides then
				p.collides = collide
				local hb = p.model.PrimaryPart
				if hb then
					hb.CanCollide = collide
					hb.CanQuery = collide
				end
			end
		end
	end
	table.sort(toSpawn, function(a, b)
		return a.d < b.d
	end)
	-- Build faster while waiting to spawn so the area is full the moment the ball appears.
	local budget = if state:isRolling() then 60 else 140
	for _, entry in toSpawn do
		if budget <= 0 then
			break
		end
		if spawnVisual(entry.p) then
			budget -= 1
		end
	end
end

local function updateHighlights()
	if not state:isRolling() then
		for _, h in highlightPool do
			h.Adornee = nil
		end
		return
	end
	local pos = state.ball.Position
	local d = state.diameter
	local threshold = Absorb.threshold(d, state:absorbContext())
	local candidates = {}
	table.clear(queryScratch)
	WorldController.hash:query(pos.X, pos.Z, d * 6 + 40, queryScratch)
	for _, id in queryScratch do
		local p = WorldController.props[id]
		if p and p.model and p.state == "world" and not p.landmark and p.absorbSize > threshold and p.absorbSize <= threshold * 1.3 then
			local dx, dz = p.x - pos.X, p.z - pos.Z
			table.insert(candidates, { p = p, d = dx * dx + dz * dz })
		end
	end
	table.sort(candidates, function(a, b)
		return a.d < b.d
	end)
	for i = 1, 5 do
		local h = highlightPool[i]
		if not h then
			h = Instance.new("Highlight")
			h.FillColor = Color3.fromRGB(255, 214, 64)
			h.OutlineColor = Color3.fromRGB(255, 236, 160)
			h.FillTransparency = 0.88
			h.OutlineTransparency = 0.25
			h.DepthMode = Enum.HighlightDepthMode.Occluded
			h.Parent = folder
			highlightPool[i] = h
		end
		local c = candidates[i]
		h.Adornee = if c then c.p.model else nil
		if c then
			-- Brighter the closer we are to being able to roll it up.
			local closeness = 1 - math.clamp((c.p.absorbSize - threshold) / (threshold * 0.3), 0, 1)
			h.OutlineTransparency = 0.6 - closeness * 0.45
		end
	end
end

-- Next goal = the smallest kind of thing on the map we can't roll up yet; big goal = the landmark.
local function updateGoals()
	local d = state.diameter
	local ctx = state:absorbContext()
	local threshold = Absorb.threshold(d, ctx)
	local best, bestSize = nil, math.huge
	local present = {}
	for _, p in WorldController.props do
		if p.state == "world" and not p.landmark then
			present[p.uid] = true
			if p.absorbSize > threshold and p.def.metrics.absorbSize < bestSize then
				best, bestSize = p.uid, p.def.metrics.absorbSize
			end
		end
	end
	local prev = WorldController.nextGoal
	WorldController.nextGoal = if best then { uid = best, needDiameter = bestSize / Absorb.ratio(ctx) } else nil
	if prev and (not WorldController.nextGoal or WorldController.nextGoal.uid ~= prev.uid) and not unlockedUids[prev.uid] and d >= prev.needDiameter * 0.98 then
		unlockedUids[prev.uid] = true
		WorldController.GoalUnlocked:Fire(prev.uid)
	end
	local landmark = WorldController.props[WorldController.landmarkId]
	if landmark then
		WorldController.bigGoal = { uid = landmark.uid, needDiameter = landmark.absorbSize / Tuning.Absorb.LandmarkReach, prop = landmark }
	else
		WorldController.bigGoal = nil
WorldController.spawnCenter = nil :: { number }?
WorldController.arenaHalf = 600
	end
end

-- Weighted centre of absorbable props ahead (mobile auto-steer assist).
function WorldController:steerTarget(pos: Vector3, dir: Vector3, d: number): Vector3?
	local range = d * Tuning.Ball.AutoSteerRange + 10
	local threshold = Absorb.threshold(d, state:absorbContext())
	local sum, weight = Vector3.zero, 0
	table.clear(queryScratch)
	self.hash:query(pos.X, pos.Z, range, queryScratch)
	local flatDir = Vector3.new(dir.X, 0, dir.Z)
	if flatDir.Magnitude < 1e-3 then
		return nil
	end
	flatDir = flatDir.Unit
	for _, id in queryScratch do
		local p = self.props[id]
		if p and p.state == "world" and p.absorbSize <= threshold then
			local to = Vector3.new(p.x - pos.X, 0, p.z - pos.Z)
			local dist = to.Magnitude
			if dist > 0.5 and dist < range and to.Unit:Dot(flatDir) > 0.75 then
				local w = (p.absorbSize / threshold + 0.3) / (dist + 2)
				sum += Vector3.new(p.x, 0, p.z) * w
				weight += w
			end
		end
	end
	if weight <= 0 then
		return nil
	end
	return sum / weight
end

function WorldController:start()
	state = controllers.ClientState
	settings = controllers.SettingsController
	folder = Workspace:FindFirstChild("ClientProps") or Instance.new("Folder")
	folder.Name = "ClientProps"
	folder.Parent = Workspace
	Net.connect("WorldLoad", onWorldLoad)
	Net.connect("PropsRemoved", onPropsRemoved)
	Net.connect("LootSpawned", onLoot)
	Net.connect("PropsMutated", onMutated)
	Net.connect("CritterState", onCritterState)
	RunService.Heartbeat:Connect(predict)
	RunService.RenderStepped:Connect(function(dt)
		animateArcs()
		animateCritters(dt)
	end)
	task.spawn(function()
		while true do
			task.wait(0.2)
			local ok, err = pcall(renderPass)
			if not ok then
				warn("[World] render pass: " .. tostring(err))
			end
			reconcile()
		end
	end)
	task.spawn(function()
		while true do
			task.wait(0.3)
			pcall(updateHighlights)
			pcall(updateGoals)
		end
	end)
	-- Ask to be dropped in only once the world around spawn is built (server falls back after 6s).
	self.SpawnAreaReady:Connect(function()
		if state.playerState ~= "Rolling" and state.round.state == "Playing" then
			Net.request("Spawn", true)
		end
	end)
	settings.Changed:Connect(function(key)
		if key == "quality" then
			for _, p in self.props do
				p.renderDist = propRenderDistance(p)
			end
		end
	end)
end

return WorldController
