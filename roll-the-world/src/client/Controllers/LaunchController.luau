--!nonstrict
-- The end-of-round LAUNCH: your ball becomes a planet, and you watch it happen.
--   1. Ignition: the ball shudders on a column of fire and smoke.
--   2. Lift-off: it rockets up, BURNING ITS TRASH FOR FUEL. The props stuck to it break off in
--      flames and tumble back down, and the ball shrinks to its glowing core.
--   3. The sky fades to space (night, stars, nebula glow) while the camera rides along.
--   4. Your galaxy comes into view: Nana's star, orbit rings and every planet you've made before.
--   5. The core flies into an open orbit, pops into a planet with your colors and your planet's
--      name, and starts orbiting. The camera holds on your galaxy until the results.
-- Other players' balls launch too, toward their own corners of the sky.
-- Everything here is client-side presentation; the server only anchors balls and creates planets.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)

local LaunchController = {}
LaunchController.Launched = Signal.new()
LaunchController.Planeted = Signal.new() -- (userId, position)

local controllers
local state
local flights = {}
local debris = {}
local active = false
local scene: Model? = nil
local sceneOrbits = {}
local savedLighting = nil
local lightingFx = {}
local myPlanet = nil -- latest PlanetCreated record for us
local hold = nil -- camera hold after arrival

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local GRAVITY = Vector3.new(0, -140, 0)
local MAX_DEBRIS = 70

function LaunchController:init(c)
	controllers = c
end

local function hex(h: string?, fallback: Color3): Color3
	if type(h) ~= "string" then
		return fallback
	end
	local ok, c = pcall(Color3.fromHex, h)
	return if ok then c else fallback
end

local function part(props): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		p[k] = v
	end
	return p
end

local function emitter(parent: Instance, props): ParticleEmitter
	local e = Instance.new("ParticleEmitter")
	for k, v in props do
		e[k] = v
	end
	e.Parent = parent
	return e
end

-- ROCKET FX -------------------------------------------------------------------------------------

local function addRocket(shell: BasePart, diameter: number): { Instance }
	local made = {}
	local bottom = Instance.new("Attachment")
	bottom.Position = Vector3.new(0, -diameter * 0.45, 0)
	bottom.Parent = shell
	table.insert(made, bottom)
	table.insert(made, emitter(bottom, {
		Texture = FIRE,
		Color = ColorSequence.new(Color3.fromRGB(255, 240, 160), Color3.fromRGB(255, 110, 60)),
		LightEmission = 1,
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.55), NumberSequenceKeypoint.new(1, 0) }),
		Lifetime = NumberRange.new(0.25, 0.5),
		Rate = 70,
		Speed = NumberRange.new(diameter * 1.5, diameter * 2.8),
		EmissionDirection = Enum.NormalId.Bottom,
		SpreadAngle = Vector2.new(18, 18),
	}))
	table.insert(made, emitter(bottom, {
		Texture = SMOKE,
		Color = ColorSequence.new(Color3.fromRGB(255, 250, 240), Color3.fromRGB(190, 180, 200)),
		Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.25), NumberSequenceKeypoint.new(1, 1) }),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.5), NumberSequenceKeypoint.new(1, diameter * 1.8) }),
		Lifetime = NumberRange.new(1.4, 2.2),
		Rate = 28,
		Speed = NumberRange.new(diameter * 0.3, diameter * 0.7),
		EmissionDirection = Enum.NormalId.Bottom,
	}))
	local glow = Instance.new("PointLight")
	glow.Color = Color3.fromRGB(255, 170, 90)
	glow.Range = math.clamp(diameter * 3, 12, 60)
	glow.Brightness = 3
	glow.Parent = shell
	table.insert(made, glow)
	local a0 = Instance.new("Attachment")
	a0.Position = Vector3.new(diameter * 0.3, 0, 0)
	a0.Parent = shell
	local a1 = Instance.new("Attachment")
	a1.Position = Vector3.new(-diameter * 0.3, 0, 0)
	a1.Parent = shell
	local trail = Instance.new("Trail")
	trail.Attachment0 = a0
	trail.Attachment1 = a1
	trail.Lifetime = 1.1
	trail.LightEmission = 0.8
	trail.FaceCamera = true
	trail.Color = ColorSequence.new(Color3.fromRGB(255, 236, 140), Color3.fromRGB(255, 120, 196))
	trail.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) })
	trail.Parent = shell
	table.insert(made, a0)
	table.insert(made, a1)
	table.insert(made, trail)
	return made
