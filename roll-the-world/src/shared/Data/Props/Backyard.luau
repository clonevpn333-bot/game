--!strict
-- Backyard BBQ prop library. UIDs 200-299 are reserved for this kit and are permanent.

local S = require(script.Parent.Shapes)
local box, ball, blob, cyl, cylX, wedge, eyes = S.box, S.ball, S.blob, S.cyl, S.cylX, S.wedge, S.eyes
local shade = S.shade

local P = {}
local function add(def: any)
	table.insert(P, def)
end

local GRASS = "#6cc04a"
local GRASS_DARK = "#4a9a32"
local WOOD = "#b5835a"
local WOOD_DARK = "#7f5539"
local CHROME = "#d9dee6"
local INK = "#2a1f3d"

local function leaf(x: number, y: number, z: number, len: number, yaw: number, color: string?, pitch: number?)
	return blob(len * 0.5, len * 0.12, len, x, y, z, color or GRASS, { rot = { pitch or 20, yaw, 0 } })
end

local function legs4(out: { any }, w: number, l: number, h: number, d: number, color: string)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			table.insert(out, cyl(d, h, sx * w / 2, h / 2, sz * l / 2, color, { tag = "leg" }))
		end
	end
end

local function legs2(out: { any }, w: number, h: number, d: number, color: string, z: number?)
	for _, sx in { -1, 1 } do
		table.insert(out, cyl(d, h, sx * w / 2, h / 2, z or 0, color, { tag = "leg" }))
		table.insert(out, blob(d * 2.2, d * 0.6, d * 2.6, sx * w / 2, d * 0.3, (z or 0) + d * 0.6, color, { tag = "leg" }))
	end
end

-- TINY ---------------------------------------------------------------------------------------

add({
	uid = 201,
	id = "grass_seed",
	name = "Grass Seed",
	rarity = "Common",
	tags = { "seed", "plant" },
	hint = "Scattered all over the lawn.",
	weight = 2.5,
	parts = { blob(0.3, 0.2, 0.7, 0, 0.1, 0, "#d4b483") },
})

add({
	uid = 202,
	id = "pebble",
	name = "Pebble",
	rarity = "Common",
	tags = { "rock", "round" },
	hint = "Along the garden path.",
	weight = 3,
	variants = { "#a5a58d", "#b7b7a4", "#8d8f7a", "#c9c5b9" },
	parts = {
		blob(1.0, 0.6, 0.8, 0, 0.3, 0, "#a5a58d", { mat = "Slate" }),
		blob(0.5, 0.3, 0.45, 0.2, 0.52, 0.1, "#cbc9b5", { mat = "Slate" }),
	},
})

add({
	uid = 203,
	id = "clover",
	name = "Clover",
	rarity = "Common",
	tags = { "plant", "green", "leaf" },
	hint = "Grows in lucky patches.",
	weight = 2,
	parts = {
		cyl(0.1, 0.8, 0, 0.4, 0, GRASS_DARK),
		blob(0.5, 0.08, 0.5, 0.22, 0.82, 0, GRASS),
		blob(0.5, 0.08, 0.5, -0.11, 0.82, 0.19, GRASS),
		blob(0.5, 0.08, 0.5, -0.11, 0.82, -0.19, GRASS),
	},
})

add({
	uid = 204,
	id = "four_leaf_clover",
	name = "Four-Leaf Clover",
	rarity = "Epic",
	tags = { "plant", "green", "leaf", "lucky" },
	hint = "Hidden in clover patches. So lucky!",
	weight = 0.8,
	parts = {
		cyl(0.1, 0.9, 0, 0.45, 0, GRASS_DARK),
		blob(0.55, 0.08, 0.55, 0.24, 0.92, 0, "#38b000"),
		blob(0.55, 0.08, 0.55, -0.24, 0.92, 0, "#38b000"),
		blob(0.55, 0.08, 0.55, 0, 0.92, 0.24, "#38b000"),
		blob(0.55, 0.08, 0.55, 0, 0.92, -0.24, "#38b000"),
		ball(0.18, 0, 0.96, 0, "#ffd166", { neon = true }),
	},
})

add({
	uid = 205,
	id = "garden_ant",
	name = "Garden Ant",
	rarity = "Common",
	tags = { "animal", "bug", "critter", "scurry" },
	hint = "Following the picnic crumbs.",
	critter = { speed = 7, flee = 1.4, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			ball(0.5, 0, 0.36, -0.42, "#7a2e1f", { tag = "body" }),
			ball(0.36, 0, 0.36, 0, "#8f3a28", { tag = "body" }),
			ball(0.42, 0, 0.42, 0.38, "#7a2e1f", { tag = "head" }),
		}
		for i = -1, 1 do
			for _, side in { -1, 1 } do
				table.insert(out, box(0.5, 0.05, 0.05, side * 0.3, 0.18, i * 0.18, "#4a1d14", { rot = { 0, 0, side * 25 }, tag = "leg" }))
			end
		end
		eyes(0.2, 0.14, 0.5, 0.56, out)
		return out
	end)(),
})

add({
	uid = 206,
	id = "dandelion_seed",
	name = "Dandelion Fluff",
	rarity = "Common",
	tags = { "plant", "seed", "fluffy", "white" },
	hint = "Drifts away from dandelions.",
	parts = {
		cyl(0.06, 1, 0, 0.5, 0, "#e9edc9"),
		ball(0.7, 0, 1.15, 0, "#ffffff", { t = 0.3 }),
	},
})

add({
	uid = 207,
	id = "acorn",
	name = "Acorn",
	rarity = "Common",
	tags = { "seed", "nut", "tree" },
	hint = "Dropped by the big oak.",
	weight = 1.5,
	parts = {
		blob(1.2, 1.4, 1.2, 0, 0.7, 0, "#c68b59"),
		blob(1.4, 0.7, 1.4, 0, 1.4, 0, "#7f5539", { mat = "Wood" }),
		cyl(0.18, 0.4, 0, 1.85, 0, "#5c3d2e"),
	},
})

add({
	uid = 208,
	id = "marshmallow",
	name = "Marshmallow",
	rarity = "Common",
	tags = { "food", "sweet", "white", "campfire" },
	hint = "Escaped the s'mores bag.",
	parts = {
		cyl(1.5, 1.6, 0, 0.8, 0, "#fffaf0"),
		cyl(1.3, 0.1, 0, 1.62, 0, "#f6e6c9"),
	},
})

add({
	uid = 209,
	id = "ketchup_drop",
	name = "Ketchup Blob",
	rarity = "Common",
	tags = { "food", "sauce", "red" },
	hint = "Splatted near the grill.",
	parts = {
		blob(1.4, 0.4, 1.2, 0, 0.2, 0, "#d00000"),
		blob(0.6, 0.3, 0.5, 0.2, 0.42, 0.1, "#ff4d4d"),
	},
})

add({
	uid = 210,
	id = "snail",
	name = "Slow Snail",
	rarity = "Common",
	tags = { "animal", "critter", "shell", "slow" },
	hint = "Taking the scenic route.",
	critter = { speed = 1.6, flee = 0.6, style = "glide", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(0.7, 0.4, 1.8, 0, 0.2, 0, "#c9ada7", { tag = "body" }),
			ball(1.2, 0, 0.85, -0.2, "#e09f3e", { tag = "body" }),
			ball(0.7, 0.08, 0.95, -0.1, "#f2cc8f"),
			box(0.06, 0.5, 0.06, -0.15, 0.6, 0.85, "#c9ada7", { rot = { -20, 0, 0 } }),
			box(0.06, 0.5, 0.06, 0.15, 0.6, 0.85, "#c9ada7", { rot = { -20, 0, 0 } }),
		}
		eyes(0.3, 0.14, 0.9, 0.95, out)
		return out
	end)(),
})

