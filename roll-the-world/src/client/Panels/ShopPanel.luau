--!nonstrict
-- Stardust shop. Cores tab: each core's perk at your level, level pips, unlock / upgrade / equip.
-- Shells tab: a spinning preview ball per shell, price or how to earn it, buy / equip.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Cores = require(Shared.Data.Cores)
local Cosmetics = require(Shared.Data.Cosmetics)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Common = require(script.Parent.Common)

local ShopPanel = {}
ShopPanel.__index = ShopPanel

local SOURCE_TEXT = {
	Streak = "🔥 Login streak",
	Nana = "🧶 Nana's gift",
	Default = "",
}

-- A little preview ball model wearing a shell.
local function shellBall(def): Model
	local model = Instance.new("Model")
	local ball = Instance.new("Part")
	ball.Shape = Enum.PartType.Ball
	ball.Size = Vector3.one * 4
	ball.Anchored = true
	ball.Color = if def.color then Color3.fromHex(def.color) else Color3.fromRGB(255, 140, 90)
	ball.Material = Enum.Material[def.material] or Enum.Material.SmoothPlastic
	ball.Reflectance = def.reflectance or 0
	ball.Parent = model
	model.PrimaryPart = ball
	-- Lumpy flecks like the real ball's surface.
	local accent = if def.color2 then Color3.fromHex(def.color2) else ball.Color:Lerp(Color3.new(1, 1, 1), 0.3)
	for i = 1, 14 do
		local phi = math.acos(1 - 2 * (i - 0.5) / 14)
		local theta = math.pi * (1 + 5 ^ 0.5) * i
		local dir = Vector3.new(math.cos(theta) * math.sin(phi), math.cos(phi), math.sin(theta) * math.sin(phi))
		local fleck = Instance.new("Part")
		fleck.Shape = Enum.PartType.Ball
		fleck.Size = Vector3.one * (0.7 + (i % 3) * 0.2)
		fleck.Anchored = true
		fleck.Color = accent
		fleck.Material = if def.neon then Enum.Material.Neon else ball.Material
		fleck.CFrame = CFrame.new(dir * 1.9)
		fleck.Parent = model
	end
	return model
end

