--!nonstrict
-- My Galaxy: every planet you've launched orbiting Nana's star in a live viewport. Planet size
-- follows how big your ball got; colors come from what you rolled up; winners get a golden ring.
-- Tap a planet for its card: name (rename), map, size, place, signature props, pin.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Format = require(Shared.Util.Format)
local Tiers = require(Shared.Config.Tiers)
local Tuning = require(Shared.Config.Tuning)
local Kits = require(Shared.Data.Kits)
local PropLibrary = require(Shared.Logic.PropLibrary)
local PropBuilder = require(Shared.PropBuilder)
local Ui = require(script.Parent.Parent.UI.Ui)
local Panel = require(script.Parent.Parent.UI.Panel)
local Common = require(script.Parent.Common)

local GalaxyPanel = {}
GalaxyPanel.__index = GalaxyPanel

local FOV = 40
local CAM_CF = CFrame.lookAt(Vector3.new(0, 34, 62), Vector3.new(0, -2, 0))

local function hex(h: string?, fallback: Color3): Color3
	if type(h) ~= "string" then
		return fallback
	end
	local ok, c = pcall(Color3.fromHex, h)
	return if ok then c else fallback
end

local function planetRadius(d: number): number
	return math.clamp(0.9 + math.log(math.max(d, 1)) * 0.55, 1, 4.2)
end

