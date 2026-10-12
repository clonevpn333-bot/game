--!strict
-- Candy Shop prop library. UIDs 300-399 are reserved for this kit and are permanent.

local S = require(script.Parent.Shapes)
local box, ball, blob, cyl, cylX, wedge, eyes = S.box, S.ball, S.blob, S.cyl, S.cylX, S.wedge, S.eyes
local shade = S.shade

local P = {}
local function add(def: any)
	table.insert(P, def)
end

local PINK = "#ff8fc7"
local MINT = "#8ff0c8"
local CREAM = "#fff3dc"
local CHOC = "#6b3e26"
local CHOC_DARK = "#4a2817"
local INK = "#2a1f3d"
local GLASS = "#e8f6ff"

local function swirl(out: { any }, d: number, y: number, z: number, a: string, b: string, axisFront: boolean?)
	-- A peppermint-style disc: base disc plus alternating wedge stripes.
	if axisFront then
		table.insert(out, cyl(d, d * 0.22, 0, y, z, a, { rot = { 90, 0, 0 } }))
		for i = 0, 3 do
			table.insert(out, box(d * 0.98, d * 0.16, d * 0.23, 0, y, z, b, { rot = { 0, 0, i * 45 } }))
		end
	else
		table.insert(out, cyl(d, d * 0.3, 0, y, 0, a))
		for i = 0, 3 do
			table.insert(out, box(d * 0.98, d * 0.31, d * 0.16, 0, y, 0, b, { rot = { 0, i * 45, 0 } }))
		end
	end
end

local function legs2(out: { any }, w: number, h: number, d: number, color: string)
	for _, sx in { -1, 1 } do
		table.insert(out, cyl(d, h, sx * w / 2, h / 2, 0, color, { tag = "leg" }))
	end
end

-- TINY ---------------------------------------------------------------------------------------

add({
	uid = 301,
	id = "sprinkle_candy",
	name = "Jimmie Sprinkle",
	rarity = "Common",
	tags = { "candy", "sweet", "colorful", "sprinkle" },
	hint = "Spilled across every counter.",
	weight = 3,
	variants = { "#ff5c8a", "#ffd23f", "#4cc9f0", "#7bd88f", "#b388ff", "#ffffff" },
	parts = { cylX(0.28, 0.85, 0, 0.14, 0, "#ff5c8a", { rot = { 0, 20, 0 } }) },
})

add({
	uid = 302,
	id = "sugar_pearl",
	name = "Sugar Pearl",
	rarity = "Common",
	tags = { "candy", "sweet", "round", "shiny", "white" },
	hint = "Cake decorating station.",
	weight = 2.5,
	parts = { ball(0.55, 0, 0.275, 0, "#fff8f0", { mat = "Foil", refl = 0.3 }) },
})

add({
	uid = 303,
	id = "candy_corn",
	name = "Candy Corn",
	rarity = "Common",
	tags = { "candy", "sweet", "colorful" },
	hint = "In the seasonal bin.",
	weight = 2,
	parts = {
		wedge(0.8, 0.35, 0.5, 0, 0.175, 0, "#ffd23f", { rot = { 0, 0, 0 } }),
		box(0.8, 0.35, 0.5, 0, 0.175, -0.5, "#ff8c1a"),
		box(0.8, 0.35, 0.3, 0, 0.175, -0.9, "#ffffff"),
	},
})

add({
	uid = 304,
	id = "jellybean",
	name = "Jelly Bean",
	rarity = "Common",
	tags = { "candy", "sweet", "colorful", "jelly" },
	hint = "Jelly bean wall overflow.",
	weight = 3,
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#8338ec", "#ff9f1c", "#3a86ff", "#ffffff" },
	parts = {
		blob(0.7, 0.62, 1.15, 0, 0.31, 0, "#ff4d6d", { mat = "Glass" }),
		ball(0.22, 0.12, 0.52, 0.2, "#ffffff", { t = 0.4 }),
	},
})

add({
	uid = 305,
	id = "choco_drop",
	name = "Choco Drop",
	rarity = "Common",
	tags = { "candy", "chocolate", "colorful", "round" },
	hint = "Rainbow choco bowl.",
	weight = 2.5,
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#8d5524" },
	parts = {
		blob(1.1, 0.55, 1.1, 0, 0.275, 0, "#ff4d6d"),
		box(0.3, 0.05, 0.3, 0, 0.56, 0, "#ffffff"),
	},
})

add({
	uid = 306,
	id = "gumdrop",
	name = "Gumdrop",
	rarity = "Common",
	tags = { "candy", "sweet", "jelly", "colorful" },
	hint = "Sugar-dusted, by the scale.",
	weight = 2,
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#b388ff", "#ff9f1c" },
	parts = {
		cyl(1.3, 0.8, 0, 0.4, 0, "#ff4d6d", { mat = "Sand" }),
		blob(1.1, 0.9, 1.1, 0, 0.9, 0, "#ff4d6d", { mat = "Sand" }),
	},
})

add({
	uid = 307,
	id = "mint_disc",
	name = "Peppermint",
	rarity = "Common",
	tags = { "candy", "mint", "round", "red", "white" },
	hint = "By the till, free for good kids.",
	weight = 1.5,
	parts = (function()
		local out = {}
		swirl(out, 1.4, 0.21, 0, "#ffffff", "#e63946")
		return out
	end)(),
})

add({
	uid = 308,
	id = "sugar_ant",
	name = "Sugar Ant",
	rarity = "Common",
	tags = { "animal", "bug", "critter", "scurry" },
	hint = "Can't believe its luck.",
	critter = { speed = 7, flee = 1.4, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			ball(0.5, 0, 0.36, -0.42, "#3a1f1f", { tag = "body" }),
			ball(0.36, 0, 0.36, 0, "#4d2626", { tag = "body" }),
			ball(0.42, 0, 0.42, 0.38, "#3a1f1f", { tag = "head" }),
			box(0.34, 0.34, 0.34, 0, 0.82, 0.45, "#ffffff", { mat = "Sand" }),
		}
		for i = -1, 1 do
			for _, side in { -1, 1 } do
				table.insert(out, box(0.5, 0.05, 0.05, side * 0.3, 0.18, i * 0.18, "#2a1515", { rot = { 0, 0, side * 25 }, tag = "leg" }))
			end
		end
		eyes(0.2, 0.14, 0.5, 0.56, out)
		return out
	end)(),
})

