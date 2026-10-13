--!nonstrict
-- The gameplay HUD. Minimal and loud: a huge animated size counter (the headline number), the next
-- thing you'll be able to roll up, round timer, top-3, floaters, NEW! toasts, goal-unlocked
-- moments, Final Roll banner, touch Dash/Hop buttons, landmark marker, and the results screen.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Rarity = require(Shared.Config.Rarity)
local Tuning = require(Shared.Config.Tuning)
local Format = require(Shared.Util.Format)
local Spring = require(Shared.Util.Spring)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Growth = require(Shared.Logic.Growth)
local Mutations = require(Shared.Data.Mutations)
local Kits = require(Shared.Data.Kits)
local PropBuilder = require(Shared.PropBuilder)
local Ui = require(script.Parent.Parent.UI.Ui)

local HudController = {}

local controllers
local state, settings, input
local gui: ScreenGui
local root: Frame
local sizeValue: TextLabel
local sizeUnit: TextLabel
local sizeScale: UIScale
local sizeSpring = Spring.new(3, 120, 15)
local bumpSpring = Spring.new(1, 260, 12)
local goalCard: Frame
local goalIcon: ViewportFrame
local goalText: TextLabel
local goalBar: Frame
local goalUid: number? = nil
local timerLabel: TextLabel
local timerPill: Frame
local topList: Frame
local floaters: Frame
local toasts: Frame
local banner: TextLabel
local touchButtons: Frame
local dashFill: Frame
local loadingChip: TextLabel
local resultsPanel: Frame? = nil
local pendingGain = 0
local pendingAt = 0
local lastUnit = "cm"
local thumbnails = {}
local comboLabel: TextLabel
local comboScale: UIScale
local combo = 0
local lastComboAt = 0
local speedLines: Frame
local countdownLabel: TextLabel
local riderPanel: Frame
local riderTitle: TextLabel
local riderSub: TextLabel

local burstHolder: Frame
local feed: Frame
local lastCountdown = -1
local lines = {}
local COMBO_COLORS = {
	{ 0, Color3.fromRGB(255, 255, 255) },
	{ 5, Color3.fromRGB(255, 236, 120) },
	{ 12, Color3.fromRGB(255, 170, 70) },
	{ 25, Color3.fromRGB(255, 110, 170) },
	{ 50, Color3.fromRGB(176, 140, 255) },
}

function HudController:init(c)
	controllers = c
end

local function cmPerStud(): number
	return state.round.cmPerStud or 1
end

local function rarityColor(id: string): Color3
	return Rarity.color(id, settings.values.colorblind)
end

-- Builders --------------------------------------------------------------------------------------

local function buildSizeCounter()
	local holder = Ui.new("Frame", {
		Name = "Size",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 10),
		Size = UDim2.fromOffset(420, 120),
		BackgroundTransparency = 1,
		Parent = root,
	})
	sizeScale = Ui.new("UIScale", { Parent = holder })
	sizeValue = Ui.display("3.0", {
		Name = "Value",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(0.68, 0, 0, 0),
		Size = UDim2.new(0.68, 0, 0, 92),
		TextXAlignment = Enum.TextXAlignment.Right,
		Parent = holder,
	})
	Ui.gradient(Color3.fromRGB(255, 255, 255), Color3.fromRGB(255, 226, 150)).Parent = sizeValue
	sizeUnit = Ui.display("cm", {
		Name = "Unit",
		Position = UDim2.new(0.7, 0, 0, 32),
		Size = UDim2.new(0.3, 0, 0, 56),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextColor3 = Theme.Color.Accent,
		Parent = holder,
	})
end

