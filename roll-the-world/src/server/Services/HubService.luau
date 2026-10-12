--!nonstrict
-- Builds the hub: a floating island in space where players spend intermission, meet Nana Nova,
-- watch their galaxy, and open the shop / Rolledex / Cores / requests. Also hosts the podium.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local PropBuilder = require(Shared.PropBuilder)
local NanaNova = require(Shared.Data.NanaNova)

local HubService = {}

HubService.ORIGIN = Vector3.new(0, 900, 6000)
HubService.model = nil :: Model?
HubService.spawns = {} :: { CFrame }
HubService.podium = {} :: { CFrame }

local services

local function part(parent: Instance, props: { [string]: any }): BasePart
	local className = props.ClassName or "Part"
	props.ClassName = nil
	local p = Instance.new(className)
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		(p :: any)[k] = v
	end
	p.Parent = parent
	return p :: BasePart
end

local function cylinderCF(pos: Vector3): CFrame
	return CFrame.new(pos) * CFrame.Angles(0, 0, math.pi / 2)
end

local function station(parent: Instance, origin: Vector3, name: string, label: string, color: Color3, icon: string, facing: Vector3)
	local model = Instance.new("Model")
	model.Name = name
	local look = CFrame.lookAt(origin, origin + facing)
	local base = part(model, {
		Name = "Base",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(2, 22, 22),
		CFrame = cylinderCF(origin + Vector3.new(0, 1, 0)),
		Color = color,
		Material = Enum.Material.SmoothPlastic,
	})
	part(model, {
		Name = "Kiosk",
		Size = Vector3.new(14, 9, 6),
		CFrame = look * CFrame.new(0, 6.5, 2),
		Color = Color3.fromRGB(255, 250, 240),
		Material = Enum.Material.SmoothPlastic,
	})
	part(model, {
		Name = "Awning",
		ClassName = "WedgePart",
		Size = Vector3.new(16, 3, 7),
		CFrame = look * CFrame.new(0, 12.5, 1.5) * CFrame.Angles(0, math.pi, 0),
		Color = color,
		Material = Enum.Material.Fabric,
	})
	for i = -1, 1, 2 do
		part(model, {
			Name = "Post",
			Size = Vector3.new(1, 12, 1),
			CFrame = look * CFrame.new(i * 7.2, 7, -1.2),
			Color = Color3.fromRGB(255, 255, 255),
		})
	end
	local glow = part(model, {
		Name = "Glow",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(4, 4, 4),
		CFrame = look * CFrame.new(0, 17, 1),
		Color = color,
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = 22
	light.Brightness = 1.5
	light.Parent = glow
	local sign = Instance.new("BillboardGui")
	sign.Name = "Sign"
	sign.Size = UDim2.fromOffset(220, 90)
	sign.StudsOffsetWorldSpace = Vector3.new(0, 22, 0)
	sign.AlwaysOnTop = false
	sign.MaxDistance = 180
	sign.LightInfluence = 0
	sign.Adornee = base
	local text = Instance.new("TextLabel")
	text.BackgroundTransparency = 1
	text.Size = UDim2.fromScale(1, 1)
	text.FontFace = Font.new("rbxasset://fonts/families/LuckiestGuy.json")
	text.TextScaled = true
	text.Text = icon .. " " .. label
	text.TextColor3 = Color3.new(1, 1, 1)
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 3
	stroke.Color = Color3.fromRGB(38, 26, 74)
	stroke.Parent = text
	text.Parent = sign
	sign.Parent = base
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "Open"
	prompt.ActionText = "Open"
	prompt.ObjectText = label
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 16
	prompt.RequiresLineOfSight = false
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	prompt.Parent = base
	model:SetAttribute("Station", name)
	base:SetAttribute("Station", name)
	model.Parent = parent
	return model
end

local function buildIsland(hub: Model, o: Vector3)
	-- Layered floating island: grass top, cream cliff band, rocky underside tapering to a point.
	part(hub, {
		Name = "Top",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(6, 300, 300),
		CFrame = cylinderCF(o + Vector3.new(0, -3, 0)),
		Color = Color3.fromRGB(150, 226, 140),
		Material = Enum.Material.Grass,
	})
	local layers = {
		{ 290, 14, Color3.fromRGB(255, 226, 186), Enum.Material.Sandstone },
		{ 250, 20, Color3.fromRGB(196, 150, 120), Enum.Material.Rock },
		{ 190, 24, Color3.fromRGB(160, 120, 100), Enum.Material.Rock },
		{ 120, 26, Color3.fromRGB(130, 98, 90), Enum.Material.Rock },
		{ 56, 28, Color3.fromRGB(110, 84, 82), Enum.Material.Rock },
	}
	local y = -6
	for _, layer in layers do
		y -= layer[2] / 2
		part(hub, {
			Name = "Cliff",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(layer[2], layer[1], layer[1]),
			CFrame = cylinderCF(o + Vector3.new(0, y, 0)),
			Color = layer[3],
			Material = layer[4],
		})
		y -= layer[2] / 2
	end
	-- Pastel plaza and path ring.
	part(hub, {
		Name = "Plaza",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.6, 90, 90),
		CFrame = cylinderCF(o + Vector3.new(0, 0.3, 0)),
		Color = Color3.fromRGB(255, 244, 228),
		Material = Enum.Material.Pavement,
	})
	part(hub, {
		Name = "PlazaRing",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.5, 96, 96),
		CFrame = cylinderCF(o + Vector3.new(0, 0.2, 0)),
		Color = Color3.fromRGB(200, 182, 255),
		Material = Enum.Material.SmoothPlastic,
	})
	-- Floating mini rocks around the island.
	for i = 0, 11 do
		local a = i / 12 * math.pi * 2
		local r = 190 + (i % 3) * 22
		local size = 10 + (i % 4) * 6
		part(hub, {
			Name = "Islet",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(size * 0.5, size, size),
			CFrame = cylinderCF(o + Vector3.new(math.cos(a) * r, -20 - (i % 5) * 12, math.sin(a) * r)),
			Color = Color3.fromRGB(150, 226, 140),
			Material = Enum.Material.Grass,
			CanCollide = false,
		})
	end
	-- Cute trees.
	for i = 0, 9 do
		local a = i / 10 * math.pi * 2 + 0.3
		local r = 118 + (i % 2) * 14
		local base = o + Vector3.new(math.cos(a) * r, 0, math.sin(a) * r)
		part(hub, {
			Name = "Trunk",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(14, 3, 3),
			CFrame = cylinderCF(base + Vector3.new(0, 7, 0)),
			Color = Color3.fromRGB(140, 90, 46),
			Material = Enum.Material.Wood,
		})
		local colors = { Color3.fromRGB(255, 175, 204), Color3.fromRGB(200, 182, 255), Color3.fromRGB(149, 213, 178) }
		part(hub, {
			Name = "Leaves",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(13, 13, 13),
			CFrame = CFrame.new(base + Vector3.new(0, 17, 0)),
			Color = colors[i % 3 + 1],
			Material = Enum.Material.SmoothPlastic,
		})
	end
	-- Invisible guard rail so nobody walks off into space.
	for i = 0, 35 do
		local a = i / 36 * math.pi * 2
		part(hub, {
			Name = "Rail",
			Size = Vector3.new(28, 40, 2),
			CFrame = CFrame.new(o + Vector3.new(math.cos(a) * 149, 20, math.sin(a) * 149)) * CFrame.Angles(0, -a + math.pi / 2, 0),
			Transparency = 1,
			CanQuery = false,
		})
	end
