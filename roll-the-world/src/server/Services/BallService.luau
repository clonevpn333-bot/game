--!nonstrict
-- Owns every player's ball: creation, authoritative size, network ownership, the Roller avatar
-- riding on top, and movement sanity checks (speed/teleport) against client-owned physics.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Signal = require(Shared.Util.Signal)
local Growth = require(Shared.Logic.Growth)
local Tuning = require(Shared.Config.Tuning)
local Cores = require(Shared.Data.Cores)

local BallService = {}

export type BallState = {
	player: Player,
	userId: number,
	part: Part,
	model: Model,
	diameter: number,
	core: string,
	coreLevel: number,
	shell: string,
	spawnedAt: number,
	shieldUntil: number,
	lastPos: Vector3,
	lastCheck: number,
	strikes: number,
	allowSpeedUntil: number,
	lastDash: number,
	lastHop: number,
	lastBonk: number,
	history: { any }, -- absorbed props, newest last: { uid, mutation, scale, volume, t }
	stats: { [string]: number },
	growthBoosts: { { mult: number, untilT: number, reason: string } },
	riderScale: number,
	mergedWith: Player?,
	isMergeHost: boolean,
	riders: { [Player]: boolean },
	alive: boolean,
	serverOwned: boolean, -- bots: the server simulates this ball's physics
	isBot: boolean,
	composition: any?,
	notable: any?,
	sweepFrom: Vector3?,
	magnetUntil: number?,
	launchFx: string?,
}

BallService.states = {} :: { [Player]: BallState }
BallService.folder = nil :: Folder?
BallService.DiameterChanged = Signal.new()
BallService.BallSpawned = Signal.new()
BallService.BallRemoved = Signal.new()
BallService.ActionUsed = Signal.new()
BallService.BurstRequested = Signal.new() -- (player) riders have no ball, so this skips the ball check

local services

function BallService:init(s)
	services = s
	local folder = Instance.new("Folder")
	folder.Name = "Balls"
	folder.Parent = Workspace
	self.folder = folder
end

local function setCharacterRiderMode(character: Model, riding: boolean)
	for _, d in character:GetDescendants() do
		if d:IsA("BasePart") then
			d.CollisionGroup = if riding then "Riders" else "Default"
			d.Massless = riding
		end
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.PlatformStand = riding
		humanoid.RequiresNeck = false
		humanoid.BreakJointsOnDeath = false
		humanoid.UseJumpPower = false
		humanoid.JumpHeight = if riding then 0 else 7.2
	end
end

function BallService:setRiderMode(player: Player, riding: boolean)
	local character = player.Character
	if character then
		setCharacterRiderMode(character, riding)
	end
end

local function scaleCharacter(state: BallState)
	local character = state.player.Character
	if not character then
		return
	end
	local target = Growth.riderScale(state.diameter)
	if math.abs(target - state.riderScale) / state.riderScale < Tuning.Ball.RiderScaleStep then
		return
	end
	state.riderScale = target
	local ok, err = pcall(function()
		character:ScaleTo(target)
	end)
	if not ok then
		warn("[Ball] ScaleTo failed: " .. tostring(err))
	end
end

function BallService:resetCharacterScale(player: Player)
	local character = player.Character
	if character and math.abs(character:GetScale() - 1) > 1e-3 then
		pcall(function()
			character:ScaleTo(1)
		end)
	end
end

local function physical(diameter: number, core: string)
	local b = Tuning.Ball
	local def = Cores.get(core)
	local density = b.Density * (def and def.densityMult or 1)
	local elasticity = b.Elasticity * (def and def.elasticityMult or 1)
	return PhysicalProperties.new(density, b.Friction, math.clamp(elasticity, 0, 1), 1, 1)
end

function BallService:get(player: Player): BallState?
	return self.states[player]
end

function BallService:getByUserId(userId: number): BallState?
	for _, state in self.states do
		if state.userId == userId then
			return state
		end
	end
	return nil
end

function BallService:all(): { BallState }
	local out = {}
	for _, state in self.states do
		if state.alive then
			table.insert(out, state)
		end
	end
	return out
end

