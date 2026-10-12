--!strict
-- Kitchen Counter prop library. UIDs 100-199 are reserved for this kit and are permanent
-- (they are part of every player's saved Rolledex). Sizes are in studs (1 stud = 1 cm in tier 1).

local S = require(script.Parent.Shapes)
local box, ball, blob, cyl, cylX, wedge, eyes = S.box, S.ball, S.blob, S.cyl, S.cylX, S.wedge, S.eyes
local shade = S.shade

local P = {}
local function add(def: any)
	table.insert(P, def)
end

local CHROME = "#d9dee6"
local STEEL = "#aab3bf"
local WOOD = "#c98d52"
local WOOD_DARK = "#8c5a2e"
local CREAM = "#fff3dc"
local INK = "#2a1f3d"

-- Small reusable bits -------------------------------------------------------------------------

local function stem(x: number, y: number, z: number, h: number, color: string?)
	return cyl(h * 0.28, h, x, y + h / 2, z, color or "#6b4a2b")
end

local function leaf(x: number, y: number, z: number, len: number, yaw: number, color: string?)
	return blob(len * 0.5, len * 0.12, len, x, y, z, color or "#5cbf4a", { rot = { 20, yaw, 0 } })
end

local function critterLegs(out: { any }, w: number, l: number, h: number, d: number, color: string)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			table.insert(out, cyl(d, h, sx * w / 2, h / 2, sz * l / 2, color, { tag = "leg" }))
		end
	end
end

-- TINY ---------------------------------------------------------------------------------------

add({
	uid = 101,
	id = "crumb",
	name = "Toast Crumb",
	rarity = "Common",
	tags = { "food", "bread", "crumb" },
	hint = "Everywhere near the toaster.",
	weight = 3,
	parts = {
		blob(0.7, 0.42, 0.55, 0, 0.21, 0, "#d9a35b"),
		blob(0.36, 0.22, 0.3, 0.14, 0.36, 0.05, "#b97b39"),
	},
})

add({
	uid = 102,
	id = "sesame",
	name = "Sesame Seed",
	rarity = "Common",
	tags = { "food", "seed" },
	hint = "Spilled from the bread basket.",
	weight = 2,
	parts = { blob(0.36, 0.16, 0.24, 0, 0.08, 0, "#f6e7c1") },
})

add({
	uid = 103,
	id = "pea",
	name = "Pea",
	rarity = "Common",
	tags = { "food", "veggie", "green", "round" },
	hint = "Rolled out of a pod near the stove.",
	weight = 2.5,
	parts = {
		ball(0.85, 0, 0.425, 0, "#6cc24a"),
		ball(0.22, 0.18, 0.72, 0.18, "#b6ec8e", { neon = false }),
	},
})

add({
	uid = 104,
	id = "cereal_ring",
	name = "Cereal Ring",
	rarity = "Common",
	tags = { "food", "breakfast", "round" },
	hint = "Breakfast spills on the counter.",
	weight = 3,
	parts = (function()
		local out = {}
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2
			table.insert(out, ball(0.42, math.cos(a) * 0.42, 0.21, math.sin(a) * 0.42, "#e8b456"))
		end
		return out
	end)(),
})

add({
	uid = 105,
	id = "coffee_bean",
	name = "Coffee Bean",
	rarity = "Common",
	tags = { "food", "breakfast", "seed" },
	hint = "Next to the coffee maker.",
	parts = {
		blob(0.7, 0.42, 0.52, 0, 0.21, 0, "#6b3f22"),
		box(0.06, 0.05, 0.42, 0, 0.42, 0, "#3b2312"),
	},
})

add({
	uid = 106,
	id = "sugar_cube",
	name = "Sugar Cube",
	rarity = "Common",
	tags = { "food", "sweet", "cube" },
	hint = "Beside the teapot.",
	parts = {
		box(0.85, 0.85, 0.85, 0, 0.425, 0, "#ffffff", { mat = "Sand" }),
		box(0.6, 0.02, 0.6, 0, 0.86, 0, "#f3f6ff"),
	},
})

add({
	uid = 107,
	id = "blueberry",
	name = "Blueberry",
	rarity = "Common",
	tags = { "food", "fruit", "berry", "round", "blue" },
	hint = "Breakfast bowls overflow with these.",
	weight = 1.5,
	parts = {
		ball(0.95, 0, 0.475, 0, "#4b5fd6"),
		cyl(0.32, 0.08, 0, 0.94, 0, "#2c357f"),
		ball(0.18, -0.2, 0.75, 0.24, "#8fa0ff"),
	},
})

add({
	uid = 108,
	id = "raisin",
	name = "Raisin",
	rarity = "Common",
	tags = { "food", "fruit", "sweet" },
	hint = "Hiding among the cereal.",
	parts = {
		blob(0.72, 0.38, 0.56, 0, 0.19, 0, "#5b2d4a"),
		blob(0.4, 0.2, 0.3, 0.1, 0.32, 0.04, "#7a3f63"),
	},
})

add({
	uid = 109,
	id = "button",
	name = "Sewing Button",
	rarity = "Common",
	tags = { "craft", "round", "red" },
	hint = "Fell out of Nana's sewing tin.",
	parts = {
		cyl(1.25, 0.24, 0, 0.12, 0, "#e84a5f"),
		cyl(1.0, 0.04, 0, 0.25, 0, "#c93349"),
		ball(0.16, -0.17, 0.26, -0.17, "#7a1d2b"),
		ball(0.16, 0.17, 0.26, -0.17, "#7a1d2b"),
		ball(0.16, -0.17, 0.26, 0.17, "#7a1d2b"),
		ball(0.16, 0.17, 0.26, 0.17, "#7a1d2b"),
	},
})

add({
	uid = 110,
	id = "coin",
	name = "Shiny Coin",
	rarity = "Uncommon",
	tags = { "metal", "money", "round", "shiny" },
	hint = "Dropped from a coat pocket.",
	parts = {
		cyl(1.55, 0.16, 0, 0.08, 0, "#e3b341", { mat = "Foil", refl = 0.3 }),
		cyl(1.15, 0.04, 0, 0.17, 0, "#f6d36b", { mat = "Foil" }),
		box(0.18, 0.04, 0.5, 0, 0.2, 0, "#c9952a", { mat = "Foil" }),
	},
})

add({
	uid = 111,
	id = "corn_kernel",
	name = "Corn Kernel",
	rarity = "Common",
	tags = { "food", "veggie", "yellow", "seed" },
	hint = "Popped loose near the stove.",
	parts = {
		blob(0.6, 0.66, 0.42, 0, 0.33, 0, "#ffd23f"),
		blob(0.3, 0.2, 0.2, 0, 0.08, 0, "#fff3c4"),
	},
})

add({
	uid = 112,
	id = "rice",
	name = "Grain of Rice",
	rarity = "Common",
	tags = { "food", "seed" },
	hint = "Spilled from the rice jar.",
	weight = 2,
	parts = { blob(0.26, 0.26, 0.72, 0, 0.13, 0, "#fbf8ef") },
})

add({
	uid = 113,
	id = "mint",
	name = "Breath Mint",
	rarity = "Common",
	tags = { "food", "sweet", "white" },
	hint = "Rattling out of a handbag.",
	parts = { blob(0.62, 0.3, 0.92, 0, 0.15, 0, "#f4fbff") },
})

add({
	uid = 114,
	id = "paperclip",
	name = "Paperclip",
	rarity = "Common",
	tags = { "metal", "office" },
	hint = "Near the fridge's shopping list.",
	parts = {
		box(0.08, 0.08, 1.6, -0.3, 0.04, 0, STEEL, { mat = "Metal" }),
		box(0.08, 0.08, 1.3, 0.3, 0.04, 0.15, STEEL, { mat = "Metal" }),
		box(0.08, 0.08, 1.0, 0, 0.04, -0.05, STEEL, { mat = "Metal" }),
		box(0.68, 0.08, 0.08, 0, 0.04, 0.8, STEEL, { mat = "Metal" }),
		box(0.68, 0.08, 0.08, 0, 0.04, -0.8, STEEL, { mat = "Metal" }),
	},
})

add({
	uid = 115,
	id = "ant",
	name = "Busy Ant",
	rarity = "Common",
	tags = { "animal", "bug", "critter", "scurry" },
	hint = "Marching toward the sugar.",
	weight = 1,
	critter = { speed = 7, flee = 1.4, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			ball(0.5, 0, 0.36, -0.42, "#3a1f1f", { tag = "body" }),
			ball(0.36, 0, 0.36, 0, "#4d2626", { tag = "body" }),
			ball(0.42, 0, 0.42, 0.38, "#3a1f1f", { tag = "head" }),
			box(0.04, 0.3, 0.04, -0.1, 0.7, 0.5, "#3a1f1f", { rot = { -20, 0, -20 } }),
			box(0.04, 0.3, 0.04, 0.1, 0.7, 0.5, "#3a1f1f", { rot = { -20, 0, 20 } }),
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
	uid = 116,
	id = "sprinkle",
	name = "Rainbow Sprinkle",
	rarity = "Common",
	tags = { "food", "sweet", "colorful" },
	hint = "Bounced off a cupcake.",
	weight = 2,
	variants = { "#ff5c8a", "#ffd23f", "#4cc9f0", "#7bd88f", "#b388ff", "#ffffff" },
	parts = { cylX(0.26, 0.8, 0, 0.13, 0, "#ff5c8a", { rot = { 0, 35, 0 } }) },
})

add({
	uid = 117,
	id = "peppercorn",
	name = "Peppercorn",
	rarity = "Common",
	tags = { "food", "spice", "round" },
	hint = "Escaped the pepper mill.",
	parts = {
		ball(0.5, 0, 0.25, 0, "#3b2b26"),
		ball(0.2, 0.08, 0.4, 0.08, "#5a463e"),
	},
})

add({
	uid = 118,
	id = "choc_chip",
	name = "Chocolate Chip",
	rarity = "Common",
	tags = { "food", "sweet", "chocolate" },
	hint = "Fell off a cookie.",
	parts = {
		cyl(0.7, 0.2, 0, 0.1, 0, "#5a3420"),
		cyl(0.46, 0.2, 0, 0.3, 0, "#5a3420"),
		cyl(0.22, 0.2, 0, 0.5, 0, "#6b4029"),
	},
})

-- SMALL ---------------------------------------------------------------------------------------

add({
	uid = 120,
	id = "grape",
	name = "Grape",
	rarity = "Common",
	tags = { "food", "fruit", "round", "purple" },
	hint = "Rolled off the fruit bowl.",
	weight = 1.5,
	parts = {
		blob(1.9, 2.1, 1.9, 0, 1.05, 0, "#8e4fc7"),
		ball(0.5, -0.4, 1.6, 0.5, "#c08cf0"),
		stem(0, 2.0, 0, 0.5, "#6b8b3a"),
	},
})

add({
	uid = 121,
	id = "dice",
	name = "Lucky Die",
	rarity = "Common",
	tags = { "toy", "game", "cube" },
	hint = "Left over from game night.",
	parts = (function()
		local out = { box(2, 2, 2, 0, 1, 0, "#fdfdfd") }
		local pip = function(x, y, z)
			table.insert(out, ball(0.36, x, y, z, "#e63946"))
		end
		pip(0, 2.0, 0)
		pip(-0.5, 2.0, -0.5)
		pip(0.5, 2.0, 0.5)
		pip(-0.5, 2.0, 0.5)
		pip(0.5, 2.0, -0.5)
		pip(-0.45, 1.45, 1.0)
		pip(0.45, 0.55, 1.0)
		pip(1.0, 1.5, -0.5)
		pip(1.0, 1.0, 0)
		pip(1.0, 0.5, 0.5)
		return out
	end)(),
})

add({
	uid = 122,
	id = "bottle_cap",
	name = "Bottle Cap",
	rarity = "Common",
	tags = { "metal", "trash", "round", "red" },
	hint = "Popped off a soda.",
	parts = {
		cyl(2.3, 0.55, 0, 0.275, 0, "#d62839", { mat = "Metal" }),
		cyl(1.8, 0.06, 0, 0.58, 0, "#f2f2f2", { mat = "Metal" }),
		cyl(2.42, 0.2, 0, 0.1, 0, "#a81d2c", { mat = "Metal" }),
	},
})

add({
	uid = 123,
	id = "cherry_tomato",
	name = "Cherry Tomato",
	rarity = "Common",
	tags = { "food", "veggie", "fruit", "round", "red" },
	hint = "Salad night casualties.",
	parts = {
		ball(2.4, 0, 1.2, 0, "#ef3b36"),
		ball(0.6, -0.5, 1.9, 0.6, "#ff8a80"),
		leaf(0.35, 2.38, 0, 0.9, 0),
		leaf(-0.35, 2.38, 0, 0.9, 180),
		leaf(0, 2.38, 0.35, 0.9, 90),
		stem(0, 2.4, 0, 0.45, "#4f8a2b"),
	},
})

add({
	uid = 124,
	id = "strawberry",
	name = "Strawberry",
	rarity = "Common",
	tags = { "food", "fruit", "berry", "red", "sweet" },
	hint = "Dessert prep zone.",
	parts = (function()
		local out = {
			blob(2.2, 2.4, 2.2, 0, 1.3, 0, "#f03a47"),
			blob(1.4, 1.0, 1.4, 0, 0.45, 0, "#e02f3e"),
			leaf(0.4, 2.45, 0, 1.1, 0, "#3fa34d"),
			leaf(-0.4, 2.45, 0, 1.1, 180, "#3fa34d"),
			leaf(0, 2.45, 0.4, 1.1, 90, "#3fa34d"),
			leaf(0, 2.45, -0.4, 1.1, 270, "#3fa34d"),
			stem(0, 2.5, 0, 0.5, "#2f7a38"),
		}
		for i = 0, 9 do
			local a = i * 2.4
			local y = 0.6 + (i % 4) * 0.42
			table.insert(out, ball(0.14, math.cos(a) * 1.02, y, math.sin(a) * 1.02, "#ffe066"))
		end
		return out
	end)(),
})

add({
	uid = 125,
	id = "almond",
	name = "Almond",
	rarity = "Common",
	tags = { "food", "nut", "seed" },
	hint = "From the snack jar.",
	parts = { blob(1.4, 0.9, 2.3, 0, 0.45, 0, "#c48a54"), blob(0.9, 0.3, 1.6, 0, 0.82, 0, "#d9a06a") },
})

add({
	uid = 126,
	id = "cookie",
	name = "Choc Chip Cookie",
	rarity = "Common",
	tags = { "food", "sweet", "round", "baked" },
	hint = "Cooling on the counter.",
	weight = 1.5,
	parts = (function()
		local out = {
			cyl(3.2, 0.6, 0, 0.3, 0, "#d79a4e"),
			cyl(2.9, 0.12, 0, 0.62, 0, "#e3ad62"),
		}
		for i = 0, 6 do
			local a = i * 0.9
			local r = 0.5 + (i % 3) * 0.35
			table.insert(out, ball(0.42, math.cos(a) * r, 0.64, math.sin(a) * r, "#4a2a18"))
		end
		return out
	end)(),
})

add({
	uid = 127,
	id = "cracker",
	name = "Square Cracker",
	rarity = "Common",
	tags = { "food", "baked", "snack" },
	hint = "Snack plate leftovers.",
	parts = (function()
		local out = { box(3, 0.4, 3, 0, 0.2, 0, "#e0a957", { mat = "Sand" }) }
		for x = -1, 1 do
			for z = -1, 1 do
				table.insert(out, cyl(0.18, 0.05, x * 0.9, 0.41, z * 0.9, "#a86d2b"))
			end
		end
		return out
	end)(),
})

add({
	uid = 128,
	id = "marble",
	name = "Glass Marble",
	rarity = "Uncommon",
	tags = { "toy", "glass", "round", "shiny" },
	hint = "Rolled under the toaster.",
	parts = {
		ball(1.8, 0, 0.9, 0, "#7fd3ff", { mat = "Glass", t = 0.25 }),
		blob(1.0, 0.35, 0.6, 0, 0.9, 0, "#ff6fb5", { rot = { 0, 30, 40 }, neon = true }),
	},
})

add({
	uid = 129,
	id = "thimble",
	name = "Thimble",
	rarity = "Common",
	tags = { "metal", "craft" },
	hint = "Nana's sewing tin.",
	parts = {
		cyl(1.8, 1.8, 0, 0.9, 0, STEEL, { mat = "Metal" }),
		cyl(1.55, 0.3, 0, 1.9, 0, STEEL, { mat = "DiamondPlate" }),
		cyl(1.95, 0.25, 0, 0.12, 0, CHROME, { mat = "Metal" }),
	},
})

add({
	uid = 130,
	id = "battery",
	name = "Battery",
	rarity = "Common",
	tags = { "metal", "electric" },
	hint = "From the junk drawer.",
	parts = {
		cylX(1.3, 2.4, -0.25, 0.65, 0, "#2b2d42", { rot = { 0, 90, 0 } }),
		cylX(1.32, 0.9, 0, 0.65, 1.3, "#ffb703", { rot = { 0, 90, 0 } }),
		cylX(0.5, 0.25, 0, 0.65, 1.85, CHROME, { rot = { 0, 90, 0 }, mat = "Metal" }),
	},
})

add({
	uid = 131,
	id = "eraser",
	name = "Pink Eraser",
	rarity = "Common",
	tags = { "office", "pink" },
	hint = "Homework spot on the counter.",
	parts = {
		box(3, 1, 1.6, 0, 0.5, 0, "#ff8fab"),
		box(1.4, 1.06, 1.66, 0.5, 0.5, 0, "#3a86ff"),
	},
})

add({
	uid = 132,
	id = "ladybug",
	name = "Ladybug",
	rarity = "Uncommon",
	tags = { "animal", "bug", "critter", "red", "scurry" },
	hint = "Visits the herb pot.",
	critter = { speed = 6, flee = 1.2, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(1.8, 1.0, 2.0, 0, 0.55, 0, "#e5383b", { tag = "body" }),
			box(0.06, 0.1, 1.9, 0, 1.02, 0, INK),
			ball(0.9, 0, 0.45, 1.05, INK, { tag = "head" }),
			ball(0.36, -0.45, 0.95, -0.2, INK),
			ball(0.36, 0.45, 0.9, 0.3, INK),
			ball(0.3, -0.35, 0.85, 0.5, INK),
			ball(0.3, 0.4, 0.95, -0.5, INK),
		}
		critterLegs(out, 1.3, 1.1, 0.3, 0.12, INK)
		eyes(0.36, 0.26, 0.62, 1.42, out)
		return out
	end)(),
})

add({
	uid = 133,
	id = "olive",
	name = "Stuffed Olive",
	rarity = "Common",
	tags = { "food", "green", "snack" },
	hint = "Party snack plate.",
	parts = {
		blob(1.6, 1.3, 1.9, 0, 0.65, 0, "#7a9a2e"),
		cyl(0.6, 0.2, 0, 0.65, 0.92, "#e63946", { rot = { 90, 0, 0 } }),
	},
})

add({
	uid = 134,
	id = "macaron",
	name = "Macaron",
	rarity = "Uncommon",
	tags = { "food", "sweet", "baked", "pink", "round" },
	hint = "Fancy dessert tray.",
	variants = { "#ff9ecf", "#a5e6ba", "#ffd6a5", "#bdb2ff" },
	parts = {
		cyl(3, 0.9, 0, 0.45, 0, "#ff9ecf"),
		cyl(2.75, 0.45, 0, 1.12, 0, "#fff1f8"),
		cyl(3, 0.9, 0, 1.78, 0, "#ff9ecf"),
		cyl(2.6, 0.1, 0, 2.25, 0, "#ffc2e2"),
	},
})

add({
	uid = 135,
	id = "tea_bag",
	name = "Tea Bag",
	rarity = "Common",
	tags = { "breakfast", "drink" },
	hint = "Beside the kettle.",
	parts = {
		box(2.4, 0.35, 3, 0, 0.18, 0, "#e9d8a6", { mat = "Fabric" }),
		box(0.05, 0.05, 2.6, 0, 0.36, 2.6, "#fffdf6"),
		box(1, 0.08, 1.2, 0, 0.04, 4.2, "#f28482"),
	},
})

add({
	uid = 136,
	id = "crayon",
	name = "Crayon",
	rarity = "Common",
	tags = { "toy", "art", "colorful" },
	hint = "Kids' drawing corner.",
	variants = { "#e63946", "#3a86ff", "#ffbe0b", "#8338ec", "#06d6a0" },
	parts = {
		cylX(0.85, 4.2, 0, 0.425, 0, "#e63946", { rot = { 0, 90, 0 } }),
		cylX(0.88, 2.4, 0, 0.425, -0.3, "#fff3dc", { rot = { 0, 90, 0 } }),
		cylX(0.55, 0.6, 0, 0.425, 2.35, "#e63946", { rot = { 0, 90, 0 } }),
		cylX(0.25, 0.4, 0, 0.425, 2.8, "#e63946", { rot = { 0, 90, 0 } }),
	},
})

add({
	uid = 137,
	id = "toy_brick",
	name = "Toy Brick",
	rarity = "Common",
	tags = { "toy", "plastic", "colorful" },
	hint = "Stepped on, then kicked here.",
	variants = { "#e63946", "#3a86ff", "#ffbe0b", "#06d6a0" },
	parts = (function()
		local out = { box(3.2, 1.9, 1.6, 0, 0.95, 0, "#e63946") }
		for _, x in { -1.2, -0.4, 0.4, 1.2 } do
			for _, z in { -0.4, 0.4 } do
				table.insert(out, cyl(0.5, 0.35, x, 2.07, z, "#e63946"))
			end
		end
		return out
	end)(),
})

add({
	uid = 138,
	id = "egg",
	name = "Egg",
	rarity = "Common",
	tags = { "food", "breakfast", "white", "round" },
	hint = "Carton on the counter.",
	parts = {
		blob(3, 4, 3, 0, 2, 0, "#fff6e6"),
		blob(1.6, 1.4, 1.6, 0, 3.0, 0, "#ffffff"),
	},
})

add({
	uid = 139,
	id = "mushroom",
	name = "Button Mushroom",
	rarity = "Common",
	tags = { "food", "veggie" },
	hint = "Chopping board leftovers.",
	parts = {
		cyl(1.5, 2, 0, 1, 0, "#f3eadb"),
		blob(3.6, 2.0, 3.6, 0, 2.3, 0, "#d9c2a3"),
		blob(3.0, 0.5, 3.0, 0, 1.6, 0, "#a68a6d"),
	},
})

add({
	uid = 140,
	id = "hamster",
	name = "Hammy the Hamster",
	rarity = "Rare",
	tags = { "animal", "critter", "pet", "fluffy", "scurry" },
	hint = "Escaped its cage. Very speedy.",
	critter = { speed = 12, flee = 1.6, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(3.2, 2.6, 4.0, 0, 1.4, 0, "#e9a15d", { tag = "body" }),
			blob(2.4, 1.6, 2.6, 0, 1.1, 0.4, "#fff1dc", { tag = "body" }),
			ball(1.0, -1.0, 2.7, 1.1, "#e9a15d"),
			ball(1.0, 1.0, 2.7, 1.1, "#e9a15d"),
			ball(0.55, -1.0, 2.75, 1.4, "#ffb3c1"),
			ball(0.55, 1.0, 2.75, 1.4, "#ffb3c1"),
			ball(0.42, 0, 1.6, 2.05, "#ff8fab"),
			blob(1.2, 0.8, 0.6, -0.8, 1.3, 1.85, "#ffd6a5"),
			blob(1.2, 0.8, 0.6, 0.8, 1.3, 1.85, "#ffd6a5"),
		}
		critterLegs(out, 1.6, 2.2, 0.4, 0.5, "#ffb3c1")
		eyes(1.0, 0.5, 2.0, 1.85, out)
		return out
	end)(),
})

