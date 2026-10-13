--!nonstrict
-- Continuous round loop: Playing (Scramble -> world event -> FINAL ROLL) -> Launch -> Results
-- (podium + awards) -> Intermission (hub) -> next map. Players can drop in at any moment.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Guard = require(Shared.Util.Guard)
local Tuning = require(Shared.Config.Tuning)
local Tiers = require(Shared.Config.Tiers)
local Rarity = require(Shared.Config.Rarity)
local Kits = require(Shared.Data.Kits)
local Mutations = require(Shared.Data.Mutations)
local Awards = require(Shared.Logic.Awards)
local Rewards = require(Shared.Logic.Rewards)
local ModeScoring = require(Shared.Logic.ModeScoring)
local Modes = require(Shared.Data.Modes)

local RoundService = {}

RoundService.state = "Starting" -- Playing | Launch | Results | Intermission
RoundService.phase = "Scramble" -- Scramble | FinalRoll
RoundService.endsAt = 0 -- server time (workspace:GetServerTimeNow())
RoundService.startedAt = 0
RoundService.roundId = 0
RoundService.kitId = nil
RoundService.tier = Tiers.forPlace(game.PlaceId)
RoundService.roundStats = {} :: { [number]: any }
RoundService.playerState = {} :: { [Player]: string }
RoundService.ready = {} :: { [Player]: boolean }
RoundService.lastResults = nil
RoundService.modeId = "Classic"
RoundService.teams = {} :: { [number]: string } -- userId -> "Red" | "Blue" (team modes)
RoundService.crownId = nil :: number?
RoundService.vote = nil :: any -- { options, votes = { [userId] = index }, endsAt }
RoundService.nextChoice = nil :: any -- { kitId, modeId } decided by the vote

RoundService.RoundStarted = Signal.new()
RoundService.FinalRollStarted = Signal.new()
RoundService.RoundEnded = Signal.new() -- (statsList)
RoundService.PlayerStateChanged = Signal.new()

local services
local kitQueue = {}
local eventFired = {}

local function now(): number
	return Workspace:GetServerTimeNow()
end

local function roundLength(): number
	local live = services.LiveConfigService
	return (live and live:get("roundLength")) or Modes.get(RoundService.modeId).length or Tuning.Round.Length
end

function RoundService:mode()
	return Modes.get(self.modeId)
end

function RoundService:eventTimes(): { number }
	return self:mode().eventTimes or Tuning.Round.EventTimes
end

-- Team for a ball owner (assigned on first ask in team modes; nil otherwise).
function RoundService:teamOf(player: any): string?
	if not self:mode().teams then
		return nil
	end
	local team = self.teams[player.UserId]
	if not team then
		local counts = { Red = 0, Blue = 0 }
		for _, t in self.teams do
			counts[t] += 1
		end
		team = ModeScoring.pickTeam(counts)
		self.teams[player.UserId] = team
	end
	return team
end

function RoundService:sameTeam(a: any, b: any): boolean
	if not self:mode().teams or not a or not b then
		return false
	end
	local ta, tb = self:teamOf(a), self:teamOf(b)
	return ta ~= nil and ta == tb
end

function RoundService:init(s)
	services = s
end

function RoundService:isPlaying(): boolean
	return self.state == "Playing"
end

function RoundService:isFinalRoll(): boolean
	return self.state == "Playing" and self.phase == "FinalRoll"
end

function RoundService:timeLeft(): number
	return math.max(0, self.endsAt - now())
end

function RoundService:setPlayerState(player: Player, state: string)
	self.playerState[player] = state
	player:SetAttribute("RollState", state)
	self.PlayerStateChanged:Fire(player, state)
end

-- Per-player stats that survive ball respawns within a round.
function RoundService:stats(player: Player)
	local s = self.roundStats[player.UserId]
	if not s then
		s = {
			userId = player.UserId,
			name = player.DisplayName,
			finalDiameter = 0,
			peakDiameter = 0,
			discoveries = 0,
			newVariants = 0,
			playersRolled = 0,
			timesRolled = 0,
			respawnDiameter = 0,
			comebackRatio = 0,
			requestsCompleted = 0,
			rarestOrder = 0,
			rarestUid = 0,
			rarestMutation = 0,
			rarityPoints = 0,
			absorbed = 0,
			crownTime = 0,
			goldPoints = 0,
			team = nil,
			biggestAbsorb = nil,
			joinedAt = os.clock(),
		}
		self.roundStats[player.UserId] = s
	end
	return s
