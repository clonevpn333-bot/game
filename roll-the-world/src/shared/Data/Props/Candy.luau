--!nonstrict
-- Candy Shop prop library. UIDs 300-399 are reserved for this kit and are permanent.

local S = require(script.Parent.Shapes)
local box, ball, blob, cyl, cylX, wedge, eyes = S.box, S.ball, S.blob, S.cyl, S.cylX, S.wedge, S.eyes
local shade = S.shade

local P = {}
local function add(def: any)
	table.insert(P, def)
end

local PINK = "#ff8fc7"
local CREAM = "#fff3dc"
local CHOC = "#6b3e26"
local CHOC_DARK = "#4a2817"
local INK = "#2a1f3d"
local GLASS = "#e8f6ff"
local CHROME = "#d9dee6"

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
	-- Triangular wedges rotated flat so the slice is a triangle seen from above, wide end at +Z.
	parts = {
		wedge(3, 7, 14, 0, 1.5, 0, "#f6bd60", { rot = { 0, 0, 90 } }),
		wedge(1, 7, 14, 0, 3.5, 0, "#ff8fab", { rot = { 0, 0, 90 } }),
		wedge(3, 7, 14, 0, 5.5, 0, "#f6bd60", { rot = { 0, 0, 90 } }),
		wedge(1.2, 7.2, 14.2, 0, 7.6, 0, "#fff0f6", { rot = { 0, 0, 90 } }),
		box(7.2, 7.6, 1.2, 0, 3.8, 6.6, "#fff0f6"),
		ball(2.2, 0, 9.2, 5, "#e63946"),
		blob(2.6, 1.2, 2.6, 0, 8.4, 5, "#ffffff"),
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
			wedge(16, 8, 15, 0, 36, 7.5, "#bde0fe", { rot = { 0, 180, 0 } }),
			wedge(16, 8, 15, 0, 36, -7.5, "#bde0fe"),
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
		wedge(44, 8, 14, 0, 67, 7, "#8ff0c8", { rot = { 0, 180, 0 }, mat = "Fabric" }),
		wedge(44, 8, 14, 0, 67, -7, "#ff8fc7", { mat = "Fabric" }),
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
		wedge(66, 28, 30, 0, 58, 13, "#a0602a", { rot = { 0, 180, 0 } }),
		wedge(66, 28, 30, 0, 58, -13, "#a0602a"),
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

-- =============================================================================================
-- SWEET SHOP EXPANSION (uids 355-398): more to roll at every stage of growth, built with the
-- smooth mesh helpers (lathe / rbox / tube / torus / ell / extrude) for rounder, cuter candy.
-- =============================================================================================

local rbox, lathe, tube, torus, ell = S.rbox, S.lathe, S.tube, S.torus, S.ell

-- MeshKit's extrude faces outward only for clockwise outlines, while starOutline (and heartOutline
-- below) wind counter-clockwise, so reverse the outline before extruding.
local function extrude(outline: { { number } }, height: number, x: number, y: number, z: number, color: string, opts: any?, extra: { [string]: any }?): any
	local cw = table.create(#outline)
	for i = #outline, 1, -1 do
		table.insert(cw, outline[i])
	end
	return S.extrude(cw, height, x, y, z, color, opts, extra)
end

local MINT = "#8ff0c8"
local GOLD = "#ffd166"
local RED = "#e63946"
local GINGER = "#c47f35"
local ICING = "#fffaf0"
local DOUGH = "#e3a857"
local SPRINKLES = { "#ff5c8a", "#ffd23f", "#4cc9f0", "#7bd88f", "#b388ff", "#ffffff" }

-- Rotate a vector by Euler degrees {rx, ry, rz} exactly like parts are rotated (Ry * Rx * Rz).
local function rotv(v: { number }, rot: { number }): { number }
	local rx, ry, rz = math.rad(rot[1]), math.rad(rot[2]), math.rad(rot[3])
	local x, y, z = v[1], v[2], v[3]
	x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
	y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
	x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
	return { x, y, z }
end

-- Rotation that tilts a part's +Y axis by `tilt` degrees toward the horizontal heading `a` (degrees).
local function tiltRot(a: number, tilt: number): { number }
	return { 0, -a, -tilt }
end

local function addv(a: { number }, b: { number }, k: number?): { number }
	local s = k or 1
	return { a[1] + b[1] * s, a[2] + b[2] * s, a[3] + b[3] * s }
end

-- Heart outline in the x/z plane (counter-clockwise like starOutline), width w, centred, tip at -z.
local function heartOutline(w: number): { { number } }
	local out = {}
	for i = 0, 27 do
		local t = i / 28 * math.pi * 2
		local x = -16 * math.sin(t) ^ 3
		local y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
		table.insert(out, { x / 32 * w, (y + 2.5) / 32 * w })
	end
	return out
end

-- Crinkly twisted wrapper end, pointing +X (side = 1) or -X (side = -1) from (x, y, z).
local function twistEnd(out: { any }, x: number, y: number, z: number, side: number, r: number, color: string, mat: string?)
	table.insert(
		out,
		lathe(
			{ { 0, 0 }, { r * 0.42, 0 }, { r * 0.22, r * 0.35 }, { r * 0.5, r * 0.8 }, { r, r * 1.25 }, { r * 0.85, r * 1.42 }, { 0, r * 1.38 } },
			x,
			y,
			z,
			color,
			{ rot = { 0, 0, -90 * side }, mat = mat },
			{ seg = 24, smooth = 2, lobes = 6, lobeDepth = 0.45, twist = 1.3 }
		)
	)
end

-- Flat lollipop disc with a spiral stripe on its face. `rot` maps the disc's +Y to its face normal.
local function lollyDisc(out: { any }, c: { number }, rot: { number }, d: number, th: number, color: string, stripe: string, mat: string?)
	table.insert(out, cyl(d, th, c[1], c[2], c[3], color, { rot = rot, mat = mat }))
	local path = {}
	for i = 0, 13 do
		local t = i / 13
		local a = t * math.pi * 4
		local r = d * (0.05 + 0.38 * t)
		table.insert(path, addv(c, rotv({ math.cos(a) * r, th / 2, math.sin(a) * r }, rot)))
	end
	table.insert(out, tube(path, d * 0.045, stripe, nil, { sides = 8, smooth = 2 }))
end

-- Rod sprinkles scattered between radius rMin and rMax; yAt(r) gives the surface height there.
local function sprinkles(out: { any }, n: number, rMin: number, rMax: number, yAt: (number) -> number, len: number, seed: number)
	for i = 0, n - 1 do
		local a = i * 2.39996 + seed
		local r = rMin + (rMax - rMin) * ((i * 0.618 + seed * 0.37) % 1)
		local yaw = math.rad((i * 67 + seed * 31) % 180)
		local hx, hz = math.cos(yaw) * len * 0.34, math.sin(yaw) * len * 0.34
		local x, y, z = math.cos(a) * r, yAt(r), math.sin(a) * r
		-- Tubes with round caps are far cheaper than bevelled cylinders for dozens of sprinkles.
		table.insert(out, tube({ { x - hx, y, z - hz }, { x + hx, y, z + hz } }, len * 0.16, SPRINKLES[i % #SPRINKLES + 1], nil, { sides = 6, smooth = 1 }))
	end
end

-- Faceted rock-candy crystal growing from (x, y, z) tilted toward heading a.
local function crystal(out: { any }, x: number, y: number, z: number, a: number, tilt: number, s: number, color: string)
	table.insert(out, lathe({ { 0, 0 }, { 0.42 * s, 0 }, { 0.42 * s, 1.4 * s }, { 0, 2.1 * s } }, x, y, z, color, { refl = 0.2, rot = tiltRot(a, tilt) }, { seg = 6, smooth = 1 }))
end

-- Glass candy jar with a lid and a pile of candies inside.
local function candyJar(out: { any }, x: number, y: number, z: number, d: number, h: number, lid: string, seed: number)
	table.insert(out, cyl(d, h, x, y + h / 2, z, GLASS, { mat = "Glass", t = 0.55 }))
	table.insert(out, cyl(d * 1.06, h * 0.1, x, y + h * 1.05, z, lid))
	table.insert(out, ball(d * 0.28, x, y + h * 1.12, z, lid))
	local cd = d * 0.3
	local n = 0
	for layer = 0, 2 do
		for k = 0, 2 do
			local a = (k / 3 + layer * 0.17 + seed * 0.11) * math.pi * 2
			local r = d * 0.22
			table.insert(out, ball(cd, x + math.cos(a) * r, y + cd * 0.55 + layer * cd * 0.85, z + math.sin(a) * r, SPRINKLES[(n + seed) % 5 + 1]))
			n += 1
		end
	end
end

-- TINY (new) ------------------------------------------------------------------------------------

add({
	uid = 355,
	id = "butter_mint",
	name = "Butter Mint Pillow",
	rarity = "Common",
	tags = { "candy", "mint", "sweet", "food" },
	hint = "A whole tin tipped over by the till.",
	weight = 2.5,
	variants = { "#fff1b8", "#c8f7dc", "#ffd6e8", "#fffaf0" },
	parts = {
		box(1.0, 0.44, 0.66, 0, 0.22, 0, "#fff1b8"),
		box(0.66, 0.46, 0.08, 0, 0.23, -0.16, "#ffffff", { sharp = true }),
		box(0.66, 0.46, 0.08, 0, 0.23, 0.16, "#ffffff", { sharp = true }),
	},
})

add({
	uid = 356,
	id = "licorice_allsort",
	name = "Licorice Allsort",
	rarity = "Common",
	tags = { "candy", "sweet", "colorful", "food", "licorice" },
	hint = "Every layer is a surprise.",
	weight = 2,
	parts = {
		box(0.86, 0.2, 0.86, 0, 0.1, 0, "#1f1a24"),
		box(0.86, 0.2, 0.86, 0, 0.3, 0, "#ff8fc7"),
		box(0.86, 0.2, 0.86, 0, 0.5, 0, "#1f1a24"),
		box(0.86, 0.2, 0.86, 0, 0.7, 0, "#ffe066"),
	},
})

add({
	uid = 357,
	id = "nonpareil",
	name = "Nonpareil Drop",
	rarity = "Common",
	tags = { "candy", "chocolate", "sweet", "food", "round" },
	hint = "Chocolate buttons with sugar freckles.",
	weight = 2.5,
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 0.62, 0 }, { 0.64, 0.07 }, { 0.52, 0.26 }, { 0.28, 0.37 }, { 0, 0.4 } }, 0, 0, 0, CHOC_DARK, nil, { seg = 36, smooth = 2 }),
		}
		for i = 0, 4 do
			local a = i * 2.4
			local r = 0.12 + (i % 3) * 0.17
			table.insert(out, box(0.11, 0.07, 0.11, math.cos(a) * r, 0.4 - 0.55 * r * r + 0.01, math.sin(a) * r, "#ffffff", { rot = { 0, i * 40, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 358,
	id = "candy_heart",
	name = "Conversation Heart",
	rarity = "Common",
	tags = { "candy", "sweet", "pink", "food", "love" },
	hint = "Says BE MINE. Or possibly ROLL ME.",
	weight = 2.5,
	variants = { "#ffc8dd", "#c8f7dc", "#fff1b8", "#dcd6ff", "#ffffff", "#ffd6a5" },
	parts = {
		extrude(heartOutline(1.25), 0.38, 0, 0, 0, "#ffc8dd", nil, { bevel = 0.12 }),
		box(0.5, 0.03, 0.07, 0, 0.385, 0.1, "#e63946", { sharp = true }),
		box(0.34, 0.03, 0.07, 0, 0.385, -0.08, "#e63946", { sharp = true }),
	},
})

add({
	uid = 359,
	id = "peach_ring",
	name = "Peach Ring",
	rarity = "Common",
	tags = { "candy", "jelly", "round", "orange", "food", "sweet" },
	hint = "Sugar-dusted and rolled straight off the gummy pile.",
	weight = 2,
	parts = {
		torus(0.45, 0.2, 0, 0.19, 0, "#ff9f43", { mat = "Sand" }, { segU = 28, segV = 10, flatten = 0.95 }),
		torus(0.45, 0.165, 0, 0.27, 0, "#ffe066", { mat = "Sand" }, { segU = 28, segV = 10 }),
	},
})

add({
	uid = 360,
	id = "candy_buttons",
	name = "Candy Buttons",
	rarity = "Common",
	tags = { "candy", "sweet", "colorful", "food" },
	hint = "Peel one off the paper. Then another. Then all of them.",
	weight = 2,
	parts = (function()
		local out = { box(1.45, 0.04, 0.6, 0, 0.02, 0, "#fffaf0") }
		local colors = { "#ff8fc7", "#7ec8ff", "#ffe066" }
		for i = 0, 2 do
			for j = 0, 1 do
				table.insert(out, blob(0.32, 0.2, 0.32, -0.46 + i * 0.46, 0.1, -0.14 + j * 0.28, colors[(i + j) % 3 + 1]))
			end
		end
		return out
	end)(),
})

add({
	uid = 361,
	id = "mini_marshmallow",
	name = "Mini Marshmallows",
	rarity = "Common",
	tags = { "candy", "sweet", "fluffy", "white", "food" },
	hint = "Escaped from somebody's cocoa.",
	weight = 2.5,
	parts = {
		cyl(0.62, 0.56, -0.18, 0.28, 0.05, "#fffaf0", { mat = "Sand" }),
		cylX(0.56, 0.5, 0.3, 0.28, -0.12, "#ffc8dd", { mat = "Sand", rot = { 0, 35, 0 } }),
	},
})

add({
	uid = 362,
	id = "sugar_star",
	name = "Sugar Star Sprinkle",
	rarity = "Common",
	tags = { "candy", "star", "shiny", "sweet", "yellow" },
	hint = "Shaken off a cake by a very enthusiastic baker.",
	weight = 2,
	variants = { "#ffd23f", "#ff8fc7", "#ffffff", "#7ec8ff" },
	parts = {
		extrude(S.starOutline(5, 0.46, 0.21), 0.2, 0, 0, 0, "#ffd23f", { mat = "Foil" }, { bevel = 0.06 }),
	},
})

-- SMALL (new) -----------------------------------------------------------------------------------

add({
	uid = 363,
	id = "butterscotch_toffee",
	name = "Butterscotch Toffee",
	rarity = "Common",
	tags = { "candy", "wrapped", "shiny", "sweet", "food" },
	hint = "Twist both ends, unwrap, repeat.",
	weight = 1.5,
	variants = { "#f4b740", "#ff8fc7", "#8ff0c8", "#7ec8ff", "#c77dff" },
	parts = (function()
		local out = {
			ell(1.6, 1.0, 1.05, 0, 0.5, 0, "#f4b740", { mat = "Foil" }, { segU = 18, segV = 12 }),
			cylX(1.06, 0.42, 0, 0.5, 0, ICING),
			cylX(1.09, 0.12, 0, 0.5, 0, RED),
		}
		twistEnd(out, -0.7, 0.5, 0, -1, 0.46, "#f4b740", "Foil")
		twistEnd(out, 0.7, 0.5, 0, 1, 0.46, "#f4b740", "Foil")
		return out
	end)(),
})

add({
	uid = 364,
	id = "jawbreaker",
	name = "Jawbreaker",
	rarity = "Uncommon",
	tags = { "candy", "round", "colorful", "sweet", "food" },
	hint = "Someone gave up halfway. Look at all those layers!",
	parts = (function()
		local R = 1.3
		local prof = {}
		for _, deg in { -90, -78, -66, -54, -42, -30, -18, -6, 6, 18, 30, 40, 44 } do
			table.insert(prof, { R * math.cos(math.rad(deg)), R * math.sin(math.rad(deg)) })
		end
		table.insert(prof, { 0, R * math.sin(math.rad(44)) })
		local out = { lathe(prof, 0, R, 0, "#ff4d6d", { rot = { 90, 0, 0 } }, { seg = 36, smooth = 2 }) }
		local rings: { { any } } = { { 1.82, "#ffd23f" }, { 1.36, "#4cc9f0" }, { 0.92, "#7bd88f" }, { 0.46, "#ffffff" } }
		for k, ring in rings do
			table.insert(out, cyl(ring[1], 0.04, 0, R, 0.905 + k * 0.012, ring[2], { rot = { 90, 0, 0 }, sharp = true }))
		end
		table.insert(out, ball(0.38, -0.62, 2.2, -0.35, "#ffffff", { t = 0.35 }))
		return out
	end)(),
})

add({
	uid = 365,
	id = "kitty_dispenser",
	name = "Kitty Candy Dispenser",
	rarity = "Uncommon",
	tags = { "toy", "plastic", "candy", "colorful", "cat" },
	hint = "Tilt her head back for a treat.",
	parts = (function()
		local c = "#4cc9f0"
		local fur = "#fff1e6"
		local out = {
			box(1.2, 0.3, 0.8, 0, 0.15, 0, shade(c, -0.25)),
			box(0.86, 3.0, 0.56, 0, 1.8, 0, c),
			box(0.88, 0.55, 0.58, 0, 2.1, 0, ICING),
			extrude(heartOutline(0.36), 0.06, 0, 2.1, 0.35, RED, { rot = { -90, 0, 0 } }),
			box(0.6, 0.32, 0.5, 0, 3.38, 0.22, "#ff8fc7"),
			ball(1.45, 0, 3.95, 0, fur),
			ball(0.16, 0, 3.88, 0.72, "#ff8fab"),
			-- bow
			blob(0.36, 0.26, 0.2, 0.22, 4.55, 0.32, "#ff4d6d", { rot = { 0, 0, 20 } }),
			blob(0.36, 0.26, 0.2, 0.52, 4.62, 0.26, "#ff4d6d", { rot = { 0, 0, -20 } }),
			ball(0.14, 0.37, 4.58, 0.36, "#ff4d6d"),
		}
		for _, sx in { -1, 1 } do
			table.insert(out, wedge(0.45, 0.55, 0.3, sx * 0.42, 4.6, -0.05, fur))
			table.insert(out, wedge(0.25, 0.32, 0.1, sx * 0.42, 4.55, 0.1, "#ff8fab"))
			table.insert(out, tube({ { sx * 0.28, 3.86, 0.66 }, { sx * 0.72, 3.8, 0.6 } }, 0.025, "#c9a27e", nil, { sides = 5, smooth = 1, caps = "none" }))
		end
		eyes(0.5, 0.26, 4.05, 0.6, out)
		return out
	end)(),
})

add({
	uid = 366,
	id = "praline_bonbon",
	name = "Praline Bonbon",
	rarity = "Uncommon",
	tags = { "candy", "chocolate", "fancy", "sweet", "food" },
	hint = "Top shelf. Gold cup. White chocolate drizzle. Fancy.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 1.02, 0 }, { 1.32, 0.42 }, { 1.27, 0.46 }, { 0, 0.46 } }, 0, 0, 0, GOLD, { mat = "Foil" }, { seg = 48, lobes = 12, lobeDepth = 0.08 }),
			lathe({ { 0, 0 }, { 1.12, 0 }, { 1.18, 0.18 }, { 1.0, 0.62 }, { 0.52, 0.92 }, { 0, 1.0 } }, 0, 0.2, 0, "#7a4a2a", nil, { seg = 24, smooth = 2, lobes = 6, lobeDepth = 0.1 }),
			box(0.25, 0.03, 0.2, 0.1, 1.22, 0.05, GOLD, { mat = "Foil", rot = { 8, 30, 5 } }),
		}
		local path = {}
		for i = 0, 6 do
			local x = -0.75 + i * 0.25
			local z = if i % 2 == 0 then 0.35 else -0.35
			local r2 = x * x + z * z
			table.insert(path, { x, 0.2 + 1.0 - 0.38 * r2 + 0.03, z })
		end
		table.insert(out, tube(path, 0.055, "#f3e5c8", nil, { sides = 6, smooth = 3 }))
		return out
	end)(),
})

add({
	uid = 367,
	id = "marshmallow_twist",
	name = "Marshmallow Twist",
	rarity = "Common",
	tags = { "candy", "sweet", "fluffy", "pink", "food" },
	hint = "Two flavours that refused to be separated.",
	parts = (function()
		local out = {}
		for k = 0, 1 do
			local path = {}
			for i = 0, 12 do
				local t = i / 12
				local a = t * math.pi * 5 + k * math.pi
				table.insert(path, { -1.7 + t * 3.4, 0.56 + math.cos(a) * 0.22, math.sin(a) * 0.22 })
			end
			table.insert(out, tube(path, 0.34, if k == 0 then "#ffc8dd" else "#fffaf0", { mat = "Sand" }, { sides = 12, smooth = 3 }))
		end
		return out
	end)(),
})

add({
	uid = 368,
	id = "fairy_cake",
	name = "Fairy Cake",
	rarity = "Common",
	tags = { "food", "baked", "dessert", "sweet", "cake" },
	hint = "Pastel swirl, cherry on top.",
	variants = { "#bde0fe", "#ffc8dd", "#caffbf", "#fff1b8", "#e0c3fc" },
	parts = (function()
		local frost = "#bde0fe"
		local out = {
			lathe({ { 0, 0 }, { 0.95, 0 }, { 1.25, 1.2 }, { 1.2, 1.24 }, { 0, 1.24 } }, 0, 0, 0, "#ff8fc7", nil, { seg = 48, lobes = 12, lobeDepth = 0.06 }),
			ell(2.45, 0.7, 2.45, 0, 1.25, 0, DOUGH, nil, { segU = 16, segV = 8 }),
			lathe(
				{ { 0, 0 }, { 1.08, 0 }, { 1.12, 0.22 }, { 0.92, 0.45 }, { 0.82, 0.62 }, { 0.56, 0.85 }, { 0.46, 1.0 }, { 0.16, 1.3 }, { 0, 1.36 } },
				0,
				1.3,
				0,
				frost,
				nil,
				{ seg = 40, smooth = 2, lobes = 5, lobeDepth = 0.28, twist = 5 }
			),
			ball(0.5, 0.05, 2.86, 0, RED, { refl = 0.15 }),
			tube({ { 0.05, 3.05, 0 }, { 0.12, 3.35, -0.05 }, { 0.3, 3.5, -0.1 } }, 0.04, "#5c3a1e", nil, { sides = 5, smooth = 2 }),
		}
		sprinkles(out, 6, 0.7, 0.8, function()
			return 2.0
		end, 0.38, 1)
		return out
	end)(),
})

add({
	uid = 369,
	id = "sandwich_cookie",
	name = "Cream Sandwich Cookie",
	rarity = "Common",
	tags = { "food", "baked", "cookie", "chocolate", "sweet", "round" },
	hint = "Twist, lick, dunk. In that order.",
	parts = {
		cyl(3.0, 0.5, 0, 0.25, 0, "#3b2418"),
		cyl(2.8, 0.32, 0, 0.64, 0, ICING),
		cyl(3.0, 0.5, 0, 1.05, 0, "#3b2418"),
		torus(1.08, 0.07, 0, 1.31, 0, "#5a3a28", nil, { segU = 28, segV = 6, flatten = 0.6 }),
		extrude(S.starOutline(8, 0.55, 0.38), 0.07, 0, 1.28, 0, "#5a3a28", nil, { bevel = 0.025 }),
	},
})

add({
	uid = 370,
	id = "jewel_candy_ring",
	name = "Jewel Candy Ring",
	rarity = "Uncommon",
	tags = { "candy", "toy", "shiny", "plastic", "colorful", "gem" },
	hint = "Wear it. Admire it. Lick it.",
	variants = { "#ff2e63", "#3a86ff", "#06d6a0", "#ffd60a", "#b388ff" },
	parts = (function()
		local out = {
			torus(0.6, 0.16, 0, 0.76, 0, "#ff8fc7", { rot = { 90, 0, 0 } }, { segU = 24, segV = 8 }),
			cyl(1.0, 0.36, 0, 1.58, 0, "#ff8fc7"),
			cyl(1.15, 0.12, 0, 1.78, 0, GOLD, { mat = "Foil" }),
			lathe({ { 0, 0 }, { 0.8, 0.55 }, { 0.56, 0.88 }, { 0, 0.9 } }, 0, 1.8, 0, "#ff2e63", { mat = "Glass", t = 0.1, refl = 0.2 }, { seg = 8, smooth = 1 }),
		}
		for k = 0, 3 do
			local a = k / 4 * math.pi * 2 + math.pi / 4
			local c, s = math.cos(a), math.sin(a)
			table.insert(out, tube({ { c * 0.48, 1.8, s * 0.48 }, { c * 0.66, 2.32, s * 0.66 }, { c * 0.5, 2.5, s * 0.5 } }, 0.07, GOLD, { mat = "Foil" }, { sides = 5, smooth = 2 }))
		end
		return out
	end)(),
})

add({
	uid = 371,
	id = "heart_lollipop",
	name = "Heart Lollipop",
	rarity = "Common",
	tags = { "candy", "lollipop", "pink", "sweet", "food", "love" },
	hint = "Somebody's valentine got away.",
	variants = { "#ff3d7f", "#ffd23f", "#7bd88f", "#7ec8ff" },
	parts = (function()
		local out = {
			extrude(heartOutline(2.2), 0.45, 0, 0, 0.3, "#ff3d7f", { mat = "Glass", t = 0.05 }, { bevel = 0.14 }),
			cylX(0.22, 2.5, 0, 0.225, -1.75, "#ffffff", { rot = { 0, 90, 0 } }),
			blob(0.5, 0.32, 0.28, -0.28, 0.24, -0.72, MINT, { rot = { 0, 25, 0 } }),
			blob(0.5, 0.32, 0.28, 0.28, 0.24, -0.72, MINT, { rot = { 0, -25, 0 } }),
			ball(0.22, 0, 0.24, -0.72, MINT),
		}
		local path = {}
		for i = 0, 13 do
			local t = i / 13
			local a = t * math.pi * 3.2
			local r = 0.08 + 0.52 * t
			table.insert(path, { math.cos(a) * r, 0.46, 0.38 + math.sin(a) * r })
		end
		table.insert(out, tube(path, 0.06, ICING, nil, { sides = 6, smooth = 2 }))
		return out
	end)(),
})

add({
	uid = 372,
	id = "star_cookie",
	name = "Iced Star Cookie",
	rarity = "Common",
	tags = { "food", "baked", "cookie", "star", "sweet" },
	hint = "Twinkle twinkle, little snack.",
	parts = (function()
		local out = {
			extrude(S.starOutline(5, 1.8, 0.85), 0.42, 0, 0, 0, DOUGH, nil, { bevel = 0.12 }),
			extrude(S.starOutline(5, 1.55, 0.72), 0.12, 0, 0.4, 0, "#bde0fe", nil, { bevel = 0.05 }),
			blob(0.6, 0.16, 0.6, 0, 0.53, 0, "#ffd23f"),
		}
		for i = 0, 4 do
			local a = i / 5 * math.pi * 2 + math.pi / 2
			table.insert(out, ball(0.24, math.cos(a) * 1.1, 0.53, math.sin(a) * 1.1, ICING))
		end
		return out
	end)(),
})

-- NEW CRITTERS ----------------------------------------------------------------------------------

add({
	uid = 373,
	id = "jelly_slime",
	name = "Jelly Slime",
	rarity = "Uncommon",
	tags = { "candy", "jelly", "critter", "animal", "green", "hop", "slime" },
	hint = "Wobbles away whenever it hears rolling.",
	critter = { speed = 6, flee = 1.2, style = "hop", sound = "PopSoft" },
	parts = (function()
		local c = "#7bd88f"
		local out = {
			ell(3.0, 0.3, 2.8, 0, 0.12, 0, c, { mat = "Glass", t = 0.25 }, { segU = 20, segV = 6 }),
			ell(2.6, 2.0, 2.4, 0, 0.62, 0, c, { mat = "Glass", t = 0.25, tag = "body" }, { segU = 20, segV = 12, flatBottom = 0.62 }),
			blob(0.5, 0.7, 0.5, 0.2, 1.75, -0.1, c, { mat = "Glass", t = 0.25, tag = "head" }),
			ball(0.95, 0.25, 0.85, -0.25, "#ffd23f", { t = 0.15 }),
			ball(0.45, -0.6, 1.4, 0.55, "#ffffff", { t = 0.35 }),
			blob(0.5, 0.25, 0.12, 0, 0.82, 1.17, "#2a6b3a"),
		}
		eyes(0.9, 0.48, 1.12, 1.0, out)
		return out
	end)(),
})

add({
	uid = 374,
	id = "gummy_wanderer",
	name = "Wandering Gummy Bear",
	rarity = "Uncommon",
	tags = { "candy", "jelly", "bear", "critter", "animal", "colorful", "waddle" },
	hint = "Climbed out of the gummy pile to see the world.",
	critter = { speed = 9, flee = 1.4, style = "waddle", sound = "PopSoft" },
	parts = (function()
		local c = "#ff8c1a"
		local light = shade(c, 0.35)
		local function g(tag: string?): any
			return { t = 0.08, refl = 0.08, tag = tag }
		end
		local out = {
			ell(3.4, 3.6, 2.6, 0, 2.9, 0, c, g("body"), { segU = 18, segV = 12 }),
			ell(2.2, 2.4, 0.8, 0, 2.7, 1.0, light, g(nil), { segU = 14, segV = 10 }),
			ell(2.9, 2.5, 2.5, 0, 5.6, 0.1, c, g("head"), { segU = 18, segV = 12 }),
			ball(0.95, -1.05, 6.7, 0, c, g(nil)),
			ball(0.95, 1.05, 6.7, 0, c, g(nil)),
			ell(1.3, 0.9, 0.9, 0, 5.25, 1.25, light, g(nil), { segU = 12, segV = 8 }),
			ball(0.38, 0, 5.5, 1.68, "#7a3d0a"),
			blob(1.0, 2.0, 1.0, -1.75, 3.4, 0.2, c, { t = 0.08, refl = 0.08, tag = "wing", rot = { 0, 0, -25 } }),
			blob(1.0, 2.0, 1.0, 1.75, 3.4, 0.2, c, { t = 0.08, refl = 0.08, tag = "wing", rot = { 0, 0, 25 } }),
			blob(1.2, 1.6, 1.3, -0.85, 0.8, 0.15, c, { t = 0.08, refl = 0.08, tag = "leg" }),
			blob(1.2, 1.6, 1.3, 0.85, 0.8, 0.15, c, { t = 0.08, refl = 0.08, tag = "leg" }),
		}
		eyes(1.1, 0.55, 5.95, 1.2, out)
		return out
	end)(),
})

add({
	uid = 375,
	id = "sugar_mouse",
	name = "Sugar Mouse",
	rarity = "Uncommon",
	tags = { "candy", "sweet", "critter", "animal", "mouse", "pink", "scurry" },
	hint = "Squeaks if you get close. Tastes of strawberry.",
	critter = { speed = 11, flee = 1.6, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local c = "#ffb3d1"
		local out = {
			lathe(
				{ { 0, 0 }, { 1.25, 0.5 }, { 1.42, 1.5 }, { 1.12, 2.7 }, { 0.6, 3.7 }, { 0.18, 4.3 }, { 0, 4.45 } },
				0,
				1.1,
				-1.9,
				c,
				{ rot = { 90, 0, 0 }, mat = "Sand", tag = "body" },
				{ seg = 20, smooth = 2, squash = { 1, 0.78 } }
			),
			ball(0.32, 0, 1.12, 2.55, "#ff4d6d"),
			tube({ { 0, 0.9, -1.8 }, { 0, 0.55, -2.6 }, { 0.5, 0.25, -3.3 }, { -0.2, 0.12, -4.1 }, { 0.35, 0.12, -4.8 } }, 0.08, "#e8d5b0", nil, { sides = 6, smooth = 3 }),
		}
		for _, sx in { -1, 1 } do
			table.insert(out, ell(0.9, 0.95, 0.25, sx * 0.5, 2.15, 1.0, "#ff8fc7", { mat = "Sand", rot = { -15, 0, sx * -20 } }, { segU = 12, segV = 8 }))
			table.insert(out, ell(0.55, 0.6, 0.1, sx * 0.5, 2.15, 1.12, "#ff6fa8", { rot = { -15, 0, sx * -20 } }, { segU = 10, segV = 6 }))
			table.insert(out, box(0.7, 0.03, 0.03, sx * 0.4, 1.15, 2.3, "#ffffff", { rot = { 0, sx * 15, 0 } }))
		end
		eyes(0.6, 0.3, 1.42, 1.9, out)
		return out
	end)(),
})

-- MEDIUM-SMALL (new) ----------------------------------------------------------------------------

add({
	uid = 376,
	id = "glazed_ring_donut",
	name = "Strawberry Glazed Donut",
	rarity = "Common",
	tags = { "food", "baked", "dessert", "round", "pink", "sweet" },
	hint = "Fresh from the bakery corner, still a bit sticky.",
	parts = (function()
		local glaze = "#ff8fc7"
		local out = {
			torus(2.2, 1.15, 0, 0.98, 0, DOUGH, nil, { segU = 28, segV = 12, flatten = 0.85 }),
			torus(2.2, 1.06, 0, 1.42, 0, glaze, { refl = 0.05 }, { segU = 28, segV = 12, flatten = 0.55 }),
		}
		for i = 0, 6 do
			local a = i / 7 * math.pi * 2 + 0.3
			table.insert(out, blob(0.55, 0.9, 0.4, math.cos(a) * 3.15, 1.1, math.sin(a) * 3.15, glaze, { rot = { 0, 90 - math.deg(a), 0 } }))
		end
		sprinkles(out, 16, 1.4, 3.0, function(r: number)
			local u = (r - 2.2) / 1.06
			return 1.42 + 0.583 * math.sqrt(math.max(0, 1 - u * u)) + 0.02
		end, 0.5, 2)
		return out
	end)(),
})

add({
	uid = 377,
	id = "eclair",
	name = "Chocolate Éclair",
	rarity = "Common",
	tags = { "food", "baked", "dessert", "chocolate", "sweet" },
	hint = "Long, glossy and full of cream.",
	parts = (function()
		local function topY(x: number, z: number): number
			return 1.3 + 0.6 * math.sqrt(math.max(0, 1 - (x / 4.3) ^ 2 - (z / 1.15) ^ 2))
		end
		local out = {
			ell(9, 2.2, 2.6, 0, 0.55, 0, DOUGH, nil, { segU = 24, segV = 12, flatBottom = 0.5 }),
			ell(8.6, 1.2, 2.3, 0, 1.3, 0, CHOC, { refl = 0.08 }, { segU = 24, segV = 10 }),
			ball(0.9, -4.3, 0.75, 0, CREAM),
			ball(0.8, 4.25, 0.75, 0.1, CREAM),
		}
		local path = {}
		for i = 0, 8 do
			local x = -3.4 + i * 0.85
			local z = if i % 2 == 0 then 0.7 else -0.7
			table.insert(path, { x, topY(x, z) + 0.04, z })
		end
		table.insert(out, tube(path, 0.07, ICING, nil, { sides = 6, smooth = 3 }))
		return out
	end)(),
})

add({
	uid = 378,
	id = "iced_gingerbread_man",
	name = "Iced Gingerbread Man",
	rarity = "Common",
	tags = { "food", "baked", "cookie", "sweet", "gingerbread" },
	hint = "This one didn't run fast enough.",
	parts = (function()
		local out = {
			cyl(3.2, 0.9, 0, 0.45, 3.4, GINGER),
			box(3.4, 0.9, 4.0, 0, 0.45, 0.4, GINGER),
			-- face
			ball(0.42, -0.55, 0.92, 3.7, ICING),
			ball(0.42, 0.55, 0.92, 3.7, ICING),
			ball(0.2, -0.55, 1.08, 3.72, "#3b2418"),
			ball(0.2, 0.55, 1.08, 3.72, "#3b2418"),
			ball(0.4, -1.0, 0.9, 3.0, "#ff8fab"),
			ball(0.4, 1.0, 0.9, 3.0, "#ff8fab"),
			tube({ { -0.7, 0.93, 3.05 }, { -0.35, 0.93, 2.8 }, { 0, 0.93, 2.72 }, { 0.35, 0.93, 2.8 }, { 0.7, 0.93, 3.05 } }, 0.08, ICING, nil, { sides = 6, smooth = 2 }),
			-- bow tie and buttons
			blob(0.8, 0.3, 0.5, -0.4, 0.95, 1.95, RED, { rot = { 0, 20, 0 } }),
			blob(0.8, 0.3, 0.5, 0.4, 0.95, 1.95, RED, { rot = { 0, -20, 0 } }),
			ball(0.3, 0, 0.98, 1.95, RED),
			ball(0.55, 0, 0.92, 1.1, "#7bd88f"),
			ball(0.55, 0, 0.92, 0.1, "#ffd23f"),
			ball(0.55, 0, 0.92, -0.9, "#ff8fc7"),
		}
		for _, sx in { -1, 1 } do
			-- arm with an icing zigzag cuff
			local armRot = { 0, sx * 20, 0 }
			local armC = { sx * 2.6, 0.45, 1.3 }
			table.insert(out, box(3.2, 0.9, 1.5, armC[1], armC[2], armC[3], GINGER, { rot = armRot }))
			local zig = {}
			for k = 0, 4 do
				local p = rotv({ sx * (0.95 + (k % 2) * 0.25), 0.48, -0.6 + k * 0.3 }, armRot)
				table.insert(zig, addv(armC, p))
			end
			table.insert(out, tube(zig, 0.09, ICING, nil, { sides = 6, smooth = 2 }))
			-- leg with an icing zigzag ankle
			local legRot = { 0, -sx * 12, 0 }
			local legC = { sx * 1.0, 0.45, -2.6 }
			table.insert(out, box(1.6, 0.9, 3.4, legC[1], legC[2], legC[3], GINGER, { rot = legRot }))
			local zig2 = {}
			for k = 0, 4 do
				local p = rotv({ -0.6 + k * 0.3, 0.48, -1.0 - (k % 2) * 0.25 }, legRot)
				table.insert(zig2, addv(legC, p))
			end
			table.insert(out, tube(zig2, 0.09, ICING, nil, { sides = 6, smooth = 2 }))
		end
		return out
	end)(),
})

add({
	uid = 379,
	id = "hot_cocoa",
	name = "Hot Cocoa",
	rarity = "Common",
	tags = { "drink", "chocolate", "sweet", "food", "hot", "winter" },
	hint = "Extra marshmallows. Extra cream. Extra everything.",
	parts = (function()
		local mug = RED
		local out = {
			lathe({ { 0, 0 }, { 2.3, 0 }, { 2.48, 0.15 }, { 2.55, 5.4 }, { 2.7, 5.65 }, { 2.55, 5.8 }, { 2.32, 5.55 }, { 0, 5.55 } }, 0, 0, 0, mug, nil, { seg = 28, smooth = 1 }),
			cyl(5.16, 0.7, 0, 2.6, 0, ICING),
			cyl(4.66, 0.2, 0, 5.5, 0, "#5a3220"),
			torus(1.3, 0.36, 2.3, 2.9, 0, mug, { rot = { 0, 90, 90 } }, { arc = math.pi, segU = 14, segV = 8 }),
			lathe(
				{ { 0, 0 }, { 2.05, 0 }, { 2.0, 0.45 }, { 1.55, 0.95 }, { 1.25, 1.45 }, { 0.75, 1.95 }, { 0.25, 2.4 }, { 0, 2.5 } },
				0,
				5.45,
				0,
				ICING,
				nil,
				{ seg = 36, smooth = 2, lobes = 6, lobeDepth = 0.22, twist = 4 }
			),
			ball(0.4, 0, 7.95, 0, "#8a5a3c"),
		}
		local mallows = { "#ffc8dd", "#c8f7dc", "#fff1b8", "#ffc8dd" }
		for i = 0, 3 do
			local a = i / 4 * math.pi * 2 + 0.6
			table.insert(out, box(0.6, 0.6, 0.6, math.cos(a) * 1.45, 6.45, math.sin(a) * 1.45, mallows[i + 1], { rot = { i * 23, i * 41, i * 17 } }))
		end
		-- peppermint stirring stick
		local dir = rotv({ 0, 1, 0 }, { 0, 0, -15 })
		for k = 0, 5 do
			local c = addv({ 1.0, 4.2, -0.6 }, dir, 0.45 + k * 0.9)
			table.insert(out, cyl(0.42, 0.92, c[1], c[2], c[3], if k % 2 == 0 then ICING else RED, { rot = { 0, 0, -15 } }))
		end
		return out
	end)(),
})

add({
	uid = 380,
	id = "popcorn_box",
	name = "Popcorn Box",
	rarity = "Common",
	tags = { "food", "snack", "party", "red", "white" },
	hint = "Movie night spilled over into the candy shop.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 2.2, 0 }, { 2.25, 0.1 }, { 3.0, 6.0 }, { 3.15, 6.15 }, { 2.9, 6.2 }, { 0, 6.0 } }, 0, 0, 0, ICING, nil, { seg = 32, smooth = 1 }),
			torus(3.05, 0.15, 0, 6.1, 0, RED, nil, { segU = 32, segV = 6 }),
			ell(5.6, 2.6, 5.6, 0, 6.3, 0, "#fff4d6", nil, { segU = 20, segV = 10, lump = 0.18, seed = 4 }),
		}
		for k = 0, 5 do
			local a = k / 6 * math.pi * 2
			table.insert(out, box(1.25, 5.9, 0.1, math.cos(a) * 2.64, 3.05, math.sin(a) * 2.64, RED, { rot = { 7.2, 90 - math.deg(a), 0 } }))
		end
		for i = 0, 15 do
			local a = i * 2.39996
			local r = 2.4 * math.sqrt((i + 0.5) / 16)
			local y = 6.3 + 1.3 * math.sqrt(math.max(0, 1 - (r / 2.8) ^ 2)) + 0.1
			table.insert(out, blob(1.0, 0.85, 0.95, math.cos(a) * r, y, math.sin(a) * r, if i % 4 == 0 then "#ffe08a" else "#fff4d6", { rot = { i * 37, i * 53, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 381,
	id = "heart_choc_box",
	name = "Heart Chocolate Box",
	rarity = "Uncommon",
	tags = { "candy", "chocolate", "box", "red", "gift", "sweet", "food" },
	hint = "Half eaten already. Who took the caramel one?",
	parts = (function()
		local out = {
			extrude(heartOutline(8), 2.0, 0, 0, 0, RED, nil, { bevel = 0.35 }),
			extrude(heartOutline(7.2), 2.05, 0, 0, 0, GOLD, { mat = "Foil" }, { bevel = 0.2 }),
		}
		local spots = { { -1.8, 1.6 }, { 1.8, 1.6 }, { -2.4, 0.3 }, { -0.8, 0.3 }, { 0.8, 0.3 }, { 2.4, 0.3 }, { -1.25, -1.0 }, { 0, -1.0 }, { 1.25, -1.0 }, { 0, -2.2 } }
		local chocs = { CHOC_DARK, CHOC, "#f3e5c8" }
		for i, s in spots do
			table.insert(out, cyl(1.15, 0.3, s[1], 2.12, s[2], "#5a3220"))
			table.insert(out, ball(0.95, s[1], 2.45, s[2], chocs[i % 3 + 1]))
		end
		-- lid leaning against the back, with a ribbon and bow
		local lidRot = { -75, 0, 0 }
		local lidO = { 0, 3.6, 4.6 }
		table.insert(out, extrude(heartOutline(8.2), 0.7, lidO[1], lidO[2], lidO[3], RED, { rot = lidRot }, { bevel = 0.25 }))
		local rib = addv(lidO, rotv({ 0, 0.72, -1.0 }, lidRot))
		table.insert(out, box(0.7, 0.08, 5.4, rib[1], rib[2], rib[3], GOLD, { rot = lidRot, mat = "Foil", sharp = true }))
		local bow = addv(lidO, rotv({ 0, 0.85, 1.4 }, lidRot))
		table.insert(out, blob(1.1, 0.7, 0.4, bow[1] - 0.6, bow[2], bow[3], GOLD, { mat = "Foil", rot = { -75, 0, 20 } }))
		table.insert(out, blob(1.1, 0.7, 0.4, bow[1] + 0.6, bow[2], bow[3], GOLD, { mat = "Foil", rot = { -75, 0, -20 } }))
		table.insert(out, ball(0.5, bow[1], bow[2], bow[3], GOLD, { mat = "Foil" }))
		return out
	end)(),
})

add({
	uid = 382,
	id = "rocket_ice_pop",
	name = "Rocket Ice Pop",
	rarity = "Common",
	tags = { "dessert", "cold", "sweet", "colorful", "food", "frozen" },
	hint = "Melting fast. Roll faster.",
	parts = (function()
		local o = { 0, 1.22, -1.6 }
		local rot = { 90, 0, 0 }
		return {
			lathe({ { 0, 0 }, { 1.1, 0 }, { 1.22, 0.2 }, { 1.22, 1.9 }, { 0, 1.9 } }, o[1], o[2], o[3], "#3a86ff", { rot = rot }, { seg = 24, smooth = 1 }),
			lathe({ { 0, 1.9 }, { 1.05, 1.9 }, { 1.08, 2.05 }, { 1.08, 3.75 }, { 0, 3.75 } }, o[1], o[2], o[3], ICING, { rot = rot }, { seg = 24, smooth = 1 }),
			lathe({ { 0, 3.75 }, { 0.92, 3.75 }, { 0.95, 3.9 }, { 0.85, 5.0 }, { 0.45, 5.65 }, { 0, 5.8 } }, o[1], o[2], o[3], "#ff4d6d", { rot = rot }, { seg = 24, smooth = 2 }),
			box(0.85, 0.22, 3.4, 0, 1.22, -2.9, "#e6c79c", { mat = "Wood" }),
			ell(2.2, 0.12, 1.8, 0.3, 0.06, 4.0, "#ff4d6d", { mat = "Glass", t = 0.2 }, { segU = 16, segV = 6 }),
			blob(0.35, 0.7, 0.35, 0.7, 0.45, 3.4, "#ff4d6d", { mat = "Glass", t = 0.1 }),
		}
	end)(),
})

add({
	uid = 383,
	id = "golden_ticket_bar",
	name = "Golden Ticket Bar",
	rarity = "Legendary",
	tags = { "candy", "chocolate", "golden", "shiny", "magic", "wrapped", "food" },
	hint = "Only five were ever printed. This is one of them!",
	weight = 0.5,
	parts = (function()
		local out = {
			box(5.0, 0.9, 9.6, 0, 0.45, 0, CHOC),
			box(5.3, 1.25, 5.4, 0, 0.62, -2.2, "#6a2c91"),
			box(5.34, 1.29, 1.0, 0, 0.62, -1.2, GOLD, { mat = "Foil" }),
			box(5.2, 1.05, 0.25, 0, 0.55, 0.55, "#e9e9f2", { mat = "Foil" }),
			extrude(S.starOutline(5, 0.9, 0.4), 0.08, 0, 1.24, -3.0, GOLD, { mat = "Foil" }, { bevel = 0.03 }),
			box(4.0, 0.08, 2.0, 1.2, 1.45, -0.6, "#ffe066", { mat = "Foil", rot = { 0, 28, 8 } }),
			box(3.4, 0.1, 0.12, 1.2, 1.5, -0.6, "#fff3b0", { neon = true, rot = { 0, 28, 8 } }),
		}
		for row = 0, 2 do
			for _, sx in { -1, 1 } do
				table.insert(out, box(2.1, 0.35, 1.2, sx * 1.2, 1.02, 1.3 + row * 1.35, shade(CHOC, 0.08)))
			end
		end
		for _, s in { { 3.0, 2.4, 0.2 }, { -0.8, 2.1, 0.6 }, { 2.4, 2.0, -1.9 } } do
			table.insert(out, extrude(S.starOutline(4, 0.35, 0.1), 0.05, s[1], s[2], s[3], "#fff3b0", { neon = true, rot = { -90, 0, 0 } }, { bevel = 0.02 }))
		end
		return out
	end)(),
})

add({
	uid = 384,
	id = "rock_candy_geode",
	name = "Rock Candy Geode",
	rarity = "Epic",
	tags = { "candy", "crystal", "shiny", "magic", "purple", "sweet", "rock" },
	hint = "Crack it open and the whole shop sparkles.",
	weight = 0.7,
	parts = (function()
		local out = {
			lathe(
				{ { 0, 0 }, { 2.2, 0.15 }, { 3.3, 1.2 }, { 3.85, 2.6 }, { 3.75, 3.25 }, { 3.35, 3.35 }, { 2.9, 2.6 }, { 2.0, 1.55 }, { 0.8, 1.15 }, { 0, 1.1 } },
				0,
				0,
				0,
				"#5a3220",
				{ mat = "Slate" },
				{ seg = 28, smooth = 2, lobes = 7, lobeDepth = 0.06 }
			),
			torus(3.55, 0.28, 0, 3.28, 0, ICING, { mat = "Sand" }, { segU = 28, segV = 8 }),
			ell(5.4, 1.0, 5.4, 0, 1.4, 0, "#7b2cbf", nil, { segU = 20, segV = 8 }),
			ball(1.0, 0, 1.7, 0, "#fff3b0", { neon = true }),
		}
		local colors = { "#c77dff", "#9d4edd", "#7ec8ff", "#ff8fc7" }
		crystal(out, 0, 1.2, 0, 0, 0, 1.8, "#c77dff")
		for i = 0, 4 do
			local a = i / 5 * 360 + 10
			crystal(out, math.cos(math.rad(a)) * 1.2, 1.3, math.sin(math.rad(a)) * 1.2, a, 22, 1.4, colors[i % 4 + 1])
		end
		for i = 0, 6 do
			local a = i / 7 * 360 + 40
			crystal(out, math.cos(math.rad(a)) * 2.3, 1.7, math.sin(math.rad(a)) * 2.3, a, 40, 1.05, colors[(i + 2) % 4 + 1])
		end
		return out
	end)(),
})

-- MEDIUM (new) ----------------------------------------------------------------------------------

add({
	uid = 385,
	id = "lolly_bouquet",
	name = "Lollipop Bouquet",
	rarity = "Uncommon",
	tags = { "candy", "lollipop", "colorful", "gift", "sweet", "metal" },
	hint = "For the sweetest person in the shop.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 3.4, 0 }, { 3.5, 0.3 }, { 4.4, 7.0 }, { 4.65, 7.3 }, { 4.3, 7.4 }, { 0, 6.8 } }, 0, 0, 0, MINT, { mat = "Metal" }, { seg = 32 }),
			torus(4.02, 0.35, 0, 4.0, 0, PINK, nil, { segU = 32, segV = 8 }),
			blob(1.6, 1.0, 0.6, -0.9, 4.0, 4.15, PINK, { rot = { 0, 0, 20 } }),
			blob(1.6, 1.0, 0.6, 0.9, 4.0, 4.15, PINK, { rot = { 0, 0, -20 } }),
			ball(0.7, 0, 4.0, 4.3, PINK),
			ell(8.0, 1.8, 8.0, 0, 7.2, 0, ICING, nil, { segU = 20, segV = 10, lump = 0.25, seed = 7 }),
		}
		local lollies: { { any } } = {
			{ 90, 0, 14, 5.2, "#ff4d6d" },
			{ 20, 22, 12, 4.6, "#ffd23f" },
			{ 160, 22, 12.5, 4.6, "#7bd88f" },
			{ 230, 18, 13, 4.8, "#b388ff" },
			{ 310, 18, 13.5, 4.8, "#4cc9f0" },
			{ 60, 30, 10, 4.0, "#ff9f1c" },
			{ 125, 30, 10, 4.0, "#ff8fc7" },
		}
		for _, l in lollies do
			local a, tilt, len, d, color = l[1], l[2], l[3], l[4], l[5]
			local rot = tiltRot(a, tilt)
			local dir = rotv({ 0, 1, 0 }, rot)
			local base = { math.cos(math.rad(a)) * 0.8, 4.0, math.sin(math.rad(a)) * 0.8 }
			local mid = addv(base, dir, len / 2)
			table.insert(out, cyl(0.45, len, mid[1], mid[2], mid[3], ICING, { rot = rot }))
			lollyDisc(out, addv(base, dir, len + d * 0.42), { 90, 90 - a, 0 }, d, 1.0, color, ICING, "Glass")
		end
		return out
	end)(),
})

add({
	uid = 386,
	id = "macaron_tower",
	name = "Macaron Tower",
	rarity = "Rare",
	tags = { "dessert", "baked", "sweet", "fancy", "colorful", "food" },
	hint = "Twenty-nine macarons. Nobody counted the missing ones.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 4.5, 0 }, { 4.6, 0.6 }, { 1.6, 1.6 }, { 1.2, 5.2 }, { 1.8, 5.8 }, { 8.2, 6.1 }, { 8.4, 6.7 }, { 0, 6.7 } }, 0, 0, 0, "#ffd6e8", nil, { seg = 32 }),
			lathe({ { 0, 0 }, { 5.6, 0 }, { 0.6, 14 }, { 0, 14.2 } }, 0, 6.7, 0, CREAM, nil, { seg = 20 }),
		}
		local tierColors = { "#ffb3d1", "#c8f7dc", "#fff1b8", "#dcd6ff", "#ffd6a5" }
		local counts = { 8, 7, 6, 5, 3 }
		for k = 0, 4 do
			local y = 6.7 + 1.5 + k * 2.7
			local coneR = 5.6 - (y - 6.7) * (5.0 / 14)
			for i = 0, counts[k + 1] - 1 do
				local a = (i / counts[k + 1] + k * 0.09) * 360
				local rot = { 0, -a, 18 }
				local c = { math.cos(math.rad(a)) * (coneR + 0.8), y, math.sin(math.rad(a)) * (coneR + 0.8) }
				table.insert(out, cylX(2.9, 1.7, c[1], c[2], c[3], tierColors[k + 1], { rot = rot }))
				table.insert(out, cylX(2.94, 0.36, c[1], c[2], c[3], ICING, { rot = rot }))
			end
		end
		table.insert(out, cyl(2.9, 1.7, 0, 21.8, 0, "#ffb3d1"))
		table.insert(out, cyl(2.94, 0.36, 0, 21.8, 0, ICING))
		table.insert(out, ball(1.1, 0, 23.1, 0, RED, { refl = 0.1 }))
		return out
	end)(),
})

add({
	uid = 387,
	id = "penny_gumball_machine",
	name = "Penny Gumball Machine",
	rarity = "Uncommon",
	tags = { "candy", "glass", "metal", "machine", "round", "colorful", "red" },
	hint = "One penny, one gumball. Or roll the whole thing.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 3.8, 0 }, { 3.9, 0.5 }, { 3.0, 1.0 }, { 1.6, 2.0 }, { 1.4, 3.6 }, { 2.6, 4.4 }, { 0, 4.4 } }, 0, 0, 0, RED, { mat = "Metal" }, { seg = 24 }),
			box(5.4, 4.2, 5.4, 0, 6.4, 0, RED, { mat = "Metal" }),
			cyl(2.4, 0.5, 0, 6.9, 2.75, CHROME, { mat = "Metal", rot = { 90, 0, 0 } }),
			box(1.8, 0.4, 0.4, 0, 6.9, 3.2, CHROME, { mat = "Metal" }),
			ball(0.7, 0.9, 6.9, 3.2, CHROME, { mat = "Metal" }),
			box(1.4, 1.0, 0.9, 0, 5.0, 2.95, CHROME, { mat = "Metal" }),
			box(1.0, 0.5, 0.2, 0, 4.9, 3.4, "#2b2d42"),
			cyl(5.0, 0.8, 0, 8.9, 0, CHROME, { mat = "Metal" }),
			ball(10, 0, 14.1, 0, GLASS, { mat = "Glass", t = 0.6 }),
			cyl(5.2, 1.4, 0, 19.0, 0, RED, { mat = "Metal" }),
			ball(1.6, 0, 20.2, 0, RED, { mat = "Metal" }),
		}
		local colors = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" }
		local n = 0
		local y = 10.2
		while y < 15.8 do
			local rmax = math.sqrt(math.max(0, 4.1 ^ 2 - (y - 14.1) ^ 2))
			for _, r in { 0, 1.6, 3.2 } do
				if r <= rmax - 0.1 then
					local count = if r == 0 then 1 else math.floor(r * 2 * math.pi / 1.7)
					for i = 0, count - 1 do
						local a = i / count * math.pi * 2 + y
						table.insert(out, ball(1.6, math.cos(a) * r, y, math.sin(a) * r, colors[n % 6 + 1]))
						n += 1
					end
				end
			end
			y += 1.45
		end
		return out
	end)(),
})

