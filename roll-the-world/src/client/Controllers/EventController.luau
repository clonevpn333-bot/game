--!nonstrict
-- World event presentation: a big slam-in banner with the event's icon and one-line hook, a live
-- countdown chip under it, weather that follows the camera (rain, glitter, dust, floaty bubbles,
-- sparks, shooting stars), a lighting mood shift that eases in and back out, a sky beam over
-- Supply Drops and a pulsing aura on the Giant. Gameplay effects are server-side; this is the show.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Theme = require(Shared.Config.Theme)
local Signal = require(Shared.Util.Signal)
local Ui = require(script.Parent.Parent.UI.Ui)
local Modes = require(Shared.Data.Modes)
local Mutators = require(Shared.Data.Mutators)
local Kits = require(Shared.Data.Kits)

local EventController = {}
EventController.Changed = Signal.new() -- (eventInfo?)

local controllers
local state, settings
local gui: ScreenGui
local card: Frame
local cardIcon: TextLabel
local cardTitle: TextLabel
local cardSub: TextLabel
local chip: Frame
local chipLabel: TextLabel
local chipFill: Frame
local currentId: string? = nil
local current = nil
local weatherPart: Part? = nil
local weatherEmitters: { ParticleEmitter } = {}
local weatherName: string? = nil
local lightingSaved = nil
local lightingTweens: { Tween } = {}
local colorFx: ColorCorrectionEffect? = nil
local beam: Model? = nil
local giantFx: { Instance } = {}
local giantBall: BasePart? = nil
local lastRoundId = nil
local beamPropId: number? = nil
local nightFx: ColorCorrectionEffect? = nil
local nightSaved = nil

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"
local RAIN = "rbxasset://textures/particles/forcefield_glow_main.dds"

function EventController:init(c)
	controllers = c
end

local function hex(h: string?): Color3?
	if type(h) ~= "string" then
		return nil
	end
	local ok, c = pcall(Color3.fromHex, h)
	return if ok then c else nil
end

local function quality(): number
	return if settings then settings:qualityFactor() else 1
end

-- UI ----------------------------------------------------------------------------------------------

local function buildUi()
	gui = Ui.new("ScreenGui", {
		Name = "EventHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 5,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	Ui.autoScale(gui)
	card = Ui.new("Frame", {
		Name = "EventCard",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.24),
		Size = UDim2.fromOffset(560, 128),
		BackgroundColor3 = Theme.Color.Panel,
		Visible = false,
		Parent = gui,
	}, {
		Ui.corner(Theme.Radius.Large),
		Ui.stroke(4, Theme.Color.Ink),
		Ui.new("UIScale", { Scale = 1 }),
	})
	cardIcon = Ui.new("TextLabel", {
		Text = "☄️",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 14, 0.5, 0),
		Size = UDim2.fromOffset(100, 100),
		TextScaled = true,
		Parent = card,
	})
	cardTitle = Ui.new("TextLabel", {
		Text = "METEOR SHOWER",
		Position = UDim2.fromOffset(124, 12),
		Size = UDim2.new(1, -138, 0, 62),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextColor3 = Theme.Color.White,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	}, { Ui.stroke(3, Theme.Color.Ink) })
	cardSub = Ui.new("TextLabel", {
		Text = "",
		Position = UDim2.fromOffset(124, 76),
		Size = UDim2.new(1, -138, 0, 38),
		TextScaled = true,
		FontFace = Theme.Font.Bold,
		TextColor3 = Theme.Color.Ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = card,
	})
	-- Countdown chip beside the round timer pill (top left) while an event runs.
	chip = Ui.new("Frame", {
		Name = "EventChip",
		Position = UDim2.fromOffset(184, 56),
		Size = UDim2.fromOffset(250, 40),
		BackgroundColor3 = Theme.Color.Panel,
		Visible = false,
		Parent = gui,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, Theme.Color.Ink) })
	chipFill = Ui.new("Frame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Theme.Color.Magic,
		BackgroundTransparency = 0.25,
		Parent = chip,
	}, { Ui.corner(Theme.Radius.Pill) })
	chipLabel = Ui.new("TextLabel", {
		Text = "",
		Position = UDim2.fromOffset(10, 4),
		Size = UDim2.new(1, -20, 1, -8),
		TextScaled = true,
		FontFace = Theme.Font.Bold,
		TextColor3 = Theme.Color.White,
		ZIndex = 2,
		Parent = chip,
	}, { Ui.stroke(2, Theme.Color.Ink) })