function GalaxyPanel.new(ctx)
	local self = setmetatable({}, GalaxyPanel)
	self.ctx = ctx
	self.planets = {}
	self.selected = nil
	self.panel = Panel.new({
		name = "Galaxy",
		title = "My Galaxy",
		icon = "🌌",
		color = Theme.Color.Space,
		size = Vector2.new(960, 580),
		parent = ctx.gui,
	})
	local _, massLabel = Common.pill(self.panel.headerRight, "", Theme.Color.MagicDark, {
		Size = UDim2.fromOffset(200, 40),
		Position = UDim2.fromOffset(20, 0),
	})
	self.massLabel = massLabel
	local body = self.panel.body

	local space = Ui.new("Frame", {
		Size = UDim2.new(1, -290, 1, -54),
		BackgroundColor3 = Color3.fromRGB(18, 12, 44),
		ClipsDescendants = true,
		Parent = body,
	}, {
		Ui.corner(Theme.Radius.Medium),
		Ui.stroke(3, Theme.Color.Ink),
		Ui.gradient(Color3.fromRGB(60, 40, 120), Color3.fromRGB(12, 8, 30)),
	})
	self.space = space
	-- Twinkly backdrop stars.
	for _ = 1, 50 do
		Ui.new("Frame", {
			Position = UDim2.fromScale(math.random(), math.random()),
			Size = UDim2.fromOffset(math.random(2, 4), math.random(2, 4)),
			BackgroundColor3 = Color3.new(1, 1, 1),
			BackgroundTransparency = math.random() * 0.6,
			Parent = space,
		}, { Ui.corner(Theme.Radius.Pill) })
	end
	self.viewport = Ui.new("ViewportFrame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Ambient = Color3.fromRGB(150, 140, 190),
		LightColor = Color3.fromRGB(255, 240, 220),
		LightDirection = Vector3.new(0.2, -1, -0.3),
		Parent = space,
	})
	local cam = Instance.new("Camera")
	cam.FieldOfView = FOV
	cam.CFrame = CAM_CF
	cam.Parent = self.viewport
	self.viewport.CurrentCamera = cam
	self.world = Instance.new("WorldModel")
	self.world.Parent = self.viewport
	-- Nana's star.
	local star = Instance.new("Part")
	star.Shape = Enum.PartType.Ball
	star.Size = Vector3.one * 7
	star.Material = Enum.Material.Neon
	star.Color = Color3.fromRGB(255, 214, 110)
	star.Anchored = true
	star.CFrame = CFrame.new()
	star.Parent = self.world
	local halo = star:Clone()
	halo.Size = Vector3.one * 10
	halo.Transparency = 0.75
	halo.Color = Color3.fromRGB(255, 170, 90)
	halo.Parent = self.world
	self.overlay = Ui.new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = space })
	self.empty = Common.text(space, "Your galaxy is empty!\nFinish a round to launch your first planet 🚀", {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -20),
		Size = UDim2.new(0.9, 0, 0, 60),
		TextWrapped = true,
		TextColor3 = Theme.Color.White,
		TextXAlignment = Enum.TextXAlignment.Center,
		Visible = false,
	})

	-- Tier progress under the galaxy.
	local _, setTier = Common.bar(body, Theme.Color.Magic, {
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.new(0, 0, 1, -6),
		Size = UDim2.new(1, -290, 0, 34),
	})
	self.setTier = setTier

	-- Planet card.
	local card = Common.card(body, {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, 0, 0, 0),
		Size = UDim2.new(0, 278, 1, 0),
	})
	self.card = card
	self.nameBox = Ui.new("TextBox", {
		Text = "",
		PlaceholderText = "Planet name",
		Position = UDim2.fromOffset(12, 12),
		Size = UDim2.new(1, -24, 0, 40),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextColor3 = Theme.Color.Ink,
		BackgroundColor3 = Theme.Color.PaperDim,
		BackgroundTransparency = 0,
		ClearTextOnFocus = false,
		Parent = card,
	}, { Ui.corner(Theme.Radius.Small), Ui.padding(4) })
	self.nameBox.FocusLost:Connect(function(enter)
		self:rename(self.nameBox.Text, enter)
	end)
	Common.text(card, "✏️ tap the name to rename", {
		Position = UDim2.fromOffset(12, 54),
		Size = UDim2.new(1, -24, 0, 16),
		TextColor3 = Theme.Color.InkSoft,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	self.facts = Common.text(card, "", {
		Position = UDim2.fromOffset(14, 78),
		Size = UDim2.new(1, -28, 0, 110),
		TextScaled = false,
		TextSize = 19,
		TextWrapped = true,
		TextYAlignment = Enum.TextYAlignment.Top,
	})
	Common.text(card, "Rolled up:", {
		Position = UDim2.fromOffset(14, 196),
		Size = UDim2.new(1, -28, 0, 20),
		TextColor3 = Theme.Color.InkSoft,
	})
	local props = Ui.new("Frame", {
		Position = UDim2.fromOffset(12, 220),
		Size = UDim2.new(1, -24, 0, 170),
		BackgroundTransparency = 1,
		Parent = card,
	}, { Ui.new("UIGridLayout", { CellSize = UDim2.fromOffset(78, 78), CellPadding = UDim2.fromOffset(6, 6) }) })
	self.propSlots = {}
	for i = 1, Tuning.Galaxy.SignatureProps do
		self.propSlots[i] = Ui.viewport(nil, {
			BackgroundColor3 = Theme.Color.PaperDim,
			BackgroundTransparency = 0,
			LayoutOrder = i,
			Parent = props,
		})
		Ui.corner(Theme.Radius.Small).Parent = self.propSlots[i]
	end
	self.pinButton = Ui.button({
		text = "📌 Pin",
		size = UDim2.new(1, -24, 0, 48),
		position = UDim2.new(0, 12, 1, -58),
		color = Theme.Color.Secondary,
		parent = card,
		onClick = function()
			self:togglePin()
		end,
	})

	self.panel.Opened:Connect(function()
		self:refresh(ctx.state.profile)
	end)
	RunService.RenderStepped:Connect(function()
		if self.panel.isOpen then
			self:animate()
		end
	end)
	return self
end

function GalaxyPanel:buildPlanet(p)
	local model = Instance.new("Model")
	local radius = planetRadius(p.d)
	local main = Instance.new("Part")
	main.Shape = Enum.PartType.Ball
	main.Size = Vector3.one * radius * 2
	main.Color = hex(p.colors[1], Color3.fromRGB(140, 200, 255))
	main.Material = Enum.Material.SmoothPlastic
	main.Anchored = true
	main.Parent = model
	model.PrimaryPart = main
	-- Continents in the planet's other colors.
	for i = 2, math.min(#p.colors, 5) do
		for k = 1, 3 do
			local blob = Instance.new("Part")
			blob.Shape = Enum.PartType.Ball
			blob.Size = Vector3.one * radius * (0.7 + ((i + k) % 3) * 0.15)
			blob.Color = hex(p.colors[i], main.Color)
			blob.Material = Enum.Material.SmoothPlastic
			blob.Anchored = true
			local a = (i * 2.4 + k * 1.7 + p.id) % (math.pi * 2)
			local b = ((i * 1.3 + k * 2.1) % math.pi) - math.pi / 2
			local dir = Vector3.new(math.cos(a) * math.cos(b), math.sin(b), math.sin(a) * math.cos(b))
			blob:SetAttribute("Offset", dir * radius * 0.72)
			blob.Parent = model
		end
	end
	if p.place == 1 then
		local ring = Instance.new("Part")
		ring.Shape = Enum.PartType.Cylinder
		ring.Size = Vector3.new(0.2, radius * 3.4, radius * 3.4)
		ring.Color = Color3.fromRGB(255, 210, 90)
		ring.Material = Enum.Material.Neon
		ring.Transparency = 0.35
		ring.Anchored = true
		ring:SetAttribute("Ring", true)
		ring.Parent = model
	end
	model.Parent = self.world
	return model, radius
end

function GalaxyPanel:refresh(profile)
	if not profile then
		return
	end
	local galaxy = profile.galaxy
	self.massLabel.Text = string.format("🪐 %d  •  ⚖️ %s", galaxy.total or #galaxy.planets, Format.compact(math.floor(galaxy.mass or 0)))
	-- Next tier progress (later tiers are "coming soon" until they ship).
	local nextTier = nil
	for _, tier in Tiers.List do
		if tier.galaxyMassRequired > (galaxy.mass or 0) then
			nextTier = tier
			break
		end
	end
	if nextTier then
		local text = string.format("%s %s tier at %s mass%s", nextTier.icon, nextTier.name, Format.compact(nextTier.galaxyMassRequired), if nextTier.shipped then "" else " (coming soon!)")
		self.setTier((galaxy.mass or 0) / nextTier.galaxyMassRequired, text)
	else
		self.setTier(1, "🌌 Every tier unlocked!")
	end
	if not self.panel.isOpen then
		return
	end
	-- Rebuild planets when the list changes.
	local signature = {}
	for _, p in galaxy.planets do
		table.insert(signature, p.id .. ":" .. (p.pinned and 1 or 0) .. ":" .. p.name)
	end
	local sig = table.concat(signature, ",")
	if sig ~= self.signature then
		self.signature = sig
		for _, entry in self.planets do
			entry.model:Destroy()
			entry.button:Destroy()
		end
		table.clear(self.planets)
		local list = table.clone(galaxy.planets)
		table.sort(list, function(a, b)
			return a.t < b.t
		end)
		for i, p in list do
			local model, radius = self:buildPlanet(p)
			local button = Ui.new("TextButton", {
				Text = "",
				AnchorPoint = Vector2.new(0.5, 0.5),
				Size = UDim2.fromOffset(60, 60),
				BackgroundTransparency = 1,
				Parent = self.overlay,
			})
			local label = Ui.new("TextLabel", {
				Text = (if p.pinned then "📌 " else "") .. p.name,
				AnchorPoint = Vector2.new(0.5, 0),
				Position = UDim2.new(0.5, 0, 1, -6),
				Size = UDim2.fromOffset(140, 18),
				TextScaled = true,
				Parent = button,
			}, { Ui.stroke(2, Theme.Color.Ink) })
			local entry = {
				planet = p,
				model = model,
				radius = radius,
				button = button,
				label = label,
				orbit = 11 + i * (3.2 + radius * 0.6),
				speed = 0.35 / math.sqrt(i),
				phase = (p.id * 2.399) % (math.pi * 2),
				tilt = ((p.id * 0.61) % 0.5) - 0.25,
			}
			button.Activated:Connect(function()
				self:select(entry)
			end)
			table.insert(self.planets, entry)
		end
		self.empty.Visible = #self.planets == 0
		self.card.Visible = #self.planets > 0
		-- Keep the selection (or pick the newest planet).
		local keep = nil
		for _, entry in self.planets do
			if self.selected and entry.planet.id == self.selected.planet.id then
				keep = entry
			end
		end
		if keep or self.planets[#self.planets] then
			self:select(keep or self.planets[#self.planets])
		end
		-- Zoom out to fit the outermost orbit.
		local outer = 20
		for _, entry in self.planets do
			outer = math.max(outer, entry.orbit + entry.radius)
		end
		self.viewport.CurrentCamera.CFrame = CFrame.lookAt(Vector3.new(0, outer * 0.95, outer * 1.75), Vector3.new(0, -outer * 0.08, 0))
	end
end

function GalaxyPanel:animate()
	local t = os.clock()
	local cam = self.viewport.CurrentCamera
	local size = self.space.AbsoluteSize
	local scale = self.ctx.gui:FindFirstChildOfClass("UIScale")
	local s = if scale then scale.Scale else 1
	local tanHalf = math.tan(math.rad(FOV / 2))
	local aspect = size.X / math.max(size.Y, 1)
	for _, entry in self.planets do
		local a = entry.phase + t * entry.speed
		local pos = Vector3.new(math.cos(a) * entry.orbit, math.sin(a) * entry.orbit * entry.tilt, math.sin(a) * entry.orbit)
		local spin = CFrame.Angles(0, t * 0.6 + entry.phase, 0.2)
		local base = CFrame.new(pos) * spin
		for _, part in entry.model:GetChildren() do
			if part:IsA("BasePart") then
				local offset = part:GetAttribute("Offset")
				if offset then
					part.CFrame = base * CFrame.new(offset)
				elseif part:GetAttribute("Ring") then
					part.CFrame = CFrame.new(pos) * CFrame.Angles(0, 0, math.pi / 2 + 0.35)
				else
					part.CFrame = base
				end
			end
		end
		-- Project to the overlay so the planet can be tapped and labelled.
		local p = cam.CFrame:PointToObjectSpace(pos)
		if p.Z < 0 then
			local x = (p.X / -p.Z) / (tanHalf * aspect)
			local y = (p.Y / -p.Z) / tanHalf
			local px = (x + 1) / 2 * size.X / s
			local py = (1 - y) / 2 * size.Y / s
			entry.button.Position = UDim2.fromOffset(px, py)
			local onScreen = math.max(36, entry.radius * 2 / -p.Z / tanHalf * size.Y / s * 0.5)
			entry.button.Size = UDim2.fromOffset(onScreen, onScreen)
			entry.button.Visible = true
		else
			entry.button.Visible = false
		end
		entry.label.TextColor3 = if self.selected == entry then Theme.Color.Accent else Theme.Color.White
	end
end

function GalaxyPanel:select(entry)
	self.selected = entry
	local p = entry.planet
	self.nameBox.Text = p.name
	local kit = Kits.get(p.kit)
	local cm = 1
	for _, tier in Tiers.List do
		if tier.id == p.tier then
			cm = tier.cmPerStud
		end
	end
	local placeText = if p.place == 1 then "🥇 1st place!" elseif p.place == 2 then "🥈 2nd place" elseif p.place == 3 then "🥉 3rd place" else Format.ordinal(p.place) .. " place"
	self.facts.Text = string.format("📏 %s across\n🗺️ %s\n%s\n📅 %s", Format.size(p.d, cm), kit and kit.name or p.kit, placeText, os.date("%b %d, %Y", p.t))
	for i, slot in self.propSlots do
		local uid = p.props[i]
		for _, c in slot:GetChildren() do
			if c:IsA("Model") or c:IsA("Camera") then
				c:Destroy()
			end
		end
		if uid and PropLibrary.get(uid) then
			task.spawn(function()
				local template = PropBuilder.template(uid)
				if template and self.selected == entry then
					Ui.setViewportModel(slot, template)
				end
			end)
		end
	end
	self.pinButton.Text = if p.pinned then "📌 Unpin" else "📌 Pin (keeps it forever)"
end

function GalaxyPanel:rename(text: string, _enter: boolean)
	local entry = self.selected
	if not entry or text == entry.planet.name then
		return
	end
	-- Trim to the byte limit without cutting a multi-byte character (emoji) in half.
	local name = text
	if #name > Tuning.Galaxy.NameMaxLength then
		local cut = 0
		for pos in utf8.codes(name) do
			local nextPos = utf8.offset(name, 2, pos) or (#name + 1)
			if nextPos - 1 > Tuning.Galaxy.NameMaxLength then
				break
			end
			cut = nextPos - 1
		end
		name = string.sub(name, 1, cut)
	end
	local ok, result = Net.request("RenamePlanet", { id = entry.planet.id, name = name })
	if ok and type(result) == "string" then
		self.nameBox.Text = result
	else
		self.nameBox.Text = entry.planet.name
	end
end

function GalaxyPanel:togglePin()
	local entry = self.selected
	if not entry then
		return
	end
	local ok, result = Net.request("PinPlanet", entry.planet.id)
	if not ok and result == "max_pinned" then
		self.ctx.notify("📌", "You can pin up to " .. Tuning.Galaxy.MaxPinned .. " planets.", Theme.Color.Bad)
	end
end

return GalaxyPanel