add({
	uid = 388,
	id = "gingerbread_express",
	name = "Gingerbread Express",
	rarity = "Uncommon",
	tags = { "toy", "baked", "cookie", "train", "wheels", "candy", "food" },
	hint = "All aboard! Next stop: your tummy.",
	parts = (function()
		local out = {
			box(9, 2.2, 18, 0, 3.4, 0, GINGER),
			cyl(6.4, 10, 0, 7.6, 3.6, GINGER, { rot = { 90, 0, 0 } }),
			cyl(6.6, 0.8, 0, 7.6, 8.8, ICING, { rot = { 90, 0, 0 } }),
			torus(3.25, 0.22, 0, 7.6, 1.5, ICING, { rot = { 90, 0, 0 } }, { segU = 28, segV = 6 }),
			torus(3.25, 0.22, 0, 7.6, 5.2, ICING, { rot = { 90, 0, 0 } }, { segU = 28, segV = 6 }),
			ell(2.6, 2.2, 2.6, 0, 11.0, 2.2, "#7bd88f", { mat = "Sand" }, { segU = 14, segV = 8, flatBottom = 0.5 }),
			-- cab
			box(8.4, 9, 7, 0, 9.0, -5.5, GINGER),
			box(9.6, 1.2, 8.4, 0, 14.0, -5.5, PINK),
			box(5, 3.6, 0.3, 0, 10.2, -1.95, "#ffd166", { mat = "Glass", t = 0.1 }),
			box(0.3, 3.4, 4, -4.25, 10.2, -5.5, "#ffd166", { mat = "Glass", t = 0.1 }),
			box(0.3, 3.4, 4, 4.25, 10.2, -5.5, "#ffd166", { mat = "Glass", t = 0.1 }),
			-- chimney with a gumdrop puff
			cyl(2.2, 4.0, 0, 12.8, 6.0, CHOC),
			cyl(3.2, 1.0, 0, 15.2, 6.0, CHOC),
			blob(2.6, 2.0, 2.6, 0, 16.4, 6.0, RED, { mat = "Sand" }),
			-- cow catcher
			wedge(8, 2.6, 3, 0, 1.9, 10.5, MINT, { rot = { 0, 180, 0 } }),
			-- face on the boiler
			ball(1.0, -2.0, 6.6, 9.25, "#ff9ecf"),
			ball(1.0, 2.0, 6.6, 9.25, "#ff9ecf"),
			tube({ { -1.3, 6.6, 9.3 }, { -0.7, 6.0, 9.3 }, { 0, 5.8, 9.3 }, { 0.7, 6.0, 9.3 }, { 1.3, 6.6, 9.3 } }, 0.2, INK, nil, { sides = 6, smooth = 2 }),
		}
		-- roof frosting drips
		for i = 0, 5 do
			local x = -4.0 + i * 1.6
			table.insert(out, blob(0.8, 1.2 + (i % 2) * 0.5, 0.5, x, 13.2, -1.35, PINK))
		end
		-- peppermint wheels
		for _, w in { { -5.5, 4.6 }, { 0.5, 3.8 }, { 5.5, 3.8 } } do
			local z, d = w[1], w[2]
			for _, sx in { -1, 1 } do
				local x = sx * 4.9
				table.insert(out, cylX(d, 0.9, x, d / 2, z, ICING))
				-- red pinwheel stripes on the outer face of each peppermint wheel
				table.insert(out, extrude(S.starOutline(8, d * 0.46, d * 0.1), 0.08, x + sx * 0.42, d / 2, z, RED, { rot = { 0, 0, -90 * sx } }, { bevel = 0.02 }))
				table.insert(out, ball(d * 0.25, x + sx * 0.45, d / 2, z, RED))
			end
		end
		eyes(2.4, 1.2, 8.4, 9.2, out)
		return out
	end)(),
})