end

local function slamCard(icon: string, title: string, sub: string, color: Color3)
	cardIcon.Text = icon
	cardTitle.Text = string.upper(title)
	cardTitle.TextColor3 = color
	cardSub.Text = sub
	card.Visible = true
	card.BackgroundTransparency = 0
	local scale = card:FindFirstChildOfClass("UIScale")
	scale.Scale = 0.2
	card.Rotation = -6
	Ui.tween(scale, Theme.Tween.Bounce, { Scale = 1 })
	Ui.tween(card, Theme.Tween.Pop, { Rotation = 0 })
	-- The icon wobbles for attention.
	task.spawn(function()
		for i = 1, 6 do
			if not card.Visible then
				break
			end
			Ui.tween(cardIcon, TweenInfo.new(0.12), { Rotation = if i % 2 == 0 then 12 else -12 })
			task.wait(0.12)
		end
		cardIcon.Rotation = 0
	end)
	local shown = title
	task.delay(3.4, function()
		if cardTitle.Text == string.upper(shown) then
			Ui.tween(scale, Theme.Tween.Smooth, { Scale = 0 })
			task.wait(0.3)
			if cardTitle.Text == string.upper(shown) then
				card.Visible = false
			end
		end
	end)
end

-- WEATHER -----------------------------------------------------------------------------------------

local function emitter(props): ParticleEmitter
	local e = Instance.new("ParticleEmitter")
	for k, v in props do
		e[k] = v
	end
	e.Parent = weatherPart
	table.insert(weatherEmitters, e)
	return e
end

local function clearWeather()
	for _, e in weatherEmitters do
		e.Enabled = false
		task.delay(3, function()
			e:Destroy()
		end)
	end
	table.clear(weatherEmitters)
	weatherName = nil
end

local function setWeather(name: string?, color: Color3)
	if name == weatherName then
		return
	end
	clearWeather()
	weatherName = name
	if not name or not weatherPart then
		return
	end
	local q = quality()
	if name == "Rain" then
		emitter({
			Texture = RAIN,
			Color = ColorSequence.new(Color3.fromRGB(210, 235, 255)),
			LightEmission = 0.3,
			Transparency = NumberSequence.new(0.35),
			Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.15), NumberSequenceKeypoint.new(1, 0.15) }),
			Squash = NumberSequence.new(-6),
			Lifetime = NumberRange.new(0.9, 1.2),
			Rate = 500 * q,
			Speed = NumberRange.new(110, 140),
			EmissionDirection = Enum.NormalId.Bottom,
			Orientation = Enum.ParticleOrientation.FacingCameraWorldUp,
			SpreadAngle = Vector2.new(6, 6),
		})
		emitter({
			Texture = SMOKE,
			Color = ColorSequence.new(Color3.fromRGB(200, 220, 240)),
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.5, 0.85), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new(40),
			Lifetime = NumberRange.new(4, 6),
			Rate = 6 * q,
			Speed = NumberRange.new(4, 10),
			EmissionDirection = Enum.NormalId.Bottom,
		})
	elseif name == "Glitter" then
		emitter({
			Texture = SPARKLE,
			Color = ColorSequence.new(Color3.fromRGB(255, 230, 140), Color3.fromRGB(255, 190, 80)),
			LightEmission = 1,
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.2, 0), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0.1) }),
			Lifetime = NumberRange.new(3, 5),
			Rate = 80 * q,
			Speed = NumberRange.new(3, 8),
			EmissionDirection = Enum.NormalId.Bottom,
			RotSpeed = NumberRange.new(-120, 120),
			SpreadAngle = Vector2.new(40, 40),
		})
	elseif name == "Meteors" then
		-- Distant shooting stars in the sky (the real meteors are props with their own trails).
		emitter({
			Texture = FIRE,
			Color = ColorSequence.new(Color3.fromRGB(255, 230, 200), Color3.fromRGB(170, 130, 255)),
			LightEmission = 1,
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 3), NumberSequenceKeypoint.new(1, 0) }),
			Squash = NumberSequence.new(-4),
			Lifetime = NumberRange.new(1, 1.6),
			Rate = 6 * q + 2,
			Speed = NumberRange.new(140, 220),
			Acceleration = Vector3.new(0, -40, 0),
			EmissionDirection = Enum.NormalId.Front,
			Orientation = Enum.ParticleOrientation.VelocityParallel,
			SpreadAngle = Vector2.new(50, 20),
		})
	elseif name == "Dust" then
		emitter({
			Texture = SMOKE,
			Color = ColorSequence.new(Color3.fromRGB(240, 210, 160)),
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.4, 0.75), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new(24),
			Lifetime = NumberRange.new(3, 5),
			Rate = 10 * q,
			Speed = NumberRange.new(10, 20),
			EmissionDirection = Enum.NormalId.Right,
			SpreadAngle = Vector2.new(30, 10),
		})
	elseif name == "Floaty" then
		emitter({
			Texture = SPARKLE,
			Color = ColorSequence.new(Color3.fromRGB(220, 200, 255), Color3.fromRGB(160, 220, 255)),
			LightEmission = 0.7,
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.3, 0.2), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 1.4) }),
			Lifetime = NumberRange.new(4, 7),
			Rate = 40 * q,
			Speed = NumberRange.new(2, 5),
			EmissionDirection = Enum.NormalId.Top,
			SpreadAngle = Vector2.new(70, 70),
		})
	elseif name == "Sparks" then
		emitter({
			Texture = SPARKLE,
			Color = ColorSequence.new(color, Color3.fromRGB(255, 255, 255)),
			LightEmission = 1,
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) }),
			Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.8), NumberSequenceKeypoint.new(1, 0) }),
			Lifetime = NumberRange.new(0.6, 1.2),
			Rate = 60 * q,
			Speed = NumberRange.new(10, 30),
			EmissionDirection = Enum.NormalId.Bottom,
			SpreadAngle = Vector2.new(80, 80),
		})
	end