local function buildGoalCard()
	goalCard = Ui.new("Frame", {
		Name = "Goal",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 118),
		Size = UDim2.fromOffset(300, 54),
		BackgroundColor3 = Theme.Color.Ink,
		BackgroundTransparency = 0.25,
		Visible = false,
		Parent = root,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(2, Color3.fromRGB(255, 255, 255)) })
	local iconHolder = Ui.new("Frame", {
		Size = UDim2.fromOffset(62, 62),
		Position = UDim2.fromOffset(-8, -6),
		BackgroundColor3 = Theme.Color.PanelAlt,
		Parent = goalCard,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, Theme.Color.Ink) })
	goalIcon = Ui.viewport(nil, { Size = UDim2.fromScale(1, 1), Parent = iconHolder })
	Ui.new("TextLabel", {
		Text = "🔒",
		Size = UDim2.fromOffset(22, 22),
		Position = UDim2.new(1, -18, 1, -20),
		TextScaled = true,
		Parent = iconHolder,
	})
	goalText = Ui.new("TextLabel", {
		Position = UDim2.fromOffset(62, 4),
		Size = UDim2.new(1, -74, 0, 26),
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = "",
		Parent = goalCard,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	local barBg = Ui.new("Frame", {
		Position = UDim2.fromOffset(62, 34),
		Size = UDim2.new(1, -78, 0, 12),
		BackgroundColor3 = Color3.fromRGB(70, 56, 120),
		Parent = goalCard,
	}, { Ui.corner(Theme.Radius.Pill) })
	goalBar = Ui.new("Frame", {
		Size = UDim2.fromScale(0.3, 1),
		BackgroundColor3 = Theme.Color.Accent,
		Parent = barBg,
	}, { Ui.corner(Theme.Radius.Pill), Ui.gradient(Color3.fromRGB(255, 236, 140), Color3.fromRGB(255, 160, 60), 0) })
end

local function buildTimer()
	timerPill = Ui.new("Frame", {
		Name = "Timer",
		Position = UDim2.fromOffset(16, 14),
		Size = UDim2.fromOffset(150, 52),
		BackgroundColor3 = Theme.Color.Panel,
		Parent = root,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, Theme.Color.Ink) })
	Ui.new("TextLabel", {
		Text = "⏱️",
		Size = UDim2.fromOffset(40, 40),
		Position = UDim2.fromOffset(8, 6),
		TextScaled = true,
		Parent = timerPill,
	})
	timerLabel = Ui.new("TextLabel", {
		Text = "7:30",
		Position = UDim2.fromOffset(50, 4),
		Size = UDim2.new(1, -60, 1, -8),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextColor3 = Theme.Color.Ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = timerPill,
	})
end

local function buildTopList()
	topList = Ui.new("Frame", {
		Name = "Top",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -16, 0, 14),
		Size = UDim2.fromOffset(230, 150),
		BackgroundTransparency = 1,
		Parent = root,
	}, {
		Ui.new("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for i = 1, 3 do
		local row = Ui.new("Frame", {
			Name = "Row" .. i,
			LayoutOrder = i,
			Size = UDim2.new(1, 0, 0, 40),
			BackgroundColor3 = Theme.Color.Ink,
			BackgroundTransparency = 0.3,
			Visible = false,
			Parent = topList,
		}, { Ui.corner(Theme.Radius.Pill) })
		Ui.new("TextLabel", {
			Name = "Rank",
			Text = ({ "🥇", "🥈", "🥉" })[i],
			Size = UDim2.fromOffset(34, 34),
			Position = UDim2.fromOffset(4, 3),
			TextScaled = true,
			Parent = row,
		})
		Ui.new("ImageLabel", {
			Name = "Avatar",
			Size = UDim2.fromOffset(32, 32),
			Position = UDim2.fromOffset(40, 4),
			BackgroundColor3 = Theme.Color.PanelAlt,
			Parent = row,
		}, { Ui.corner(Theme.Radius.Pill) })
		Ui.new("TextLabel", {
			Name = "Name",
			Position = UDim2.fromOffset(78, 2),
			Size = UDim2.new(1, -160, 1, -4),
			TextScaled = true,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = row,
		}, { Ui.stroke(1.5, Theme.Color.Ink) })
		Ui.new("TextLabel", {
			Name = "Size",
			AnchorPoint = Vector2.new(1, 0),
			Position = UDim2.new(1, -10, 0, 4),
			Size = UDim2.fromOffset(78, 32),
			TextScaled = true,
			FontFace = Theme.Font.Display,
			TextColor3 = Theme.Color.Accent,
			TextXAlignment = Enum.TextXAlignment.Right,
			Parent = row,
		}, { Ui.stroke(2, Theme.Color.Ink) })
	end
end

local function buildTouchButtons()
	touchButtons = Ui.new("Frame", {
		Name = "Touch",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -24, 1, -28),
		Size = UDim2.fromOffset(250, 220),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = root,
	})
	local dash = Ui.button({
		name = "Dash",
		text = "💨",
		color = Theme.Color.Secondary,
		size = UDim2.fromOffset(122, 122),
		position = UDim2.new(1, 0, 1, 0),
		anchor = Vector2.new(1, 1),
		radius = Theme.Radius.Pill,
		parent = touchButtons,
		onClick = function()
			input:press("Dash")
		end,
	})
	dashFill = Ui.new("Frame", {
		Name = "Cooldown",
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.fromScale(0, 1),
		Size = UDim2.fromScale(1, 0),
		BackgroundColor3 = Theme.Color.Ink,
		BackgroundTransparency = 0.45,
		ZIndex = 3,
		Parent = dash,
	}, { Ui.corner(Theme.Radius.Pill) })
	Ui.button({
		name = "Hop",
		text = "⬆️",
		color = Theme.Color.Good,
		size = UDim2.fromOffset(96, 96),
		position = UDim2.new(1, -140, 1, -10),
		anchor = Vector2.new(1, 1),
		radius = Theme.Radius.Pill,
		parent = touchButtons,
		onClick = function()
			input:press("Hop")
		end,
	})
end

-- Combo: rapid pickups chain into a growing "×N" that climbs through colors.
local function buildCombo()
	comboLabel = Ui.display("", {
		Name = "Combo",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.74),
		Size = UDim2.fromOffset(260, 56),
		TextTransparency = 1,
		Parent = root,
	})
	comboScale = Ui.new("UIScale", { Parent = comboLabel })
end

-- Speed lines streaking in from the screen edges when going fast or dashing.
local function buildSpeedLines()
	speedLines = Ui.new("Frame", {
		Name = "SpeedLines",
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		ZIndex = 0,
		Parent = root,
	})
	for i = 1, 18 do
		local angle = (i / 18) * math.pi * 2 + math.random() * 0.2
		local line = Ui.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			BackgroundColor3 = Color3.new(1, 1, 1),
			BackgroundTransparency = 1,
			Size = UDim2.fromOffset(4, 120),
			Rotation = math.deg(angle) + 90,
			Parent = speedLines,
		}, { Ui.corner(Theme.Radius.Pill) })
		table.insert(lines, { frame = line, angle = angle, phase = math.random() * 10 })
	end
