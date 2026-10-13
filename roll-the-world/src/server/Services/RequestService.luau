--!nonstrict
-- Daily reasons to come back:
--   * Login streak, claimed once per UTC day (Daily.claimStreak) for Stardust and exclusive shells.
--   * Nana Nova's three daily requests, progressed by what you do in any round, claimed for
--     Stardust, plus a bonus for finishing all three (and Nana's Knit shell after five such days).
-- Progress is applied server-side from gameplay signals; the client only ever asks to claim/swap.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Daily = require(Shared.Logic.Daily)
local Rarity = require(Shared.Config.Rarity)
local Cosmetics = require(Shared.Data.Cosmetics)

local RequestService = {}

local services
local dirtyAt: { [Player]: number } = {}

local SYNC_DELAY = 1.2 -- coalesce progress syncs (absorbs happen many times a second)

function RequestService:init(s)
	services = s
end

local function today(): number
	return Daily.dayIndex(os.time())
end

local function data(player: Player)
	return services.PlayerDataService:getLoaded(player)
end

-- Roll over to today's requests if the saved ones are from another day.
local function ensureToday(player: Player): boolean
	local d = data(player)
	if not d then
		return false
	end
	local day = today()
	if d.daily.day == day and #d.daily.requests == 3 then
		return false
	end
	services.PlayerDataService:update(player, function(p)
		p.daily = {
			day = day,
			requests = Daily.generate(player.UserId, day),
			bonusClaimed = false,
			swaps = 0,
		}
	end)
	return true
end

local function grantShell(player: Player, shellId: string): boolean
	local granted = false
	services.PlayerDataService:update(player, function(p)
		if p.cosmetics.shells[shellId] then
			return false
		end
		p.cosmetics.shells[shellId] = true
		granted = true
		return true
	end)
	return granted
end

-- Apply one gameplay event to a player's requests.
local function push(player: any, ev)
	if not Net.isPlayer(player) then
		return
	end
	local d = data(player)
	if not d then
		return
	end
	if d.daily.day ~= today() then
		ensureToday(player)
	end
	local anyChange = false
	for slot, req in d.daily.requests do
		local changed, completed = Daily.apply(req, ev)
		if changed then
			anyChange = true
		end
		if completed then
			Net.fire("Toast", player, "request", {
				slot = slot,
				text = Daily.describe(req),
				icon = Daily.icon(req),
				reward = req.reward,
			})
			if services.AnalyticsService and services.AnalyticsService.custom then
				services.AnalyticsService:custom(player, "RequestDone", req.tier)
			end
		end
	end
	if anyChange then
		-- Mark dirty without syncing every absorb; the flush loop syncs shortly after.
		services.PlayerDataService:markDirty(player)
		if not dirtyAt[player] then
			dirtyAt[player] = os.clock()
		end
	end
end

-- CLAIMS -----------------------------------------------------------------------------------------

local function claimStreak(player: Player)
	local d = data(player)
	if not d then
		return false, "loading"
	end
	local updated, reward = Daily.claimStreak(d.streak, today())
	if not updated or not reward then
		return false, "claimed"
	end
	local stardust = reward.stardust
	local shellGranted = nil
	services.PlayerDataService:update(player, function(p)
		p.streak = updated
	end)
	if reward.shell then
		if grantShell(player, reward.shell) then
			shellGranted = reward.shell
		else
			stardust += Daily.ShellDuplicateStardust
		end
	end
	services.PlayerDataService:grantStardust(player, stardust, "Streak")
	return true, { count = updated.count, stardust = stardust, shell = shellGranted }
end

local function claimRequest(player: Player, slot: number)
	local d = data(player)
	if not d then
		return false, "loading"
	end
	ensureToday(player)
	local req = d.daily.requests[slot]
	if not req or not req.done or req.claimed then
		return false, "not_ready"
	end
	services.PlayerDataService:update(player, function()
		req.claimed = true
	end)
	services.PlayerDataService:grantStardust(player, req.reward, "NanaRequest")
	local result = { stardust = req.reward, bonus = nil, shell = nil }
	local allClaimed = true
	for _, r in d.daily.requests do
		if not r.claimed then
			allClaimed = false
		end
	end
	if allClaimed and not d.daily.bonusClaimed then
		services.PlayerDataService:update(player, function(p)
			p.daily.bonusClaimed = true
			p.nanaDays += 1
		end)
		services.PlayerDataService:grantStardust(player, Daily.AllDoneBonus, "NanaBonus")
		result.bonus = Daily.AllDoneBonus
		if d.nanaDays >= Daily.KnitShellDays and Cosmetics.ById.Knitted and grantShell(player, "Knitted") then
			result.shell = "Knitted"
		end
	end
	return true, result
end

local function swapRequest(player: Player, slot: number)
	local d = data(player)
	if not d then
		return false, "loading"
	end
	ensureToday(player)
	if d.daily.swaps >= 1 then
		return false, "no_swaps"
	end
	local req = d.daily.requests[slot]
	if not req or req.done then
		return false, "not_swappable"
	end
	local replacement = Daily.reroll(d.daily.requests, slot, player.UserId, d.daily.day, d.daily.swaps)
	if not replacement then
		return false, "not_swappable"
	end
	services.PlayerDataService:update(player, function(p)
		p.daily.requests[slot] = replacement
		p.daily.swaps += 1
	end)
	return true, replacement
end

-- LIFECYCLE --------------------------------------------------------------------------------------

function RequestService:start()
	local pds = services.PlayerDataService
	if not pds then
		warn("[Requests] PlayerDataService missing; daily requests disabled")
		return
	end
	pds.Loaded:Connect(function(player)
		ensureToday(player)
		local d = data(player)
		local claimable, count = Daily.streakStatus(d.streak, today())
		Net.fire("Toast", player, "daily", {
			streakClaimable = claimable,
			streakNext = count,
			resetIn = Daily.secondsUntilReset(os.time()),
		})
	end)

	Net.action("ClaimStreak", Guard.optional(Guard.boolean()), function(player)
		return claimStreak(player)
	end, 2)
	Net.action("ClaimRequest", Guard.integer(1, 3), function(player, slot)
		return claimRequest(player, slot)
	end, 4)
	Net.action("SwapRequest", Guard.integer(1, 3), function(player, slot)
		return swapRequest(player, slot)
	end, 2)

	-- Gameplay -> request progress.
	services.AbsorbService.Absorbed:Connect(function(state, prop)
		local rarity = Rarity.get(prop.def.rarity)
		push(state.player, {
			kind = "absorb",
			tags = prop.def.tags,
			rarityOrder = rarity and rarity.order or 1,
			mutated = prop.mutation > 0,
			critter = prop.critter,
			landmark = prop.landmark,
		})
	end)
	services.BallService.DiameterChanged:Connect(function(state, old, new)
		-- Only whole-stud milestones matter for size requests.
		if math.floor(new) > math.floor(old) then
			push(state.player, { kind = "size", diameter = new })
		end
	end)
	if services.PvpService then
		services.PvpService.Rolled:Connect(function(host)
			push(host.player, { kind = "rolledPlayer" })
		end)
	end
	services.RoundService.RoundEnded:Connect(function(statsList)
		for _, stats in statsList do
			local player = Players:GetPlayerByUserId(stats.userId)
			if player then
				push(player, { kind = "roundEnd", placement = stats.placement })
			end
		end
	end)

	-- Flush coalesced syncs; roll everyone over at UTC midnight.
	task.spawn(function()
		local lastDay = today()
		while true do
			task.wait(0.5)
			local now = os.clock()
			for player, at in dirtyAt do
				if now - at >= SYNC_DELAY then
					dirtyAt[player] = nil
					if player.Parent then
						pds:sync(player)
					end
				end
			end
			local day = today()
			if day ~= lastDay then
				lastDay = day
				for _, player in Players:GetPlayers() do
					if ensureToday(player) then
						Net.fire("Toast", player, "daily", { newDay = true, streakClaimable = true, resetIn = Daily.secondsUntilReset(os.time()) })
					end
				end
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		dirtyAt[player] = nil
	end)
end

return RequestService