function BallService:spawn(player: Player, position: Vector3, diameter: number, options: { [string]: any }?): BallState?
	local opts: { [string]: any } = options or {}
	self:remove(player, "respawn")
	local character = player.Character
	if not character or not character:FindFirstChild("HumanoidRootPart") then
		return nil
	end
	local isBot = not Net.isPlayer(player)
	local data = if isBot then nil else (services.PlayerDataService and services.PlayerDataService:getLoaded(player))
	local core = opts.core or (data and data.cores.equipped) or "Classic"
	local coreLevel = (data and data.cores.owned[core]) or 1
	local shell = (data and data.cosmetics.equipped.shell) or "Classic"

	local model = Instance.new("Model")
	model.Name = "Ball_" .. player.UserId
	model.ModelStreamingMode = Enum.ModelStreamingMode.Persistent

	local part = Instance.new("Part")
	part.Name = "Ball"
	part.Shape = Enum.PartType.Ball
	part.Size = Vector3.one * diameter
	part.CFrame = CFrame.new(position + Vector3.new(0, diameter / 2 + 0.5, 0))
	part.CustomPhysicalProperties = physical(diameter, core)
	part.Transparency = 1
	part.CastShadow = false
	part.CollisionGroup = "Balls"
	part.CanTouch = false
	part.CanQuery = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part:SetAttribute("OwnerId", player.UserId)
	part:SetAttribute("OwnerName", player.DisplayName)
	part:SetAttribute("Diameter", diameter)
	part:SetAttribute("Core", core)
	part:SetAttribute("Shell", shell)
	part.Parent = model
	model.PrimaryPart = part
	model.Parent = self.folder

	local now = os.clock()
	local state: BallState = {
		player = player,
		userId = player.UserId,
		part = part,
		model = model,
		diameter = diameter,
		core = core,
		coreLevel = coreLevel,
		shell = shell,
		spawnedAt = now,
		shieldUntil = now + (opts.shield or Tuning.Pvp.SpawnShield),
		lastPos = part.Position,
		lastCheck = now,
		strikes = 0,
		allowSpeedUntil = now + 2,
		lastDash = -math.huge,
		lastHop = -math.huge,
		lastBonk = -math.huge,
		history = opts.history or {},
		stats = opts.stats or { absorbed = 0, playersRolled = 0, timesRolled = 0, discoveries = 0, peak = diameter, bumps = 0, bursts = 0, merges = 0 },
		growthBoosts = opts.growthBoosts or {},
		riderScale = 1,
		mergedWith = nil,
		isMergeHost = false,
		riders = {},
		alive = true,
		serverOwned = isBot,
		isBot = isBot,
	}
	part:SetAttribute("ShieldUntil", workspace:GetServerTimeNow() + (state.shieldUntil - now))
	self.states[player] = state

	if isBot then
		part:SetNetworkOwner(nil)
		part:SetAttribute("Bot", true)
	else
		part:SetNetworkOwner(player)
	end
	self:markRiding(player, true)
	local hrp = character.HumanoidRootPart :: BasePart
	hrp.CFrame = CFrame.new(part.Position + Vector3.new(0, diameter / 2 + 3, 0))
	hrp.AssemblyLinearVelocity = Vector3.zero
	scaleCharacter(state)

	self.BallSpawned:Fire(state)
	Net.fire("PlayerState", player, "Rolling", { ball = model, diameter = diameter, core = core, coreLevel = coreLevel })
	return state
end

function BallService:remove(player: Player, reason: string?)
	local state = self.states[player]
	if not state then
		return
	end
	state.alive = false
	self.states[player] = nil
	self.BallRemoved:Fire(state, reason)
	if state.model then
		state.model:Destroy()
	end
end

-- The only way a ball's size changes. Keeps the ball resting on the ground as it grows.
function BallService:setDiameter(state: BallState, diameter: number, reason: string?)
	local old = state.diameter
	diameter = math.clamp(diameter, Tuning.Ball.StartDiameter * 0.5, Tuning.Ball.MaxDiameter)
	if math.abs(diameter - old) < 1e-4 then
		return
	end
	state.diameter = diameter
	state.stats.peak = math.max(state.stats.peak or 0, diameter)
	local part = state.part
	if part and part.Parent then
		part:SetAttribute("Diameter", diameter)
		-- Client-owned balls are resized smoothly by their clients (the owner also lifts its ball
		-- as it grows). Writing Size/CFrame here would fight the owner's physics and hitch, so the
		-- server only resizes balls it simulates itself (bots, anchored launch balls).
		if state.serverOwned or part.Anchored then
			local lift = math.max(0, (diameter - old) / 2)
			part.Size = Vector3.one * diameter
			if lift > 0.05 and not part.Anchored then
				part.CFrame = part.CFrame + Vector3.new(0, lift, 0)
			end
		end
	end
	scaleCharacter(state)
	self.DiameterChanged:Fire(state, old, diameter, reason)
end

-- Product of all active growth multipliers for this ball (comeback, catch-up, events...).
function BallService:growthMultiplier(state: BallState): number
	local now = os.clock()
	local mult = 1
	for i = #state.growthBoosts, 1, -1 do
		local boost = state.growthBoosts[i]
		if now > boost.untilT then
			table.remove(state.growthBoosts, i)
		else
			mult *= boost.mult
		end
	end
	return mult
end

function BallService:addGrowthBoost(state: BallState, mult: number, duration: number, reason: string)
	table.insert(state.growthBoosts, { mult = mult, untilT = os.clock() + duration, reason = reason })
	Net.fire("Toast", state.player, "boost", { mult = mult, duration = duration, reason = reason })