end

local function updateSpeedLines(dt: number)
	local movement = controllers.MovementController
	local d = state.diameter
	local maxSpeed = math.max(Growth.maxSpeed(d), 1)
	local frac = if state:isRolling() then movement.speed / maxSpeed else 0
	local dashing = os.clock() < movement.dashUntil + 0.15
	local strength = math.clamp((frac - 0.95) * 3, 0, 1)
	if dashing then
		strength = 1
	end
	if settings.values.reducedMotion then
		strength *= 0.3
	end
	for _, l in lines do
		l.phase += dt * (2.5 + strength * 3)
		local p = l.phase % 1
		local radius = 0.62 - p * 0.18
		l.frame.Position = UDim2.fromScale(0.5 + math.cos(l.angle) * radius, 0.5 + math.sin(l.angle) * radius * 1.1)
		l.frame.BackgroundTransparency = 1 - strength * 0.55 * math.sin(p * math.pi)
	end
end

local function onLocalAbsorb()
	local now = os.clock()
	if now - lastComboAt < 0.7 then
		combo += 1
	else
		combo = 1
	end
	lastComboAt = now
	if combo >= 3 then
		local color = COMBO_COLORS[1][2]
		for _, entry in COMBO_COLORS do
			if combo >= entry[1] then
				color = entry[2]
			end
		end
		comboLabel.Text = "×" .. combo .. (if combo >= 25 then " WOW!" elseif combo >= 12 then " SWEEP!" else "")
		comboLabel.TextColor3 = color
		comboLabel.TextTransparency = 0
		local stroke = comboLabel:FindFirstChildOfClass("UIStroke")
		if stroke then
			stroke.Transparency = 0
		end
		comboScale.Scale = 1 + math.min(combo, 40) * 0.012 + 0.25
		Ui.tween(comboScale, Theme.Tween.Pop, { Scale = 1 + math.min(combo, 40) * 0.012 })
	end
end

local function fadeCombo()
	if comboLabel.TextTransparency < 1 and os.clock() - lastComboAt > 0.9 then
		Ui.tween(comboLabel, Theme.Tween.Smooth, { TextTransparency = 1 })
		local stroke = comboLabel:FindFirstChildOfClass("UIStroke")
		if stroke then
			Ui.tween(stroke, Theme.Tween.Smooth, { Transparency = 1 })
		end
		combo = 0
	end
end

