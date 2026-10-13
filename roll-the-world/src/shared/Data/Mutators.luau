--!strict
-- Round mutators: a twist that lasts the whole round (shown at round start). Most rounds get one,
-- so even the same map + mode feels different. They stack with world events.

export type MutatorDef = {
	id: string,
	name: string,
	icon: string,
	color: string,
	description: string,
	weight: number,
	speedMult: number?,
	hopMult: number?,
	ratioBonus: number?,
	growthMult: number?,
	gravityMult: number?,
	mutationShare: number?, -- share of props that start with a random natural mutation
	critterParty: number?, -- extra critters released at round start
	night: boolean?, -- client: moonlit lighting, props glow softly
}

local Mutators = {}

Mutators.List = {
	{ id = "BouncyDay", name = "Bouncy Day", icon = "🏀", color = "#ff9f1c", description = "Super high hops all round!", weight = 3, hopMult = 1.7 },
	{ id = "SpeedRush", name = "Speed Rush", icon = "💨", color = "#4cc9f0", description = "Everyone rolls 20% faster.", weight = 3, speedMult = 1.2 },
	{ id = "StickyDay", name = "Extra Sticky", icon = "🍯", color = "#ffb703", description = "You can roll up slightly bigger things.", weight = 2, ratioBonus = 0.06 },
	{ id = "Floaty", name = "Floaty", icon = "🎈", color = "#c8b6ff", description = "Low gravity the whole round.", weight = 2, gravityMult = 0.6, hopMult = 1.15 },
	{ id = "RainbowDay", name = "Rainbow Day", icon = "🌈", color = "#ff5c8a", description = "Mutated props everywhere. Rolledex hunters, go!", weight = 2, mutationShare = 0.05 },
	{ id = "CritterParty", name = "Critter Party", icon = "🐾", color = "#7bd88f", description = "Twice the critters running around.", weight = 2, critterParty = 22 },
	{ id = "GrowthSpurt", name = "Growth Spurt", icon = "🌱", color = "#58d674", description = "Everything grows you 20% more.", weight = 2, growthMult = 1.2 },
	{ id = "NightRoll", name = "Night Roll", icon = "🌙", color = "#6c63ff", description = "A moonlit round. Mutated props glow in the dark.", weight = 2, night = true, mutationShare = 0.02 },
} :: { MutatorDef }

Mutators.ById = {} :: { [string]: MutatorDef }
for _, m in Mutators.List do
	Mutators.ById[m.id] = m
end

-- Chance a round gets a mutator at all (first round of a server never does).
Mutators.Chance = 0.7

function Mutators.get(id: string?): MutatorDef?
	return if id then Mutators.ById[id] else nil
end

return Mutators