add({
	uid = 389,
	id = "ice_cream_tub",
	name = "Ice Cream Tub",
	rarity = "Common",
	tags = { "dessert", "cold", "sweet", "food", "round" },
	hint = "Three flavours and a scoop left standing in it.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 4.6, 0 }, { 4.75, 0.3 }, { 5.4, 7.5 }, { 5.7, 7.8 }, { 5.3, 7.9 }, { 0, 7.6 } }, 0, 0, 0, "#bde0fe", nil, { seg = 32 }),
			cyl(10.5, 3, 0, 3.8, 0, ICING),
			ell(2.4, 2.4, 0.3, 0, 3.8, 5.25, "#ff8fc7", nil, { segU = 16, segV = 8 }),
			ell(5.0, 4.0, 5.0, -1.6, 8.6, -0.8, "#ffafcc", nil, { segU = 20, segV = 12, lump = 0.12, seed = 2 }),
			ell(4.6, 3.8, 4.6, 1.8, 8.4, 0.6, CHOC, nil, { segU = 20, segV = 12, lump = 0.12, seed = 5 }),
			ell(4.4, 3.6, 4.4, -0.2, 10.2, 1.4, "#c8f7dc", nil, { segU = 20, segV = 12, lump = 0.12, seed = 8 }),
			ell(2.4, 1.2, 2.4, 1.8, 9.9, -1.2, CHROME, { mat = "Metal" }, { segU = 14, segV = 8 }),
			tube({ { 2.4, 10.2, -1.6 }, { 4.0, 11.4, -2.6 }, { 5.8, 12.4, -3.4 } }, 0.35, CHROME, { mat = "Metal" }, { sides = 8, smooth = 2 }),
			box(0.5, 4, 2.8, -3.2, 11.0, 1.0, "#e8b56b", { rot = { 0, 30, -20 } }),
			blob(1.0, 1.8, 0.6, -3.8, 7.4, 3.6, "#ffafcc", { rot = { 0, -45, 0 } }),
		}
		return out
	end)(),
})

