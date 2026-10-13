--!nonstrict
-- World events: the round's chaos layer. Two big events per round (Meteor Shower, Sticky Rain,
-- Golden Hour, Stampede, Low Gravity, Giant Moment) plus small surprises in between (Supply Drop,
-- Growth Frenzy, Shooting Stars) so no two rounds play the same. Purchases and dev commands can
-- start one too; if something is already running they queue.
--
-- Gameplay modifiers are applied here (absorb ratio, growth, Stardust, gravity, spawned props);
-- clients get the active event through the RoundState snapshot and a WorldEvent ping for banners,
-- weather and lighting.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Absorb = require(Shared.Logic.Absorb)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Events = require(Shared.Data.Events)
local Mutations = require(Shared.Data.Mutations)
local Tuning = require(Shared.Config.Tuning)

local EventService = {}
EventService.Started = Signal.new() -- (def, info)
EventService.Ended = Signal.new() -- (def)

local services
local active = nil -- { def, startedAt, endsAt, info, token }
local queue: { { id: string, by: string? } } = {}
local usedThisRound: { [string]: boolean } = {}
local nextMinorAt = math.huge
local baseGravity = Workspace.Gravity
local token = 0

local MINOR_GAP_MIN, MINOR_GAP_MAX = 38, 62
local GOLDEN = (Mutations.ById.Golden and Mutations.ById.Golden.index) or 1
local STARFALL = (Mutations.ById.Starfall and Mutations.ById.Starfall.index) or 5

local function now(): number
	return Workspace:GetServerTimeNow()
end

function EventService:init(s)
	services = s
end

-- MODIFIER QUERIES ------------------------------------------------------------------------

function EventService:absorbRatioBonus(): number
	return if active and active.def.ratioBonus then active.def.ratioBonus else 0
end

function EventService:growthMultiplier(state): number
	if not active then
		return 1
	end
	local mult = active.def.growthMult or 1
	if active.giantId and state and state.userId == active.giantId then
		mult *= 3
	end
	return mult
end

function EventService:speedMultiplier(): number
	return if active and active.def.speedMult then active.def.speedMult else 1
end

function EventService:stardustMultiplier(): number
	return if active and active.def.stardustMult then active.def.stardustMult else 1
end

function EventService:isActive(id: string?): boolean
	if not active then
		return false
	end
	return id == nil or active.def.id == id
end

-- Compact description for the RoundState snapshot (nil when nothing is running).
function EventService:current()
	if not active then
		return nil
	end
	local def = active.def
	return {
		id = def.id,
		name = def.name,
		icon = def.icon,
		color = def.color,
		description = def.description,
		startedAt = active.startedAt,
		endsAt = active.endsAt,
		ratioBonus = def.ratioBonus,
		speedMult = def.speedMult,
		growthMult = def.growthMult,
		gravityMult = def.gravityMult,
		weather = def.weather,
		lighting = def.lighting,
		giantId = active.giantId,
		pos = active.info.pos,
	}
end

-- HELPERS ---------------------------------------------------------------------------------

local function playable(): boolean
	local round = services.RoundService
	return round ~= nil and round:isPlaying()
end

local function liveBalls()
	local out = {}
	for _, state in services.BallService:all() do
		if state.alive ~= false and state.part and state.part.Parent then
			table.insert(out, state)
		end
	end
	return out
end

-- Kit props sized for a ball of diameter d (a fraction band of its absorb threshold).
local function propsForSize(kit, d: number, lo: number, hi: number): { number }
	local threshold = Absorb.threshold(d, { ratioBonus = EventService:absorbRatioBonus() })
	local out = {}
	for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
		local s = def.metrics.absorbSize
		if not def.critter and not def.landmark and s >= threshold * lo and s <= threshold * hi then
			table.insert(out, def.uid)
		end
	end
	if #out == 0 then
		-- Tiny balls: fall back to the smallest props in the kit.
		local smallest, best = nil, math.huge
		for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
			if not def.critter and not def.landmark and def.metrics.absorbSize < best then
				smallest, best = def.uid, def.metrics.absorbSize
			end
		end
		if smallest then
			table.insert(out, smallest)
		end
	end
	return out
end

local function critterUids(kit): { number }
	local out = {}
	for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
		if def.critter and not def.landmark then
			table.insert(out, def.uid)
		end
	end
	return out
end

local function clampToArena(kit, x: number, z: number): (number, number)
	local H = kit.arenaHalf - 30
	return math.clamp(x, -H, H), math.clamp(z, -H, H)
end

-- EFFECTS ---------------------------------------------------------------------------------