end

local function updateWeatherPart()
	local cam = Workspace.CurrentCamera
	if not cam or not weatherPart then
		return
	end
	local focus = cam.Focus.Position
	local look = cam.CFrame.LookVector
	-- A wide sheet of emitters above and slightly ahead of what the camera is looking at.
	local ahead = Vector3.new(look.X, 0, look.Z)
	if ahead.Magnitude > 0.01 then
		ahead = ahead.Unit
	end
	local size = math.clamp((cam.CFrame.Position - focus).Magnitude * 2.2, 120, 600)
	weatherPart.Size = Vector3.new(size, 1, size)
	if weatherName == "Meteors" then
		-- Shooting stars start high and off to one side, streaking across the sky.
		weatherPart.CFrame = CFrame.lookAt(focus + Vector3.new(0, 260, 0) - ahead * 200, focus + ahead * 300 + Vector3.new(0, 150, 0))
	elseif weatherName == "Floaty" then
		weatherPart.CFrame = CFrame.new(focus + ahead * size * 0.2 - Vector3.new(0, 10, 0))
	elseif weatherName == "Dust" then
		weatherPart.CFrame = CFrame.new(focus + Vector3.new(0, 12, 0) + ahead * size * 0.2)
	else
		weatherPart.CFrame = CFrame.new(focus + Vector3.new(0, 70, 0) + ahead * size * 0.25)
	end
end

-- LIGHTING ----------------------------------------------------------------------------------------

local function stopLightingTweens()
	for _, t in lightingTweens do
		t:Cancel()
	end
	table.clear(lightingTweens)
end