-- SMALL ---------------------------------------------------------------------------------------

add({
	uid = 211,
	id = "worm",
	name = "Wiggly Worm",
	rarity = "Common",
	tags = { "animal", "critter", "wiggle" },
	hint = "Pops up in the veggie patch.",
	critter = { speed = 2.5, flee = 0.8, style = "wiggle", sound = "PopSoft" },
	parts = (function()
		local out = {}
		for i = 0, 5 do
			table.insert(out, ball(0.7, math.sin(i * 0.9) * 0.3, 0.35, -1.6 + i * 0.62, "#f497b6", { tag = "body" }))
		end
		eyes(0.24, 0.16, 0.5, 1.9, out)
		return out
	end)(),
})

add({
	uid = 212,
	id = "pine_cone",
	name = "Pine Cone",
	rarity = "Common",
	tags = { "tree", "seed", "nature" },
	hint = "Under the pine at the fence.",
	parts = (function()
		local out = {}
		for i = 0, 4 do
			table.insert(out, cyl(2.2 - i * 0.35, 0.6, 0, 0.3 + i * 0.55, 0, if i % 2 == 0 then "#8d5524" else "#a0673a", { mat = "Wood" }))
		end
		table.insert(out, ball(0.6, 0, 3.0, 0, "#6f4518"))
		return out
	end)(),
})

add({
	uid = 213,
	id = "bumblebee",
	name = "Bumblebee",
	rarity = "Uncommon",
	tags = { "animal", "bug", "critter", "fly", "yellow" },
	hint = "Buzzing around the flowers.",
	critter = { speed = 9, flee = 1.4, style = "fly", hover = 3, sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(1.4, 1.3, 1.9, 0, 0.7, 0, "#ffd60a", { tag = "body" }),
			box(1.42, 1.0, 0.3, 0, 0.7, -0.2, INK),
			box(1.3, 0.9, 0.3, 0, 0.7, 0.4, INK),
			ball(1.0, 0, 0.9, 1.0, INK, { tag = "head" }),
			blob(0.9, 0.1, 0.6, -0.6, 1.5, 0, "#e0fbfc", { t = 0.35, tag = "wing", rot = { 0, 0, -20 } }),
			blob(0.9, 0.1, 0.6, 0.6, 1.5, 0, "#e0fbfc", { t = 0.35, tag = "wing", rot = { 0, 0, 20 } }),
		}
		eyes(0.36, 0.26, 1.0, 1.42, out)
		return out
	end)(),
})

add({
	uid = 214,
	id = "cherry_tom_garden",
	name = "Garden Tomato",
	rarity = "Common",
	tags = { "food", "veggie", "fruit", "red", "round", "garden" },
	hint = "Ripening in the veggie patch.",
	parts = {
		ball(2.4, 0, 1.2, 0, "#e63946"),
		ball(0.6, -0.5, 1.9, 0.6, "#ff8a80"),
		leaf(0.35, 2.38, 0, 0.9, 0, "#3fa34d"),
		leaf(-0.35, 2.38, 0, 0.9, 180, "#3fa34d"),
		cyl(0.15, 0.5, 0, 2.6, 0, "#2f7a38"),
	},
})

add({
	uid = 215,
	id = "bottle_cap_bbq",
	name = "Soda Cap",
	rarity = "Common",
	tags = { "metal", "trash", "round", "blue" },
	hint = "Party cooler leftovers.",
	parts = {
		cyl(2.3, 0.55, 0, 0.275, 0, "#3a86ff", { mat = "Metal" }),
		cyl(1.8, 0.06, 0, 0.58, 0, "#f2f2f2", { mat = "Metal" }),
		cyl(2.42, 0.2, 0, 0.1, 0, "#2667cc", { mat = "Metal" }),
	},
})

add({
	uid = 216,
	id = "strawberry_garden",
	name = "Wild Strawberry",
	rarity = "Uncommon",
	tags = { "food", "fruit", "berry", "red", "sweet", "garden" },
	hint = "Low in the garden bed.",
	parts = {
		blob(1.8, 2, 1.8, 0, 1.1, 0, "#f03a47"),
		leaf(0.3, 2.05, 0, 0.9, 0, "#3fa34d"),
		leaf(-0.3, 2.05, 0, 0.9, 180, "#3fa34d"),
		ball(0.12, 0.6, 1.3, 0.5, "#ffe066"),
		ball(0.12, -0.5, 0.9, 0.6, "#ffe066"),
		ball(0.12, 0.2, 0.6, -0.8, "#ffe066"),
	},
})

add({
	uid = 217,
	id = "flip_flop",
	name = "Flip-Flop",
	rarity = "Common",
	tags = { "clothing", "summer", "rubber" },
	hint = "Kicked off by the paddling pool.",
	variants = { "#ff70a6", "#70d6ff", "#ffd670", "#7bd88f" },
	parts = {
		blob(3.4, 0.5, 9, 0, 0.25, 0, "#ff70a6"),
		blob(3.0, 0.2, 8.6, 0, 0.55, 0, "#fff1e6"),
		box(0.35, 1.2, 0.35, 0, 1.1, 2.6, "#3d405b"),
		box(3.2, 0.35, 0.35, 0, 1.0, 0.6, "#3d405b", { rot = { 0, 0, 0 } }),
	},
})

add({
	uid = 218,
	id = "frog",
	name = "Hoppy Frog",
	rarity = "Uncommon",
	tags = { "animal", "critter", "green", "hop", "pond" },
	hint = "Near the paddling pool.",
	critter = { speed = 9, flee = 1.5, style = "hop", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(3, 2, 3.4, 0, 1.2, 0, "#70e000", { tag = "body" }),
			blob(2.4, 1.2, 2.6, 0, 0.8, 0.3, "#ccff33", { tag = "body" }),
			ball(1.3, -0.8, 2.3, 1.0, "#70e000"),
			ball(1.3, 0.8, 2.3, 1.0, "#70e000"),
			blob(2.2, 0.3, 0.3, 0, 1.4, 1.75, "#38b000"),
			blob(1.2, 0.5, 2.0, -1.5, 0.3, -0.6, "#38b000", { tag = "leg" }),
			blob(1.2, 0.5, 2.0, 1.5, 0.3, -0.6, "#38b000", { tag = "leg" }),
		}
		eyes(1.6, 0.8, 2.45, 1.45, out)
		return out
	end)(),
})

add({
	uid = 219,
	id = "golf_ball",
	name = "Lost Golf Ball",
	rarity = "Uncommon",
	tags = { "sports", "ball", "round", "white" },
	hint = "Someone sliced it over the fence.",
	parts = (function()
		local out = { ball(2.6, 0, 1.3, 0, "#ffffff") }
		for i = 0, 7 do
			local p = { math.cos(i * 0.8) * 1.2, 1.3 + math.sin(i * 1.7) * 0.9, math.sin(i * 0.8) * 1.2 }
			table.insert(out, ball(0.35, p[1], p[2], p[3], "#e9ecef"))
		end
		return out
	end)(),
})

