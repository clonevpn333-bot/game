--!nonstrict
-- Daily login streak popup: a week of reward cards (claimed / today / upcoming), the big CLAIM
-- button, the next exclusive shell milestone and a countdown to tomorrow. Pops up on join when a
-- claim is waiting.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Daily = require(Shared.Logic.Daily)
local Cosmetics = require(Shared.Data.Cosmetics)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Common = require(script.Parent.Common)

local StreakPanel = {}
StreakPanel.__index = StreakPanel

function StreakPanel.new(ctx)
	local self = setmetatable({}, StreakPanel)
	self.ctx = ctx
	self.panel = Panel.new({
		name = "Streak",
		title = "Daily Streak",
		icon = "🔥",
		color = Theme.Color.Primary,
		size = Vector2.new(780, 440),
		parent = ctx.gui,
	})
	local body = self.panel.body
	self.subtitle = Common.text(body, "", {
		Size = UDim2.new(1, 0, 0, 30),
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	local row = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 40),
		Size = UDim2.new(1, 0, 0, 170),
		BackgroundTransparency = 1,
		Parent = body,
	}, {
		Ui.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			Padding = UDim.new(0, 8),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	self.days = {}
	for i = 1, 7 do
		local card = Common.card(row, { Size = UDim2.fromOffset(96, 160), LayoutOrder = i })
		local dayLabel = Common.text(card, "Day " .. i, {
			Position = UDim2.fromOffset(6, 6),
			Size = UDim2.new(1, -12, 0, 26),
			TextXAlignment = Enum.TextXAlignment.Center,
			FontFace = Theme.Font.Display,
		})
		local icon = Ui.new("TextLabel", {
			Text = "✨",
			Position = UDim2.fromOffset(18, 36),
			Size = UDim2.fromOffset(60, 60),
			TextScaled = true,
			Parent = card,
		})
		local amount = Common.text(card, "", {
			Position = UDim2.fromOffset(6, 100),
			Size = UDim2.new(1, -12, 0, 26),
			TextXAlignment = Enum.TextXAlignment.Center,
		})
		local check = Ui.new("TextLabel", {
			Text = "✅",
			AnchorPoint = Vector2.new(1, 0),
			Position = UDim2.new(1, 6, 0, -8),
			Size = UDim2.fromOffset(34, 34),
			TextScaled = true,
			Visible = false,
			Parent = card,
		})
		local glow = card:FindFirstChildOfClass("UIStroke")
		table.insert(self.days, { card = card, day = dayLabel, icon = icon, amount = amount, check = check, stroke = glow })
	end
	local claim, claimHolder = Ui.button({
		text = "CLAIM",
		size = UDim2.fromOffset(300, 70),
		anchor = Vector2.new(0.5, 0),
		position = UDim2.new(0.5, 0, 0, 222),
		color = Theme.Color.Good,
		font = Theme.Font.Display,
		parent = body,
		onClick = function()
			self:claim()
		end,
	})
	self.claimButton, self.claimHolder = claim, claimHolder
	self.footer = Common.text(body, "", {
		Position = UDim2.fromOffset(0, 304),
		Size = UDim2.new(1, 0, 0, 26),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = Theme.Color.InkSoft,
	})
	self.panel.Opened:Connect(function()
		self:refresh(ctx.state.profile)
	end)
	return self
end

function StreakPanel:refresh(profile)
	if not profile then
		return
	end
	local today = Daily.dayIndex(Workspace:GetServerTimeNow())
	local claimable, nextCount = Daily.streakStatus(profile.streak, today)
	local current = if claimable then nextCount else profile.streak.count
	-- Show the 7-day window containing the day being claimed (or just claimed).
	local weekStart = ((current - 1) // 7) * 7
	for i, entry in self.days do
		local n = weekStart + i
		local reward = Daily.streakReward(n)
		entry.day.Text = "Day " .. n
		if reward.shell then
			local shell = Cosmetics.ById[reward.shell]
			entry.icon.Text = shell and shell.icon or "🎁"
			entry.amount.Text = shell and shell.name or "Shell"
		else
			entry.icon.Text = if i == 7 then "💰" else "✨"
			entry.amount.Text = "+" .. reward.stardust
		end
		local done = n < current or (n == current and not claimable)
		local isToday = n == current and claimable
		entry.check.Visible = done
		entry.card.BackgroundColor3 = if isToday then Color3.fromRGB(255, 244, 200) elseif done then Theme.Color.PaperDim else Theme.Color.Panel
		entry.stroke.Color = if isToday then Theme.Color.AccentDark else Theme.Color.Ink
		entry.stroke.Thickness = if isToday then 5 else 3
		entry.icon.TextTransparency = if n > current then 0.45 else 0
	end
	if claimable then
		local reward = Daily.streakReward(nextCount)
		self.claimButton.Text = "CLAIM  " .. Common.stardust(reward.stardust)
		self.claimHolder.Visible = true
		self.subtitle.Text = if nextCount == 1 and profile.streak.count > 0 then "😢 Streak restarted. Let's go again!" else "🔥 Come back every day for bigger rewards!"
	else
		self.claimHolder.Visible = false
		self.subtitle.Text = "🔥 " .. profile.streak.count .. "-day streak! See you tomorrow!"
	end
	-- Next exclusive shell milestone.
	local nextShellDay, nextShell = nil, nil
	for day, shell in Daily.StreakShells do
		if day >= current and (not nextShellDay or day < nextShellDay) and not profile.cosmetics.shells[shell] then
			nextShellDay, nextShell = day, shell
		end
	end
	local reset = Common.countdown(Daily.secondsUntilReset(Workspace:GetServerTimeNow()))
	local parts = { "Best: " .. profile.streak.best .. " days", "Next day in " .. reset }
	if nextShellDay and nextShell then
		local def = Cosmetics.ById[nextShell]
		table.insert(parts, 1, string.format("Day %d: %s %s shell", nextShellDay, def.icon, def.name))
	end
	self.footer.Text = table.concat(parts, "   •   ")
end

function StreakPanel:claim()
	local ok, result = Net.request("ClaimStreak", true)
	if ok and type(result) == "table" then
		Common.flyStars(self.claimButton, self.ctx.gui, 14)
		local audio = self.ctx.controllers.AudioController
		if audio then
			audio:play("Purchase")
		end
		if result.shell then
			local def = Cosmetics.ById[result.shell]
			self.ctx.notify(def and def.icon or "🎁", "New shell unlocked: " .. (def and def.name or result.shell) .. "!", Theme.Color.Magic)
		end
		self.claimHolder.Visible = false
		self.subtitle.Text = "🔥 " .. result.count .. "-day streak! +" .. result.stardust .. " Stardust"
		task.delay(1.6, function()
			if self.panel.isOpen then
				self.panel:close()
			end
		end)
	end
end

function StreakPanel:claimable(profile): boolean
	if not profile then
		return false
	end
	local claimable = Daily.streakStatus(profile.streak, Daily.dayIndex(Workspace:GetServerTimeNow()))
	return claimable
end

return StreakPanel
