--!nonstrict
-- Player-vs-player (and bot) interactions:
--   * Rolling up: a ball sufficiently bigger than another absorbs it. The victim becomes a Rider,
--     stuck to the big ball, waving, until they Burst Off (after a short delay, or automatically).
--   * Burst Off: the rider launches away, knocks a chunk of the host's recent props loose as loot,
--     and comes back at a healthy fraction of their old size with a comeback growth boost.
--   * Bumps: similar-size balls colliding at speed scatter props off both, with a big CLANG.
-- Being rolled up is designed to be a funny setback and a story, never a reason to quit.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Absorb = require(Shared.Logic.Absorb)
local Growth = require(Shared.Logic.Growth)
local Tuning = require(Shared.Config.Tuning)
local Cores = require(Shared.Data.Cores)
local MathUtil = require(Shared.Util.MathUtil)

local PvpService = {}
PvpService.riders = {} :: { [any]: any } -- rider identity -> { host = BallState, weld, since, burstAt, autoAt, oldDiameter }
PvpService.Rolled = Signal.new() -- (hostState, victimIdentity, victimDiameter)
PvpService.Burst = Signal.new() -- (riderIdentity, hostState)
PvpService.Bumped = Signal.new() -- (stateA, stateB, closingSpeed)

local services
local pairCooldown: { [string]: number } = {}

function PvpService:init(s)
	services = s
end

local function pairKey(a, b): string
	local x, y = a.userId, b.userId
	if x > y then
		x, y = y, x
	end
	return x .. ":" .. y
end

local function isShielded(state): boolean
	return os.clock() < state.shieldUntil
end

function PvpService:isRider(identity): boolean
	return self.riders[identity] ~= nil
end

-- Attach a rolled-up victim's avatar to the host ball at the contact point.
local function attachRider(host, victim, contactDir: Vector3)
	local character = victim.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp or not host.part.Parent then
		return nil
	end
	services.BallService:markRiding(victim, true)
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.PlatformStand = true
	end
	local localDir = host.part.CFrame:VectorToObjectSpace(contactDir)
	if localDir.Magnitude < 1e-3 then
		localDir = Vector3.yAxis
	end
	localDir = localDir.Unit
	local r = host.diameter / 2
	-- Stand the avatar on the surface, head pointing outward, a little embedded.
	local up = localDir
	local basis = CFrame.lookAt(Vector3.zero, up, if math.abs(up.Y) > 0.95 then Vector3.xAxis else Vector3.yAxis) * CFrame.Angles(-math.pi / 2, 0, 0)
	local offset = CFrame.new(up * (r + 1.5)) * basis
	local weld = Instance.new("Weld")
	weld.Name = "RiderWeld"
	weld.Part0 = host.part
	weld.Part1 = hrp
	weld.C0 = offset
	weld.Parent = hrp
	return weld
end