add({
	uid = 220,
	id = "sunglasses",
	name = "Cool Shades",
	rarity = "Uncommon",
	tags = { "clothing", "summer", "glass", "cool" },
	hint = "Left on the deck chair.",
	parts = {
		blob(2.6, 2.0, 0.4, -1.6, 1.0, 0, INK, { mat = "Glass" }),
		blob(2.6, 2.0, 0.4, 1.6, 1.0, 0, INK, { mat = "Glass" }),
		box(0.9, 0.3, 0.3, 0, 1.5, 0, "#ff006e"),
		box(0.3, 0.3, 5, -2.9, 1.5, -2.4, "#ff006e"),
		box(0.3, 0.3, 5, 2.9, 1.5, -2.4, "#ff006e"),
	},
})

add({
	uid = 221,
	id = "hot_dog",
	name = "Hot Dog",
	rarity = "Common",
	tags = { "food", "bbq", "bread" },
	hint = "Fresh off the grill.",
	parts = {
		blob(3.2, 1.8, 9, 0, 0.9, 0, "#e9b872"),
		blob(1.8, 1.8, 10, 0, 1.6, 0, "#c1440e"),
		box(0.5, 0.3, 7, 0, 2.5, 0, "#ffd60a", { rot = { 0, 10, 0 } }),
	},
})

add({
	uid = 222,
	id = "burger",
	name = "Burger",
	rarity = "Common",
	tags = { "food", "bbq", "bread", "round" },
	hint = "The grill's finest work.",
	parts = (function()
		local out = {
			cyl(7, 1.4, 0, 0.7, 0, "#e09f3e"),
			cyl(7.4, 1.6, 0, 2.1, 0, "#6f1d1b"),
			cyl(7.8, 0.3, 0, 3.0, 0, "#ffd60a", { rot = { 0, 45, 0 } }),
			blob(8, 0.4, 8, 0, 3.3, 0, "#80b918"),
			cyl(6.4, 0.5, 0, 3.6, 0, "#e63946"),
			blob(7.4, 3.6, 7.4, 0, 4.9, 0, "#e09f3e"),
		}
		for i = 0, 6 do
			local a = i * 0.9
			table.insert(out, blob(0.3, 0.15, 0.6, math.cos(a) * 2, 6.6, math.sin(a) * 2, "#fff8e1", { rot = { 0, i * 40, 0 } }))
		end
		return out
	end)(),
})

add({
	uid = 223,
	id = "corn_cob",
	name = "Corn on the Cob",
	rarity = "Common",
	tags = { "food", "bbq", "veggie", "yellow" },
	hint = "Charred on the grill.",
	parts = (function()
		local out = { cylX(3.2, 10, 0, 1.6, 0, "#ffd23f", { rot = { 0, 90, 0 }, mat = "Pebble" }) }
		table.insert(out, leaf(1.4, 1.6, -6, 5, 160, "#a7c957", 0))
		table.insert(out, leaf(-1.4, 1.6, -6, 5, 200, "#a7c957", 0))
		table.insert(out, box(1.4, 1.2, 1.6, 0.6, 3, 1, "#3d2b1f", { t = 0.4 }))
		return out
	end)(),
})

add({
	uid = 224,
	id = "kebab",
	name = "Veggie Skewer",
	rarity = "Common",
	tags = { "food", "bbq", "veggie" },
	hint = "On the grill tray.",
	parts = {
		cylX(0.3, 14, 0, 1.5, 0, "#deb887", { rot = { 0, 90, 0 }, mat = "Wood" }),
		box(2.4, 2.4, 2.2, 0, 1.5, -4.5, "#e63946"),
		box(2.4, 2.4, 2.2, 0, 1.5, -1.8, "#ffd60a"),
		ball(2.6, 0, 1.5, 0.8, "#c9ada7"),
		box(2.4, 2.4, 2.2, 0, 1.5, 3.4, "#80b918"),
		ball(2.4, 0, 1.5, 5.6, "#f9844a"),
	},
})

add({
	uid = 225,
	id = "ketchup_bottle",
	name = "Ketchup Bottle",
	rarity = "Common",
	tags = { "food", "sauce", "red", "bbq", "plastic" },
	hint = "Condiment station.",
	parts = {
		cyl(5, 12, 0, 6, 0, "#d00000"),
		blob(5, 3, 5, 0, 12.4, 0, "#d00000"),
		cyl(2.6, 2, 0, 14.4, 0, "#ffffff"),
		cyl(1, 1.4, 0, 16, 0, "#ffffff"),
		box(4, 4, 0.2, 0, 6.4, 2.5, "#fefae0"),
		box(2, 2.4, 0.25, 0, 6.4, 2.6, "#e63946"),
	},
})

add({
	uid = 226,
	id = "mustard_bottle",
	name = "Mustard Bottle",
	rarity = "Common",
	tags = { "food", "sauce", "yellow", "bbq", "plastic" },
	hint = "Condiment station.",
	parts = {
		cyl(5, 12, 0, 6, 0, "#ffd60a"),
		blob(5, 3, 5, 0, 12.4, 0, "#ffd60a"),
		cyl(2.6, 2, 0, 14.4, 0, "#ffd60a"),
		cyl(1, 1.4, 0, 16, 0, "#e09f3e"),
		box(4, 4, 0.2, 0, 6.4, 2.5, "#fefae0"),
	},
})

add({
	uid = 227,
	id = "lemonade",
	name = "Glass of Lemonade",
	rarity = "Common",
	tags = { "drink", "glass", "yellow", "summer" },
	hint = "On the picnic table.",
	parts = {
		cyl(6, 10, 0, 5, 0, "#e0fbfc", { mat = "Glass", t = 0.55 }),
		cyl(5.4, 7.6, 0, 4.2, 0, "#fff3a0", { t = 0.15 }),
		box(1.4, 1.4, 1.4, 1, 7.4, 0.6, "#e0fbfc", { mat = "Glass", t = 0.4 }),
		cyl(3, 0.5, -2.4, 9.8, 0, "#ffe347", { rot = { 90, 0, 30 } }),
		cyl(0.4, 9, 0.8, 9.5, -0.8, "#ff70a6", { rot = { 10, 0, 15 } }),
	},
})

add({
	uid = 228,
	id = "paper_cup",
	name = "Party Cup",
	rarity = "Common",
	tags = { "party", "plastic", "red" },
	hint = "Party table.",
	parts = {
		cyl(5, 9, 0, 4.5, 0, "#d62828"),
		cyl(5.4, 0.6, 0, 9, 0, "#d62828"),
		cyl(5.2, 1, 0, 2, 0, "#ffffff"),
		cyl(4.6, 0.2, 0, 8.8, 0, "#ffffff"),
	},
})

add({
	uid = 229,
	id = "watermelon_slice",
	name = "Watermelon Slice",
	rarity = "Common",
	tags = { "food", "fruit", "red", "summer", "sweet" },
	hint = "Picnic blanket favourite.",
	parts = {
		wedge(2, 6, 10, 0, 3, 0, "#ef476f", { rot = { 0, 0, 0 } }),
		box(2.2, 1, 10, 0, 0.5, 0, "#06d6a0"),
		box(2.1, 0.5, 10, 0, 1.2, 0, "#e9f5db"),
		ball(0.5, 0, 2.4, 1, INK),
		ball(0.5, 0, 3.6, -1.6, INK),
		ball(0.5, 0, 2, -3, INK),
	},
})