end

function BallService:dashCooldown(state: BallState): number
	local def = Cores.get(state.core)
	local mult = def and def.dashCooldownMult and def.dashCooldownMult(state.coreLevel) or 1
	return Tuning.Ball.DashCooldown * mult
end

-- Server applies a velocity change on the owning client (server can't push client-owned physics).
function BallService:impulse(state: BallState, velocityChange: Vector3)
	state.allowSpeedUntil = os.clock() + 1.5
	if state.serverOwned then
		local part = state.part
		if part and part.Parent and not part.Anchored then
			part.AssemblyLinearVelocity += velocityChange
		end
	else
		Net.fire("Impulse", state.player, velocityChange)
	end
end

function BallService:teleport(state: BallState, position: Vector3)
	local part = state.part
	if not part or not part.Parent then
		return
	end
	state.allowSpeedUntil = os.clock() + 1
	part.AssemblyLinearVelocity = Vector3.zero
	part.AssemblyAngularVelocity = Vector3.zero
	part.CFrame = CFrame.new(position)
	state.lastPos = position
end

local function onAction(player: Player, action: string, arg: any)
	if action == "burst" then
		BallService.BurstRequested:Fire(player)
		return
	end
	local state = BallService.states[player]
	if not state then
		return
	end
	local now = os.clock()
	if action == "dash" then
		if now - state.lastDash >= BallService:dashCooldown(state) * 0.9 then
			state.lastDash = now
			state.allowSpeedUntil = now + Tuning.Ball.DashDuration + 1
			BallService.ActionUsed:Fire(state, "dash")
		end
	elseif action == "hop" then
		if now - state.lastHop >= Tuning.Ball.HopCooldown * 0.8 then
			state.lastHop = now
			BallService.ActionUsed:Fire(state, "hop")
		end
	elseif action == "bonk" then
		if type(arg) == "number" and now - state.lastBonk >= Tuning.Absorb.BonkCooldown then
			state.lastBonk = now
			BallService.ActionUsed:Fire(state, "bonk", arg)
		end
	end
end

-- Movement sanity: horizontal speed must stay within what the ball could plausibly reach.
local function validate(state: BallState, now: number)
	local part = state.part
	if not part or not part.Parent then
		return
	end
	local pos = part.Position
	if pos.Y < Tuning.Ball.VoidY then
		local spawns = services.WorldService:spawnPoints()
		local target = if #spawns > 0 then spawns[math.random(1, #spawns)] else Vector3.new(0, 60, 0)
		BallService:teleport(state, target + Vector3.new(0, state.diameter / 2 + 2, 0))
		return
	end
	local dt = now - state.lastCheck
	if dt < 0.2 then
		return
	end
	local delta = pos - state.lastPos
	local horizontal = Vector3.new(delta.X, 0, delta.Z).Magnitude / dt
	local limit = Growth.maxSpeed(state.diameter) * 1.6 + 30
	if now < state.allowSpeedUntil then
		limit = limit * 3 + Tuning.Pvp.BurstLaunchSpeed * 2
	end
	if state.mergedWith then
		limit *= 1.5
	end
	if horizontal > limit and not part.Anchored then
		state.strikes += 1
		if state.strikes >= 3 then
			warn(string.format("[Ball] %s moving too fast (%.0f > %.0f); correcting", state.player.Name, horizontal, limit))
			BallService:teleport(state, state.lastPos)
			state.strikes = 0
			if services.AnalyticsService then
				services.AnalyticsService:custom(state.player, "SpeedCorrection", horizontal)
			end
			return
		end
	else
		state.strikes = math.max(0, state.strikes - 0.25)
	end
	state.lastPos = pos
	state.lastCheck = now
end

function BallService:start()
	Net.on("Action", onAction, {
		rate = 20,
		burst = 40,
		guards = { Guard.string(24), Guard.optional(Guard.number(-1e6, 1e6)) },
	})
	RunService.Heartbeat:Connect(function()
		local now = os.clock()
		for _, state in self.states do
			if state.alive and not state.serverOwned then
				validate(state, now)
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		self:remove(player, "left")
	end)
	local function watchCharacter(character: Model)
		character.DescendantAdded:Connect(function(d)
			if d:IsA("BasePart") and character:GetAttribute("Riding") then
				d.CollisionGroup = "Riders"
				d.Massless = true
			end
		end)
	end
	local function onPlayer(player: Player)
		player.CharacterAdded:Connect(watchCharacter)
		if player.Character then
			watchCharacter(player.Character)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
end

-- Exposed for other services so the Riding attribute stays in sync with rider mode.
function BallService:markRiding(player: Player, riding: boolean)
	local character = player.Character
	if character then
		character:SetAttribute("Riding", riding)
	end
	self:setRiderMode(player, riding)
end

return BallService