add({
	uid = 390,
	id = "star_pinata",
	name = "Star Piñata",
	rarity = "Uncommon",
	tags = { "party", "toy", "colorful", "star", "paper" },
	hint = "Five points of pure party. Give it a whack!",
	parts = (function()
		local body = "#ff70a6"
		local colors = { "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" }
		local out = {
			cyl(10, 7, 0, 0, 0, body, { rot = { 90, 0, 0 }, mat = "Fabric" }),
			torus(4.9, 0.45, 0, 0, 2.6, "#ffd60a", { rot = { 90, 0, 0 }, mat = "Fabric" }, { segU = 32, segV = 8 }),
			torus(4.9, 0.45, 0, 0, -2.6, "#3a86ff", { rot = { 90, 0, 0 }, mat = "Fabric" }, { segU = 32, segV = 8 }),
			ball(1.0, -2.6, -0.6, 3.4, "#ff9ecf"),
			ball(1.0, 2.6, -0.6, 3.4, "#ff9ecf"),
			tube({ { -1.4, -0.8, 3.6 }, { -0.7, -1.4, 3.6 }, { 0, -1.6, 3.6 }, { 0.7, -1.4, 3.6 }, { 1.4, -0.8, 3.6 } }, 0.22, INK, nil, { sides = 6, smooth = 2 }),
		}
		for k = 0, 4 do
			local th = 90 + k * 72
			local dir = { math.cos(math.rad(th)), math.sin(math.rad(th)), 0 }
			local rot = { 0, 0, th - 90 }
			local base = addv({ 0, 0, 0 }, dir, 3.6)
			table.insert(out, lathe({ { 0, 0 }, { 3.0, 0 }, { 2.2, 3.0 }, { 1.2, 6.0 }, { 0.35, 8.4 }, { 0, 8.8 } }, base[1], base[2], base[3], colors[k + 1], { rot = rot, mat = "Fabric" }, { seg = 20, smooth = 2 }))
			for j, t in { 2.4, 5.4 } do
				local p = addv(base, dir, t)
				local r = if t < 3 then 2.4 else 1.45
				table.insert(out, torus(r, 0.3, p[1], p[2], p[3], colors[(k + j) % 5 + 1], { rot = rot, mat = "Fabric" }, { segU = 20, segV = 6 }))
			end
			if k == 1 or k == 4 then
				local tip = addv(base, dir, 8.6)
				for s = 0, 1 do
					local off = (s - 0.5) * 0.7
					table.insert(out, tube({ tip, { tip[1] + off, tip[2] - 1.5, tip[3] + 0.2 }, { tip[1] + off * 1.6, tip[2] - 3.2, tip[3] + 0.3 } }, 0.22, colors[(k + s + 2) % 5 + 1], { mat = "Fabric" }, { sides = 6, smooth = 2 }))
				end
			end
		end
		eyes(3.2, 1.7, 1.0, 3.55, out)
		return out
	end)(),
})

