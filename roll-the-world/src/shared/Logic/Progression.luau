--!strict
-- Long-term progression as pure functions (tested in tests/progression.spec.luau):
--   * XP per round and the level curve,
--   * the level reward track (something on EVERY level: Stardust, plus shells and titles at
--     milestones),
--   * achievement progress,
--   * Rolledex sets: themed groups of props per map, built from prop tags, so new props join
--     sets automatically.

local Kits = require(script.Parent.Parent.Data.Kits)
local Achievements = require(script.Parent.Parent.Data.Achievements)
local PropLibrary = require(script.Parent.PropLibrary)

local Progression = {}

Progression.MAX_LEVEL = 100

-- XP ---------------------------------------------------------------------------------------------

export type RoundXpInput = {
	finalDiameter: number, -- studs
	placement: number,
	players: number, -- balls in the round
	discoveries: number,
	playersRolled: number,
	requestsDone: number?,
	won: boolean?,
}

function Progression.roundXp(input: RoundXpInput): (number, { { string } })
	local parts: { { string } } = {}
	local total = 0
	local function add(label: string, amount: number)
		amount = math.floor(amount + 0.5)
		if amount > 0 then
			total += amount
			table.insert(parts, { label, tostring(amount) })
		end
	end
	add("Played", 40)
	add("Size", math.min(input.finalDiameter, 400) * 0.6)
	if input.players >= 3 then
		local bonus = ({ 80, 50, 30 })[input.placement]
		if bonus then
			add("Top " .. input.placement, bonus)
		end
	end
	add("Discoveries", math.min(input.discoveries, 20) * 6)
	add("Balls rolled", math.min(input.playersRolled, 10) * 12)
	add("Requests", (input.requestsDone or 0) * 25)
	return total, parts
end

-- XP needed to go from `level` to `level + 1`.
function Progression.xpToNext(level: number): number
	return 120 + (level - 1) * 45
end

-- Level for a total XP amount, plus progress into the current level.
function Progression.levelFromXp(xp: number): (number, number, number)
	local level = 1
	local remaining = math.max(0, xp)
	while level < Progression.MAX_LEVEL do
		local need = Progression.xpToNext(level)
		if remaining < need then
			return level, remaining, need
		end
		remaining -= need
		level += 1
	end
	return level, 0, 1
end

-- LEVEL REWARDS ----------------------------------------------------------------------------------

export type LevelReward = { stardust: number, shell: string?, title: string?, label: string }

local LEVEL_SHELLS = { [5] = "Cookie", [10] = "Comet", [15] = "Jelly", [20] = "Aurora", [30] = "Diamond", [40] = "Nebula", [50] = "Sun" }
local LEVEL_TITLES = { [3] = "Roller", [8] = "Sticky", [12] = "Hoover", [18] = "Avalanche", [25] = "Planetmaker", [35] = "Cosmic", [50] = "Katamaster" }

function Progression.levelReward(level: number): LevelReward
	local stardust = 50 + level * 15
	if level % 10 == 0 then
		stardust *= 3
	elseif level % 5 == 0 then
		stardust *= 2
	end
	local shell = LEVEL_SHELLS[level]
	local title = LEVEL_TITLES[level]
	local label = "+" .. stardust .. " ✨"
	if shell then
		label ..= " + shell"
	end
	if title then
		label ..= " + title"
	end
	return { stardust = stardust, shell = shell, title = title, label = label }
end

-- The next level that unlocks a shell or title (for "next reward" teasers).
function Progression.nextBigReward(level: number): (number?, LevelReward?)
	for l = level + 1, Progression.MAX_LEVEL do
		if LEVEL_SHELLS[l] or LEVEL_TITLES[l] then
			return l, Progression.levelReward(l)
		end
	end
	return nil, nil
end

-- ACHIEVEMENTS -----------------------------------------------------------------------------------

function Progression.statValue(profile: any, stat: string): number
	if stat == "nanaDays" then
		return profile.nanaDays or 0
	elseif stat == "streakBest" then
		return profile.streak and profile.streak.best or 0
	elseif stat == "planets" then
		return profile.galaxy and profile.galaxy.total or 0
	elseif stat == "level" then
		return profile.level or 1
	end
	return (profile.stats and profile.stats[stat]) or 0
end

