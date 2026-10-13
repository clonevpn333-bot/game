--!nonstrict
-- Long-term goals that make every round count:
--   * XP after each round -> levels, each with a reward (Stardust; shells and titles at
--     milestones),
--   * personal records per map ("NEW RECORD!"),
--   * achievements (lifetime milestones with Stardust, titles and a shell),
--   * Rolledex sets (themed groups per map; completing one pays out, completing every set on a map
--     earns that map's Master title),
--   * titles you can wear under your name,
--   * global leaderboards (biggest ball ever, highest level) on boards in the hub.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Format = require(Shared.Util.Format)
local Progression = require(Shared.Logic.Progression)
local Titles = require(Shared.Data.Titles)
local Cosmetics = require(Shared.Data.Cosmetics)

local ProgressionService = {}

local services
local boards: { [string]: any } = {} -- { biggest = { rows }, level = { rows } }
local nameCache: { [number]: string } = {}
local lastSubmit: { [Player]: number } = {}

function ProgressionService:init(s)
	services = s
end

local function pds()
	return services.PlayerDataService
end

local function grantShell(player: Player, id: string?): boolean
	if not id or not Cosmetics.ById[id] then
		return false
	end
	local granted = false
	pds():update(player, function(p)
		if p.cosmetics.shells[id] then
			return false
		end
		p.cosmetics.shells[id] = true
		granted = true
		return true
	end)
	return granted
end

local function grantTitle(player: Player, id: string?): boolean
	if not id or not Titles.ById[id] then
		return false
	end
	local granted = false
	pds():update(player, function(p)
		if p.titles[id] then
			return false
		end
		p.titles[id] = true
		granted = true
		return true
	end)
	return granted
end

-- XP + LEVELS -------------------------------------------------------------------------------------

function ProgressionService:addXp(player: Player, amount: number): { any }
	local data = pds():getLoaded(player)
	if not data or amount <= 0 then
		return {}
	end
	local oldLevel = data.level
	pds():update(player, function(p)
		p.xp += math.floor(amount)
		p.level = (Progression.levelFromXp(p.xp))
	end)
	local ups = {}
	for level = oldLevel + 1, data.level do
		local reward = Progression.levelReward(level)
		pds():grantStardust(player, reward.stardust, "LevelUp")
		local entry = { level = level, stardust = reward.stardust }
		if grantShell(player, reward.shell) then
			entry.shell = reward.shell
		end
		if grantTitle(player, reward.title) then
			entry.title = reward.title
		end
		table.insert(ups, entry)
	end
	if #ups > 0 then
		local ball = services.BallService:get(player)
		if ball and ball.part then
			ball.part:SetAttribute("Level", data.level)
		end
	end
	return ups
end

-- ACHIEVEMENTS ------------------------------------------------------------------------------------

function ProgressionService:checkAchievements(player: Player): { any }
	local data = pds():getLoaded(player)
	if not data then
		return {}
	end
	local got = {}
	for _, a in Progression.newAchievements(data) do
		pds():update(player, function(p)
			p.achievements[a.id] = true
		end)
		pds():grantStardust(player, a.stardust, "Achievement")
		local entry = { id = a.id, name = a.name, icon = a.icon, stardust = a.stardust }
		if grantTitle(player, a.title) then
			entry.title = a.title
		end
		if grantShell(player, a.shell) then
			entry.shell = a.shell
		end
		table.insert(got, entry)
		Net.fire("Toast", player, "achievement", entry)
	end
	return got
end

-- SETS --------------------------------------------------------------------------------------------

local function onDiscovered(player: Player, uid: number, _mutation: number, isNew: boolean)
	if not isNew then
		return
	end
	local rolledex = services.RolledexService
	local data = pds():getLoaded(player)
	if not rolledex or not data then
		return
	end
	local has = function(u: number)
		return rolledex:has(player, u)
	end
	for _, set in Progression.setsForUid(uid) do
		local have = Progression.setProgress(set, has)
		local total = #set.uids
		if have >= total and not data.setsClaimed[set.id] then
			pds():update(player, function(p)
				p.setsClaimed[set.id] = true
			end)
			pds():grantStardust(player, set.reward, "SetComplete")
			Net.fire("Toast", player, "setComplete", { name = set.name, icon = set.icon, stardust = set.reward })
			-- Every set on this map done -> the map's Master title.
			local allDone = true
			for _, other in Progression.sets() do
				if other.kitId == set.kitId and not data.setsClaimed[other.id] then
					allDone = false
					break
				end
			end
			local titleId = Titles.ForKit[set.kitId]
			if allDone and titleId and grantTitle(player, titleId) then
				Net.fire("Toast", player, "title", { id = titleId, text = Titles.ById[titleId].text })
			end
		elseif have < total then
			Net.fire("Toast", player, "setProgress", { name = set.name, icon = set.icon, have = have, total = total })
		end
	end
end

-- ROUND END ---------------------------------------------------------------------------------------

local function onRoundEnded(statsList)
	local round = services.RoundService
	local kitId = round.kitId
	local balls = #statsList
	for _, stats in statsList do
		local player = Players:GetPlayerByUserId(stats.userId)
		local data = player and pds():getLoaded(player)
		if not player or not data then
			continue
		end
		local xp, parts = Progression.roundXp({
			finalDiameter = stats.finalDiameter,
			placement = stats.placement or 99,
			players = balls,
			discoveries = stats.discoveries or 0,
			playersRolled = stats.playersRolled or 0,
			requestsDone = stats.requestsCompleted or 0,
		})
		local oldLevel, oldInto, oldNeed = Progression.levelFromXp(data.xp)
		local ups = ProgressionService:addXp(player, xp)
		-- Personal best on this map.
		local best = math.max(stats.peakDiameter or 0, stats.finalDiameter or 0)
		local oldRecord = data.records[kitId]
		local record = nil
		if kitId and best > 0 and (not oldRecord or best > oldRecord) then
			pds():update(player, function(p)
				p.records[kitId] = math.floor(best * 10 + 0.5) / 10
			end)
			if oldRecord then
				record = { old = oldRecord, new = best, kitId = kitId }
			end
		end
		local achievements = ProgressionService:checkAchievements(player)
		local newLevel, newInto, newNeed = Progression.levelFromXp(data.xp)
		Net.fire("Toast", player, "progress", {
			xp = xp,
			parts = parts,
			from = { level = oldLevel, into = oldInto, need = oldNeed },
			to = { level = newLevel, into = newInto, need = newNeed },
			levelUps = ups,
			record = record,
			achievements = #achievements,
		})
		ProgressionService:submitLeaderboards(player)
	end
end

-- LEADERBOARDS ------------------------------------------------------------------------------------

local stores = nil
local function leaderboardStores()
	if stores ~= nil then
		return stores or nil
	end
	if pds():isMemoryMode() then
		stores = false
		return nil
	end
	local ok, result = pcall(function()
		return {
			biggest = DataStoreService:GetOrderedDataStore("RTW_Biggest_v1"),
			level = DataStoreService:GetOrderedDataStore("RTW_XP_v1"),
		}
	end)
	stores = if ok then result else false
	return stores or nil
end

function ProgressionService:submitLeaderboards(player: Player)
	local s = leaderboardStores()
	local data = pds():getLoaded(player)
	if not s or not data then
		return
	end
	if os.clock() - (lastSubmit[player] or 0) < 60 then
		return
	end
	lastSubmit[player] = os.clock()
	task.spawn(function()
		pcall(function()
			s.biggest:SetAsync(tostring(player.UserId), math.floor((data.stats.biggest or 0) * 10))
		end)
		pcall(function()
			s.level:SetAsync(tostring(player.UserId), math.floor(data.xp))
		end)
	end)
end

local function nameFor(userId: number): string
	if nameCache[userId] then
		return nameCache[userId]
	end
	local p = Players:GetPlayerByUserId(userId)
	if p then
		nameCache[userId] = p.DisplayName
		return p.DisplayName
	end
	local ok, name = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)
	nameCache[userId] = if ok and name then name else "Roller"
	return nameCache[userId]