-- LARGE (new) -----------------------------------------------------------------------------------

add({
	uid = 391,
	id = "chocolate_fountain",
	name = "Chocolate Fountain",
	rarity = "Rare",
	tags = { "chocolate", "metal", "dessert", "shiny", "food", "electric", "sweet" },
	hint = "Never stops flowing. Dunk anything!",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 9.5, 0 }, { 9.8, 0.6 }, { 8.4, 2.4 }, { 6.5, 3.6 }, { 0, 3.6 } }, 0, 0, 0, CHROME, { mat = "Metal" }, { seg = 32 }),
			lathe({ { 0, 3.4 }, { 7.5, 3.4 }, { 11.5, 5.4 }, { 12.2, 6.8 }, { 11.8, 7.2 }, { 11.0, 6.6 }, { 0, 6.4 } }, 0, 0, 0, CHROME, { mat = "Metal" }, { seg = 40 }),
			cyl(22.2, 0.5, 0, 6.6, 0, CHOC, { refl = 0.1 }),
			cyl(2.4, 24, 0, 18.4, 0, CHROME, { mat = "Metal" }),
			ell(4.6, 2.6, 4.6, 0, 30.4, 0, CHOC, { refl = 0.1 }, { segU = 20, segV = 10 }),
			ball(1.2, 0, 31.9, 0, CHOC, { refl = 0.1 }),
		}
		local tiers = { { 13, 7.5 }, { 20, 5.2 }, { 26.5, 3.2 } }
		local below = 6.85
		for _, tier in tiers do
			local y, r = tier[1], tier[2]
			table.insert(out, lathe({ { 0, -1.2 }, { r * 0.5, -1.2 }, { r, 0 }, { r * 1.02, 0.35 }, { 0, 0.2 } }, 0, y, 0, CHROME, { mat = "Metal" }, { seg = 32 }))
			table.insert(out, cyl(r * 2 - 0.4, 0.3, 0, y + 0.25, 0, CHOC, { refl = 0.1 }))
			local mid = y - (y - below) * 0.5
			table.insert(
				out,
				lathe(
					{
						{ r - 0.2, y + 0.45 },
						{ r + 0.45, y - 0.6 },
						{ r + 0.9, mid },
						{ r + 1.3, below + 0.4 },
						{ r + 1.0, below + 0.4 },
						{ r + 0.6, mid },
						{ r + 0.1, y - 0.6 },
						{ r - 0.5, y + 0.3 },
					},
					0,
					0,
					0,
					CHOC,
					{ refl = 0.1 },
					{ seg = 48, smooth = 2, lobes = 12, lobeDepth = 0.05 }
				)
			)
			below = y + 0.4
		end
		-- dipping skewers leaning on the basin
		for i = 0, 2 do
			local a = i / 3 * math.pi * 2 + 0.5
			local p0 = { math.cos(a) * 14, 0.3, math.sin(a) * 14 }
			local p1 = { math.cos(a) * 9.5, 10.5, math.sin(a) * 9.5 }
			table.insert(out, tube({ p0, p1 }, 0.22, "#deb887", { mat = "Wood" }, { sides = 6, smooth = 1 }))
			local function at(t: number): { number }
				return { p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t, p0[3] + (p1[3] - p0[3]) * t }
			end
			local m = at(0.62)
			table.insert(out, box(1.6, 1.6, 1.6, m[1], m[2], m[3], ICING, { rot = { 20, math.deg(a), 30 } }))
			local s = at(0.84)
			table.insert(out, ell(1.7, 2.1, 1.7, s[1], s[2], s[3], RED, nil, { segU = 14, segV = 10 }))
			table.insert(out, ell(1.8, 1.0, 1.8, s[1], s[2] + 0.75, s[3], CHOC, { refl = 0.1 }, { segU = 14, segV = 8 }))
		end
		return out
	end)(),
})