add({
	uid = 230,
	id = "tennis_ball",
	name = "Tennis Ball",
	rarity = "Common",
	tags = { "sports", "ball", "round", "yellow", "dog" },
	hint = "The dog's prized possession.",
	parts = {
		ball(6.6, 0, 3.3, 0, "#d9ed92", { mat = "Fabric" }),
		blob(6.8, 0.6, 2.6, 0, 3.3, 0, "#ffffff", { rot = { 0, 0, 30 } }),
		blob(2.6, 0.6, 6.8, 0, 3.3, 0, "#ffffff", { rot = { 30, 0, 0 } }),
	},
})

add({
	uid = 231,
	id = "garden_trowel",
	name = "Garden Trowel",
	rarity = "Common",
	tags = { "garden", "metal", "tool" },
	hint = "Stuck in the veggie patch.",
	parts = {
		box(1.6, 1.6, 7, 0, 0.8, -4, "#38b000", { mat = "Plastic" }),
		box(0.6, 0.6, 2, 0, 0.8, 0.4, CHROME, { mat = "Metal" }),
		blob(3.4, 0.5, 6, 0, 0.5, 4.2, CHROME, { mat = "Metal" }),
	},
})

add({
	uid = 232,
	id = "duck",
	name = "Garden Duck",
	rarity = "Uncommon",
	tags = { "animal", "critter", "duck", "quack", "bird", "pond" },
	hint = "Waddles around the paddling pool.",
	critter = { speed = 8, flee = 1.2, style = "waddle", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(5, 4, 7, 0, 3.2, 0, "#ffffff", { tag = "body" }),
			blob(2, 1.6, 2, 0, 4.6, -3.2, "#ffffff"),
			ball(3.6, 0, 6.6, 2.4, "#2d6a4f", { tag = "head" }),
			blob(2, 0.8, 1.8, 0, 6.2, 4.6, "#ffb703"),
			box(4, 0.6, 1, 0, 5.2, 2.2, "#ffffff"),
			blob(1.4, 2.6, 4, -2.4, 3.6, -0.2, "#e9ecef", { tag = "wing" }),
			blob(1.4, 2.6, 4, 2.4, 3.6, -0.2, "#e9ecef", { tag = "wing" }),
		}
		legs2(out, 2, 1.4, 0.5, "#ffb703")
		eyes(1.8, 0.7, 7.2, 3.95, out)
		return out
	end)(),
})

add({
	uid = 233,
	id = "chicken",
	name = "Clucky Chicken",
	rarity = "Uncommon",
	tags = { "animal", "critter", "bird", "farm" },
	hint = "Pecking around the veggie beds.",
	critter = { speed = 10, flee = 1.4, style = "waddle", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(6, 6, 7, 0, 4.6, 0, "#fffaf0", { tag = "body" }),
			blob(3, 4, 3, 0, 6.8, -3, "#f8f1e6"),
			ball(4, 0, 9, 2.4, "#fffaf0", { tag = "head" }),
			wedge(0.6, 2, 2.6, 0, 11.6, 2.4, "#e63946"),
			wedge(1.4, 0.8, 1.4, 0, 8.8, 4.8, "#ffb703", { rot = { 0, 0, 0 } }),
			blob(0.8, 1.4, 0.8, 0, 7.6, 4.2, "#e63946"),
			blob(1.4, 3.6, 4.6, -3, 5, -0.2, "#f1e3d3", { tag = "wing" }),
			blob(1.4, 3.6, 4.6, 3, 5, -0.2, "#f1e3d3", { tag = "wing" }),
		}
		legs2(out, 2.4, 2.2, 0.5, "#ffb703")
		eyes(2, 0.8, 9.6, 4.15, out)
		return out
	end)(),
})

add({
	uid = 234,
	id = "butterfly",
	name = "Sunny Butterfly",
	rarity = "Rare",
	tags = { "animal", "bug", "critter", "fly", "colorful" },
	hint = "Flutters over the flowers on sunny days.",
	critter = { speed = 10, flee = 1.8, style = "fly", hover = 6, sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(0.8, 0.8, 4, 0, 1, 0, INK, { tag = "body" }),
			ball(1, 0, 1.2, 2.2, INK, { tag = "head" }),
			blob(4.6, 0.2, 3.4, -2.6, 1.2, 0.8, "#ff70a6", { tag = "wing" }),
			blob(4.6, 0.2, 3.4, 2.6, 1.2, 0.8, "#ff70a6", { tag = "wing" }),
			blob(3.2, 0.2, 2.6, -2.0, 1.1, -1.4, "#ffd670", { tag = "wing" }),
			blob(3.2, 0.2, 2.6, 2.0, 1.1, -1.4, "#ffd670", { tag = "wing" }),
			ball(1.2, -2.8, 1.35, 1, "#70d6ff", { tag = "wing" }),
			ball(1.2, 2.8, 1.35, 1, "#70d6ff", { tag = "wing" }),
		}
		return out
	end)(),
})

-- MEDIUM ---------------------------------------------------------------------------------------

add({
	uid = 235,
	id = "squirrel",
	name = "Nutty Squirrel",
	rarity = "Uncommon",
	tags = { "animal", "critter", "fluffy", "tree", "scurry" },
	hint = "Darts between the oak and the fence.",
	critter = { speed = 20, flee = 1.8, style = "hop", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(5, 7, 6, 0, 4.4, 0, "#a0673a", { tag = "body" }),
			blob(3.6, 5, 3, 0, 4, 1.6, "#f1dcc4"),
			ball(4.4, 0, 9, 1.4, "#a0673a", { tag = "head" }),
			wedge(1.2, 1.8, 1, -1.4, 11.6, 1, "#a0673a"),
			wedge(1.2, 1.8, 1, 1.4, 11.6, 1, "#a0673a"),
			blob(4, 11, 4, 0, 7, -4.4, "#b5835a", { rot = { -15, 0, 0 }, tag = "tail" }),
			blob(2.6, 2, 2.4, 0, 8.4, 3.4, "#f1dcc4"),
			ball(0.7, 0, 8.8, 4.6, INK),
			blob(1.6, 1.8, 1.6, 0, 5.6, 3.6, "#c68b59"),
		}
		legs4(out, 3, 3.6, 2, 1.2, "#8d5524")
		eyes(1.8, 0.9, 9.8, 3.4, out)
		return out
	end)(),
})

add({
	uid = 236,
	id = "frisbee",
	name = "Flying Disc",
	rarity = "Common",
	tags = { "toy", "sports", "round", "plastic" },
	hint = "Caught in the hedge.",
	variants = { "#ff006e", "#3a86ff", "#ffbe0b", "#8338ec" },
	parts = {
		cyl(18, 1.6, 0, 0.8, 0, "#ff006e"),
		cyl(16, 0.4, 0, 1.7, 0, shade("#ff006e", 0.3)),
		cyl(8, 0.45, 0, 1.75, 0, "#ffffff"),
	},
})

add({
	uid = 237,
	id = "baseball",
	name = "Baseball",
	rarity = "Common",
	tags = { "sports", "ball", "round", "white" },
	hint = "Bounced off the shed.",
	parts = {
		ball(7.4, 0, 3.7, 0, "#fffdf6", { mat = "Fabric" }),
		blob(7.6, 0.4, 2, 0, 3.7, 0, "#e63946", { rot = { 0, 0, 40 } }),
		blob(2, 0.4, 7.6, 0, 3.7, 0, "#e63946", { rot = { 40, 0, 0 } }),
	},
})