end

local function buildBoard(hub: Instance, cf: CFrame, title: string, color: Color3)
	local board = Instance.new("Part")
	board.Name = "Leaderboard"
	board.Anchored = true
	board.Size = Vector3.new(22, 26, 1.2)
	board.CFrame = cf
	board.Color = Color3.fromRGB(38, 26, 74)
	board.Material = Enum.Material.SmoothPlastic
	board.Parent = hub
	local frame = Instance.new("Part")
	frame.Anchored = true
	frame.CanCollide = false
	frame.Size = Vector3.new(23.4, 27.4, 0.8)
	frame.CFrame = cf * CFrame.new(0, 0, 0.3)
	frame.Color = color
	frame.Material = Enum.Material.Neon
	frame.Parent = hub
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.LightInfluence = 0
	gui.PixelsPerStud = 24
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.Parent = board
	local header = Instance.new("TextLabel")
	header.BackgroundTransparency = 1
	header.Size = UDim2.new(1, 0, 0.12, 0)
	header.Text = title
	header.TextScaled = true
	header.FontFace = Font.new("rbxasset://fonts/families/LuckiestGuy.json")
	header.TextColor3 = color
	header.Parent = gui
	local rows = {}
	for i = 1, 10 do
		local row = Instance.new("TextLabel")
		row.BackgroundTransparency = if i % 2 == 0 then 1 else 0.85
		row.BackgroundColor3 = Color3.new(1, 1, 1)
		row.BorderSizePixel = 0
		row.Position = UDim2.new(0.04, 0, 0.13 + (i - 1) * 0.085, 0)
		row.Size = UDim2.new(0.92, 0, 0.08, 0)
		row.TextScaled = true
		row.FontFace = Font.new("rbxasset://fonts/families/FredokaOne.json")
		row.TextColor3 = Color3.new(1, 1, 1)
		row.TextXAlignment = Enum.TextXAlignment.Left
		row.Text = ""
		row.Parent = gui
		rows[i] = row
	end
	return rows