end

local function buildPodium(hub: Model, o: Vector3)
	local center = o + Vector3.new(0, 0, -95)
	local steps = {
		{ 0, 14, Color3.fromRGB(255, 209, 102), "1" },
		{ -16, 9, Color3.fromRGB(205, 214, 230), "2" },
		{ 16, 5, Color3.fromRGB(240, 160, 110), "3" },
	}
	HubService.podium = {}
	for i, s in steps do
		local block = part(hub, {
			Name = "Podium" .. s[4],
			Size = Vector3.new(14, s[2], 12),
			CFrame = CFrame.new(center + Vector3.new(s[1], s[2] / 2, 0)),
			Color = s[3],
			Material = Enum.Material.SmoothPlastic,
		})
		local gui = Instance.new("SurfaceGui")
		gui.Face = Enum.NormalId.Back
		gui.LightInfluence = 0
		gui.PixelsPerStud = 20
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Size = UDim2.fromScale(1, 1)
		t.Text = s[4]
		t.TextScaled = true
		t.FontFace = Font.new("rbxasset://fonts/families/LuckiestGuy.json")
		t.TextColor3 = Color3.new(1, 1, 1)
		t.Parent = gui
		gui.Parent = block
		HubService.podium[i] = CFrame.new(center + Vector3.new(s[1], s[2] + 3, 0)) * CFrame.Angles(0, math.pi, 0)
	end
	-- Starry arch behind the podium.
	for i = 0, 12 do
		local a = i / 12 * math.pi
		part(hub, {
			Name = "Arch",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(5, 5, 5),
			CFrame = CFrame.new(center + Vector3.new(math.cos(a) * 30, math.sin(a) * 30, -10)),
			Color = if i % 2 == 0 then Color3.fromRGB(255, 209, 102) else Color3.fromRGB(200, 182, 255),
			Material = Enum.Material.Neon,
			CanCollide = false,
		})
	end
	local stage = part(hub, {
		Name = "Stage",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(1, 70, 70),
		CFrame = cylinderCF(center + Vector3.new(0, 0.5, 0)),
		Color = Color3.fromRGB(123, 92, 214),
		Material = Enum.Material.SmoothPlastic,
	})
	stage:SetAttribute("PodiumStage", true)
