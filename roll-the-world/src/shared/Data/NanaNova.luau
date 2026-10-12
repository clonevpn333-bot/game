--!strict
-- Nana Nova: the tiny, cheerful cosmic grandma who knits galaxies. Built from parts (recipe data)
-- so she renders anywhere: hub, launch screen viewport, request board. Origin = feet centre.

local S = require(script.Parent.Props.Shapes)
local box, ball, blob, cyl, wedge = S.box, S.ball, S.blob, S.cyl, S.wedge

local SKIN = "#f6d5c1"
local DRESS = "#7b5cd6"
local SHAWL = "#c8b6ff"
local HAIR = "#f1f1f6"
local GOLD = "#ffd166"
local INK = "#2a1f3d"

local NanaNova = {}

NanaNova.Parts = (function()
	local p = {
		-- slippers
		blob(1.4, 0.7, 2.0, -0.7, 0.35, 0.2, "#ff8fab"),
		blob(1.4, 0.7, 2.0, 0.7, 0.35, 0.2, "#ff8fab"),
		ball(0.5, -0.7, 0.75, 1.0, "#ffffff"),
		ball(0.5, 0.7, 0.75, 1.0, "#ffffff"),
		-- dress (a soft bell)
		cyl(4.6, 1.2, 0, 1.2, 0, DRESS, { tag = "body" }),
		blob(4.4, 4.2, 4.0, 0, 3.2, 0, DRESS, { tag = "body" }),
		blob(3.6, 2.0, 3.2, 0, 5.0, 0, DRESS, { tag = "body" }),
		-- star-speckled shawl
		blob(4.6, 1.8, 3.8, 0, 5.4, 0, SHAWL, { tag = "body", mat = "Fabric" }),
		wedge(3.2, 1.8, 1.0, 0, 4.2, 1.6, SHAWL, { tag = "body", mat = "Fabric", rot = { 0, 180, 0 } }),
		ball(0.3, -1.2, 5.6, 1.6, GOLD, { neon = true, tag = "body" }),
		ball(0.25, 1.0, 5.2, 1.7, GOLD, { neon = true, tag = "body" }),
		ball(0.3, 0.2, 4.4, 1.9, GOLD, { neon = true, tag = "body" }),
		ball(0.22, 1.8, 5.8, 0.4, GOLD, { neon = true, tag = "body" }),
		-- head
		ball(3.2, 0, 7.6, 0.1, SKIN, { tag = "head" }),
		ball(0.7, 0, 7.4, 1.65, "#f2b8a2", { tag = "head" }),
		ball(0.7, -1.0, 7.0, 1.3, "#ffb3c1", { tag = "head", t = 0.2 }),
		ball(0.7, 1.0, 7.0, 1.3, "#ffb3c1", { tag = "head", t = 0.2 }),
		blob(0.9, 0.25, 0.3, 0, 6.6, 1.55, "#c0566b", { tag = "head" }),
		-- glasses
		cyl(0.95, 0.12, -0.6, 7.9, 1.55, GOLD, { rot = { 90, 0, 0 }, tag = "head", mat = "Foil" }),
		cyl(0.95, 0.12, 0.6, 7.9, 1.55, GOLD, { rot = { 90, 0, 0 }, tag = "head", mat = "Foil" }),
		cyl(0.75, 0.13, -0.6, 7.9, 1.57, "#e8f6ff", { rot = { 90, 0, 0 }, tag = "head", mat = "Glass", t = 0.3 }),
		cyl(0.75, 0.13, 0.6, 7.9, 1.57, "#e8f6ff", { rot = { 90, 0, 0 }, tag = "head", mat = "Glass", t = 0.3 }),
		ball(0.3, -0.6, 7.95, 1.62, INK, { tag = "head" }),
		ball(0.3, 0.6, 7.95, 1.62, INK, { tag = "head" }),
		box(0.3, 0.08, 0.1, 0, 7.95, 1.6, GOLD, { tag = "head" }),
		-- hair + bun + star pin
		blob(3.5, 2.0, 3.4, 0, 8.6, -0.1, HAIR, { tag = "head", mat = "Fabric" }),
		ball(1.8, 0, 9.9, -0.5, HAIR, { tag = "head", mat = "Fabric" }),
		ball(0.7, 0.9, 10.3, -0.3, GOLD, { neon = true, tag = "head" }),
		-- arms
		blob(1.0, 2.6, 1.0, -2.1, 4.8, 0.6, SHAWL, { rot = { -40, 0, 20 }, tag = "arm" }),
		blob(1.0, 2.6, 1.0, 2.1, 4.8, 0.6, SHAWL, { rot = { -40, 0, -20 }, tag = "arm" }),
		ball(0.8, -1.4, 4.0, 1.8, SKIN, { tag = "arm" }),
		ball(0.8, 1.4, 4.0, 1.8, SKIN, { tag = "arm" }),
		-- knitting needles + the galaxy she's knitting
		cyl(0.16, 3.6, -0.7, 4.6, 2.2, GOLD, { rot = { 0, 0, -50 }, tag = "needle", mat = "Foil" }),
		cyl(0.16, 3.6, 0.7, 4.6, 2.2, GOLD, { rot = { 0, 0, 50 }, tag = "needle", mat = "Foil" }),
		ball(2.0, 0, 3.6, 2.4, "#2b2160", { mat = "Glass", tag = "yarn" }),
		ball(0.35, 0.4, 3.9, 3.3, "#fff3b0", { neon = true, tag = "yarn" }),
		ball(0.25, -0.5, 3.4, 3.3, "#c8b6ff", { neon = true, tag = "yarn" }),
		blob(3.0, 0.15, 3.0, 0, 3.6, 2.4, "#ffafcc", { rot = { 20, 0, 15 }, tag = "yarn", neon = true }),
		-- trailing yarn thread
		box(0.12, 0.12, 2.2, 0.6, 2.6, 3.2, "#ffafcc", { rot = { 30, 20, 0 }, neon = true }),
	}
	return p
end)()

