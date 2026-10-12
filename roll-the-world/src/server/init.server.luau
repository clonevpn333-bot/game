--!nonstrict
-- Single server bootstrap. Services are plain modules with optional init(services) and start().
-- init runs for every service before any start, so services can grab each other in init.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local PhysicsService = game:GetService("PhysicsService")

local Net = require(ReplicatedStorage.Shared.Net)

Net.init()

-- Collision groups: riders (avatars on balls) never collide; client prop hitboxes only hit balls.
local function setupCollisionGroups()
	local groups = { "Balls", "Riders", "Props", "Loot" }
	for _, name in groups do
		if not PhysicsService:IsCollisionGroupRegistered(name) then
			PhysicsService:RegisterCollisionGroup(name)
		end
	end
	for _, other in { "Default", "Balls", "Riders", "Props", "Loot" } do
		PhysicsService:CollisionGroupSetCollidable("Riders", other, false)
	end
	PhysicsService:CollisionGroupSetCollidable("Props", "Default", false)
	PhysicsService:CollisionGroupSetCollidable("Props", "Props", false)
	PhysicsService:CollisionGroupSetCollidable("Props", "Balls", true)
	PhysicsService:CollisionGroupSetCollidable("Loot", "Balls", false)
	PhysicsService:CollisionGroupSetCollidable("Loot", "Props", false)
end
setupCollisionGroups()

local ServicesFolder = script.Services
local ORDER = {
	"LiveConfigService",
	"AnalyticsService",
	"PlayerDataService",
	"WorldService",
	"HubService",
	"BallService",
	"AbsorbService",
	"CritterService",
	"PvpService",
	"MergeService",
	"EventService",
	"RolledexService",
	"RequestService",
	"GalaxyService",
	"ShopService",
	"MonetizationService",
	"SocialService",
	"RoundService",
}

local services = {}
for _, name in ORDER do
	local module = ServicesFolder:FindFirstChild(name)
	if module then
		local ok, result = pcall(require, module)
		if ok then
			services[name] = result
		else
			warn("[Bootstrap] failed to load " .. name .. ": " .. tostring(result))
		end
	end
end

for _, name in ORDER do
	local service = services[name]
	if service and type(service.init) == "function" then
		local ok, err = pcall(service.init, service, services)
		if not ok then
			warn("[Bootstrap] init failed for " .. name .. ": " .. tostring(err))
		end
	end
end

for _, name in ORDER do
	local service = services[name]
	if service and type(service.start) == "function" then
		task.spawn(function()
			local ok, err = pcall(service.start, service)
			if not ok then
				warn("[Bootstrap] start failed for " .. name .. ": " .. tostring(err))
			end
		end)
	end
end
