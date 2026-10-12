--!strict
-- Scale tiers. Each tier is its own server pool (its own place in the universe).
-- Adding a tier = add an entry, publish a place with the tier's PlaceId, add kits with that tier.

export type TierDef = {
	id: number,
	key: string,
	name: string,
	cmPerStud: number, -- display scale: how many real centimetres one stud represents
	galaxyMassRequired: number,
	placeId: number, -- 0 = this place / not yet published
	color: Color3,
	icon: string,
	shipped: boolean,
}

local Tiers = {}

Tiers.List = {
	{
		id = 1,
		key = "Crumb",
		name = "Crumb",
		cmPerStud = 1,
		galaxyMassRequired = 0,
		placeId = 0,
		color = Color3.fromRGB(255, 186, 92),
		icon = "🍪",
		shipped = true,
	},
	{
		id = 2,
		key = "Backyard",
		name = "Backyard",
		cmPerStud = 6,
		galaxyMassRequired = 2500,
		placeId = 0,
		color = Color3.fromRGB(120, 210, 110),
		icon = "🌻",
		shipped = false,
	},
	{
		id = 3,
		key = "Block",
		name = "Block",
		cmPerStud = 40,
		galaxyMassRequired = 12000,
		placeId = 0,
		color = Color3.fromRGB(110, 170, 255),
		icon = "🏘️",
		shipped = false,
	},
	{
		id = 4,
		key = "City",
		name = "City",
		cmPerStud = 250,
		galaxyMassRequired = 50000,
		placeId = 0,
		color = Color3.fromRGB(180, 130, 255),
		icon = "🏙️",
		shipped = false,
	},
	{
		id = 5,
		key = "Island",
		name = "Island",
		cmPerStud = 1500,
		galaxyMassRequired = 200000,
		placeId = 0,
		color = Color3.fromRGB(70, 210, 210),
		icon = "🏝️",
		shipped = false,
	},
	{
		id = 6,
		key = "Cosmos",
		name = "Cosmos",
		cmPerStud = 50000,
		galaxyMassRequired = 1000000,
		placeId = 0,
		color = Color3.fromRGB(255, 110, 180),
		icon = "🌌",
		shipped = false,
	},
} :: { TierDef }

function Tiers.get(id: number): TierDef
	return Tiers.List[id] or Tiers.List[1]
end

-- Which tier does this place serve? Tier places are mapped by PlaceId; anything else is tier 1.
function Tiers.forPlace(placeId: number): TierDef
	for _, tier in Tiers.List do
		if tier.placeId ~= 0 and tier.placeId == placeId then
			return tier
		end
	end
	return Tiers.List[1]
end

function Tiers.highestUnlocked(galaxyMass: number): number
	local best = 1
	for _, tier in Tiers.List do
		if galaxyMass >= tier.galaxyMassRequired then
			best = math.max(best, tier.id)
		end
	end
	return best
end

return Tiers
