--!nonstrict
-- Authoritative absorption. Clients send "I touched these props" claims for instant feel; the
-- server validates each claim against its own view of the ball (size, contact, latency reach) and
-- also sweeps every ball itself so nothing depends on a client claiming honestly.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Signal = require(Shared.Util.Signal)
local Absorb = require(Shared.Logic.Absorb)
local Growth = require(Shared.Logic.Growth)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Tuning = require(Shared.Config.Tuning)
local Cores = require(Shared.Data.Cores)
local Mutations = require(Shared.Data.Mutations)

local AbsorbService = {}
AbsorbService.Absorbed = Signal.new() -- (ballState, propState, info)
AbsorbService.Knocked = Signal.new() -- (ballState, count, reason)

local services
local pendingNotify: { [Player]: { any } } = {}
local scratch = {}

function AbsorbService:init(s)
	services = s
end

local function context()
	local round = services.RoundService
	local events = services.EventService
	return {
		ratioBonus = if events then events:absorbRatioBonus() else 0,
		finalRoll = if round then round:isFinalRoll() else false,
	}
end

local function canPlay(): boolean
	local round = services.RoundService
	return round == nil or round:isPlaying()
end

local function magnetReach(state): number
	local def = Cores.get(state.core)
	local extra = 0
	if def and def.magnetReach then
		extra += def.magnetReach(state.coreLevel)
	end
	if state.magnetUntil and os.clock() < state.magnetUntil then
		extra += Tuning.Absorb.MagnetReach
	end
	return extra
end

local function growthMultiplier(state, prop): number
	local mult = services.BallService:growthMultiplier(state)
	local round = services.RoundService
	if round and round:isFinalRoll() then
		mult *= Tuning.Growth.FinalRollMultiplier
	end
	local events = services.EventService
	if events then
		mult *= events:growthMultiplier(state)
	end
	if state.mergedWith then
		mult *= Tuning.Merge.GrowthPenalty
	end
	if prop.critter then
		mult *= Tuning.Growth.CritterBonus
	end
	return mult
end

-- Core absorb. `reach` is extra contact tolerance in studs. Returns true when absorbed.
function AbsorbService:tryAbsorb(state, prop, reach: number, ctx, segmentFrom: Vector3?): boolean
	if not prop or not state.alive then
		return false
	end
	if prop.loot and os.clock() < prop.activeAt then
		return false
	end
	local d = state.diameter
	if not Absorb.canAbsorbProp(d, prop.absorbSize, prop.landmark, ctx) then
		return false
	end
	local pos = state.part.Position
	local r = d / 2
	local threshold = Absorb.threshold(d, ctx)
	local limit = r + prop.radius * (1 - Tuning.Absorb.ContactSlack) + reach + Absorb.vacuumReach(d, prop.absorbSize, threshold)
	-- Magnet core: much smaller props are pulled in from further away still.
	if prop.absorbSize < threshold * 0.4 then
		limit += d * magnetReach(state)
	end
	local distSq
	if segmentFrom then
		distSq = Absorb.segmentDistanceSq(segmentFrom.X, segmentFrom.Y, segmentFrom.Z, pos.X, pos.Y, pos.Z, prop.x, prop.cy, prop.z)
	else
		local dx, dy, dz = prop.x - pos.X, prop.cy - pos.Y, prop.z - pos.Z
		distSq = dx * dx + dy * dy + dz * dz
	end
	if distSq > limit * limit then
		return false
	end
	self:commit(state, prop)
	return true
end

