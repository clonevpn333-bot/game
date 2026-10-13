--!nonstrict
-- Bots keep every server lively: they fill the round up to a target number of balls when few real
-- players are online and step out (smallest first) as players join. Each bot has a little
-- personality: how greedy, how brave, how bloodthirsty. They feed on props, chase balls they can
-- roll up, flee bigger ones, hop when stuck, and go for the landmark in the Final Roll.
-- Bots are server-simulated with the exact same movement model players use.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Absorb = require(Shared.Logic.Absorb)
local Growth = require(Shared.Logic.Growth)
local MovementModel = require(Shared.Logic.MovementModel)
local Tuning = require(Shared.Config.Tuning)
local Animations = require(Shared.Config.Animations)

local BotService = {}
BotService.bots = {} :: { any } -- identity list

local services
local folder: Folder
local nextId = 1
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

local NAMES = {
	"Pip", "Mochi", "Bubbles", "Waffles", "Noodle", "Biscuit", "Pickle", "Sprout", "Jellybean", "Tofu",
	"Pudding", "Sprinkles", "Gizmo", "Marble", "Pebble", "Zippy", "Nugget", "Clover", "Muffin", "Taffy",
}
local SKIN = {
	Color3.fromRGB(255, 220, 177), Color3.fromRGB(234, 192, 134), Color3.fromRGB(198, 134, 66),
	Color3.fromRGB(141, 85, 36), Color3.fromRGB(255, 205, 148), Color3.fromRGB(110, 70, 45),
}
local OUTFIT = {
	Color3.fromRGB(255, 122, 69), Color3.fromRGB(77, 196, 255), Color3.fromRGB(255, 120, 196),
	Color3.fromRGB(120, 214, 110), Color3.fromRGB(176, 108, 255), Color3.fromRGB(255, 196, 46),
}

function BotService:init(s)
	services = s
	folder = Instance.new("Folder")
	folder.Name = "Bots"
	folder.Parent = Workspace
end

-- A bot "identity" duck-types the bits of Player the game uses (UserId, DisplayName, Character,
-- attributes). Net.fire ignores it, so no remote is ever sent to a bot.
local function newIdentity(name: string)
	local attrs = {}
	local id = nextId
	nextId += 1
	local identity = {
		IsBot = true,
		UserId = -id,
		Name = name,
		DisplayName = name .. " 🤖",
		Character = nil,
		Parent = Workspace,
	}
	function identity.GetAttribute(_, key)
		return attrs[key]
	end
	function identity.SetAttribute(_, key, value)
		attrs[key] = value
	end
	return identity
end