-- MEDIUM-SMALL --------------------------------------------------------------------------------

add({
	uid = 141,
	id = "lemon",
	name = "Lemon",
	rarity = "Common",
	tags = { "food", "fruit", "yellow", "sour" },
	hint = "Fruit bowl regular.",
	parts = {
		blob(5, 4, 4, 0, 2, 0, "#ffe347"),
		ball(0.8, 2.5, 2, 0, "#ffd60a"),
		ball(0.8, -2.5, 2, 0, "#ffd60a"),
		ball(1.2, -1, 3.1, 0.8, "#fff59d"),
	},
})

add({
	uid = 142,
	id = "lime",
	name = "Lime",
	rarity = "Common",
	tags = { "food", "fruit", "green", "sour" },
	hint = "Fruit bowl regular.",
	parts = {
		blob(4.2, 3.6, 3.6, 0, 1.8, 0, "#6fcf3c"),
		ball(0.6, 2.1, 1.8, 0, "#4caf2a"),
		ball(1, -0.8, 2.8, 0.6, "#a8ef7f"),
	},
})

add({
	uid = 143,
	id = "spoon",
	name = "Teaspoon",
	rarity = "Common",
	tags = { "metal", "utensil", "shiny" },
	hint = "Always one by the sink.",
	parts = {
		box(0.7, 0.3, 7, 0, 0.3, -1.5, CHROME, { mat = "Metal", rot = { -4, 0, 0 } }),
		blob(1.0, 0.35, 1.6, 0, 0.45, -5.2, CHROME, { mat = "Metal" }),
		blob(2.3, 0.7, 3.2, 0, 0.35, 3.3, CHROME, { mat = "Metal" }),
		blob(1.9, 0.3, 2.7, 0, 0.66, 3.3, STEEL, { mat = "Metal" }),
	},
})