end

local function groundBlast(pos: Vector3, diameter: number)
	local anchor = part({ Transparency = 1, Size = Vector3.one, CFrame = CFrame.new(pos) })
	anchor.Parent = Workspace
	local smoke = emitter(anchor, {
		Texture = SMOKE,
		Color = ColorSequence.new(Color3.fromRGB(255, 248, 235)),
		Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) }),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.6), NumberSequenceKeypoint.new(1, diameter * 2.2) }),
		Lifetime = NumberRange.new(1.5, 2.5),
		Speed = NumberRange.new(diameter * 2, diameter * 4),
		SpreadAngle = Vector2.new(180, 8),
		Drag = 3,
		Enabled = false,
	})
	smoke:Emit(26)
	task.delay(3, function()
		anchor:Destroy()
	end)
end

-- FUEL: stuck props break off burning and fall ------------------------------------------------

local function igniteDebris(model: Model, size: number, velocity: Vector3)
	if #debris >= MAX_DEBRIS then
		model:Destroy()
		return
	end
	local root = model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart")
	if not root then
		model:Destroy()
		return
	end
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
			d.CanCollide = false
		end
	end
	local fx = Instance.new("Attachment")
	fx.Parent = root
	emitter(fx, {
		Texture = FIRE,
		Color = ColorSequence.new(Color3.fromRGB(255, 220, 140), Color3.fromRGB(255, 90, 50)),
		LightEmission = 1,
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, math.max(0.6, size * 0.7)), NumberSequenceKeypoint.new(1, 0) }),
		Lifetime = NumberRange.new(0.3, 0.6),
		Rate = 24,
		Speed = NumberRange.new(1, 3),
	})
	emitter(fx, {
		Texture = SMOKE,
		Color = ColorSequence.new(Color3.fromRGB(120, 110, 120)),
		Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 1) }),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, math.max(0.6, size * 0.5)), NumberSequenceKeypoint.new(1, math.max(2, size * 1.6)) }),
		Lifetime = NumberRange.new(0.8, 1.3),
		Rate = 10,
		Speed = NumberRange.new(0.5, 1.5),
	})
	table.insert(debris, {
		model = model,
		vel = velocity,
		spin = Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * 8,
		cf = model:GetPivot(),
		born = os.clock(),
	})
end