end

local function refreshBoards()
	local s = leaderboardStores()
	local cm = services.RoundService.tier.cmPerStud
	local function fill(rows, store, format)
		if not rows then
			return
		end
		if not store then
			-- Studio / no DataStores: show who's here so the board isn't empty.
			local list = {}
			for _, p in Players:GetPlayers() do
				local data = pds():getLoaded(p)
				if data then
					table.insert(list, { key = p.UserId, value = if format == "size" then (data.stats.biggest or 0) * 10 else data.xp })
				end
			end
			table.sort(list, function(a, b)
				return a.value > b.value
			end)
			for i, row in rows do
				local e = list[i]
				row.Text = if e then string.format("  %d. %s  —  %s", i, nameFor(e.key), if format == "size" then Format.size(e.value / 10, cm) else "Lv " .. (Progression.levelFromXp(e.value))) else ""
			end
			return
		end
		local ok, pages = pcall(function()
			return store:GetSortedAsync(false, 10)
		end)
		if not ok or not pages then
			return
		end
		local entries = pages:GetCurrentPage()
		for i, row in rows do
			local e = entries[i]
			if e then
				local userId = tonumber(e.key) or 0
				local value = e.value
				row.Text = string.format("  %d. %s  —  %s", i, nameFor(userId), if format == "size" then Format.size(value / 10, cm) else "Lv " .. (Progression.levelFromXp(value)))
			else
				row.Text = ""
			end
		end
	end
	fill(boards.biggest, s and s.biggest, "size")
	fill(boards.level, s and s.level, "level")
end

-- LIFECYCLE ---------------------------------------------------------------------------------------

function ProgressionService:start()
	if not services.PlayerDataService then
		return
	end
	Net.action("EquipTitle", Guard.string(32), function(player, id)
		local data = pds():getLoaded(player)
		if not data or not data.titles[id] then
			return false, "locked"
		end
		pds():update(player, function(p)
			p.title = id
		end)
		local ball = services.BallService:get(player)
		local def = Titles.ById[id]
		if ball and ball.part and def then
			ball.part:SetAttribute("Title", def.text)
			ball.part:SetAttribute("TitleColor", def.color)
		end
		return true
	end, 4)
	services.RoundService.RoundEnded:Connect(function(statsList)
		task.spawn(onRoundEnded, statsList)
	end)
	if services.RolledexService then
		services.RolledexService.Discovered:Connect(onDiscovered)
	end
	pds().Loaded:Connect(function(player, data)
		-- Level is derived from XP (repairs older saves) and catch-up achievements.
		local level = Progression.levelFromXp(data.xp)
		if level ~= data.level then
			pds():update(player, function(p)
				p.level = level
			end)
		end
		task.delay(5, function()
			if player.Parent then
				ProgressionService:checkAchievements(player)
			end
		end)
	end)
	-- Hub leaderboards.
	task.spawn(function()
		local hub = services.HubService and services.HubService.model
		local tries = 0
		while not hub and tries < 30 do
			task.wait(1)
			tries += 1
			hub = services.HubService and services.HubService.model
		end
		if hub then
			local o = services.HubService.ORIGIN
			boards.biggest = buildBoard(hub, CFrame.lookAt(o + Vector3.new(-44, 15, -100), o + Vector3.new(-44, 15, 0)), "🏆 BIGGEST BALLS EVER", Color3.fromRGB(255, 214, 64))
			boards.level = buildBoard(hub, CFrame.lookAt(o + Vector3.new(44, 15, -100), o + Vector3.new(44, 15, 0)), "⭐ TOP LEVELS", Color3.fromRGB(176, 108, 255))
		end
		while true do
			pcall(refreshBoards)
			task.wait(90)
		end
	end)
	-- Achievements that move outside rounds (streak, Nana, planets) are caught here.
	task.spawn(function()
		while true do
			task.wait(60)
			for _, player in Players:GetPlayers() do
				pcall(ProgressionService.checkAchievements, ProgressionService, player)
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		lastSubmit[player] = nil
	end)
end

return ProgressionService