add({
	uid = 392,
	id = "strawberry_cake_stand",
	name = "Strawberry Cake Stand",
	rarity = "Rare",
	tags = { "dessert", "baked", "cake", "sweet", "party", "food", "fancy" },
	hint = "Chocolate drips, fresh berries, and a very tall stand.",
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 8.5, 0 }, { 8.6, 0.8 }, { 3.2, 2.0 }, { 2.0, 7.8 }, { 3.4, 9.6 }, { 13.8, 10.1 }, { 14.4, 10.8 }, { 14.0, 11.2 }, { 0, 11.2 } }, 0, 0, 0, MINT, nil, { seg = 40 }),
			cyl(24, 9, 0, 15.7, 0, "#ffc8dd"),
			cyl(24.4, 0.8, 0, 20.4, 0, CHOC, { refl = 0.08 }),
			torus(12.1, 0.7, 0, 11.7, 0, ICING, nil, { segU = 40, segV = 8 }),
			cyl(15, 7.5, 0, 24.55, 0, ICING),
			torus(7.55, 0.55, 0, 21.3, 0, "#ffc8dd", nil, { segU = 32, segV = 8 }),
		}
		for i = 0, 17 do
			local a = i / 18 * math.pi * 2
			table.insert(out, blob(1.3, 3.0 - (i % 3) * 0.6, 0.8, math.cos(a) * 12.05, 19.2 - (i % 3) * 0.3, math.sin(a) * 12.05, CHOC, { rot = { 0, 90 - math.deg(a), 0 }, refl = 0.08 }))
		end
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2 + 0.2
			table.insert(out, lathe({ { 0, 0 }, { 0.9, 0 }, { 0.8, 0.5 }, { 0.4, 1.0 }, { 0, 1.2 } }, math.cos(a) * 6.2, 28.2, math.sin(a) * 6.2, "#ffc8dd", nil, { seg = 20, lobes = 5, lobeDepth = 0.3, twist = 3 }))
			local b = a + math.pi / 8
			local bx, bz = math.cos(b) * 9.8, math.sin(b) * 9.8
			table.insert(out, ell(2.2, 2.6, 2.2, bx, 22.0, bz, RED, nil, { segU = 14, segV = 10 }))
			table.insert(out, extrude(S.starOutline(5, 0.9, 0.4), 0.2, bx, 23.15, bz, "#5cbf4a", nil, { bevel = 0.06 }))
		end
		for _, p in { { -1.2, -0.6 }, { 1.3, -0.4 }, { 0, 1.2 } } do
			table.insert(out, ell(2.4, 3.0, 2.4, p[1], 29.7, p[2], RED, nil, { segU = 14, segV = 10 }))
			table.insert(out, extrude(S.starOutline(5, 1.0, 0.45), 0.2, p[1], 31.1, p[2], "#5cbf4a", nil, { bevel = 0.06 }))
		end
		return out
	end)(),
})

