--!strict
-- Mutations are visual/audio layers on top of any prop model. Each counts as its own Rolledex
-- variant. `index` is permanent (it is part of the saved Rolledex bit index) — never reuse one.

export type MutationDef = {
	index: number, -- 1..15 (0 = no mutation)
	id: string,
	name: string,
	color: string?, -- tint applied over every part (nil keeps original colors)
	tintStrength: number, -- 0..1 blend toward `color`
	material: string?,
	reflectance: number?,
	rainbow: boolean?, -- client cycles hue over time
	particle: string?, -- VFX preset name
	light: string?, -- PointLight color
	scale: number, -- size multiplier (Giant/Tiny)
	stardust: number, -- reward multiplier when absorbed
	rarityBoost: number, -- shifts displayed rarity tier up by this many steps
	sound: string?,
	weight: number, -- base natural spawn weight (events multiply these)
}

local Mutations = {}

Mutations.List = {
	{
		index = 1,
		id = "Golden",
		name = "Golden",
		color = "#ffc83a",
		tintStrength = 0.85,
		material = "Foil",
		reflectance = 0.25,
		particle = "Sparkle",
		light = "#ffd76a",
		scale = 1,
		stardust = 3,
		rarityBoost = 1,
		sound = "Coin",
		weight = 0.012,
	},
	{
		index = 2,
		id = "Rainbow",
		name = "Rainbow",
		tintStrength = 0.7,
		rainbow = true,
		material = "SmoothPlastic",
		particle = "Rainbow",
		scale = 1,
		stardust = 4,
		rarityBoost = 2,
		weight = 0.003,
	},
	{
		index = 3,
		id = "Frozen",
		name = "Frozen",
		color = "#bfeaff",
		tintStrength = 0.6,
		material = "Ice",
		reflectance = 0.1,
		particle = "Snow",
		scale = 1,
		stardust = 2,
		rarityBoost = 1,
		weight = 0.006,
	},
	{
		index = 4,
		id = "Electric",
		name = "Electric",
		color = "#7af7ff",
		tintStrength = 0.35,
		material = "Neon",
		particle = "Zap",
		light = "#7af7ff",
		scale = 1,
		stardust = 2.5,
		rarityBoost = 1,
		weight = 0.005,
	},
	{
		index = 5,
		id = "Starfall",
		name = "Starfall",
		color = "#9c7bff",
		tintStrength = 0.55,
		material = "Glass",
		particle = "Stars",
		light = "#b49cff",
		scale = 1,
		stardust = 5,
		rarityBoost = 2,
		weight = 0, -- only from Meteor Shower
	},
	{
		index = 6,
		id = "Giant",
		name = "Giant",
		tintStrength = 0,
		particle = nil,
		scale = 1.7,
		stardust = 2,
		rarityBoost = 1,
		weight = 0.006,
	},
	{
		index = 7,
		id = "Tiny",
		name = "Tiny",
		tintStrength = 0,
		scale = 0.55,
		stardust = 2,
		rarityBoost = 1,
		weight = 0.006,
	},
	{
		index = 8,
		id = "Glitter",
		name = "Glitter",
		color = "#ff8ad8",
		tintStrength = 0.45,
		material = "Glass",
		reflectance = 0.2,
		particle = "Glitter",
		scale = 1,
		stardust = 2.5,
		rarityBoost = 1,
		weight = 0.004,
	},
	{
		index = 9,
		id = "Midnight",
		name = "Midnight",
		color = "#2b2160",
		tintStrength = 0.75,
		material = "Glass",
		particle = "Stars",
		light = "#6b5bff",
		scale = 1,
		stardust = 3,
		rarityBoost = 1,
		weight = 0.002,
	},
} :: { MutationDef }

Mutations.ById = {} :: { [string]: MutationDef }
Mutations.ByIndex = {} :: { [number]: MutationDef }
for _, m in Mutations.List do
	assert(m.index >= 1 and m.index <= 15, "mutation index out of range")
	assert(Mutations.ByIndex[m.index] == nil, "duplicate mutation index")
	Mutations.ById[m.id] = m
	Mutations.ByIndex[m.index] = m
end

Mutations.VariantsPerProp = 16 -- Rolledex bit index = uid * 16 + mutationIndex

function Mutations.get(index: number): MutationDef?
	return Mutations.ByIndex[index]
end

return Mutations
