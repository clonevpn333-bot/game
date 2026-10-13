--!nonstrict
-- Single client bootstrap. Controllers are modules with optional init(controllers) and start().

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")

local Net = require(ReplicatedStorage.Shared.Net)

Net.init()

-- Our own HUD replaces the default backpack/health bars; chat and the player list stay available.
pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Health, false)
end)

local ORDER = {
	"ClientState",
	"SettingsController",
	"InputController",
	"AudioController",
	"VFXController",
	"WorldController",
	"BallVisualController",
	"MovementController",
	"CameraController",
	"HudController",
	"LaunchController",
	"EventController",
	"MenuController",
	"NanaController",
	"HubController",
	"TuningPanel",
}

local controllers = {}
local folder = script:WaitForChild("Controllers")
for _, name in ORDER do
	local module = folder:FindFirstChild(name)
	if module then
		local ok, result = pcall(require, module)
		if ok then
			controllers[name] = result
		else
			warn("[Client] failed to load " .. name .. ": " .. tostring(result))
		end
	end
end

for _, name in ORDER do
	local c = controllers[name]
	if c and type(c.init) == "function" then
		local ok, err = pcall(c.init, c, controllers)
		if not ok then
			warn("[Client] init failed for " .. name .. ": " .. tostring(err))
		end
	end
end

for _, name in ORDER do
	local c = controllers[name]
	if c and type(c.start) == "function" then
		task.spawn(function()
			local ok, err = pcall(c.start, c)
			if not ok then
				warn("[Client] start failed for " .. name .. ": " .. tostring(err))
			end
		end)
	end
end

-- Tell the server we're ready for the world snapshot and to be dropped into the round.
task.spawn(function()
	local player = Players.LocalPlayer
	if not player.Character then
		player.CharacterAdded:Wait()
	end
	task.wait(0.1)
	Net.request("Ready", true)
end)
