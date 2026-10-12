--!strict
-- Game pass + developer product ids and display prices.
-- Create each pass/product on the Creator Dashboard and paste its id here. An id of 0 means
-- "not configured": in Studio the purchase is simulated (so the full flow can be tested),
-- in live servers the item is shown as unavailable instead of failing.
-- Display prices are fallbacks; MonetizationService reads live prices via GetProductInfo.

export type PassDef = {
	key: string,
	id: number,
	name: string,
	description: string,
	price: number,
	icon: string,
}

export type ProductDef = {
	key: string,
	id: number,
	name: string,
	description: string,
	price: number,
	icon: string,
	kind: "ServerEvent" | "RollPass" | "Cosmetic" | "AdReward" | "Gift",
	eventId: string?,
}

local Monetization = {}

Monetization.SimulateInStudio = true

Monetization.Passes = {
	VIP = {
		key = "VIP",
		id = 0,
		name = "VIP",
		description = "Golden name tag, VIP lounge in the hub, +10% Stardust.",
		price = 249,
		icon = "👑",
	},
	DoubleStardust = {
		key = "DoubleStardust",
		id = 0,
		name = "2x Stardust",
		description = "Earn double Stardust from every round, forever.",
		price = 399,
		icon = "✨",
	},
	Radar = {
		key = "Radar",
		id = 0,
		name = "Rolledex Radar",
		description = "Undiscovered props nearby glow with a little ping.",
		price = 199,
		icon = "📡",
	},
	PlanetStudio = {
		key = "PlanetStudio",
		id = 0,
		name = "Planet Studio",
		description = "Custom planet colors, extra rings and orbit styles for your galaxy.",
		price = 149,
		icon = "🪐",
	},
	ExtraLoadout = {
		key = "ExtraLoadout",
		id = 0,
		name = "Extra Loadout",
		description = "Save a second Core + cosmetics loadout and swap instantly in the hub.",
		price = 99,
		icon = "🎒",
	},
} :: { [string]: PassDef }

Monetization.Products = {
	EventGoldenHour = {
		key = "EventGoldenHour",
		id = 0,
		name = "Golden Hour",
		description = "Start Golden Hour for the whole server! Everyone finds Golden props.",
		price = 99,
		icon = "🌅",
		kind = "ServerEvent",
		eventId = "GoldenHour",
	},
	EventMeteorShower = {
		key = "EventMeteorShower",
		id = 0,
		name = "Meteor Shower",
		description = "Rain Starfall meteors on the whole server!",
		price = 99,
		icon = "☄️",
		kind = "ServerEvent",
		eventId = "MeteorShower",
	},
	EventStampede = {
		key = "EventStampede",
		id = 0,
		name = "Stampede",
		description = "Send a herd of rare critters across the map for everyone.",
		price = 79,
		icon = "🦆",
		kind = "ServerEvent",
		eventId = "Stampede",
	},
	EventLowGravity = {
		key = "EventLowGravity",
		id = 0,
		name = "Low Gravity",
		description = "Floaty bouncy chaos for the whole server.",
		price = 49,
		icon = "🌙",
		kind = "ServerEvent",
		eventId = "LowGravity",
	},
	RollPassPremium = {
		key = "RollPassPremium",
		id = 0,
		name = "Roll Pass Premium",
		description = "Unlock the premium cosmetic track for this season.",
		price = 449,
		icon = "🎟️",
		kind = "RollPass",
	},
	AdDoubleStardust = {
		key = "AdDoubleStardust",
		id = 0,
		name = "Double Round Stardust",
		description = "Watch a short video to double this round's Stardust.",
		price = 0,
		icon = "📺",
		kind = "AdReward",
	},
} :: { [string]: ProductDef }

-- Server events cannot be bought more often than this, server-wide (seconds), and never during
-- Launch/Results so they always have a round to land in.
Monetization.ServerEventCooldown = 90

function Monetization.passById(id: number): PassDef?
	if id == 0 then
		return nil
	end
	for _, pass in Monetization.Passes do
		if pass.id == id then
			return pass
		end
	end
	return nil
end

function Monetization.productById(id: number): ProductDef?
	if id == 0 then
		return nil
	end
	for _, product in Monetization.Products do
		if product.id == id then
			return product
		end
	end
	return nil
end

return Monetization