add({
	uid = 238,
	id = "soccer_ball",
	name = "Kickabout Ball",
	rarity = "Common",
	tags = { "sports", "ball", "round" },
	hint = "Middle of the lawn.",
	parts = (function()
		local out = { ball(22, 0, 11, 0, "#ffffff") }
		local pts = { { 0, 1, 0 }, { 0.9, 0.4, 0.2 }, { -0.6, 0.4, 0.7 }, { -0.4, 0.3, -0.85 }, { 0.5, -0.3, -0.8 }, { 0.6, -0.4, 0.7 }, { -0.95, -0.3, 0 } }
		for _, p in pts do
			local len = math.sqrt(p[1] * p[1] + p[2] * p[2] + p[3] * p[3])
			table.insert(out, ball(6, p[1] / len * 9.2, 11 + p[2] / len * 9.2, p[3] / len * 9.2, "#2b2d42"))
		end
		return out
	end)(),
})

add({
	uid = 239,
	id = "garden_gnome",
	name = "Garden Gnome",
	rarity = "Rare",
	tags = { "decor", "garden", "gnome" },
	hint = "Guards the flower bed. Very serious.",
	parts = (function()
		local out = {
			cyl(10, 2, 0, 1, 0, "#6c757d"),
			blob(9, 10, 8, 0, 7, 0, "#3a86ff", { tag = "body" }),
			box(9.4, 1.4, 8.4, 0, 6, 0, "#5c3d2e"),
			ball(6.4, 0, 14, 0.6, "#ffcdb2", { tag = "head" }),
			blob(7, 6, 4, 0, 11.6, 2.8, "#ffffff"),
			ball(2, 0, 13.8, 3.6, "#ff8fa3"),
			wedge(7, 10, 7, 0, 21, 0.6, "#e63946"),
			cyl(7.6, 1.4, 0, 16.4, 0.6, "#e63946"),
			cylX(1.4, 9, 4.6, 9, 1.8, "#a0673a", { rot = { 0, 0, 70 }, mat = "Wood" }),
			wedge(2.4, 2, 1, 6.2, 13, 2, CHROME, { mat = "Metal" }),
		}
		eyes(2.2, 0.9, 15, 3.4, out)
		return out
	end)(),
})

add({
	uid = 240,
	id = "gnome_king",
	name = "The Gnome King",
	rarity = "Legendary",
	tags = { "decor", "garden", "gnome", "shiny", "magic" },
	hint = "Rumoured to appear only on legendary afternoons.",
	weight = 0.6,
	parts = (function()
		local out = {
			cyl(11, 2, 0, 1, 0, "#ffd166", { mat = "Foil" }),
			blob(9, 10, 8, 0, 7, 0, "#7b2cbf", { tag = "body" }),
			box(9.4, 1.4, 8.4, 0, 6, 0, "#ffd166", { mat = "Foil" }),
			ball(6.4, 0, 14, 0.6, "#ffcdb2", { tag = "head" }),
			blob(8, 8, 4.6, 0, 11, 2.8, "#ffffff"),
			ball(2, 0, 13.8, 3.6, "#ff8fa3"),
			cyl(7.6, 3, 0, 17.6, 0.6, "#ffd166", { mat = "Foil" }),
			wedge(1.6, 2.4, 1, -2.6, 20, 3.4, "#ffd166", { mat = "Foil" }),
			wedge(1.6, 2.4, 1, 0, 20.4, 4, "#ffd166", { mat = "Foil" }),
			wedge(1.6, 2.4, 1, 2.6, 20, 3.4, "#ffd166", { mat = "Foil" }),
			ball(1, 0, 19, 4.2, "#e63946", { neon = true }),
			blob(12, 9, 1, 0, 9, -4.4, "#e63946", { mat = "Fabric" }),
			cyl(1, 12, 5.6, 10, 2, "#ffd166", { mat = "Foil" }),
			ball(2.4, 5.6, 16.6, 2, "#c77dff", { neon = true }),
		}
		eyes(2.2, 0.9, 15, 3.4, out)
		return out
	end)(),
})

add({
	uid = 241,
	id = "watering_can",
	name = "Watering Can",
	rarity = "Common",
	tags = { "garden", "metal", "tool" },
	hint = "By the flower beds.",
	parts = {
		cyl(16, 16, 0, 8, 0, "#4cc9f0", { mat = "Metal" }),
		cylX(2.4, 16, 12, 14, 0, "#4cc9f0", { rot = { 0, 0, 40 }, mat = "Metal" }),
		cyl(5, 1.6, 18, 20, 0, "#3a86ff", { rot = { 0, 0, -50 }, mat = "Metal" }),
		box(2.4, 2.4, 16, 0, 18, 0, "#3a86ff", { rot = { 0, 90, 0 }, mat = "Metal" }),
		box(2.4, 8, 2.4, -8, 13, 0, "#3a86ff", { mat = "Metal" }),
	},
})

add({
	uid = 242,
	id = "tulip_pot",
	name = "Tulip Pot",
	rarity = "Common",
	tags = { "plant", "flower", "pot", "garden" },
	hint = "Lining the deck steps.",
	variants = { "#ff4d6d", "#ffd60a", "#c77dff", "#ff8fab" },
	parts = {
		cyl(12, 12, 0, 6, 0, "#e07a5f"),
		cyl(13.6, 2.4, 0, 11.4, 0, "#c8553d"),
		cyl(1, 12, 0, 18, 0, "#2d6a4f"),
		leaf(2, 16, 0, 8, 90, "#40916c", 60),
		leaf(-2, 15, 0, 7, -90, "#52b788", 60),
		blob(5, 6, 5, 0, 25, 0, "#ff4d6d"),
		wedge(2, 2.4, 2, -1.2, 28.6, 0, "#ff4d6d"),
		wedge(2, 2.4, 2, 1.2, 28.6, 0, "#ff4d6d"),
	},
})

add({
	uid = 243,
	id = "rubber_boot",
	name = "Welly Boot",
	rarity = "Common",
	tags = { "clothing", "rubber", "garden" },
	hint = "By the back door.",
	variants = { "#ffd60a", "#e63946", "#3a86ff", "#06d6a0" },
	parts = {
		cyl(9, 24, 0, 12, -2, "#ffd60a"),
		blob(10, 8, 18, 0, 4, 2.6, "#ffd60a"),
		box(10.4, 2, 18, 0, 1, 2, "#3d405b"),
		cyl(10, 2, 0, 23.4, -2, shade("#ffd60a", -0.2)),
	},
})

add({
	uid = 244,
	id = "flamingo",
	name = "Lawn Flamingo",
	rarity = "Uncommon",
	tags = { "decor", "bird", "pink", "plastic" },
	hint = "Standing proudly on one leg.",
	parts = {
		cyl(1, 22, 0, 11, 0, "#ff70a6"),
		blob(10, 8, 16, 0, 26, 0, "#ff70a6", { tag = "body" }),
		blob(2, 16, 2, 0, 36, 6, "#ff70a6", { rot = { 20, 0, 0 } }),
		ball(5, 0, 44, 9, "#ff70a6", { tag = "head" }),
		wedge(2, 2, 4, 0, 42.4, 12.4, INK, { rot = { 30, 0, 0 } }),
		blob(3, 6, 12, -4.6, 27, -1, "#ff4d94", { tag = "wing" }),
		blob(3, 6, 12, 4.6, 27, -1, "#ff4d94", { tag = "wing" }),
		ball(1, -1.6, 45, 10.4, INK),
		ball(1, 1.6, 45, 10.4, INK),
	},
})