-- "Too big!" gauge over a prop you bonked: how close you are to rolling it up (wordless).
function HudController:bonkGauge(hitPart: Instance?)
	if not hitPart or not hitPart:IsA("BasePart") then
		return
	end
	local propId = hitPart:GetAttribute("PropId")
	local world = controllers.WorldController
	local p = propId and world and world.props[propId]
	if not p or hitPart:FindFirstChild("BonkGauge") then
		return
	end
	local need = p.absorbSize / (Tuning.Absorb.Ratio + ((state.round.event and state.round.event.ratioBonus) or 0))
	local frac = math.clamp(state.diameter / need, 0, 1)
	local gui = Ui.new("BillboardGui", {
		Name = "BonkGauge",
		Size = UDim2.fromOffset(150, 46),
		StudsOffsetWorldSpace = Vector3.new(0, hitPart.Size.Y * 0.6 + 2, 0),
		AlwaysOnTop = true,
		LightInfluence = 0,
		Adornee = hitPart,
		Parent = hitPart,
	})
	local bg = Ui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 22),
		Position = UDim2.fromOffset(0, 22),
		BackgroundColor3 = Theme.Color.Ink,
		Parent = gui,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(2, Color3.new(1, 1, 1)) })
	local fill = Ui.new("Frame", {
		Size = UDim2.fromScale(0, 1),
		BackgroundColor3 = if frac > 0.85 then Theme.Color.Good else Theme.Color.Accent,
		Parent = bg,
	}, { Ui.corner(Theme.Radius.Pill) })
	Ui.new("TextLabel", {
		Text = "🔒 " .. Format.size(need, cmPerStud()),
		Size = UDim2.new(1, 0, 0, 22),
		TextScaled = true,
		Parent = gui,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	Ui.tween(fill, Theme.Tween.Slow, { Size = UDim2.fromScale(frac, 1) })
	task.delay(1.6, function()
		gui:Destroy()
	end)
end

-- Rolled up: big, funny, and it always tells you exactly how to get back in the game.
local function buildRiderPanel()
	riderPanel = Ui.new("Frame", {
		Name = "Rider",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -40),
		Size = UDim2.fromOffset(560, 230),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = root,
	})
	riderTitle = Ui.display("😂 YOU GOT ROLLED!", {
		Size = UDim2.new(1, 0, 0, 74),
		TextColor3 = Theme.Color.Accent,
		Parent = riderPanel,
	})
	riderSub = Ui.new("TextLabel", {
		Position = UDim2.fromOffset(0, 76),
		Size = UDim2.new(1, 0, 0, 34),
		TextScaled = true,
		Text = "",
		Parent = riderPanel,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	local _burstButton
	_burstButton, burstHolder = Ui.button({
		name = "Burst",
		text = "💥 BURST OFF!",
		color = Theme.Color.Bad,
		size = UDim2.fromOffset(300, 92),
		position = UDim2.new(0.5, 0, 1, 0),
		anchor = Vector2.new(0.5, 1),
		radius = Theme.Radius.Pill,
		font = Theme.Font.Display,
		parent = riderPanel,
		onClick = function()
			input:press("Burst")
		end,
	})
end

local function updateRiderPanel()
	local rider = state.rider
	local isRider = state.playerState == "Rider" and rider ~= nil
	riderPanel.Visible = isRider
	if not isRider then
		return
	end
	local now = state:serverTime()
	local wait = (rider.burstAt or now) - now
	local by = rider.by or "someone"
	if wait > 0 then
		riderSub.Text = "Stuck to " .. by .. "'s ball! Burst off in " .. math.ceil(wait) .. "…"
		burstHolder.Visible = false
	else
		local hint = if input.inputType == "Gamepad" then "  (B)" elseif input.inputType == "Keyboard" then "  (F)" else ""
		riderSub.Text = "Smash out and knock their stuff loose! 💥" .. hint
		burstHolder.Visible = true
		local s = burstHolder:FindFirstChildOfClass("UIScale")
		if s then
			s.Scale = 1 + math.sin(os.clock() * 8) * 0.05
		end
	end
	riderTitle.Rotation = math.sin(os.clock() * 3) * 3
end

-- Little top-left feed: who rolled up whom (big banners only when you're involved).
function HudController:feed(text: string, color: Color3?)
	local row = Ui.new("TextLabel", {
		Size = UDim2.new(1, 0, 0, 26),
		Text = text,
		TextScaled = true,
		TextColor3 = color or Theme.Color.White,
		TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = math.floor(os.clock() * 100),
		Parent = feed,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	task.delay(5, function()
		Ui.tween(row, Theme.Tween.Smooth, { TextTransparency = 1 })
		local stroke = row:FindFirstChildOfClass("UIStroke")
		if stroke then
			Ui.tween(stroke, Theme.Tween.Smooth, { Transparency = 1 })
		end
		task.wait(0.3)
		row:Destroy()
	end)
	local rows = {}
	for _, c in feed:GetChildren() do
		if c:IsA("TextLabel") then
			table.insert(rows, c)
		end
	end
	if #rows > 5 then
		table.sort(rows, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		rows[1]:Destroy()
	end
end

local function buildContainers()
	floaters = Ui.new("Frame", {
		Name = "Floaters",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.62),
		Size = UDim2.fromOffset(300, 200),
		BackgroundTransparency = 1,
		Parent = root,
	})
	toasts = Ui.new("Frame", {
		Name = "Toasts",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -16, 0.5, 0),
		Size = UDim2.fromOffset(280, 360),
		BackgroundTransparency = 1,
		Parent = root,
	}, {
		Ui.new("UIListLayout", {
			Padding = UDim.new(0, 8),
			VerticalAlignment = Enum.VerticalAlignment.Bottom,
			HorizontalAlignment = Enum.HorizontalAlignment.Right,
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	banner = Ui.display("", {
		Name = "Banner",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.34),
		Size = UDim2.fromOffset(760, 110),
		TextTransparency = 1,
		Parent = root,
	})
	feed = Ui.new("Frame", {
		Name = "Feed",
		Position = UDim2.fromOffset(16, 76),
		Size = UDim2.fromOffset(340, 170),
		BackgroundTransparency = 1,
		Parent = root,
	}, { Ui.new("UIListLayout", { Padding = UDim.new(0, 2), SortOrder = Enum.SortOrder.LayoutOrder }) })
	countdownLabel = Ui.display("", {
		Name = "Countdown",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.45),
		Size = UDim2.fromOffset(260, 200),
		TextTransparency = 1,
		TextColor3 = Theme.Color.Accent,
		Parent = root,
	})
	loadingChip = Ui.new("TextLabel", {
		Name = "Loading",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -16),
		Size = UDim2.fromOffset(300, 30),
		TextScaled = true,
		Text = "",
		Visible = false,
		Parent = root,
	}, { Ui.stroke(2, Theme.Color.Ink) })
end

-- Behaviours ------------------------------------------------------------------------------------

function HudController:showBanner(text: string, color: Color3?, duration: number?)
	banner.Text = text
	banner.TextColor3 = color or Theme.Color.White
	banner.TextTransparency = 0
	local stroke = banner:FindFirstChildOfClass("UIStroke")
	if stroke then
		stroke.Transparency = 0
	end
	local s = banner:FindFirstChildOfClass("UIScale") or Ui.new("UIScale", { Parent = banner })
	s.Scale = 0.4
	Ui.tween(s, Theme.Tween.Bounce, { Scale = 1 })
	task.delay(duration or 2.2, function()
		if banner.Text == text then
			Ui.tween(banner, Theme.Tween.Smooth, { TextTransparency = 1 })
			if stroke then
				Ui.tween(stroke, Theme.Tween.Smooth, { Transparency = 1 })
			end
		end
	end)
end

local function floater(text: string, color: Color3, big: boolean?)
	local label = Ui.display(text, {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5 + (math.random() - 0.5) * 0.4, 0, 0.8, 0),
		Size = UDim2.fromOffset(if big then 260 else 160, if big then 54 else 34),
		TextColor3 = color,
		Parent = floaters,
	})
	local s = Ui.new("UIScale", { Scale = 0.5, Parent = label })
	Ui.tween(s, Theme.Tween.Pop, { Scale = 1 })
	Ui.tween(label, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = label.Position - UDim2.fromScale(0, 0.55),
	})
	task.delay(0.5, function()
		Ui.tween(label, Theme.Tween.Smooth, { TextTransparency = 1 })
		local stroke = label:FindFirstChildOfClass("UIStroke")
		if stroke then
			Ui.tween(stroke, Theme.Tween.Smooth, { Transparency = 1 })
		end
	end)
	task.delay(1, function()
		label:Destroy()
	end)
end

local function propModel(uid: number): Model?
	if PropBuilder.hasTemplate(uid) then
		return PropBuilder.template(uid)
	end
	return nil
end

function HudController:toast(uid: number, mutation: number, headline: string)
	local def = PropLibrary.get(uid)
	if not def then
		return
	end
	local mut = Mutations.get(mutation)
	local color = rarityColor(def.rarity)
	local card = Ui.new("Frame", {
		Size = UDim2.fromOffset(270, 76),
		BackgroundColor3 = Theme.Color.Panel,
		LayoutOrder = math.floor(os.clock() * 100),
		Parent = toasts,
	}, { Ui.corner(Theme.Radius.Medium), Ui.stroke(3, Theme.Color.Ink) })
	Ui.new("Frame", {
		Size = UDim2.new(0, 10, 1, 0),
		BackgroundColor3 = color,
		Parent = card,
	}, { Ui.corner(Theme.Radius.Medium) })
	Ui.viewport(propModel(uid), { Size = UDim2.fromOffset(64, 64), Position = UDim2.fromOffset(14, 6), Parent = card })
	Ui.new("TextLabel", {
		Text = headline,
		Position = UDim2.fromOffset(84, 6),
		Size = UDim2.new(1, -92, 0, 26),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextColor3 = color,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	Ui.new("TextLabel", {
		Text = (if mut then mut.name .. " " else "") .. def.name,
		Position = UDim2.fromOffset(84, 34),
		Size = UDim2.new(1, -92, 0, 22),
		TextScaled = true,
		TextColor3 = Theme.Color.Ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	})
	Ui.new("TextLabel", {
		Text = Rarity.get(def.rarity).glyph .. " " .. def.rarity,
		Position = UDim2.fromOffset(84, 56),
		Size = UDim2.new(1, -92, 0, 16),
		TextScaled = true,
		TextColor3 = color,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	}, { Ui.stroke(1, Theme.Color.Ink) })
	local s = Ui.new("UIScale", { Scale = 0.3, Parent = card })
	Ui.tween(s, Theme.Tween.Bounce, { Scale = 1 })
	task.delay(3, function()
		Ui.tween(s, Theme.Tween.Smooth, { Scale = 0 })
		task.wait(0.3)
		card:Destroy()
	end)
	-- Keep the stack short.
	local cards = {}
	for _, c in toasts:GetChildren() do
		if c:IsA("Frame") then
			table.insert(cards, c)
		end
	end
	if #cards > 4 then
		table.sort(cards, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		cards[1]:Destroy()
	end
end

-- "You can roll up TOASTERS now!" — the core growth reward, wordless-friendly (icon + check).
function HudController:goalUnlocked(uid: number)
	local def = PropLibrary.get(uid)
	if not def then
		return
	end
	local card = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.42),
		Size = UDim2.fromOffset(340, 120),
		BackgroundColor3 = Theme.Color.Accent,
		Parent = root,
	}, { Ui.corner(Theme.Radius.Large), Ui.stroke(4, Theme.Color.Ink) })
	Ui.viewport(propModel(uid), { Size = UDim2.fromOffset(110, 110), Position = UDim2.fromOffset(6, 5), Parent = card })
	Ui.display("✓ " .. def.name, {
		Position = UDim2.fromOffset(118, 16),
		Size = UDim2.new(1, -128, 0, 50),
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	})
	Ui.new("TextLabel", {
		Text = "can be rolled up now! 🟢",
		Position = UDim2.fromOffset(118, 68),
		Size = UDim2.new(1, -128, 0, 30),
		TextScaled = true,
		TextColor3 = Theme.Color.Ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	})
	local s = Ui.new("UIScale", { Scale = 0.2, Parent = card })
	Ui.tween(s, Theme.Tween.Bounce, { Scale = 1 })
	task.delay(1.6, function()
		Ui.tween(s, Theme.Tween.Smooth, { Scale = 0 })
		Ui.tween(card, Theme.Tween.Smooth, { Position = UDim2.fromScale(0.5, 0.2) })
		task.wait(0.3)
		card:Destroy()
	end)
	bumpSpring:impulse(6)
end

local function setTopRow(i: number, entry)
	local row = topList:FindFirstChild("Row" .. i)
	if not row then
		return
	end
	if not entry then
		row.Visible = false
		return
	end
	row.Visible = true
	row.BackgroundColor3 = if entry.userId == state.player.UserId then Theme.Color.MagicDark else Theme.Color.Ink
	local nameLabel = row:FindFirstChild("Name") :: TextLabel
	nameLabel.Text = entry.name
	local sizeLabel = row:FindFirstChild("Size") :: TextLabel
	sizeLabel.Text = Format.size(entry.d, cmPerStud())
	local avatar = row:FindFirstChild("Avatar") :: ImageLabel
	local thumb = thumbnails[entry.userId]
	if entry.userId < 0 then
		avatar.Image = "" -- bots have no avatar thumbnail; their name carries a 🤖
	elseif thumb then
		avatar.Image = thumb
	elseif thumb == nil then
		thumbnails[entry.userId] = false
		task.spawn(function()
			local ok, img = pcall(function()
				return Players:GetUserThumbnailAsync(entry.userId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size48x48)
			end)
			if ok then
				thumbnails[entry.userId] = img
			end
		end)
	end
end

local function updateGoal()
	local world = controllers.WorldController
	local goal = world and world.nextGoal
	if not state:isRolling() or not goal then
		goalCard.Visible = false
		return
	end
	goalCard.Visible = true
	if goalUid ~= goal.uid then
		local model = propModel(goal.uid)
		if model then
			goalUid = goal.uid
			Ui.setViewportModel(goalIcon, model)
			local s = goalCard:FindFirstChildOfClass("UIScale") or Ui.new("UIScale", { Parent = goalCard })
			s.Scale = 0.6
			Ui.tween(s, Theme.Tween.Bounce, { Scale = 1 })
		end
	end
	local def = PropLibrary.get(goal.uid)
	goalText.Text = (if def then def.name else "?") .. " @ " .. Format.size(goal.needDiameter, cmPerStud())
	local frac = math.clamp(state.diameter / goal.needDiameter, 0, 1)
	goalBar.Size = UDim2.fromScale(math.max(0.04, frac), 1)
end

function HudController:attachLandmarkMarker(p)
	if not p.model or not p.model.PrimaryPart then
		return
	end
	local hb = p.model.PrimaryPart
	local gui = Ui.new("BillboardGui", {
		Name = "LandmarkMarker",
		Size = UDim2.fromOffset(150, 70),
		StudsOffsetWorldSpace = Vector3.new(0, hb.Size.Y * 0.6 + 10, 0),
		AlwaysOnTop = true,
		LightInfluence = 0,
		MaxDistance = 5000,
		Adornee = hb,
		Parent = hb,
	})
	local label = Ui.display("🔒", { Size = UDim2.fromScale(1, 1), Parent = gui })
	local need = p.absorbSize / Tuning.Absorb.LandmarkReach
	task.spawn(function()
		while gui.Parent do
			if state:isFinalRoll() then
				local canNow = state.diameter >= need
				label.Text = if canNow then "⭐ ROLL IT UP! ⭐" else "⭐ " .. Format.size(need, cmPerStud())
				label.TextColor3 = if canNow then Theme.Color.Accent else Theme.Color.White
				label.Rotation = math.sin(os.clock() * 6) * 4
			else
				label.Text = "🔒 Final Roll"
				label.TextColor3 = Theme.Color.White
				label.Rotation = 0
			end
			task.wait(0.15)
		end
	end)
end

-- Results ---------------------------------------------------------------------------------------

local function closeResults()
	if resultsPanel then
		resultsPanel:Destroy()
		resultsPanel = nil
	end
end

local function showResults(results)
	closeResults()
	local panel = Ui.new("Frame", {
		Name = "Results",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.55),
		Size = UDim2.fromOffset(640, 420),
		BackgroundColor3 = Theme.Color.Panel,
		Parent = root,
	}, { Ui.corner(Theme.Radius.Large), Ui.stroke(4, Theme.Color.Ink), Ui.padding(18) })
	resultsPanel = panel
	local kit = Kits.get(results.kitId or "")
	Ui.display((if kit then kit.icon .. " " .. kit.name else "Round") .. " — Results", {
		Size = UDim2.new(1, 0, 0, 46),
		TextColor3 = Theme.Color.Primary,
		Parent = panel,
	})
	local awards = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 56),
		Size = UDim2.new(1, 0, 0, 230),
		BackgroundTransparency = 1,
		Parent = panel,
	}, {
		Ui.new("UIGridLayout", { CellSize = UDim2.fromOffset(190, 108), CellPadding = UDim2.fromOffset(10, 10), SortOrder = Enum.SortOrder.LayoutOrder }),
	})
	for i, award in results.awards or {} do
		local cardColor = if award.userId == state.player.UserId then Theme.Color.Accent else Theme.Color.PanelAlt
		local card = Ui.new("Frame", { LayoutOrder = i, BackgroundColor3 = cardColor, Parent = awards }, { Ui.corner(Theme.Radius.Medium), Ui.stroke(3, Theme.Color.Ink) })
		Ui.new("TextLabel", { Text = award.icon, Size = UDim2.fromOffset(44, 44), Position = UDim2.fromOffset(8, 8), TextScaled = true, Parent = card })
		Ui.new("TextLabel", { Text = award.title, Position = UDim2.fromOffset(56, 10), Size = UDim2.new(1, -62, 0, 26), TextScaled = true, TextColor3 = Theme.Color.Ink, TextXAlignment = Enum.TextXAlignment.Left, Parent = card })
		Ui.new("TextLabel", { Text = award.name, Position = UDim2.fromOffset(10, 58), Size = UDim2.new(1, -20, 0, 32), TextScaled = true, FontFace = Theme.Font.Display, TextColor3 = Theme.Color.MagicDark, Parent = card })
	end
	local mine = results.mine
	local payout = results.payout
	local summary = "Your ball: " .. Format.size(mine and mine.finalDiameter or 0, results.cmPerStud or 1)
	if payout then
		summary ..= "    ✨ +" .. Format.commas(payout.total) .. " Stardust"
	end
	Ui.display(summary, {
		Position = UDim2.new(0, 0, 1, -100),
		Size = UDim2.new(1, 0, 0, 40),
		TextColor3 = Theme.Color.Ink,
		Parent = panel,
	}).TextStrokeTransparency = 1
	local countdown = Ui.new("TextLabel", {
		Position = UDim2.new(0, 0, 1, -48),
		Size = UDim2.new(1, 0, 0, 32),
		TextScaled = true,
		TextColor3 = Theme.Color.InkSoft,
		Parent = panel,
	})
	task.spawn(function()
		while resultsPanel == panel do
			local left = state:timeLeft()
			if state.round.state == "Results" then
				countdown.Text = "Hub in " .. math.ceil(left)
			elseif state.round.state == "Intermission" then
				countdown.Text = "Next round in " .. math.ceil(left)
			else
				break
			end
			task.wait(0.2)
		end
		closeResults()
	end)
	local s = Ui.new("UIScale", { Scale = 0.3, Parent = panel })
	Ui.tween(s, Theme.Tween.Pop, { Scale = 1 })
