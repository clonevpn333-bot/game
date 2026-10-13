--!strict
-- Game modes. Every round is one map + one mode, picked by a vote between rounds, so two rounds
-- in a row rarely play the same. A mode changes how you win (scoring), and can change round
-- length, event pacing, growth and the rules of rolling each other up (teams).

export type Scoring = "size" | "crown" | "gold" | "team"

export type ModeDef = {
	id: string,
	name: string,
	icon: string,
	color: string,
	description: string, -- one line on the vote card
	goal: string, -- the round-start banner subtitle
	scoring: Scoring,
	scoreLabel: string, -- what the top list shows
	weight: number,
	length: number?, -- round seconds (default Tuning.Round.Length)
	eventTimes: { number }?, -- big events (seconds after start); default Tuning.Round.EventTimes
	minorGap: { number }?, -- { min, max } seconds between surprises
	growthMult: number?,
	goldenShare: number?, -- share of map props that start Golden
	teams: boolean?,
	minBalls: number?, -- needs at least this many balls (players + bots)
	winnerTitle: string, -- the top award's title
	winnerIcon: string,
}

local Modes = {}

Modes.List = {
	{
		id = "Classic",
		name = "Classic Roll",
		icon = "🌍",
		color = "#ff7a45",
		description = "Roll up everything. Biggest ball wins.",
		goal = "Get as BIG as you can!",
		scoring = "size",
		scoreLabel = "size",
		weight = 3,
		winnerTitle = "Biggest Ball",
		winnerIcon = "🏆",
	},
	{
		id = "TeamRoll",
		name = "Team Roll",
		icon = "🔴🔵",
		color = "#4dc4ff",
		description = "Red vs Blue! Your team's sizes add up. Roll up the other team.",
		goal = "Grow your team, roll up the other team!",
		scoring = "team",
		scoreLabel = "size",
		weight = 2,
		teams = true,
		minBalls = 4,
		winnerTitle = "Team MVP",
		winnerIcon = "🏅",
	},
	{
		id = "CrownChase",
		name = "Crown Chase",
		icon = "👑",
		color = "#ffd640",
		description = "The biggest ball wears the crown. Hold it the longest to win!",
		goal = "Become the biggest and KEEP the crown!",
		scoring = "crown",
		scoreLabel = "crown time",
		weight = 2,
		minBalls = 3,
		winnerTitle = "Crown Keeper",
		winnerIcon = "👑",
	},
	{
		id = "GoldRush",
		name = "Gold Rush",
		icon = "💰",
		color = "#ffc83a",
		description = "The map is full of Golden things. Most gold wins!",
		goal = "Grab everything that sparkles!",
		scoring = "gold",
		scoreLabel = "gold",
		weight = 2,
		length = 330,
		eventTimes = { 100, 220 },
		minorGap = { 30, 45 },
		goldenShare = 0.07,
		winnerTitle = "Gold Rusher",
		winnerIcon = "💰",
	},
	{
		id = "Mayhem",
		name = "Mayhem",
		icon = "🌪️",
		color = "#b06cff",
		description = "Events NON-STOP and everyone grows faster. Pure chaos.",
		goal = "Survive the chaos. Biggest ball wins!",
		scoring = "size",
		scoreLabel = "size",
		weight = 2,
		length = 390,
		eventTimes = { 50, 130, 210, 290 },
		minorGap = { 22, 34 },
		growthMult = 1.25,
		winnerTitle = "Chaos Champion",
		winnerIcon = "🌪️",
	},
} :: { ModeDef }

Modes.ById = {} :: { [string]: ModeDef }
for _, m in Modes.List do
	Modes.ById[m.id] = m
end

function Modes.get(id: string?): ModeDef
	return (id and Modes.ById[id]) or Modes.ById.Classic
end

return Modes