add({
	uid = 393,
	id = "ice_cream_trike",
	name = "Ice Cream Trike",
	rarity = "Uncommon",
	tags = { "wheels", "dessert", "cold", "metal", "vehicle", "colorful" },
	hint = "Ding-a-ling! Parked by the soda fountain.",
	parts = (function()
		local tire = "#3d3d4a"
		local out = {
			-- cooler box
			rbox(18, 12, 12, 0, 14, 4, MINT, nil, 1.2),
			rbox(18.6, 1.4, 12.6, 0, 20.4, 4, ICING, nil, 0.5),
			box(18.2, 1.0, 12.2, 0, 10.5, 4, PINK),
			box(18.2, 1.0, 12.2, 0, 17.6, 4, PINK),
			ell(4.4, 4.4, 0.4, 0, 14.2, 10.1, ICING, nil, { segU = 20, segV = 8 }),
			ball(2.2, 0, 15.0, 10.3, "#ffafcc"),
			lathe({ { 0, 0 }, { 1.0, 2.2 }, { 0, 2.2 } }, 0, 11.7, 10.3, "#e0a157", nil, { seg = 12, squash = { 1, 0.35 } }),
			-- front axle and wheels
			cylX(0.8, 20, 0, 4.5, 4, CHROME, { mat = "Metal" }),
			box(1, 4, 1, -7, 6.3, 4, CHROME, { mat = "Metal" }),
			box(1, 4, 1, 7, 6.3, 4, CHROME, { mat = "Metal" }),
			-- frame, seat, handlebar
			tube({ { 0, 9, -1.5 }, { 0, 8.5, -8 }, { 0, 6.5, -15.5 } }, 0.6, CHROME, { mat = "Metal" }, { sides = 8, smooth = 2 }),
			cyl(0.9, 6, 0, 12, -9, CHROME, { mat = "Metal" }),
			ell(4.6, 1.6, 5.4, 0, 15.6, -9.4, RED, nil, { segU = 16, segV = 8 }),
			cyl(0.8, 3, 0, 18.5, -2.6, CHROME, { mat = "Metal" }),
			tube({ { -4.5, 19.6, -3.6 }, { -3, 20.1, -4.5 }, { 0, 20.2, -4.8 }, { 3, 20.1, -4.5 }, { 4.5, 19.6, -3.6 } }, 0.45, CHROME, { mat = "Metal" }, { sides = 8, smooth = 2 }),
			ball(1.2, -4.7, 19.5, -3.4, RED),
			ball(1.2, 4.7, 19.5, -3.4, RED),
			-- rear wheel
			torus(5.0, 1.0, 0, 6.0, -16, tire, { rot = { 0, 0, 90 } }, { segU = 28, segV = 8 }),
			cylX(7.6, 0.9, 0, 6.0, -16, ICING),
			ball(1.6, 0, 6.0, -16, RED),
			-- umbrella
			cyl(0.8, 22, 7.5, 31, -1, ICING),
			lathe({ { 0, 0 }, { 13, 0 }, { 12.6, 0.5 }, { 6.5, 3.6 }, { 0.6, 6.2 }, { 0, 6.4 } }, 7.5, 38.5, -1, PINK, nil, { seg = 48, smooth = 1, lobes = 8, lobeDepth = 0.07 }),
			ball(1.4, 7.5, 45.2, -1, "#ffd23f"),
		}
		for _, sx in { -1, 1 } do
			table.insert(out, torus(3.6, 0.9, sx * 10, 4.5, 4, tire, { rot = { 0, 0, 90 } }, { segU = 24, segV = 8 }))
			table.insert(out, cylX(5.6, 0.8, sx * 10, 4.5, 4, ICING))
			table.insert(out, ball(1.6, sx * 10.5, 4.5, 4, RED))
		end
		for i = 0, 3 do
			table.insert(out, box(0.4, 9.4, 0.4, 0, 6.0, -16, CHROME, { mat = "Metal", rot = { i * 45, 0, 0 } }))
		end
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2
			local c, s = math.cos(a), math.sin(a)
			table.insert(out, tube({ { 7.5, 45.0, -1 }, { 7.5 + c * 6.5, 42.25, -1 + s * 6.5 }, { 7.5 + c * 12.8, 38.75, -1 + s * 12.8 } }, 0.28, ICING, nil, { sides = 6, smooth = 2 }))
		end
		-- two cones waiting in holders on the lid
		for _, cdef in { { -4, 6, "#ffafcc" }, { -0.5, 7.2, "#c8f7dc" } } do
			local x, z = cdef[1], cdef[2]
			table.insert(out, cyl(2.2, 1.2, x, 21.7, z, CHROME, { mat = "Metal" }))
			table.insert(out, lathe({ { 0, 0 }, { 1.15, 3.6 }, { 1.2, 3.8 }, { 0, 3.8 } }, x, 21.0, z, "#e0a157", { mat = "Pebble" }, { seg = 14 }))
			table.insert(out, ball(2.6, x, 25.6, z, cdef[3]))
		end
		return out
	end)(),
})

add({
	uid = 394,
	id = "candy_shelf",
	name = "Candy Display Shelf",
	rarity = "Uncommon",
	tags = { "furniture", "wood", "glass", "candy", "colorful", "shelf" },
	hint = "Floor-to-ceiling jars. You'll have to roll the whole thing.",
	parts = (function()
		local wood = "#ffd6a5"
		local out = {
			rbox(40, 48, 1.4, 0, 24, -5.3, "#ffd6e8", nil, 0.5),
			rbox(1.6, 48, 12, -19.2, 24, 0, wood, { mat = "Wood" }, 0.5),
			rbox(1.6, 48, 12, 19.2, 24, 0, wood, { mat = "Wood" }, 0.5),
		}
		for _, y in { 0.7, 16, 31.5, 47.3 } do
			table.insert(out, rbox(40, 1.4, 12, 0, y, 0, wood, { mat = "Wood" }, 0.5))
		end
		for i = 0, 7 do
			table.insert(out, blob(5, 3, 1.5, -17.5 + i * 5, 48.4, 5.4, MINT))
		end
		local lids = { "#ff4d6d", "#4cc9f0", "#ffd23f", "#7bd88f", "#b388ff", "#ff9f1c" }
		-- bottom: three big jars
		for i = 0, 2 do
			candyJar(out, -12 + i * 12, 1.4, 0, 8, 11, lids[i + 1], i)
		end
		-- middle: two jars and a cup of lollipops
		candyJar(out, -12, 16.7, 0, 7, 10, lids[4], 3)
		candyJar(out, 0, 16.7, 0, 7, 10, lids[5], 4)
		table.insert(out, cyl(5, 5, 12, 19.2, 0, PINK))
		for k = 0, 3 do
			local a = k / 4 * 360 + 20
			local rot = tiltRot(a, 14)
			local dir = rotv({ 0, 1, 0 }, rot)
			local base = { 12, 19.5, 0 }
			local mid = addv(base, dir, 4.5)
			table.insert(out, cyl(0.35, 9, mid[1], mid[2], mid[3], ICING, { rot = rot }))
			local top = addv(base, dir, 10.2)
			table.insert(out, cyl(3.2, 0.7, top[1], top[2], top[3], lids[k + 1], { rot = { 90, 90 - a, 0 }, mat = "Glass" }))
		end
		-- top: stacked chocolate boxes and a jar
		table.insert(out, rbox(10, 3, 7, -11, 33.7, 0, "#6a2c91", nil, 0.4))
		table.insert(out, rbox(8.4, 3, 6.2, -11, 36.7, 0.2, RED, nil, 0.4))
		table.insert(out, box(1.0, 6.2, 7.2, -11, 35.2, 0, GOLD, { mat = "Foil" }))
		candyJar(out, 3, 32.2, 0, 6.5, 9, lids[6], 5)
		table.insert(out, rbox(9, 4, 6, 14, 34.2, 0, MINT, nil, 0.5))
		table.insert(out, ell(2.6, 1.6, 1.2, 12.8, 36.9, 0, PINK, nil, { segU = 12, segV = 8 }))
		table.insert(out, ell(2.6, 1.6, 1.2, 15.2, 36.9, 0, PINK, nil, { segU = 12, segV = 8 }))
		return out
	end)(),
})

add({
	uid = 395,
	id = "popcorn_cart",
	name = "Popcorn Cart",
	rarity = "Uncommon",
	tags = { "food", "snack", "machine", "metal", "glass", "wheels", "red", "electric" },
	hint = "Pop pop pop! Smells like movie night.",
	parts = (function()
		local out = {
			rbox(26, 18, 18, 0, 13, 0, RED, nil, 1.0),
			box(26.4, 1.2, 18.4, 0, 21.4, 0, GOLD, { mat = "Foil" }),
			box(26.4, 1.2, 18.4, 0, 4.6, 0, GOLD, { mat = "Foil" }),
			rbox(16, 10, 0.6, 0, 13, 9.2, "#ffe066", nil, 0.3),
			box(1.4, 4.2, 1.4, 0, 2.1, 7.5, GOLD, { mat = "Foil" }),
			box(1.4, 4.2, 1.4, 0, 2.1, -7.5, GOLD, { mat = "Foil" }),
			-- glass cabinet
			box(23.2, 17, 0.3, 0, 31, 8.0, GLASS, { mat = "Glass", t = 0.6 }),
			box(23.2, 17, 0.3, 0, 31, -8.0, GLASS, { mat = "Glass", t = 0.6 }),
			box(0.3, 17, 15.6, -12, 31, 0, GLASS, { mat = "Glass", t = 0.6 }),
			box(0.3, 17, 15.6, 12, 31, 0, GLASS, { mat = "Glass", t = 0.6 }),
			ell(22, 7, 14, 0, 24, 0, "#fff4d6", nil, { segU = 24, segV = 12, lump = 0.2, seed = 3 }),
			-- kettle
			cyl(0.5, 5, 0, 37.5, 0, CHROME, { mat = "Metal" }),
			lathe({ { 0, 0 }, { 2.2, 0.4 }, { 3.0, 2.0 }, { 3.0, 3.2 }, { 0, 3.2 } }, 0, 32, 0, CHROME, { mat = "Metal", rot = { 0, 0, 25 } }, { seg = 20 }),
			-- roof and sign
			rbox(27.4, 2, 19.4, 0, 41, 0, RED, nil, 0.8),
			ell(24, 6, 16, 0, 42, 0, RED, nil, { segU = 24, segV = 10 }),
			ball(2.2, 0, 45.2, 0, GOLD, { mat = "Foil" }),
			rbox(20, 5, 1, 0, 47.4, 0, "#ffe066", nil, 0.4),
		}
		for _, sx in { -1, 1 } do
			for _, sz in { -1, 1 } do
				table.insert(out, box(1.2, 18, 1.2, sx * 12, 31, sz * 8, RED))
			end
			local x = sx * 14
			table.insert(out, torus(6.2, 0.8, x, 7, 0, shade(RED, -0.25), { rot = { 0, 0, 90 } }, { segU = 28, segV = 8 }))
			table.insert(out, cylX(2.4, 1.2, x, 7, 0, GOLD, { mat = "Foil" }))
			for i = 0, 5 do
				table.insert(out, box(0.5, 12.2, 0.5, x, 7, 0, GOLD, { mat = "Foil", rot = { i * 30, 0, 0 } }))
			end
		end
		-- candy stripes on the cart
		for i = 0, 4 do
			table.insert(out, box(1.8, 17.4, 18.2, -10 + i * 5, 13, 0, ICING))
		end
		-- popcorn icon on the sign panel and bulbs on the marquee
		for i = 0, 4 do
			local a = i / 5 * math.pi * 2
			table.insert(out, ball(2.2, math.cos(a) * 1.6, 13.4 + math.sin(a) * 1.4, 9.6, "#fff4d6"))
		end
		for i = -3, 3 do
			table.insert(out, ball(1.0, i * 2.6, 50.2, 0, "#fff3b0", { neon = true }))
			table.insert(out, ball(0.9, i * 2.6, 47.4, 0.6, RED))
		end
		for i = 0, 13 do
			local a = i * 2.39996
			local r = 9 * math.sqrt((i + 0.5) / 14)
			local x, z = math.cos(a) * r, math.sin(a) * r * 0.6
			local y = 24 + 3.4 * math.sqrt(math.max(0, 1 - (x / 11) ^ 2 - (z / 7) ^ 2)) + 0.3
			table.insert(out, blob(2.0, 1.7, 1.9, x, y, z, if i % 4 == 0 then "#ffe08a" else "#fff4d6", { rot = { i * 37, i * 53, 0 } }))
		end
		return out
	end)(),
})

