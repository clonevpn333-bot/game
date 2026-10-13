--!nonstrict
-- Out-of-round progression UI: the side menu (Stardust counter, Nana's requests, Rolledex, Shop,
-- Galaxy), all menu panels, hub station prompts, the daily streak popup on join, server toasts
-- (boosts, finished requests, warnings, new planets) and the compact Nana tracker during rounds.

local Players = game:GetService("Players")
local ProximityPromptService = game:GetService("ProximityPromptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Format = require(Shared.Util.Format)
local Spring = require(Shared.Util.Spring)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Panels = script.Parent.Parent.Panels
local Common = require(Panels.Common)
local StreakPanel = require(Panels.StreakPanel)
local RequestsPanel = require(Panels.RequestsPanel)
local RolledexPanel = require(Panels.RolledexPanel)
local ShopPanel = require(Panels.ShopPanel)
local GalaxyPanel = require(Panels.GalaxyPanel)

local MenuController = {}

local controllers
local state
local gui: ScreenGui
local menu: Frame
local stardustLabel: TextLabel
local stardustSpring = Spring.new(0, 90, 14)
local stardustShown = 0
local notices: Frame
local panels: { [string]: any } = {}
local tracker
local badges = {}
local streakPopupDone = false

function MenuController:init(c)
	controllers = c
end

-- A short notice that slides in at the top centre (stacking).
function MenuController:notify(icon: string, text: string, color: Color3?)
	local card = Ui.new("Frame", {
		Size = UDim2.fromOffset(420, 52),
		BackgroundColor3 = Theme.Color.Panel,
		Parent = notices,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, color or Theme.Color.Ink) })
	Ui.new("TextLabel", {
		Text = icon,
		Position = UDim2.fromOffset(10, 6),
		Size = UDim2.fromOffset(40, 40),
		TextScaled = true,
		Parent = card,
	})
	Ui.new("TextLabel", {
		Text = text,
		Position = UDim2.fromOffset(58, 8),
		Size = UDim2.new(1, -72, 1, -16),
		TextScaled = true,
		TextColor3 = Theme.Color.Ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	})
	local scale = Ui.new("UIScale", { Scale = 0.3, Parent = card })
	Ui.tween(scale, Theme.Tween.Pop, { Scale = 1 })
	if controllers.AudioController then
		controllers.AudioController:play("Toast")
	end
	task.delay(4, function()
		local t = Ui.tween(scale, Theme.Tween.Smooth, { Scale = 0 })
		t.Completed:Wait()
		card:Destroy()
	end)
end

local function menuButton(order: number, icon: string, label: string, color: Color3, onClick: () -> ())
	local _, holder = Ui.button({
		text = icon,
		size = UDim2.fromOffset(64, 64),
		color = color,
		radius = Theme.Radius.Pill,
		order = order,
		parent = menu,
		onClick = onClick,
	})
	Ui.new("TextLabel", {
		Text = label,
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 1, -8),
		Size = UDim2.fromOffset(84, 18),
		TextScaled = true,
		ZIndex = 3,
		Parent = holder,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	local badge = Ui.new("TextLabel", {
		Text = "!",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, 4, 0, -4),
		Size = UDim2.fromOffset(24, 24),
		BackgroundColor3 = Theme.Color.Bad,
		BackgroundTransparency = 0,
		TextScaled = true,
		Visible = false,
		ZIndex = 4,
		Parent = holder,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(2, Theme.Color.Ink) })
	return holder, badge
end

