--!strict
-- Daily reasons to come back, as pure functions (unit tested; the server applies them):
--   * Login streak: claim once per UTC day; the ladder climbs for 7 days, loops with a weekly
--     bonus, and drops exclusive shells on days 7, 14 and 30. Missing a day restarts the streak.
--   * Nana Nova's requests: three requests per player per day (easy / medium / hard) generated
--     deterministically from (userId, day), progressed by things you do in any round, plus a bonus
--     for finishing all three. One free swap per day.

local Rng = require(script.Parent.Parent.Util.Rng)
local PropLibrary = require(script.Parent.PropLibrary)
local Kits = require(script.Parent.Parent.Data.Kits)

local Daily = {}

Daily.SECONDS_PER_DAY = 86400

function Daily.dayIndex(unixTime: number): number
	return unixTime // Daily.SECONDS_PER_DAY
end

-- Seconds until the next UTC midnight (when requests and the streak roll over).
function Daily.secondsUntilReset(unixTime: number): number
	return Daily.SECONDS_PER_DAY - (unixTime % Daily.SECONDS_PER_DAY)
end

-- LOGIN STREAK ----------------------------------------------------------------------------------

export type Streak = { day: number, count: number, best: number }
export type StreakReward = { stardust: number, shell: string?, label: string }

Daily.StreakLadder = { 100, 150, 200, 250, 350, 450, 1000 }
Daily.StreakShells = { [7] = "Starlight", [14] = "Golden", [30] = "Rainbow" }
Daily.ShellDuplicateStardust = 1000

-- Reward for reaching streak day `count` (1-based).
function Daily.streakReward(count: number): StreakReward
	local slot = (count - 1) % 7 + 1
	local week = (count - 1) // 7
	local stardust = math.floor(Daily.StreakLadder[slot] * (1 + 0.1 * math.min(week, 5)) + 0.5)
	local shell = Daily.StreakShells[count]
	local label = if shell then "Day " .. count .. "!" else "Day " .. count
	return { stardust = stardust, shell = shell, label = label }
end

-- What happens if the player claims today: claimable?, the streak count they'd reach.
function Daily.streakStatus(streak: Streak, today: number): (boolean, number)
	if streak.day == today then
		return false, streak.count
	end
	if streak.day == today - 1 then
		return true, streak.count + 1
	end
	return true, 1
end

-- Returns the updated streak and the reward, or nil if already claimed today.
function Daily.claimStreak(streak: Streak, today: number): (Streak?, StreakReward?)
	local claimable, count = Daily.streakStatus(streak, today)
	if not claimable then
		return nil, nil
	end
	local updated = { day = today, count = count, best = math.max(streak.best, count) }
	return updated, Daily.streakReward(count)
end

-- NANA'S REQUESTS -------------------------------------------------------------------------------

export type Request = {
	kind: string,
	tier: number, -- 1 easy, 2 medium, 3 hard
	target: number,
	progress: number,
	tag: string?,
	reward: number,
	done: boolean,
	claimed: boolean,
}

export type RequestEvent = {
	kind: "absorb" | "size" | "rolledPlayer" | "roundEnd",
	tags: { string }?,
	rarityOrder: number?,
	mutated: boolean?,
	critter: boolean?,
	landmark: boolean?,
	diameter: number?,
	placement: number?,
}

Daily.TierRewards = { 150, 300, 600 }
Daily.AllDoneBonus = 500
Daily.KnitShellDays = 5 -- days with all three finished to earn Nana's Knit shell

-- Targets per tier. Sizes are in studs (formatted for the current tier on the client).
Daily.Kinds = {
	absorbTotal = { targets = { 150, 450, 1000 }, tiers = { 1, 3 }, icon = "🧺" },
	absorbTag = { targets = { 10, 25, 50 }, tiers = { 1, 2 }, icon = "🏷️" },
	critters = { targets = { 3, 8, 15 }, tiers = { 1, 2 }, icon = "🐾" },
	rounds = { targets = { 2, 3, 5 }, tiers = { 1 }, icon = "🔁" },
	mutated = { targets = { 1, 3, 6 }, tiers = { 1, 2 }, icon = "🌟" },
	reachSize = { targets = { 30, 80, 130 }, tiers = { 2, 3 }, icon = "📏" },
	rollPlayers = { targets = { 1, 3, 6 }, tiers = { 2, 3 }, icon = "😆" },
	rare = { targets = { 2, 5, 10 }, tiers = { 2, 3 }, icon = "💎" },
	top3 = { targets = { 1, 2, 3 }, tiers = { 2, 3 }, icon = "🏅" },
	landmark = { targets = { 1, 1, 1 }, tiers = { 3 }, icon = "🗿" },
}

-- Stable order so generation is deterministic across servers.
local KIND_ORDER = { "absorbTotal", "absorbTag", "critters", "rounds", "mutated", "reachSize", "rollPlayers", "rare", "top3", "landmark" }

local friendlyTagCache: { string }? = nil

-- Tags that every kit has plenty of, so a tag request is completable whatever map comes up.
function Daily.friendlyTags(): { string }
	if friendlyTagCache then
		return friendlyTagCache
	end
	local perKit: { { [string]: number } } = {}
	for _, kit in Kits.List do
		local counts: { [string]: number } = {}
		for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
			if not def.landmark then
				for _, tag in def.tags do
					counts[tag] = (counts[tag] or 0) + 1
				end
			end
		end
		table.insert(perKit, counts)
	end
	local out = {}
	if #perKit > 0 then
		for tag in perKit[1] do
			local ok = true
			for _, counts in perKit do
				if (counts[tag] or 0) < 3 then
					ok = false
					break
				end
			end
			-- "critter" has its own request kind.
			if ok and tag ~= "critter" then
				table.insert(out, tag)
			end
		end
	end
	table.sort(out)
	friendlyTagCache = out
	return out
