--!nonstrict
-- Real-looking avatars for bots. Bots should read as other kids playing, not as robots, so they
-- wear real Roblox avatars:
--   1. avatars of people who have played this game before (a rolling list saved in a DataStore,
--      never anyone in the current server), and
--   2. random Roblox accounts, keeping only ones that are actually dressed up (clothes or
--      accessories), so nobody shows up as a grey default.
-- Only the avatar's look is used; names are generated separately (BotNames), never the account's.
-- Descriptions are prefetched in the background so spawning a bot never waits on the web.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local AvatarPool = {}

local STORE_KEY = "recent"
local RECENT_CAP = 300
local CACHE_TARGET = 18
local MAX_RANDOM_ID = 4_000_000_000

local cache: { { desc: HumanoidDescription, userId: number } } = {}
local recent: { number } = {}
local recentDirty = false
local used: { [number]: boolean } = {}
local store = nil
local started = false
local lastFetched = 0

local function dressed(desc: HumanoidDescription): boolean
	local clothes = desc.Shirt ~= 0 or desc.Pants ~= 0 or desc.GraphicTShirt ~= 0
	local accessories = desc.HatAccessory ~= "" or desc.HairAccessory ~= "" or desc.FaceAccessory ~= ""
		or desc.BackAccessory ~= "" or desc.ShouldersAccessory ~= "" or desc.NeckAccessory ~= ""
	local layered = false
	local ok, list = pcall(function()
		return desc:GetAccessories(true)
	end)
	if ok and list and #list > 0 then
		layered = true
	end
	return (clothes and (accessories or layered)) or (layered and #list >= 2)
end

local function inServer(userId: number): boolean
	return Players:GetPlayerByUserId(userId) ~= nil
end

local function fetch(userId: number): HumanoidDescription?
	if used[userId] or inServer(userId) then
		return nil
	end
	local ok, desc = pcall(function()
		return Players:GetHumanoidDescriptionFromUserId(userId)
	end)
	if ok and desc and dressed(desc) then
		used[userId] = true
		lastFetched = userId
		return desc
	end
	return nil
end

local function openStore()
	local ok, s = pcall(function()
		return DataStoreService:GetDataStore("RTW_AvatarPool_v1")
	end)
	if not ok then
		return
	end
	local readOk, list = pcall(function()
		return s:GetAsync(STORE_KEY)
	end)
	if readOk then
		store = s
		if type(list) == "table" then
			for _, id in list do
				if type(id) == "number" then
					table.insert(recent, id)
				end
			end
		end
	end
end

local function remember(userId: number)
	if userId <= 0 or table.find(recent, userId) then
		return
	end
	table.insert(recent, userId)
	while #recent > RECENT_CAP do
		table.remove(recent, 1)
	end
	recentDirty = true
end

local function saveRecent()
	if not store or not recentDirty then
		return
	end
	recentDirty = false
	local mine = table.clone(recent)
	pcall(function()
		store:UpdateAsync(STORE_KEY, function(old)
			local merged = {}
			local seen = {}
			for _, list in { if type(old) == "table" then old else {}, mine } do
				for _, id in list do
					if type(id) == "number" and not seen[id] then
						seen[id] = true
						table.insert(merged, id)
					end
				end
			end
			while #merged > RECENT_CAP do
				table.remove(merged, 1)
			end
			return merged
		end)
	end)
end

local function refill()
	local attempts = 0
	while #cache < CACHE_TARGET and attempts < 40 do
		attempts += 1
		local desc = nil
		-- Prefer real players of this game; mix in random dressed accounts for variety.
		if #recent > 0 and math.random() < 0.7 then
			desc = fetch(recent[math.random(1, #recent)])
		else
			desc = fetch(math.random(1_000_000, MAX_RANDOM_ID))
		end
		if desc then
			table.insert(cache, { desc = desc, userId = lastFetched })
		end
		task.wait(if #cache < 6 then 0.15 else 0.5) -- quick at first, then gentle on the web endpoints
	end
end

function AvatarPool.start()
	if started then
		return
	end
	started = true
	task.spawn(function()
		openStore()
		for _, p in Players:GetPlayers() do
			remember(p.UserId)
		end
		while true do
			refill()
			saveRecent()
			task.wait(20)
		end
	end)
	Players.PlayerAdded:Connect(function(player)
		remember(player.UserId)
	end)
end

-- A ready description (and the account it came from, for headshot thumbnails), or nil if none
-- is cached yet (caller falls back).
function AvatarPool.take(): (HumanoidDescription?, number?)
	if #cache == 0 then
		return nil, nil
	end
	local entry = table.remove(cache, math.random(1, #cache))
	return entry.desc, entry.userId
end

function AvatarPool.size(): number
	return #cache
end

return AvatarPool
