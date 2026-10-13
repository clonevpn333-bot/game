--!nonstrict
-- Studio-only live tuning panel (toggle with F2 or the 🔧 button). Change feel numbers while
-- rolling; values apply instantly on client and server. "Print" dumps the current values so they
-- can be pasted into Config/Tuning.luau. Not created in live servers.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Tuning = require(Shared.Config.Tuning)
local Ui = require(script.Parent.Parent.UI.Ui)

local TuningPanel = {}

local PARAMS = {
	{ "Ball.SpeedBase", 1 },
	{ "Ball.SpeedExponent", 0.02 },
	{ "Ball.AccelTimeSmall", 0.02 },
	{ "Ball.AccelTimeHuge", 0.05 },
	{ "Ball.TurnAssist", 0.1 },
	{ "Ball.BrakeTimeSmall", 0.1 },
	{ "Ball.BrakeTimeHuge", 0.1 },
	{ "Ball.AirControl", 0.05 },
	{ "Ball.HopPerDiameter", 0.05 },
	{ "Ball.DashBoost", 0.05 },
	{ "Ball.DashCooldown", 0.1 },
	{ "Absorb.Ratio", 0.02 },
	{ "Growth.Gain", 0.05 },
	{ "Growth.EarlyBoost", 0.1 },
	{ "Growth.EarlyScale", 1 },
	{ "Camera.BaseDistance", 0.5 },
	{ "Camera.DistancePerDiameter", 0.1 },
	{ "Camera.HeightPerDiameter", 0.05 },
	{ "Camera.FovSpeedBonus", 1 },
	{ "Camera.YawSharpness", 0.2 },
}

local function read(path: string): number
	local section, key = path:match("^(%w+)%.(%w+)$")
	return (Tuning :: any)[section][key]
end

local function write(path: string, value: number)
	local section, key = path:match("^(%w+)%.(%w+)$")
	;(Tuning :: any)[section][key] = value
end

function TuningPanel:start()
	if not RunService:IsStudio() then
		return
	end
	local gui = Ui.new("ScreenGui", {
		Name = "TuningPanel",
		ResetOnSpawn = false,
		DisplayOrder = 50,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	local panel = Ui.new("Frame", {
		Position = UDim2.new(0, 12, 0.5, -280),
		Size = UDim2.fromOffset(330, 560),
		BackgroundColor3 = Theme.Color.Panel,
		Visible = false,
		Parent = gui,
	}, { Ui.corner(Theme.Radius.Medium), Ui.stroke(3, Theme.Color.Ink), Ui.padding(10) })
	Ui.new("TextLabel", {
		Text = "🔧 Feel Tuning (Studio)",
		Size = UDim2.new(1, 0, 0, 26),
		TextScaled = true,
		TextColor3 = Theme.Color.Ink,
		Parent = panel,
	})
	local list = Ui.new("ScrollingFrame", {
		Position = UDim2.fromOffset(0, 30),
		Size = UDim2.new(1, 0, 1, -120),
		BackgroundTransparency = 1,
		CanvasSize = UDim2.fromOffset(0, #PARAMS * 30),
		ScrollBarThickness = 6,
		Parent = panel,
	}, { Ui.new("UIListLayout", { Padding = UDim.new(0, 4) }) })
	for _, param in PARAMS do
		local path, step = param[1], param[2]
		local row = Ui.new("Frame", { Size = UDim2.new(1, -8, 0, 26), BackgroundTransparency = 1, Parent = list })
		Ui.new("TextLabel", {
			Text = path,
			Size = UDim2.new(0.55, 0, 1, 0),
			TextScaled = true,
			TextColor3 = Theme.Color.Ink,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = row,
		})
		local box = Ui.new("TextBox", {
			Text = tostring(read(path)),
			Position = UDim2.new(0.55, 26, 0, 0),
			Size = UDim2.new(0.45, -52, 1, 0),
			TextScaled = true,
			TextColor3 = Theme.Color.Ink,
			BackgroundTransparency = 0,
			BackgroundColor3 = Theme.Color.PanelAlt,
			ClearTextOnFocus = false,
			Parent = row,
		}, { Ui.corner(Theme.Radius.Small) })
		local function set(v: number)
			v = math.floor(v * 1000 + 0.5) / 1000
			write(path, v)
			box.Text = tostring(v)
			Net.request("DevTuning", { path = path, value = v })
		end
		box.FocusLost:Connect(function()
			local v = tonumber(box.Text)
			if v then
				set(v)
			else
				box.Text = tostring(read(path))
			end
		end)
		Ui.button({ text = "-", size = UDim2.fromOffset(24, 26), position = UDim2.new(0.55, 0, 0, 0), color = Theme.Color.Bad, radius = Theme.Radius.Small, parent = row, onClick = function()
			set(read(path) - step)
		end })
		Ui.button({ text = "+", size = UDim2.fromOffset(24, 26), position = UDim2.new(1, -24, 0, 0), color = Theme.Color.Good, radius = Theme.Radius.Small, parent = row, onClick = function()
			set(read(path) + step)
		end })
	end
	local actions = Ui.new("Frame", {
		Position = UDim2.new(0, 0, 1, -84),
		Size = UDim2.new(1, 0, 0, 84),
		BackgroundTransparency = 1,
		Parent = panel,
	}, { Ui.new("UIGridLayout", { CellSize = UDim2.fromOffset(100, 36), CellPadding = UDim2.fromOffset(6, 6) }) })
	local function cmd(text: string, name: string, arg: number?)
		Ui.button({ text = text, size = UDim2.fromOffset(100, 36), color = Theme.Color.Secondary, radius = Theme.Radius.Small, parent = actions, onClick = function()
			Net.request("DevCommand", { cmd = name, arg = arg })
		end })
	end
	cmd("Size ×2", "scale", 2)
	cmd("Size ×0.5", "scale", 0.5)
	cmd("Reset size", "reset")
	cmd("Final Roll", "finalroll")
	cmd("End round", "endround")
	Ui.button({ text = "Print", size = UDim2.fromOffset(100, 36), color = Theme.Color.Accent, radius = Theme.Radius.Small, parent = actions, onClick = function()
		local lines = {}
		for _, param in PARAMS do
			table.insert(lines, string.format("%s = %s", param[1], tostring(read(param[1]))))
		end
		print("[Tuning]\n" .. table.concat(lines, "\n"))
	end })
	Ui.button({
		text = "🔧",
		size = UDim2.fromOffset(44, 44),
		position = UDim2.new(0, 12, 1, -60),
		color = Theme.Color.Magic,
		radius = Theme.Radius.Pill,
		parent = gui,
		onClick = function()
			panel.Visible = not panel.Visible
		end,
	})
	UserInputService.InputBegan:Connect(function(input, processed)
		if not processed and input.KeyCode == Enum.KeyCode.F2 then
			panel.Visible = not panel.Visible
		end
	end)
end

return TuningPanel
