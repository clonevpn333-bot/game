--!strict
-- Usernames for bots that read like real Roblox kids' names (never a real account's name).

local BotNames = {}

local FIRST = {
	"Pixel", "Noodle", "Sky", "Turbo", "Lil", "Cosmic", "Sneaky", "Mega", "Shadow", "Bubble",
	"Frosty", "Lucky", "Ninja", "Cookie", "Blaze", "Mochi", "Sunny", "Zoom", "Taco", "Panda",
	"Rocket", "Waffle", "Storm", "Kitty", "Dino", "Jelly", "Neon", "Pickle", "Crystal", "Toast",
	"Captain", "Super", "Tiny", "Epic", "Happy", "Silly", "Golden", "Mystic", "Speedy", "Fluffy",
}
local SECOND = {
	"Roller", "Gamer", "King", "Queen", "Bean", "Fox", "Wolf", "Cat", "Pro", "Star", "Muffin",
	"Dragon", "Bunny", "Boi", "Girl", "Kid", "Master", "Nugget", "Ball", "Builder", "Hero",
	"Potato", "Shark", "Owl", "Ghost", "Pop", "Duck", "Tiger", "Wizard", "Blox", "Chef",
}
type Style = (string, string, string) -> string
local STYLES: { Style } = {
	function(a: string, b: string, n: string): string
		return a .. b .. n
	end,
	function(a: string, b: string, n: string): string
		return a .. "_" .. b .. n
	end,
	function(a: string, b: string, _: string): string
		return a .. b
	end,
	function(a: string, b: string, n: string): string
		return string.lower(a .. b) .. n
	end,
	function(a: string, b: string, _: string): string
		return "xX" .. a .. b .. "Xx"
	end,
	function(a: string, b: string, n: string): string
		return a .. b .. "_" .. n
	end,
	function(a: string, b: string, _: string): string
		return "its" .. a .. b
	end,
	function(a: string, b: string, n: string): string
		return "Itz" .. a .. n
	end,
}

function BotNames.generate(taken: { [string]: boolean }?): string
	for _ = 1, 20 do
		local a = FIRST[math.random(1, #FIRST)]
		local b = SECOND[math.random(1, #SECOND)]
		local roll = math.random()
		local n = if roll < 0.35 then tostring(math.random(1, 99)) elseif roll < 0.6 then tostring(math.random(2008, 2017)) else tostring(math.random(100, 9999))
		local name = STYLES[math.random(1, #STYLES)](a, b, n)
		if #name <= 20 and not (taken and taken[name]) then
			return name
		end
	end
	return "Roller" .. math.random(1000, 9999)
end

return BotNames
