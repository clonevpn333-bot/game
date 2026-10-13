--!nonstrict
-- Player profiles with session locking. Every write goes through UpdateAsync:
--   * load claims a lock { job, t }; if another live server holds it (player just hopped), we
--     retry for a while, then take over a lock older than SessionLockTimeout;
--   * saves only write while we still own the lock, so a server that lost it can never clobber
--     newer data;
--   * leaving / shutdown saves and releases the lock; autosave runs every AutosaveInterval.
-- In Studio without API access (or if DataStores are down) profiles live in memory for the session
-- and the player is told progress won't be saved.

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Signal = require(Shared.Util.Signal)
local Profile = require(Shared.Logic.Profile)
local Tuning = require(Shared.Config.Tuning)

local PlayerDataService = {}
PlayerDataService.Loaded = Signal.new() -- (player, data)
PlayerDataService.StardustChanged = Signal.new() -- (player, newTotal, delta, reason)

local STORE_NAME = "RTW_Profiles_v1"
local JOB_ID = if game.JobId ~= "" then game.JobId else ("studio-" .. HttpService:GenerateGUID(false))

local services
local store: GlobalDataStore? = nil
local memoryMode = false
local profiles: { [Player]: { data: { [string]: any }, dirty: boolean, joinedAt: number, saving: boolean } } = {}
local loading: { [Player]: boolean } = {}
local syncQueued: { [Player]: boolean } = {}
local closing = false

function PlayerDataService:init(s)
	services = s
end

local function keyFor(userId: number): string
	return "u_" .. tostring(userId)
end

local function openStore()
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok and result then
		-- A cheap read proves API access (Studio without "Enable Studio Access to API Services" fails here).
		local probeOk = pcall(function()
			(result :: GlobalDataStore):GetAsync("__probe")
		end)
		if probeOk then
			store = result
			return
		end
	end
	memoryMode = true
	warn("[Data] DataStores unavailable; profiles are kept in memory for this session only.")
end

-- LOAD -------------------------------------------------------------------------------------------

local function claim(userId: number, steal: boolean): (boolean, any, string?)
	local key = keyFor(userId)
	local lockedBy = nil
	local claimed = nil
	local ok, err = pcall(function()
		(store :: GlobalDataStore):UpdateAsync(key, function(old)
			local record = if type(old) == "table" then old else {}
			local lock = record.lock
			local now = os.time()
			lockedBy, claimed = nil, nil
			if type(lock) == "table" and lock.job ~= JOB_ID and type(lock.t) == "number" then
				local fresh = now - lock.t < Tuning.Data.SessionLockTimeout
				if fresh and not steal then
					lockedBy = lock.job
					return nil -- abort; someone else is still using this profile
				end
			end
			record.lock = { job = JOB_ID, t = now }
			claimed = record -- the transform's input is the authoritative stored value
			return record
		end)
	end)
	if not ok then
		return false, nil, "error: " .. tostring(err)
	end
	if lockedBy then
		return false, nil, "locked"
	end
	return true, claimed, nil
end

local function loadProfile(player: Player)
	if loading[player] or profiles[player] then
		return
	end
	loading[player] = true
	local data
	if memoryMode then
		data = Profile.reconcile(nil)
	else
		local attempts = Tuning.Data.LoadRetries
		for attempt = 1, attempts do
			if not player.Parent then
				loading[player] = nil
				return
			end
			-- Last attempt takes over a lock the other server never released.
			local ok, record, reason = claim(player.UserId, attempt == attempts)
			if ok then
				data = Profile.reconcile(type(record) == "table" and record.data or nil)
				break
			end
			warn(string.format("[Data] load %s attempt %d/%d failed: %s", player.Name, attempt, attempts, tostring(reason)))
			task.wait(if reason == "locked" then 4 else math.min(2 ^ attempt, 10))
		end
	end
	loading[player] = nil
	if not player.Parent then
		return
	end
	if not data then
		-- DataStores are failing hard. Let them play on a temporary profile rather than kicking.
		data = Profile.reconcile(nil)
		data.temporary = true
		Net.fire("Toast", player, "warning", { text = "⚠️ Couldn't load your save. Progress this session won't be kept." })
	end
	local now = os.time()
	if data.firstJoin == 0 then
		data.firstJoin = now
	end
	data.lastJoin = now
	profiles[player] = { data = data, dirty = true, joinedAt = os.clock(), saving = false }
	if memoryMode then
		Net.fire("Toast", player, "warning", { text = "🧪 Studio test: progress isn't saved (enable API access to test saving)." })
	end
	PlayerDataService.Loaded:Fire(player, data)
	PlayerDataService:sync(player)
