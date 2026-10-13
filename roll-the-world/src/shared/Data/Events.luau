--!strict
-- World events are recipes of modifiers. EventService applies them server-side (gameplay +
-- lighting); EventController on clients adds weather, banners and music layers.
-- Adding an event = add an entry here (and, for a brand-new modifier type, a few lines of code).

export type EventDef = {
	id: string,
	name: string,
	icon: string,
	color: string, -- banner / tint color
	description: string, -- one short line under the banner
	duration: number,
	weight: number, -- chance weight when picked at random
	major: boolean, -- major events take the round's mid-round slot; minor ones sprinkle chaos
	purchasable: boolean,
	ratioBonus: number?, -- added to the absorb ratio (bigger things stick)
	growthMult: number?,
	speedMult: number?,
	gravityMult: number?,
	stardustMult: number?,
	mutation: string?, -- turns nearby props into this mutation over time
	mutationShare: number?,
	meteors: number?, -- meteors per second (Starfall props falling from the sky)
	stampede: number?, -- critters in the herd
	giant: boolean?, -- one random ball gets a huge growth boost
	supplyDrop: number?, -- props dropped in one big pile somewhere on the map
	frenzy: boolean?,
	goldenRunner: boolean?, -- a golden critter bolts around; catch it for a big reward
	weather: string?, -- client weather preset
	lighting: { [string]: any }?,
}

local Events = {}

Events.List = {
	{
		id = "MeteorShower",
		name = "Meteor Shower",
		icon = "☄️",
		color = "#9c7bff",
		description = "Starfall meteors are raining down! Grab them!",
		duration = 40,
		weight = 3,
		major = true,
		purchasable = true,
		meteors = 1.6,
		weather = "Meteors",
		lighting = { tint = "#d9ccff", brightness = -0.15, saturation = 0.25, clock = 18.6 },
	},
	{
		id = "StickyRain",
		name = "Sticky Rain",
		icon = "🌧️",
		color = "#4cc9f0",
		description = "Everything is sticky! Bigger things roll up!",
		duration = 35,
		weight = 3,
		major = true,
		purchasable = false,
		ratioBonus = 0.14,
		growthMult = 1.1,
		weather = "Rain",
		lighting = { tint = "#cfe8ff", brightness = -0.1, saturation = -0.15, fog = "#b8cde0" },
	},
	{
		id = "GoldenHour",
		name = "Golden Hour",
		icon = "🌅",
		color = "#ffc83a",
		description = "Props are turning GOLDEN! Extra Stardust!",
		duration = 40,
		weight = 3,
		major = true,
		purchasable = true,
		mutation = "Golden",
		mutationShare = 0.1,
		stardustMult = 1.5,
		weather = "Glitter",
		lighting = { tint = "#ffd59a", brightness = 0.05, saturation = 0.3, clock = 17.4 },
	},
	{
		id = "Stampede",
		name = "Stampede",
		icon = "🦆",
		color = "#ff9f1c",
		description = "A herd of rare critters is running across the map!",
		duration = 30,
		weight = 2,
		major = true,
		purchasable = true,
		stampede = 16,
		weather = "Dust",
	},
	{
		id = "LowGravity",
		name = "Low Gravity",
		icon = "🌙",
		color = "#b388ff",
		description = "Floaty bouncy chaos! Hop everywhere!",
		duration = 30,
		weight = 2,
		major = true,
		purchasable = true,
		gravityMult = 0.35,
		weather = "Floaty",
		lighting = { tint = "#e6dcff", saturation = 0.15, clock = 21 },
	},
	{
		id = "GiantMoment",
		name = "Giant Moment",
		icon = "🦖",
		color = "#ff5c8a",
		description = "Someone is growing SUPER fast. RUN!",
		duration = 18,
		weight = 2,
		major = true,
		purchasable = false,
		giant = true,
	},
	{
		id = "SupplyDrop",
		name = "Supply Drop",
		icon = "📦",
		color = "#7bd88f",
		description = "A pile of goodies just landed! Race for it!",
		duration = 20,
		weight = 4,
		major = false,
		purchasable = false,
		supplyDrop = 26,
	},
	{
		id = "Frenzy",
		name = "Growth Frenzy",
		icon = "⚡",
		color = "#ffd23f",
		description = "Everyone grows 50% faster!",
		duration = 15,
		weight = 3,
		major = false,
		purchasable = false,
		growthMult = 1.5,
		speedMult = 1.1,
		frenzy = true,
		weather = "Sparks",
	},
	{
		id = "MiniMeteors",
		name = "Shooting Stars",
		icon = "🌠",
		color = "#c8b6ff",
		description = "A few shooting stars are falling!",
		duration = 12,
		weight = 3,
		major = false,
		purchasable = false,
		meteors = 0.8,
		weather = "Meteors",
	},
	{
		id = "GoldenRunner",
		name = "Golden Runner",
		icon = "🏃",
		color = "#ffd23f",
		description = "A GOLDEN critter is on the loose! Catch it!",
		duration = 35,
		weight = 3,
		major = false,
		purchasable = false,
		goldenRunner = true,
		weather = "Glitter",
	},
} :: { EventDef }

Events.ById = {} :: { [string]: EventDef }
for _, e in Events.List do
	Events.ById[e.id] = e
end

function Events.get(id: string): EventDef?
	return Events.ById[id]
end

return Events