add({
	uid = 144,
	id = "fork",
	name = "Fork",
	rarity = "Common",
	tags = { "metal", "utensil", "shiny" },
	hint = "Cutlery drawer escapee.",
	parts = (function()
		local out = {
			box(0.7, 0.3, 7, 0, 0.3, -1.6, CHROME, { mat = "Metal" }),
			box(2.2, 0.32, 1.4, 0, 0.3, 2.4, CHROME, { mat = "Metal" }),
		}
		for _, x in { -0.85, -0.28, 0.28, 0.85 } do
			table.insert(out, box(0.3, 0.3, 2.4, x, 0.3, 4.2, CHROME, { mat = "Metal" }))
		end
		return out
	end)(),
})

add({
	uid = 145,
	id = "salt_shaker",
	name = "Salt Shaker",
	rarity = "Common",
	tags = { "glass", "spice", "white" },
	hint = "Dinner table pair.",
	parts = {
		cyl(3, 4.2, 0, 2.1, 0, "#e8f6ff", { mat = "Glass", t = 0.3 }),
		cyl(2.6, 3.4, 0, 1.8, 0, "#ffffff", { mat = "Sand" }),
		cyl(3.1, 1.3, 0, 4.85, 0, CHROME, { mat = "Metal" }),
		ball(2.4, 0, 5.4, 0, CHROME, { mat = "Metal" }),
	},
})

add({
	uid = 146,
	id = "pepper_shaker",
	name = "Pepper Shaker",
	rarity = "Common",
	tags = { "glass", "spice" },
	hint = "Dinner table pair.",
	parts = {
		cyl(3, 4.2, 0, 2.1, 0, "#e8f6ff", { mat = "Glass", t = 0.3 }),
		cyl(2.6, 3.4, 0, 1.8, 0, "#3d3330", { mat = "Sand" }),
		cyl(3.1, 1.3, 0, 4.85, 0, CHROME, { mat = "Metal" }),
		ball(2.4, 0, 5.4, 0, CHROME, { mat = "Metal" }),
	},
})

add({
	uid = 147,
	id = "rubber_duck",
	name = "Rubber Duck",
	rarity = "Rare",
	tags = { "toy", "duck", "quack", "yellow", "bath" },
	hint = "Wandered in from bath time.",
	parts = (function()
		local out = {
			blob(5, 3.4, 6, 0, 1.7, 0, "#ffd60a", { tag = "body" }),
			blob(2, 1.6, 1.8, 0, 3.2, -2.6, "#ffd60a"),
			ball(3.4, 0, 4.4, 1.6, "#ffd60a", { tag = "head" }),
			blob(1.8, 0.8, 1.6, 0, 4.1, 3.4, "#ff8c1a"),
			blob(1.6, 0.4, 2.6, -2.3, 2.2, 0, "#ffc300", { rot = { 0, 0, -30 } }),
			blob(1.6, 0.4, 2.6, 2.3, 2.2, 0, "#ffc300", { rot = { 0, 0, 30 } }),
		}
		eyes(1.5, 0.7, 4.9, 2.95, out)
		return out
	end)(),
})