end

-- SAVE -------------------------------------------------------------------------------------------

local function save(player: Player, release: boolean): boolean
	local entry = profiles[player]
	if not entry or memoryMode or entry.data.temporary then
		return true
	end
	if entry.saving and not release then
		return false
	end
	entry.saving = true
	local data = entry.data
	data.stats.playSeconds = math.floor(data.stats.playSeconds + (os.clock() - entry.joinedAt))
	entry.joinedAt = os.clock()
	local lost = false
	local success = false
	for attempt = 1, Tuning.Data.SaveRetries do
		local ok, err = pcall(function()
			(store :: GlobalDataStore):UpdateAsync(keyFor(player.UserId), function(old)
				local record = if type(old) == "table" then old else {}
				local lock = record.lock
				if type(lock) == "table" and lock.job ~= JOB_ID then
					lost = true
					return nil -- another server owns this profile now; never overwrite it
				end
				record.data = data
				record.saved = os.time()
				record.lock = if release then nil else { job = JOB_ID, t = os.time() }
				return record
			end)
		end)
		if ok then
			success = not lost
			break
		end
		warn(string.format("[Data] save %s attempt %d failed: %s", player.Name, attempt, tostring(err)))
		task.wait(math.min(2 ^ attempt, 8))
	end
	if lost then
		warn("[Data] lost session lock for " .. player.Name .. "; not saving")
	end
	entry.saving = false
	if success then
		entry.dirty = false
	end
	return success
end

-- PUBLIC API -------------------------------------------------------------------------------------

function PlayerDataService:getLoaded(player: any): { [string]: any }?
	if not Net.isPlayer(player) then
		return nil
	end
	local entry = profiles[player]
	return entry and entry.data or nil
end

function PlayerDataService:waitLoaded(player: Player, timeout: number?): { [string]: any }?
	local deadline = os.clock() + (timeout or 30)
	while player.Parent and os.clock() < deadline do
		local data = self:getLoaded(player)
		if data then
			return data
		end
		task.wait(0.2)
	end
	return nil
end

function PlayerDataService:isMemoryMode(): boolean
	return memoryMode
end

-- Send the client a fresh view of its profile. Coalesced and capped at SYNC_INTERVAL per player
-- (a burst of discoveries or claims becomes one message).
local SYNC_INTERVAL = 0.5
local lastSync: { [Player]: number } = {}

function PlayerDataService:sync(player: Player)
	if syncQueued[player] then
		return
	end
	syncQueued[player] = true
	local delaySeconds = math.max(0, (lastSync[player] or 0) + SYNC_INTERVAL - os.clock())
	task.delay(delaySeconds, function()
		syncQueued[player] = nil
		local entry = profiles[player]
		if entry and player.Parent then
			lastSync[player] = os.clock()
			Net.fire("ProfileSync", player, Profile.clientView(entry.data))
		end
	end)
end

-- Mutate a profile safely. fn(data) may return false to signal "no change".
function PlayerDataService:update(player: Player, fn: (data: { [string]: any }) -> any): any
	local entry = profiles[player]
	if not entry then
		return nil
	end
	local result = fn(entry.data)
	if result ~= false then
		entry.dirty = true
		self:sync(player)
	end
	return result
end

-- For in-place edits made elsewhere that should be saved but not synced right away.
function PlayerDataService:markDirty(player: Player)
	local entry = profiles[player]
	if entry then
		entry.dirty = true
	end
end