add({
	uid = 309,
	id = "rock_candy_crystal",
	name = "Rock Candy Crystal",
	rarity = "Uncommon",
	tags = { "candy", "crystal", "shiny" },
	hint = "Broken off a rock candy stick.",
	variants = { "#b5e2fa", "#ffafcc", "#cdb4db", "#fcf6bd" },
	parts = {
		box(0.8, 1.2, 0.8, 0, 0.6, 0, "#b5e2fa", { mat = "Glass", rot = { 10, 20, 5 } }),
		box(0.5, 0.8, 0.5, 0.4, 0.4, 0.2, "#b5e2fa", { mat = "Glass", rot = { -15, 40, 20 } }),
	},
})

-- SMALL ---------------------------------------------------------------------------------------

add({
	uid = 310,
	id = "gummy_bear",
	name = "Gummy Bear",
	rarity = "Common",
	tags = { "candy", "jelly", "bear", "colorful" },
	hint = "Gummy bin by the door.",
	weight = 2,
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#ff9f1c", "#ffffff" },
	parts = (function()
		local c = "#ff4d6d"
		local o = { mat = "Glass", t = 0.15 }
		return {
			blob(1.6, 1.8, 1.2, 0, 1.1, 0, c, o),
			ball(1.3, 0, 2.4, 0, c, o),
			ball(0.5, -0.5, 3.0, 0, c, o),
			ball(0.5, 0.5, 3.0, 0, c, o),
			blob(0.6, 0.8, 0.6, -0.55, 0.35, 0.1, c, o),
			blob(0.6, 0.8, 0.6, 0.55, 0.35, 0.1, c, o),
			blob(0.5, 0.8, 0.5, -0.9, 1.5, 0.1, c, o),
			blob(0.5, 0.8, 0.5, 0.9, 1.5, 0.1, c, o),
		}
	end)(),
})

add({
	uid = 311,
	id = "gummy_worm",
	name = "Gummy Worm",
	rarity = "Common",
	tags = { "candy", "jelly", "colorful", "wiggle" },
	hint = "Wriggled out of the gummy bin.",
	parts = (function()
		local out = {}
		local colors = { "#ff4d6d", "#ff4d6d", "#ffd60a", "#ffd60a", "#06d6a0", "#06d6a0" }
		for i = 0, 5 do
			table.insert(out, ball(0.8, math.sin(i * 1.1) * 0.6, 0.4, -2 + i * 0.75, colors[i + 1], { mat = "Glass" }))
		end
		return out
	end)(),
})

add({
	uid = 312,
	id = "licorice",
	name = "Licorice Twist",
	rarity = "Common",
	tags = { "candy", "red" },
	hint = "In the long candy jars.",
	variants = { "#d00000", "#2b2d42" },
	parts = (function()
		local out = {}
		for i = 0, 5 do
			table.insert(out, box(0.7, 0.7, 0.8, 0, 0.4, -2.2 + i * 0.88, "#d00000", { rot = { 0, 0, i * 30 } }))
		end
		return out
	end)(),
})

add({
	uid = 313,
	id = "lollipop_small",
	name = "Mini Lollipop",
	rarity = "Common",
	tags = { "candy", "lollipop", "round", "colorful" },
	hint = "Cup by the till.",
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#8338ec" },
	parts = (function()
		local out = { cylX(0.3, 3, 0, 0.4, -1.6, "#ffffff", { rot = { 0, 90, 0 } }) }
		table.insert(out, cyl(2.4, 0.8, 0, 0.4, 0.8, "#ff4d6d", { mat = "Glass" }))
		table.insert(out, cyl(1.4, 0.82, 0, 0.4, 0.8, "#ffffff", { t = 0.3 }))
		return out
	end)(),
})

add({
	uid = 314,
	id = "wrapped_candy",
	name = "Wrapped Bonbon",
	rarity = "Common",
	tags = { "candy", "wrapped", "colorful", "shiny" },
	hint = "Pick-and-mix spillover.",
	weight = 1.5,
	variants = { "#ff4d6d", "#3a86ff", "#ffd60a", "#06d6a0", "#b388ff" },
	parts = {
		blob(1.6, 1.4, 1.4, 0, 0.7, 0, "#ff4d6d", { mat = "Foil" }),
		wedge(0.6, 1.2, 1.2, -1.0, 0.7, 0, "#ff4d6d", { rot = { 0, 90, 0 }, mat = "Foil" }),
		wedge(0.6, 1.2, 1.2, 1.0, 0.7, 0, "#ff4d6d", { rot = { 0, -90, 0 }, mat = "Foil" }),
		box(0.2, 1.2, 1.2, 0.5, 0.7, 0, "#ffffff", { mat = "Foil" }),
		box(0.2, 1.2, 1.2, -0.5, 0.7, 0, "#ffffff", { mat = "Foil" }),
	},
})

add({
	uid = 315,
	id = "choc_square",
	name = "Chocolate Square",
	rarity = "Common",
	tags = { "candy", "chocolate" },
	hint = "Broken off a big bar.",
	parts = {
		box(2.2, 0.7, 2.2, 0, 0.35, 0, CHOC),
		box(1.8, 0.2, 1.8, 0, 0.8, 0, shade(CHOC, 0.12)),
	},
})

add({
	uid = 316,
	id = "truffle",
	name = "Truffle",
	rarity = "Uncommon",
	tags = { "candy", "chocolate", "round", "fancy" },
	hint = "In the gold box on the top shelf.",
	parts = {
		cyl(2.6, 0.6, 0, 0.3, 0, "#ffd166", { mat = "Foil" }),
		ball(2.2, 0, 1.4, 0, CHOC_DARK),
		blob(1.6, 0.5, 1.6, 0, 2.4, 0, "#f3d29a"),
		box(0.2, 0.2, 1.6, 0, 2.6, 0, CHOC, { rot = { 0, 30, 0 } }),
	},
})

add({
	uid = 317,
	id = "marshmallow_pink",
	name = "Pink Marshmallow",
	rarity = "Common",
	tags = { "candy", "sweet", "pink", "fluffy" },
	hint = "Fluffy bin.",
	variants = { "#ffc8dd", "#fffaf0", "#bde0fe" },
	parts = {
		cyl(1.8, 1.9, 0, 0.95, 0, "#ffc8dd", { mat = "Sand" }),
		cyl(1.6, 0.1, 0, 1.92, 0, "#ffffff"),
	},
})

