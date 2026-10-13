--!nonstrict
-- The Rolledex: every prop in every kit. Discovered props show their model, name and rarity with a
-- row of dots for the mutation variants you've found; undiscovered ones are dark silhouettes with
-- a hint about where to look. Tabs per kit with completion, a detail pane for the selected prop.
-- Viewports are built lazily (a few per frame) so opening the book never hitches.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Theme = require(Shared.Config.Theme)
local Rarity = require(Shared.Config.Rarity)
local Format = require(Shared.Util.Format)
local Tuning = require(Shared.Config.Tuning)
local Bitset = require(Shared.Util.Bitset)
local Kits = require(Shared.Data.Kits)
local Mutations = require(Shared.Data.Mutations)
local PropLibrary = require(Shared.Logic.PropLibrary)
local PropBuilder = require(Shared.PropBuilder)
local Progression = require(Shared.Logic.Progression)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Common = require(script.Parent.Common)

local RolledexPanel = {}
RolledexPanel.__index = RolledexPanel

local STRIDE = Mutations.VariantsPerProp
local CELL = 104

local function sortedDefs(kitId: string)
	local list = table.clone(PropLibrary.ByKit[kitId] or {})
	table.sort(list, function(a, b)
		local ra, rb = Rarity.get(a.rarity).order, Rarity.get(b.rarity).order
		if a.landmark ~= b.landmark then
			return b.landmark
		end
		if ra ~= rb then
			return ra < rb
		end
		return a.metrics.absorbSize < b.metrics.absorbSize
	end)
	return list
end