-- Ball A rolls up ball B (B's owner becomes a rider on A).
function PvpService:rollUp(host, victimState)
	local victim = victimState.player
	local victimD = victimState.diameter
	local contact = victimState.part.Position - host.part.Position
	local contactDir = if contact.Magnitude > 1e-3 then contact.Unit else Vector3.yAxis
	local oldHostD = host.diameter

	-- The host gets most of the victim's volume: the single biggest growth moment in the game.
	local mult = services.BallService:growthMultiplier(host)
	if services.EventService then
		mult *= services.EventService:growthMultiplier(host)
	end
	local newD = Growth.absorbBall(oldHostD, victimD, { multiplier = mult })
	services.BallService:remove(victim, "rolled")
	services.BallService:setDiameter(host, newD, "rolled")
	host.stats.playersRolled = (host.stats.playersRolled or 0) + 1

	local weld = attachRider(host, victim, contactDir)
	local now = os.clock()
	local isBotVictim = not Net.isPlayer(victim)
	self.riders[victim] = {
		host = host,
		weld = weld,
		since = now,
		burstAt = now + Tuning.Pvp.RiderBurstDelay,
		autoAt = now + (if isBotVictim then 3 + math.random() * 5 else Tuning.Pvp.RiderAutoBurst),
		oldDiameter = victimD,
	}
	host.riders[victim] = true
	if services.RoundService then
		services.RoundService:setPlayerState(victim, "Rider")
		local vs = services.RoundService:stats(victim)
		vs.timesRolled += 1
		local hs = services.RoundService:stats(host.player)
		hs.playersRolled += 1
		-- Rolling up a player is the best "Roll of the Round" highlight material.
		local score = victimD * 3
		if not hs.biggestAbsorb or score > hs.biggestAbsorb.score then
			hs.biggestAbsorb = {
				score = score,
				kind = "player",
				userId = host.userId,
				name = host.player.DisplayName,
				victimId = victimState.userId,
				victimName = victim.DisplayName,
				diameter = newD,
			}
		end
	end

	Net.fire("PlayerState", victim, "Rider", {
		hostId = host.userId,
		hostBall = host.model,
		burstAt = workspace:GetServerTimeNow() + Tuning.Pvp.RiderBurstDelay,
		autoAt = workspace:GetServerTimeNow() + (self.riders[victim].autoAt - now),
		by = host.player.DisplayName,
	})
	Net.fireAll("Announce", "rolled", {
		hostId = host.userId,
		hostName = host.player.DisplayName,
		victimId = victimState.userId,
		victimName = victim.DisplayName,
		position = victimState.part.Position,
		diameter = newD,
	})
	self.Rolled:Fire(host, victim, victimD)
	if services.AnalyticsService then
		services.AnalyticsService:custom(victim, "RolledUp", victimD)
	end
end

-- Detach a rider. respawn=true gives them a new ball (burst off); false just frees the avatar.
function PvpService:release(identity, respawn: boolean, reason: string)
	local info = self.riders[identity]
	if not info then
		return
	end
	self.riders[identity] = nil
	local host = info.host
	if host and host.riders then
		host.riders[identity] = nil
	end
	if info.weld then
		info.weld:Destroy()
	end
	local character = identity.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not respawn then
		return
	end
	local round = services.RoundService
	if not round or not round:isPlaying() or not hrp then
		return
	end
	local hostAlive = host and host.alive and host.part.Parent
	local origin = if hostAlive then host.part.Position else hrp.Position
	local away = hrp.Position - origin
	away = Vector3.new(away.X, 0, away.Z)
	away = if away.Magnitude > 1e-3 then away.Unit else Vector3.new(1, 0, 0)

	-- Burst knocks a chunk of the host's recent props loose for everyone to grab.
	if hostAlive and reason == "burst" then
		local count = math.min(Tuning.Pvp.BurstKnockMax, math.max(2, math.floor(#host.history * Tuning.Pvp.BurstKnockFraction)))
		services.AbsorbService:knockLoose(host, count, hrp.Position, "burst")
		local lost = MathUtil.sphereVolume(host.diameter) * Tuning.Pvp.BurstHostVolumeLoss
		services.BallService:setDiameter(host, Growth.shrink(host.diameter, lost), "burst")
		services.BallService:impulse(host, -away * 25)
	end

	local newD = math.max(Tuning.Ball.StartDiameter, info.oldDiameter * Tuning.Pvp.RiderRespawnFraction)
	local spawnPos = (if hostAlive then origin + away * (host.diameter / 2 + newD + 4) else hrp.Position)
	local ground = services.WorldService:groundAt(spawnPos.X, spawnPos.Z)
	spawnPos = Vector3.new(spawnPos.X, math.max(ground, spawnPos.Y - newD), spawnPos.Z)
	local state = round:spawnIntoRound(identity, {
		diameter = newD,
		position = spawnPos,
		afterRolled = true,
		shield = 3,
	})
	if state then
		services.BallService:addGrowthBoost(state, Tuning.Pvp.ComebackMultiplier, Tuning.Pvp.ComebackDuration, "comeback")
		services.BallService:impulse(state, away * Tuning.Pvp.BurstLaunchSpeed + Vector3.new(0, Tuning.Pvp.BurstLaunchSpeed * 0.6, 0))
		state.stats.bursts = (state.stats.bursts or 0) + 1
	end
	Net.fireAll("BallFx", "burst", { userId = identity.UserId, position = spawnPos })
	self.Burst:Fire(identity, host)
end

function PvpService:releaseAllRiders(reason: string)
	for identity in self.riders do
		self:release(identity, false, reason)
	end
end

local function bump(a, b, closing: number, normal: Vector3)
	local key = pairKey(a, b)
	local now = os.clock()
	if pairCooldown[key] and now < pairCooldown[key] then
		return
	end
	pairCooldown[key] = now + Tuning.Pvp.BumpPairCooldown
	local base = Absorb.bumpScatterCount(closing)
	local function scatterFor(victim, attacker)
		local resist = 0
		local vDef = Cores.get(victim.core)
		if vDef and vDef.bumpResist then
			resist = vDef.bumpResist(victim.coreLevel)
		end
		local power = 1
		local aDef = Cores.get(attacker.core)
		if aDef and aDef.bumpPower then
			power = aDef.bumpPower(attacker.coreLevel)
		end
		return math.max(0, math.floor(base * power * (1 - resist) + 0.5))
	end
	local contact = a.part.Position + normal * (a.diameter / 2)
	services.AbsorbService:knockLoose(a, scatterFor(a, b), contact, "bump")
	services.AbsorbService:knockLoose(b, scatterFor(b, a), contact, "bump")
	-- Push apart, heavier (bigger) balls move less.
	local va, vb = MathUtil.sphereVolume(a.diameter), MathUtil.sphereVolume(b.diameter)
	local total = va + vb
	local push = closing * Tuning.Pvp.BumpImpulse
	services.BallService:impulse(a, -normal * push * (vb / total) * 2 + Vector3.new(0, push * 0.2, 0))
	services.BallService:impulse(b, normal * push * (va / total) * 2 + Vector3.new(0, push * 0.2, 0))
	a.stats.bumps = (a.stats.bumps or 0) + 1
	b.stats.bumps = (b.stats.bumps or 0) + 1
	Net.fireAll("BallFx", "bump", {
		a = a.userId,
		b = b.userId,
		position = contact,
		power = math.clamp(closing / (Tuning.Pvp.BumpMinRelativeSpeed * 3), 0.2, 1),
		size = math.max(a.diameter, b.diameter),
	})
	PvpService.Bumped:Fire(a, b, closing)
end

local function tick()
	local round = services.RoundService
	if round and not round:isPlaying() then
		return
	end
	local balls = services.BallService:all()
	for i = 1, #balls do
		local a = balls[i]
		if not a.alive or not a.part.Parent then
			continue
		end
		for j = i + 1, #balls do
			local b = balls[j]
			if not b.alive or not b.part.Parent then
				continue
			end
			local pa, pb = a.part.Position, b.part.Position
			local delta = pb - pa
			local dist = delta.Magnitude
			local reach = (a.diameter + b.diameter) / 2
			local latency = Absorb.latencyReach(math.max(a.part.AssemblyLinearVelocity.Magnitude, b.part.AssemblyLinearVelocity.Magnitude)) * 0.5
			if dist <= reach * 1.04 + latency then
				local big, small = a, b
				if b.diameter > a.diameter then
					big, small = b, a
				end
				if Absorb.canAbsorbBall(big.diameter, small.diameter) then
					if not isShielded(small) and not big.mergedWith and not small.mergedWith then
						PvpService:rollUp(big, small)
						return -- ball list changed; continue next tick
					end
				elseif Absorb.isBumpPair(a.diameter, b.diameter) and dist > 1e-3 then
					local normal = delta / dist
					local closing = (a.part.AssemblyLinearVelocity - b.part.AssemblyLinearVelocity):Dot(normal)
					if closing >= Tuning.Pvp.BumpMinRelativeSpeed then
						bump(a, b, closing, normal)
					end
				end
			end
		end
	end
end

local function riderTick()
	local now = os.clock()
	for identity, info in PvpService.riders do
		local host = info.host
		-- Host vanished (left, launched, rolled up itself): free the rider with a new ball.
		if not host or not host.alive or not host.part.Parent then
			PvpService:release(identity, true, "hostgone")
		elseif now >= info.autoAt then
			PvpService:release(identity, true, "burst")
		elseif info.weld and info.weld.Parent then
			-- Keep riders on the surface as the host grows.
			local c0 = info.weld.C0
			local dir = c0.Position.Unit
			info.weld.C0 = CFrame.new(dir * (host.diameter / 2 + 1.5)) * (c0 - c0.Position)
		end
	end
end

function PvpService:start()
	services.BallService.BurstRequested:Connect(function(player)
		local info = self.riders[player]
		if info and os.clock() >= info.burstAt then
			self:release(player, true, "burst")
		end
	end)
	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc += dt
		if acc >= 1 / 20 then
			acc = 0
			local ok, err = pcall(tick)
			if not ok then
				warn("[Pvp] tick: " .. tostring(err))
			end
			pcall(riderTick)
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		self.riders[player] = nil
		for _, state in services.BallService:all() do
			if state.riders[player] then
				state.riders[player] = nil
			end
		end
	end)
end

return PvpService
