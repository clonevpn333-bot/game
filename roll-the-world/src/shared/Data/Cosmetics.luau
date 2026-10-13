--!strict
-- Ball shells: the look of your ball. Bought with Stardust in the shop, or earned (login streak,
-- Nana's requests). "Classic" uses the player's personal color. `source` says how it is unlocked.

export type ShellDef = {
	id: string,
	name: string,
	icon: string,
	color: string?, -- nil = the player's personal color
	color2: string?, -- lump accent
	material: string, -- Enum.Material name
	reflectance: number?,
	neon: boolean?, -- glowing flecks on the lumps
	rainbow: boolean?, -- hue cycles over time
	cost: number?, -- Stardust price when sold in the shop
	source: "Default" | "Shop" | "Streak" | "Nana" | "Level" | "Achievement",
	order: number,
	description: string,
}

local Cosmetics = {}

Cosmetics.Shells = {
	{ id = "Classic", name = "Classic", icon = "⚪", material = "SmoothPlastic", source = "Default", order = 1, description = "Your very own color." },
	{ id = "Bubblegum", name = "Bubblegum", icon = "🍬", color = "#ff8fc7", color2 = "#ffd1e8", material = "SmoothPlastic", cost = 400, source = "Shop", order = 2, description = "Sweet and squishy." },
	{ id = "Mint", name = "Mint Chip", icon = "🍃", color = "#8ff0c4", color2 = "#4a3b2a", material = "SmoothPlastic", cost = 400, source = "Shop", order = 3, description = "Cool, fresh, a little crunchy." },
	{ id = "Sunset", name = "Sunset", icon = "🌅", color = "#ff9a52", color2 = "#ff5c8a", material = "SmoothPlastic", cost = 900, source = "Shop", order = 4, description = "Warm golden-hour glow." },
	{ id = "Ocean", name = "Ocean Glass", icon = "🌊", color = "#3fb6e8", color2 = "#bff1ff", material = "Glass", reflectance = 0.15, cost = 1500, source = "Shop", order = 5, description = "Clear blue sea glass." },
	{ id = "Frosty", name = "Frosty", icon = "❄️", color = "#d6f3ff", color2 = "#9fd8ff", material = "Ice", cost = 2200, source = "Shop", order = 6, description = "Snowball, but cuter." },
	{ id = "Lava", name = "Lava", icon = "🌋", color = "#3a1f1f", color2 = "#ff6a2a", material = "Basalt", neon = true, cost = 3500, source = "Shop", order = 7, description = "Hot hot hot." },
	{ id = "Disco", name = "Disco", icon = "🪩", color = "#cfd4e0", color2 = "#ffffff", material = "Foil", reflectance = 0.45, cost = 5000, source = "Shop", order = 8, description = "Party ball. Literally." },
	{ id = "Starlight", name = "Starlight", icon = "✨", color = "#2b2160", color2 = "#fff3b0", material = "SmoothPlastic", neon = true, source = "Streak", order = 9, description = "Login streak reward: day 7." },
	{ id = "Golden", name = "Golden", icon = "🏆", color = "#ffc83a", color2 = "#fff1b0", material = "Foil", reflectance = 0.3, source = "Streak", order = 10, description = "Login streak reward: day 14." },
	{ id = "Rainbow", name = "Rainbow", icon = "🌈", color = "#ff5c8a", material = "SmoothPlastic", rainbow = true, source = "Streak", order = 11, description = "Login streak reward: day 30." },
	{ id = "Knitted", name = "Nana's Knit", icon = "🧶", color = "#c8b6ff", color2 = "#ffafcc", material = "Fabric", source = "Nana", order = 12, description = "Finish all three of Nana's requests on 5 days." },
	{ id = "Cookie", name = "Cookie Dough", icon = "🍪", color = "#d9a066", color2 = "#5b3a1e", material = "Sand", source = "Level", order = 13, description = "Reach level 5." },
	{ id = "Comet", name = "Comet", icon = "☄️", color = "#1d1b3a", color2 = "#7ee8ff", material = "SmoothPlastic", neon = true, source = "Level", order = 14, description = "Reach level 10." },
	{ id = "Jelly", name = "Jelly", icon = "🍮", color = "#ff6fb5", color2 = "#ffd1ea", material = "Glass", reflectance = 0.1, source = "Level", order = 15, description = "Reach level 15." },
	{ id = "Aurora", name = "Aurora", icon = "🌌", color = "#3bd6c6", color2 = "#b06cff", material = "SmoothPlastic", neon = true, source = "Level", order = 16, description = "Reach level 20." },
	{ id = "Diamond", name = "Diamond", icon = "💎", color = "#cfefff", color2 = "#ffffff", material = "Glass", reflectance = 0.35, source = "Level", order = 17, description = "Reach level 30." },
	{ id = "Nebula", name = "Nebula", icon = "🪐", color = "#3a1d6e", color2 = "#ff8fc7", material = "SmoothPlastic", neon = true, source = "Level", order = 18, description = "Reach level 40." },
	{ id = "Sun", name = "Little Sun", icon = "☀️", color = "#ffb21e", color2 = "#fff3b0", material = "Neon", source = "Level", order = 19, description = "Reach level 50." },
	{ id = "Champion", name = "Champion", icon = "🏆", color = "#ffd640", color2 = "#ff7a45", material = "Foil", reflectance = 0.2, source = "Achievement", order = 20, description = "Win 25 rounds." },
} :: { ShellDef }

Cosmetics.ById = {} :: { [string]: ShellDef }
for _, s in Cosmetics.Shells do
	assert(Cosmetics.ById[s.id] == nil, "duplicate shell " .. s.id)
	Cosmetics.ById[s.id] = s
end

function Cosmetics.shell(id: string?): ShellDef
	return (id and Cosmetics.ById[id]) or Cosmetics.ById.Classic
end

return Cosmetics
