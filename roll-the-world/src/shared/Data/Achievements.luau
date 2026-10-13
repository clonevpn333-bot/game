--!strict
-- Long-term milestones. Each is a profile stat crossing a threshold; rewards are granted once.
-- `stat` reads from profile.stats unless it names one of the special keys handled in
-- Progression.statValue (nanaDays, streakBest, planets, level).

export type AchievementDef = {
	id: string,
	name: string,
	icon: string,
	description: string,
	stat: string,
	goal: number,
	stardust: number,
	title: string?,
	shell: string?,
}

local Achievements = {}

Achievements.List = {
	{ id = "FirstRound", name = "First Roll", icon = "🎉", description = "Finish your first round", stat = "rounds", goal = 1, stardust = 100 },
	{ id = "Rounds25", name = "Regular", icon = "🔁", description = "Play 25 rounds", stat = "rounds", goal = 25, stardust = 400 },
	{ id = "Rounds100", name = "Roll Addict", icon = "♾️", description = "Play 100 rounds", stat = "rounds", goal = 100, stardust = 1500 },
	{ id = "FirstWin", name = "Winner!", icon = "🥇", description = "Win a round", stat = "wins", goal = 1, stardust = 300, title = "Winner" },
	{ id = "Wins25", name = "Champion", icon = "🏆", description = "Win 25 rounds", stat = "wins", goal = 25, stardust = 2500, title = "Champ", shell = "Champion" },
	{ id = "Podium10", name = "Podium Regular", icon = "🏅", description = "Finish top 3 ten times", stat = "top3", goal = 10, stardust = 600 },
	{ id = "Absorb1k", name = "Hungry", icon = "🧺", description = "Roll up 1,000 things", stat = "absorbed", goal = 1000, stardust = 300 },
	{ id = "Absorb10k", name = "Bottomless", icon = "🕳️", description = "Roll up 10,000 things", stat = "absorbed", goal = 10000, stardust = 1500 },
	{ id = "Absorb50k", name = "World Eater", icon = "🌍", description = "Roll up 50,000 things", stat = "absorbed", goal = 50000, stardust = 5000 },
	{ id = "Rolled10", name = "Bowling Ball", icon = "🎳", description = "Roll up 10 other balls", stat = "playersRolled", goal = 10, stardust = 400 },
	{ id = "Rolled50", name = "Ball Bully", icon = "😈", description = "Roll up 50 other balls", stat = "playersRolled", goal = 50, stardust = 1500, title = "Bully" },
	{ id = "GotRolled25", name = "Comeback Kid", icon = "🔥", description = "Get rolled up 25 times (and keep going!)", stat = "timesRolled", goal = 25, stardust = 500, title = "Comeback" },
	{ id = "Size1m", name = "Meter Club", icon = "📏", description = "Grow to 1 m", stat = "biggest", goal = 100, stardust = 300 },
	{ id = "Size2m", name = "Gentle Giant", icon = "🦕", description = "Grow to 2 m", stat = "biggest", goal = 200, stardust = 1200, title = "Giant" },
	{ id = "Discover50", name = "Explorer", icon = "🔍", description = "Discover 50 props", stat = "discoveries", goal = 50, stardust = 400 },
	{ id = "Discover100", name = "Collector", icon = "📖", description = "Discover 100 props", stat = "discoveries", goal = 100, stardust = 1000, title = "Collector" },
	{ id = "Discover250", name = "Completionist", icon = "🗂️", description = "Discover 250 props", stat = "discoveries", goal = 250, stardust = 3000, title = "Completionist" },
	{ id = "Nana10", name = "Nana's Favorite", icon = "🧶", description = "Finish all of Nana's requests on 10 days", stat = "nanaDays", goal = 10, stardust = 1500, title = "NanasFave" },
	{ id = "Streak14", name = "Loyal Roller", icon = "📅", description = "Reach a 14-day login streak", stat = "streakBest", goal = 14, stardust = 1500, title = "Loyal" },
	{ id = "Planets50", name = "Astronomer", icon = "🔭", description = "Make 50 planets", stat = "planets", goal = 50, stardust = 1500, title = "Astronomer" },
} :: { AchievementDef }

Achievements.ById = {} :: { [string]: AchievementDef }
for _, a in Achievements.List do
	Achievements.ById[a.id] = a
end

return Achievements