function RolledexPanel.new(ctx)
	local self = setmetatable({}, RolledexPanel)
	self.ctx = ctx
	self.set = Bitset.new()
	self.encoded = nil
	self.kitId = Kits.List[1].id
	self.cells = {}
	self.queue = {}
	self.selected = nil
	self.panel = Panel.new({
		name = "Rolledex",
		title = "Rolledex",
		icon = "📖",
		color = Theme.Color.Secondary,
		size = Vector2.new(960, 580),
		parent = ctx.gui,
	})
	local _, totalLabel = Common.pill(self.panel.headerRight, "0 / 0", Theme.Color.SecondaryDark, {
		Size = UDim2.fromOffset(170, 40),
		Position = UDim2.fromOffset(50, 0),
	})
	self.totalLabel = totalLabel
	local body = self.panel.body

	-- Kit tabs.
	local tabs = Ui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 46),
		BackgroundTransparency = 1,
		Parent = body,
	}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8) }) })
	self.tabs = {}
	for i, kit in Kits.List do
		local button = Ui.button({
			text = kit.name,
			size = UDim2.fromOffset(210, 44),
			color = Theme.Color.Panel,
			radius = Theme.Radius.Pill,
			order = i,
			parent = tabs,
			onClick = function()
				self:showKit(kit.id)
			end,
		})
		self.tabs[kit.id] = button
	end
	self.tabs.__sets = Ui.button({
		text = "🧩 Sets",
		size = UDim2.fromOffset(130, 44),
		color = Theme.Color.Panel,
		radius = Theme.Radius.Pill,
		order = #Kits.List + 1,
		parent = tabs,
		onClick = function()
			self:showKit("__sets")
		end,
	})

	-- Grid (left) and detail pane (right).
	local gridHolder = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 56),
		Size = UDim2.new(1, -280, 1, -56),
		BackgroundTransparency = 1,
		Parent = body,
	})
	self.grid = Panel.scroller(gridHolder)
	self.gridLayout = Ui.new("UIGridLayout", {
		CellSize = UDim2.fromOffset(CELL, CELL + 18),
		CellPadding = UDim2.fromOffset(8, 8),
		SortOrder = Enum.SortOrder.LayoutOrder,
		Parent = self.grid,
	})
	Ui.new("UIPadding", { PaddingTop = UDim.new(0, 4), PaddingLeft = UDim.new(0, 4), PaddingRight = UDim.new(0, 12), Parent = self.grid })

	local detail = Common.card(body, {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, 0, 0, 56),
		Size = UDim2.new(0, 268, 1, -56),
	})
	self.detailViewport = Ui.viewport(nil, {
		Position = UDim2.fromOffset(14, 10),
		Size = UDim2.new(1, -28, 0, 200),
		Parent = detail,
	})
	self.detailName = Common.text(detail, "", {
		Position = UDim2.fromOffset(14, 214),
		Size = UDim2.new(1, -28, 0, 32),
		FontFace = Theme.Font.Display,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	self.detailRarity = Common.text(detail, "", {
		Position = UDim2.fromOffset(14, 248),
		Size = UDim2.new(1, -28, 0, 24),
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	self.detailInfo = Common.text(detail, "Pick something to take a closer look!", {
		Position = UDim2.fromOffset(14, 278),
		Size = UDim2.new(1, -28, 0, 60),
		TextWrapped = true,
		TextScaled = false,
		TextSize = 17,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = Theme.Color.InkSoft,
	})
	local variants = Ui.new("Frame", {
		Position = UDim2.new(0, 14, 1, -96),
		Size = UDim2.new(1, -28, 0, 84),
		BackgroundTransparency = 1,
		Parent = detail,
	}, { Ui.new("UIGridLayout", { CellSize = UDim2.fromOffset(52, 38), CellPadding = UDim2.fromOffset(6, 6), SortOrder = Enum.SortOrder.LayoutOrder }) })
	self.variantChips = {}
	for _, m in Mutations.List do
		local chip = Ui.new("TextLabel", {
			Text = "?",
			BackgroundColor3 = Theme.Color.PaperDim,
			BackgroundTransparency = 0,
			TextScaled = true,
			LayoutOrder = m.index,
			Parent = variants,
		}, { Ui.corner(Theme.Radius.Small), Ui.stroke(2, Theme.Color.Ink), Ui.padding(4) })
		self.variantChips[m.index] = { chip = chip, def = m }
	end

	self.panel.Opened:Connect(function()
		self:refresh(ctx.state.profile)
		self:showKit(self.kitId)
	end)
	-- Lazy viewport builder.
	RunService.Heartbeat:Connect(function()
		if not self.panel.isOpen or #self.queue == 0 or self.building then
			return
		end
		self.building = true
		local cell = table.remove(self.queue, 1)
		task.spawn(function()
			local template = PropBuilder.template(cell.def.uid)
			if template and cell.viewport.Parent then
				Ui.setViewportModel(cell.viewport, template, not cell.found)
			end
			cell.built = true
			self.building = false
		end)
	end)
	return self
end

function RolledexPanel:found(uid: number, mutation: number?): boolean
	return Bitset.get(self.set, uid * STRIDE + (mutation or 0))
end

function RolledexPanel:refresh(profile)
	if not profile then
		return
	end
	if profile.rolledex ~= self.encoded then
		self.encoded = profile.rolledex
		self.set = Bitset.decode(profile.rolledex)
		-- Discovery state changed: rebuild the visible grid next time it's shown.
		self.dirty = true
	end
	local total, found = 0, 0
	for _, kit in Kits.List do
		local kitFound, kitTotal = 0, 0
		for _, def in (PropLibrary.ByKit[kit.id] or {}) :: { any } do
			kitTotal += 1
			if self:found(def.uid) then
				kitFound += 1
			end
		end
		total += kitTotal
		found += kitFound
		local tab = self.tabs[kit.id]
		if tab then
			tab.Text = string.format("%s  %d%%", kit.name, math.floor(kitFound / math.max(1, kitTotal) * 100))
		end
	end
	self.foundCount = found
	self.totalLabel.Text = string.format("📖 %d / %d", found, total)
	if self.panel.isOpen and self.dirty then
		self:showKit(self.kitId)
	end
end

function RolledexPanel:showKit(kitId: string)
	if kitId == self.shownKit and not self.dirty then
		return
	end
	self.kitId = kitId
	self.shownKit = kitId
	self.dirty = false
	for id, tab in self.tabs do
		tab.BackgroundColor3 = if id == kitId then Theme.Color.Accent else Theme.Color.Panel
	end
	for _, cell in self.cells do
		cell.frame:Destroy()
	end
	for _, c in self.grid:GetChildren() do
		if c:IsA("Frame") and c.Name == "SetCard" then
			c:Destroy()
		end
	end
	table.clear(self.cells)
	table.clear(self.queue)
	if kitId == "__sets" then
		self.gridLayout.CellSize = UDim2.fromOffset(620, 128)
		self:showSets()
		return
	end
	self.gridLayout.CellSize = UDim2.fromOffset(CELL, CELL + 18)
	local colorblind = self.ctx.controllers.SettingsController and self.ctx.controllers.SettingsController.values.colorblind
	for i, def in sortedDefs(kitId) do
		local isFound = self:found(def.uid)
		local rarity = Rarity.get(def.rarity)
		local frame = Ui.new("TextButton", {
			Text = "",
			AutoButtonColor = false,
			BackgroundColor3 = if isFound then Theme.Color.Panel else Theme.Color.PaperDim,
			LayoutOrder = i,
			Parent = self.grid,
		}, {
			Ui.corner(Theme.Radius.Medium),
			Ui.stroke(if isFound then 4 else 2, if isFound then Rarity.color(def.rarity, colorblind) else Theme.Color.InkSoft),
		})
		local viewport = Ui.viewport(nil, {
			Position = UDim2.fromOffset(6, 4),
			Size = UDim2.new(1, -12, 0, CELL - 22),
			Parent = frame,
		})
		Ui.new("TextLabel", {
			Text = if isFound then def.name else "???",
			Position = UDim2.new(0, 4, 1, -36),
			Size = UDim2.new(1, -8, 0, 20),
			TextScaled = true,
			TextColor3 = Theme.Color.Ink,
			Parent = frame,
		})
		-- Variant dots.
		local dots = Ui.new("Frame", {
			Position = UDim2.new(0, 6, 1, -14),
			Size = UDim2.new(1, -12, 0, 10),
			BackgroundTransparency = 1,
			Parent = frame,
		}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 2) }) })
		if isFound then
			for _, m in Mutations.List do
				if m.weight > 0 or self:found(def.uid, m.index) then
					local has = self:found(def.uid, m.index)
					Ui.new("Frame", {
						Size = UDim2.fromOffset(8, 8),
						BackgroundColor3 = if has then (if m.color then Color3.fromHex(m.color) else Theme.Color.Magic) else Color3.fromRGB(210, 205, 225),
						Parent = dots,
					}, { Ui.corner(Theme.Radius.Pill) })
				end
			end
		end
		if def.landmark then
			Ui.new("TextLabel", { Text = "🗿", Position = UDim2.fromOffset(4, 2), Size = UDim2.fromOffset(22, 22), TextScaled = true, Parent = frame })
		elseif rarity.order >= 3 and isFound then
			Ui.new("TextLabel", { Text = rarity.glyph, Position = UDim2.fromOffset(4, 2), Size = UDim2.fromOffset(20, 20), TextScaled = true, TextColor3 = rarity.color, Parent = frame })
		end
		local cell = { frame = frame, viewport = viewport, def = def, found = isFound, built = false }
		frame.Activated:Connect(function()
			self:select(cell)
		end)
		table.insert(self.cells, cell)
		table.insert(self.queue, cell)
	end
	self.grid.CanvasPosition = Vector2.zero
	if self.cells[1] then
		self:select(self.cells[1])
	end