-- HUGE (new) ------------------------------------------------------------------------------------

add({
	uid = 396,
	id = "lollipop_tree",
	name = "Lollipop Tree",
	rarity = "Rare",
	tags = { "candy", "tree", "lollipop", "colorful", "decor", "plant" },
	hint = "Grows best in chocolate soil.",
	weight = 1.2,
	parts = (function()
		local out = {
			lathe({ { 0, 0 }, { 11, 0 }, { 11.5, 0.6 }, { 14, 12 }, { 15, 12.6 }, { 14.6, 13.4 }, { 13.4, 13 }, { 0, 12.8 } }, 0, 0, 0, MINT, nil, { seg = 40 }),
			cyl(26.6, 0.8, 0, 12.8, 0, CHOC_DARK),
		}
		for i = 0, 9 do
			local a = i * 2.39996
			local r = 6 + (i % 4) * 1.8
			table.insert(out, ball(2.2, math.cos(a) * r, 13.4, math.sin(a) * r, SPRINKLES[i % 5 + 1]))
		end
		-- candy-cane striped trunk
		for k = 0, 6 do
			table.insert(out, cyl(9, 7.2, 0, 12.8 + 3.6 + k * 7.2, 0, if k % 2 == 0 then RED else ICING))
		end
		-- cotton candy canopy
		local cy = 74
		table.insert(out, ell(52, 34, 52, 0, cy, 0, "#ffc8dd", { mat = "Sand" }, { segU = 24, segV = 16, lump = 0.22, seed = 5 }))
		for i, p in { { 18, 64, 10, 26, "#bde0fe" }, { -17, 66, -9, 24, "#e0c3fc" }, { -6, 88, 12, 22, "#c8f7dc" }, { 10, 86, -12, 22, "#fff1b8" } } do
			table.insert(out, ell(p[4], p[4] * 0.75, p[4], p[1], p[2], p[3], p[5], { mat = "Sand" }, { segU = 20, segV = 12, lump = 0.25, seed = i * 3 }))
		end
		-- lollipops sprouting out of the canopy
		local discColors = { "#ff4d6d", "#ffd23f", "#7bd88f", "#4cc9f0", "#b388ff", "#ff9f1c", "#ff70a6" }
		for i, l in { { 20, 18 }, { 95, 30 }, { 170, 12 }, { 240, 26 }, { 310, 14 }, { 60, 58 }, { 205, 62 } } do
			local a, e = math.rad(l[1]), math.rad(l[2])
			local dir = { math.cos(a) * math.cos(e), math.sin(e), math.sin(a) * math.cos(e) }
			local r = 1 / math.sqrt((math.cos(e) / 26) ^ 2 + (math.sin(e) / 17) ^ 2)
			local base = addv({ 0, cy, 0 }, dir, r - 4)
			local rot = tiltRot(l[1], 90 - l[2])
			local mid = addv(base, dir, 6)
			table.insert(out, cyl(1.2, 12, mid[1], mid[2], mid[3], ICING, { rot = rot }))
			local d = if i > 5 then 13 else 15
			lollyDisc(out, addv(base, dir, 12 + d * 0.42), { 90, 90 - l[1], 0 }, d, 2.2, discColors[i], ICING, "Glass")
		end
		return out
	end)(),
})

add({
	uid = 397,
	id = "sweet_shop_counter",
	name = "Sweet Shop Counter",
	rarity = "Uncommon",
	tags = { "furniture", "glass", "candy", "counter", "metal", "colorful" },
	hint = "Everything behind the glass is for sale. Everything.",
	parts = (function()
		local out = {
			rbox(86, 2.4, 36, 0, 1.2, 0, shade(PINK, -0.25), nil, 0.8),
			rbox(84, 12, 34, 0, 8.4, 0, PINK, nil, 1.5),
			box(84.4, 2, 34.4, 0, 13.4, 0, MINT),
			rbox(84, 24, 8, 0, 26.4, -13, PINK, nil, 1.5),
			rbox(8, 24, 34, -38, 26.4, 0, PINK, nil, 1.5),
			rbox(8, 24, 34, 38, 26.4, 0, PINK, nil, 1.5),
			rbox(90, 3, 38, 0, 39.9, 0, "#fff8f0", { mat = "Marble" }, 1),
			box(68, 23, 0.6, 0, 26.4, 16.4, GLASS, { mat = "Glass", t = 0.55 }),
			rbox(70, 2, 2, 0, 37.4, 16.4, GOLD, { mat = "Foil" }, 0.6),
			-- stepped trays behind the glass
			rbox(66, 1, 10, 0, 15.0, 9, ICING, nil, 0.4),
			rbox(66, 6, 10, 0, 18.0, -0.5, shade(PINK, 0.3), nil, 0.6),
			rbox(66, 1, 10, 0, 21.5, -0.5, ICING, nil, 0.4),
		}
		for i = 0, 7 do
			local x = -29 + i * 8
			table.insert(out, blob(4.2, 3.2, 4.2, x, 17.0, 9, SPRINKLES[i % 5 + 1], { mat = "Sand" }))
			table.insert(out, ball(4.0, x + 2, 24.0, -0.5, if i % 2 == 0 then CHOC else "#f3e5c8"))
		end
		-- lollipop decals on the front
		for i = 0, 3 do
			lollyDisc(out, { -27 + i * 18, 7.4, 17.0 }, { 90, 0, 0 }, 7, 0.6, SPRINKLES[i + 1], ICING)
		end
		-- things on the counter top
		candyJar(out, -8, 41.4, -8, 9, 12, "#ff4d6d", 1)
		candyJar(out, 4, 41.4, -8, 8, 10, "#4cc9f0", 2)
		candyJar(out, 15, 41.4, -8, 7, 9, "#7bd88f", 3)
		table.insert(out, lathe({ { 0, 0 }, { 3.2, 0 }, { 3.0, 0.6 }, { 2.6, 3.2 }, { 1.2, 5.0 }, { 0.6, 5.6 }, { 0.5, 6.6 }, { 0, 6.8 } }, 30, 41.4, 6, GOLD, { mat = "Foil" }, { seg = 24, smooth = 2 }))
		table.insert(out, cyl(9, 1.2, -27, 42.0, 2, CHROME, { mat = "Metal" }))
		table.insert(out, cyl(2, 6, -27, 45.6, 2, CHROME, { mat = "Metal" }))
		table.insert(out, lathe({ { 0, 0 }, { 3, 0.4 }, { 6, 2.6 }, { 6.2, 3.0 }, { 0, 1.0 } }, -27, 48.4, 2, CHROME, { mat = "Metal" }, { seg = 28 }))
		table.insert(out, ball(3.2, -28, 51.0, 3, "#ff8fc7"))
		table.insert(out, ball(3.0, -25.6, 51.0, 1.6, "#ffd23f"))
		return out
	end)(),
})

add({
	uid = 398,
	id = "claw_machine",
	name = "Plushie Claw Machine",
	rarity = "Rare",
	tags = { "toy", "machine", "glass", "metal", "electric", "colorful", "game" },
	hint = "Win a gummy bear plush! (Odds unclear.)",
	weight = 1.2,
	parts = (function()
		local purple = "#9b5de5"
		local hot = "#f15bb5"
		local out = {
			rbox(44, 36, 40, 0, 18, 0, purple, nil, 2),
			rbox(40, 4, 10, 0, 37, 17, hot, nil, 1),
			cyl(0.8, 4, -8, 40.5, 17, CHROME, { mat = "Metal" }),
			ball(2.6, -8, 43.2, 17, RED),
			cyl(2.6, 0.8, 4, 39.3, 17, "#ffd23f"),
			cyl(2.6, 0.8, 10, 39.3, 17, "#00bbf9"),
			rbox(12, 10, 0.8, 12, 14, 20.2, "#1f1a2e", nil, 0.3),
			rbox(6, 9, 0.6, -12, 24, 20.2, CHROME, { mat = "Metal" }, 0.3),
			box(0.8, 3, 0.3, -12, 25, 20.6, "#1f1a2e"),
			-- glass case
			box(40, 45, 0.3, 0, 59.5, 19, GLASS, { mat = "Glass", t = 0.65 }),
			box(40, 45, 0.3, 0, 59.5, -19, GLASS, { mat = "Glass", t = 0.65 }),
			box(0.3, 45, 36, -21, 59.5, 0, GLASS, { mat = "Glass", t = 0.65 }),
			box(0.3, 45, 36, 21, 59.5, 0, GLASS, { mat = "Glass", t = 0.65 }),
			ell(38, 6, 34, 0, 37.5, 0, "#ffc8dd", nil, { segU = 24, segV = 10, lump = 0.15, seed = 9 }),
			-- gantry and claw
			box(40, 1.6, 1.6, 0, 80, 17, CHROME, { mat = "Metal" }),
			box(40, 1.6, 1.6, 0, 80, -17, CHROME, { mat = "Metal" }),
			box(1.6, 1.6, 36, 6, 78.4, 0, CHROME, { mat = "Metal" }),
			box(4, 3, 4, 6, 76.2, 2, CHROME, { mat = "Metal" }),
			cyl(0.4, 10, 6, 69.7, 2, "#555566"),
			cyl(3.2, 2.2, 6, 63.6, 2, CHROME, { mat = "Metal" }),
			-- marquee
			rbox(46, 12, 42, 0, 88, 0, purple, nil, 2),
			rbox(36, 7, 0.8, 0, 88, 21.2, "#fee440", nil, 0.4),
			extrude(S.starOutline(5, 2.6, 1.1), 0.6, 0, 88, 22.2, hot, { rot = { -90, 0, 0 } }, { bevel = 0.2 }),
			extrude(S.starOutline(5, 7, 3.2), 3, 0, 101, 1.5, "#fee440", { rot = { -90, 0, 0 }, mat = "Foil" }, { bevel = 0.8 }),
		}
		for _, sx in { -1, 1 } do
			for _, sz in { -1, 1 } do
				table.insert(out, box(2.4, 46, 2.4, sx * 21, 59, sz * 19, hot))
			end
		end
		for k = 0, 2 do
			local b = k / 3 * math.pi * 2
			local c, s = math.cos(b), math.sin(b)
			table.insert(out, tube({ { 6 + c * 1.2, 62.6, 2 + s * 1.2 }, { 6 + c * 3, 59.6, 2 + s * 3 }, { 6 + c * 2, 56.6, 2 + s * 2 } }, 0.45, CHROME, { mat = "Metal" }, { sides = 6, smooth = 2 }))
		end
		for i = -5, 5 do
			table.insert(out, ball(1.6, i * 4, 94.3, 20.6, "#fff3b0", { neon = true }))
			table.insert(out, ball(1.6, i * 4, 81.8, 20.6, if i % 2 == 0 then "#00f5d4" else "#fff3b0", { neon = true }))
		end
		-- prize pile: little gummy bear plushies and bouncy balls
		local bearColors = { "#ff4d6d", "#ffd60a", "#06d6a0", "#3a86ff", "#ff9f1c", "#b388ff" }
		for i = 0, 5 do
			local a = i / 6 * math.pi * 2 + 0.4
			local r = 9 + (i % 2) * 5
			local x, z = math.cos(a) * r, math.sin(a) * r * 0.8
			local c = bearColors[i + 1]
			table.insert(out, ell(5, 5.4, 4, x, 42.4, z, c, { mat = "Fabric" }, { segU = 14, segV = 10 }))
			table.insert(out, ball(4.4, x, 46.6, z, c, { mat = "Fabric" }))
			table.insert(out, ball(1.6, x - 1.6, 48.6, z, c, { mat = "Fabric" }))
			table.insert(out, ball(1.6, x + 1.6, 48.6, z, c, { mat = "Fabric" }))
		end
		for i = 0, 5 do
			local a = i / 6 * math.pi * 2 + 0.9
			table.insert(out, ball(5, math.cos(a) * 5, 41.6, math.sin(a) * 5, SPRINKLES[(i + 2) % 5 + 1], { refl = 0.1 }))
		end
		return out
	end)(),
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