local function buildMenu()
	menu = Ui.new("Frame", {
		Name = "SideMenu",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 16, 0.56, 0),
		Size = UDim2.fromOffset(180, 420),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = gui,
	}, {
		Ui.new("UIListLayout", {
			Padding = UDim.new(0, 18),
			SortOrder = Enum.SortOrder.LayoutOrder,
			HorizontalAlignment = Enum.HorizontalAlignment.Left,
		}),
	})
	local pill = Ui.new("Frame", {
		Name = "Stardust",
		Size = UDim2.fromOffset(170, 46),
		BackgroundColor3 = Theme.Color.Panel,
		LayoutOrder = 0,
		Parent = menu,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, Theme.Color.Ink) })
	stardustLabel = Ui.new("TextLabel", {
		Text = "✨ 0",
		Position = UDim2.fromOffset(12, 6),
		Size = UDim2.new(1, -24, 1, -12),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextColor3 = Theme.Color.AccentDark,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = pill,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	Common.flyTarget = pill
	local _, nanaBadge = menuButton(1, "🧶", "Nana", Theme.Color.Magic, function()
		panels.requests.panel:toggle()
	end)
	local _, dexBadge = menuButton(2, "📖", "Rolledex", Theme.Color.Secondary, function()
		panels.rolledex.panel:toggle()
	end)
	menuButton(3, "🛍️", "Shop", Theme.Color.Primary, function()
		panels.shop.panel:toggle()
	end)
	menuButton(4, "🌌", "Galaxy", Theme.Color.MagicDark, function()
		panels.galaxy.panel:toggle()
	end)
	badges.nana = nanaBadge
	badges.dex = dexBadge
end

local function updateBadges(profile)
	if not profile then
		return
	end
	local claimable = panels.streak:claimable(profile)
	for _, req in profile.daily.requests do
		if req.done and not req.claimed then
			claimable = true
		end
	end
	badges.nana.Visible = claimable
	-- New Rolledex entries since the book was last opened.
	local dex = panels.rolledex
	if dex.seenCount == nil then
		dex.seenCount = dex.foundCount or 0
	end
	badges.dex.Visible = (dex.foundCount or 0) > dex.seenCount
end

local function onProfile(profile)
	for _, p in panels do
		local ok, err = pcall(p.refresh, p, profile)
		if not ok then
			warn("[Menu] panel refresh: " .. tostring(err))
		end
	end
	updateBadges(profile)
	if tracker then
		tracker.update(profile, state)
	end
end

local function onToast(kind: string, data)
	data = data or {}
	if kind == "daily" then
		-- Pop the streak card shortly after joining (once the world has had a moment to settle).
		if data.streakClaimable and (not streakPopupDone or data.newDay) then
			streakPopupDone = true
			task.delay(if data.newDay then 0.5 else 3, function()
				if not Panel.current() and state.playerState ~= "Rolling" then
					panels.streak.panel:open()
				elseif data.newDay then
					MenuController:notify("🌙", "A new day! Claim your streak and Nana's new requests.", Theme.Color.Magic)
				end
			end)
		end
	elseif kind == "request" then
		MenuController:notify(data.icon or "🧶", "Request done! " .. tostring(data.text or "") .. "  (+" .. tostring(data.reward or 0) .. " ✨)", Theme.Color.Magic)
		if controllers.AudioController then
			controllers.AudioController:play("NewDiscovery")
		end
	elseif kind == "boost" then
		local reasons = { comeback = "Comeback boost!", catchup = "Catch-up boost!" }
		MenuController:notify("⚡", string.format("%s Grow x%.1f for %ds", reasons[data.reason] or "Growth boost!", data.mult or 1, data.duration or 0), Theme.Color.Accent)
	elseif kind == "warning" then
		MenuController:notify("⚠️", tostring(data.text or "Something went wrong"), Theme.Color.Bad)
	end
end

local function onPlanet(planet)
	if type(planet) ~= "table" then
		return
	end
	local cm = (state.round and state.round.cmPerStud) or 1
	task.delay(3.5, function()
		MenuController:notify("🪐", string.format("New planet: %s (%s)! See it in your Galaxy.", tostring(planet.name), Format.size(planet.d or 0, cm)), Theme.Color.Magic)
	end)
end

local function onPrompt(prompt: ProximityPrompt)
	local node = prompt.Parent
	local station = nil
	while node and node ~= workspace do
		station = node:GetAttribute("Station")
		if station then
			break
		end
		node = node.Parent
	end
	local map = {
		Requests = panels.requests,
		Rolledex = panels.rolledex,
		Shop = panels.shop,
		Cores = panels.shop,
		Galaxy = panels.galaxy,
	}
	local target = station and map[station]
	if target then
		if station == "Cores" then
			target.tab = "Cores"
		elseif station == "Shop" then
			target.tab = "Shells"
		end
		target.panel:open()
	end
end

local function update(dt: number)
	local profile = state.profile
	local rolling = state.playerState == "Rolling" or state.playerState == "Rider" or state.playerState == "Merged"
	local roundState = state.round and state.round.state
	local inShow = roundState == "Launch"
	menu.Visible = profile ~= nil and not rolling and not inShow
	if tracker then
		tracker.frame.Visible = profile ~= nil and rolling and roundState == "Playing" and tracker.hasOpen == true
	end
	if rolling and Panel.current() then
		Panel.closeAll()
	end
	-- Rolling counter for Stardust.
	if profile then
		stardustSpring.target = profile.stardust
		if stardustShown == 0 and profile.stardust > 0 and stardustSpring.position == 0 then
			stardustSpring:snap(profile.stardust) -- first sync: no count-up from zero
		end
		local shown = math.floor(stardustSpring:step(dt) + 0.5)
		if shown ~= stardustShown then
			stardustShown = shown
			stardustLabel.Text = "✨ " .. Format.commas(shown)
		end
	end
end

function MenuController:start()
	state = controllers.ClientState
	gui = Ui.new("ScreenGui", {
		Name = "MenuHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 10,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	Ui.autoScale(gui)
	notices = Ui.new("Frame", {
		Name = "Notices",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -130),
		Size = UDim2.fromOffset(440, 300),
		BackgroundTransparency = 1,
		ZIndex = 100,
		Parent = gui,
	}, {
		Ui.new("UIListLayout", {
			Padding = UDim.new(0, 8),
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			VerticalAlignment = Enum.VerticalAlignment.Bottom,
		}),
	})
	local ctx = {
		gui = gui,
		controllers = controllers,
		state = state,
		notify = function(icon, text, color)
			MenuController:notify(icon, text, color)
		end,
	}
	ctx.openStreak = function()
		panels.streak.panel:open()
	end
	buildMenu()
	panels.streak = StreakPanel.new(ctx)
	panels.requests = RequestsPanel.new(ctx)
	panels.rolledex = RolledexPanel.new(ctx)
	panels.shop = ShopPanel.new(ctx)
	panels.galaxy = GalaxyPanel.new(ctx)
	panels.rolledex.panel.Opened:Connect(function()
		panels.rolledex.seenCount = panels.rolledex.foundCount or 0
		badges.dex.Visible = false
	end)
	tracker = RequestsPanel.buildTracker(gui, function()
		-- Tapping the tracker mid-round just flashes it; the board opens between rounds.
		MenuController:notify("🧶", "Claim Nana's rewards from the menu between rounds!", Theme.Color.Magic)
	end)
	local baseUpdate = tracker.update
	tracker.update = function(profile, s)
		tracker.hasOpen = baseUpdate(profile, s)
		return tracker.hasOpen
	end
	state.ProfileChanged:Connect(onProfile)
	if state.profile then
		onProfile(state.profile)
	end
	Net.connect("Toast", onToast)
	Net.connect("PlanetCreated", onPlanet)
	ProximityPromptService.PromptTriggered:Connect(onPrompt)
	state.ResultsReceived:Connect(function()
		-- Results show Stardust earned; nudge the badge state after the payout sync.
		task.delay(1, function()
			updateBadges(state.profile)
		end)
	end)
	RunService.RenderStepped:Connect(update)
end

return MenuController
