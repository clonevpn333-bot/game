--!nonstrict
-- Simulates living props (ants, ducks, cats, rare roamers): wander, flee from balls that could roll
-- them up, and occasionally stampede. State is replicated compactly; clients animate.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local PropCodec = require(Shared.Util.PropCodec)
local Absorb = require(Shared.Logic.Absorb)
local Tuning = require(Shared.Config.Tuning)

local CritterService = {}

-- state byte sent to clients: 0 idle, 1 walk, 2 flee, 3 stampede
local IDLE, WALK, FLEE, STAMPEDE = 0, 1, 2, 3

local services
local critters: { [number]: any } = {}

function CritterService:init(s)
	services = s
end

local function register(prop)
	local def = prop.def
	local c = def.critter
	critters[prop.id] = {
		id = prop.id,
		speed = c.speed * prop.effScale ^ 0.5,
		fleeMult = c.flee or 1,
		style = c.style,
		homeY = prop.y,
		platform = services.WorldService:platformAt(prop.x, prop.z),
		yaw = prop.yaw,
		state = IDLE,
		target = nil,
		nextThink = 0,
		dirty = true,
		stampedeUntil = 0,
		stampedeDir = nil,
	}
end

local function rebuild()
	table.clear(critters)
	for _, prop in services.WorldService.props do
		if prop.critter then
			register(prop)
		end
	end
end