-- Her rocking chair (hub decor).
NanaNova.Chair = {
	box(7, 0.8, 6, 0, 4.2, 0, "#8c5a2e", { mat = "Wood" }),
	box(7, 8, 0.8, 0, 8.6, -2.8, "#8c5a2e", { mat = "Wood" }),
	box(6.4, 1.2, 5.2, 0, 5.0, 0.2, "#c8b6ff", { mat = "Fabric" }),
	box(0.8, 4, 0.8, -3, 2.2, 2.4, "#6f4518", { mat = "Wood" }),
	box(0.8, 4, 0.8, 3, 2.2, 2.4, "#6f4518", { mat = "Wood" }),
	box(0.8, 4, 0.8, -3, 2.2, -2.4, "#6f4518", { mat = "Wood" }),
	box(0.8, 4, 0.8, 3, 2.2, -2.4, "#6f4518", { mat = "Wood" }),
	blob(1, 1, 10, -3, 0.4, 0, "#6f4518", { mat = "Wood" }),
	blob(1, 1, 10, 3, 0.4, 0, "#6f4518", { mat = "Wood" }),
	ball(1.6, 0, 13, -2.8, "#ffd166", { neon = true }),
}

-- Short, wordless-friendly reactions. Icons carry the meaning; text is a bonus.
NanaNova.Lines = {
	greet = { "✨ Hello, dearie! ✨", "🧶 Ready to roll?", "🌟 My sky needs filling!" },
	request = { "🧶 Could you fetch me…", "✨ Oh! I'd love some…", "🌙 Bring Nana…" },
	complete = { "🥰 Wonderful!", "🌟 Just what I needed!", "🧶 You're a star!" },
	launch = { "🚀 Up it goes!", "🌌 Into the sky!", "✨ A brand new planet!" },
	rolled = { "😆 Whoopsie!", "🌀 Round and round!", "💫 Up you get!" },
	legendary = { "😲 My stars!", "🌟 Ooooh, sparkly!", "💖 Treasure!" },
}

return NanaNova
