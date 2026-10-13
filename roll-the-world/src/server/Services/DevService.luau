--!nonstrict
-- Studio-only feel-tuning backend for the in-game Tuning Panel. Lets the developer change tuning
-- values live (applied on server AND the requesting client), resize their ball and restart the
-- round. Completely inert in live servers.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Guard = require(Shared.Util.Guard)
local Tuning = require(Shared.Config.Tuning)

local DevService = {}

local services

-- Only these leaves are tunable from the panel.
DevService.Allowed = {
	["Ball.SpeedBase"] = true,
	["Ball.SpeedExponent"] = true,
	["Ball.AccelTimeSmall"] = true,
	["Ball.AccelTimeHuge"] = true,
	["Ball.TurnAssist"] = true,
	["Ball.BrakeTimeSmall"] = true,
	["Ball.BrakeTimeHuge"] = true,
	["Ball.AirControl"] = true,
	["Ball.HopPerDiameter"] = true,
	["Ball.DashBoost"] = true,
	["Ball.DashCooldown"] = true,
	["Absorb.Ratio"] = true,
	["Growth.Gain"] = true,
	["Growth.EarlyBoost"] = true,
	["Growth.EarlyScale"] = true,
	["Camera.BaseDistance"] = true,
	["Camera.DistancePerDiameter"] = true,
	["Camera.HeightPerDiameter"] = true,
	["Camera.FovSpeedBonus"] = true,
	["Camera.YawSharpness"] = true,
	["Round.Length"] = true,
}

function DevService.apply(path: string, value: number): boolean
	if not DevService.Allowed[path] then
		return false
	end
	local section, key = path:match("^(%w+)%.(%w+)$")
	local tbl = section and (Tuning :: any)[section]
	if not tbl or type(tbl[key]) ~= "number" then
		return false
	end
	tbl[key] = value
	return true
end

local function isDev(player: Player): boolean
	return RunService:IsStudio() and player.Parent ~= nil
end

function DevService:init(s)
	services = s
end

function DevService:start()
	if not RunService:IsStudio() then
		return
	end
	Net.action("DevTuning", Guard.shape({ path = Guard.string(48), value = Guard.number(-1e5, 1e5) }), function(player, payload)
		if not isDev(player) then
			return false
		end
		local ok = DevService.apply(payload.path, payload.value)
		if ok then
			print(string.format("[Tuning] %s = %s", payload.path, tostring(payload.value)))
		end
		return ok
	end, 20)
	Net.action("DevCommand", Guard.shape({ cmd = Guard.string(24), arg = Guard.optional(Guard.number(-1e5, 1e5)) }), function(player, payload)
		if not isDev(player) then
			return false
		end
		local ball = services.BallService:get(player)
		if payload.cmd == "scale" and ball then
			services.BallService:setDiameter(ball, ball.diameter * (payload.arg or 2), "dev")
			return true
		elseif payload.cmd == "reset" and ball then
			services.BallService:setDiameter(ball, Tuning.Ball.StartDiameter, "dev")
			return true
		elseif payload.cmd == "finalroll" and services.RoundService:isPlaying() then
			services.RoundService.endsAt = workspace:GetServerTimeNow() + Tuning.Round.FinalRoll
			return true
		elseif payload.cmd == "endround" and services.RoundService:isPlaying() then
			services.RoundService.endsAt = workspace:GetServerTimeNow() + 1
			return true
		end
		return false
	end, 10)
end

return DevService
