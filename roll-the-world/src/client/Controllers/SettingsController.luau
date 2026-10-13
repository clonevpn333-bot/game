--!nonstrict
-- Player settings (audio, graphics quality, camera sensitivity, reduced motion, colorblind rarity
-- colors, mobile auto-steer). Saved to the profile when PlayerDataService is present; otherwise kept
-- for the session. Other controllers read Settings.values and listen to Changed.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)

local SettingsController = {}

SettingsController.values = {
	music = 0.6,
	sfx = 0.9,
	quality = "Auto", -- Auto | Low | Medium | High
	cameraSensitivity = 1,
	reducedMotion = false,
	colorblind = false,
	autoSteer = true,
	shake = 1,
}
SettingsController.Changed = Signal.new() -- (key, value)

local controllers

function SettingsController:init(c)
	controllers = c
end

-- 0.5 (low) .. 1.2 (high): scales render distances, particle counts and effects.
function SettingsController:qualityFactor(): number
	local q = self.values.quality
	if q == "Low" then
		return 0.55
	elseif q == "Medium" then
		return 0.8
	elseif q == "High" then
		return 1.15
	end
	-- Auto: read the engine's current graphics level (1-10) when available.
	local ok, level = pcall(function()
		return UserSettings().GameSettings.SavedQualityLevel.Value
	end)
	if ok and level and level > 0 then
		return math.clamp(0.45 + level * 0.07, 0.5, 1.15)
	end
	if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
		return 0.7
	end
	return 1
end

function SettingsController:set(key: string, value: any)
	if self.values[key] == value then
		return
	end
	self.values[key] = value
	self.Changed:Fire(key, value)
	Net.request("SaveSettings", { [key] = value })
end

function SettingsController:start()
	local state = controllers.ClientState
	state.ProfileChanged:Connect(function(profile)
		if profile and profile.settings then
			for k, v in profile.settings do
				if self.values[k] ~= nil and self.values[k] ~= v then
					self.values[k] = v
					self.Changed:Fire(k, v)
				end
			end
		end
	end)
end

return SettingsController
