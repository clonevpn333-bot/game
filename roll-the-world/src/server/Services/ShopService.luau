--!nonstrict
-- Stardust shop: unlock and level up Cores, buy and wear ball shells. All prices come from shared
-- data so the client shows exactly what the server charges. Equipping a shell re-skins a live ball
-- immediately; a new Core takes effect on your next roll (it changes ball physics).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Cores = require(Shared.Data.Cores)
local Cosmetics = require(Shared.Data.Cosmetics)

local ShopService = {}

local services

function ShopService:init(s)
	services = s
end

local function pds()
	return services.PlayerDataService
end

local function buyCore(player: Player, id: string)
	local data = pds():getLoaded(player)
	local def = Cores.get(id)
	if not data or not def then
		return false, "unknown"
	end
	local level = data.cores.owned[id] or 0
	local cost = Cores.costFor(id, level)
	if not cost then
		return false, "max_level"
	end
	if not pds():spendStardust(player, cost, (if level == 0 then "CoreUnlock:" else "CoreUpgrade:") .. id) then
		return false, "afford"
	end
	pds():update(player, function(p)
		p.cores.owned[id] = level + 1
		if level == 0 then
			p.cores.equipped = id -- new toys get worn right away
		end
	end)
	-- Upgrades to the core you're rolling apply now (speed/dash/magnet read the level live).
	local ball = services.BallService:get(player)
	if ball and ball.core == id then
		ball.coreLevel = level + 1
	end
	return true, { level = level + 1 }
end

local function equipCore(player: Player, id: string)
	local data = pds():getLoaded(player)
	if not data or not data.cores.owned[id] then
		return false, "not_owned"
	end
	pds():update(player, function(p)
		p.cores.equipped = id
	end)
	return true, { nextRoll = true }
end

local function buyShell(player: Player, id: string)
	local data = pds():getLoaded(player)
	local def = Cosmetics.ById[id]
	if not data or not def then
		return false, "unknown"
	end
	if data.cosmetics.shells[id] then
		return false, "owned"
	end
	if def.source ~= "Shop" or not def.cost then
		return false, "not_for_sale"
	end
	if not pds():spendStardust(player, def.cost, "Shell:" .. id) then
		return false, "afford"
	end
	pds():update(player, function(p)
		p.cosmetics.shells[id] = true
		p.cosmetics.equipped.shell = id
	end)
	ShopService:applyShell(player, id)
	return true, { equipped = id }
end

local function equipShell(player: Player, id: string)
	local data = pds():getLoaded(player)
	if not data or not data.cosmetics.shells[id] then
		return false, "not_owned"
	end
	pds():update(player, function(p)
		p.cosmetics.equipped.shell = id
	end)
	ShopService:applyShell(player, id)
	return true, { equipped = id }
end

function ShopService:applyShell(player: Player, id: string)
	local ball = services.BallService:get(player)
	if ball then
		ball.shell = id
		if ball.part then
			ball.part:SetAttribute("Shell", id)
		end
	end
end

function ShopService:start()
	if not services.PlayerDataService then
		warn("[Shop] PlayerDataService missing; shop disabled")
		return
	end
	local id = Guard.string(32)
	Net.action("BuyCore", id, buyCore, 3)
	Net.action("EquipCore", id, equipCore, 4)
	Net.action("BuyShell", id, buyShell, 3)
	Net.action("EquipShell", id, equipShell, 4)
end

return ShopService