add({
	uid = 318,
	id = "gumball",
	name = "Gumball",
	rarity = "Common",
	tags = { "candy", "round", "colorful", "gum" },
	hint = "Escaped the gumball machine!",
	weight = 2,
	variants = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff", "#ffffff" },
	parts = {
		ball(2.4, 0, 1.2, 0, "#ff4d6d", { refl = 0.1 }),
		ball(0.6, -0.5, 1.8, 0.6, "#ffffff", { t = 0.35 }),
	},
})

add({
	uid = 319,
	id = "macaron_candy",
	name = "Shop Macaron",
	rarity = "Uncommon",
	tags = { "candy", "sweet", "baked", "round", "fancy" },
	hint = "Pastel tower by the window.",
	variants = { "#a5e6ba", "#ffd6a5", "#bdb2ff", "#ff9ecf" },
	parts = {
		cyl(3.4, 1, 0, 0.5, 0, "#a5e6ba"),
		cyl(3.1, 0.5, 0, 1.25, 0, CREAM),
		cyl(3.4, 1, 0, 2, 0, "#a5e6ba"),
	},
})

add({
	uid = 320,
	id = "gingerbread_runner",
	name = "Gingerbread Runner",
	rarity = "Rare",
	tags = { "candy", "baked", "critter", "cookie", "scurry" },
	hint = "Run, run, as fast as you can!",
	critter = { speed = 14, flee = 1.8, style = "run", sound = "PopSoft" },
	parts = (function()
		local c = "#c47f35"
		local out = {
			blob(3, 3.4, 1.2, 0, 3.6, 0, c, { tag = "body" }),
			ball(2.6, 0, 6.2, 0, c, { tag = "head" }),
			blob(1, 2.6, 1, -1.9, 4.2, 0, c, { rot = { 0, 0, -50 }, tag = "wing" }),
			blob(1, 2.6, 1, 1.9, 4.2, 0, c, { rot = { 0, 0, 50 }, tag = "wing" }),
			ball(0.5, 0, 4.4, 0.6, "#e63946"),
			ball(0.5, 0, 3.4, 0.6, "#06d6a0"),
			box(1.6, 0.2, 0.2, 0, 5.6, 1.25, "#ffffff"),
			box(2.8, 0.2, 0.2, 0, 2.4, 0.62, "#ffffff"),
		}
		for _, sx in { -1, 1 } do
			table.insert(out, blob(1.1, 2.6, 1, sx * 0.8, 1.3, 0, c, { tag = "leg" }))
		end
		eyes(0.9, 0.5, 6.5, 1.2, out)
		return out
	end)(),
})

add({
	uid = 321,
	id = "gummy_frog",
	name = "Gummy Frog",
	rarity = "Uncommon",
	tags = { "candy", "jelly", "critter", "green", "hop" },
	hint = "Bounces out of the gummy bin.",
	critter = { speed = 9, flee = 1.5, style = "hop", sound = "PopSoft" },
	parts = (function()
		local o = { mat = "Glass", t = 0.1 }
		local out = {
			blob(3, 2, 3.4, 0, 1.2, 0, "#06d6a0", o),
			blob(2.4, 1.2, 2.6, 0, 0.8, 0.3, "#ffd60a", o),
			ball(1.3, -0.8, 2.3, 1.0, "#06d6a0", o),
			ball(1.3, 0.8, 2.3, 1.0, "#06d6a0", o),
			blob(1.2, 0.5, 2.0, -1.5, 0.3, -0.6, "#06d6a0", { mat = "Glass", tag = "leg" }),
			blob(1.2, 0.5, 2.0, 1.5, 0.3, -0.6, "#06d6a0", { mat = "Glass", tag = "leg" }),
		}
		eyes(1.6, 0.8, 2.45, 1.45, out)
		return out
	end)(),
})

add({
	uid = 322,
	id = "marshmallow_chick",
	name = "Marshmallow Chick",
	rarity = "Uncommon",
	tags = { "candy", "critter", "bird", "peep", "yellow", "fluffy" },
	hint = "Peeping around the Easter display.",
	critter = { speed = 7, flee = 1.2, style = "waddle", sound = "PopSoft" },
	parts = (function()
		local c = "#ffe066"
		local out = {
			blob(3.4, 3, 4, 0, 1.6, 0, c, { tag = "body", mat = "Sand" }),
			ball(2.6, 0, 3.6, 1.0, c, { tag = "head", mat = "Sand" }),
			wedge(0.8, 0.6, 0.8, 0, 3.4, 2.5, "#ff8c1a"),
			blob(0.8, 1.4, 2, -1.7, 1.8, 0, c, { tag = "wing", mat = "Sand" }),
			blob(0.8, 1.4, 2, 1.7, 1.8, 0, c, { tag = "wing", mat = "Sand" }),
		}
		eyes(1.0, 0.45, 3.9, 2.2, out)
		return out
	end)(),
})

-- MEDIUM-SMALL --------------------------------------------------------------------------------

add({
	uid = 323,
	id = "cake_pop",
	name = "Cake Pop",
	rarity = "Common",
	tags = { "candy", "baked", "lollipop", "round", "pink" },
	hint = "Party table centrepiece.",
	variants = { PINK, "#bde0fe", "#ffd6a5", "#cdb4db" },
	parts = {
		cyl(0.5, 5, 0, 2.5, 0, "#ffffff"),
		ball(3.4, 0, 6.2, 0, PINK),
		blob(3.5, 1.2, 3.5, 0, 7.2, 0, "#ffffff"),
		cylX(0.2, 0.6, 0.6, 7.9, 0.4, "#ffd60a"),
		cylX(0.2, 0.6, -0.5, 7.8, -0.4, "#06d6a0", { rot = { 0, 60, 0 } }),
	},
})

add({
	uid = 324,
	id = "candy_cane",
	name = "Candy Cane",
	rarity = "Common",
	tags = { "candy", "mint", "red", "white", "winter" },
	hint = "In the holiday bucket.",
	parts = (function()
		local out = {}
		for i = 0, 6 do
			table.insert(out, cylX(1.2, 1.4, 0, 0.6, -5 + i * 1.4, if i % 2 == 0 then "#ffffff" else "#e63946", { rot = { 0, 90, 0 } }))
		end
		for i = 0, 4 do
			local a = i / 4 * math.pi
			table.insert(out, ball(1.3, math.cos(a) * 1.6 - 1.6, 0.6, 4.8 + math.sin(a) * 1.6, if i % 2 == 0 then "#e63946" else "#ffffff"))
		end
		return out
	end)(),
})

