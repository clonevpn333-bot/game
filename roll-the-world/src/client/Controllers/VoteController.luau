--!nonstrict
-- Between rounds everyone (bots too) votes on the next round: three map + mode combos as big
-- cards along the bottom of the screen with live vote counts. The winner is shown just before the
-- next round starts.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Modes = require(Shared.Data.Modes)
local Kits = require(Shared.Data.Kits)
local Ui = require(script.Parent.Parent.UI.Ui)

local VoteController = {}

local controllers
local state
local gui: ScreenGui
local holder: Frame
local title: TextLabel
local cards = {}
local myVote: number? = nil
local shownOptions = nil

function VoteController:init(c)
	controllers = c
end

local function hex(h: string?, fallback: Color3): Color3
	if type(h) ~= "string" then
		return fallback
	end
	local ok, c = pcall(Color3.fromHex, h)
	return if ok then c else fallback
end

local function build()
	gui = Ui.new("ScreenGui", {
		Name = "VoteHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 6,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	Ui.autoScale(gui)
	holder = Ui.new("Frame", {
		Name = "Vote",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -14),
		Size = UDim2.fromOffset(840, 214),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = gui,
	})
	title = Ui.display("🗳️ Vote for the next round!", {
		Size = UDim2.new(1, 0, 0, 36),
		Parent = holder,
	})
	local row = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 44),
		Size = UDim2.new(1, 0, 0, 170),
		BackgroundTransparency = 1,
		Parent = holder,
	}, {
		Ui.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			Padding = UDim.new(0, 14),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	for i = 1, 3 do
		local card = Ui.new("TextButton", {
			Text = "",
			AutoButtonColor = false,
			Size = UDim2.fromOffset(270, 166),
			BackgroundColor3 = Theme.Color.Panel,
			LayoutOrder = i,
			Parent = row,
		}, { Ui.corner(Theme.Radius.Large), Ui.stroke(4, Theme.Color.Ink) })
		local scale = Ui.new("UIScale", { Parent = card })
		local band = Ui.new("Frame", {
			Size = UDim2.new(1, 0, 0, 58),
			BackgroundColor3 = Theme.Color.Primary,
			Parent = card,
		}, { Ui.corner(Theme.Radius.Large), Ui.gradient(Color3.new(1, 1, 1), Color3.fromRGB(215, 215, 215)) })
		Ui.new("Frame", {
			Position = UDim2.new(0, 0, 1, -20),
			Size = UDim2.new(1, 0, 0, 20),
			BackgroundColor3 = Theme.Color.Primary,
			Name = "BandFoot",
			Parent = band,
		}, { Ui.gradient(Color3.fromRGB(230, 230, 230), Color3.fromRGB(215, 215, 215)) })
		local icon = Ui.new("TextLabel", {
			Position = UDim2.fromOffset(8, 4),
			Size = UDim2.fromOffset(60, 50),
			TextScaled = true,
			Parent = band,
		})
		local modeName = Ui.new("TextLabel", {
			Position = UDim2.fromOffset(72, 6),
			Size = UDim2.new(1, -80, 0, 30),
			TextScaled = true,
			FontFace = Theme.Font.Display,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = band,
		}, { Ui.stroke(2.5, Theme.Color.Ink) })
		local mapName = Ui.new("TextLabel", {
			Position = UDim2.fromOffset(72, 34),
			Size = UDim2.new(1, -80, 0, 20),
			TextScaled = true,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = band,
		}, { Ui.stroke(2, Theme.Color.Ink) })
		local desc = Ui.new("TextLabel", {
			Position = UDim2.fromOffset(12, 64),
			Size = UDim2.new(1, -24, 0, 52),
			TextWrapped = true,
			TextSize = 18,
			TextColor3 = Theme.Color.Ink,
			TextYAlignment = Enum.TextYAlignment.Top,
			Parent = card,
		})
		local votes = Ui.new("TextLabel", {
			AnchorPoint = Vector2.new(0, 1),
			Position = UDim2.new(0, 12, 1, -10),
			Size = UDim2.fromOffset(110, 30),
			TextScaled = true,
			FontFace = Theme.Font.Display,
			TextColor3 = Theme.Color.MagicDark,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = card,
		})
		local mine = Ui.new("TextLabel", {
			AnchorPoint = Vector2.new(1, 1),
			Position = UDim2.new(1, -12, 1, -10),
			Size = UDim2.fromOffset(130, 30),
			TextScaled = true,
			Text = "TAP TO VOTE",
			TextColor3 = Theme.Color.InkSoft,
			TextXAlignment = Enum.TextXAlignment.Right,
			Parent = card,
		})
		card.Activated:Connect(function()
			if not shownOptions then
				return
			end
			myVote = i
			Net.request("Vote", i)
			Ui.tween(scale, Theme.Tween.Quick, { Scale = 0.94 })
			task.delay(0.1, function()
				Ui.tween(scale, Theme.Tween.Pop, { Scale = 1 })
			end)
			if controllers.AudioController then
				controllers.AudioController:play("Click")
			end
		end)
		cards[i] = { card = card, band = band, icon = icon, modeName = modeName, mapName = mapName, desc = desc, votes = votes, mine = mine, scale = scale }
	end
end

local function update()
	local round = state.round
	local vote = round and round.vote
	local rolling = state.playerState == "Rolling" or state.playerState == "Rider"
	if not vote or rolling or round.state == "Playing" or round.state == "Launch" then
		if holder.Visible then
			holder.Visible = false
		end
		if not vote then
			shownOptions = nil
			myVote = nil
		end
		return
	end
	holder.Visible = true
	if shownOptions ~= vote.options then
		shownOptions = vote.options
		myVote = nil
		for i, option in vote.options do
			local c = cards[i]
			local mode = Modes.get(option.modeId)
			local kit = Kits.get(option.kitId)
			local color = hex(mode.color, Theme.Color.Primary)
			c.band.BackgroundColor3 = color
			c.band.BandFoot.BackgroundColor3 = color
			c.icon.Text = mode.icon
			c.modeName.Text = mode.name
			c.mapName.Text = if kit then (kit.icon or "🗺️") .. " " .. kit.name else option.kitId
			c.desc.Text = mode.description
			c.scale.Scale = 0.4
			task.delay(i * 0.08, function()
				Ui.tween(c.scale, Theme.Tween.Pop, { Scale = 1 })
			end)
		end
	end
	local best = 0
	for _, n in vote.counts do
		best = math.max(best, n)
	end
	for i, c in cards do
		local n = vote.counts[i] or 0
		c.votes.Text = "🗳️ " .. n
		local selected = myVote == i
		c.mine.Text = if selected then "✅ YOUR VOTE" else "TAP TO VOTE"
		c.mine.TextColor3 = if selected then Theme.Color.GoodDark else Theme.Color.InkSoft
		local stroke = c.card:FindFirstChildOfClass("UIStroke")
		if stroke then
			stroke.Color = if selected then Theme.Color.Accent elseif n == best and n > 0 then Theme.Color.Good else Theme.Color.Ink
			stroke.Thickness = if selected then 6 else 4
		end
	end
	local left = math.max(0, math.ceil((vote.endsAt or 0) - state:serverTime()))
	title.Text = "🗳️ Vote for the next round!  " .. left .. "s"
end

function VoteController:start()
	state = controllers.ClientState
	build()
	RunService.RenderStepped:Connect(update)
end

return VoteController