function PlayerDataService:grantStardust(player: any, amount: number, reason: string): number?
	if not Net.isPlayer(player) then
		return nil
	end
	amount = math.floor(amount)
	if amount <= 0 then
		return nil
	end
	local total = self:update(player, function(data)
		data.stardust += amount
		data.totalStardust += amount
		return data.stardust
	end)
	if total then
		self.StardustChanged:Fire(player, total, amount, reason)
		if services.AnalyticsService and services.AnalyticsService.economy then
			services.AnalyticsService:economy(player, "Source", "Stardust", amount, total, reason)
		end
	end
	return total
end

-- Returns true and deducts if the player can afford it.
function PlayerDataService:spendStardust(player: Player, amount: number, reason: string): boolean
	local spent = self:update(player, function(data)
		if amount < 0 or data.stardust < amount then
			return false
		end
		data.stardust -= amount
		return true
	end)
	if spent then
		local data = self:getLoaded(player)
		self.StardustChanged:Fire(player, data.stardust, -amount, reason)
		if services.AnalyticsService and services.AnalyticsService.economy then
			services.AnalyticsService:economy(player, "Sink", "Stardust", amount, data.stardust, reason)
		end
	end
	return spent == true
end

function PlayerDataService:recordRound(player: Player, stats, awards: number)
	self:update(player, function(data)
		local s = data.stats
		s.rounds += 1
		s.absorbed += stats.absorbed or 0
		s.playersRolled += stats.playersRolled or 0
		s.timesRolled += stats.timesRolled or 0
		s.discoveries += stats.discoveries or 0
		s.biggest = math.max(s.biggest, stats.peakDiameter or stats.finalDiameter or 0)
		local place = stats.placement or 99
		if place == 1 then
			s.wins += 1
		end
		if place <= 3 then
			s.top3 += 1
		end
		s.awards = (s.awards or 0) + awards
	end)
end

function PlayerDataService:saveNow(player: Player): boolean
	return save(player, false)
end

-- LIFECYCLE --------------------------------------------------------------------------------------

local opt = Guard.optional
local SETTINGS_GUARD = Guard.shape({
	music = opt(Guard.number(0, 1)),
	sfx = opt(Guard.number(0, 1)),
	quality = opt(Guard.oneOf({ "Auto", "Low", "Medium", "High" })),
	cameraSensitivity = opt(Guard.number(0.2, 3)),
	reducedMotion = opt(Guard.boolean()),
	colorblind = opt(Guard.boolean()),
	autoSteer = opt(Guard.boolean()),
	shake = opt(Guard.number(0, 2)),
})

function PlayerDataService:start()
	openStore()
	Net.action("SaveSettings", SETTINGS_GUARD, function(player, payload)
		return self:update(player, function(data)
			for k, v in payload do
				data.settings[k] = v
			end
			return next(payload) ~= nil
		end) == true
	end, 6)
	Net.action("CompleteTutorial", Guard.optional(Guard.boolean()), function(player)
		return self:update(player, function(data)
			if data.tutorialDone then
				return false
			end
			data.tutorialDone = true
			return true
		end) == true
	end, 2)

	Players.PlayerAdded:Connect(function(player)
		task.spawn(loadProfile, player)
	end)
	for _, player in Players:GetPlayers() do
		task.spawn(loadProfile, player)
	end
	Players.PlayerRemoving:Connect(function(player)
		if closing then
			return -- BindToClose handles everyone
		end
		task.spawn(function()
			save(player, true)
			profiles[player] = nil
			syncQueued[player] = nil
			lastSync[player] = nil
		end)
	end)

	task.spawn(function()
		while true do
			task.wait(Tuning.Data.AutosaveInterval)
			for player, entry in profiles do
				if entry.dirty and player.Parent then
					task.spawn(save, player, false)
					task.wait(0.5) -- spread requests across the budget
				end
			end
		end
	end)

	game:BindToClose(function()
		closing = true
		if memoryMode then
			return
		end
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				save(player, true)
				pending -= 1
			end)
		end
		local deadline = os.clock() + 25
		while pending > 0 and os.clock() < deadline do
			task.wait(0.1)
		end
	end)
end

return PlayerDataService