end

local function seedFor(userId: number, day: number, salt: number): number
	-- Mix into 32 bits, keeping every intermediate exact in a double (< 2^53).
	local u = math.abs(userId) % 1000003
	return ((u * 2654435761) % 4294967296 + day * 40503 + salt * 9973) % 4294967296
end

local function makeRequest(kind: string, tier: number, rng: any): Request
	local spec = Daily.Kinds[kind]
	local tag = nil
	if kind == "absorbTag" then
		local tags = Daily.friendlyTags()
		tag = if #tags > 0 then tags[rng:int(1, #tags)] else nil
		if not tag then
			kind = "absorbTotal"
			spec = Daily.Kinds.absorbTotal
		end
	end
	return {
		kind = kind,
		tier = tier,
		target = spec.targets[tier],
		progress = 0,
		tag = tag,
		reward = Daily.TierRewards[tier],
		done = false,
		claimed = false,
	}
end

local function candidates(tier: number, exclude: { [string]: boolean }): { string }
	local out = {}
	for _, kind in KIND_ORDER do
		local spec = Daily.Kinds[kind]
		if not exclude[kind] and spec.tiers[1] <= tier and tier <= spec.tiers[#spec.tiers] then
			table.insert(out, kind)
		end
	end
	return out
end

-- Today's three requests for a player.
function Daily.generate(userId: number, day: number): { Request }
	local rng = Rng.new(seedFor(userId, day, 1))
	local used: { [string]: boolean } = {}
	local list = {}
	for tier = 1, 3 do
		local pool = candidates(tier, used)
		local kind = pool[rng:int(1, #pool)]
		used[kind] = true
		table.insert(list, makeRequest(kind, tier, rng))
	end
	return list
end

-- Swap one request for a different kind of the same tier (deterministic per swap count).
function Daily.reroll(list: { Request }, slot: number, userId: number, day: number, swapCount: number): Request?
	local current = list[slot]
	if not current or current.claimed then
		return nil
	end
	local used: { [string]: boolean } = {}
	for _, r in list do
		used[r.kind] = true
	end
	local pool = candidates(current.tier, used)
	if #pool == 0 then
		return nil
	end
	local rng = Rng.new(seedFor(userId, day, 100 + slot * 17 + swapCount))
	return makeRequest(pool[rng:int(1, #pool)], current.tier, rng)
end

local function hasTag(tags: { string }?, tag: string?): boolean
	if not tags or not tag then
		return false
	end
	for _, t in tags do
		if t == tag then
			return true
		end
	end
	return false
end

-- Applies one gameplay event to a request. Returns true if progress changed (and whether it
-- just completed as a second value).
function Daily.apply(req: Request, ev: RequestEvent): (boolean, boolean)
	if req.done then
		return false, false
	end
	local before = req.progress
	local k = req.kind
	if ev.kind == "absorb" then
		if k == "absorbTotal" then
			req.progress += 1
		elseif k == "absorbTag" and hasTag(ev.tags, req.tag) then
			req.progress += 1
		elseif k == "critters" and ev.critter then
			req.progress += 1
		elseif k == "mutated" and ev.mutated then
			req.progress += 1
		elseif k == "rare" and (ev.rarityOrder or 0) >= 3 then
			req.progress += 1
		elseif k == "landmark" and ev.landmark then
			req.progress += 1
		end
	elseif ev.kind == "size" and k == "reachSize" then
		req.progress = math.max(req.progress, math.floor(ev.diameter or 0))
	elseif ev.kind == "rolledPlayer" and k == "rollPlayers" then
		req.progress += 1
	elseif ev.kind == "roundEnd" then
		if k == "rounds" then
			req.progress += 1
		elseif k == "top3" and (ev.placement or 99) <= 3 then
			req.progress += 1
		end
	end
	if req.progress == before then
		return false, false
	end
	req.progress = math.min(req.progress, req.target)
	if req.progress >= req.target then
		req.done = true
		return true, true
	end
	return true, false
end

-- Short human description (client and server share it so toasts match the board).
function Daily.describe(req: Request, formatSize: ((number) -> string)?): string
	local k, n = req.kind, req.target
	if k == "absorbTotal" then
		return string.format("Roll up %d things", n)
	elseif k == "absorbTag" then
		return string.format("Roll up %d %s things", n, req.tag or "")
	elseif k == "critters" then
		return string.format("Catch %d critters", n)
	elseif k == "rounds" then
		return string.format("Play %d rounds", n)
	elseif k == "mutated" then
		return string.format("Roll up %d sparkly mutated props", n)
	elseif k == "reachSize" then
		local size = if formatSize then formatSize(n) else tostring(n)
		return "Grow to " .. size .. " in one round"
	elseif k == "rollPlayers" then
		return if n == 1 then "Roll up another ball" else string.format("Roll up %d other balls", n)
	elseif k == "rare" then
		return string.format("Roll up %d Rare-or-better props", n)
	elseif k == "top3" then
		return if n == 1 then "Finish a round in the top 3" else string.format("Finish %d rounds in the top 3", n)
	elseif k == "landmark" then
		return "Roll up the giant landmark!"
	end
	return k
end

function Daily.icon(req: Request): string
	local spec = Daily.Kinds[req.kind]
	return if spec then spec.icon else "✨"
end

return Daily