end

-- Loop ------------------------------------------------------------------------------------------

local function update(dt: number)
	-- Size counter: springy count-up and bump.
	sizeSpring.target = state.diameter
	local d = sizeSpring:step(dt)
	local value, unit = Format.sizeParts(math.max(d, 0.1), cmPerStud())
	sizeValue.Text = value
	sizeUnit.Text = unit
	if unit ~= lastUnit then
		lastUnit = unit
		HudController:showBanner("📏 " .. string.upper(unit) .. "!", Theme.Color.Accent, 1.6)
		bumpSpring:impulse(10)
	end
	sizeScale.Scale = bumpSpring:step(dt)
	local rolling = state:isRolling() or state.playerState == "Rider"
	local sizeHolder = sizeValue.Parent :: Frame
	sizeHolder.Visible = rolling

	-- Aggregate tiny gains into readable floaters.
	if pendingGain > 0 and os.clock() - pendingAt > 0.18 then
		local v, u = Format.sizeParts(pendingGain, cmPerStud())
		floater("+" .. v .. " " .. u, Theme.Color.Good)
		pendingGain = 0
	end

	-- Timer.
	local round = state.round
	local left = state:timeLeft()
	timerLabel.Text = Format.clock(left)
	local final = state:isFinalRoll()
	timerPill.BackgroundColor3 = if final then Theme.Color.Bad else Theme.Color.Panel
	timerLabel.TextColor3 = if final then Theme.Color.White else Theme.Color.Ink
	timerPill.Visible = round.state == "Playing"

	-- The last 10 seconds count down big so the launch is never a surprise.
	if round.state == "Playing" and left <= 10.5 and left > 0 then
		local n = math.ceil(left - 0.5)
		if n ~= lastCountdown and n >= 1 and n <= 10 then
			lastCountdown = n
			countdownLabel.Text = tostring(n)
			countdownLabel.TextTransparency = 0
			local stroke = countdownLabel:FindFirstChildOfClass("UIStroke")
			if stroke then
				stroke.Transparency = 0
			end
			local s = countdownLabel:FindFirstChildOfClass("UIScale") or Ui.new("UIScale", { Parent = countdownLabel })
			s.Scale = 1.6
			Ui.tween(s, Theme.Tween.Pop, { Scale = 1 })
			Ui.tween(countdownLabel, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { TextTransparency = 0.6 })
			if controllers.AudioController then
				controllers.AudioController:play("Tick", { pitch = 1 + (10 - n) * 0.06 })
			end
			if n == 10 then
				HudController:showBanner("🚀 Launch in 10! Get BIG!", Theme.Color.Accent, 1.8)
			end
		end
	elseif lastCountdown ~= -1 then
		lastCountdown = -1
		countdownLabel.TextTransparency = 1
		local stroke = countdownLabel:FindFirstChildOfClass("UIStroke")
		if stroke then
			stroke.Transparency = 1
		end
	end
	topList.Visible = round.state == "Playing"

	-- Touch buttons + dash cooldown.
	touchButtons.Visible = input.inputType == "Touch" and state:isRolling()
	if dashFill then
		local p = controllers.MovementController:dashProgress()
		dashFill.Size = UDim2.fromScale(1, 1 - p)
	end