function ShopPanel.new(ctx)
	local self = setmetatable({}, ShopPanel)
	self.ctx = ctx
	self.tab = "Cores"
	self.panel = Panel.new({
		name = "Shop",
		title = "Shop",
		icon = "🛍️",
		color = Theme.Color.Primary,
		size = Vector2.new(920, 560),
		parent = ctx.gui,
	})
	local _, balance = Common.pill(self.panel.headerRight, "✨ 0", Theme.Color.AccentDark, {
		Size = UDim2.fromOffset(170, 40),
		Position = UDim2.fromOffset(50, 0),
	})
	self.balance = balance
	local body = self.panel.body
	local tabs = Ui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 46),
		BackgroundTransparency = 1,
		Parent = body,
	}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }) })
	self.tabButtons = {}
	for i, name in { "Cores", "Shells" } do
		self.tabButtons[name] = Ui.button({
			text = if name == "Cores" then "⚙️ Cores" else "🎨 Shells",
			size = UDim2.fromOffset(180, 44),
			color = Theme.Color.Panel,
			radius = Theme.Radius.Pill,
			order = i,
			parent = tabs,
			onClick = function()
				self.tab = name
				self:render()
			end,
		})
	end
	self.hint = Common.text(body, "", {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, 0, 0, 10),
		Size = UDim2.fromOffset(440, 26),
		TextXAlignment = Enum.TextXAlignment.Right,
		TextColor3 = Theme.Color.InkSoft,
	})
	local listHolder = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 56),
		Size = UDim2.new(1, 0, 1, -56),
		BackgroundTransparency = 1,
		Parent = body,
	})
	self.list = Panel.scroller(listHolder)
	self.layout = Ui.new("UIGridLayout", {
		CellSize = UDim2.fromOffset(420, 150),
		CellPadding = UDim2.fromOffset(12, 12),
		SortOrder = Enum.SortOrder.LayoutOrder,
		Parent = self.list,
	})
	Ui.new("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingLeft = UDim.new(0, 4), PaddingRight = UDim.new(0, 12), Parent = self.list })
	self.spinners = {}
	self.panel.Opened:Connect(function()
		self:render()
	end)
	RunService.Heartbeat:Connect(function()
		if not self.panel.isOpen then
			return
		end
		local t = os.clock()
		for _, m in self.spinners do
			if m.Parent then
				m:PivotTo(CFrame.Angles(0.35, t * 0.9, 0))
			end
		end
	end)
	return self
end

function ShopPanel:refresh(profile)
	if profile then
		self.balance.Text = Common.stardust(profile.stardust)
	end
	if self.panel.isOpen then
		self:render()
	end
end

local function clear(list: Instance)
	for _, c in list:GetChildren() do
		if c:IsA("GuiObject") then
			c:Destroy()
		end
	end
end

function ShopPanel:buy(action: string, id: string, source: GuiObject)
	local ok, result = Net.request(action, id)
	local audio = self.ctx.controllers.AudioController
	if ok then
		if audio then
			audio:play("Purchase")
		end
		if action == "EquipCore" then
			self.ctx.notify("⚙️", "Core equipped! It kicks in on your next roll.", Theme.Color.Magic)
		end
		local vfx = source and source.Parent
		if vfx then
			local s = Ui.new("UIScale", { Scale = 1.15, Parent = source })
			Ui.tween(s, Theme.Tween.Bounce, { Scale = 1 })
			task.delay(0.6, function()
				s:Destroy()
			end)
		end
	else
		if audio then
			audio:play("Error")
		end
		if result == "afford" then
			self.ctx.notify("✨", "Not enough Stardust yet. Roll some more!", Theme.Color.Bad)
		end
	end
end

function ShopPanel:render()
	local profile = self.ctx.state.profile
	if not profile then
		return
	end
	self.balance.Text = Common.stardust(profile.stardust)
	for name, b in self.tabButtons do
		b.BackgroundColor3 = if name == self.tab then Theme.Color.Accent else Theme.Color.Panel
	end
	clear(self.list)
	table.clear(self.spinners)
	if self.tab == "Cores" then
		self.hint.Text = "Cores change how your ball handles. Upgrade your favorite!"
		self.layout.CellSize = UDim2.fromOffset(420, 150)
		self:renderCores(profile)
	else
		self.hint.Text = "Shells change how your ball looks. Earn rare ones daily!"
		self.layout.CellSize = UDim2.fromOffset(205, 230)
		self:renderShells(profile)
	end
end

function ShopPanel:renderCores(profile)
	for i, def in Cores.List do
		local level = profile.cores.owned[def.id] or 0
		local equipped = profile.cores.equipped == def.id
		local color = Color3.fromHex(def.color)
		local card = Common.card(self.list, { LayoutOrder = i, BackgroundColor3 = if equipped then Color3.fromRGB(255, 248, 225) else Theme.Color.Panel })
		Ui.new("Frame", {
			Position = UDim2.fromOffset(10, 10),
			Size = UDim2.fromOffset(84, 84),
			BackgroundColor3 = color,
			Parent = card,
		}, {
			Ui.corner(Theme.Radius.Pill),
			Ui.stroke(3, Theme.Color.Ink),
			Ui.new("TextLabel", { Text = def.icon, Size = UDim2.fromScale(1, 1), TextScaled = true, BackgroundTransparency = 1 }, { Ui.padding(14) }),
		})
		Common.text(card, def.name .. (if equipped then "  ✅" else ""), {
			Position = UDim2.fromOffset(106, 8),
			Size = UDim2.new(1, -116, 0, 30),
			FontFace = Theme.Font.Display,
		})
		Common.text(card, def.description, {
			Position = UDim2.fromOffset(106, 40),
			Size = UDim2.new(1, -116, 0, 20),
			TextColor3 = Theme.Color.InkSoft,
		})
		Common.text(card, if level > 0 then "⚡ " .. def.perk(level) else "🔒 " .. def.perk(1), {
			Position = UDim2.fromOffset(106, 64),
			Size = UDim2.new(1, -116, 0, 20),
			TextColor3 = Theme.Color.GoodDark,
		})
		-- Level pips.
		local pips = Ui.new("Frame", {
			Position = UDim2.fromOffset(10, 104),
			Size = UDim2.fromOffset(84, 14),
			BackgroundTransparency = 1,
			Parent = card,
		}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 3) }) })
		for l = 1, def.maxLevel do
			Ui.new("Frame", {
				Size = UDim2.fromOffset(14, 14),
				BackgroundColor3 = if l <= level then color else Theme.Color.PaperDim,
				Parent = pips,
			}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(1.5, Theme.Color.Ink) })
		end
		local cost = Cores.costFor(def.id, level)
		local buttons = Ui.new("Frame", {
			Position = UDim2.new(0, 106, 1, -54),
			Size = UDim2.new(1, -116, 0, 46),
			BackgroundTransparency = 1,
			Parent = card,
		}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Right, Padding = UDim.new(0, 8) }) })
		if cost then
			local afford = profile.stardust >= cost
			local button
			button = Ui.button({
				text = (if level == 0 then "Unlock " else "Lv " .. (level + 1) .. "  ") .. Common.stardust(cost),
				size = UDim2.fromOffset(170, 44),
				color = if afford then Theme.Color.Good else Theme.Color.PaperDim,
				order = 2,
				parent = buttons,
				onClick = function()
					self:buy("BuyCore", def.id, button)
				end,
			})
		else
			Ui.button({ text = "MAX ⭐", size = UDim2.fromOffset(120, 44), color = Theme.Color.Accent, order = 2, parent = buttons })
		end
		if level > 0 and not equipped then
			local equip
			equip = Ui.button({
				text = "Equip",
				size = UDim2.fromOffset(100, 44),
				color = Theme.Color.Secondary,
				order = 1,
				parent = buttons,
				onClick = function()
					self:buy("EquipCore", def.id, equip)
				end,
			})
		end
	end