local function applyLighting(spec)
	stopLightingTweens()
	if not colorFx then
		local fx = Instance.new("ColorCorrectionEffect")
		fx.Name = "EventColor"
		fx.Parent = Lighting
		colorFx = fx
	end
	local info = TweenInfo.new(2.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
	if spec then
		if not lightingSaved then
			lightingSaved = { clock = Lighting.ClockTime, fog = Lighting.FogColor }
		end
		table.insert(lightingTweens, TweenService:Create(colorFx, info, {
			TintColor = hex(spec.tint) or Color3.new(1, 1, 1),
			Brightness = spec.brightness or 0,
			Saturation = spec.saturation or 0,
		}))
		local props = {}
		if spec.clock then
			props.ClockTime = spec.clock
		end
		if spec.fog then
			props.FogColor = hex(spec.fog)
		end
		if next(props) then
			table.insert(lightingTweens, TweenService:Create(Lighting, info, props))
		end
	else
		table.insert(lightingTweens, TweenService:Create(colorFx, info, { TintColor = Color3.new(1, 1, 1), Brightness = 0, Saturation = 0 }))
		if lightingSaved then
			table.insert(lightingTweens, TweenService:Create(Lighting, info, { ClockTime = lightingSaved.clock, FogColor = lightingSaved.fog }))
			lightingSaved = nil
		end
	end
	for _, t in lightingTweens do
		t:Play()
	end
end

-- SUPPLY DROP BEAM / GIANT AURA -------------------------------------------------------------------

local function clearBeam()
	if beam then
		beam:Destroy()
		beam = nil
	end
end

local function makeBeam(pos: Vector3, color: Color3)
	clearBeam()
	local model = Instance.new("Model")
	model.Name = "SupplyBeam"
	local pillar = Instance.new("Part")
	pillar.Anchored = true
	pillar.CanCollide = false
	pillar.CanQuery = false
	pillar.CanTouch = false
	pillar.CastShadow = false
	pillar.Material = Enum.Material.Neon
	pillar.Color = color
	pillar.Transparency = 0.55
	pillar.Shape = Enum.PartType.Cylinder
	pillar.Size = Vector3.new(400, 6, 6)
	pillar.CFrame = CFrame.new(pos + Vector3.new(0, 200, 0)) * CFrame.Angles(0, 0, math.pi / 2)
	pillar.Parent = model
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(120, 120)
	bb.AlwaysOnTop = true
	bb.LightInfluence = 0
	bb.StudsOffsetWorldSpace = Vector3.new(0, 40, 0)
	bb.Adornee = pillar
	bb.MaxDistance = 3000
	bb.Parent = pillar
	local icon = Instance.new("TextLabel")
	icon.BackgroundTransparency = 1
	icon.Size = UDim2.fromScale(1, 0.7)
	icon.Text = "📦"
	icon.TextScaled = true
	icon.Parent = bb
	local dist = Instance.new("TextLabel")
	dist.Name = "Distance"
	dist.BackgroundTransparency = 1
	dist.Position = UDim2.fromScale(0, 0.7)
	dist.Size = UDim2.fromScale(1, 0.3)
	dist.TextScaled = true
	dist.FontFace = Theme.Font.Display
	dist.TextColor3 = Theme.Color.White
	dist.Text = ""
	dist.Parent = bb
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 2
	stroke.Color = Theme.Color.Ink
	stroke.Parent = dist
	model.Parent = Workspace
	beam = model
	-- Pulse.
	TweenService:Create(pillar, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
		Transparency = 0.8,
		Size = Vector3.new(400, 9, 9),
	}):Play()
end

local function clearGiant()
	for _, inst in giantFx do
		inst:Destroy()
	end
	table.clear(giantFx)
	giantBall = nil
end

local function markGiant(ball: BasePart)
	if giantBall == ball then
		return
	end
	clearGiant()
	giantBall = ball
	local hl = Instance.new("Highlight")
	hl.FillColor = Color3.fromRGB(255, 70, 110)
	hl.FillTransparency = 0.75
	hl.OutlineColor = Color3.fromRGB(255, 220, 120)
	hl.OutlineTransparency = 0
	hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
	hl.Adornee = ball
	hl.Parent = ball
	table.insert(giantFx, hl)
	TweenService:Create(hl, TweenInfo.new(0.45, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { FillTransparency = 0.35 }):Play()
	local a = Instance.new("Attachment")
	a.Parent = ball
	table.insert(giantFx, a)
	local aura = Instance.new("ParticleEmitter")
	aura.Texture = FIRE
	aura.LightEmission = 1
	aura.Color = ColorSequence.new(Color3.fromRGB(255, 120, 150), Color3.fromRGB(255, 200, 90))
	aura.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 1) })
	aura.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, ball.Size.X * 0.4), NumberSequenceKeypoint.new(1, 0) })
	aura.Lifetime = NumberRange.new(0.5, 0.9)
	aura.Rate = 30
	aura.Speed = NumberRange.new(ball.Size.X * 0.3, ball.Size.X * 0.6)
	aura.SpreadAngle = Vector2.new(180, 180)
	aura.Parent = a
	table.insert(giantFx, aura)
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(220, 60)
	bb.AlwaysOnTop = true
	bb.LightInfluence = 0
	bb.StudsOffsetWorldSpace = Vector3.new(0, ball.Size.Y * 0.75 + 4, 0)
	bb.MaxDistance = 2500
	bb.Adornee = ball
	bb.Parent = ball
	table.insert(giantFx, bb)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Text = "🦖 GIANT!"
	label.TextScaled = true
	label.FontFace = Theme.Font.Display
	label.TextColor3 = Color3.fromRGB(255, 110, 140)
	label.Parent = bb
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 3
	stroke.Color = Theme.Color.Ink
	stroke.Parent = label
