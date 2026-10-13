--!strict
-- Rarity tiers. Colorblind palette pairs every rarity with a distinct glyph so color is never the only cue.

export type RarityId = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"

export type RarityDef = {
	id: RarityId,
	order: number,
	name: string,
	color: Color3,
	colorblind: Color3,
	glyph: string,
	weight: number, -- relative spawn weight inside a size band
	toast: boolean, -- show a toast when absorbed
	announce: boolean, -- announce first discovery to the whole server
	sparkle: boolean,
}

local Rarity = {}

Rarity.Order = { "Common", "Uncommon", "Rare", "Epic", "Legendary" } :: { RarityId }

Rarity.Defs = {
	Common = {
		id = "Common",
		order = 1,
		name = "Common",
		color = Color3.fromRGB(176, 190, 204),
		colorblind = Color3.fromRGB(200, 200, 200),
		glyph = "●",
		weight = 100,
		toast = false,
		announce = false,
		sparkle = false,
	},
	Uncommon = {
		id = "Uncommon",
		order = 2,
		name = "Uncommon",
		color = Color3.fromRGB(96, 214, 120),
		colorblind = Color3.fromRGB(86, 180, 233),
		glyph = "▲",
		weight = 34,
		toast = false,
		announce = false,
		sparkle = false,
	},
	Rare = {
		id = "Rare",
		order = 3,
		name = "Rare",
		color = Color3.fromRGB(72, 160, 255),
		colorblind = Color3.fromRGB(0, 114, 178),
		glyph = "◆",
		weight = 9,
		toast = true,
		announce = false,
		sparkle = true,
	},
	Epic = {
		id = "Epic",
		order = 4,
		name = "Epic",
		color = Color3.fromRGB(190, 104, 255),
		colorblind = Color3.fromRGB(204, 121, 167),
		glyph = "★",
		weight = 2.2,
		toast = true,
		announce = false,
		sparkle = true,
	},
	Legendary = {
		id = "Legendary",
		order = 5,
		name = "Legendary",
		color = Color3.fromRGB(255, 196, 46),
		colorblind = Color3.fromRGB(240, 228, 66),
		glyph = "✦",
		weight = 0.45,
		toast = true,
		announce = true,
		sparkle = true,
	},
} :: { [RarityId]: RarityDef }

function Rarity.get(id: string): RarityDef
	local defs: { [string]: RarityDef } = Rarity.Defs :: any
	return defs[id] or defs.Common
end

function Rarity.color(id: string, colorblind: boolean?): Color3
	local def = Rarity.get(id)
	return if colorblind then def.colorblind else def.color
end

return Rarity
