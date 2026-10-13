--!nonstrict
-- The Rolledex: every prop you have ever rolled up, and every mutation variant of it. Stored as a
-- bitset in the profile (bit uid * VariantsPerProp + 0 = "discovered", + mutationIndex = variant).
-- Decoded once per session and re-encoded only when something new is found.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Bitset = require(Shared.Util.Bitset)
local Signal = require(Shared.Util.Signal)
local Mutations = require(Shared.Data.Mutations)
local PropLibrary = require(Shared.Logic.PropLibrary)

local RolledexService = {}
RolledexService.Discovered = Signal.new() -- (player, uid, mutation, isNew, isNewVariant)

local services
local sets: { [Player]: any } = {}

local STRIDE = Mutations.VariantsPerProp

function RolledexService:init(s)
	services = s
end

local function setFor(player: Player)
	local set = sets[player]
	if set then
		return set
	end
	local data = services.PlayerDataService and services.PlayerDataService:getLoaded(player)
	if not data then
		return nil
	end
	set = Bitset.decode(data.rolledex)
	sets[player] = set
	return set
end

-- Returns isNew (first time this prop was ever rolled up), isNewVariant (first time this mutation).
function RolledexService:discover(player: Player, uid: number, mutation: number): (boolean, boolean)
	if not Net.isPlayer(player) or not PropLibrary.get(uid) then
		return false, false
	end
	local set = setFor(player)
	if not set then
		return false, false
	end
	local isNew = Bitset.set(set, uid * STRIDE)
	local isNewVariant = false
	if mutation and mutation > 0 and mutation < STRIDE then
		isNewVariant = Bitset.set(set, uid * STRIDE + mutation)
	end
	if isNew or isNewVariant then
		services.PlayerDataService:update(player, function(data)
			data.rolledex = Bitset.encode(set)
		end)
		self.Discovered:Fire(player, uid, mutation, isNew, isNewVariant)
	end
	return isNew, isNewVariant
end

function RolledexService:has(player: Player, uid: number, mutation: number?): boolean
	local set = setFor(player)
	return set ~= nil and Bitset.get(set, uid * STRIDE + (mutation or 0))
end

-- Discovered props per kit, for completion stats.
function RolledexService:progress(player: Player, kitId: string): (number, number)
	local set = setFor(player)
	local total, found = 0, 0
	for _, def in (PropLibrary.ByKit[kitId] or {}) :: { any } do
		total += 1
		if set and Bitset.get(set, def.uid * STRIDE) then
			found += 1
		end
	end
	return found, total
end

function RolledexService:start()
	Players.PlayerRemoving:Connect(function(player)
		sets[player] = nil
	end)
	if services.PlayerDataService then
		services.PlayerDataService.Loaded:Connect(function(player)
			sets[player] = nil
		end)
	end
end

return RolledexService