local function buildCharacter(identity)
	local desc = Instance.new("HumanoidDescription")
	local skin = SKIN[math.random(1, #SKIN)]
	local shirt = OUTFIT[math.random(1, #OUTFIT)]
	local pants = OUTFIT[math.random(1, #OUTFIT)]
	desc.HeadColor = skin
	desc.LeftArmColor = skin
	desc.RightArmColor = skin
	desc.TorsoColor = shirt
	desc.LeftLegColor = pants
	desc.RightLegColor = pants
	local ok, model = pcall(function()
		return Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	end)
	if not ok or not model then
		warn("[Bots] could not build a bot avatar: " .. tostring(model))
		return nil
	end
	model.Name = identity.Name
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
		humanoid.PlatformStand = true
		humanoid.RequiresNeck = false
		humanoid.BreakJointsOnDeath = false
	end
	model.Parent = folder
	local hrp = model:FindFirstChild("HumanoidRootPart")
	if hrp then
		pcall(function()
			hrp:SetNetworkOwner(nil)
		end)
	end
	-- Run animation (bots balance-run on their balls like players do).
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if animator then
		local anim = Instance.new("Animation")
		anim.AnimationId = Animations.R15.Run
		local okTrack, track = pcall(function()
			return animator:LoadAnimation(anim)
		end)
		if okTrack and track then
			track.Looped = true
			track.Priority = Enum.AnimationPriority.Action
			identity.runTrack = track
		end
	end
	identity.Character = model
	return model
end

local function brainFor()
	return {
		target = nil,
		mode = "feed",
		nextThink = 0,
		greed = 0.6 + math.random() * 0.4,
		aggression = 0.25 + math.random() * 0.6,
		bravery = math.random(),
		skill = 0.78 + math.random() * 0.14, -- fraction of player top speed: beatable but lively
		stuckSince = nil,
		lastDash = 0,
		lastHop = 0,
		wander = nil,
	}
end

function BotService:add()
	local used = {}
	for _, b in self.bots do
		used[b.Name] = true
	end
	local pool = {}
	for _, n in NAMES do
		if not used[n] then
			table.insert(pool, n)
		end
	end
	local identity = newIdentity(if #pool > 0 then pool[math.random(1, #pool)] else "Bot" .. nextId)
	if not buildCharacter(identity) then
		return nil
	end
	identity.brain = brainFor()
	table.insert(self.bots, identity)
	self:spawnBall(identity)
	return identity
end

function BotService:spawnBall(identity)
	local round = services.RoundService
	if not round or not round:isPlaying() or not identity.Character then
		return
	end
	if identity.Character.Parent ~= folder then
		identity.Character.Parent = folder
	end
	local catchUp = (Workspace:GetServerTimeNow() - round.startedAt) > 15
	round:spawnIntoRound(identity, { catchUp = catchUp })
	identity.brain = identity.brain or brainFor()
	if identity.runTrack then
		identity.runTrack:Play(0.2)
	end
end

function BotService:remove(identity, poof: boolean?)
	if services.PvpService then
		services.PvpService:release(identity, false, "botleft")
	end
	local state = services.BallService:get(identity)
	if state and poof then
		Net.fireAll("BallFx", "burst", { userId = identity.UserId, position = state.part.Position })
	end
	services.BallService:remove(identity, "bot")
	if identity.Character then
		identity.Character:Destroy()
		identity.Character = nil
	end
	for i, b in self.bots do
		if b == identity then
			table.remove(self.bots, i)
			break
		end
	end
end

function BotService:identities(): { any }
	return self.bots
end

function BotService:wanted(): number
	local b = Tuning.Bots
	local live = services.LiveConfigService
	local target = (live and live:get("botTargetBalls")) or b.TargetBalls
	local humans = #Players:GetPlayers()
	if humans == 0 then
		return 0
	end
	return math.clamp(target - humans, 0, b.MaxBots)
end

-- Brain ----------------------------------------------------------------------------------------

local function nearestBall(state, predicate)
	local best, bestDist = nil, math.huge
	local pos = state.part.Position
	for _, other in services.BallService:all() do
		if other ~= state and other.part.Parent and predicate(other) then
			local dist = (other.part.Position - pos).Magnitude
			if dist < bestDist then
				best, bestDist = other, dist
			end
		end
	end
	return best, bestDist
end

local function think(identity, state)
	local brain = identity.brain
	local d = state.diameter
	local pos = state.part.Position
	local world = services.WorldService
	local ctx = {
		ratioBonus = if services.EventService then services.EventService:absorbRatioBonus() else 0,
		finalRoll = services.RoundService:isFinalRoll(),
	}
	-- Danger first.
	local threat, threatDist = nearestBall(state, function(o)
		return Absorb.canAbsorbBall(o.diameter, d)
	end)
	if threat and threatDist < d * 5 + threat.diameter * 1.5 + 20 and brain.bravery < 0.85 then
		local away = pos - threat.part.Position
		away = Vector3.new(away.X, 0, away.Z)
		away = if away.Magnitude > 1e-3 then away.Unit else Vector3.new(1, 0, 0)
		local side = Vector3.new(-away.Z, 0, away.X) * (if math.random() < 0.5 then 0.4 else -0.4)
		brain.mode = "flee"
		brain.target = pos + (away + side).Unit * (d * 6 + 40)
		brain.dashWanted = threatDist < d * 2 + threat.diameter
		return
	end
	-- Hunt balls we can roll up.
	local prey, preyDist = nearestBall(state, function(o)
		return Absorb.canAbsorbBall(d, o.diameter) and os.clock() >= o.shieldUntil
	end)
	if prey and preyDist < d * 7 + 50 and math.random() < brain.aggression then
		brain.mode = "chase"
		local lead = prey.part.AssemblyLinearVelocity * 0.35
		brain.target = prey.part.Position + Vector3.new(lead.X, 0, lead.Z)
		brain.dashWanted = preyDist < d * 2.5 + prey.diameter
		return
	end
	-- Final Roll: the landmark.
	local landmark = world:get(world.landmarkId)
	if ctx.finalRoll and landmark and Absorb.canAbsorbProp(d, landmark.absorbSize, true, ctx) then
		brain.mode = "landmark"
		brain.target = Vector3.new(landmark.x, pos.Y, landmark.z)
		brain.dashWanted = true
		return
	end
	-- Feed: best absorbable prop nearby (bigger relative size is tastier).
	local threshold = Absorb.threshold(d, ctx)
	local best, bestScore = nil, 0
	local radius = d * 6 + 50
	for _, id in world:queryNear(pos.X, pos.Z, radius) do
		local p = world:get(id)
		if p and not p.landmark and p.absorbSize <= threshold and math.abs(p.cy - pos.Y) < d + 30 then
			local dist = math.sqrt((p.x - pos.X) ^ 2 + (p.z - pos.Z) ^ 2)
			local score = (p.absorbSize / threshold * brain.greed + 0.2) / (dist + 6)
			if score > bestScore then
				best, bestScore = p, score
			end
		end
	end
	brain.dashWanted = false
	if best then
		brain.mode = "feed"
		brain.target = Vector3.new(best.x, pos.Y, best.z)
		brain.wander = nil
		return
	end
	-- Nothing nearby: roam outward toward bigger stuff.
	if not brain.wander or (Vector3.new(brain.wander.X - pos.X, 0, brain.wander.Z - pos.Z)).Magnitude < d + 10 then
		local half = world.kit and world.kit.arenaHalf or 600
		local a = math.random() * math.pi * 2
		local r = math.clamp(d * 4 + half * 0.25, 60, half * 0.85)
		brain.wander = Vector3.new(math.clamp(pos.X + math.cos(a) * r, -half + 40, half - 40), pos.Y, math.clamp(pos.Z + math.sin(a) * r, -half + 40, half - 40))
	end
	brain.mode = "roam"
	brain.target = brain.wander
end

local function drive(identity, state, dt: number)
	local part = state.part
	if not part or not part.Parent or part.Anchored then
		return
	end
	local brain = identity.brain
	local d = state.diameter
	local pos = part.Position
	local now = os.clock()
	if pos.Y < Tuning.Ball.VoidY then
		local spawns = services.WorldService:spawnPoints()
		if #spawns > 0 then
			services.BallService:teleport(state, spawns[math.random(1, #spawns)] + Vector3.new(0, d, 0))
		end
		return
	end
	if now >= brain.nextThink then
		brain.nextThink = now + 0.2 + math.random() * 0.2
		think(identity, state)
	end
	local dirX, dirZ = 0, 0
	if brain.target then
		local to = Vector3.new(brain.target.X - pos.X, 0, brain.target.Z - pos.Z)
		if to.Magnitude > 0.5 then
			to = to.Unit
			dirX, dirZ = to.X, to.Z
		end
	end
	local result = Workspace:Raycast(pos, Vector3.new(0, -(d / 2 + math.max(0.6, d * 0.12)), 0), rayParams)
	local grounded = result ~= nil
	local dashing = now < (brain.dashUntil or 0)
	local v = part.AssemblyLinearVelocity
	local nvx, nvz = MovementModel.step(v.X, v.Z, d, {
		dirX = dirX,
		dirZ = dirZ,
		grounded = grounded,
		dashing = dashing,
		speedMult = brain.skill,
	}, dt)
	local vy = v.Y
	-- Dash: same cooldown as players.
	if brain.dashWanted and grounded and now - brain.lastDash > Tuning.Ball.DashCooldown * 1.3 and (dirX ~= 0 or dirZ ~= 0) then
		brain.lastDash = now
		brain.dashUntil = now + Tuning.Ball.DashDuration
		local boost = Growth.maxSpeed(d) * brain.skill * Tuning.Ball.DashBoost
		nvx += dirX * boost
		nvz += dirZ * boost
		vy = math.max(vy, 0) + 4
	end
	-- Stuck (pushing into a counter/obstacle): hop and pick somewhere else.
	local speed = math.sqrt(nvx * nvx + nvz * nvz)
	if brain.target and speed < Growth.maxSpeed(d) * 0.12 then
		brain.stuckSince = brain.stuckSince or now
		if now - brain.stuckSince > 0.9 and grounded and now - brain.lastHop > 1.2 then
			brain.lastHop = now
			vy = math.sqrt(2 * Workspace.Gravity * Growth.hopHeight(d))
			brain.wander = nil
			brain.target = nil
			brain.nextThink = now + 0.4
		end
	else
		brain.stuckSince = nil
	end
	part.AssemblyLinearVelocity = Vector3.new(nvx, vy, nvz)
	if grounded then
		local spin = Vector3.yAxis:Cross(Vector3.new(nvx, 0, nvz)) / math.max(d / 2, 0.1)
		part.AssemblyAngularVelocity = part.AssemblyAngularVelocity:Lerp(spin, math.min(1, dt * 12))
	end
	-- Keep the bot's avatar balancing on top, facing travel.
	local character = identity.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if hrp and humanoid then
		local top = part.Position + Vector3.new(0, d / 2 + humanoid.HipHeight + hrp.Size.Y / 2, 0)
		local face = if speed > 1 then Vector3.new(nvx, 0, nvz).Unit else hrp.CFrame.LookVector * Vector3.new(1, 0, 1)
		if face.Magnitude < 1e-3 then
			face = Vector3.new(0, 0, -1)
		end
		hrp.CFrame = CFrame.lookAt(top, top + face)
		hrp.AssemblyLinearVelocity = part.AssemblyLinearVelocity
		if identity.runTrack then
			identity.runTrack:AdjustSpeed(math.clamp(0.6 + speed / math.max(Growth.maxSpeed(d), 1) * 1.6, 0.4, 2.4))
		end
	end
end

local function manage()
	local round = services.RoundService
	if not round or not round:isPlaying() then
		return
	end
	local want = BotService:wanted()
	local have = #BotService.bots
	if have < want then
		BotService:add()
	elseif have > want then
		-- Leave gracefully: the smallest bot pops out.
		local smallest, smallestD = nil, math.huge
		for _, b in BotService.bots do
			local st = services.BallService:get(b)
			local dd = if st then st.diameter else 0
			if dd < smallestD then
				smallest, smallestD = b, dd
			end
		end
		if smallest then
			BotService:remove(smallest, true)
		end
	end
end

function BotService:start()
	local round = services.RoundService
	round.RoundStarted:Connect(function()
		rayParams.FilterDescendantsInstances = { services.BallService.folder, folder }
		for _, b in self.bots do
			self:spawnBall(b)
		end
	end)
	round.RoundEnded:Connect(function()
		for _, b in self.bots do
			services.BallService:remove(b, "round_end")
			if b.Character then
				b.Character.Parent = nil
			end
			if b.runTrack then
				b.runTrack:Stop()
			end
		end
	end)
	rayParams.FilterDescendantsInstances = { services.BallService.folder, folder }
	RunService.Heartbeat:Connect(function(dt)
		for _, identity in self.bots do
			local state = services.BallService:get(identity)
			if state and state.alive then
				local ok, err = pcall(drive, identity, state, dt)
				if not ok then
					warn("[Bots] drive: " .. tostring(err))
				end
			end
		end
	end)
	task.spawn(function()
		while true do
			task.wait(Tuning.Bots.ManageInterval)
			local ok, err = pcall(manage)
			if not ok then
				warn("[Bots] manage: " .. tostring(err))
			end
		end
	end)
end

return BotService