end

function RoundService:snapshot()
	local top = {}
	for _, state in services.BallService:all() do
		local st = self.roundStats[state.userId]
		local entry = {
			userId = state.userId,
			name = state.player.DisplayName,
			d = state.diameter,
			avatarId = (state.player :: any).avatarId,
			team = self.teams[state.userId],
		}
		entry.s = ModeScoring.score(self.modeId, { userId = state.userId, finalDiameter = state.diameter, crownTime = st and st.crownTime, goldPoints = st and st.goldPoints })
		table.insert(top, entry)
	end
	table.sort(top, function(a, b)
		if a.s == b.s then
			return a.d > b.d
		end
		return a.s > b.s
	end)
	for i = #top, 4, -1 do
		top[i] = nil
	end
	local event = services.EventService and services.EventService:current()
	return {
		state = self.state,
		phase = self.phase,
		endsAt = self.endsAt,
		roundId = self.roundId,
		kitId = self.kitId,
		tier = self.tier.id,
		cmPerStud = self.tier.cmPerStud,
		landmarkId = services.WorldService.landmarkId,
		top = top,
		event = event,
		players = #Players:GetPlayers(),
		mode = self.modeId,
		mutator = services.EventService and services.EventService:mutatorId() or nil,
		mods = services.EventService and services.EventService:mods() or nil,
		teamTotals = if self:mode().teams then self:teamTotals() else nil,
		crownId = self.crownId,
		vote = self:voteSnapshot(),
	}
end

function RoundService:broadcast()
	Net.fireAll("RoundState", self:snapshot())
end