end

local function findBallByUserId(userId: number): BasePart?
	local balls = Workspace:FindFirstChild("Balls")
	if not balls then
		return nil
	end
	for _, ball in balls:GetChildren() do
		if ball:IsA("BasePart") and ball:GetAttribute("OwnerId") == userId then
			return ball
		end
	end
	return nil
end

-- FLOW --------------------------------------------------------------------------------------------

local function applyEvent(ev, fresh: boolean)
	local id = ev and ev.id or nil
	if id == currentId and not fresh then
		current = ev or current
		return
	end
	currentId = id
	current = ev
	EventController.Changed:Fire(ev)
	if not ev then
		setWeather(nil, Color3.new(1, 1, 1))
		applyLighting(nil)
		clearBeam()
		clearGiant()
		chip.Visible = false
		return
	end
	local color = hex(ev.color) or Theme.Color.Magic
	setWeather(ev.weather, color)
	applyLighting(ev.lighting)
	chip.Visible = true
	chipFill.BackgroundColor3 = color
	beamPropId = nil
	if ev.pos and typeof(ev.pos) == "Vector3" then
		makeBeam(ev.pos, color)
	elseif type(ev.propId) == "number" then
		-- Golden Runner: the beam follows the critter around.
		beamPropId = ev.propId
		makeBeam(Vector3.new(0, -5000, 0), color)
	else
		clearBeam()
	end
	clearGiant()
end

local function onWorldEvent(id: string?, info)
	if not id then
		applyEvent(nil, false)
		return
	end
	info = info or {}
	local ev = {
		id = id,
		name = info.name,
		icon = info.icon,
		color = info.color,
		description = info.description,
		endsAt = info.endsAt,
		startedAt = state:serverTime(),
		pos = info.pos,
		propId = info.propId,
		giantId = info.giantId,
		weather = info.weather,
		lighting = info.lighting,
	}
	-- Merge with the snapshot copy when it arrives (it carries weather/lighting).
	local snap = state.round and state.round.event
	if snap and snap.id == id then
		for k, v in snap do
			if ev[k] == nil then
				ev[k] = v
			end
		end
	end
	applyEvent(ev, true)
	local color = hex(info.color) or Theme.Color.Magic
	local sub = info.description or ""
	local me = Players.LocalPlayer
	if info.giantId and info.giantId == me.UserId then
		sub = "That's YOU! Roll everyone up!"
	elseif info.giantName then
		sub = info.giantName .. " is the GIANT! Run!"
	end
	if info.by then
		sub = sub .. "  (thanks " .. tostring(info.by) .. "!)"
	end
	slamCard(info.icon or "✨", info.name or id, sub, color)
	if controllers.AudioController then
		controllers.AudioController:play("EventStart")
	end
	if controllers.CameraController then
		controllers.CameraController:kickFov(6)
	end
	if controllers.HudController and controllers.HudController.feed then
		controllers.HudController:feed((info.icon or "✨") .. " " .. (info.name or id) .. "!", color)
	end
end

local function update()
	if weatherPart then
		updateWeatherPart()
	end
	if not current then
		return
	end
	local left = math.max(0, (current.endsAt or 0) - state:serverTime())
	local total = math.max(1, (current.endsAt or 0) - (current.startedAt or (current.endsAt or 0) - 30))
	chipLabel.Text = string.format("%s %s  %ds", current.icon or "✨", current.name or "", math.ceil(left))
	chipFill.Size = UDim2.fromScale(math.clamp(left / total, 0, 1), 1)
	if beam and beamPropId then
		local world = controllers.WorldController
		local p = world and world.props[beamPropId]
		local pillar = beam:FindFirstChildWhichIsA("BasePart")
		if not p then
			clearBeam()
			beamPropId = nil
		elseif pillar and p.model then
			local at = p.model:GetPivot().Position
			pillar.CFrame = CFrame.new(at + Vector3.new(0, 200, 0)) * CFrame.Angles(0, 0, math.pi / 2)
		end
	end
	if beam then
		local pillar = beam:FindFirstChildWhichIsA("BasePart")
		local ball = state:focusBall()
		if pillar and ball then
			local bb = pillar:FindFirstChildOfClass("BillboardGui")
			local label = bb and bb:FindFirstChild("Distance")
			if label then
				local d = (Vector3.new(pillar.Position.X, 0, pillar.Position.Z) - Vector3.new(ball.Position.X, 0, ball.Position.Z)).Magnitude
				label.Text = string.format("%dm", math.floor(d * ((state.round and state.round.cmPerStud) or 100) / 100))
			end
		end
	end
	if current.giantId and not giantBall then
		local ball = findBallByUserId(current.giantId)
		if ball then
			markGiant(ball)
		end
	elseif giantBall and not giantBall.Parent then
		clearGiant()
	end