add({
	uid = 325,
	id = "ice_cream_cone",
	name = "Ice Cream Cone",
	rarity = "Common",
	tags = { "candy", "dessert", "cold", "sweet" },
	hint = "Dropped at the ice cream counter.",
	variants = { "#ffafcc", "#caffbf", "#fdffb6", "#a0c4ff", CHOC },
	parts = {
		cyl(2, 2, 0, 1, 0, "#e0a157"),
		cyl(3.4, 2.4, 0, 3.2, 0, "#e0a157"),
		cyl(4.4, 2.4, 0, 5.4, 0, "#d4934a", { mat = "Pebble" }),
		blob(5, 4, 5, 0, 8.2, 0, "#ffafcc"),
		blob(4, 1.2, 4, 0, 6.6, 0, "#ffafcc"),
		ball(1.2, 0, 10.4, 0, "#e63946"),
	},
})

add({
	uid = 326,
	id = "chocolate_bar",
	name = "Chocolate Bar",
	rarity = "Common",
	tags = { "candy", "chocolate", "wrapped" },
	hint = "Bars stacked by the till.",
	parts = (function()
		local out = {
			box(6, 1, 11, 0, 0.5, 0, CHOC),
			box(6.2, 1.2, 5, 0, 0.6, -3.2, "#3a86ff", { mat = "Foil" }),
			box(6.24, 1.24, 1, 0, 0.6, -0.8, "#ffd166", { mat = "Foil" }),
		}
		for x = -1, 1, 2 do
			for z = 0, 2 do
				table.insert(out, box(2.4, 0.4, 1.4, x * 1.4, 1.1, 1 + z * 1.6, shade(CHOC, 0.1)))
			end
		end
		return out
	end)(),
})

add({
	uid = 327,
	id = "rock_candy_stick",
	name = "Rock Candy Stick",
	rarity = "Uncommon",
	tags = { "candy", "crystal", "shiny" },
	hint = "In the tall glass by the window.",
	variants = { "#b5e2fa", "#ffafcc", "#cdb4db", "#fcf6bd" },
	parts = (function()
		local out = { cyl(0.5, 10, 0, 5, 0, "#deb887", { mat = "Wood" }) }
		for i = 0, 9 do
			local a = i * 1.3
			table.insert(out, box(1.4, 1.6, 1.4, math.cos(a) * 0.9, 4 + i * 0.6, math.sin(a) * 0.9, "#b5e2fa", { mat = "Glass", rot = { i * 17, i * 31, i * 11 } }))
		end
		return out
	end)(),
})