-- Peel one visible stuck prop off a ball and send it tumbling down in flames.
local function shedOne(f): boolean
	local balls = controllers.BallVisualController
	local entry = balls and balls.balls[f.userId]
	if not entry then
		return false
	end
	for i = #entry.stuck, 1, -1 do
		local s = entry.stuck[i]
		if s.model and not s.folded then
			table.remove(entry.stuck, i)
			local model = s.model
			s.model = nil
			local out = model:GetPivot().Position - f.part.Position
			out = if out.Magnitude > 1e-3 then out.Unit else Vector3.new(1, 0, 0)
			local vel = Vector3.new(out.X, 0, out.Z) * (12 + math.random() * 18) + Vector3.new(0, -10 - math.random() * 25, 0) + f.vel * 0.25
			igniteDebris(model, s.size or 1, vel)
			return true
		end
	end
	-- Nothing visible left: chip a burning chunk off the core in one of its lump colors.
	if entry.lumps and #entry.lumps > 0 and math.random() < 0.6 then
		local lump = entry.lumps[math.random(1, #entry.lumps)]
		local size = f.diameter * (0.08 + math.random() * 0.08)
		local chunk = Instance.new("Model")
		local p = part({
			Size = Vector3.new(size, size * 0.7, size),
			Color = lump.Color,
			Material = Enum.Material.SmoothPlastic,
			CFrame = CFrame.new(f.part.Position + Vector3.new(math.random() - 0.5, -0.6, math.random() - 0.5) * f.diameter * 0.5),
		})
		local mesh = Instance.new("SpecialMesh")
		mesh.MeshType = Enum.MeshType.Sphere
		mesh.Parent = p
		p.Parent = chunk
		chunk.PrimaryPart = p
		chunk.Parent = Workspace
		local a = math.random() * math.pi * 2
		igniteDebris(chunk, size, Vector3.new(math.cos(a), 0, math.sin(a)) * 16 + Vector3.new(0, -20, 0) + f.vel * 0.25)
	end
	return false
end

local function updateDebris(dt: number)
	local now = os.clock()
	local parts, cfs = {}, {}
	for i = #debris, 1, -1 do
		local d = debris[i]
		local age = now - d.born
		if age > 4 or not d.model.Parent then
			d.model:Destroy()
			table.remove(debris, i)
			continue
		end
		d.vel += GRAVITY * dt
		local rot = CFrame.Angles(d.spin.X * dt, d.spin.Y * dt, d.spin.Z * dt)
		local new = (CFrame.new(d.cf.Position + d.vel * dt) * (d.cf - d.cf.Position) * rot)
		local delta = new * d.cf:Inverse()
		d.cf = new
		for _, p in d.model:GetDescendants() do
			if p:IsA("BasePart") then
				table.insert(parts, p)
				table.insert(cfs, delta * p.CFrame)
				if age > 3 then
					p.Transparency = math.min(1, p.Transparency + dt * 1.2)
				end
			end
		end
	end
	if #parts > 0 then
		Workspace:BulkMoveTo(parts, cfs, Enum.BulkMoveMode.FireCFrameChanged)
	end
end

-- SKY -> SPACE ------------------------------------------------------------------------------------

local function enterSpace(duration: number)
	if savedLighting then
		return
	end
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	local sky = Lighting:FindFirstChildOfClass("Sky")
	savedLighting = {
		ClockTime = Lighting.ClockTime,
		Brightness = Lighting.Brightness,
		FogEnd = Lighting.FogEnd,
		FogStart = Lighting.FogStart,
		ExposureCompensation = Lighting.ExposureCompensation,
		OutdoorAmbient = Lighting.OutdoorAmbient,
		atmosphere = atmosphere and { Density = atmosphere.Density, Haze = atmosphere.Haze, Glare = atmosphere.Glare },
		starCount = sky and sky.StarCount,
	}
	local info = TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
	table.insert(lightingFx, TweenService:Create(Lighting, info, {
		ClockTime = 0.2,
		Brightness = 1.2,
		FogEnd = 100000,
		FogStart = 99999,
		ExposureCompensation = 0.3,
		OutdoorAmbient = Color3.fromRGB(110, 100, 160),
	}))
	if atmosphere then
		table.insert(lightingFx, TweenService:Create(atmosphere, info, { Density = 0, Haze = 0, Glare = 0 }))
	end
	if sky then
		sky.StarCount = 3000
	end
	local tint = Instance.new("ColorCorrectionEffect")
	tint.Name = "LaunchSpace"
	tint.Parent = Lighting
	table.insert(lightingFx, TweenService:Create(tint, info, { TintColor = Color3.fromRGB(215, 205, 255), Saturation = 0.2, Contrast = 0.08 }))
	lightingFx.tint = tint
	for _, t in lightingFx do
		if typeof(t) == "Instance" and t:IsA("Tween") then
			t:Play()
		end
	end
end

local function leaveSpace()
	if not savedLighting then
		return
	end
	for _, t in lightingFx do
		if typeof(t) == "Instance" and t:IsA("Tween") then
			t:Cancel()
		end
	end
	local s = savedLighting
	savedLighting = nil
	local info = TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.Out)
	TweenService:Create(Lighting, info, {
		ClockTime = s.ClockTime,
		Brightness = s.Brightness,
		FogEnd = s.FogEnd,
		FogStart = s.FogStart,
		ExposureCompensation = s.ExposureCompensation,
		OutdoorAmbient = s.OutdoorAmbient,
	}):Play()
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere and s.atmosphere then
		TweenService:Create(atmosphere, info, s.atmosphere):Play()
	end
	local sky = Lighting:FindFirstChildOfClass("Sky")
	if sky and s.starCount then
		sky.StarCount = s.starCount
	end
	local tint = lightingFx.tint
	if tint then
		TweenService:Create(tint, info, { TintColor = Color3.new(1, 1, 1), Saturation = 0, Contrast = 0 }):Play()
		task.delay(1.3, function()
			tint:Destroy()
		end)
	end
	table.clear(lightingFx)
end

-- THE GALAXY ------------------------------------------------------------------------------------

local function planetModel(colors: { string }, fallback: Color3, radius: number, seed: number): Model
	local model = Instance.new("Model")
	local main = part({
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * radius * 2,
		Color = hex(colors[1], fallback),
		Material = Enum.Material.SmoothPlastic,
	})
	main.Parent = model
	model.PrimaryPart = main
	for i = 2, math.min(#colors, 5) do
		for k = 1, 3 do
			local blob = part({
				Shape = Enum.PartType.Ball,
				Size = Vector3.one * radius * (0.7 + ((i + k) % 3) * 0.16),
				Color = hex(colors[i], main.Color),
				Material = Enum.Material.SmoothPlastic,
			})
			local a = (i * 2.4 + k * 1.7 + seed) % (math.pi * 2)
			local b = ((i * 1.3 + k * 2.1) % math.pi) - math.pi / 2
			blob:SetAttribute("Offset", Vector3.new(math.cos(a) * math.cos(b), math.sin(b), math.sin(a) * math.cos(b)) * radius * 0.72)
			blob.Parent = model
		end
	end
	-- Soft atmosphere glow.
	local halo = part({
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * radius * 2.3,
		Color = main.Color:Lerp(Color3.new(1, 1, 1), 0.5),
		Material = Enum.Material.Neon,
		Transparency = 0.85,
	})
	halo:SetAttribute("Halo", true)
	halo.Parent = model
	return model
end

local function placePlanet(model: Model, cf: CFrame)
	for _, p in model:GetChildren() do
		if p:IsA("BasePart") then
			local offset = p:GetAttribute("Offset")
			p.CFrame = if offset then cf * CFrame.new(offset) else cf
		end
	end
end

local function label(adornee: BasePart, text: string, color: Color3, size: number)
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(320, 60)
	gui.AlwaysOnTop = true
	gui.LightInfluence = 0
	gui.StudsOffsetWorldSpace = Vector3.new(0, size + 4, 0)
	gui.Adornee = adornee
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.Text = text
	t.TextScaled = true
	t.FontFace = Font.new("rbxasset://fonts/families/LuckiestGuy.json")
	t.TextColor3 = color
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 3
	stroke.Color = Color3.fromRGB(38, 26, 74)
	stroke.Parent = t
	t.Parent = gui
	gui.Parent = adornee
	return gui
end

-- Builds Nana's star, orbit rings and your existing planets around `center`.
local function buildGalaxy(center: Vector3, myD: number)
	local model = Instance.new("Model")
	model.Name = "LaunchGalaxy"
	local starR = math.max(40, myD * 1.6)
	local star = part({
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * starR * 2,
		Color = Color3.fromRGB(255, 210, 110),
		Material = Enum.Material.Neon,
		CFrame = CFrame.new(center),
	})
	star.Parent = model
	local glow = part({
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * starR * 3,
		Color = Color3.fromRGB(255, 160, 80),
		Material = Enum.Material.Neon,
		Transparency = 0.82,
		CFrame = CFrame.new(center),
	})
	glow.Parent = model
	local light = Instance.new("PointLight")
	light.Range = 60
	light.Brightness = 5
	light.Color = Color3.fromRGB(255, 220, 160)
	light.Parent = star
	label(star, "✨ Nana's Star ✨", Color3.fromRGB(255, 230, 150), starR)
	-- Nebula clouds far behind for color.
	for i = 1, 5 do
		local a = i * 1.26
		local cloud = part({
			Shape = Enum.PartType.Ball,
			Size = Vector3.one * (starR * (6 + i)),
			Color = ({ Color3.fromRGB(150, 90, 255), Color3.fromRGB(255, 110, 190), Color3.fromRGB(80, 160, 255) })[(i % 3) + 1],
			Material = Enum.Material.Neon,
			Transparency = 0.93,
			CFrame = CFrame.new(center + Vector3.new(math.cos(a) * starR * 14, starR * (2 + i % 3), math.sin(a) * starR * 14)),
		})
		cloud.Parent = model
	end
	-- Existing planets in rings.
	table.clear(sceneOrbits)
	local planets = {}
	local profile = state.profile
	if profile and profile.galaxy then
		for _, p in profile.galaxy.planets do
			if not (myPlanet and p.id == myPlanet.id) then
				table.insert(planets, p)
			end
		end
	end
	table.sort(planets, function(a, b)
		return a.t < b.t
	end)
	local slot = 0
	local ringGap = math.max(30, myD * 1.4)
	local function orbitRadius(i: number): number
		return starR * 1.8 + i * ringGap
	end
	for i, p in planets do
		slot = i
		local r = math.clamp(myD * 0.35 + math.log(math.max(p.d, 1)) * myD * 0.08, 4, myD * 0.9)
		local pm = planetModel(p.colors or {}, Color3.fromRGB(140, 200, 255), r, p.id)
		pm.Parent = model
		if p.name then
			label(pm.PrimaryPart, p.name, Color3.new(1, 1, 1), r * 0.6).Size = UDim2.fromOffset(200, 34)
		end
		table.insert(sceneOrbits, {
			model = pm,
			radius = orbitRadius(i),
			speed = 0.22 / math.sqrt(i),
			phase = (p.id * 2.399) % (math.pi * 2),
			tilt = ((p.id * 0.61) % 0.3) - 0.15,
		})
	end
	-- Ring guides: thin glowing circles (built from short segments) for each orbit plus the new one.
	for i = 1, slot + 1 do
		local rr = orbitRadius(i)
		local isNew = i == slot + 1
		local segments = 56
		local thick = math.max(0.6, myD * 0.03)
		local segLen = 2 * math.pi * rr / segments * 1.05
		for k = 1, segments do
			local a = (k / segments) * math.pi * 2
			local seg = part({
				Size = Vector3.new(thick, thick, segLen),
				Color = if isNew then Color3.fromRGB(255, 230, 140) else Color3.fromRGB(180, 160, 255),
				Material = Enum.Material.Neon,
				Transparency = if isNew then 0.25 else 0.7,
				CFrame = CFrame.new(center + Vector3.new(math.cos(a) * rr, 0, math.sin(a) * rr)) * CFrame.Angles(0, -a, 0),
			})
			seg.Parent = model
		end
	end
	model.Parent = Workspace
	scene = model
	return {
		center = center,
		starR = starR,
		newOrbit = orbitRadius(slot + 1),
		newIndex = slot + 1,
	}
end

local function updateGalaxy()
	if not scene then
		return
	end
	local t = os.clock()
	local center = scene:GetAttribute("Center")
	if not center then
		return
	end
	for _, o in sceneOrbits do
		local a = o.phase + t * o.speed
		local pos = center + Vector3.new(math.cos(a) * o.radius, math.sin(a) * o.radius * o.tilt, math.sin(a) * o.radius)
		placePlanet(o.model, CFrame.new(pos) * CFrame.Angles(0, t * 0.5 + o.phase, 0.2))
	end
end

local function clearScene()
	if scene then
		scene:Destroy()
		scene = nil
	end
	table.clear(sceneOrbits)
	hold = nil
end

-- FLOW ------------------------------------------------------------------------------------------

local function onLaunch(list, endsAt)
	state = controllers.ClientState
	local balls = controllers.BallVisualController
	local now = os.clock()
	-- Leave ~5 s at the end to admire the galaxy before the results.
	local total = math.max(4, endsAt - Workspace:GetServerTimeNow())
	local duration = math.clamp(total - 5, 3.5, 10)
	table.clear(flights)
	clearScene()
	active = true
	local myFlight = nil
	local myId = state.player.UserId
	-- Find our launch spot first so the galaxy sits above it.
	local myEntry = nil
	for _, entry in list do
		if entry.userId == myId then
			myEntry = entry
		end
	end
	local galaxy = nil
	if myEntry and myEntry.ball and myEntry.ball:FindFirstChild("Ball") then
		local start = myEntry.ball.Ball.Position
		local d = myEntry.diameter
		galaxy = buildGalaxy(start + Vector3.new(0, 1300 + d * 7, -(500 + d * 3)), d)
		if scene then
			scene:SetAttribute("Center", galaxy.center)
		end
	end
	for i, entry in list do
		local model = entry.ball
		local ballPart = model and model:FindFirstChild("Ball")
		if ballPart then
			local d = entry.diameter
			local visual = balls and balls.balls[entry.userId]
			local made = if visual then addRocket(visual.shell, d) else {}
			local mine = entry.userId == myId
			local f = {
				userId = entry.userId,
				part = ballPart,
				start = ballPart.CFrame,
				diameter = d,
				t0 = now + 0.8 + (i % 5) * 0.12, -- ignition, then a slightly staggered volley
				dur = duration - 0.8,
				made = made,
				color = if visual then visual.color else Color3.new(1, 1, 1),
				popped = false,
				mine = mine,
				vel = Vector3.zero,
				lastPos = ballPart.Position,
				nextShed = 0,
				visual = visual,
			}
			if mine and galaxy then
				-- Our ball heads for the open orbit slot in front of the camera.
				f.target = galaxy.center + Vector3.new(0, 0, galaxy.newOrbit)
			else
				-- Others streak off toward their own galaxies in the far sky.
				local a = (entry.userId % 360) / 360 * math.pi * 2 + i
				f.target = ballPart.Position + Vector3.new(math.cos(a) * (900 + d * 4), 1600 + d * 8, math.sin(a) * (900 + d * 4))
			end
			table.insert(flights, f)
			if mine then
				myFlight = f
			end
			groundBlast(ballPart.Position - Vector3.new(0, d / 2, 0), d)
		end
	end
	if controllers.AudioController then
		controllers.AudioController:play("Launch")
	end
	local hud = controllers.HudController
	if hud then
		hud:showBanner("🚀 LAUNCH! 🚀", nil, 1.6)
		task.delay(1.8, function()
			hud:showBanner("🔥 Burning your trash for fuel!", Color3.fromRGB(255, 190, 110), 2)
		end)
		task.delay(duration * 0.6, function()
			hud:showBanner("🌌 Heading to your galaxy...", Color3.fromRGB(200, 180, 255), 2)
		end)
	end
	enterSpace(duration * 0.75)
	LaunchController.Launched:Fire(myFlight ~= nil)

	-- Camera: chase from below-behind (watch the fuel fall), then swing out to frame the galaxy as
	-- the core arrives, then hold and slowly orbit the galaxy.
	local camera = controllers.CameraController
	local cam = Workspace.CurrentCamera
	local startCF = cam.CFrame
	local focus = myFlight or flights[1]
	if camera and focus then
		local t0 = os.clock()
		camera:playScripted(function()
			local t = os.clock() - t0
			if not active and not hold then
				return nil
			end
			local d = focus.diameter
			if hold then
				local ht = os.clock() - hold.t0
				local a = ht * 0.12
				local c = hold.center
				local dist = hold.radius * 1.6 + 60
				return CFrame.lookAt(c + Vector3.new(math.sin(a) * dist, dist * 0.45, math.cos(a) * dist), c + Vector3.new(0, 0, hold.radius * 0.3))
			end
			local p = focus.part.Position
			local alpha = math.clamp(t / duration, 0, 1)
			-- Close chase: slightly below and behind, looking up past the ball at the sky.
			local chase = CFrame.lookAt(p + Vector3.new(d * 1.2 + 10, -d * 0.6 - 6, d * 2.6 + 16), p + Vector3.new(0, d * 3, 0))
			local target = chase
			if galaxy and alpha > 0.55 then
				local c = galaxy.center
				local wide = CFrame.lookAt(c + Vector3.new(galaxy.newOrbit * 0.6, galaxy.newOrbit * 0.5, galaxy.newOrbit * 1.9 + 60), (c + p) / 2)
				local k = math.clamp((alpha - 0.55) / 0.35, 0, 1)
				k = k * k * (3 - 2 * k)
				target = chase:Lerp(wide, k)
			end
			if t < 0.5 then
				target = startCF:Lerp(target, t / 0.5)
			end
			return target
		end)
	end
end

local function arrive(f)
	f.popped = true
	for _, inst in f.made do
		inst:Destroy()
	end
	local pos = f.part.Position
	-- Hide the real ball and its visuals; the planet takes over.
	local model = f.part.Parent
	if model then
		for _, d in model:GetDescendants() do
			if d:IsA("BasePart") then
				d.Transparency = 1
			end
		end
	end
	if f.visual then
		f.visual.folder.Parent = nil
	end
	-- Burst.
	local anchor = part({ Transparency = 1, Size = Vector3.one, CFrame = CFrame.new(pos) })
	anchor.Parent = Workspace
	local burst = emitter(anchor, {
		Texture = SPARKLE,
		Color = ColorSequence.new(f.color, Color3.new(1, 1, 1)),
		LightEmission = 1,
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, f.diameter * 0.4), NumberSequenceKeypoint.new(1, 0) }),
		Lifetime = NumberRange.new(0.8, 1.4),
		Speed = NumberRange.new(f.diameter * 2, f.diameter * 5),
		SpreadAngle = Vector2.new(180, 180),
		Drag = 2,
		Enabled = false,
	})
	burst:Emit(70)
	task.delay(2, function()
		anchor:Destroy()
	end)
	LaunchController.Planeted:Fire(f.userId, pos)
	if not f.mine then
		return
	end
	-- Our new planet joins the galaxy.
	local planet = myPlanet
	local colors = planet and planet.colors or {}
	local radius = math.max(4, f.diameter * 0.45)
	local pm = planetModel(colors, f.color, radius, planet and planet.id or 1)
	pm.Parent = scene or Workspace
	local center = scene and scene:GetAttribute("Center") or pos
	local orbitR = (Vector3.new(pos.X, center.Y, pos.Z) - center).Magnitude
	local name = planet and planet.name or "Your new planet"
	label(pm.PrimaryPart, "🪐 " .. name .. "  NEW!", Color3.fromRGB(255, 230, 120), radius)
	local entry = {
		model = pm,
		radius = orbitR,
		speed = 0.18,
		phase = math.atan2(pos.Z - center.Z, pos.X - center.X),
		tilt = 0,
	}
	-- Flash of light where the core becomes a planet.
	local flash = part({
		Shape = Enum.PartType.Ball,
		Size = Vector3.one * radius * 2,
		Color = Color3.fromRGB(255, 245, 220),
		Material = Enum.Material.Neon,
		Transparency = 0.1,
		CFrame = CFrame.new(pos),
	})
	flash.Parent = Workspace
	local flashTween = TweenService:Create(flash, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * radius * 7,
		Transparency = 1,
	})
	flashTween:Play()
	flashTween.Completed:Once(function()
		flash:Destroy()
	end)
	table.insert(sceneOrbits, entry)
	hold = { t0 = os.clock(), center = center, radius = orbitR }
	if controllers.HudController then
		controllers.HudController:showBanner("🪐 " .. name .. " joined your galaxy!", Color3.fromRGB(255, 230, 120), 3.5)
	end
	if controllers.AudioController then
		controllers.AudioController:play("Legendary", { volume = 0.5 })
	end
	if controllers.CameraController then
		controllers.CameraController:shake(0.25)
	end