add({
	uid = 245,
	id = "beach_ball",
	name = "Beach Ball",
	rarity = "Common",
	tags = { "toy", "summer", "ball", "round", "colorful" },
	hint = "Bounced out of the paddling pool.",
	parts = (function()
		local out = { ball(24, 0, 12, 0, "#ffffff") }
		local colors = { "#e63946", "#ffd60a", "#3a86ff", "#06d6a0", "#ff70a6", "#ff9f1c" }
		for i = 0, 5 do
			table.insert(out, blob(24.2, 24.2, 6, 0, 12, 0, colors[i + 1], { rot = { 0, i * 30, 0 } }))
		end
		table.insert(out, ball(6, 0, 23.4, 0, "#ffffff"))
		return out
	end)(),
})

add({
	uid = 246,
	id = "bunny",
	name = "Garden Bunny",
	rarity = "Rare",
	tags = { "animal", "critter", "fluffy", "hop", "pet" },
	hint = "Nibbling the lettuce when no one is looking.",
	critter = { speed = 20, flee = 1.8, style = "hop", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(9, 9, 12, 0, 5, 0, "#f8f1e6", { tag = "body" }),
			ball(8, 0, 11, 4.2, "#f8f1e6", { tag = "head" }),
			blob(2.4, 9, 1.4, -1.6, 18, 3.4, "#f8f1e6", { rot = { -10, 0, -8 } }),
			blob(2.4, 9, 1.4, 1.6, 18, 3.4, "#f8f1e6", { rot = { -10, 0, 8 } }),
			blob(1.4, 6.6, 0.6, -1.6, 18, 4.1, "#ffb3c1", { rot = { -10, 0, -8 } }),
			blob(1.4, 6.6, 0.6, 1.6, 18, 4.1, "#ffb3c1", { rot = { -10, 0, 8 } }),
			ball(3.4, 0, 6, -6, "#ffffff", { tag = "tail" }),
			ball(1.2, 0, 10.6, 8.2, "#ff8fab"),
			blob(4, 2, 5, -2.8, 1, 1, "#efe6da", { tag = "leg" }),
			blob(4, 2, 5, 2.8, 1, 1, "#efe6da", { tag = "leg" }),
		}
		eyes(3.2, 1.6, 12, 7.6, out)
		return out
	end)(),
})

add({
	uid = 247,
	id = "hedgehog",
	name = "Prickles the Hedgehog",
	rarity = "Epic",
	tags = { "animal", "critter", "spiky", "scurry" },
	hint = "Only comes out at golden hour.",
	critter = { speed = 12, flee = 1.4, style = "scurry", sound = "PopSoft" },
	parts = (function()
		local out = {
			blob(10, 7, 13, 0, 4, 0, "#7f5539", { tag = "body" }),
			blob(6, 5, 6, 0, 3.4, 5.6, "#e6ccb2", { tag = "head" }),
			ball(1.4, 0, 3.6, 8.6, INK),
		}
		for i = 0, 13 do
			local a = i * 2.4
			local h = 0.3 + (i % 5) * 0.15
			table.insert(out, wedge(1.4, 2.6, 1.4, math.cos(a) * 3.8, 4 + h * 6, math.sin(a) * 4.6 - 0.6, "#5c3d2e", { rot = { -30, math.deg(a), 0 } }))
		end
		legs4(out, 6, 7, 1.4, 1.4, "#e6ccb2")
		eyes(2.4, 1, 4.6, 7.6, out)
		return out
	end)(),
})

add({
	uid = 248,
	id = "star_bunny",
	name = "Star Bunny",
	rarity = "Legendary",
	tags = { "animal", "critter", "magic", "glow", "hop", "fluffy" },
	hint = "Hops in from the sky during the rarest events.",
	weight = 0.3,
	critter = { speed = 28, flee = 2.2, style = "hop", sound = "NewDiscovery" },
	parts = (function()
		local out = {
			blob(9, 9, 12, 0, 5, 0, "#c8b6ff", { tag = "body", mat = "Glass" }),
			ball(8, 0, 11, 4.2, "#c8b6ff", { tag = "head", mat = "Glass" }),
			blob(2.4, 9, 1.4, -1.6, 18, 3.4, "#c8b6ff", { rot = { -10, 0, -8 }, mat = "Glass" }),
			blob(2.4, 9, 1.4, 1.6, 18, 3.4, "#c8b6ff", { rot = { -10, 0, 8 }, mat = "Glass" }),
			ball(3.4, 0, 6, -6, "#fff3b0", { tag = "tail", neon = true }),
			ball(1.2, 0, 10.6, 8.2, "#ff8fab"),
			ball(1.6, 0, 16, 4.2, "#fff3b0", { neon = true }),
			ball(0.8, 3, 7, 5, "#fff3b0", { neon = true }),
			ball(0.8, -3.6, 4, -2, "#fff3b0", { neon = true }),
		}
		eyes(3.2, 1.6, 12, 7.6, out)
		return out
	end)(),
})

add({
	uid = 249,
	id = "kiddie_bucket",
	name = "Bucket & Spade",
	rarity = "Common",
	tags = { "toy", "plastic", "summer" },
	hint = "Sandpit corner.",
	parts = {
		cyl(14, 14, 0, 7, 0, "#ff006e"),
		cyl(15.4, 1.6, 0, 13.6, 0, "#ff4d94"),
		cyl(12.6, 0.6, 0, 13, 0, "#f4d58d", { mat = "Sand" }),
		box(0.8, 9, 0.8, 0, 18, -6.8, "#ffd60a", { rot = { 0, 0, 0 } }),
		box(1.4, 18, 1.4, 4, 20, 2, "#3a86ff", { rot = { 0, 0, -15 } }),
		box(5, 6, 0.8, 6.6, 29, 2, "#3a86ff", { rot = { 0, 0, -15 } }),
	},
})

-- LARGE ----------------------------------------------------------------------------------------

add({
	uid = 250,
	id = "watermelon",
	name = "Whole Watermelon",
	rarity = "Uncommon",
	tags = { "food", "fruit", "green", "round", "summer" },
	hint = "Chilling in the cooler's shadow.",
	parts = (function()
		local out = { blob(30, 24, 22, 0, 12, 0, "#2d6a4f") }
		for i = 0, 5 do
			table.insert(out, blob(30.4, 24.4, 3, 0, 12, -9 + i * 3.6, "#95d5b2", { t = 0, rot = { 0, 0, 0 } }))
		end
		table.insert(out, blob(6, 4, 6, -6, 21, 3, "#52b788"))
		return out
	end)(),
})

add({
	uid = 251,
	id = "sunflower",
	name = "Sunflower",
	rarity = "Common",
	tags = { "plant", "flower", "yellow", "garden" },
	hint = "Tall by the fence, facing the sun.",
	parts = (function()
		local out = {
			cyl(3, 60, 0, 30, 0, "#4f772d"),
			leaf(4, 24, 0, 14, 90, "#6a994e", 50),
			leaf(-4, 36, 0, 12, -90, "#6a994e", 50),
			cyl(16, 3, 0, 64, 2, "#6f4518", { rot = { 70, 0, 0 } }),
		}
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			table.insert(out, blob(5, 1, 10, math.cos(a) * 11, 64 + math.sin(a) * 11 * 0.94, 2 - math.sin(a) * 3.6, "#ffd60a", { rot = { 70, 0, -math.deg(a) + 90 } }))
		end
		return out
	end)(),
})