add({
	uid = 328,
	id = "cupcake_candy",
	name = "Frosted Cupcake",
	rarity = "Common",
	tags = { "candy", "baked", "dessert", "sweet" },
	hint = "Display case.",
	variants = { "#bde0fe", "#ffc8dd", "#caffbf", "#ffd6a5" },
	parts = (function()
		local out = {
			cyl(4.2, 3, 0, 1.5, 0, "#cdb4db"),
			blob(4.8, 1.6, 4.8, 0, 3.6, 0, "#bde0fe"),
			blob(3.6, 1.4, 3.6, 0, 4.6, 0, "#bde0fe"),
			blob(2.2, 1.3, 2.2, 0, 5.5, 0, "#bde0fe"),
			ball(0.9, 0, 6.4, 0, "#ffd166", { mat = "Foil" }),
		}
		for i = 0, 9 do
			local a = i / 10 * math.pi * 2
			table.insert(out, cylX(0.2, 0.5, math.cos(a) * 1.8, 4.3, math.sin(a) * 1.8, if i % 2 == 0 then "#ff4d6d" else "#ffd60a", { rot = { 0, i * 50, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 329,
	id = "sprinkle_donut",
	name = "Rainbow Donut",
	rarity = "Common",
	tags = { "candy", "baked", "dessert", "round" },
	hint = "Donut tower.",
	parts = (function()
		local out = {}
		local colors = { "#ff5c8a", "#ffd23f", "#4cc9f0", "#7bd88f", "#ffffff" }
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			table.insert(out, ball(2.6, math.cos(a) * 2.2, 1.2, math.sin(a) * 2.2, "#e0a157"))
			table.insert(out, blob(2.4, 0.8, 2.4, math.cos(a) * 2.2, 2.1, math.sin(a) * 2.2, "#c77dff"))
			table.insert(out, cylX(0.22, 0.6, math.cos(a + 0.3) * 2.3, 2.55, math.sin(a + 0.3) * 2.3, colors[i % 5 + 1], { rot = { 0, i * 47, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 330,
	id = "candy_apple",
	name = "Candy Apple",
	rarity = "Uncommon",
	tags = { "candy", "fruit", "red", "shiny" },
	hint = "Fairground corner.",
	parts = {
		ball(6, 0, 3, 0, "#d00000", { mat = "Glass", refl = 0.2 }),
		blob(6.6, 1.2, 6.6, 0, 0.6, 0, "#d00000", { mat = "Glass" }),
		cyl(0.6, 6, 0, 8, 0, "#deb887", { mat = "Wood" }),
		ball(1.4, -1.4, 4.6, 1.6, "#ffffff", { t = 0.5 }),
	},
})

add({
	uid = 331,
	id = "soda_bottle",
	name = "Fizzy Soda",
	rarity = "Common",
	tags = { "drink", "glass", "fizzy" },
	hint = "Fridge by the door.",
	variants = { "#ff4d6d", "#06d6a0", "#ff9f1c", "#8338ec" },
	parts = {
		cyl(4, 8, 0, 4, 0, "#ff4d6d", { mat = "Glass", t = 0.2 }),
		blob(4, 3, 4, 0, 8.6, 0, "#ff4d6d", { mat = "Glass", t = 0.2 }),
		cyl(1.6, 2.4, 0, 10.6, 0, "#ff4d6d", { mat = "Glass", t = 0.2 }),
		cyl(1.9, 0.8, 0, 12, 0, "#ffd166", { mat = "Metal" }),
		cyl(4.1, 3, 0, 4.6, 0, "#ffffff"),
	},
})

add({
	uid = 332,
	id = "milkshake",
	name = "Strawberry Milkshake",
	rarity = "Uncommon",
	tags = { "drink", "dessert", "pink", "cold" },
	hint = "Soda fountain counter.",
	parts = {
		cyl(3, 1, 0, 0.5, 0, GLASS, { mat = "Glass", t = 0.4 }),
		cyl(1, 3, 0, 2.5, 0, GLASS, { mat = "Glass", t = 0.4 }),
		cyl(6, 8, 0, 8, 0, GLASS, { mat = "Glass", t = 0.45 }),
		cyl(5.4, 7.4, 0, 7.8, 0, "#ffafcc"),
		blob(6, 3, 6, 0, 12.6, 0, "#ffffff"),
		ball(1.6, 0, 14.6, 0, "#d00000"),
		cyl(0.6, 10, 1.4, 15, 0, "#ff4d6d", { rot = { 0, 0, 15 } }),
	},
})

add({
	uid = 333,
	id = "chocolate_bunny",
	name = "Chocolate Bunny",
	rarity = "Rare",
	tags = { "candy", "chocolate", "bunny", "shiny" },
	hint = "Wrapped in gold on the top shelf.",
	parts = {
		blob(5, 7, 4, 0, 3.5, 0, CHOC),
		ball(4, 0, 8.4, 0.4, CHOC),
		blob(1.4, 4.4, 1, -1, 11.6, 0.2, CHOC, { rot = { 0, 0, -10 } }),
		blob(1.4, 4.4, 1, 1, 11.6, 0.2, CHOC, { rot = { 0, 0, 10 } }),
		box(5.4, 1.2, 4.4, 0, 5, 0, "#ffd166", { mat = "Foil" }),
		ball(0.6, 0, 8.4, 2.4, "#ff8fab"),
		ball(0.5, -0.8, 9.2, 2.2, "#ffffff"),
		ball(0.5, 0.8, 9.2, 2.2, "#ffffff"),
	},
})

-- MEDIUM ---------------------------------------------------------------------------------------

add({
	uid = 334,
	id = "sundae",
	name = "Ice Cream Sundae",
	rarity = "Uncommon",
	tags = { "dessert", "cold", "sweet", "glass" },
	hint = "Soda fountain counter.",
	parts = {
		cyl(6, 1, 0, 0.5, 0, GLASS, { mat = "Glass", t = 0.4 }),
		cyl(1.4, 4, 0, 3, 0, GLASS, { mat = "Glass", t = 0.4 }),
		cyl(11, 4, 0, 7, 0, GLASS, { mat = "Glass", t = 0.45 }),
		ball(5, -2, 10, 0, "#fdffb6"),
		ball(5, 2, 10, 0, "#ffafcc"),
		ball(5, 0, 12.6, 0, CHOC),
		blob(8, 2, 8, 0, 14.4, 0, "#ffffff"),
		ball(2, 0, 16.4, 0, "#d00000"),
		blob(3, 5, 1, 3.6, 13, 1, "#ffd166", { rot = { 0, 0, -20 } }),
	},
})

add({
	uid = 335,
	id = "cake_slice",
	name = "Layer Cake Slice",
	rarity = "Common",
	tags = { "dessert", "baked", "sweet", "cake" },
	hint = "On a doily by the cake stand.",
	parts = {
		wedge(6, 10, 14, 0, 5, 0, "#f6bd60", { rot = { 0, 0, 0 } }),
		box(6.05, 1, 13.9, 0, 3.4, 0, "#ff8fab"),
		box(6.05, 1, 13.9, 0, 6.6, 0, "#ff8fab"),
		box(6.2, 1.2, 1.4, 0, 9.4, -6.4, "#ffffff"),
		ball(2, 0, 11, -6.4, "#e63946"),
	},
})

add({
	uid = 336,
	id = "cotton_candy",
	name = "Cotton Candy",
	rarity = "Uncommon",
	tags = { "candy", "fluffy", "pink", "fair" },
	hint = "Spun fresh by the machine.",
	parts = {
		cyl(1, 12, 0, 6, 0, "#ffffff"),
		blob(10, 12, 10, 0, 17, 0, "#ffc8dd", { mat = "Sand" }),
		blob(7, 8, 7, 2, 21, 1, "#bde0fe", { mat = "Sand" }),
		blob(6, 7, 6, -2, 13, -1, "#ffafcc", { mat = "Sand" }),
	},
})

add({
	uid = 337,
	id = "lollipop_swirl",
	name = "Swirl Lollipop",
	rarity = "Common",
	tags = { "candy", "lollipop", "round", "colorful" },
	hint = "In the big lolly jar.",
	parts = (function()
		local out = { cyl(1.2, 18, 0, 9, 0, "#ffffff") }
		swirl(out, 14, 24, 0, "#ff4d6d", "#ffffff", true)
		table.insert(out, cyl(14.4, 2.4, 0, 24, 0, "#ffd166", { rot = { 90, 0, 0 }, t = 0.5 }))
		return out
	end)(),
})

add({
	uid = 338,
	id = "jelly_cube",
	name = "Wobbly Jelly",
	rarity = "Uncommon",
	tags = { "dessert", "jelly", "wobble", "colorful" },
	hint = "Party table, wobbling.",
	variants = { "#ff4d6d", "#06d6a0", "#ff9f1c", "#8338ec" },
	parts = {
		cyl(14, 1, 0, 0.5, 0, "#ffffff"),
		cyl(10, 10, 0, 6, 0, "#ff4d6d", { mat = "Glass", t = 0.25 }),
		blob(10, 3, 10, 0, 11, 0, "#ff4d6d", { mat = "Glass", t = 0.25 }),
		blob(5, 2, 5, 0, 13, 0, "#ffffff"),
		ball(2, 0, 14.4, 0, "#d00000"),
	},
})

add({
	uid = 339,
	id = "gift_box",
	name = "Gift Box",
	rarity = "Common",
	tags = { "party", "box", "wrapped", "colorful" },
	hint = "Wrapped for someone lucky.",
	variants = { "#ff4d6d", "#3a86ff", "#06d6a0", "#b388ff", "#ffd60a" },
	parts = {
		box(14, 12, 14, 0, 6, 0, "#ff4d6d"),
		box(15, 2.6, 15, 0, 12, 0, shade("#ff4d6d", -0.1)),
		box(2.6, 14.8, 15.2, 0, 6.4, 0, "#ffd166"),
		box(15.2, 14.8, 2.6, 0, 6.4, 0, "#ffd166"),
		blob(5, 3, 3, -2.4, 15, 0, "#ffd166", { rot = { 0, 0, 25 } }),
		blob(5, 3, 3, 2.4, 15, 0, "#ffd166", { rot = { 0, 0, -25 } }),
		ball(2.4, 0, 14.6, 0, "#ffd166"),
	},
})

add({
	uid = 340,
	id = "teddy_bear",
	name = "Shop Teddy",
	rarity = "Uncommon",
	tags = { "toy", "bear", "fluffy", "fabric" },
	hint = "Sitting on the display shelf.",
	parts = (function()
		local c = "#c68b59"
		local out = {
			blob(12, 13, 10, 0, 7, 0, c, { mat = "Fabric", tag = "body" }),
			blob(8, 8, 3, 0, 7, 4.2, "#f1dcc4", { mat = "Fabric" }),
			ball(10, 0, 17, 0, c, { mat = "Fabric", tag = "head" }),
			ball(3.6, -4, 21, 0, c, { mat = "Fabric" }),
			ball(3.6, 4, 21, 0, c, { mat = "Fabric" }),
			blob(4.4, 3.4, 3, 0, 15.6, 4.4, "#f1dcc4", { mat = "Fabric" }),
			ball(1.4, 0, 16.4, 5.8, INK),
			blob(4, 8, 4, -6.6, 9, 1, c, { mat = "Fabric", rot = { 0, 0, 30 } }),
			blob(4, 8, 4, 6.6, 9, 1, c, { mat = "Fabric", rot = { 0, 0, -30 } }),
			blob(4.6, 4, 8, -3.6, 2, 3, c, { mat = "Fabric" }),
			blob(4.6, 4, 8, 3.6, 2, 3, c, { mat = "Fabric" }),
			box(10.4, 2, 2, 0, 12.6, 3, "#e63946", { mat = "Fabric" }),
		}
		eyes(3.6, 1.4, 18.4, 4.4, out)
		return out
	end)(),
})

add({
	uid = 341,
	id = "candy_jar",
	name = "Pick-and-Mix Jar",
	rarity = "Uncommon",
	tags = { "glass", "candy", "colorful" },
	hint = "Wall of jars.",
	parts = (function()
		local out = {
			cyl(14, 18, 0, 9, 0, GLASS, { mat = "Glass", t = 0.55 }),
			cyl(14.6, 2.4, 0, 19.2, 0, "#ff4d6d"),
			ball(3, 0, 21.6, 0, "#ff4d6d"),
		}
		local colors = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" }
		for i = 0, 17 do
			local a = i * 1.1
			local r = 2 + (i % 3) * 1.6
			table.insert(out, ball(2.4, math.cos(a) * r, 1.6 + (i // 3) * 2.2, math.sin(a) * r, colors[i % 6 + 1]))
		end
		return out
	end)(),
})

add({
	uid = 342,
	id = "sugar_dragon",
	name = "Sugar Dragon",
	rarity = "Legendary",
	tags = { "candy", "critter", "magic", "glow", "fly", "dragon" },
	hint = "A tiny sweet dragon. Breathes sprinkles, not fire.",
	weight = 0.3,
	critter = { speed = 18, flee = 2.0, style = "fly", hover = 8, sound = "NewDiscovery" },
	parts = (function()
		local c = "#c77dff"
		local out = {
			blob(6, 6, 9, 0, 4, 0, c, { tag = "body", mat = "Glass" }),
			blob(4, 4, 6, 0, 3.4, 0.6, "#ffc8dd", { mat = "Glass" }),
			ball(5.4, 0, 8.6, 3.6, c, { tag = "head", mat = "Glass" }),
			blob(3.4, 2.6, 3.4, 0, 7.6, 6.2, "#e0aaff", { mat = "Glass" }),
			wedge(1, 2, 1.4, -1.4, 11.6, 3.2, "#ffd166", { mat = "Foil" }),
			wedge(1, 2, 1.4, 1.4, 11.6, 3.2, "#ffd166", { mat = "Foil" }),
			blob(7, 0.4, 5, -5, 7, -0.6, "#ffafcc", { tag = "wing", t = 0.2 }),
			blob(7, 0.4, 5, 5, 7, -0.6, "#ffafcc", { tag = "wing", t = 0.2 }),
			blob(2, 2, 9, 0, 3, -7, c, { rot = { -20, 0, 0 }, tag = "tail", mat = "Glass" }),
			wedge(2.4, 2, 2, 0, 4.6, -11, "#ffd166", { mat = "Foil" }),
			ball(1, 0, 4, 6, "#fff3b0", { neon = true }),
		}
		legs2(out, 3.4, 1.6, 1.4, c)
		eyes(2, 1.1, 9.6, 6, out)
		return out
	end)(),
})

add({
	uid = 343,
	id = "rainbow_lollipop",
	name = "Rainbow Swirl Lollipop",
	rarity = "Legendary",
	tags = { "candy", "lollipop", "rainbow", "magic", "shiny" },
	hint = "Said to appear when the shop is at its sweetest.",
	weight = 0.6,
	parts = (function()
		local out = { cyl(1.4, 22, 0, 11, 0, "#ffffff", { mat = "Foil" }) }
		local colors = { "#ff4d6d", "#ff9f1c", "#ffd60a", "#06d6a0", "#3a86ff", "#8338ec" }
		for i = 0, 5 do
			table.insert(out, cyl(18 - i * 2.6, 2.4 + i * 0.05, 0, 30, 0, colors[i + 1], { rot = { 90, 0, 0 }, mat = "Glass" }))
		end
		table.insert(out, ball(2, 0, 30, 1.4, "#fff3b0", { neon = true }))
		table.insert(out, blob(6, 4, 1, -6, 35, 1.4, "#ffffff", { t = 0.6 }))
		return out
	end)(),
})

add({
	uid = 344,
	id = "pinata",
	name = "Party Piñata",
	rarity = "Epic",
	tags = { "party", "toy", "colorful", "donkey" },
	hint = "Hanging from the ceiling hook. Full of goodies.",
	parts = (function()
		local out = {
			box(24, 12, 12, 0, 22, 0, "#ff70a6", { tag = "body" }),
			box(8, 16, 8, 0, 34, 10, "#ffd60a"),
			box(10, 9, 10, 0, 44, 14, "#06d6a0", { tag = "head" }),
			box(3, 8, 2, -2.6, 51, 12, "#ff9f1c"),
			box(3, 8, 2, 2.6, 51, 12, "#ff9f1c"),
			box(4, 4, 4, 0, 42, 20, "#3a86ff"),
			box(5, 14, 5, -8, 9, -3, "#3a86ff", { tag = "leg" }),
			box(5, 14, 5, 8, 9, -3, "#ff9f1c", { tag = "leg" }),
			box(5, 14, 5, -8, 9, 3, "#06d6a0", { tag = "leg" }),
			box(5, 14, 5, 8, 9, 3, "#ffd60a", { tag = "leg" }),
			blob(4, 12, 4, 0, 22, -10, "#b388ff", { rot = { -30, 0, 0 }, tag = "tail" }),
		}
		for i = 0, 4 do
			table.insert(out, box(24.4, 1.6, 12.4, 0, 17 + i * 2.6, 0, ({ "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" })[i + 1]))
		end
		eyes(5, 2, 46, 19, out)
		return out
	end)(),
})

add({
	uid = 345,
	id = "music_box",
	name = "Carousel Music Box",
	rarity = "Epic",
	tags = { "toy", "music", "shiny", "round", "fancy" },
	hint = "Plays a tune on the counter. Spins forever.",
	parts = (function()
		local out = {
			cyl(30, 6, 0, 3, 0, "#ffc8dd"),
			cyl(31, 1.4, 0, 6.6, 0, "#ffd166", { mat = "Foil" }),
			cyl(2, 26, 0, 19, 0, "#ffd166", { mat = "Foil" }),
			wedge(16, 8, 15, 0, 36, 7.5, "#bde0fe"),
			wedge(16, 8, 15, 0, 36, -7.5, "#bde0fe", { rot = { 0, 180, 0 } }),
			cyl(32, 2, 0, 31.6, 0, "#ff70a6"),
			ball(3, 0, 41, 0, "#ffd166", { mat = "Foil" }),
		}
		for i = 0, 3 do
			local a = i / 4 * math.pi * 2
			local x, z = math.cos(a) * 10, math.sin(a) * 10
			table.insert(out, cyl(0.8, 24, x, 19, z, "#ffd166", { mat = "Foil" }))
			table.insert(out, blob(3, 4, 7, x, 15 + (i % 2) * 3, z, if i % 2 == 0 then "#ffffff" else "#ffafcc", { rot = { 0, -math.deg(a), 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 346,
	id = "candy_cart",
	name = "Candy Cart",
	rarity = "Uncommon",
	tags = { "furniture", "wheels", "candy", "wood" },
	hint = "Parked by the door.",
	parts = {
		box(40, 20, 24, 0, 22, 0, "#ff70a6", { mat = "Wood" }),
		box(42, 2, 26, 0, 33, 0, "#ffffff", { mat = "Wood" }),
		cylX(18, 4, -22, 9, 0, "#ffd166"),
		cylX(18, 4, 22, 9, 0, "#ffd166"),
		cylX(6, 4.4, -22, 9, 0, "#ff4d6d"),
		cylX(6, 4.4, 22, 9, 0, "#ff4d6d"),
		box(2, 30, 2, -18, 48, 10, "#ffffff"),
		box(2, 30, 2, 18, 48, 10, "#ffffff"),
		box(2, 30, 2, -18, 48, -10, "#ffffff"),
		box(2, 30, 2, 18, 48, -10, "#ffffff"),
		wedge(44, 8, 14, 0, 67, 7, "#8ff0c8", { mat = "Fabric" }),
		wedge(44, 8, 14, 0, 67, -7, "#ff8fc7", { rot = { 0, 180, 0 }, mat = "Fabric" }),
		ball(6, -10, 37, 0, "#ff4d6d"),
		ball(6, 0, 37, 4, "#ffd60a"),
		ball(6, 10, 37, -2, "#06d6a0"),
	},
})

-- LARGE ----------------------------------------------------------------------------------------

add({
	uid = 347,
	id = "layer_cake",
	name = "Celebration Cake",
	rarity = "Rare",
	tags = { "dessert", "baked", "cake", "party", "round" },
	hint = "The display case's pride and joy.",
	parts = (function()
		local out = {
			cyl(44, 2, 0, 1, 0, "#ffffff"),
			cyl(36, 14, 0, 9, 0, "#ffc8dd"),
			cyl(26, 12, 0, 22, 0, "#bde0fe"),
			cyl(16, 10, 0, 33, 0, "#caffbf"),
		}
		for i = 0, 3 do
			local a = i / 4 * math.pi * 2
			table.insert(out, cyl(0.8, 5, math.cos(a) * 4, 40.5, math.sin(a) * 4, "#ffd60a"))
			table.insert(out, blob(0.8, 1.4, 0.8, math.cos(a) * 4, 44, math.sin(a) * 4, "#ff9f1c", { neon = true }))
		end
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			table.insert(out, ball(3, math.cos(a) * 18, 16, math.sin(a) * 18, "#ffffff"))
		end
		return out
	end)(),
})

add({
	uid = 348,
	id = "giant_lollipop",
	name = "Giant Lollipop",
	rarity = "Uncommon",
	tags = { "candy", "lollipop", "round", "colorful", "decor" },
	hint = "Planted in the window display.",
	parts = (function()
		local out = { cyl(4, 60, 0, 30, 0, "#ffffff") }
		swirl(out, 44, 82, 0, "#8ff0c8", "#ff8fc7", true)
		return out
	end)(),
})

add({
	uid = 349,
	id = "ice_cream_machine",
	name = "Soft Serve Machine",
	rarity = "Uncommon",
	tags = { "electric", "dessert", "cold", "metal" },
	hint = "Soda fountain corner.",
	parts = {
		box(40, 50, 36, 0, 25, 0, "#dee2e6", { mat = "Metal" }),
		box(40, 30, 36, 0, 65, -4, "#f8f9fa", { mat = "Metal" }),
		box(30, 12, 2, 0, 66, 14.4, "#ff8fc7"),
		cyl(6, 8, -8, 46, 16, "#adb5bd", { mat = "Metal" }),
		cyl(6, 8, 8, 46, 16, "#adb5bd", { mat = "Metal" }),
		box(4, 2, 10, -8, 54, 18, "#ff4d6d"),
		box(4, 2, 10, 8, 54, 18, "#8ff0c8"),
		box(30, 2, 14, 0, 26, 18, "#adb5bd", { mat = "DiamondPlate" }),
		blob(8, 6, 8, 0, 85, -4, "#fff3dc"),
	},
})

add({
	uid = 350,
	id = "shop_stool",
	name = "Soda Stool",
	rarity = "Common",
	tags = { "furniture", "metal" },
	hint = "At the soda fountain counter.",
	parts = {
		cyl(30, 4, 0, 2, 0, CHROME, { mat = "Metal" }),
		cyl(5, 60, 0, 32, 0, CHROME, { mat = "Metal" }),
		cyl(30, 8, 0, 64, 0, "#ff4d6d", { mat = "Fabric" }),
		cyl(31, 2, 0, 60, 0, CHROME, { mat = "Metal" }),
		cyl(24, 1.4, 0, 22, 0, CHROME, { mat = "Metal" }),
	},
})

add({
	uid = 351,
	id = "cash_register",
	name = "Old Cash Register",
	rarity = "Rare",
	tags = { "metal", "money", "shiny", "box" },
	hint = "On the counter. Ka-ching!",
	parts = {
		box(50, 20, 40, 0, 10, 0, "#ffd166", { mat = "Foil" }),
		wedge(50, 24, 22, 0, 32, 2, "#ffd166", { mat = "Foil" }),
		box(30, 14, 4, 0, 50, -8, "#ffd166", { mat = "Foil" }),
		box(24, 8, 1, 0, 50, -5.6, "#2b2d42", { mat = "Glass" }),
		box(20, 4, 1, 0, 50, -5, "#06d6a0", { neon = true }),
		box(46, 6, 2, 0, 8, 20.4, "#d4a017", { mat = "Foil" }),
		cyl(4, 10, 30, 28, 0, "#e63946", { rot = { 0, 0, 90 } }),
		ball(6, 36, 28, 0, "#e63946"),
	},
})

add({
	uid = 352,
	id = "display_jar",
	name = "Giant Gobstopper Jar",
	rarity = "Uncommon",
	tags = { "glass", "candy", "round", "colorful" },
	hint = "Too big for one person. Allegedly.",
	parts = (function()
		local out = {
			cyl(60, 70, 0, 35, 0, GLASS, { mat = "Glass", t = 0.6 }),
			cyl(62, 8, 0, 74, 0, "#8ff0c8"),
			ball(14, 0, 82, 0, "#ff8fc7"),
		}
		local colors = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" }
		for i = 0, 23 do
			local a = i * 1.3
			local r = 6 + (i % 3) * 8
			table.insert(out, ball(12, math.cos(a) * r, 6 + (i // 4) * 10, math.sin(a) * r, colors[i % 6 + 1]))
		end
		return out
	end)(),
})

add({
	uid = 353,
	id = "gingerbread_house",
	name = "Gingerbread House",
	rarity = "Rare",
	tags = { "candy", "baked", "house", "cookie" },
	hint = "Shop window centrepiece.",
	parts = {
		box(60, 44, 50, 0, 22, 0, "#c47f35"),
		wedge(66, 28, 30, 0, 58, 13, "#a0602a"),
		wedge(66, 28, 30, 0, 58, -13, "#a0602a", { rot = { 0, 180, 0 } }),
		box(68, 3, 2, 0, 47, 26, "#ffffff"),
		box(16, 22, 1, 0, 11, 25.6, "#6b3e26"),
		box(12, 12, 1, -20, 26, 25.6, "#ffd166", { neon = true }),
		box(12, 12, 1, 20, 26, 25.6, "#ffd166", { neon = true }),
		ball(5, -20, 36, 26, "#e63946"),
		ball(5, 20, 36, 26, "#06d6a0"),
		ball(5, 0, 26, 26, "#ffd60a"),
		box(8, 20, 8, 20, 66, -8, "#e63946"),
		box(8.4, 4, 8.4, 20, 66, -8, "#ffffff"),
	},
})

add({
	uid = 354,
	id = "soda_fountain",
	name = "Soda Fountain",
	rarity = "Uncommon",
	tags = { "drink", "metal", "fizzy", "electric" },
	hint = "Back wall of the parlour.",
	parts = {
		box(60, 60, 30, 0, 30, 0, "#e63946"),
		box(62, 4, 32, 0, 62, 0, CHROME, { mat = "Metal" }),
		box(50, 30, 1, 0, 40, 15.4, "#ffffff"),
		cyl(6, 10, -16, 40, 18, CHROME, { mat = "Metal", rot = { 90, 0, 0 } }),
		cyl(6, 10, 0, 40, 18, CHROME, { mat = "Metal", rot = { 90, 0, 0 } }),
		cyl(6, 10, 16, 40, 18, CHROME, { mat = "Metal", rot = { 90, 0, 0 } }),
		box(56, 3, 14, 0, 18, 22, CHROME, { mat = "DiamondPlate" }),
		ball(10, 0, 72, 0, "#ffd166", { neon = true }),
	},
})

-- LANDMARK ------------------------------------------------------------------------------------

add({
	uid = 399,
	id = "gumball_tower",
	name = "The Gumball Tower",
	rarity = "Epic",
	tags = { "candy", "glass", "landmark", "round", "colorful", "machine" },
	hint = "The Candy Shop's landmark. Roll it up in the Final Roll!",
	landmark = true,
	fill = 0.6,
	parts = (function()
		local out = {
			box(70, 50, 70, 0, 25, 0, "#e63946"),
			box(74, 6, 74, 0, 3, 0, "#b5121b"),
			cyl(30, 6, 0, 28, 36, "#ffd166", { rot = { 90, 0, 0 }, mat = "Foil" }),
			box(16, 12, 2, 0, 12, 35.6, "#2b2d42"),
			cyl(40, 10, 0, 55, 0, "#ffd166", { mat = "Foil" }),
			ball(120, 0, 118, 0, GLASS, { mat = "Glass", t = 0.55 }),
			cyl(50, 14, 0, 180, 0, "#e63946"),
			ball(20, 0, 192, 0, "#e63946"),
		}
		local colors = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff", "#ffffff" }
		for i = 0, 34 do
			local a = i * 2.39996
			local y = 70 + (i / 34) * 80
			local r = math.sqrt(math.max(0, 52 * 52 - (y - 118) ^ 2)) * 0.8
			table.insert(out, ball(16, math.cos(a) * r, y, math.sin(a) * r, colors[i % 7 + 1]))
		end
		return out
	end)(),
})

return P
