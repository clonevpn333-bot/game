--!strict
-- Saved player profile: schema, defaults, migrations and the trimmed view sent to the client.
-- Pure so it can be unit tested. Every load goes through `reconcile`, which fills missing fields
-- from defaults (older saves) and clamps anything malformed, so the rest of the game can trust
-- the shape.

local Tuning = require(script.Parent.Parent.Config.Tuning)

local Profile = {}

Profile.VERSION = 1

export type Planet = {
	id: number,
	t: number, -- unix time created
	kit: string,
	tier: number,
	d: number, -- final ball diameter (studs)
	colors: { string }, -- dominant colors by volume, biggest first
	props: { number }, -- signature prop uids
	notable: number?, -- biggest thing rolled up
	name: string,
	place: number, -- finishing place that round
	pinned: boolean?,
	likes: number?,
}

function Profile.default(): { [string]: any }
	return {
		version = Profile.VERSION,
		stardust = 0,
		totalStardust = 0,
		stats = {
			rounds = 0,
			wins = 0,
			top3 = 0,
			absorbed = 0,
			playersRolled = 0,
			timesRolled = 0,
			biggest = 0, -- biggest final diameter ever (studs)
			discoveries = 0,
			playSeconds = 0,
		},
		rolledex = "", -- base64 bitset: uid * VariantsPerProp + mutationIndex
		cores = { equipped = "Classic", owned = { Classic = 1 } },
		cosmetics = { equipped = { shell = "Classic" }, shells = { Classic = true } },
		streak = { day = -1, count = 0, best = 0 },
		daily = { day = -1, requests = {}, bonusClaimed = false, swaps = 0 },
		nanaDays = 0,
		galaxy = { planets = {}, mass = 0, nextId = 1, total = 0 },
		settings = {},
		receipts = {}, -- purchaseId -> unix time (idempotent ProcessReceipt)
		passes = {},
		firstJoin = 0,
		lastJoin = 0,
		tutorialDone = false,
	}
end

local function isArray(t: any): boolean
	return type(t) == "table" and (next(t) == nil or t[1] ~= nil)
end

local function num(v: any, default: number, lo: number?, hi: number?): number
	if type(v) ~= "number" or v ~= v or v == math.huge or v == -math.huge then
		return default
	end
	if lo and v < lo then
		return lo
	end
	if hi and v > hi then
		return hi
	end
	return v
end

-- Fill missing fields from `defaults` (recursively for dictionaries), keep unknown keys.
local function fill(target: { [string]: any }, defaults: { [string]: any })
	for k, dv in defaults do
		local tv = target[k]
		if tv == nil then
			target[k] = if type(dv) == "table" then table.clone(dv) else dv
			if type(dv) == "table" then
				fill(target[k], dv)
			end
		elseif type(dv) == "table" and type(tv) == "table" and not isArray(dv) then
			fill(tv, dv)
		elseif type(dv) ~= type(tv) then
			target[k] = if type(dv) == "table" then table.clone(dv) else dv
		end
	end
end

-- Older versions -> current. Each step only knows about its own version bump.
local MIGRATIONS: { [number]: (data: { [string]: any }) -> () } = {
	-- [1] = function(data) ... end -- (v1 -> v2) add steps here as the schema evolves
}

function Profile.reconcile(raw: any): { [string]: any }
	local data: { [string]: any } = if type(raw) == "table" then raw else {}
	local version = num(data.version, Profile.VERSION, 0)
	while version < Profile.VERSION do
		local step = MIGRATIONS[version]
		if step then
			step(data)
		end
		version += 1
	end
	data.version = Profile.VERSION
	fill(data, Profile.default())
	data.stardust = math.floor(num(data.stardust, 0, 0, 1e12))
	data.totalStardust = math.floor(num(data.totalStardust, 0, 0, 1e13))
	data.nanaDays = math.floor(num(data.nanaDays, 0, 0))
	if type(data.cores.owned.Classic) ~= "number" then
		data.cores.owned.Classic = 1
	end
	data.cosmetics.shells.Classic = true
	if type(data.cosmetics.equipped.shell) ~= "string" or not data.cosmetics.shells[data.cosmetics.equipped.shell] then
		data.cosmetics.equipped.shell = "Classic"
	end
	if type(data.cores.equipped) ~= "string" or not data.cores.owned[data.cores.equipped] then
		data.cores.equipped = "Classic"
	end
	if not isArray(data.galaxy.planets) then
		data.galaxy.planets = {}
	end
	if not isArray(data.daily.requests) then
		data.daily.requests = {}
	end
	return data
end

-- Keep the best planets by size plus the most recent ones (pinned always stay).
function Profile.trimGalaxy(planets: { Planet }): { Planet }
	local g = Tuning.Galaxy
	local keep: { [number]: boolean } = {}
	local bySize = table.clone(planets)
	table.sort(bySize, function(a, b)
		return a.d > b.d
	end)
	for i = 1, math.min(g.KeepBest, #bySize) do
		keep[bySize[i].id] = true
	end
	local byTime = table.clone(planets)
	table.sort(byTime, function(a, b)
		return a.t > b.t
	end)
	for i = 1, math.min(g.KeepRecent, #byTime) do
		keep[byTime[i].id] = true
	end
	local out = {}
	for _, p in planets do
		if keep[p.id] or p.pinned then
			table.insert(out, p)
		end
	end
	table.sort(out, function(a, b)
		return a.t < b.t
	end)
	return out
end

-- What the client is allowed to see (no receipts, no internals).
function Profile.clientView(data: { [string]: any }): { [string]: any }
	return {
		stardust = data.stardust,
		totalStardust = data.totalStardust,
		stats = data.stats,
		rolledex = data.rolledex,
		cores = data.cores,
		cosmetics = data.cosmetics,
		streak = data.streak,
		daily = data.daily,
		nanaDays = data.nanaDays,
		galaxy = data.galaxy,
		settings = data.settings,
		passes = data.passes,
		tutorialDone = data.tutorialDone,
	}
end

return Profile