add({
	uid = 252,
	id = "cooler",
	name = "Ice Cooler",
	rarity = "Common",
	tags = { "bbq", "plastic", "cold", "box" },
	hint = "Party drinks inside.",
	parts = {
		box(40, 26, 24, 0, 13, 0, "#3a86ff"),
		box(42, 6, 26, 0, 29, 0, "#ffffff"),
		box(40.4, 2, 24.4, 0, 4, 0, "#ffffff"),
		box(24, 2.6, 4, 0, 34, 0, "#ffffff"),
		box(2, 6, 4, -11, 31.4, 0, "#ffffff"),
		box(2, 6, 4, 11, 31.4, 0, "#ffffff"),
	},
})

add({
	uid = 253,
	id = "garden_hose",
	name = "Hose Reel",
	rarity = "Common",
	tags = { "garden", "tool", "green" },
	hint = "Coiled by the tap.",
	parts = (function()
		local out = {
			cylX(30, 2, -10, 16, 0, "#ffd60a"),
			cylX(30, 2, 10, 16, 0, "#ffd60a"),
			cylX(6, 22, 0, 16, 0, "#e09f3e"),
			box(2, 16, 2, -12, 8, 6, "#ffd60a"),
			box(2, 16, 2, 12, 8, 6, "#ffd60a"),
			box(2, 16, 2, -12, 8, -6, "#ffd60a"),
			box(2, 16, 2, 12, 8, -6, "#ffd60a"),
		}
		for i = -4, 4 do
			table.insert(out, cylX(22, 2.2, i * 2.1, 16, 0, "#38b000"))
		end
		return out
	end)(),
})

add({
	uid = 254,
	id = "lawn_chair",
	name = "Deck Chair",
	rarity = "Common",
	tags = { "furniture", "summer", "fabric" },
	hint = "Prime sunbathing spot.",
	parts = {
		box(2, 2, 46, -14, 20, 0, WOOD, { rot = { -25, 0, 0 }, mat = "Wood" }),
		box(2, 2, 46, 14, 20, 0, WOOD, { rot = { -25, 0, 0 }, mat = "Wood" }),
		box(2, 30, 2, -14, 15, 10, WOOD, { rot = { 25, 0, 0 }, mat = "Wood" }),
		box(2, 30, 2, 14, 15, 10, WOOD, { rot = { 25, 0, 0 }, mat = "Wood" }),
		box(26, 0.6, 44, 0, 21, 0, "#06d6a0", { rot = { -25, 0, 0 }, mat = "Fabric" }),
		box(26, 0.7, 6, 0, 21.2, 0, "#ffffff", { rot = { -25, 0, 0 }, mat = "Fabric" }),
		box(26, 0.7, 6, 0, 21.2, 12, "#ffffff", { rot = { -25, 0, 0 }, mat = "Fabric" }),
	},
})

add({
	uid = 255,
	id = "parasol",
	name = "Sun Parasol",
	rarity = "Common",
	tags = { "furniture", "summer", "fabric" },
	hint = "Shading the picnic.",
	parts = (function()
		local out = {
			cyl(14, 4, 0, 2, 0, "#6c757d"),
			cyl(2, 80, 0, 42, 0, "#ffffff"),
			ball(3, 0, 85, 0, "#ffffff"),
		}
		for i = 0, 7 do
			local a = i / 8 * math.pi * 2
			table.insert(out, wedge(20, 10, 30, math.cos(a) * 14, 77, math.sin(a) * 14, if i % 2 == 0 then "#e63946" else "#ffffff", { rot = { 0, -math.deg(a) + 90, 0 }, mat = "Fabric" }))
		end
		return out
	end)(),
})

add({
	uid = 256,
	id = "wheelbarrow",
	name = "Wheelbarrow",
	rarity = "Common",
	tags = { "garden", "metal", "tool", "wheels" },
	hint = "Half full of soil by the beds.",
	parts = {
		box(30, 14, 40, 0, 22, 0, "#e63946", { mat = "Metal" }),
		box(28, 2, 38, 0, 28.6, 0, "#5c4033"),
		cylX(18, 6, 0, 9, 26, "#2b2d42"),
		cylX(8, 6.2, 0, 9, 26, "#adb5bd", { mat = "Metal" }),
		box(2, 2, 40, -12, 18, -20, "#adb5bd", { rot = { -8, 0, 0 }, mat = "Metal" }),
		box(2, 2, 40, 12, 18, -20, "#adb5bd", { rot = { -8, 0, 0 }, mat = "Metal" }),
		box(2, 16, 2, -12, 8, -10, "#adb5bd", { mat = "Metal" }),
		box(2, 16, 2, 12, 8, -10, "#adb5bd", { mat = "Metal" }),
	},
})

add({
	uid = 257,
	id = "bbq_grill",
	name = "Kettle Grill",
	rarity = "Uncommon",
	tags = { "bbq", "metal", "fire", "round" },
	hint = "The heart of the party.",
	parts = {
		blob(46, 30, 46, 0, 60, 0, "#2b2d42", { mat = "Metal" }),
		blob(46, 22, 46, 0, 76, 0, "#2b2d42", { mat = "Metal" }),
		cyl(47, 2, 0, 70, 0, "#adb5bd", { mat = "Metal" }),
		box(12, 3, 3, 0, 89, 0, CHROME, { mat = "Metal" }),
		box(3, 60, 3, -14, 26, -12, "#adb5bd", { rot = { 10, 0, -10 }, mat = "Metal" }),
		box(3, 60, 3, 14, 26, -12, "#adb5bd", { rot = { 10, 0, 10 }, mat = "Metal" }),
		box(3, 60, 3, 0, 26, 16, "#adb5bd", { rot = { -12, 0, 0 }, mat = "Metal" }),
		cylX(10, 3, -16, 5, -18, "#2b2d42"),
		cylX(10, 3, 16, 5, -18, "#2b2d42"),
		blob(10, 14, 10, 0, 98, 0, "#adb5bd", { t = 0.7 }),
	},
})

add({
	uid = 258,
	id = "picnic_basket",
	name = "Picnic Basket",
	rarity = "Uncommon",
	tags = { "bbq", "food", "wood", "box" },
	hint = "On the checkered blanket.",
	parts = {
		box(36, 20, 24, 0, 10, 0, "#d4a373", { mat = "Wood" }),
		box(36.4, 2, 24.4, 0, 4, 0, "#a98467", { mat = "Wood" }),
		box(36.4, 2, 24.4, 0, 12, 0, "#a98467", { mat = "Wood" }),
		wedge(36, 6, 12, 0, 23, 6, "#d4a373", { mat = "Wood" }),
		wedge(36, 6, 12, 0, 23, -6, "#d4a373", { rot = { 0, 180, 0 }, mat = "Wood" }),
		box(30, 0.4, 24.6, 0, 16, 0, "#e63946", { mat = "Fabric" }),
		box(2, 14, 2, -12, 31, 0, "#7f5539", { mat = "Wood" }),
		box(2, 14, 2, 12, 31, 0, "#7f5539", { mat = "Wood" }),
		box(26, 2, 2, 0, 38, 0, "#7f5539", { mat = "Wood" }),
	},
})

