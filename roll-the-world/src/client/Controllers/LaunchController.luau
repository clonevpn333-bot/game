--!nonstrict
-- The end-of-round LAUNCH spectacle. The server anchors every ball and sends the list; each client
-- flies all the balls into the sky locally (rocket curve, spin, flame trails), rides the camera
-- up with its own ball, then pops every ball into a "planet" burst high above the map.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)

local LaunchController = {}
LaunchController.Launched = Signal.new()
LaunchController.Planeted = Signal.new() -- (userId, position)

local controllers
local flights = {}
local active = false

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"

function LaunchController:init(c)
	controllers = c
end

local function addRocket(shell: BasePart, diameter: number): { Instance }
	local made = {}
	local bottom = Instance.new("Attachment")
	bottom.Position = Vector3.new(0, -diameter * 0.45, 0)
	bottom.Parent = shell
	table.insert(made, bottom)
	local fire = Instance.new("ParticleEmitter")
	fire.Texture = FIRE
	fire.Color = ColorSequence.new(Color3.fromRGB(255, 240, 160), Color3.fromRGB(255, 110, 60))
	fire.LightEmission = 1
	fire.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.45), NumberSequenceKeypoint.new(1, 0) })
	fire.Lifetime = NumberRange.new(0.25, 0.45)
	fire.Rate = 60
	fire.Speed = NumberRange.new(diameter * 1.5, diameter * 2.5)
	fire.EmissionDirection = Enum.NormalId.Bottom
	fire.SpreadAngle = Vector2.new(18, 18)
	fire.Parent = bottom
	local smoke = Instance.new("ParticleEmitter")
	smoke.Texture = SMOKE
	smoke.Color = ColorSequence.new(Color3.fromRGB(255, 250, 240))
	smoke.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(1, 1) })
	smoke.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.4), NumberSequenceKeypoint.new(1, diameter * 1.2) })
	smoke.Lifetime = NumberRange.new(1, 1.6)
	smoke.Rate = 25
	smoke.Speed = NumberRange.new(diameter * 0.3, diameter * 0.6)
	smoke.EmissionDirection = Enum.NormalId.Bottom
	smoke.Parent = bottom
	local top = Instance.new("Attachment")
	top.Position = Vector3.new(diameter * 0.3, 0, 0)
	top.Parent = shell
	local low = Instance.new("Attachment")
	low.Position = Vector3.new(-diameter * 0.3, 0, 0)
	low.Parent = shell
	local trail = Instance.new("Trail")
	trail.Attachment0 = top
	trail.Attachment1 = low
	trail.Lifetime = 0.9
	trail.LightEmission = 0.8
	trail.FaceCamera = true
	trail.Color = ColorSequence.new(Color3.fromRGB(255, 236, 140), Color3.fromRGB(255, 120, 196))
	trail.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) })
	trail.Parent = shell
	table.insert(made, top)
	table.insert(made, low)
	table.insert(made, trail)
	return made
end

local function planetBurst(pos: Vector3, diameter: number, color: Color3)
	local anchor = Instance.new("Part")
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.CanTouch = false
	anchor.Transparency = 1
	anchor.Size = Vector3.one
	anchor.CFrame = CFrame.new(pos)
	anchor.Parent = Workspace
	local burst = Instance.new("ParticleEmitter")
	burst.Texture = SPARKLE
	burst.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
	burst.LightEmission = 1
	burst.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, diameter * 0.5), NumberSequenceKeypoint.new(1, 0) })
	burst.Lifetime = NumberRange.new(0.8, 1.4)
	burst.Speed = NumberRange.new(diameter * 2, diameter * 5)
	burst.SpreadAngle = Vector2.new(180, 180)
	burst.Drag = 2
	burst.Parent = anchor
	burst:Emit(60)
	local ring = Instance.new("Part")
	ring.Shape = Enum.PartType.Cylinder
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanQuery = false
	ring.Material = Enum.Material.Neon
	ring.Color = color
	ring.Size = Vector3.new(0.3, diameter, diameter)
	ring.CFrame = CFrame.new(pos) * CFrame.Angles(0.3, 0, math.pi / 2)
	ring.Parent = Workspace
	game:GetService("TweenService"):Create(ring, TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.1, diameter * 5, diameter * 5),
		Transparency = 1,
	}):Play()
	task.delay(2, function()
		anchor:Destroy()
		ring:Destroy()
	end)
end