end

function ShopPanel:renderShells(profile)
	local list = table.clone(Cosmetics.Shells)
	table.sort(list, function(a, b)
		return a.order < b.order
	end)
	for i, def in list do
		local owned = profile.cosmetics.shells[def.id] == true
		local equipped = profile.cosmetics.equipped.shell == def.id
		local card = Common.card(self.list, { LayoutOrder = i, BackgroundColor3 = if equipped then Color3.fromRGB(255, 248, 225) else Theme.Color.Panel })
		local vp = Ui.viewport(nil, {
			Position = UDim2.fromOffset(10, 6),
			Size = UDim2.new(1, -20, 0, 112),
			Parent = card,
		})
		local preview = shellBall(def)
		Ui.setViewportModel(vp, preview)
		preview:Destroy()
		local spinner = vp:FindFirstChildOfClass("Model")
		if spinner then
			table.insert(self.spinners, spinner)
		end
		Common.text(card, def.icon .. " " .. def.name, {
			Position = UDim2.fromOffset(10, 120),
			Size = UDim2.new(1, -20, 0, 26),
			TextXAlignment = Enum.TextXAlignment.Center,
			FontFace = Theme.Font.Display,
		})
		Common.text(card, def.description, {
			Position = UDim2.fromOffset(10, 148),
			Size = UDim2.new(1, -20, 0, 18),
			TextXAlignment = Enum.TextXAlignment.Center,
			TextColor3 = Theme.Color.InkSoft,
		})
		local button
		if equipped then
			Ui.button({ text = "Wearing ✅", size = UDim2.new(1, -20, 0, 46), position = UDim2.new(0, 10, 1, -54), color = Theme.Color.Accent, parent = card })
		elseif owned then
			button = Ui.button({
				text = "Wear",
				size = UDim2.new(1, -20, 0, 46),
				position = UDim2.new(0, 10, 1, -54),
				color = Theme.Color.Secondary,
				parent = card,
				onClick = function()
					self:buy("EquipShell", def.id, button)
				end,
			})
		elseif def.source == "Shop" and def.cost then
			local afford = profile.stardust >= def.cost
			button = Ui.button({
				text = Common.stardust(def.cost),
				size = UDim2.new(1, -20, 0, 46),
				position = UDim2.new(0, 10, 1, -54),
				color = if afford then Theme.Color.Good else Theme.Color.PaperDim,
				parent = card,
				onClick = function()
					self:buy("BuyShell", def.id, button)
				end,
			})
		else
			Ui.button({
				text = "🔒 " .. (SOURCE_TEXT[def.source] or ""),
				size = UDim2.new(1, -20, 0, 46),
				position = UDim2.new(0, 10, 1, -54),
				color = Theme.Color.PaperDim,
				parent = card,
			})
		end
	end
end

return ShopPanel