end

local function update(dt: number)
	updateDebris(dt)
	updateGalaxy()
	if not active then
		return
	end
	local now = os.clock()
	local anyFlying = false
	for _, f in flights do
		if not f.part.Parent or f.popped then
			continue
		end
		anyFlying = true
		local t = (now - f.t0) / f.dur
		local pos
		if t < 0 then
			-- Ignition: shudder in place.
			local k = 1 + t / 0.8
			pos = f.start.Position + Vector3.new(math.sin(now * 40) * 0.05, math.abs(math.sin(now * 33)) * 0.08, math.cos(now * 37) * 0.05) * f.diameter * k
		else
			t = math.min(t, 1)
			-- Rocket curve: straight up first, then bend toward the target.
			local e = t * t * (3 - 2 * t)
			local up = f.start.Position + Vector3.new(0, (f.target.Y - f.start.Position.Y) * math.min(1, t * 1.6) ^ 2, 0)
			local bend = math.clamp((t - 0.25) / 0.75, 0, 1)
			pos = up:Lerp(f.target, bend * bend * e)
			-- Burn off fuel: shed props steadily through the first two thirds of the climb.
			if t < 0.7 and now >= f.nextShed then
				f.nextShed = now + (if f.mine then 0.09 else 0.25)
				shedOne(f)
			end
			-- The ball burns down to its core as the fuel goes.
			if f.visual then
				f.visual.diameter = f.diameter * (1 - 0.35 * math.min(1, t / 0.7))
			end
		end
		f.vel = (pos - f.lastPos) / math.max(dt, 1 / 240)
		f.lastPos = pos
		f.part.CFrame = CFrame.new(pos) * CFrame.Angles(0, now * 3, math.max(t, 0) * 2)
		if t >= 1 then
			arrive(f)
		end
	end
	if not anyFlying and not hold then
		active = false
	end
end

function LaunchController:start()
	state = controllers.ClientState
	Net.connect("LaunchSequence", onLaunch)
	Net.connect("PlanetCreated", function(planet)
		if type(planet) == "table" then
			myPlanet = planet
		end
	end)
	RunService.RenderStepped:Connect(update)
	state.RoundChanged:Connect(function(round)
		if round.state ~= "Launch" then
			if active or scene or savedLighting then
				active = false
				clearScene()
				leaveSpace()
				for _, d in debris do
					d.model:Destroy()
				end
				table.clear(debris)
			end
		end
	end)
end

return LaunchController
