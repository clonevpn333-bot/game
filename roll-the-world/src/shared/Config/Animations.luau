--!strict
-- Roblox-owned default avatar animation ids (the same ones the default Animate script uses),
-- which every experience may play. Keyed by rig type.

local Animations = {
	R15 = {
		Idle = "rbxassetid://507766388",
		Run = "rbxassetid://507767714",
		Walk = "rbxassetid://507777826",
		Fall = "rbxassetid://507767968",
		Jump = "rbxassetid://507765000",
		Wave = "rbxassetid://507770239",
		Point = "rbxassetid://507770453",
		Cheer = "rbxassetid://507770677",
		Laugh = "rbxassetid://507770818",
		Dance1 = "rbxassetid://507771019",
		Dance2 = "rbxassetid://507776043",
		Dance3 = "rbxassetid://507777268",
		Sit = "rbxassetid://2506281703",
	},
	R6 = {
		Idle = "rbxassetid://180435571",
		Run = "rbxassetid://180426354",
		Walk = "rbxassetid://180426354",
		Fall = "rbxassetid://180436148",
		Jump = "rbxassetid://125750702",
		Wave = "rbxassetid://128777973",
		Point = "rbxassetid://128853357",
		Cheer = "rbxassetid://129423030",
		Laugh = "rbxassetid://129423131",
		Dance1 = "rbxassetid://182435998",
		Dance2 = "rbxassetid://182436842",
		Dance3 = "rbxassetid://182436935",
		Sit = "rbxassetid://178130996",
	},
}

-- Emote wheel entries. `anim` keys into the table above; `pack` gates premium packs.
Animations.Emotes = {
	{ id = "wave", name = "Wave", anim = "Wave", icon = "👋", pack = "base" },
	{ id = "cheer", name = "Cheer", anim = "Cheer", icon = "🙌", pack = "base" },
	{ id = "laugh", name = "Laugh", anim = "Laugh", icon = "😂", pack = "base" },
	{ id = "point", name = "Point", anim = "Point", icon = "👉", pack = "base" },
	{ id = "dance1", name = "Boogie", anim = "Dance1", icon = "🕺", pack = "party" },
	{ id = "dance2", name = "Shuffle", anim = "Dance2", icon = "💃", pack = "party" },
	{ id = "dance3", name = "Groove", anim = "Dance3", icon = "🪩", pack = "party" },
}

-- Quick-reaction stickers shown above heads (wordless communication for chat-restricted players).
Animations.Stickers = {
	{ id = "heart", icon = "❤️" },
	{ id = "lol", icon = "😂" },
	{ id = "wow", icon = "😮" },
	{ id = "gg", icon = "👍" },
	{ id = "star", icon = "⭐" },
	{ id = "angry", icon = "😤" },
	{ id = "cool", icon = "😎" },
	{ id = "party", icon = "🎉" },
}

return Animations