add({
	uid = 259,
	id = "bicycle",
	name = "Shiny Bicycle",
	rarity = "Rare",
	tags = { "vehicle", "metal", "wheels", "sports" },
	hint = "Leaning against the shed.",
	parts = (function()
		local out = {}
		for _, z in { -30, 30 } do
			table.insert(out, cylX(46, 2.4, 0, 23, z, "#2b2d42"))
			table.insert(out, cylX(40, 2.6, 0, 23, z, "#e9ecef", { t = 0.4 }))
			table.insert(out, cylX(6, 3, 0, 23, z, CHROME, { mat = "Metal" }))
		end
		table.insert(out, box(2.6, 2.6, 50, 0, 40, 0, "#06d6a0", { rot = { -8, 0, 0 } }))
		table.insert(out, box(2.6, 34, 2.6, 0, 32, -8, "#06d6a0", { rot = { 20, 0, 0 } }))
		table.insert(out, box(2.6, 30, 2.6, 0, 36, 24, "#06d6a0", { rot = { -15, 0, 0 } }))
		table.insert(out, blob(8, 3, 12, 0, 50, -12, "#2b2d42"))
		table.insert(out, box(20, 2, 2, 0, 52, 26, CHROME, { mat = "Metal" }))
		table.insert(out, box(8, 8, 8, 0, 44, 30, "#d4a373", { mat = "Wood" }))
		return out
	end)(),
})

add({
	uid = 260,
	id = "doghouse",
	name = "Doghouse",
	rarity = "Uncommon",
	tags = { "wood", "house", "dog" },
	hint = "Rover's place. Rover is out.",
	parts = {
		box(60, 50, 60, 0, 25, 0, "#e76f51", { mat = "Wood" }),
		wedge(66, 26, 34, 0, 63, 16, "#264653", { mat = "Wood" }),
		wedge(66, 26, 34, 0, 63, -16, "#264653", { rot = { 0, 180, 0 }, mat = "Wood" }),
		box(26, 32, 2, 0, 16, 30.2, "#3d2b1f"),
		blob(26, 26, 2, 0, 32, 30.2, "#3d2b1f"),
		box(22, 6, 1, 0, 56, 30.6, "#fefae0", { mat = "Wood" }),
		cyl(18, 6, 26, 3, 34, "#adb5bd", { mat = "Metal" }),
		cyl(14, 1, 26, 6.2, 34, "#a0673a"),
	},
})

add({
	uid = 261,
	id = "paddling_pool",
	name = "Paddling Pool",
	rarity = "Uncommon",
	tags = { "toy", "summer", "plastic", "water", "round" },
	hint = "Splash zone.",
	fill = 0.4,
	parts = {
		cyl(120, 14, 0, 7, 0, "#4cc9f0"),
		cylX(10, 10, 0, 14, 0, "#4cc9f0", { t = 1 }),
		cyl(112, 10, 0, 6, 0, "#a2d2ff", { mat = "Glass", t = 0.3 }),
		cyl(124, 4, 0, 14, 0, "#ff70a6"),
		blob(18, 6, 18, 30, 12, 20, "#ffd60a"),
	},
})

add({
	uid = 262,
	id = "garden_bench",
	name = "Garden Bench",
	rarity = "Common",
	tags = { "furniture", "wood", "garden" },
	hint = "Under the oak.",
	parts = {
		box(120, 4, 30, 0, 40, 0, WOOD, { mat = "Wood" }),
		box(120, 26, 4, 0, 62, -14, WOOD, { mat = "Wood" }),
		box(4, 40, 30, -54, 20, 0, "#2b2d42", { mat = "Metal" }),
		box(4, 40, 30, 54, 20, 0, "#2b2d42", { mat = "Metal" }),
		box(4, 30, 4, -54, 62, -14, "#2b2d42", { mat = "Metal" }),
		box(4, 30, 4, 54, 62, -14, "#2b2d42", { mat = "Metal" }),
	},
})

add({
	uid = 263,
	id = "lawn_mower",
	name = "Lawn Mower",
	rarity = "Uncommon",
	tags = { "garden", "metal", "wheels", "tool", "vehicle" },
	hint = "Parked by the shed.",
	parts = {
		box(50, 16, 56, 0, 16, 0, "#e63946", { mat = "Metal" }),
		blob(30, 14, 30, 0, 28, -4, "#2b2d42", { mat = "Metal" }),
		cylX(18, 6, -27, 9, 22, "#2b2d42"),
		cylX(18, 6, 27, 9, 22, "#2b2d42"),
		cylX(18, 6, -27, 9, -22, "#2b2d42"),
		cylX(18, 6, 27, 9, -22, "#2b2d42"),
		box(3, 60, 3, -18, 40, -46, CHROME, { rot = { -40, 0, 0 }, mat = "Metal" }),
		box(3, 60, 3, 18, 40, -46, CHROME, { rot = { -40, 0, 0 }, mat = "Metal" }),
		box(40, 4, 4, 0, 62, -66, "#2b2d42"),
		box(30, 20, 30, 0, 8, -26, "#38b000", { t = 0.2 }),
	},
})

-- LANDMARK ------------------------------------------------------------------------------------

add({
	uid = 299,
	id = "treehouse_oak",
	name = "The Treehouse Oak",
	rarity = "Epic",
	tags = { "tree", "wood", "landmark", "house", "nature" },
	hint = "The Backyard's landmark. Roll it up in the Final Roll!",
	landmark = true,
	fill = 0.45,
	parts = (function()
		local out = {
			cyl(44, 150, 0, 75, 0, "#7f5539", { mat = "Wood" }),
			cyl(60, 14, 0, 7, 0, "#6f4518", { mat = "Wood" }),
			blob(150, 90, 150, 0, 180, 0, "#52b788", { mat = "Grass" }),
			blob(100, 70, 100, -50, 160, 40, "#40916c", { mat = "Grass" }),
			blob(100, 70, 100, 55, 165, -30, "#74c69d", { mat = "Grass" }),
			blob(80, 60, 80, 20, 225, 20, "#95d5b2", { mat = "Grass" }),
			box(80, 4, 70, 0, 110, 10, WOOD, { mat = "Wood" }),
			box(60, 36, 50, 0, 130, 10, "#e9c46a", { mat = "Wood" }),
			wedge(66, 20, 30, 0, 158, 22, "#e76f51", { mat = "Wood" }),
			wedge(66, 20, 30, 0, 158, -2, "#e76f51", { rot = { 0, 180, 0 }, mat = "Wood" }),
			box(16, 20, 1, 0, 126, 35.5, "#3d2b1f"),
			box(10, 10, 1, -20, 134, 35.5, "#a2d2ff", { mat = "Glass" }),
			box(4, 110, 4, -14, 55, 38, WOOD_DARK, { mat = "Wood" }),
			box(4, 110, 4, 14, 55, 38, WOOD_DARK, { mat = "Wood" }),
			box(28, 2, 3, 0, 30, 38, WOOD_DARK, { mat = "Wood" }),
			box(28, 2, 3, 0, 60, 38, WOOD_DARK, { mat = "Wood" }),
			box(28, 2, 3, 0, 90, 38, WOOD_DARK, { mat = "Wood" }),
			ball(8, 40, 140, 70, "#e63946"),
			ball(8, -60, 150, -20, "#e63946"),
		}
		return out
	end)(),
})

return P
