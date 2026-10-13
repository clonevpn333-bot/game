--!nonstrict
-- Nana Nova's request board: Nana knitting in a viewport with a speech bubble, today's three
-- requests (easy / medium / hard) with live progress, CLAIM and one free swap, the all-three bonus
-- and a countdown to new requests. Also builds the compact in-round tracker.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Format = require(Shared.Util.Format)
local Daily = require(Shared.Logic.Daily)
local NanaNova = require(Shared.Data.NanaNova)
local Cosmetics = require(Shared.Data.Cosmetics)
local PropBuilder = require(Shared.PropBuilder)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Common = require(script.Parent.Common)

local RequestsPanel = {}
RequestsPanel.__index = RequestsPanel

local TIER_STARS = { "⭐", "⭐⭐", "⭐⭐⭐" }
local TIER_COLORS = { Theme.Color.Good, Theme.Color.Secondary, Theme.Color.Magic }

local function sizeFormatter(state)
	local cm = (state.round and state.round.cmPerStud) or 1
	return function(studs: number)
		return Format.size(studs, cm)
	end
end

function RequestsPanel.new(ctx)
	local self = setmetatable({}, RequestsPanel)
	self.ctx = ctx
	self.panel = Panel.new({
		name = "Requests",
		title = "Nana's Requests",
		icon = "🧶",
		color = Theme.Color.Magic,
		size = Vector2.new(860, 540),
		parent = ctx.gui,
	})
	local body = self.panel.body

	-- Header: streak chip opens the streak panel.
	local streakChip = Ui.button({
		text = "🔥 Day 0",
		size = UDim2.fromOffset(150, 44),
		position = UDim2.fromOffset(70, -2),
		color = Theme.Color.Primary,
		radius = Theme.Radius.Pill,
		parent = self.panel.headerRight,
		onClick = function()
			if ctx.openStreak then
				ctx.openStreak()
			end
		end,
	})
	self.streakChip = streakChip

	-- Left: Nana and her speech bubble.
	local left = Ui.new("Frame", {
		Size = UDim2.new(0, 250, 1, 0),
		BackgroundTransparency = 1,
		Parent = body,
	})
	self.nanaViewport = Ui.viewport(nil, {
		Size = UDim2.new(1, 0, 0, 290),
		Position = UDim2.fromOffset(0, 90),
		Parent = left,
	})
	local bubble = Common.card(left, {
		Size = UDim2.new(1, 0, 0, 80),
		BackgroundColor3 = Theme.Color.Paper,
	})
	self.bubbleText = Common.text(bubble, "", {
		Position = UDim2.fromOffset(10, 8),
		Size = UDim2.new(1, -20, 1, -16),
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	Ui.new("TextLabel", {
		Text = "▼",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 1, -6),
		Size = UDim2.fromOffset(30, 24),
		TextScaled = true,
		TextColor3 = Theme.Color.Paper,
		Parent = bubble,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	self.knitLabel = Common.text(left, "", {
		Position = UDim2.new(0, 0, 1, -30),
		Size = UDim2.new(1, 0, 0, 26),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = Theme.Color.InkSoft,
	})

	-- Right: the three request cards.
	local right = Ui.new("Frame", {
		Position = UDim2.fromOffset(266, 0),
		Size = UDim2.new(1, -266, 1, 0),
		BackgroundTransparency = 1,
		Parent = body,
	})
	self.cards = {}
	for slot = 1, 3 do
		local card = Common.card(right, {
			Position = UDim2.fromOffset(0, (slot - 1) * 112),
			Size = UDim2.new(1, 0, 0, 102),
		})
		local stars = Common.text(card, TIER_STARS[slot], {
			Position = UDim2.fromOffset(12, 6),
			Size = UDim2.fromOffset(110, 22),
		})
		local icon = Ui.new("TextLabel", {
			Text = "🧺",
			Position = UDim2.fromOffset(12, 32),
			Size = UDim2.fromOffset(56, 56),
			TextScaled = true,
			Parent = card,
		})
		local desc = Common.text(card, "", {
			Position = UDim2.fromOffset(78, 30),
			Size = UDim2.new(1, -250, 0, 28),
		})
		local barFrame, setBar = Common.bar(card, TIER_COLORS[slot], {
			Position = UDim2.fromOffset(78, 64),
			Size = UDim2.new(1, -250, 0, 24),
		})
		local reward = Common.text(card, "", {
			AnchorPoint = Vector2.new(1, 0),
			Position = UDim2.new(1, -12, 0, 6),
			Size = UDim2.fromOffset(150, 24),
			TextXAlignment = Enum.TextXAlignment.Right,
			TextColor3 = Theme.Color.AccentDark,
		})
		local action, actionHolder = Ui.button({
			text = "CLAIM",
			size = UDim2.fromOffset(150, 52),
			anchor = Vector2.new(1, 1),
			position = UDim2.new(1, -12, 1, -10),
			color = Theme.Color.Good,
			parent = card,
			onClick = function()
				self:act(slot)
			end,
		})
		local doneMark = Common.text(card, "✅ Done!", {
			AnchorPoint = Vector2.new(1, 1),
			Position = UDim2.new(1, -12, 1, -18),
			Size = UDim2.fromOffset(150, 34),
			TextXAlignment = Enum.TextXAlignment.Center,
			TextColor3 = Theme.Color.GoodDark,
			Visible = false,
		})
		self.cards[slot] = {
			card = card,
			stars = stars,
			icon = icon,
			desc = desc,
			bar = barFrame,
			setBar = setBar,
			reward = reward,
			action = action,
			actionHolder = actionHolder,
			doneMark = doneMark,
			mode = "none",
		}
	end
	local bonusCard = Common.card(right, {
		Position = UDim2.fromOffset(0, 336),
		Size = UDim2.new(1, 0, 0, 92),
		BackgroundColor3 = Color3.fromRGB(255, 246, 214),
	})
	self.bonusText = Common.text(bonusCard, "", {
		Position = UDim2.fromOffset(14, 8),
		Size = UDim2.new(1, -28, 0, 28),
	})
	local _, setBonus = Common.bar(bonusCard, Theme.Color.Accent, {
		Position = UDim2.fromOffset(14, 44),
		Size = UDim2.new(1, -28, 0, 22),
	})
	self.setBonus = setBonus
	self.resetText = Common.text(bonusCard, "", {
		Position = UDim2.fromOffset(14, 68),
		Size = UDim2.new(1, -28, 0, 18),
		TextColor3 = Theme.Color.InkSoft,
	})

	self.panel.Opened:Connect(function()
		self:ensureNana()
		local lines = NanaNova.Lines.request
		self.bubbleText.Text = lines[math.random(1, #lines)]
		self:refresh(ctx.state.profile)
	end)
	-- Keep the countdown ticking and Nana gently bobbing while open.
	RunService.Heartbeat:Connect(function()
		if not self.panel.isOpen then
			return
		end
		self.resetText.Text = "🌙 New requests in " .. Common.countdown(Daily.secondsUntilReset(Workspace:GetServerTimeNow()))
		local cam = self.nanaViewport.CurrentCamera
		if cam and self.nanaModel then
			local t = os.clock()
			self.nanaModel:PivotTo(CFrame.Angles(0, math.sin(t * 0.8) * 0.25, 0) * CFrame.Angles(math.sin(t * 1.6) * 0.03, 0, 0))
		end
	end)
	return self
end

function RequestsPanel:ensureNana()
	if self.nanaModel or self.buildingNana then
		return
	end
	self.buildingNana = true
	task.spawn(function()
		local model = PropBuilder.buildParts(NanaNova.Parts, "NanaPanel")
		Ui.setViewportModel(self.nanaViewport, model)
		model:Destroy()
		self.nanaModel = self.nanaViewport:FindFirstChildOfClass("Model")
		self.buildingNana = false
	end)
end

function RequestsPanel:refresh(profile)
	if not profile then
		return
	end
	local daily = profile.daily
	self.streakChip.Text = "🔥 Day " .. (profile.streak and profile.streak.count or 0)
	local fmt = sizeFormatter(self.ctx.state)
	local claimed = 0
	for slot, entry in self.cards do
		local req = daily.requests[slot]
		if not req then
			entry.card.Visible = false
			continue
		end
		entry.card.Visible = true
		entry.icon.Text = Daily.icon(req)
		entry.desc.Text = Daily.describe(req, fmt)
		entry.reward.Text = "+" .. req.reward .. " ✨"
		local progressText = if req.kind == "reachSize"
			then string.format("%s / %s", fmt(req.progress), fmt(req.target))
			else string.format("%d / %d", req.progress, req.target)
		entry.setBar(req.progress / math.max(1, req.target), progressText)
		if req.claimed then
			claimed += 1
			entry.mode = "claimed"
			entry.actionHolder.Visible = false
			entry.doneMark.Visible = true
		elseif req.done then
			entry.mode = "claim"
			entry.actionHolder.Visible = true
			entry.doneMark.Visible = false
			entry.action.Text = "CLAIM"
			entry.action.BackgroundColor3 = Theme.Color.Good
		elseif (daily.swaps or 0) < 1 then
			entry.mode = "swap"
			entry.actionHolder.Visible = true
			entry.doneMark.Visible = false
			entry.action.Text = "🔄 Swap"
			entry.action.BackgroundColor3 = Theme.Color.Secondary
		else
			entry.mode = "none"
			entry.actionHolder.Visible = false
			entry.doneMark.Visible = false
		end
	end
	if daily.bonusClaimed then
		self.bonusText.Text = "🎁 Nana's bonus collected! Come back tomorrow 💜"
		self.setBonus(1, "3 / 3")
	else
		self.bonusText.Text = "🎁 Finish all three for +" .. Daily.AllDoneBonus .. " ✨ bonus!"
		self.setBonus(claimed / 3, claimed .. " / 3")
	end
	local knit = Cosmetics.ById.Knitted
	if knit and not profile.cosmetics.shells.Knitted then
		self.knitLabel.Text = string.format("%s Knit shell: %d / %d days", knit.icon, math.min(profile.nanaDays or 0, Daily.KnitShellDays), Daily.KnitShellDays)
	else
		self.knitLabel.Text = "🧶 Thank you, dearie!"
	end
end

function RequestsPanel:act(slot: number)
	local entry = self.cards[slot]
	if entry.mode == "claim" then
		local ok, result = Net.request("ClaimRequest", slot)
		if ok and type(result) == "table" then
			Common.flyStars(entry.action, self.ctx.gui, 10)
			local lines = NanaNova.Lines.complete
			self.bubbleText.Text = lines[math.random(1, #lines)]
			local audio = self.ctx.controllers.AudioController
			if audio then
				audio:play("Coin")
			end
			if result.bonus then
				self.ctx.notify("🎁", "Nana's bonus! +" .. result.bonus .. " Stardust", Theme.Color.Accent)
			end
			if result.shell then
				self.ctx.notify("🧶", "You earned Nana's Knit shell!", Theme.Color.Magic)
			end
		end
	elseif entry.mode == "swap" then
		local ok = Net.request("SwapRequest", slot)
		if ok then
			self.bubbleText.Text = "🧶 Hmm, how about this instead?"
		end
	end
end

-- Compact live tracker for the HUD during a round: three tiny progress rows.
function RequestsPanel.buildTracker(parent: Instance, onClick: () -> ())
	local frame = Ui.new("TextButton", {
		Name = "NanaTracker",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 16, 0.56, 0),
		Size = UDim2.fromOffset(236, 112),
		BackgroundColor3 = Theme.Color.Panel,
		BackgroundTransparency = 0.12,
		AutoButtonColor = false,
		Text = "",
		Visible = false,
		Parent = parent,
	}, { Ui.corner(Theme.Radius.Medium), Ui.stroke(3, Theme.Color.Ink) })
	frame.Activated:Connect(onClick)
	Ui.new("TextLabel", {
		Text = "🧶 Nana's requests",
		Position = UDim2.fromOffset(10, 4),
		Size = UDim2.new(1, -20, 0, 20),
		TextScaled = true,
		TextColor3 = Theme.Color.Magic,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = frame,
	}, { Ui.stroke(1.5, Theme.Color.Ink) })
	local rows = {}
	for slot = 1, 3 do
		local icon = Ui.new("TextLabel", {
			Text = "",
			Position = UDim2.fromOffset(8, 28 + (slot - 1) * 27),
			Size = UDim2.fromOffset(24, 24),
			TextScaled = true,
			Parent = frame,
		})
		local _, setBar = Common.bar(frame, TIER_COLORS[slot], {
			Position = UDim2.fromOffset(38, 30 + (slot - 1) * 27),
			Size = UDim2.new(1, -48, 0, 20),
		})
		rows[slot] = { icon = icon, set = setBar }
	end
	local tracker = { frame = frame }
	function tracker.update(profile, state)
		if not profile or not profile.daily or #profile.daily.requests == 0 then
			frame.Visible = false
			return false
		end
		local fmt = sizeFormatter(state)
		local anyOpen = false
		for slot, row in rows do
			local req = profile.daily.requests[slot]
			if req then
				row.icon.Text = if req.done then "✅" else Daily.icon(req)
				local text = if req.done
					then (if req.claimed then "Done!" else "Claim in the menu!")
					elseif req.kind == "reachSize" then fmt(req.progress) .. " / " .. fmt(req.target)
					else string.format("%d / %d", req.progress, req.target)
				row.set(req.progress / math.max(1, req.target), text)
				if not req.claimed then
					anyOpen = true
				end
			end
		end
		return anyOpen
	end
	return tracker
end

return RequestsPanel
