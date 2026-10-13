--!strict
-- Titles shown under your name on your ball. Earned from levels, achievements and Rolledex sets.

export type TitleDef = { id: string, text: string, color: string, how: string }

local Titles = {}

Titles.List = {
	{ id = "Rookie", text = "Rookie Roller", color = "#b7b7c9", how = "Start rolling" },
	{ id = "Roller", text = "Roller", color = "#7bd88f", how = "Reach level 3" },
	{ id = "Sticky", text = "Sticky Fingers", color = "#ffb703", how = "Reach level 8" },
	{ id = "Hoover", text = "Human Hoover", color = "#4cc9f0", how = "Reach level 12" },
	{ id = "Avalanche", text = "Avalanche", color = "#9fd8ff", how = "Reach level 18" },
	{ id = "Planetmaker", text = "Planetmaker", color = "#b06cff", how = "Reach level 25" },
	{ id = "Cosmic", text = "Cosmic Legend", color = "#ff5c8a", how = "Reach level 35" },
	{ id = "Katamaster", text = "Roll Master", color = "#ffd640", how = "Reach level 50" },
	{ id = "Winner", text = "Winner!", color = "#ffd640", how = "Win a round" },
	{ id = "Champ", text = "Champion", color = "#ff7a45", how = "Win 25 rounds" },
	{ id = "Bully", text = "Ball Bully", color = "#e63946", how = "Roll up 50 balls" },
	{ id = "Comeback", text = "Comeback Kid", color = "#ff9f1c", how = "Get rolled up 25 times" },
	{ id = "Giant", text = "Gentle Giant", color = "#58d674", how = "Grow to 2 m" },
	{ id = "Collector", text = "Collector", color = "#4dc4ff", how = "Discover 100 props" },
	{ id = "Completionist", text = "Completionist", color = "#c8b6ff", how = "Discover 250 props" },
	{ id = "NanasFave", text = "Nana's Favorite", color = "#ffafcc", how = "Finish Nana's requests on 10 days" },
	{ id = "Loyal", text = "Loyal Roller", color = "#ff8fab", how = "14-day login streak" },
	{ id = "Astronomer", text = "Astronomer", color = "#7ee8ff", how = "Make 50 planets" },
	{ id = "KitchenMaster", text = "Kitchen Master", color = "#ff9a52", how = "Complete every Kitchen set" },
	{ id = "BackyardMaster", text = "Backyard Master", color = "#6cc04a", how = "Complete every Backyard set" },
	{ id = "CandyMaster", text = "Candy Master", color = "#ff6fb5", how = "Complete every Candy Shop set" },
	{ id = "ToyMaster", text = "Toy Box Master", color = "#ffd166", how = "Complete every Toy Room set" },
	{ id = "BeachMaster", text = "Beach Master", color = "#48cae4", how = "Complete every Beach Day set" },
} :: { TitleDef }

Titles.ById = {} :: { [string]: TitleDef }
for _, t in Titles.List do
	Titles.ById[t.id] = t
end

-- Set-completion title for a kit (nil if none).
Titles.ForKit = {
	KitchenCounter = "KitchenMaster",
	BackyardBBQ = "BackyardMaster",
	CandyShop = "CandyMaster",
	ToyRoom = "ToyMaster",
	BeachDay = "BeachMaster",
} :: { [string]: string }

function Titles.get(id: string?): TitleDef?
	return if id then Titles.ById[id] else nil
end

return Titles