add({
	uid = 148,
	id = "cupcake",
	name = "Cupcake",
	rarity = "Common",
	tags = { "food", "sweet", "baked", "dessert" },
	hint = "Party tray by the window.",
	parts = (function()
		local out = {
			cyl(4.2, 3, 0, 1.5, 0, "#ff8fab"),
			cyl(4.6, 0.3, 0, 3.0, 0, "#ff6f91"),
			blob(4.8, 1.6, 4.8, 0, 3.6, 0, "#fff0f6"),
			blob(3.6, 1.4, 3.6, 0, 4.6, 0, "#ffe5ef"),
			blob(2.2, 1.3, 2.2, 0, 5.5, 0, "#fff0f6"),
			ball(1.2, 0, 6.5, 0, "#e5383b"),
			box(0.12, 0.9, 0.12, 0.15, 7.2, 0, "#3f7d20", { rot = { 0, 0, -20 } }),
		}
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			table.insert(out, box(0.3, 2.9, 0.2, math.cos(a) * 2.08, 1.5, math.sin(a) * 2.08, "#ff6f91", { rot = { 0, -math.deg(a), 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 149,
	id = "donut",
	name = "Sprinkle Donut",
	rarity = "Common",
	tags = { "food", "sweet", "baked", "round", "dessert" },
	hint = "Box of a dozen by the coffee.",
	parts = (function()
		local out = {}
		local colors = { "#ff5c8a", "#ffd23f", "#4cc9f0", "#7bd88f", "#ffffff" }
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			table.insert(out, ball(2.6, math.cos(a) * 2.2, 1.2, math.sin(a) * 2.2, "#e0a157"))
			table.insert(out, blob(2.4, 0.8, 2.4, math.cos(a) * 2.2, 2.1, math.sin(a) * 2.2, "#ff8fc7"))
			table.insert(out, cylX(0.22, 0.6, math.cos(a + 0.3) * 2.3, 2.55, math.sin(a + 0.3) * 2.3, colors[i % 5 + 1], { rot = { 0, i * 47, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 150,
	id = "apple",
	name = "Red Apple",
	rarity = "Common",
	tags = { "food", "fruit", "round", "red" },
	hint = "Fruit bowl regular.",
	weight = 1.4,
	parts = {
		blob(6, 5.6, 6, 0, 2.8, 0, "#e5383b"),
		ball(1.6, -1.3, 4.0, 1.2, "#ff6b6b"),
		cyl(1.2, 0.4, 0, 5.5, 0, "#b5232a"),
		stem(0, 5.5, 0, 1.4),
		leaf(0.9, 6.2, 0, 2.2, 90, "#57b947"),
	},
})

add({
	uid = 151,
	id = "orange",
	name = "Orange",
	rarity = "Common",
	tags = { "food", "fruit", "round", "orange" },
	hint = "Fruit bowl regular.",
	parts = {
		ball(6, 0, 3, 0, "#ff9f1c", { mat = "Sand" }),
		ball(1.6, -1.2, 4.4, 1.2, "#ffbf69"),
		cyl(0.8, 0.3, 0, 6, 0, "#6a8d2f"),
		leaf(0.8, 6.1, 0, 2, 90, "#57b947"),
	},
})

add({
	uid = 152,
	id = "toy_car",
	name = "Toy Race Car",
	rarity = "Uncommon",
	tags = { "toy", "vehicle", "red", "wheels" },
	hint = "Zoomed off the play mat.",
	parts = {
		box(3.6, 1.3, 8, 0, 1.4, 0, "#ef233c"),
		box(3, 1.3, 3.4, 0, 2.7, -0.6, "#ef233c"),
		box(3.05, 1.0, 3.0, 0, 2.7, -0.6, "#a2d2ff", { mat = "Glass", t = 0.2 }),
		box(3.8, 0.3, 1.2, 0, 2.2, -3.8, "#2b2d42"),
		box(1.0, 0.25, 8.05, 0, 2.06, 0, "#ffffff"),
		cylX(2, 0.8, -1.9, 1, 2.6, "#2b2d42"),
		cylX(2, 0.8, 1.9, 1, 2.6, "#2b2d42"),
		cylX(2, 0.8, -1.9, 1, -2.6, "#2b2d42"),
		cylX(2, 0.8, 1.9, 1, -2.6, "#2b2d42"),
		cylX(0.9, 0.85, -1.9, 1, 2.6, CHROME, { mat = "Metal" }),
		cylX(0.9, 0.85, 1.9, 1, 2.6, CHROME, { mat = "Metal" }),
		cylX(0.9, 0.85, -1.9, 1, -2.6, CHROME, { mat = "Metal" }),
		cylX(0.9, 0.85, 1.9, 1, -2.6, CHROME, { mat = "Metal" }),
		box(0.7, 0.4, 0.2, -1.2, 1.5, 4.0, "#fff3b0", { neon = true }),
		box(0.7, 0.4, 0.2, 1.2, 1.5, 4.0, "#fff3b0", { neon = true }),
	},
})

add({
	uid = 153,
	id = "tomato",
	name = "Tomato",
	rarity = "Common",
	tags = { "food", "veggie", "fruit", "round", "red" },
	hint = "Waiting for the salad.",
	parts = {
		blob(7, 6, 7, 0, 3, 0, "#e63946"),
		ball(1.8, -1.6, 4.4, 1.4, "#ff7b7b"),
		leaf(0.9, 6.0, 0, 2.2, 0, "#3fa34d"),
		leaf(-0.9, 6.0, 0, 2.2, 180, "#3fa34d"),
		leaf(0, 6.0, 0.9, 2.2, 90, "#3fa34d"),
		leaf(0, 6.0, -0.9, 2.2, 270, "#3fa34d"),
		stem(0, 6, 0, 0.9, "#2f7a38"),
	},
})

add({
	uid = 154,
	id = "croissant",
	name = "Croissant",
	rarity = "Uncommon",
	tags = { "food", "baked", "breakfast", "bread" },
	hint = "Fresh from the bakery bag.",
	parts = (function()
		local out = {}
		for i = -3, 3 do
			local a = i * 0.32
			local r = 4.2
			local size = 3.4 - math.abs(i) * 0.4
			table.insert(out, blob(size, size * 0.8, size * 0.9, math.sin(a) * r, size * 0.4, math.cos(a) * r - r + 1, if i % 2 == 0 then "#e0a04a" else "#c97d2e"))
		end
		return out
	end)(),
})

add({
	uid = 155,
	id = "candle",
	name = "Birthday Candle",
	rarity = "Common",
	tags = { "party", "fire", "colorful" },
	hint = "Left over from a cake.",
	parts = {
		cyl(0.9, 5, 0, 2.5, 0, "#7bdff2"),
		cyl(0.95, 0.3, 0, 1, 0, "#ff99c8"),
		cyl(0.95, 0.3, 0, 2.5, 0, "#ff99c8"),
		cyl(0.95, 0.3, 0, 4, 0, "#ff99c8"),
		cyl(0.12, 0.5, 0, 5.25, 0, INK),
		blob(0.6, 1.1, 0.6, 0, 6, 0, "#ffd166", { neon = true }),
	},
})

add({
	uid = 156,
	id = "snow_globe",
	name = "Snow Globe",
	rarity = "Rare",
	tags = { "glass", "decor", "winter", "shiny" },
	hint = "On the windowsill.",
	parts = {
		cyl(5.6, 1.6, 0, 0.8, 0, WOOD_DARK, { mat = "Wood" }),
		cyl(5.0, 0.4, 0, 1.75, 0, "#ffd166", { mat = "Foil" }),
		box(1.6, 1.4, 1.4, 0, 2.6, 0, "#e76f51"),
		wedge(1.8, 0.9, 1.6, 0, 3.75, 0, "#264653"),
		ball(6.4, 0, 4.6, 0, "#dff6ff", { mat = "Glass", t = 0.6 }),
		ball(0.3, -1.2, 5.6, 1, "#ffffff", { neon = true }),
		ball(0.25, 1.4, 6.2, -0.6, "#ffffff", { neon = true }),
		ball(0.25, 0.4, 6.8, 1.2, "#ffffff", { neon = true }),
	},
})

add({
	uid = 157,
	id = "lucky_cat",
	name = "Lucky Cat",
	rarity = "Epic",
	tags = { "decor", "cat", "lucky", "shiny" },
	hint = "Waves from the top of the microwave.",
	parts = (function()
		local out = {
			blob(6, 6.4, 5, 0, 3.2, 0, "#fffaf0", { tag = "body" }),
			ball(5.4, 0, 7.6, 0.3, "#fffaf0", { tag = "head" }),
			wedge(1.4, 1.6, 1, -1.6, 10.4, 0, "#fffaf0"),
			wedge(1.4, 1.6, 1, 1.6, 10.4, 0, "#fffaf0"),
			wedge(0.8, 1, 0.4, -1.6, 10.3, 0.4, "#ffb3c1"),
			wedge(0.8, 1, 0.4, 1.6, 10.3, 0.4, "#ffb3c1"),
			blob(5.4, 0.8, 4.6, 0, 5.2, 0.3, "#e63946"),
			ball(1.2, 0, 4.8, 2.5, "#ffd166", { mat = "Foil" }),
			blob(1.4, 3.4, 1.4, 2.6, 7.8, 1.2, "#fffaf0", { rot = { 0, 0, -10 }, tag = "accent" }),
			ball(1.5, 2.9, 9.6, 1.3, "#fffaf0"),
			cyl(3, 0.4, -0.8, 3.2, 2.6, "#ffd166", { rot = { 90, 0, 0 }, mat = "Foil" }),
			ball(0.6, 0, 7.2, 2.95, "#ff8fab"),
		}
		eyes(1.8, 0.8, 8.2, 2.65, out)
		return out
	end)(),
})

add({
	uid = 158,
	id = "teacup",
	name = "Teacup & Saucer",
	rarity = "Uncommon",
	tags = { "kitchenware", "drink", "breakfast" },
	hint = "Nana's favourite set.",
	parts = {
		cyl(8, 0.6, 0, 0.3, 0, "#fefae0"),
		cyl(7, 0.2, 0, 0.7, 0, "#90e0ef"),
		cyl(4, 1, 0, 1.1, 0, "#fefae0"),
		cyl(5.6, 3.2, 0, 2.9, 0, "#fefae0"),
		cyl(5.0, 0.3, 0, 4.45, 0, "#9c6644"),
		cyl(5.8, 0.4, 0, 4.4, 0, "#90e0ef"),
		box(0.6, 2, 1.6, 3.2, 3.0, 0, "#fefae0"),
	},
})

add({
	uid = 159,
	id = "mug",
	name = "Coffee Mug",
	rarity = "Common",
	tags = { "kitchenware", "drink", "breakfast" },
	hint = "Coffee corner.",
	variants = { "#4cc9f0", "#f72585", "#ffbe0b", "#7bd88f" },
	parts = {
		cyl(7, 8, 0, 4, 0, "#4cc9f0"),
		cyl(6.2, 0.3, 0, 7.9, 0, "#6f4518"),
		cyl(7.2, 0.6, 0, 0.3, 0, shade("#4cc9f0", -0.2)),
		box(1, 1, 3.2, 0, 6, 4, "#4cc9f0", { rot = { 0, 90, 0 } }),
		box(1, 1, 3.2, 0, 2.4, 4, "#4cc9f0", { rot = { 0, 90, 0 } }),
		box(1, 4.6, 1, 0, 4.2, 5.2, "#4cc9f0"),
		box(2.4, 2.4, 0.2, 0, 4.4, -3.55, "#ffffff"),
	},
})

-- MEDIUM ---------------------------------------------------------------------------------------

add({
	uid = 160,
	id = "banana",
	name = "Banana",
	rarity = "Common",
	tags = { "food", "fruit", "yellow" },
	hint = "Hanging out by the fruit bowl.",
	parts = (function()
		local out = {}
		for i = -4, 4 do
			local a = i * 0.16
			local r = 12
			local size = 3.4 - math.abs(i) * 0.18
			table.insert(out, blob(size, size * 0.9, 2.4, math.sin(a) * r, size * 0.45 + (1 - math.cos(a)) * r * 0.25, math.cos(a) * r - r, "#ffe066", { rot = { 0, math.deg(a), 0 } }))
		end
		table.insert(out, cyl(0.8, 1.4, math.sin(0.72) * 12, 2.8, math.cos(0.72) * 12 - 12, "#6b4a2b", { rot = { 0, 0, 60 } }))
		table.insert(out, ball(0.8, math.sin(-0.72) * 12, 2.2, math.cos(-0.72) * 12 - 12, "#3d2b1f"))
		return out
	end)(),
})

add({
	uid = 161,
	id = "carrot",
	name = "Carrot",
	rarity = "Common",
	tags = { "food", "veggie", "orange" },
	hint = "Chopping board pile.",
	parts = (function()
		local out = {}
		for i = 0, 5 do
			local d = 3.6 - i * 0.55
			table.insert(out, cylX(d, 2.2, 0, 1.8, -5 + i * 2, "#ff8c1a", { rot = { 0, 90, 0 } }))
		end
		table.insert(out, leaf(0, 2.4, 6.4, 3.2, 0, "#4caf50"))
		table.insert(out, leaf(0.6, 2.8, 6.2, 2.8, 30, "#66bb6a"))
		table.insert(out, leaf(-0.6, 2.8, 6.2, 2.8, -30, "#43a047"))
		return out
	end)(),
})

add({
	uid = 162,
	id = "bread_loaf",
	name = "Bread Loaf",
	rarity = "Common",
	tags = { "food", "bread", "baked", "breakfast" },
	hint = "By the bread box.",
	parts = {
		box(9, 6, 16, 0, 3, 0, "#d4934a"),
		blob(9.6, 5, 16.4, 0, 6, 0, "#c47f35"),
		box(0.4, 0.5, 2.4, 0, 8.4, -4, "#f3d29a", { rot = { 0, 30, 0 } }),
		box(0.4, 0.5, 2.4, 0, 8.4, 0, "#f3d29a", { rot = { 0, 30, 0 } }),
		box(0.4, 0.5, 2.4, 0, 8.4, 4, "#f3d29a", { rot = { 0, 30, 0 } }),
	},
})

add({
	uid = 163,
	id = "cereal_box",
	name = "Cereal Box",
	rarity = "Common",
	tags = { "food", "breakfast", "box" },
	hint = "Breakfast spill central.",
	variants = { "#ff595e", "#ffca3a", "#1982c4", "#8ac926" },
	parts = {
		box(14, 20, 5, 0, 10, 0, "#ff595e"),
		box(13.8, 2, 5.05, 0, 19, 0, "#ffffff"),
		cyl(8, 0.2, 0, 10, 2.55, "#ffca3a", { rot = { 90, 0, 0 } }),
		cyl(5, 0.25, 0, 10, 2.62, "#ffffff", { rot = { 90, 0, 0 } }),
		ball(1.4, -1, 10.6, 2.7, "#e8b456"),
		ball(1.4, 1.2, 9.4, 2.7, "#e8b456"),
		box(10, 1.4, 0.2, 0, 15.8, 2.55, "#1d3557"),
	},
})

add({
	uid = 164,
	id = "milk_carton",
	name = "Milk Carton",
	rarity = "Common",
	tags = { "food", "drink", "breakfast", "box" },
	hint = "Just out of the fridge.",
	parts = {
		box(9, 16, 9, 0, 8, 0, "#ffffff"),
		box(9.05, 7, 9.05, 0, 7, 0, "#4cc9f0"),
		wedge(9, 4, 4.5, 0, 18, 2.25, "#ffffff"),
		wedge(9, 4, 4.5, 0, 18, -2.25, "#ffffff", { rot = { 0, 180, 0 } }),
		box(9, 1.6, 0.6, 0, 20.6, 0, "#ffffff"),
		cyl(2, 1, 2, 18.8, 2.2, "#ff595e", { rot = { 30, 0, 0 } }),
		blob(3.6, 2.4, 0.2, 0, 8, 4.55, "#ffffff"),
	},
})

add({
	uid = 165,
	id = "jam_jar",
	name = "Strawberry Jam",
	rarity = "Common",
	tags = { "food", "sweet", "glass", "breakfast", "red" },
	hint = "Toast's best friend.",
	parts = {
		cyl(8, 10, 0, 5, 0, "#ffe5ec", { mat = "Glass", t = 0.45 }),
		cyl(7.2, 8, 0, 4.4, 0, "#d00000"),
		cyl(8.4, 1.6, 0, 10.8, 0, "#ffffff", { mat = "Fabric" }),
		cyl(9.6, 0.5, 0, 11.4, 0, "#ff8fa3", { mat = "Fabric" }),
		box(5, 3.4, 0.2, 0, 5, 4.05, "#fff3dc"),
		ball(1.6, 0, 5.2, 4.1, "#e5383b"),
	},
})

add({
	uid = 166,
	id = "rolling_pin",
	name = "Rolling Pin",
	rarity = "Common",
	tags = { "kitchenware", "wood", "baking" },
	hint = "Dusted with flour, near the cookies.",
	parts = {
		cylX(5, 18, 0, 2.5, 0, "#e9c46a", { mat = "Wood" }),
		cylX(1.6, 4, -11, 2.5, 0, WOOD_DARK, { mat = "Wood" }),
		cylX(1.6, 4, 11, 2.5, 0, WOOD_DARK, { mat = "Wood" }),
		cylX(2.2, 1.6, -13.4, 2.5, 0, WOOD, { mat = "Wood" }),
		cylX(2.2, 1.6, 13.4, 2.5, 0, WOOD, { mat = "Wood" }),
	},
})

add({
	uid = 167,
	id = "whisk",
	name = "Whisk",
	rarity = "Common",
	tags = { "kitchenware", "metal", "baking" },
	hint = "Baking corner.",
	parts = (function()
		local out = {
			cylX(1.6, 8, 0, 1.6, -6, "#ef476f", { rot = { 0, 90, 0 } }),
			cylX(1.8, 0.8, 0, 1.6, -1.8, CHROME, { rot = { 0, 90, 0 }, mat = "Metal" }),
		}
		for i = 0, 3 do
			table.insert(out, blob(0.3, 3.2, 8, 0, 1.6, 2.6, CHROME, { rot = { 0, 0, i * 45 }, mat = "Metal" }))
		end
		return out
	end)(),
})

add({
	uid = 168,
	id = "teapot",
	name = "Teapot",
	rarity = "Uncommon",
	tags = { "kitchenware", "drink", "round" },
	hint = "Steaming by the stove.",
	parts = {
		blob(12, 10, 12, 0, 5.6, 0, "#90be6d"),
		cyl(9, 1, 0, 0.5, 0, shade("#90be6d", -0.2)),
		blob(7, 2, 7, 0, 10.4, 0, "#90be6d"),
		ball(2, 0, 11.8, 0, "#f9c74f"),
		cylX(2.2, 6, 7, 7, 0, "#90be6d", { rot = { 0, 0, 40 } }),
		blob(1.4, 6, 1.6, -6.6, 6, 0, shade("#90be6d", -0.15), { rot = { 0, 0, -10 } }),
		box(10.2, 1, 10.2, 0, 7.4, 0, "#f9c74f", { rot = { 0, 45, 0 }, t = 1 }),
		blob(12.2, 1, 12.2, 0, 7.4, 0, "#f9844a"),
	},
})

add({
	uid = 169,
	id = "star_teapot",
	name = "Nana's Star Teapot",
	rarity = "Legendary",
	tags = { "kitchenware", "magic", "star", "shiny" },
	hint = "Nana Nova's own. Only shows up on very lucky days.",
	weight = 0.6,
	parts = {
		blob(12, 10, 12, 0, 5.6, 0, "#5a4fcf", { mat = "Glass" }),
		blob(12.2, 1.2, 12.2, 0, 7.0, 0, "#ffd166", { mat = "Foil" }),
		cyl(9, 1, 0, 0.5, 0, "#3c2f9c"),
		blob(7, 2, 7, 0, 10.4, 0, "#5a4fcf", { mat = "Glass" }),
		ball(2.4, 0, 12, 0, "#fff3b0", { neon = true }),
		cylX(2.2, 6, 7, 7, 0, "#5a4fcf", { rot = { 0, 0, 40 }, mat = "Glass" }),
		blob(1.4, 6, 1.6, -6.6, 6, 0, "#ffd166", { rot = { 0, 0, -10 }, mat = "Foil" }),
		ball(0.8, 3, 4, 5.4, "#fff3b0", { neon = true }),
		ball(0.6, -3.2, 6.2, 5.2, "#fff3b0", { neon = true }),
		ball(0.7, 4.8, 6.6, -3, "#fff3b0", { neon = true }),
		ball(0.5, -4, 3.4, -4.2, "#fff3b0", { neon = true }),
	},
})

add({
	uid = 170,
	id = "moon_mouse",
	name = "Moonbeam Mouse",
	rarity = "Legendary",
	tags = { "animal", "critter", "magic", "scurry", "glow" },
	hint = "A glowing mouse seen only once in a blue moon.",
	weight = 0.3,
	critter = { speed = 16, flee = 2.2, style = "scurry", sound = "NewDiscovery" },
	parts = (function()
		local out = {
			blob(3, 2.6, 4.4, 0, 1.4, 0, "#cfd8ff", { tag = "body", mat = "Glass" }),
			ball(2.4, 0, 2.2, 2.4, "#cfd8ff", { tag = "head", mat = "Glass" }),
			cyl(1.8, 0.3, -1.1, 3.4, 2.2, "#e9ecff", { rot = { 90, 0, 0 } }),
			cyl(1.8, 0.3, 1.1, 3.4, 2.2, "#e9ecff", { rot = { 90, 0, 0 } }),
			cyl(1.1, 0.35, -1.1, 3.4, 2.3, "#ffc8dd", { rot = { 90, 0, 0 } }),
			cyl(1.1, 0.35, 1.1, 3.4, 2.3, "#ffc8dd", { rot = { 90, 0, 0 } }),
			ball(0.5, 0, 2.1, 3.65, "#ff8fab"),
			blob(0.3, 0.3, 4, 0, 1.4, -4, "#a5b4ff", { tag = "tail", neon = true }),
			ball(0.8, 0, 4.2, 0, "#fff3b0", { neon = true }),
		}
		critterLegs(out, 1.6, 2.4, 0.4, 0.4, "#ffc8dd")
		eyes(0.9, 0.5, 2.5, 3.4, out)
		return out
	end)(),
})

add({
	uid = 171,
	id = "dinner_plate",
	name = "Dinner Plate",
	rarity = "Common",
	tags = { "kitchenware", "round", "white" },
	hint = "Stacked by the sink.",
	parts = {
		cyl(18, 0.6, 0, 0.6, 0, "#fefae0"),
		cyl(13, 0.4, 0, 0.25, 0, "#f1ead0"),
		cyl(18.2, 0.3, 0, 0.95, 0, "#4cc9f0"),
		cyl(17.2, 0.32, 0, 0.96, 0, "#fefae0"),
	},
})

add({
	uid = 172,
	id = "cereal_bowl",
	name = "Cereal Bowl",
	rarity = "Common",
	tags = { "kitchenware", "breakfast", "food" },
	hint = "Half-finished breakfast.",
	parts = (function()
		local out = {
			cyl(7, 1, 0, 0.5, 0, "#ff99c8"),
			cyl(10, 2, 0, 2, 0, "#ff99c8"),
			cyl(13, 2.4, 0, 4.2, 0, "#ff99c8"),
			cyl(12.2, 0.4, 0, 5.3, 0, "#fffdf6"),
		}
		for i = 0, 9 do
			local a = i * 1.7
			local r = 1.5 + (i % 3) * 1.6
			table.insert(out, cyl(1.4, 0.5, math.cos(a) * r, 5.6, math.sin(a) * r, "#e8b456"))
		end
		table.insert(out, box(0.9, 0.4, 9, 3, 6.6, 1, CHROME, { rot = { 20, 30, 0 }, mat = "Metal" }))
		return out
	end)(),
})

add({
	uid = 173,
	id = "pie",
	name = "Grandma's Cherry Pie",
	rarity = "Epic",
	tags = { "food", "sweet", "baked", "dessert", "red" },
	hint = "Cooling on the windowsill. Smells amazing.",
	parts = (function()
		local out = {
			cyl(16, 2, 0, 1, 0, "#c0c7d1", { mat = "Metal" }),
			cyl(15.4, 1.2, 0, 2.4, 0, "#b5121b"),
			cyl(16.6, 1, 0, 2.6, 0, "#d9963f"),
			cyl(14.6, 1.04, 0, 2.62, 0, "#b5121b"),
		}
		for i = -2, 2 do
			table.insert(out, box(1.4, 0.5, 14, i * 2.8, 3.2, 0, "#e3a857"))
			table.insert(out, box(14, 0.5, 1.4, 0, 3.4, i * 2.8, "#e3a857"))
		end
		table.insert(out, blob(2.4, 4, 2.4, 1, 6, 0, "#ffffff", { t = 0.6 }))
		return out
	end)(),
})

add({
	uid = 174,
	id = "cuckoo_clock",
	name = "Cuckoo Clock",
	rarity = "Epic",
	tags = { "decor", "wood", "bird", "time" },
	hint = "Fell off the wall. Still cuckooing.",
	parts = {
		box(12, 12, 6, 0, 6, 0, WOOD, { mat = "Wood" }),
		wedge(14, 5, 3.6, 0, 14.5, 1.8, WOOD_DARK, { mat = "Wood" }),
		wedge(14, 5, 3.6, 0, 14.5, -1.8, WOOD_DARK, { rot = { 0, 180, 0 }, mat = "Wood" }),
		cyl(8, 0.6, 0, 5.6, 3.2, CREAM, { rot = { 90, 0, 0 } }),
		box(0.5, 3, 0.3, 0, 6.8, 3.6, INK),
		box(2.4, 0.5, 0.3, 0.9, 5.6, 3.6, INK),
		box(3, 2.4, 0.6, 0, 11, 3.1, "#3d2b1f"),
		ball(1.8, 0, 11.2, 3.8, "#ffd166", { tag = "accent" }),
		wedge(0.8, 0.6, 0.8, 0, 11.2, 4.8, "#ff8c1a"),
		box(0.3, 6, 0.3, -2, -1, 0, "#ffd166", { mat = "Foil" }),
		box(0.3, 6, 0.3, 2, -1, 0, "#ffd166", { mat = "Foil" }),
	},
	-- Hangs a little off the ground; origin offset fixed by builder via metrics.minY.
})

add({
	uid = 175,
	id = "kettle",
	name = "Kettle",
	rarity = "Common",
	tags = { "kitchenware", "metal", "electric", "drink" },
	hint = "Next to the tea things.",
	parts = {
		cyl(14, 16, 0, 8, 0, "#e76f51"),
		cyl(14.4, 1.2, 0, 0.6, 0, "#2b2d42"),
		blob(11, 4, 11, 0, 16, 0, "#e76f51"),
		cyl(3, 1, 0, 18.2, 0, "#2b2d42"),
		box(2, 2, 8, 0, 19, -4, "#2b2d42", { rot = { -15, 0, 0 } }),
		box(2, 10, 2, 0, 13, -7.6, "#2b2d42"),
		cylX(2.6, 7, 0, 12, 9.4, "#e76f51", { rot = { 0, 90, -35 } }),
		box(3, 4, 0.3, 4, 8, 6.9, "#a2d2ff", { mat = "Glass", t = 0.3 }),
	},
})

add({
	uid = 176,
	id = "toaster",
	name = "Toaster",
	rarity = "Common",
	tags = { "kitchenware", "metal", "electric", "breakfast", "shiny" },
	hint = "The breakfast corner's centrepiece.",
	parts = {
		box(20, 15, 12, 0, 8, 0, CHROME, { mat = "Metal", refl = 0.2 }),
		blob(20, 4, 12, 0, 15.4, 0, CHROME, { mat = "Metal" }),
		box(20.4, 1.2, 12.4, 0, 0.6, 0, "#2b2d42"),
		box(14, 0.4, 2.2, 0, 17.4, -2.4, "#1b1b1b"),
		box(14, 0.4, 2.2, 0, 17.4, 2.4, "#1b1b1b"),
		box(12, 6, 1.6, 0, 19.6, -2.4, "#e0a157"),
		box(11.6, 5.6, 1.7, 0, 19.6, -2.4, "#f3d29a"),
		box(1.4, 2, 3, 10.8, 10, 0, "#2b2d42"),
		cyl(2, 0.6, 0, 6, 6.2, "#ff595e", { rot = { 90, 0, 0 } }),
	},
})

add({
	uid = 177,
	id = "blender",
	name = "Smoothie Blender",
	rarity = "Uncommon",
	tags = { "kitchenware", "electric", "glass", "drink" },
	hint = "Smoothie station.",
	parts = {
		box(12, 9, 12, 0, 4.5, 0, "#2b2d42"),
		cyl(2, 0.6, 0, 4, 6.2, "#06d6a0", { rot = { 90, 0, 0 } }),
		cyl(10, 2, 0, 10, 0, "#3d405b"),
		cyl(10, 16, 0, 19, 0, "#e0fbfc", { mat = "Glass", t = 0.55 }),
		cyl(9, 9, 0, 15.5, 0, "#ff70a6"),
		blob(3, 2, 3, 1.5, 20.6, 1, "#ffd166"),
		cyl(10.6, 1.8, 0, 27.9, 0, "#3d405b"),
		box(1.4, 8, 1.4, 6.2, 19, 0, "#3d405b"),
	},
})

add({
	uid = 178,
	id = "coffee_maker",
	name = "Coffee Maker",
	rarity = "Common",
	tags = { "kitchenware", "electric", "drink", "breakfast" },
	hint = "The coffee corner.",
	parts = {
		box(16, 4, 16, 0, 2, 0, "#2b2d42"),
		box(16, 26, 6, 0, 13, -5, "#2b2d42"),
		box(16, 6, 16, 0, 27, 0, "#2b2d42"),
		cyl(10, 10, 0, 9, 2, "#e0fbfc", { mat = "Glass", t = 0.5 }),
		cyl(9.4, 5, 0, 6.5, 2, "#6f4518"),
		box(2, 5, 2, 0, 9, 8, "#2b2d42"),
		cyl(1.4, 0.5, 5, 26, 8.1, "#ef233c", { rot = { 90, 0, 0 }, neon = true }),
	},
})

add({
	uid = 179,
	id = "cookie_jar",
	name = "Cookie Jar",
	rarity = "Uncommon",
	tags = { "kitchenware", "glass", "sweet", "food" },
	hint = "Top shelf... usually.",
	parts = (function()
		local out = {
			cyl(14, 16, 0, 8, 0, "#e3f2fd", { mat = "Glass", t = 0.55 }),
			cyl(15, 3, 0, 17, 0, "#ff8fab"),
			ball(3.4, 0, 19.4, 0, "#ff8fab"),
		}
		for i = 0, 7 do
			local a = i * 1.3
			table.insert(out, cyl(5, 1, math.cos(a) * 3, 2 + i * 1.6, math.sin(a) * 3, "#d79a4e", { rot = { 20 * math.sin(i), i * 40, 70 } }))
		end
		return out
	end)(),
})

add({
	uid = 180,
	id = "frying_pan",
	name = "Frying Pan",
	rarity = "Common",
	tags = { "kitchenware", "metal" },
	hint = "On the stove, mid-pancake.",
	parts = {
		cyl(22, 1, 0, 0.5, 0, "#2b2d42"),
		cyl(24, 3, 0, 1.8, 0, "#3d405b"),
		cyl(21.6, 0.2, 0, 1.1, 0, "#1b1b1b"),
		box(2.4, 1.6, 16, 0, 2.4, -19, "#8c5a2e", { mat = "Wood" }),
		cyl(10, 1.2, 0, 1.6, 0, "#f6bd60"),
		cyl(8, 0.3, 0, 2.3, 0, "#e09f3e"),
	},
})

add({
	uid = 181,
	id = "stock_pot",
	name = "Stock Pot",
	rarity = "Common",
	tags = { "kitchenware", "metal" },
	hint = "Soup's on.",
	parts = {
		cyl(22, 18, 0, 9, 0, STEEL, { mat = "Metal" }),
		cyl(22.6, 1.2, 0, 18, 0, CHROME, { mat = "Metal" }),
		blob(21, 3, 21, 0, 19.2, 0, CHROME, { mat = "Metal" }),
		ball(3, 0, 21.2, 0, "#2b2d42"),
		box(5, 1.6, 2, 12.4, 14, 0, "#2b2d42"),
		box(5, 1.6, 2, -12.4, 14, 0, "#2b2d42"),
	},
})

add({
	uid = 182,
	id = "fruit_bowl",
	name = "Fruit Bowl",
	rarity = "Uncommon",
	tags = { "kitchenware", "food", "fruit", "wood" },
	hint = "Centre of the counter.",
	parts = {
		cyl(14, 2, 0, 1, 0, WOOD_DARK, { mat = "Wood" }),
		cyl(24, 4, 0, 4, 0, WOOD, { mat = "Wood" }),
		cyl(28, 3, 0, 7.4, 0, WOOD, { mat = "Wood" }),
		ball(8, -5, 10, 0, "#e5383b"),
		ball(8, 4, 10, 3, "#ff9f1c"),
		blob(9, 7, 7, 2, 10, -5, "#ffe347"),
		blob(14, 4, 4, -1, 14, 1, "#ffe066", { rot = { 0, 30, 15 } }),
		ball(4, 7, 13, -2, "#8e4fc7"),
		ball(4, 8, 12.6, -0.5, "#8e4fc7"),
	},
})

add({
	uid = 183,
	id = "stand_mixer",
	name = "Stand Mixer",
	rarity = "Rare",
	tags = { "kitchenware", "electric", "baking", "shiny" },
	hint = "Baking corner. Very proud of itself.",
	parts = {
		box(14, 3, 24, 0, 1.5, 0, "#ff6f91"),
		box(8, 22, 8, 0, 14, -8, "#ff6f91"),
		blob(12, 10, 26, 0, 27, 0, "#ff6f91"),
		cyl(16, 12, 0, 9, 4, CHROME, { mat = "Metal" }),
		cyl(3, 7, 0, 18.5, 6, CHROME, { mat = "Metal" }),
		blob(3, 6, 3, 0, 13, 6, CHROME, { mat = "Metal" }),
		cylX(3, 2, 7, 24, -4, CHROME, { mat = "Metal" }),
		cyl(14, 4, 0, 13.6, 4, "#fff1e6"),
	},
})

add({
	uid = 184,
	id = "microwave",
	name = "Microwave",
	rarity = "Common",
	tags = { "kitchenware", "electric", "box" },
	hint = "Beeping in the corner.",
	parts = {
		box(46, 28, 32, 0, 14, 0, "#f8f9fa"),
		box(32, 22, 0.6, -5, 14, 16.1, "#2b2d42", { mat = "Glass" }),
		box(26, 16, 0.7, -5, 14, 16.2, "#ffd166", { t = 0.6, neon = true }),
		box(10, 22, 0.6, 17, 14, 16.1, "#dee2e6"),
		box(6, 3, 0.5, 17, 21, 16.4, "#06d6a0", { neon = true }),
		cyl(3, 0.8, 17, 12, 16.5, "#adb5bd", { rot = { 90, 0, 0 } }),
		cyl(3, 0.8, 17, 6, 16.5, "#adb5bd", { rot = { 90, 0, 0 } }),
		box(2, 18, 2, 10.5, 14, 17, "#adb5bd"),
	},
})

add({
	uid = 185,
	id = "tabby_cat",
	name = "Marmalade the Cat",
	rarity = "Uncommon",
	tags = { "animal", "critter", "pet", "cat", "fluffy", "orange" },
	hint = "Naps on the warm floor tiles.",
	critter = { speed = 22, flee = 1.4, style = "trot", sound = "PopBig" },
	parts = (function()
		local out = {
			blob(16, 14, 30, 0, 15, 0, "#ff9f43", { tag = "body" }),
			blob(12, 9, 24, 0, 12, 0.5, "#fff1e6", { tag = "body" }),
			ball(15, 0, 24, 15, "#ff9f43", { tag = "head" }),
			wedge(4, 6, 3, -4.4, 33, 14, "#ff9f43"),
			wedge(4, 6, 3, 4.4, 33, 14, "#ff9f43"),
			wedge(2.4, 3.6, 1.4, -4.4, 32.4, 15, "#ffb3c1"),
			wedge(2.4, 3.6, 1.4, 4.4, 32.4, 15, "#ffb3c1"),
			blob(8, 5, 4, 0, 20.6, 21.6, "#fff1e6"),
			ball(1.6, 0, 22.6, 22.6, "#ff6f91"),
			blob(3, 3, 22, 0, 22, -24, "#ff9f43", { rot = { -35, 0, 0 }, tag = "tail" }),
			box(16.4, 2, 6, 0, 20, -4, "#e67e22"),
			box(16.4, 2, 6, 0, 18, 6, "#e67e22"),
			box(5, 0.3, 0.3, -6, 21.6, 22.4, "#ffffff", { rot = { 0, 0, 10 } }),
			box(5, 0.3, 0.3, 6, 21.6, 22.4, "#ffffff", { rot = { 0, 0, -10 } }),
		}
		critterLegs(out, 9, 20, 9, 4.2, "#ff9f43")
		eyes(5, 3.2, 26, 21.6, out, "#2d6a4f")
		return out
	end)(),
})

add({
	uid = 186,
	id = "basil_pot",
	name = "Potted Basil",
	rarity = "Common",
	tags = { "plant", "green", "pot" },
	hint = "Sunny windowsill.",
	parts = (function()
		local out = {
			cyl(12, 12, 0, 6, 0, "#e07a5f"),
			cyl(13.4, 2.4, 0, 11.4, 0, "#c8553d"),
			cyl(11, 0.6, 0, 12.4, 0, "#5c4033"),
		}
		for i = 0, 9 do
			local a = i * 0.63
			local r = 2 + (i % 3) * 1.6
			table.insert(out, leaf(math.cos(a) * r, 15 + (i % 4) * 2.2, math.sin(a) * r, 5, math.deg(a), if i % 2 == 0 then "#52b788" else "#40916c"))
		end
		table.insert(out, cyl(1, 8, 0, 16, 0, "#2d6a4f"))
		return out
	end)(),
})

add({
	uid = 187,
	id = "robot_vacuum",
	name = "Robo-Vac",
	rarity = "Rare",
	tags = { "electric", "critter", "robot", "round", "wheels" },
	hint = "Patrols the kitchen floor. Thinks it is a pet.",
	critter = { speed = 18, flee = 0.6, style = "glide", sound = "Tick" },
	parts = {
		cyl(34, 7, 0, 4.5, 0, "#2b2d42", { tag = "body" }),
		cyl(35, 2, 0, 2, 0, "#4a4e69"),
		cyl(26, 0.6, 0, 8.2, 0, "#3d405b"),
		cyl(8, 1.2, 0, 8.6, 6, "#4cc9f0", { neon = true }),
		box(12, 1, 2, 0, 8.4, -6, "#8d99ae"),
		cyl(3, 0.6, -6, 8.7, 10, "#06d6a0", { neon = true }),
		cyl(3, 0.6, 6, 8.7, 10, "#06d6a0", { neon = true }),
	},
})

add({
	uid = 188,
	id = "trash_can",
	name = "Pedal Bin",
	rarity = "Common",
	tags = { "metal", "trash", "kitchenware" },
	hint = "Corner of the kitchen floor.",
	parts = {
		cyl(34, 52, 0, 26, 0, STEEL, { mat = "Metal" }),
		blob(35, 8, 35, 0, 53, 0, CHROME, { mat = "Metal" }),
		cyl(36, 3, 0, 1.5, 0, "#2b2d42"),
		box(10, 2, 8, 0, 2, 19, "#2b2d42"),
		box(4, 1.4, 6, 0, 56.5, 13, "#2b2d42"),
	},
})

add({
	uid = 189,
	id = "mop_bucket",
	name = "Mop & Bucket",
	rarity = "Common",
	tags = { "cleaning", "plastic", "blue" },
	hint = "Someone spilled the milk.",
	parts = (function()
		local out = {
			cyl(34, 30, 0, 15, 0, "#3a86ff"),
			cyl(36, 3, 0, 29, 0, "#4895ef"),
			cyl(30, 0.8, 0, 28.5, 0, "#bde0fe", { mat = "Glass", t = 0.3 }),
			cyl(3, 80, 4, 52, 0, "#ffd166", { rot = { 0, 0, -10 }, mat = "Wood" }),
		}
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2
			table.insert(out, blob(3, 14, 3, math.cos(a) * 4 + 2, 22, math.sin(a) * 4, "#f8f9fa", { rot = { math.cos(a) * 20, 0, math.sin(a) * 20 } }))
		end
		return out
	end)(),
})

add({
	uid = 190,
	id = "kitchen_stool",
	name = "Kitchen Stool",
	rarity = "Common",
	tags = { "furniture", "wood" },
	hint = "Tucked under the island.",
	parts = {
		cyl(34, 5, 0, 70, 0, "#e76f51", { mat = "Wood" }),
		cyl(30, 2, 0, 73, 0, "#f4a261", { mat = "Fabric" }),
		box(3.4, 68, 3.4, -10, 34, -10, WOOD, { rot = { 8, 0, -8 }, mat = "Wood" }),
		box(3.4, 68, 3.4, 10, 34, -10, WOOD, { rot = { 8, 0, 8 }, mat = "Wood" }),
		box(3.4, 68, 3.4, -10, 34, 10, WOOD, { rot = { -8, 0, -8 }, mat = "Wood" }),
		box(3.4, 68, 3.4, 10, 34, 10, WOOD, { rot = { -8, 0, 8 }, mat = "Wood" }),
		box(24, 2, 2, 0, 22, 11.4, WOOD_DARK, { mat = "Wood" }),
		box(24, 2, 2, 0, 22, -11.4, WOOD_DARK, { mat = "Wood" }),
	},
})

add({
	uid = 191,
	id = "chair",
	name = "Dining Chair",
	rarity = "Common",
	tags = { "furniture", "wood" },
	hint = "Around the kitchen table.",
	parts = {
		box(44, 5, 42, 0, 46, 0, WOOD, { mat = "Wood" }),
		box(40, 2, 38, 0, 49.4, 0, "#2a9d8f", { mat = "Fabric" }),
		box(4, 46, 4, -19, 23, -18, WOOD_DARK, { mat = "Wood" }),
		box(4, 46, 4, 19, 23, -18, WOOD_DARK, { mat = "Wood" }),
		box(4, 46, 4, -19, 23, 18, WOOD_DARK, { mat = "Wood" }),
		box(4, 46, 4, 19, 23, 18, WOOD_DARK, { mat = "Wood" }),
		box(4, 52, 4, -19, 74, -19, WOOD_DARK, { mat = "Wood" }),
		box(4, 52, 4, 19, 74, -19, WOOD_DARK, { mat = "Wood" }),
		box(38, 8, 3, 0, 94, -19, WOOD, { mat = "Wood" }),
		box(38, 6, 3, 0, 76, -19, WOOD, { mat = "Wood" }),
	},
})

add({
	uid = 192,
	id = "golden_retriever",
	name = "Biscuit the Dog",
	rarity = "Rare",
	tags = { "animal", "critter", "pet", "dog", "fluffy" },
	hint = "Waiting very politely for scraps.",
	critter = { speed = 34, flee = 1.0, style = "trot", sound = "PopBig" },
	parts = (function()
		local c = "#e9b872"
		local out = {
			blob(26, 24, 54, 0, 34, 0, c, { tag = "body" }),
			blob(20, 16, 40, 0, 30, 2, "#f6d7a7", { tag = "body" }),
			ball(26, 0, 50, 26, c, { tag = "head" }),
			blob(14, 11, 14, 0, 45, 38, "#f6d7a7"),
			ball(4, 0, 48, 45, "#3d2b1f"),
			blob(6, 16, 9, -13, 48, 24, "#d4a056", { rot = { 0, 0, 15 } }),
			blob(6, 16, 9, 13, 48, 24, "#d4a056", { rot = { 0, 0, -15 } }),
			blob(5, 5, 26, 0, 40, -34, c, { rot = { -40, 0, 0 }, tag = "tail" }),
			blob(6, 2, 7, 0, 39, 43, "#ff8fab"),
			box(27, 4, 6, 0, 40, 14, "#e63946"),
			cyl(5, 1, 0, 37, 17.2, "#ffd166", { rot = { 90, 0, 0 }, mat = "Foil" }),
		}
		critterLegs(out, 15, 34, 22, 7.5, c)
		eyes(9, 5, 54, 37, out, "#3d2b1f")
		return out
	end)(),
})

add({
	uid = 193,
	id = "kitchen_scale",
	name = "Kitchen Scale",
	rarity = "Common",
	tags = { "kitchenware", "baking", "metal" },
	hint = "Baking corner.",
	parts = {
		box(18, 5, 20, 0, 2.5, 0, "#f1faee"),
		box(8, 3, 0.4, 0, 3, 10.1, "#1d3557", { mat = "Glass" }),
		box(6, 2, 0.5, 0, 3, 10.2, "#a8dadc", { neon = true }),
		cyl(4, 2, 0, 6, 0, CHROME, { mat = "Metal" }),
		cyl(20, 1, 0, 7.4, 0, CHROME, { mat = "Metal" }),
		blob(14, 4, 14, 0, 9, 0, "#f6bd60"),
	},
})

add({
	uid = 194,
	id = "pancake_stack",
	name = "Pancake Stack",
	rarity = "Uncommon",
	tags = { "food", "breakfast", "sweet", "round" },
	hint = "Sunday breakfast special.",
	parts = (function()
		local out = { cyl(20, 1, 0, 0.5, 0, "#fefae0") }
		for i = 0, 5 do
			table.insert(out, cyl(15 - (i % 2) * 0.6, 1.8, (i % 3 - 1) * 0.4, 2 + i * 1.8, 0, "#e9a84f"))
		end
		table.insert(out, box(4, 2, 4, 0, 13.6, 0, "#fff3b0"))
		table.insert(out, blob(10, 1.4, 10, 0, 12.6, 0, "#b5651d", { t = 0.15 }))
		table.insert(out, blob(3, 6, 2, 6, 8, 2, "#b5651d", { t = 0.15 }))
		return out
	end)(),
})

add({
	uid = 195,
	id = "spatula",
	name = "Spatula",
	rarity = "Common",
	tags = { "kitchenware", "utensil" },
	hint = "Pancake duty.",
	parts = {
		box(1.6, 1, 16, 0, 0.8, -7, "#2b2d42"),
		box(7, 0.5, 8, 0, 0.5, 5, "#3d405b"),
		box(1, 0.6, 5, -1.6, 0.55, 5, "#1b1b1b"),
		box(1, 0.6, 5, 1.6, 0.55, 5, "#1b1b1b"),
	},
})

add({
	uid = 196,
	id = "cutting_board",
	name = "Cutting Board",
	rarity = "Common",
	tags = { "kitchenware", "wood" },
	hint = "Veggie prep zone.",
	parts = {
		box(36, 2.4, 24, 0, 1.2, 0, "#deb887", { mat = "Wood" }),
		box(8, 2.6, 4, 21, 1.2, 0, "#deb887", { mat = "Wood" }),
		cyl(2.4, 2.7, 23, 1.2, 0, "#5c4033"),
		cylX(4, 3, -6, 4.4, 4, "#ff8c1a"),
		cylX(4, 3, -2.6, 4.4, 4, "#ff8c1a"),
	},
})

add({
	uid = 197,
	id = "oven_mitt",
	name = "Oven Mitt",
	rarity = "Common",
	tags = { "fabric", "kitchenware" },
	hint = "Hanging by the stove.",
	parts = {
		blob(14, 4, 22, 0, 2, 0, "#e63946", { mat = "Fabric" }),
		blob(6, 3.6, 9, 7, 2, 4, "#e63946", { mat = "Fabric", rot = { 0, -30, 0 } }),
		box(14, 4.2, 4, 0, 2, -10, "#ffffff", { mat = "Fabric" }),
		ball(2, -2, 4.2, 2, "#ffffff", { mat = "Fabric" }),
		ball(2, 2, 4.2, -3, "#ffffff", { mat = "Fabric" }),
	},
})

add({
	uid = 198,
	id = "watering_can_kitchen",
	name = "Herb Watering Can",
	rarity = "Uncommon",
	tags = { "metal", "plant", "garden" },
	hint = "Beside the herb pots.",
	parts = {
		cyl(14, 14, 0, 7, 0, "#80b918", { mat = "Metal" }),
		cylX(2, 14, 10, 12, 0, "#80b918", { rot = { 0, 0, 40 }, mat = "Metal" }),
		cyl(4, 1.4, 15, 17, 0, "#55a630", { rot = { 0, 0, -50 }, mat = "Metal" }),
		box(2, 2, 14, 0, 16, 0, "#55a630", { rot = { 0, 90, 0 }, mat = "Metal" }),
		box(2, 6, 2, -7, 12, 0, "#55a630", { mat = "Metal" }),
	},
})

-- LANDMARK ------------------------------------------------------------------------------------

add({
	uid = 199,
	id = "fridge",
	name = "The Big Fridge",
	rarity = "Epic",
	tags = { "kitchenware", "electric", "landmark", "box", "cold" },
	hint = "The Kitchen's landmark. Roll it up in the Final Roll!",
	landmark = true,
	fill = 0.85,
	parts = (function()
		local out = {
			box(80, 180, 70, 0, 92, 0, "#e8f4fd"),
			box(82, 4, 72, 0, 2, 0, "#7d8597"),
			box(79, 0.8, 0.6, 0, 125, 35.4, "#adb5bd"),
			box(3, 30, 3, 34, 145, 37, CHROME, { mat = "Metal" }),
			box(3, 50, 3, 34, 85, 37, CHROME, { mat = "Metal" }),
			box(16, 12, 0.5, -16, 150, 35.4, "#ffd6a5"),
			box(14, 0.8, 0.6, -16, 152, 35.6, INK),
			box(10, 0.8, 0.6, -18, 149, 35.6, INK),
			box(12, 0.8, 0.6, -17, 146, 35.6, INK),
			ball(4, 8, 158, 35.8, "#ff595e"),
			ball(4, -30, 100, 35.8, "#ffca3a"),
			ball(4, 12, 92, 35.8, "#1982c4"),
			ball(4, -8, 80, 35.8, "#8ac926"),
			box(20, 14, 0.5, -18, 92, 35.5, "#ffffff"),
			box(16, 9, 0.6, -18, 92, 35.6, "#a2d2ff"),
			box(4, 4, 0.7, -24, 90, 35.7, "#ffd166"),
		}
		return out
	end)(),
})

return P