-- Apply an absorb that has already been validated.
function AbsorbService:commit(state, prop)
	local world = services.WorldService
	if not world:removeProp(prop.id, state.userId) then
		return
	end
	local oldD = state.diameter
	local newD = Growth.grow(oldD, prop.volume, { multiplier = growthMultiplier(state, prop) })
	services.BallService:setDiameter(state, newD, "absorb")

	local def = prop.def
	table.insert(state.history, {
		uid = prop.uid,
		mutation = prop.mutation,
		scale = prop.effScale,
		volume = prop.volume,
		color = def.metrics.mainColor,
		t = os.clock(),
	})
	if #state.history > Tuning.Absorb.RecentHistory * 4 then
		table.remove(state.history, 1)
	end
	state.stats.absorbed = (state.stats.absorbed or 0) + 1
	state.composition = state.composition or { tags = {}, colors = {}, total = 0 }
	local comp = state.composition
	comp.total += prop.volume
	for _, tag in def.tags do
		comp.tags[tag] = (comp.tags[tag] or 0) + prop.volume
	end
	comp.colors[def.metrics.mainColor] = (comp.colors[def.metrics.mainColor] or 0) + prop.volume
	if state.notable == nil or prop.absorbSize > (state.notable.size or 0) then
		state.notable = { uid = prop.uid, size = prop.absorbSize, mutation = prop.mutation }
	end

	local info = { isNew = false, isNewVariant = false }
	local rolledex = services.RolledexService
	if rolledex then
		info.isNew, info.isNewVariant = rolledex:discover(state.player, prop.uid, prop.mutation)
	end
	self.Absorbed:Fire(state, prop, info)
	if state.mergedWith then
		-- Merged partners share credit for everything the Mega Ball rolls up.
		local partnerState = { player = state.mergedWith, userId = state.mergedWith.UserId, diameter = newD }
		if rolledex then
			rolledex:discover(state.mergedWith, prop.uid, prop.mutation)
		end
		self.Absorbed:Fire(partnerState, prop, { isNew = false, isNewVariant = false, shared = true })
	end

	local list = pendingNotify[state.player]
	if not list then
		list = {}
		pendingNotify[state.player] = list
	end
	table.insert(list, {
		id = prop.id,
		uid = prop.uid,
		m = prop.mutation,
		s = prop.effScale,
		d = newD,
		g = newD - oldD,
		n = info.isNew,
		v = info.isNewVariant,
	})
	if state.mergedWith then
		local plist = pendingNotify[state.mergedWith] or {}
		pendingNotify[state.mergedWith] = plist
		table.insert(plist, { id = prop.id, uid = prop.uid, m = prop.mutation, s = prop.effScale, d = newD, g = newD - oldD })
	end
end