-- Spawn extra critters for the Stampede event: a herd that runs across the map.
function CritterService:stampede(uids: { number }, count: number)
	local world = services.WorldService
	local kit = world.kit
	if not kit or #uids == 0 then
		return
	end
	local H = kit.arenaHalf
	local side = math.random(0, 3)
	local dir = ({ Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0), Vector3.new(0, 0, 1), Vector3.new(0, 0, -1) })[side + 1]
	local entries = {}
	for _ = 1, count do
		local along = (math.random() - 0.5) * H * 1.4
		local start = -dir * (H - 60) + Vector3.new(dir.Z, 0, dir.X) * along
		local ground = world:groundAt(start.X, start.Z)
		table.insert(entries, {
			uid = uids[math.random(1, #uids)],
			mutation = 0,
			scale = 0.9 + math.random() * 0.3,
			from = Vector3.new(start.X, ground + 80, start.Z),
			to = Vector3.new(start.X, ground, start.Z),
			settle = 0.8,
		})
	end
	local ids = world:spawnLoot(entries)
	for _, id in ids do
		local prop = world:get(id)
		if prop and prop.def.critter then
			prop.expiresAt = os.clock() + 50
			register(prop)
			local c = critters[id]
			c.stampedeUntil = os.clock() + 40
			c.stampedeDir = dir
			c.state = STAMPEDE
		end
	end
end

-- One golden critter that runs from EVERY ball and must be chased down (Golden Runner event).
-- Returns the prop id.
function CritterService:spawnRunner(uid: number, mutation: number, position: Vector3, speed: number): number?
	local world = services.WorldService
	local ground = world:groundAt(position.X, position.Z)
	local ids = world:spawnLoot({
		{
			uid = uid,
			mutation = mutation,
			scale = 1,
			from = Vector3.new(position.X, ground + 120, position.Z),
			to = Vector3.new(position.X, ground, position.Z),
			settle = 1.2,
		},
	})
	local id = ids[1]
	local prop = id and world:get(id)
	if not prop or not prop.def.critter then
		return nil
	end
	prop.expiresAt = os.clock() + 60
	register(prop)
	local c = critters[id]
	c.runner = true
	c.runnerSince = os.clock()
	c.speed = speed
	c.platform = nil -- runs anywhere on the floor
	c.fleeMult = 1
	return id
end

local function insidePlatform(p, x: number, z: number, margin: number): boolean
	return math.abs(x - p.x) <= p.sx / 2 - margin and math.abs(z - p.z) <= p.sz / 2 - margin
end

-- Keep critters on the surface they started on: floor critters avoid platform blocks,
-- platform critters stay on top.
local function constrain(c, x: number, z: number): (number, number, boolean)
	local world = services.WorldService
	local H = world.kit.arenaHalf - 30
	local bumped = false
	if math.abs(x) > H or math.abs(z) > H then
		x, z = math.clamp(x, -H, H), math.clamp(z, -H, H)
		bumped = true
	end
	if c.platform then
		local p = c.platform
		if not insidePlatform(p, x, z, 3) then
			x = math.clamp(x, p.x - p.sx / 2 + 3, p.x + p.sx / 2 - 3)
			z = math.clamp(z, p.z - p.sz / 2 + 3, p.z + p.sz / 2 - 3)
			bumped = true
		end
	else
		for _, p in world.generation.platforms do
			if p.kind ~= "table" and insidePlatform(p, x, z, -4) then
				return nil :: any, nil :: any, true
			end
		end
	end
	return x, z, bumped
end

local function tick(dt: number)
	local world = services.WorldService
	if not world.kit then
		return
	end
	local balls = services.BallService:all()
	local nowT = os.clock()
	local ctx = { ratioBonus = if services.EventService then services.EventService:absorbRatioBonus() else 0 }
	for id, c in critters do
		local prop = world:get(id)
		if not prop then
			critters[id] = nil
			continue
		end
		local x, z = prop.x, prop.z
		-- Find the most threatening ball (one that can absorb us) within flee range.
		local threat, threatDist = nil, math.huge
		for _, ball in balls do
			if c.runner or Absorb.canAbsorbProp(ball.diameter, prop.absorbSize, false, ctx) then
				local pos = ball.part.Position
				local dx, dz = x - pos.X, z - pos.Z
				local dist = math.sqrt(dx * dx + dz * dz)
				local range = if c.runner then 90 + ball.diameter * 2 else ball.diameter * Tuning.World.CritterFleeRange * c.fleeMult + prop.radius * 4
				if dist < range and dist < threatDist then
					threat, threatDist = pos, dist
				end
			end
		end
		local moveDir: Vector3? = nil
		local speed = c.speed
		local newState = c.state
		if c.stampedeUntil > nowT and c.stampedeDir then
			moveDir = c.stampedeDir
			speed *= 2.2
			newState = STAMPEDE
		elseif threat ~= nil then
			local t: Vector3 = threat
			local away = Vector3.new(x - t.X, 0, z - t.Z)
			local fleeDir = if away.Magnitude > 0.01 then away.Unit else Vector3.new(1, 0, 0)
			-- A little zig-zag so fleeing reads as panicky-cute rather than robotic.
			local wobble = math.sin(nowT * 6 + id) * 0.5
			moveDir = CFrame.Angles(0, wobble, 0):VectorToWorldSpace(fleeDir)
			speed *= if c.runner then 1 else 1.6
			if c.runner then
				-- It tires out over time so persistent chasers win.
				speed *= math.clamp(1 - (nowT - (c.runnerSince or nowT)) / 50, 0.55, 1)
			end
			newState = FLEE
		else
			if nowT >= c.nextThink then
				c.nextThink = nowT + 1.5 + math.random() * 3.5
				if math.random() < 0.35 then
					c.target = nil
					newState = IDLE
				else
					local a = math.random() * math.pi * 2
					local r = 10 + math.random() * 40 * prop.effScale
					c.target = Vector3.new(x + math.cos(a) * r, 0, z + math.sin(a) * r)
					newState = WALK
				end
			end
			if c.target then
				local to = Vector3.new(c.target.X - x, 0, c.target.Z - z)
				if to.Magnitude < 1 then
					c.target = nil
					newState = IDLE
				else
					moveDir = to.Unit
				end
			end
		end
		if moveDir then
			local nx, nz = x + moveDir.X * speed * dt, z + moveDir.Z * speed * dt
			local cx, cz, bumped = constrain(c, nx, nz)
			if cx == nil then
				-- Blocked by a counter: turn around.
				c.target = nil
				if c.stampedeDir then
					c.stampedeDir = -c.stampedeDir
				end
			else
				if bumped and c.stampedeUntil > nowT then
					c.stampedeUntil = 0
				end
				local yaw = math.atan2(moveDir.X, moveDir.Z)
				world:moveProp(id, cx, prop.y, cz, yaw)
				c.yaw = yaw
				c.dirty = true
			end
		end
		if newState ~= c.state then
			c.state = newState
			c.dirty = true
		end
	end
end

local function broadcast()
	local records = {}
	for id, c in critters do
		if c.dirty then
			local prop = services.WorldService:get(id)
			if prop then
				table.insert(records, { id = id, x = prop.x, y = prop.y, z = prop.z, yaw = c.yaw, state = c.state })
			end
			c.dirty = false
		end
	end
	if #records > 0 then
		Net.fireAll("CritterState", PropCodec.encodeCritters(records))
	end
end

function CritterService:start()
	services.WorldService.WorldLoaded:Connect(rebuild)
	local rate = 1 / Tuning.World.CritterTickRate
	task.spawn(function()
		local last = os.clock()
		local sendAcc = 0
		while true do
			task.wait(rate)
			local t = os.clock()
			local dt = math.min(t - last, 0.3)
			last = t
			local playing = services.RoundService == nil or services.RoundService:isPlaying()
			if playing then
				local ok, err = pcall(tick, dt)
				if not ok then
					warn("[Critter] tick: " .. tostring(err))
				end
				sendAcc += dt
				if sendAcc >= 1 / 8 then
					sendAcc = 0
					broadcast()
				end
			end
		end
	end)
end

return CritterService