-- Achievements newly reached (not yet in profile.achievements).
function Progression.newAchievements(profile: any): { any }
	local out = {}
	local have = profile.achievements or {}
	for _, a in Achievements.List do
		if not have[a.id] and Progression.statValue(profile, a.stat) >= a.goal then
			table.insert(out, a)
		end
	end
	return out
end

-- SETS -------------------------------------------------------------------------------------------

export type SetDef = { id: string, kitId: string, tag: string, name: string, icon: string, uids: { number }, reward: number }

-- Friendly names for tag-based sets. Tags without an entry don't make sets (too generic).
local SET_NAMES: { [string]: { string } } = {
	breakfast = { "Breakfast Club", "🍳" },
	fruit = { "Fruit Bowl", "🍎" },
	veggie = { "Veggie Patch", "🥕" },
	baked = { "Bakery Run", "🥐" },
	dessert = { "Dessert Cart", "🍰" },
	drink = { "Thirsty", "🥤" },
	kitchenware = { "Kitchen Drawer", "🥄" },
	metal = { "Shiny Metals", "🔩" },
	glass = { "Glassworks", "🫙" },
	toy = { "Toy Box", "🧸" },
	garden = { "Garden Party", "🌻" },
	plant = { "Green Thumb", "🌿" },
	seed = { "Seed Packet", "🌰" },
	bbq = { "Grill Master", "🍖" },
	summer = { "Summer Fun", "🏖️" },
	sports = { "Sports Day", "⚽" },
	animal = { "Animal Friends", "🐾" },
	critter = { "Critter Catcher", "🐞" },
	candy = { "Candy Haul", "🍬" },
	jelly = { "Jelly Jar", "🍮" },
	magic = { "Sweet Magic", "✨" },
	electric = { "Plugged In", "🔌" },
	furniture = { "Home Decor", "🛋️" },
	decor = { "Fancy Things", "🎀" },
	wheels = { "On Wheels", "🛞" },
	fluffy = { "Fluffy Stuff", "☁️" },
	wood = { "Woodshop", "🪵" },
	plastic = { "Plastic Pile", "🪣" },
	box = { "Boxed Up", "📦" },
	rock = { "Rock Collection", "🪨" },
	sweet = { "Sweet Tooth", "🍭" },
	food = { "Snack Attack", "🍟" },
}

local setCache: { SetDef }? = nil

function Progression.sets(): { SetDef }
	if setCache then
		return setCache
	end
	local out: { SetDef } = {}
	for _, kit in Kits.List do
		local byTag: { [string]: { number } } = {}
		for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
			if not def.landmark then
				for _, tag in def.tags do
					if SET_NAMES[tag] then
						byTag[tag] = byTag[tag] or {}
						table.insert(byTag[tag], def.uid)
					end
				end
			end
		end
		-- Sets of 4..8 props: big enough to be a goal, small enough to finish. Prefer specific
		-- themes (fewer members) and cap at 8 sets per map.
		local candidates = {}
		for tag, uids in byTag do
			if #uids >= 4 then
				table.sort(uids)
				while #uids > 8 do
					table.remove(uids)
				end
				table.insert(candidates, { tag = tag, uids = uids })
			end
		end
		table.sort(candidates, function(a, b)
			if #a.uids ~= #b.uids then
				return #a.uids < #b.uids
			end
			return a.tag < b.tag
		end)
		for i = 1, math.min(8, #candidates) do
			local c = candidates[i]
			local meta = SET_NAMES[c.tag]
			table.insert(out, {
				id = kit.id .. ":" .. c.tag,
				kitId = kit.id,
				tag = c.tag,
				name = meta[1],
				icon = meta[2],
				uids = c.uids,
				reward = 150 + #c.uids * 50,
			})
		end
	end
	setCache = out
	return out
end

function Progression.setsForUid(uid: number): { SetDef }
	local out = {}
	for _, set in Progression.sets() do
		if table.find(set.uids, uid) then
			table.insert(out, set)
		end
	end
	return out
end

-- How many of a set's props `has(uid)` says are discovered.
function Progression.setProgress(set: SetDef, has: (number) -> boolean): number
	local n = 0
	for _, uid in set.uids do
		if has(uid) then
			n += 1
		end
	end
	return n
end

return Progression