-- One meteor near a random ball, sized so that ball can grab it: everyone gets a share.
local function dropMeteor()
	local world = services.WorldService
	local kit = world.kit
	local balls = liveBalls()
	if not kit or #balls == 0 then
		return
	end
	local target = balls[math.random(1, #balls)]
	local d = target.diameter
	local pool = propsForSize(kit, d, 0.3, 0.85)
	if #pool == 0 then
		return
	end
	local pos = target.part.Position
	local v = target.part.AssemblyLinearVelocity
	-- Land ahead of where the ball is heading so chasing meteors feels natural.
	local a = math.random() * math.pi * 2
	local dist = d * 1.2 + 10 + math.random() * (30 + d * 3)
	local x, z = clampToArena(kit, pos.X + v.X * 1.2 + math.cos(a) * dist, pos.Z + v.Z * 1.2 + math.sin(a) * dist)
	local ground = world:groundAt(x, z)
	local fromDir = Vector3.new(math.cos(a + 2.4), 0, math.sin(a + 2.4))
	local height = 260 + d * 4
	world:spawnLoot({
		{
			uid = pool[math.random(1, #pool)],
			mutation = STARFALL,
			scale = 0.9 + math.random() * 0.3,
			from = Vector3.new(x, ground + height, z) + fromDir * height * 0.6,
			to = Vector3.new(x, ground, z),
			settle = 1.6,
		},
	})
end

-- Golden Hour: turn a share of the props near each ball golden, a few at a time.
local function goldenTick(share: number)
	local world = services.WorldService
	for _, state in liveBalls() do
		local pos = state.part.Position
		local d = state.diameter
		local threshold = Absorb.threshold(d, { ratioBonus = 0 })
		local near = world:queryNear(pos.X, pos.Z, 80 + d * 4)
		local turned = 0
		local budget = math.max(1, math.floor(#near * share * 0.25))
		for _, id in near do
			if turned >= budget then
				break
			end
			local p = world:get(id)
			if p and p.mutation == 0 and not p.landmark and not p.critter and p.absorbSize <= threshold * 1.4 and math.random() < share then
				world:setMutation(id, GOLDEN)
				turned += 1
			end
		end
	end
end

-- A pile of goodies for every size somewhere reachable, announced so everyone races for it.
local function supplyDrop(count: number): Vector3?
	local world = services.WorldService
	local kit = world.kit
	local balls = liveBalls()
	if not kit or #balls == 0 then
		return nil
	end
	-- Centre the drop between the balls (slightly randomised) so it's a race, not a gift.
	local cx, cz = 0, 0
	for _, s in balls do
		cx += s.part.Position.X
		cz += s.part.Position.Z
	end
	cx /= #balls
	cz /= #balls
	local a = math.random() * math.pi * 2
	local x, z = clampToArena(kit, cx + math.cos(a) * (60 + math.random() * 90), cz + math.sin(a) * (60 + math.random() * 90))
	local ground = world:groundAt(x, z)
	local entries = {}
	for i = 1, count do
		local sizer = balls[((i - 1) % #balls) + 1]
		local pool = propsForSize(kit, sizer.diameter, 0.25, 0.9)
		if #pool > 0 then
			local r = math.sqrt(math.random()) * (14 + sizer.diameter * 0.8)
			local t = math.random() * math.pi * 2
			local lx, lz = clampToArena(kit, x + math.cos(t) * r, z + math.sin(t) * r)
			table.insert(entries, {
				uid = pool[math.random(1, #pool)],
				mutation = if math.random() < 0.08 then GOLDEN else 0,
				scale = 0.9 + math.random() * 0.3,
				from = Vector3.new(x, ground + 220, z),
				to = Vector3.new(lx, world:groundAt(lx, lz), lz),
				settle = 1.3 + math.random() * 0.5,
			})
		end
	end
	world:spawnLoot(entries)
	return Vector3.new(x, ground, z)
end

-- Giant Moment: a ball outside the lead gets a burst of growth so the pecking order flips.
local function pickGiant()
	local balls = liveBalls()
	if #balls == 0 then
		return nil
	end
	table.sort(balls, function(a, b)
		return a.diameter > b.diameter
	end)
	local from = if #balls >= 3 then 2 else 1
	local pick = balls[math.random(from, #balls)]
	return pick
end

-- LIFECYCLE -------------------------------------------------------------------------------

local function stop()
	if not active then
		return
	end
	local def = active.def
	active.token = -1
	active = nil
	if def.gravityMult then
		Workspace.Gravity = baseGravity
	end
	Net.fireAll("WorldEvent", nil, { id = def.id, ended = true })
	EventService.Ended:Fire(def)
	if services.RoundService then
		services.RoundService:broadcast()
	end
end

local function run(def, by: string?): boolean
	if active then
		stop()
	end
	token += 1
	local myToken = token
	local startedAt = now()
	active = {
		def = def,
		startedAt = startedAt,
		endsAt = startedAt + def.duration,
		info = { by = by },
		token = myToken,
	}
	usedThisRound[def.id] = true
	local state = active

	if def.gravityMult then
		Workspace.Gravity = baseGravity * def.gravityMult
	end
	if def.supplyDrop then
		state.info.pos = supplyDrop(def.supplyDrop)
	end
	if def.stampede then
		local kit = services.WorldService.kit
		if kit and services.CritterService then
			local uids = critterUids(kit)
			if #uids > 0 then
				services.CritterService:stampede(uids, def.stampede)
			end
		end
	end
	if def.giant then
		local giant = pickGiant()
		if giant then
			state.giantId = giant.userId
			state.info.giantName = giant.player.DisplayName
			-- Instant pop so it's visible right away, then the 3x growth carries it.
			services.BallService:setDiameter(giant, giant.diameter * 1.45, "event")
			giant.part:SetAttribute("Giant", true)
		end
	end

	Net.fireAll("WorldEvent", def.id, {
		name = def.name,
		icon = def.icon,
		color = def.color,
		description = def.description,
		endsAt = state.endsAt,
		by = by,
		pos = state.info.pos,
		giantId = state.giantId,
		giantName = state.info.giantName,
		weather = def.weather,
		lighting = def.lighting,
	})
	EventService.Started:Fire(def, state.info)
	if services.RoundService then
		services.RoundService:broadcast()
	end
	if services.AnalyticsService and services.AnalyticsService.event then
		services.AnalyticsService:event("WorldEvent", def.id)
	end

	-- Ongoing effects run until the event ends or is replaced.
	task.spawn(function()
		local meteorAcc, goldenAcc = 0, 0
		local last = os.clock()
		while active == state and state.token == myToken and now() < state.endsAt and playable() do
			task.wait(0.1)
			local t = os.clock()
			local dt = t - last
			last = t
			if def.meteors then
				-- Scale with player count a little so busy servers get a proper shower.
				local rate = def.meteors * (1 + math.min(#liveBalls(), 10) * 0.12)
				meteorAcc += dt * rate
				while meteorAcc >= 1 do
					meteorAcc -= 1
					dropMeteor()
				end
			end
			if def.mutation == "Golden" then
				goldenAcc += dt
				if goldenAcc >= 2 then
					goldenAcc = 0
					goldenTick(def.mutationShare or 0.1)
				end
			end
		end
		if state.giantId then
			local giant = services.BallService:getByUserId(state.giantId)
			if giant and giant.part then
				giant.part:SetAttribute("Giant", nil)
			end
		end
		if active == state then
			stop()
		end
	end)
	return true
end

-- Weighted pick among events of one kind, avoiding repeats within a round when possible.
local function pick(major: boolean)
	local pool, total = {}, 0
	for _, def in Events.List do
		if def.major == major and not usedThisRound[def.id] then
			-- Giant Moment needs at least two balls to be meaningful.
			if not (def.giant and #liveBalls() < 2) then
				table.insert(pool, def)
				total += def.weight
			end
		end
	end
	if #pool == 0 then
		table.clear(usedThisRound)
		return pick(major)
	end
	local r = math.random() * total
	for _, def in pool do
		r -= def.weight
		if r <= 0 then
			return def
		end
	end
	return pool[#pool]
end

-- Called by RoundService at the scheduled times: the round's big moment.
function EventService:triggerRoundEvent()
	if not playable() then
		return
	end
	-- A purchased event waiting in line takes the slot.
	if #queue > 0 then
		local q = table.remove(queue, 1)
		local def = Events.get(q.id)
		if def then
			run(def, q.by)
			return
		end
	end
	run(pick(true), nil)
	nextMinorAt = math.max(nextMinorAt, active.endsAt + MINOR_GAP_MIN * 0.6)
end

-- Purchases / dev commands. Returns true if started now, false if queued.
function EventService:trigger(id: string, by: string?): boolean
	local def = Events.get(id)
	if not def then
		return false
	end
	if active or not playable() then
		table.insert(queue, { id = id, by = by })
		return false
	end
	run(def, by)
	return true
end

function EventService:stop()
	stop()
end

function EventService:start()
	baseGravity = Workspace.Gravity
	local round = services.RoundService
	round.RoundStarted:Connect(function()
		table.clear(usedThisRound)
		nextMinorAt = now() + MINOR_GAP_MIN * 0.9 + math.random() * 15
	end)
	round.RoundEnded:Connect(function()
		stop()
		nextMinorAt = math.huge
	end)
	-- Scheduler for small surprises and queued purchases.
	task.spawn(function()
		while true do
			task.wait(1)
			if not playable() or active then
				continue
			end
			local t = now()
			local timeLeft = round:timeLeft()
			if #queue > 0 and timeLeft > 20 then
				local q = table.remove(queue, 1)
				local def = Events.get(q.id)
				if def then
					run(def, q.by)
				end
				continue
			end
			-- Keep the scheduled major slots clear: don't start a minor right before one.
			local blocked = false
			for _, at in Tuning.Round.EventTimes do
				local slot = round.startedAt + at
				if t < slot and slot - t < 18 then
					blocked = true
				end
			end
			if not blocked and t >= nextMinorAt and timeLeft > 12 then
				run(pick(false), nil)
				nextMinorAt = t + MINOR_GAP_MIN + math.random() * (MINOR_GAP_MAX - MINOR_GAP_MIN)
			end
		end
	end)
end

return EventService
