--!nonstrict
-- Every launched ball becomes a planet in its owner's personal galaxy: its size, dominant colors,
-- the signature things it rolled up and a generated name. The galaxy keeps your best and most
-- recent planets (plus pinned ones); total galaxy mass only ever grows and unlocks later tiers.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Rng = require(Shared.Util.Rng)
local Profile = require(Shared.Logic.Profile)
local Tuning = require(Shared.Config.Tuning)

local GalaxyService = {}

local services

-- Name parts: a word from the planet's dominant tag, then a cosmic suffix.
local TAG_WORDS = {
	food = { "Snack", "Munch", "Nibble" },
	candy = { "Sugar", "Gumdrop", "Lolly" },
	sweet = { "Honey", "Treacle", "Sprinkle" },
	fruit = { "Juicy", "Berry", "Citrus" },
	metal = { "Chrome", "Clank", "Steel" },
	kitchenware = { "Spoon", "Kettle", "Whisk" },
	critter = { "Critter", "Fuzzy", "Scamper" },
	animal = { "Wild", "Furry", "Paw" },
	toy = { "Toybox", "Blocky", "Squeaky" },
	garden = { "Leafy", "Mossy", "Bloom" },
	plant = { "Sprout", "Fern", "Petal" },
	bbq = { "Smoky", "Sizzle", "Ember" },
	breakfast = { "Pancake", "Toasty", "Sunny" },
	baked = { "Crusty", "Muffin", "Biscuit" },
	drink = { "Fizzy", "Bubbly", "Splash" },
	glass = { "Crystal", "Prism", "Glint" },
	shiny = { "Sparkle", "Glimmer", "Shimmer" },
	colorful = { "Rainbow", "Confetti", "Kaleido" },
	round = { "Roly", "Bouncy", "Orbit" },
	wood = { "Timber", "Oaky", "Knotty" },
	fluffy = { "Fluff", "Cloudy", "Puff" },
	electric = { "Zappy", "Volt", "Buzz" },
}
local GENERIC = { "Wobble", "Jumble", "Clutter", "Mishmash", "Pocket", "Rolly" }
local SUFFIX = { "Prime", "Major", "Minor", "World", "Orb", "-ia", "-tron", "Nova", "Sphere", "IX" }

function GalaxyService:init(s)
	services = s
end

local function topKeys(map: { [string]: number }?, n: number): { string }
	local list = {}
	for k, v in (map or {}) :: { [string]: number } do
		table.insert(list, { k, v })
	end
	table.sort(list, function(a, b)
		if a[2] == b[2] then
			return a[1] < b[1]
		end
		return a[2] > b[2]
	end)
	local out = {}
	for i = 1, math.min(n, #list) do
		out[i] = list[i][1]
	end
	return out
end

local function signatureProps(state, n: number): { number }
	-- Biggest distinct things rolled up (by volume), notable first.
	local best: { [number]: number } = {}
	for _, h in state.history or {} do
		best[h.uid] = math.max(best[h.uid] or 0, h.volume or 0)
	end
	local list = {}
	for uid, vol in best do
		table.insert(list, { uid, vol })
	end
	table.sort(list, function(a, b)
		return a[2] > b[2]
	end)
	local out = {}
	if state.notable then
		table.insert(out, state.notable.uid)
	end
	for _, e in list do
		if #out >= n then
			break
		end
		if not table.find(out, e[1]) then
			table.insert(out, e[1])
		end
	end
	return out
end

function GalaxyService.planetName(tag: string?, seed: number): string
	local rng = Rng.new(seed)
	local words = (tag and TAG_WORDS[tag]) or GENERIC
	local word = words[rng:int(1, #words)]
	local suffix = SUFFIX[rng:int(1, #SUFFIX)]
	if suffix:sub(1, 1) == "-" then
		return word .. suffix:sub(2)
	end
	return word .. " " .. suffix
end

-- Called by RoundService at launch for every ball.
function GalaxyService:createPlanet(state, kitId: string)
	local player = state.player
	if not Net.isPlayer(player) or not player.Parent then
		return nil
	end
	local pds = services.PlayerDataService
	local data = pds and pds:getLoaded(player)
	if not data or state.diameter <= 0 then
		return nil
	end
	-- Finishing place among everyone launching right now.
	local place = 1
	for _, other in services.BallService:all() do
		if other ~= state and other.diameter > state.diameter then
			place += 1
		end
	end
	local comp = state.composition or { tags = {}, colors = {} }
	local tags = topKeys(comp.tags, 6)
	local mainTag = nil
	for _, t in tags do
		if TAG_WORDS[t] then
			mainTag = t
			break
		end
	end
	local id = data.galaxy.nextId
	local planet = {
		id = id,
		t = os.time(),
		kit = kitId,
		tier = services.RoundService.tier.id,
		d = math.floor(state.diameter * 10 + 0.5) / 10,
		colors = topKeys(comp.colors, Tuning.Galaxy.PlanetColors),
		props = signatureProps(state, Tuning.Galaxy.SignatureProps),
		notable = state.notable and state.notable.uid or nil,
		name = GalaxyService.planetName(mainTag, player.UserId % 100000 * 131 + id),
		place = place,
	}
	pds:update(player, function(p)
		p.galaxy.nextId += 1
		p.galaxy.total += 1
		p.galaxy.mass += planet.d
		table.insert(p.galaxy.planets, planet)
		p.galaxy.planets = Profile.trimGalaxy(p.galaxy.planets)
	end)
	Net.fire("PlanetCreated", player, planet)
	return planet
end

local function findPlanet(data, id: number)
	for _, p in data.galaxy.planets do
		if p.id == id then
			return p
		end
	end
	return nil
end

function GalaxyService:start()
	local pds = services.PlayerDataService
	if not pds then
		return
	end
	Net.action("RenamePlanet", Guard.shape({ id = Guard.integer(1, 1e9), name = Guard.string(Tuning.Galaxy.NameMaxLength) }), function(player, payload)
		local data = pds:getLoaded(player)
		local planet = data and findPlanet(data, payload.id)
		if not planet then
			return false, "unknown"
		end
		local raw = payload.name:gsub("^%s+", ""):gsub("%s+$", "")
		if #raw < 2 then
			return false, "short"
		end
		local ok, filtered = pcall(function()
			local result = TextService:FilterStringAsync(raw, player.UserId, Enum.TextFilterContext.PublicChat)
			return result:GetNonChatStringForBroadcastAsync()
		end)
		if not ok then
			return false, "filter"
		end
		pds:update(player, function()
			planet.name = filtered
		end)
		return true, filtered
	end, 1)
	Net.action("PinPlanet", Guard.integer(1, 1e9), function(player, id)
		local data = pds:getLoaded(player)
		local planet = data and findPlanet(data, id)
		if not planet then
			return false, "unknown"
		end
		if not planet.pinned then
			local pinned = 0
			for _, p in data.galaxy.planets do
				if p.pinned then
					pinned += 1
				end
			end
			if pinned >= Tuning.Galaxy.MaxPinned then
				return false, "max_pinned"
			end
		end
		pds:update(player, function()
			planet.pinned = not planet.pinned or nil
		end)
		return true, planet.pinned == true
	end, 3)
end

return GalaxyService