end

function EventController:showCard(icon: string, title: string, sub: string, color: Color3)
	slamCard(icon, title, sub, color)
end

-- Night Roll mutator: moonlit lighting for the round, restored afterwards.
local function setNight(on: boolean)
	if on and not nightSaved then
		nightSaved = { clock = Lighting.ClockTime, brightness = Lighting.Brightness, ambient = Lighting.OutdoorAmbient }
		local fx = Instance.new("ColorCorrectionEffect")
		fx.Name = "NightRoll"
		fx.Parent = Lighting
		nightFx = fx
		local info = TweenInfo.new(3, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
		TweenService:Create(Lighting, info, { ClockTime = 23.2, Brightness = 1.4, OutdoorAmbient = Color3.fromRGB(90, 96, 150) }):Play()
		TweenService:Create(fx, info, { TintColor = Color3.fromRGB(200, 210, 255), Saturation = -0.05, Contrast = 0.1 }):Play()
	elseif not on and nightSaved then
		local saved = nightSaved
		nightSaved = nil
		local info = TweenInfo.new(2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
		TweenService:Create(Lighting, info, { ClockTime = saved.clock, Brightness = saved.brightness, OutdoorAmbient = saved.ambient }):Play()
		local fx = nightFx
		nightFx = nil
		if fx then
			TweenService:Create(fx, info, { TintColor = Color3.new(1, 1, 1), Saturation = 0, Contrast = 0 }):Play()
			task.delay(2.2, function()
				fx:Destroy()
			end)
		end
	end
end

-- New round: announce the map + mode, then the mutator.
local function onRoundStart(round)
	local mode = Modes.get(round.mode)
	local kit = round.kitId and Kits.get(round.kitId)
	local mutator = Mutators.get(round.mutator)
	setNight(mutator ~= nil and mutator.night == true)
	task.delay(1.5, function()
		slamCard(mode.icon, mode.name, (if kit then kit.name .. ": " else "") .. mode.goal, hex(mode.color) or Theme.Color.Primary)
		if controllers.AudioController then
			controllers.AudioController:play("EventStart")
		end
	end)
	if mutator then
		task.delay(5.6, function()
			slamCard(mutator.icon, mutator.name, mutator.description, hex(mutator.color) or Theme.Color.Magic)
		end)
	end
end

function EventController:current()
	return current
end

function EventController:start()
	state = controllers.ClientState
	settings = controllers.SettingsController
	buildUi()
	local part = Instance.new("Part")
	part.Name = "EventWeather"
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.Transparency = 1
	part.Size = Vector3.new(200, 1, 200)
	part.Parent = Workspace.CurrentCamera or Workspace
	weatherPart = part
	Net.connect("WorldEvent", onWorldEvent)
	-- Late joiners and missed pings: the round snapshot is the source of truth.
	state.RoundChanged:Connect(function(round)
		if round and round.state == "Playing" and round.roundId ~= lastRoundId then
			lastRoundId = round.roundId
			onRoundStart(round)
		elseif round and round.state ~= "Playing" and round.state ~= "Launch" and nightSaved then
			setNight(false)
		end
		local ev = round and round.event
		if ev then
			if ev.id ~= currentId then
				applyEvent(ev, false)
			else
				-- Keep weather/lighting fields from the snapshot.
				for k, v in ev do
					current[k] = v
				end
				if ev.lighting and not lightingSaved then
					applyLighting(ev.lighting)
				end
				if ev.weather and weatherName ~= ev.weather then
					setWeather(ev.weather, hex(ev.color) or Theme.Color.Magic)
				end
			end
		elseif currentId then
			applyEvent(nil, false)
		end
	end)
	RunService.RenderStepped:Connect(update)
end

return EventController