end

-- Themed sets per map: finish one for Stardust, finish a whole map for its Master title.
function RolledexPanel:showSets()
	local profile = self.ctx.state.profile
	local claimed = profile and profile.setsClaimed or {}
	local kitNames = {}
	for _, kit in Kits.List do
		kitNames[kit.id] = kit.name
	end
	local list = table.clone(Progression.sets())
	-- Nearly-finished sets first: that's what you want to chase.
	table.sort(list, function(a, b)
		local fa = Progression.setProgress(a, function(u)
			return self:found(u)
		end) / #a.uids
		local fb = Progression.setProgress(b, function(u)
			return self:found(u)
		end) / #b.uids
		local da, db = claimed[a.id] == true, claimed[b.id] == true
		if da ~= db then
			return db
		end
		if fa ~= fb then
			return fa > fb
		end
		return a.id < b.id
	end)
	for i, set in list do
		local have = Progression.setProgress(set, function(u)
			return self:found(u)
		end)
		local done = claimed[set.id] == true
		local card = Common.card(self.grid, {
			Name = "SetCard",
			LayoutOrder = i,
			BackgroundColor3 = if done then Color3.fromRGB(226, 250, 230) else Theme.Color.Panel,
		})
		Common.text(card, set.icon .. " " .. set.name, {
			Position = UDim2.fromOffset(12, 6),
			Size = UDim2.new(0.6, 0, 0, 28),
			FontFace = Theme.Font.Display,
		})
		Common.text(card, (kitNames[set.kitId] or set.kitId) .. "  •  " .. (if done then "✅ Complete!" else string.format("%d / %d  •  +%d ✨", have, #set.uids, set.reward)), {
			AnchorPoint = Vector2.new(1, 0),
			Position = UDim2.new(1, -12, 0, 10),
			Size = UDim2.new(0.42, 0, 0, 22),
			TextXAlignment = Enum.TextXAlignment.Right,
			TextColor3 = if done then Theme.Color.GoodDark else Theme.Color.InkSoft,
		})
		local row = Ui.new("Frame", {
			Position = UDim2.fromOffset(10, 40),
			Size = UDim2.new(1, -20, 0, 80),
			BackgroundTransparency = 1,
			Parent = card,
		}, { Ui.new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }) })
		for _, uid in set.uids do
			local def = PropLibrary.get(uid)
			if def then
				local isFound = self:found(uid)
				local chip = Ui.new("TextButton", {
					Text = "",
					AutoButtonColor = false,
					Size = UDim2.fromOffset(70, 76),
					BackgroundColor3 = if isFound then Theme.Color.PanelAlt else Theme.Color.PaperDim,
					Parent = row,
				}, { Ui.corner(Theme.Radius.Small), Ui.stroke(2, if isFound then Theme.Color.Good else Theme.Color.InkSoft) })
				local vp = Ui.viewport(nil, { Size = UDim2.new(1, 0, 1, -4), Parent = chip })
				local cell = { frame = chip, viewport = vp, def = def, found = isFound, built = false }
				chip.Activated:Connect(function()
					self:select(cell)
				end)
				table.insert(self.cells, cell)
				table.insert(self.queue, cell)
			end
		end
	end
	self.grid.CanvasPosition = Vector2.zero
	if self.cells[1] then
		self:select(self.cells[1])
	end