-- Knock the newest stuck props off a ball as grabbable loot. Returns the number knocked off.
function AbsorbService:knockLoose(state, count: number, awayFrom: Vector3?, reason: string): number
	if count <= 0 or not state.alive then
		return 0
	end
	local world = services.WorldService
	local pos = state.part.Position
	local entries = {}
	local lostVolume = 0
	for _ = 1, count do
		local item = table.remove(state.history)
		if not item then
			break
		end
		lostVolume += item.volume
		local dir
		if awayFrom then
			local flat = Vector3.new(pos.X - awayFrom.X, 0, pos.Z - awayFrom.Z)
			dir = if flat.Magnitude > 0.01 then flat.Unit else Vector3.new(1, 0, 0)
			local angle = (math.random() - 0.5) * 1.6
			dir = CFrame.Angles(0, angle, 0):VectorToWorldSpace(dir)
		else
			local a = math.random() * math.pi * 2
			dir = Vector3.new(math.cos(a), 0, math.sin(a))
		end
		local dist = state.diameter * (0.9 + math.random() * 1.4) + 6
		local land = pos + dir * dist
		local ground = world:groundAt(land.X, land.Z)
		local def = PropLibrary.get(item.uid)
		local mut = Mutations.get(item.mutation)
		local baseScale = item.scale / (if mut then mut.scale else 1)
		if def then
			table.insert(entries, {
				uid = item.uid,
				mutation = item.mutation,
				scale = baseScale,
				from = pos + Vector3.new(0, state.diameter * 0.3, 0),
				to = Vector3.new(land.X, ground, land.Z),
				settle = 0.8,
			})
		end
	end
	if #entries == 0 then
		return 0
	end
	world:spawnLoot(entries)
	-- Knocked props take their volume with them (minus the fill bonus they granted).
	local newD = Growth.shrink(state.diameter, lostVolume * Tuning.Growth.Gain * 0.5)
	services.BallService:setDiameter(state, newD, "knock")
	Net.fireAll("BallFx", "knock", { ball = state.userId, count = #entries })
	self.Knocked:Fire(state, #entries, reason)
	return #entries
end

local function onClaim(player: Player, ids: { number })
	if not canPlay() then
		return
	end
	local state = services.BallService:get(player)
	if not state or not state.alive then
		return
	end
	local world = services.WorldService
	local ctx = context()
	local speed = state.part.AssemblyLinearVelocity.Magnitude
	-- Claims arrive after the client saw contact, so allow generous (but bounded) latency reach.
	local reach = Absorb.latencyReach(speed) * 1.6 + 2 + state.diameter * 0.08
	for _, id in ids do
		local prop = world:get(id)
		if prop then
			AbsorbService:tryAbsorb(state, prop, reach, ctx, nil)
		end
	end
end

local function sweep()
	if not canPlay() then
		return
	end
	local world = services.WorldService
	local ctx = context()
	for _, state in services.BallService:all() do
		local part = state.part
		if part and part.Parent then
			local pos = part.Position
			local from = state.sweepFrom or pos
			local mid = (from + pos) / 2
			local span = (pos - from).Magnitude / 2
			local reachRadius = state.diameter / 2 + span + state.diameter * (magnetReach(state) + Tuning.Absorb.VacuumReach) + 4
			table.clear(scratch)
			world:queryNear(mid.X, mid.Z, reachRadius, scratch)
			local reach = Absorb.latencyReach(part.AssemblyLinearVelocity.Magnitude) * 0.5
			for _, id in scratch do
				local prop = world:get(id)
				if prop and not prop.critterHeld then
					AbsorbService:tryAbsorb(state, prop, reach, ctx, from)
				end
			end
			state.sweepFrom = pos
		end
	end
end

local function flushNotifications()
	for player, list in pendingNotify do
		if player.Parent then
			Net.fire("Absorbed", player, list)
		end
	end
	table.clear(pendingNotify)
end

-- Supply rain: any ball in a sparse area gets props sized for it dropped from the sky, so early
-- growth never stalls and the map never feels picked clean late in a round. Small balls get the
-- kit's crumb list; bigger balls get kit props between 25% and 55% of what they can absorb.
local function replenishCandidates(kit, threshold: number): { number }
	local out = {}
	for _, def in PropLibrary.ByKit[kit.id] do
		local s = def.metrics.absorbSize
		if not def.critter and not def.landmark and s >= threshold * 0.25 and s <= threshold * 0.55 then
			table.insert(out, def.uid)
		end
	end
	return out
end

local function replenish()
	if not canPlay() then
		return
	end
	local world = services.WorldService
	local kit = world.kit
	if not kit then
		return
	end
	local crumbs = {}
	for _, id in kit.replenish or {} do
		local def = PropLibrary.find(kit.id, id)
		if def then
			table.insert(crumbs, def.uid)
		end
	end
	local ctx = context()
	local w = Tuning.World
	for _, state in services.BallService:all() do
		if not state.part.Parent then
			continue
		end
		local d = state.diameter
		local pos = state.part.Position
		local radius = w.ReplenishRadius + d * 5
		local threshold = Absorb.threshold(d, ctx)
		local near = world:queryNear(pos.X, pos.Z, radius)
		local edible = 0
		for _, id in near do
			local p = world:get(id)
			if p and Absorb.canAbsorbProp(d, p.absorbSize, p.landmark, ctx) and p.absorbSize >= threshold * 0.08 then
				edible += 1
			end
		end
		local wanted = if d < 14 then 18 else 10
		if edible < wanted then
			local pool = if d < 14 then crumbs else replenishCandidates(kit, threshold)
			if #pool > 0 then
				local entries = {}
				local count = if d < 14 then w.ReplenishMaxPerTick else math.max(2, math.floor(w.ReplenishMaxPerTick / 2))
				for _ = 1, count do
					local a = math.random() * math.pi * 2
					local dist = d * 1.5 + 8 + math.random() * radius * 0.6
					local lx = math.clamp(pos.X + math.cos(a) * dist, -kit.arenaHalf + 30, kit.arenaHalf - 30)
					local lz = math.clamp(pos.Z + math.sin(a) * dist, -kit.arenaHalf + 30, kit.arenaHalf - 30)
					local ground = world:groundAt(lx, lz)
					table.insert(entries, {
						uid = pool[math.random(1, #pool)],
						mutation = 0,
						scale = 0.9 + math.random() * 0.25,
						from = Vector3.new(lx, ground + 60 + d * 2, lz),
						to = Vector3.new(lx, ground, lz),
						settle = 0.6 + math.min(d / 200, 0.6),
					})
				end
				world:spawnLoot(entries)
			end
		end
	end
end

function AbsorbService:start()
	Net.on("AbsorbClaim", onClaim, {
		rate = Tuning.Absorb.ClaimRatePerSecond / 4,
		burst = Tuning.Absorb.ClaimBurst / 4,
		guards = { Guard.arrayOf(Guard.integer(1, 65535), 48) },
	})
	services.BallService.ActionUsed:Connect(function(state, action, arg)
		if action == "bonk" and canPlay() then
			local speed = tonumber(arg) or 0
			if speed >= Growth.maxSpeed(state.diameter) * Tuning.Absorb.BonkMinSpeed then
				self:knockLoose(state, Tuning.Absorb.BonkKnockCount, nil, "bonk")
			end
		end
	end)
	local sweepAcc, notifyAcc = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		sweepAcc += dt
		notifyAcc += dt
		if sweepAcc >= 1 / 15 then
			sweepAcc = 0
			sweep()
		end
		if notifyAcc >= 1 / 20 then
			notifyAcc = 0
			flushNotifications()
		end
	end)
	task.spawn(function()
		while true do
			task.wait(Tuning.World.ReplenishInterval)
			local ok, err = pcall(replenish)
			if not ok then
				warn("[Absorb] replenish: " .. tostring(err))
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		pendingNotify[player] = nil
	end)
end

return AbsorbService