end

local function buildNana(hub: Model, o: Vector3)
	local spot = o + Vector3.new(0, 0, 30)
	local chair = PropBuilder.buildParts(NanaNova.Chair, "NanaChair")
	chair:PivotTo(CFrame.new(spot) * CFrame.Angles(0, math.pi, 0))
	chair.Parent = hub
	local nana = PropBuilder.buildParts(NanaNova.Parts, "NanaNova")
	nana:PivotTo(CFrame.new(spot + Vector3.new(0, 4.6, 0.3)) * CFrame.Angles(0, math.pi, 0))
	nana:SetAttribute("NanaNova", true)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Requests"
	prompt.ObjectText = "Nana Nova"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 18
	prompt.RequiresLineOfSight = false
	prompt.Parent = nana.PrimaryPart
	nana.PrimaryPart:SetAttribute("Station", "Requests")
	nana.Parent = hub
end

local function buildPortals(hub: Model, o: Vector3)
	local Tiers = require(Shared.Config.Tiers)
	for i, tier in Tiers.List do
		local a = math.pi * 0.15 + (i - 1) / (#Tiers.List - 1) * math.pi * 0.7
		local pos = o + Vector3.new(math.cos(a) * 112, 0, math.sin(a) * 112)
		local look = CFrame.lookAt(pos, Vector3.new(o.X, pos.Y, o.Z))
		local ring = Instance.new("Model")
		ring.Name = "Portal" .. tier.key
		for k = 0, 15 do
			local ang = k / 16 * math.pi * 2
			part(ring, {
				Name = "Ring",
				Shape = Enum.PartType.Ball,
				Size = Vector3.new(3, 3, 3),
				CFrame = look * CFrame.new(math.cos(ang) * 9, 10 + math.sin(ang) * 9, 0),
				Color = tier.color,
				Material = if tier.shipped then Enum.Material.Neon else Enum.Material.SmoothPlastic,
				CanCollide = false,
			})
		end
		local film = part(ring, {
			Name = "Film",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(0.4, 17, 17),
			CFrame = look * CFrame.new(0, 10, 0) * CFrame.Angles(0, math.pi / 2, 0),
			Color = tier.color,
			Material = Enum.Material.Glass,
			Transparency = 0.5,
			CanCollide = false,
		})
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = if tier.shipped then "Info" else "Locked"
		prompt.ObjectText = tier.icon .. " " .. tier.name
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 16
		prompt.RequiresLineOfSight = false
		prompt.Parent = film
		film:SetAttribute("Station", "Tier")
		film:SetAttribute("TierId", tier.id)
		ring.Parent = hub
	end
end

function HubService:build()
	local o = self.ORIGIN
	local hub = Instance.new("Model")
	hub.Name = "Hub"
	hub.ModelStreamingMode = Enum.ModelStreamingMode.Persistent
	buildIsland(hub, o)
	buildPodium(hub, o)
	buildNana(hub, o)
	buildPortals(hub, o)
	station(hub, o + Vector3.new(-60, 0, 40), "Shop", "Shop", Color3.fromRGB(255, 122, 69), "🛍️", Vector3.new(1, 0, -0.4))
	station(hub, o + Vector3.new(60, 0, 40), "Rolledex", "Rolledex", Color3.fromRGB(77, 196, 255), "📖", Vector3.new(-1, 0, -0.4))
	station(hub, o + Vector3.new(-78, 0, -20), "Cores", "Cores", Color3.fromRGB(176, 108, 255), "⚙️", Vector3.new(1, 0, 0.3))
	station(hub, o + Vector3.new(78, 0, -20), "Galaxy", "My Galaxy", Color3.fromRGB(255, 214, 64), "🌌", Vector3.new(-1, 0, 0.3))
	station(hub, o + Vector3.new(0, 0, 80), "RollPass", "Roll Pass", Color3.fromRGB(88, 214, 116), "🎟️", Vector3.new(0, 0, -1))

	-- VIP lounge: a raised cloud deck. Non-VIP clients keep the gate solid locally.
	local lounge = part(hub, {
		Name = "VipLounge",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(3, 46, 46),
		CFrame = cylinderCF(o + Vector3.new(100, 1.5, -70)),
		Color = Color3.fromRGB(255, 214, 64),
		Material = Enum.Material.Foil,
	})
	lounge:SetAttribute("VipLounge", true)
	local gate = part(hub, {
		Name = "VipGate",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(40, 48, 48),
		CFrame = cylinderCF(o + Vector3.new(100, 22, -70)) * CFrame.Angles(0, 0, 0),
		Color = Color3.fromRGB(255, 214, 64),
		Material = Enum.Material.ForceField,
		Transparency = 0.6,
	})
	gate:SetAttribute("VipGate", true)

	-- Spawns around the plaza.
	self.spawns = {}
	for i = 0, 11 do
		local a = i / 12 * math.pi * 2
		local pos = o + Vector3.new(math.cos(a) * 34, 3, math.sin(a) * 34 + 10)
		local spawn = Instance.new("SpawnLocation")
		spawn.Name = "HubSpawn"
		spawn.Anchored = true
		spawn.Neutral = true
		spawn.Duration = 0
		spawn.Size = Vector3.new(6, 1, 6)
		spawn.CFrame = CFrame.new(pos - Vector3.new(0, 2.5, 0))
		spawn.Transparency = 1
		spawn.CanCollide = false
		spawn.CanQuery = false
		spawn.Parent = hub
		table.insert(self.spawns, CFrame.lookAt(pos, Vector3.new(o.X, pos.Y, o.Z)))
	end
	hub.Parent = Workspace
	self.model = hub
end

function HubService:init(s)
	services = s
	self:build()
end

function HubService:randomSpawn(): CFrame
	return self.spawns[math.random(1, #self.spawns)]
end

-- Put a player's avatar back in the hub at normal scale, walking normally.
function HubService:sendToHub(player: Player, at: CFrame?)
	local character = player.Character
	if not character then
		return
	end
	services.BallService:markRiding(player, false)
	services.BallService:resetCharacterScale(player)
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		for _, d in character:GetDescendants() do
			if d:IsA("Weld") and d.Name == "RiderWeld" then
				d:Destroy()
			end
		end
		hrp.Anchored = false
		hrp.AssemblyLinearVelocity = Vector3.zero
		character:PivotTo(at or self:randomSpawn())
		pcall(function()
			hrp:SetNetworkOwner(player)
		end)
	end
end

function HubService:start()
	Players.PlayerAdded:Connect(function(player)
		player:SetAttribute("InHub", true)
	end)
end

return HubService