-- Kit rotation: shuffled bag per tier; live config or a private-server host can force a kit.
local function nextKit(): string
	local live = services.LiveConfigService
	local forced = live and live:get("forceKit")
	local social = services.SocialService
	local hostKit = social and social:hostSetting("kit")
	if hostKit and Kits.get(hostKit) then
		return hostKit
	end
	if forced and Kits.get(forced) then
		return forced
	end
	if #kitQueue == 0 then
		for _, kit in Kits.forTier(RoundService.tier.id) do
			table.insert(kitQueue, kit.id)
		end
		if #kitQueue == 0 then
			table.insert(kitQueue, Kits.List[1].id)
		end
		for i = #kitQueue, 2, -1 do
			local j = math.random(1, i)
			kitQueue[i], kitQueue[j] = kitQueue[j], kitQueue[i]
		end
		-- Avoid repeating the previous kit back to back.
		if kitQueue[#kitQueue] == RoundService.kitId and #kitQueue > 1 then
			kitQueue[1], kitQueue[#kitQueue] = kitQueue[#kitQueue], kitQueue[1]
		end
	end
	return table.remove(kitQueue) :: string
end

local function medianDiameter(): number
	local list = {}
	for _, state in services.BallService:all() do
		table.insert(list, state.diameter)
	end
	if #list == 0 then
		return Tuning.Ball.StartDiameter
	end
	table.sort(list)
	return list[math.ceil(#list / 2)]
end

-- Spawn (or respawn) a player into the running round.
function RoundService:spawnIntoRound(player: Player, options: { [string]: any }?)
	local opts: { [string]: any } = options or {}
	if self.state ~= "Playing" then
		return
	end
	local character = player.Character
	if not character or not character:FindFirstChild("HumanoidRootPart") then
		return
	end
	local diameter = opts.diameter or Tuning.Ball.StartDiameter
	local boosts = {}
	if opts.catchUp then
		local median = medianDiameter()
		diameter = math.max(Tuning.Ball.StartDiameter, median * Tuning.Pvp.CatchUpFraction)
		if median > Tuning.Ball.StartDiameter * 2 then
			table.insert(boosts, {
				mult = Tuning.Pvp.CatchUpBoostMultiplier,
				untilT = os.clock() + Tuning.Pvp.CatchUpBoostDuration,
				reason = "catchup",
			})
		end
	end
	local position = opts.position
	if not position then
		local spawns = services.WorldService:spawnPoints()
		position = if #spawns > 0 then spawns[math.random(1, #spawns)] else Vector3.new(0, 50, 0)
		-- Party members spawn next to each other.
		local social = services.SocialService
		local buddy = social and social:spawnBuddy(player)
		if buddy then
			local buddyBall = services.BallService:get(buddy)
			if buddyBall and buddyBall.part.Parent then
				position = buddyBall.part.Position + Vector3.new(math.random(-8, 8), buddyBall.diameter, math.random(-8, 8))
			end
		end
		-- Bigger drop-in balls start a little off the crowded spawn counter.
		if diameter > 20 then
			local a = math.random() * math.pi * 2
			local r = services.WorldService.kit.arenaHalf * 0.5
			local x, z = math.cos(a) * r, math.sin(a) * r
			position = Vector3.new(x, services.WorldService:groundAt(x, z) + 2, z)
		end
	end
	local state = services.BallService:spawn(player, position, diameter, { growthBoosts = boosts, shield = opts.shield })
	if state then
		local team = self:teamOf(player)
		if team then
			state.part:SetAttribute("Team", team)
			self:stats(player).team = team
		end
		self:setPlayerState(player, "Rolling")
		local stats = self:stats(player)
		stats.peakDiameter = math.max(stats.peakDiameter, diameter)
		if opts.afterRolled then
			stats.respawnDiameter = diameter
		end
	end
	return state
end

local function moveAllToHub()
	for _, player in Players:GetPlayers() do
		services.BallService:remove(player, "round_end")
		if services.HubService then
			services.HubService:sendToHub(player)
		end
		RoundService:setPlayerState(player, "Hub")
	end
end

function RoundService:startRound()
	self.roundId += 1
	local choice = self.nextChoice
	self.nextChoice = nil
	self.vote = nil
	self.kitId = if choice and Kits.get(choice.kitId) then choice.kitId else nextKit()
	-- The very first round of a server is always Classic so new players learn the basics.
	self.modeId = if choice then Modes.get(choice.modeId).id else (if self.roundId == 1 then "Classic" else self:randomMode())
	table.clear(self.teams)
	self.crownId = nil
	local seed = math.floor(os.time() % 1000000) * 7919 + self.roundId * 104729
	table.clear(self.roundStats)
	table.clear(eventFired)
	local events = services.EventService
	if events then
		events:chooseMutator(self.roundId > 1)
	end
	local mode = self:mode()
	services.WorldService:load(self.kitId, seed, function(world)
		if events then
			events:prepareWorld(world, mode)
		end
	end)
	self.state = "Playing"
	self.phase = "Scramble"
	self.startedAt = now()
	self.endsAt = self.startedAt + roundLength()
	for _, player in Players:GetPlayers() do
		if self.ready[player] then
			self:spawnIntoRound(player)
		end
	end
	self.RoundStarted:Fire(self.kitId, self.roundId)
	if services.AnalyticsService then
		services.AnalyticsService:serverEvent("RoundStart", { kit = self.kitId, players = #Players:GetPlayers() })
	end
	self:broadcast()
end

local function collectStats(): { any }
	local list = {}
	local everyone = table.clone(Players:GetPlayers()) :: { any }
	if services.BotService then
		for _, bot in services.BotService:identities() do
			table.insert(everyone, bot)
		end
	end
	for _, player in everyone do
		local stats = RoundService.roundStats[player.UserId]
		if stats then
			local ball = services.BallService:get(player)
			stats.finalDiameter = if ball then ball.diameter else stats.finalDiameter
			stats.name = player.DisplayName
			if stats.timesRolled > 0 and stats.respawnDiameter > 0 then
				stats.comebackRatio = stats.finalDiameter / stats.respawnDiameter
			end
			table.insert(list, stats)
		end
	end
	return list
end

function RoundService:launch()
	self.state = "Launch"
	self.phase = "Launch"
	self.endsAt = now() + Tuning.Round.Launch
	-- Riders and merged partners pop off first so every ball launches clean.
	if services.PvpService then
		services.PvpService:releaseAllRiders("launch")
	end
	if services.MergeService then
		services.MergeService:splitAll("launch")
	end
	local launchList = {}
	for _, state in services.BallService:all() do
		local part = state.part
		if part and part.Parent then
			part.Anchored = true
			state.alive = false -- freezes absorbing, validation and PvP
			table.insert(launchList, {
				userId = state.userId,
				ball = state.model,
				diameter = state.diameter,
				launchFx = state.launchFx,
			})
		end
	end
	local statsList = collectStats()
	-- Planets are born from the launched balls (GalaxyService stores them compactly).
	if services.GalaxyService then
		for _, state in services.BallService.states do
			local ok, err = pcall(services.GalaxyService.createPlanet, services.GalaxyService, state, self.kitId)
			if not ok then
				warn("[Round] planet creation failed: " .. tostring(err))
			end
		end
	end
	Net.fireAll("LaunchSequence", launchList, self.endsAt)
	self:broadcast()
	return statsList
end

function RoundService:results(statsList)
	self.state = "Results"
	self.phase = "Results"
	self.endsAt = now() + Tuning.Round.Results
	local mode = self:mode()
	local modeId = self.modeId
	local awards = Awards.select(statsList, {
		title = mode.winnerTitle,
		icon = mode.winnerIcon,
		score = function(p)
			return ModeScoring.score(modeId, p)
		end,
	})
	local standings = ModeScoring.standings(modeId, statsList)
	local winningTeam = ModeScoring.winningTeam(modeId, statsList)
	local awardCount = {}
	for _, award in awards do
		awardCount[award.userId] = (awardCount[award.userId] or 0) + 1
	end

	for place, stats in standings do
		stats.placement = place
	end

	-- Stardust for everyone who played.
	local payouts = {}
	for _, stats in statsList do
		local player = Players:GetPlayerByUserId(stats.userId)
		if player then
			local data = services.PlayerDataService
			local monet = services.MonetizationService
			local social = services.SocialService
			local events = services.EventService
			local breakdown = Rewards.round({
				finalDiameter = stats.finalDiameter,
				cmPerStud = self.tier.cmPerStud,
				discoveries = stats.discoveries,
				newVariants = stats.newVariants,
				playersRolled = stats.playersRolled,
				awards = awardCount[stats.userId] or 0,
				rarityPoints = stats.rarityPoints,
				friendsInServer = if social then social:friendCount(player) else 0,
				vip = if monet then monet:hasPass(player, "VIP") else false,
				doubleStardust = if monet then monet:hasPass(player, "DoubleStardust") else false,
				eventMultiplier = if events then events:stardustMultiplier() else 1,
			})
			payouts[stats.userId] = breakdown
			if data then
				data:grantStardust(player, breakdown.total, "Round")
				data:recordRound(player, stats, awardCount[stats.userId] or 0)
			end
		end
	end

	local podium = {}
	for i = 1, math.min(3, #standings) do
		podium[i] = { userId = standings[i].userId, name = standings[i].name, d = standings[i].finalDiameter, s = ModeScoring.score(modeId, standings[i]), team = standings[i].team }
	end
	-- Roll of the Round: the single biggest absorption (players rolled count extra).
	local highlight = nil
	for _, stats in statsList do
		local b = stats.biggestAbsorb
		if b and (highlight == nil or b.score > highlight.score) then
			highlight = b
		end
	end

	moveAllToHub()
	-- Winners stand on the podium.
	if services.HubService then
		for i, entry in podium do
			local player = Players:GetPlayerByUserId(entry.userId)
			if player and services.HubService.podium[i] then
				services.HubService:sendToHub(player, services.HubService.podium[i])
			end
		end
	end

	self.lastResults = {
		roundId = self.roundId,
		kitId = self.kitId,
		awards = awards,
		podium = podium,
		standings = standings,
		highlight = highlight,
		cmPerStud = self.tier.cmPerStud,
		mode = modeId,
		winningTeam = winningTeam,
		teamTotals = if mode.teams then ModeScoring.teamTotals(statsList) else nil,
	}
	for _, player in Players:GetPlayers() do
		local personal = table.clone(self.lastResults)
		personal.payout = payouts[player.UserId]
		personal.mine = self.roundStats[player.UserId]
		Net.fire("Results", player, personal)
	end
	self.RoundEnded:Fire(statsList, awards)
	self.crownId = nil
	self:openVote()
	self:broadcast()
end

function RoundService:intermission()
	self.state = "Intermission"
	self.phase = "Intermission"
	local social = services.SocialService
	local length = (social and social:hostSetting("intermission")) or Tuning.Round.Intermission
	self.endsAt = now() + length
	self:broadcast()
end

local function waitUntil(t: number)
	while now() < t do
		task.wait(0.25)
	end
end

-- Recording the round's notable moments for awards and the highlight.
local function hookStats()
	services.AbsorbService.Absorbed:Connect(function(state, prop, info)
		local player = state.player
		if not player or not player.Parent then
			return
		end
		local stats = RoundService:stats(player)
		stats.absorbed += 1
		local mutDef = Mutations.get(prop.mutation)
		if mutDef then
			stats.goldPoints += mutDef.stardust
		end
		if info.isNew then
			stats.discoveries += 1
		end
		if info.isNewVariant then
			stats.newVariants += 1
		end
		local rarity = Rarity.get(prop.def.rarity)
		local mut = Mutations.get(prop.mutation)
		local order = rarity.order + (if mut then mut.rarityBoost else 0)
		stats.rarityPoints += (Tuning.Rewards.RarityBonus[rarity.id] or 0) * (if mut then mut.stardust else 1)
		if order > stats.rarestOrder then
			stats.rarestOrder = order
			stats.rarestUid = prop.uid
			stats.rarestMutation = prop.mutation
		end
		local score = prop.absorbSize
		if not stats.biggestAbsorb or score > stats.biggestAbsorb.score then
			stats.biggestAbsorb = {
				score = score,
				kind = "prop",
				userId = player.UserId,
				name = player.DisplayName,
				uid = prop.uid,
				mutation = prop.mutation,
				diameter = state.diameter,
			}
		end
		-- Legendary first discoveries are announced to the whole server.
		if info.isNew and rarity.announce then
			Net.fireAll("Announce", "legendary", { name = player.DisplayName, uid = prop.uid, mutation = prop.mutation })
		end
	end)
	services.BallService.DiameterChanged:Connect(function(state, _, new)
		local stats = RoundService:stats(state.player)
		stats.peakDiameter = math.max(stats.peakDiameter, new)
		stats.finalDiameter = new
	end)
end

function RoundService:teamTotals(): { [string]: number }
	local totals = { Red = 0, Blue = 0 }
	for _, state in services.BallService:all() do
		local team = self.teams[state.userId]
		if team then
			totals[team] += state.diameter
		end
	end
	return totals
end

function RoundService:randomMode(): string
	local balls = #services.BallService:all() + #Players:GetPlayers()
	local pool, total = {}, 0
	for _, m in Modes.List do
		if (m.minBalls or 0) <= math.max(balls, Tuning.Bots.TargetBalls) then
			table.insert(pool, m)
			total += m.weight
		end
	end
	local r = math.random() * total
	for _, m in pool do
		r -= m.weight
		if r <= 0 then
			return m.id
		end
	end
	return "Classic"
end

-- Per-tick mode rules: the crown follows the biggest ball and banks crown time.
local lastCrownAnnounce = 0
function RoundService:tickMode(dt: number)
	if self:mode().scoring ~= "crown" or self.state ~= "Playing" then
		return
	end
	local best, bestD = nil, 0
	for _, state in services.BallService:all() do
		if state.alive and state.diameter > bestD then
			best, bestD = state, state.diameter
		end
	end
	local newId = best and best.userId or nil
	if newId ~= self.crownId then
		for _, state in services.BallService:all() do
			if state.part then
				state.part:SetAttribute("Crown", if state.userId == newId then true else nil)
			end
		end
		self.crownId = newId
		if best and now() - lastCrownAnnounce > 3 then
			lastCrownAnnounce = now()
			Net.fireAll("Announce", "crown", { userId = best.userId, name = best.player.DisplayName })
		end
	end
	if best then
		local st = self:stats(best.player)
		st.crownTime += dt
	end
end

-- VOTE ---------------------------------------------------------------------------------------

function RoundService:openVote()
	-- Three different map + mode combos; at least one is a new map.
	local kits = {}
	for _, kit in Kits.forTier(self.tier.id) do
		table.insert(kits, kit.id)
	end
	if #kits == 0 then
		table.insert(kits, Kits.List[1].id)
	end
	local options = {}
	local usedModes = {}
	for i = 1, 3 do
		local kitId = kits[((self.roundId + i) % #kits) + 1]
		if i == 1 and #kits > 1 and kitId == self.kitId then
			kitId = kits[((self.roundId + i + 1) % #kits) + 1]
		end
		local modeId = self:randomMode()
		for _ = 1, 6 do
			if not usedModes[modeId] then
				break
			end
			modeId = self:randomMode()
		end
		usedModes[modeId] = true
		table.insert(options, { kitId = kitId, modeId = modeId })
	end
	local social = services.SocialService
	local length = (social and social:hostSetting("intermission")) or Tuning.Round.Intermission
	self.vote = {
		options = options,
		votes = {},
		endsAt = now() + Tuning.Round.Results + length - 1,
	}
	-- Bots vote too, at human-ish moments.
	if services.BotService then
		for _, bot in services.BotService:identities() do
			task.delay(2 + math.random() * (Tuning.Round.Results + length - 6), function()
				if self.vote and self.vote.options == options then
					self.vote.votes[bot.UserId] = math.random(1, 3)
					self:broadcast()
				end
			end)
		end
	end
end

function RoundService:closeVote()
	local vote = self.vote
	if not vote then
		return
	end
	local pick = ModeScoring.resolveVote(#vote.options, vote.votes, math.random(1, 3))
	self.nextChoice = vote.options[pick]
	self.vote = nil
end

function RoundService:voteSnapshot()
	local vote = self.vote
	if not vote then
		return nil
	end
	local counts = table.create(#vote.options, 0)
	for _, idx in vote.votes do
		if counts[idx] then
			counts[idx] += 1
		end
	end
	return { options = vote.options, counts = counts, endsAt = vote.endsAt }
end

function RoundService:loop()
	-- First round starts immediately so nobody waits in a lobby.
	self:startRound()
	while true do
		local fireAt = {}
		for _, t in self:eventTimes() do
			table.insert(fireAt, self.startedAt + t)
		end
		local lastTick = now()
		while now() < self.endsAt do
			local tickNow = now()
			self:tickMode(tickNow - lastTick)
			lastTick = tickNow
			local left = self.endsAt - now()
			if self.phase == "Scramble" and left <= Tuning.Round.FinalRoll then
				self.phase = "FinalRoll"
				self.FinalRollStarted:Fire()
				Net.fireAll("Announce", "finalroll", { landmarkId = services.WorldService.landmarkId })
				self:broadcast()
			end
			for i, t in fireAt do
				if not eventFired[i] and now() >= t and services.EventService then
					eventFired[i] = true
					services.EventService:triggerRoundEvent()
				end
			end
			task.wait(0.25)
		end
		local statsList = self:launch()
		waitUntil(self.endsAt)
		self:results(statsList)
		waitUntil(self.endsAt)
		self:intermission()
		waitUntil(self.endsAt)
		self:closeVote()
		self:startRound()
	end
end

-- Drop a newly joined player into the running round (once their client has built the props
-- around spawn, or after a short fallback so nobody waits).
local function dropIn(player: Player)
	if RoundService.state ~= "Playing" or not RoundService.ready[player] then
		return
	end
	if services.BallService:get(player) or RoundService.playerState[player] == "Rolling" then
		return
	end
	local catchUp = (now() - RoundService.startedAt) > 20
	RoundService:spawnIntoRound(player, { catchUp = catchUp })
end

local function onReady(player: Player)
	if RoundService.ready[player] then
		return
	end
	RoundService.ready[player] = true
	services.WorldService:sendTo(player)
	Net.fire("RoundState", player, RoundService:snapshot())
	if RoundService.lastResults and RoundService.state ~= "Playing" then
		Net.fire("Results", player, RoundService.lastResults)
	end
	RoundService:setPlayerState(player, "Hub")
	if RoundService.state == "Playing" then
		task.delay(6, function()
			if player.Parent then
				dropIn(player)
			end
		end)
	end
end

function RoundService:start()
	hookStats()
	Net.action("Ready", Guard.optional(Guard.boolean()), function(player)
		task.spawn(onReady, player)
		return true
	end, 2)
	Net.action("Vote", Guard.integer(1, 3), function(player, index)
		if not self.vote then
			return false
		end
		self.vote.votes[player.UserId] = index
		self:broadcast()
		return true
	end, 4)
	Net.action("Spawn", Guard.optional(Guard.boolean()), function(player)
		task.spawn(dropIn, player)
		return true
	end, 1)
	Players.PlayerRemoving:Connect(function(player)
		self.ready[player] = nil
		self.playerState[player] = nil
	end)
	-- Respawned characters during a round go straight back into a ball.
	Players.PlayerAdded:Connect(function(player)
		player.CharacterAdded:Connect(function()
			task.wait(0.2)
			if self.ready[player] and self.state == "Playing" and self.playerState[player] == "Rolling" and not services.BallService:get(player) then
				self:spawnIntoRound(player, { catchUp = true })
			end
		end)
	end)
	-- Periodic HUD refresh (top 3, timer drift).
	task.spawn(function()
		while true do
			task.wait(1)
			if self.state == "Playing" then
				self:broadcast()
			end
		end
	end)
	task.spawn(function()
		-- If anything in the loop throws, log it, reset to a fresh round and keep the server alive.
		while true do
			local ok, err = xpcall(self.loop, debug.traceback, self)
			if not ok then
				warn("[Round] loop error, restarting round: " .. tostring(err))
				task.wait(2)
				pcall(moveAllToHub)
			end
		end
	end)
end

return RoundService
