--!strict
-- Cores: ball types with sidegrade perks. All gameplay Cores are unlockable with Stardust.
-- cost[1] unlocks the Core (level 1); cost[n] upgrades from level n-1 to n.

export type CoreDef = {
	id: string,
	name: string,
	icon: string,
	color: string,
	description: string,
	perk: (level: number) -> string,
	cost: { number },
	maxLevel: number,
	densityMult: number?,
	elasticityMult: number?,
	speedMult: ((level: number) -> number)?,
	hopMult: ((level: number) -> number)?,
	dashCooldownMult: ((level: number) -> number)?,
	magnetReach: ((level: number) -> number)?, -- extra reach in multiples of D for tiny props
	bumpResist: ((level: number) -> number)?, -- fraction of knocked props kept
	bumpPower: ((level: number) -> number)?, -- scatter multiplier dealt to others
}

local Cores = {}

Cores.List = {
	{
		id = "Classic",
		name = "Classic",
		icon = "⚪",
		color = "#f4f1ec",
		description = "Nana's trusty first ball. A little quicker on its feet.",
		perk = function(level)
			return string.format("+%d%% top speed", 2 + level)
		end,
		cost = { 0, 300, 700, 1400, 2600 },
		maxLevel = 5,
		speedMult = function(level)
			return 1.02 + level * 0.01
		end,
	},
	{
		id = "Magnet",
		name = "Magnet",
		icon = "🧲",
		color = "#e63946",
		description = "Tiny things leap onto you from a little further away.",
		perk = function(level)
			return string.format("Grabs crumbs from %d%% further", 6 + level * 4)
		end,
		cost = { 600, 500, 900, 1600, 3000 },
		maxLevel = 5,
		magnetReach = function(level)
			return 0.06 + level * 0.04
		end,
	},
	{
		id = "Bouncy",
		name = "Bouncy",
		icon = "🏀",
		color = "#ff9f1c",
		description = "Springier hops: reach counters and shelves sooner.",
		perk = function(level)
			return string.format("+%d%% hop height", 20 + level * 8)
		end,
		cost = { 600, 500, 900, 1600, 3000 },
		maxLevel = 5,
		elasticityMult = 2.2,
		hopMult = function(level)
			return 1.2 + level * 0.08
		end,
	},
	{
		id = "Heavy",
		name = "Heavy",
		icon = "🪨",
		color = "#6c757d",
		description = "Shrugs off bumps and knocks more loot off others.",
		perk = function(level)
			return string.format("Keeps %d%% more in bumps, hits %d%% harder", 20 + level * 6, 10 + level * 6)
		end,
		cost = { 800, 600, 1000, 1800, 3200 },
		maxLevel = 5,
		densityMult = 1.7,
		bumpResist = function(level)
			return 0.2 + level * 0.06
		end,
		bumpPower = function(level)
			return 1.1 + level * 0.06
		end,
	},
	{
		id = "Swift",
		name = "Swift",
		icon = "⚡",
		color = "#4cc9f0",
		description = "Dash recharges faster. Zip zip zip.",
		perk = function(level)
			return string.format("Dash recharges %d%% faster", 15 + level * 6)
		end,
		cost = { 800, 600, 1000, 1800, 3200 },
		maxLevel = 5,
		dashCooldownMult = function(level)
			return 0.85 - level * 0.06
		end,
	},
} :: { CoreDef }

Cores.ById = {} :: { [string]: CoreDef }
for _, def in Cores.List do
	Cores.ById[def.id] = def
end

function Cores.get(id: string?): CoreDef?
	if not id then
		return nil
	end
	return Cores.ById[id]
end

-- Stardust cost to go from `level` to `level + 1` (level 0 = locked).
function Cores.costFor(id: string, level: number): number?
	local def = Cores.ById[id]
	if not def or level >= def.maxLevel then
		return nil
	end
	return def.cost[level + 1]
end

return Cores