local function onLaunch(list, endsAt)
	local state = controllers.ClientState
	local balls = controllers.BallVisualController
	local now = os.clock()
	local duration = math.max(2.5, endsAt - Workspace:GetServerTimeNow() - 1.5)
	table.clear(flights)
	active = true
	local myFlight = nil
	for i, entry in list do
		local model = entry.ball
		local part = model and model:FindFirstChild("Ball")
		if part then
			local d = entry.diameter
			local visual = balls and balls.balls[entry.userId]
			local made = if visual then addRocket(visual.shell, d) else {}
			local f = {
				userId = entry.userId,
				part = part,
				start = part.CFrame,
				diameter = d,
				t0 = now + (i % 5) * 0.12, -- slight stagger so it reads as a volley
				dur = duration,
				height = 900 + d * 6 + (i % 3) * 120,
				drift = Vector3.new(math.random() * 2 - 1, 0, math.random() * 2 - 1) * (40 + d),
				made = made,
				color = if visual then visual.color else Color3.new(1, 1, 1),
				popped = false,
			}
			table.insert(flights, f)
			if entry.userId == state.player.UserId then
				myFlight = f
			end
		end
	end
	if controllers.AudioController then
		controllers.AudioController:play("Launch")
	end
	if controllers.HudController then
		controllers.HudController:showBanner("🚀 LAUNCH! 🚀", nil, 1.8)
		task.delay(1.9, function()
			controllers.HudController:showBanner("🪐 Your ball is becoming a planet!", nil, 2.4)
		end)
	end
	LaunchController.Launched:Fire(myFlight ~= nil)

	-- Camera: ride up behind our own ball, then pull back to watch the sky light up.
	local camera = controllers.CameraController
	local cam = Workspace.CurrentCamera
	local startCF = cam.CFrame
	local focusFlight = myFlight or flights[1]
	if camera and focusFlight then
		local t0 = os.clock()
		camera:playScripted(function()
			local t = os.clock() - t0
			if t > duration + 1.4 or not active then
				return nil
			end
			local p = focusFlight.part.Position
			local d = focusFlight.diameter
			local alpha = math.clamp(t / duration, 0, 1)
			local behind = Vector3.new(0, d * 0.6 + 6, d * 2.6 + 12)
			local closeCF = CFrame.lookAt(p + behind + Vector3.new(0, -d * alpha * 2, 0), p + Vector3.new(0, d * 2, 0))
			local wide = CFrame.lookAt(focusFlight.start.Position + Vector3.new(0, 120 + d * 2, 420 + d * 6), p)
			local target = if alpha < 0.55 then closeCF else closeCF:Lerp(wide, math.clamp((alpha - 0.55) / 0.45, 0, 1))
			if t < 0.4 then
				target = startCF:Lerp(target, t / 0.4)
			end
			return target
		end)
	end
end

local function update()
	if not active then
		return
	end
	local now = os.clock()
	local anyFlying = false
	for _, f in flights do
		local t = math.clamp((now - f.t0) / f.dur, 0, 1)
		if f.part.Parent and not f.popped then
			anyFlying = true
			-- Slow wind-up, then a rocket ease-in curve; a little wobble and drift.
			local rise = t * t * t * f.height + math.sin(t * math.pi) * f.diameter * 0.3
			local wobble = math.sin(now * 14 + f.userId) * f.diameter * 0.04 * (1 - t)
			local pos = f.start.Position + Vector3.new(wobble, rise, 0) + f.drift * t * t
			f.part.CFrame = CFrame.new(pos) * CFrame.Angles(0, t * 12, t * 2)
			if t >= 1 then
				f.popped = true
				planetBurst(pos, f.diameter, f.color)
				LaunchController.Planeted:Fire(f.userId, pos)
				for _, inst in f.made do
					inst:Destroy()
				end
				local model = f.part.Parent
				if model then
					for _, d in model:GetDescendants() do
						if d:IsA("BasePart") then
							d.Transparency = 1
						end
					end
				end
				local balls = controllers.BallVisualController
				local visual = balls and balls.balls[f.userId]
				if visual then
					visual.folder.Parent = nil
				end
			end
		end
	end
	if not anyFlying then
		active = false
	end
end

function LaunchController:start()
	Net.connect("LaunchSequence", onLaunch)
	RunService.RenderStepped:Connect(update)
	controllers.ClientState.RoundChanged:Connect(function(round)
		if round.state ~= "Launch" then
			active = false
		end
	end)
end

return LaunchController