end

function HudController:start()
	state = controllers.ClientState
	settings = controllers.SettingsController
	input = controllers.InputController
	Ui.onClickSound = function()
		if controllers.AudioController then
			controllers.AudioController:play("Click")
		end
	end
	gui = Ui.new("ScreenGui", {
		Name = "RollHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	Ui.autoScale(gui)
	root = Ui.new("Frame", {
		Name = "Root",
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Parent = gui,
	}, {
		Ui.new("UIPadding", { PaddingTop = UDim.new(0, 36), PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8) }),
	})
	buildSizeCounter()
	buildGoalCard()
	buildTimer()
	buildTopList()
	buildTouchButtons()
	buildContainers()
	buildCombo()
	buildSpeedLines()
	buildRiderPanel()
	controllers.WorldController.PropAbsorbed:Connect(function(_, absorberKey, isPrediction)
		if isPrediction and absorberKey == state.player.UserId then
			onLocalAbsorb()
		end
	end)
	controllers.MovementController.Bonked:Connect(function(_, hitPart)
		self:bonkGauge(hitPart)
	end)

	sizeSpring:snap(state.diameter)
	state.DiameterChanged:Connect(function(new, old)
		if new > old then
			pendingGain += new - old
			pendingAt = os.clock()
			bumpSpring:impulse(math.clamp((new - old) / old * 8, 0.3, 4))
		end
	end)
	state.BallChanged:Connect(function(part)
		if part then
			sizeSpring:snap(state.diameter)
		end
	end)
	Net.connect("Absorbed", function(list)
		for _, a in list do
			local def = PropLibrary.get(a.uid)
			if def then
				if a.n then
					self:toast(a.uid, a.m, "✨ NEW!")
				elseif a.v then
					self:toast(a.uid, a.m, "✨ NEW VARIANT!")
				elseif Rarity.get(def.rarity).toast or a.m > 0 then
					self:toast(a.uid, a.m, Rarity.get(def.rarity).glyph .. " " .. def.rarity .. "!")
				end
			end
		end
	end)
	controllers.WorldController.GoalUnlocked:Connect(function(uid)
		self:goalUnlocked(uid)
	end)
	controllers.WorldController.TemplateProgress:Connect(function(done, total)
		loadingChip.Visible = done < total
		loadingChip.Text = string.format("✨ Building the world… %d%%", math.floor(done / total * 100))
	end)
	state.RoundChanged:Connect(function(round: any, previous: any)
		for i = 1, 3 do
			setTopRow(i, round.top and round.top[i])
		end
		local enteredFinal = round.phase == "FinalRoll" and previous.phase ~= "FinalRoll"
		local enteredPlaying = round.state == "Playing" and previous.state ~= "Playing"
		local enteredLaunch = round.state == "Launch" and previous.state ~= "Launch"
		if enteredFinal then
			self:showBanner("⭐ FINAL ROLL! ⭐", Theme.Color.Accent, 2.8)
		elseif enteredPlaying then
			local kit = Kits.get(round.kitId or "")
			self:showBanner(if kit then kit.icon .. " " .. kit.name else "ROLL!", Theme.Color.White, 2.2)
		elseif enteredLaunch then
			self:showBanner("🚀 LAUNCH! 🚀", Theme.Color.Accent, 2.5)
		end
	end)
	state.ResultsReceived:Connect(showResults)
	Net.connect("Announce", function(kind, data)
		if kind == "rolled" and data then
			local me = state.player.UserId
			if data.hostId == me then
				self:showBanner("🌀 You rolled up " .. tostring(data.victimName) .. "!", Theme.Color.Accent, 2.2)
				bumpSpring:impulse(10)
			elseif data.victimId ~= me then
				self:feed("🌀 " .. tostring(data.hostName) .. " rolled up " .. tostring(data.victimName), Theme.Color.Secondary)
			end
			return
		end
		if kind == "legendary" and data then
			local def = PropLibrary.get(data.uid)
			self:showBanner("🌟 " .. tostring(data.name) .. " found " .. (if def then def.name else "a Legendary") .. "!", rarityColor("Legendary"), 3)
		end
	end)
	RunService.RenderStepped:Connect(function(dt)
		update(dt)
		updateRiderPanel()
		updateSpeedLines(dt)
		fadeCombo()
	end)
	task.spawn(function()
		while true do
			task.wait(0.25)
			pcall(updateGoal)
		end
	end)
end

return HudController