end

function RolledexPanel:select(cell)
	self.selected = cell
	local def = cell.def
	local rarity = Rarity.get(def.rarity)
	task.spawn(function()
		local template = PropBuilder.template(def.uid)
		if template and self.selected == cell then
			Ui.setViewportModel(self.detailViewport, template, not cell.found)
		end
	end)
	if cell.found then
		self.detailName.Text = def.name
		self.detailRarity.Text = rarity.glyph .. " " .. rarity.name
		self.detailRarity.TextColor3 = rarity.color
		local cm = (self.ctx.state.round and self.ctx.state.round.cmPerStud) or 1
		self.detailInfo.Text = "Roll it up once you're " .. Format.size(def.metrics.absorbSize / Tuning.Absorb.Ratio, cm) .. " big."
	else
		self.detailName.Text = "???"
		self.detailRarity.Text = rarity.glyph .. " " .. rarity.name
		self.detailRarity.TextColor3 = rarity.color
		self.detailInfo.Text = "💡 " .. (def.hint ~= "" and def.hint or "Keep rolling around this map!")
	end
	for index, entry in self.variantChips do
		local has = cell.found and self:found(def.uid, index)
		entry.chip.Text = if has then entry.def.name else "?"
		entry.chip.BackgroundColor3 = if has and entry.def.color then Color3.fromHex(entry.def.color) else Theme.Color.PaperDim
		entry.chip.TextColor3 = Theme.Color.Ink
	end
end

return RolledexPanel
