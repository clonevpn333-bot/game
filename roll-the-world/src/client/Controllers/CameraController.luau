--!nonstrict
-- Chase camera that grows with the ball. Auto-follows the direction of travel (no right-click
-- needed), pulls back and rises smoothly as the ball grows, avoids clipping into geometry, leans
-- toward nearby threats, and adds trauma-based shake for big moments (respects reduced motion).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Tuning = require(Shared.Config.Tuning)
local Growth = require(Shared.Logic.Growth)
local Spring = require(Shared.Util.Spring)
local MathUtil = require(Shared.Util.MathUtil)

local CameraController = {}

CameraController.yaw = 0
CameraController.pitch = math.rad(-18)
CameraController.zoom = 1
CameraController.mode = "Default" -- Default | Chase | Launch | Podium | Scripted
CameraController.trauma = 0

local controllers
local state, input, movement, settings
local cam: Camera = Workspace.CurrentCamera
local focus = Vector3.zero
local distSpring = Spring.new(12, 60, 14)
local heightSpring = Spring.new(5, 60, 14)
local fovSpring = Spring.new(70, 120, 16)
local manualUntil = 0
local lastCamPos = nil
local scripted: ((dt: number) -> CFrame?)? = nil
local occlusionParams = RaycastParams.new()
occlusionParams.FilterType = Enum.RaycastFilterType.Exclude
local fovKick = 0
-- Spawn swoop: blend from a high establishing shot down into the chase camera.
local blendFrom: CFrame? = nil
local blendStart = 0
local BLEND_TIME = 1.25
local revealAngle = 0

function CameraController:init(c)
	controllers = c
end

-- Add screen shake (0..1). Reduced motion turns it way down.
function CameraController:shake(amount: number)
	local mult = if settings.values.reducedMotion then 0.15 else settings.values.shake
	self.trauma = math.min(1, self.trauma + amount * mult)
end

function CameraController:kickFov(amount: number)
	if not settings.values.reducedMotion then
		fovKick = math.max(fovKick, amount)
	end
end

-- Hand the camera to a scripted sequence (launch, podium). Return nil from fn to release.
function CameraController:playScripted(fn: (dt: number) -> CFrame?)
	scripted = fn
	self.mode = "Scripted"
end

local function refreshFilter()
	local list = {}
	for _, p in Players:GetPlayers() do
		if p.Character then
			table.insert(list, p.Character)
		end
	end
	local balls = Workspace:FindFirstChild("Balls")
	if balls then
		table.insert(list, balls)
	end
	local visuals = Workspace:FindFirstChild("BallVisuals")
	if visuals then
		table.insert(list, visuals)
	end
	local props = Workspace:FindFirstChild("ClientProps")
	if props then
		-- Props never block the view; walls and counters do.
		table.insert(list, props)
	end
	occlusionParams.FilterDescendantsInstances = list
end

local function desiredDistance(d: number): number
	local c = Tuning.Camera
	-- Slightly sub-linear so huge balls still fill a satisfying chunk of the screen.
	return (c.BaseDistance + d * c.DistancePerDiameter * (1 - 0.12 * Growth.sizeAlpha(d))) * CameraController.zoom
end

local function desiredHeight(d: number): number
	local c = Tuning.Camera
	return (c.BaseHeight + d * c.HeightPerDiameter) * CameraController.zoom
end

local function chase(self, dt: number)
	local ball = state:focusBall()
	if not ball then
		return
	end
	local riding = ball ~= state.ball
	local c = Tuning.Camera
	local d = if riding then (ball:GetAttribute("Diameter") or ball.Size.X) else state.diameter
	local now = os.clock()
	local sens = settings.values.cameraSensitivity
	-- Riders watch the host ball's motion; rollers use their own (smoothed) movement.
	local velocity = if riding then ball.AssemblyLinearVelocity else movement.velocity
	local flatVel = Vector3.new(velocity.X, 0, velocity.Z)
	local speed = if riding then flatVel.Magnitude else movement.speed
	local heading = if riding then (if flatVel.Magnitude > 1 then flatVel.Unit else Vector3.new(0, 0, -1)) else movement.heading

	-- Manual orbit input.
	local orbit = input:takeOrbit()
	if orbit.Magnitude > 0 then
		self.yaw -= orbit.X * c.DragSensitivity * sens
		self.pitch = math.clamp(self.pitch - orbit.Y * c.DragSensitivity * sens * 0.6, math.rad(-55), math.rad(-5))
		manualUntil = now + c.AutoRecenterDelay
	end
	if input.keyOrbit ~= 0 then
		self.yaw -= input.keyOrbit * c.KeyOrbitSpeed * sens * dt
		manualUntil = now + c.AutoRecenterDelay
	end
	if input.keyPitch ~= 0 then
		self.pitch = math.clamp(self.pitch + input.keyPitch * 1.4 * dt, math.rad(-55), math.rad(-5))
	end
	if input.orbitHeld then
		manualUntil = now + c.AutoRecenterDelay
	end

	-- Auto-follow: swing behind the direction of travel, faster the faster we go.
	local maxSpeed = Growth.maxSpeed(d)
	local speedFrac = math.clamp(speed / math.max(maxSpeed, 1), 0, 1.6)
	if now > manualUntil and speedFrac > 0.15 then
		local h = heading
		local targetYaw = math.atan2(-h.X, -h.Z)
		local delta = MathUtil.angleDelta(self.yaw, targetYaw)
		-- Don't whip around when reversing briefly: follow lazily for large angle changes.
		local sharp = c.YawSharpness * math.clamp(speedFrac, 0.3, 1.2) * (if math.abs(delta) > 2.4 then 0.35 else 1)
		self.yaw += delta * MathUtil.damp(sharp, dt)
		-- Ease pitch back to the default.
		self.pitch += (math.rad(-18) - self.pitch) * MathUtil.damp(0.8, dt)
	end

	distSpring.target = desiredDistance(d)
	heightSpring.target = desiredHeight(d)
	local dist = distSpring:step(dt)
	local height = heightSpring:step(dt)

	-- Smooth focus point slightly above the ball centre; lead a little in the direction of travel.
	local lead = flatVel * 0.08
	local target = ball.Position + Vector3.new(0, d * 0.32, 0) + lead
	focus = focus:Lerp(target, MathUtil.damp(c.FollowSharpness * 2.2, dt))
	if (focus - target).Magnitude > d * 6 + 60 then
		focus = target
	end

	local rot = CFrame.Angles(0, self.yaw, 0) * CFrame.Angles(self.pitch, 0, 0)
	local offset = rot:VectorToWorldSpace(Vector3.new(0, 0, dist)) + Vector3.new(0, height * 0.55, 0)
	local desiredPos = focus + offset

	-- Occlusion: pull the camera in front of walls/counters between it and the ball.
	local toCam = desiredPos - focus
	local hit = Workspace:Raycast(focus, toCam, occlusionParams)
	if hit then
		desiredPos = hit.Position - toCam.Unit * 1.5
	end
	-- Never dip below the floor.
	if desiredPos.Y < focus.Y - d * 0.2 then
		desiredPos = Vector3.new(desiredPos.X, focus.Y - d * 0.2, desiredPos.Z)
	end

	local camPos = desiredPos
	if lastCamPos and (lastCamPos - camPos).Magnitude < d * 10 + 80 then
		camPos = lastCamPos:Lerp(camPos, MathUtil.damp(18, dt))
	end
	lastCamPos = camPos

	-- Lean slightly toward the nearest threat (a ball big enough to roll us up).
	local lookAt = focus
	local threat = controllers.BallVisualController and controllers.BallVisualController:nearestThreat()
	if threat then
		lookAt = lookAt:Lerp(threat, 0.12)
	end

	local cf = CFrame.lookAt(camPos, lookAt)

	-- Shake.
	if self.trauma > 0 then
		local t = os.clock() * 28
		local s = self.trauma * self.trauma * c.ShakeMax
		local angle = CFrame.Angles(math.noise(t, 1) * s * 0.03, math.noise(t, 2) * s * 0.03, math.noise(t, 3) * s * 0.02)
		cf = cf * angle + Vector3.new(math.noise(t, 4), math.noise(t, 5), math.noise(t, 6)) * s * (0.4 + d * 0.01)
		self.trauma = math.max(0, self.trauma - dt * 1.6)
	end

	-- FOV opens up with speed; dashes kick it.
	fovSpring.target = c.FovBase + c.FovSpeedBonus * math.clamp(speedFrac, 0, 1.4) ^ 1.5 + fovKick
	fovKick = math.max(0, fovKick - dt * 30)
	cam.FieldOfView = fovSpring:step(dt)
	if blendFrom then
		local t = math.clamp((os.clock() - blendStart) / BLEND_TIME, 0, 1)
		-- Ease in-out cubic: hang on the skyline for a beat, then dive to the ball.
		local e = if t < 0.5 then 4 * t * t * t else 1 - (-2 * t + 2) ^ 3 / 2
		cf = blendFrom:Lerp(cf, e)
		if t >= 1 then
			blendFrom = nil
		end
	end
	cam.CFrame = cf
	cam.Focus = CFrame.new(focus)
end

-- A high shot that frames the ball against the map's giant stuff (landmark, furniture).
local function establishingShot(ballPos: Vector3): CFrame
	local world = controllers.WorldController
	local landmark = world and world.props[world.landmarkId]
	local target = if landmark then Vector3.new(landmark.x, landmark.cy, landmark.z) else ballPos + Vector3.new(0, 0, -200)
	local half = (world and world.arenaHalf) or 600
	local away = Vector3.new(ballPos.X - target.X, 0, ballPos.Z - target.Z)
	away = if away.Magnitude > 1 then away.Unit else Vector3.new(0, 0, 1)
	local pos = ballPos + away * half * 0.35 + Vector3.new(0, half * 0.38, 0)
	return CFrame.lookAt(pos, ballPos:Lerp(target, 0.45))
end

-- Slow cinematic orbit over the arena while the world around spawn finishes building.
local function reveal(dt: number)
	local world = controllers.WorldController
	local center = world and world.spawnCenter
	if not center then
		return
	end
	local half = world.arenaHalf or 600
	revealAngle += dt * 0.12
	local c = Vector3.new(center[1], center[2], center[3])
	local pos = c + Vector3.new(math.cos(revealAngle) * half * 0.75, half * 0.42, math.sin(revealAngle) * half * 0.75)
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 60
	cam.CFrame = CFrame.lookAt(pos, c)
end

function CameraController:setMode(mode: string)
	local previous = self.mode
	self.mode = mode
	if mode == "Chase" then
		cam.CameraType = Enum.CameraType.Scriptable
		lastCamPos = nil
		local ball = state:focusBall()
		if ball then
			focus = ball.Position
			local riding = ball ~= state.ball
			local d = if riding then (ball:GetAttribute("Diameter") or ball.Size.X) else state.diameter
			distSpring:snap(desiredDistance(d))
			heightSpring:snap(desiredHeight(d))
			if riding then
				-- Rolled up: a quick blend from where we were, no establishing swoop.
				blendFrom = cam.CFrame
			else
				-- Every spawn starts with the swoop (from the reveal orbit if we were showing it).
				blendFrom = if previous == "Reveal" then cam.CFrame else establishingShot(ball.Position)
			end
			blendStart = os.clock()
		end
		refreshFilter()
	elseif mode == "Default" then
		scripted = nil
		cam.CameraType = Enum.CameraType.Custom
		cam.FieldOfView = 70
		local character = Players.LocalPlayer.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			cam.CameraSubject = humanoid
		end
	end
end

function CameraController:start()
	state = controllers.ClientState
	input = controllers.InputController
	movement = controllers.MovementController
	settings = controllers.SettingsController
	input.ZoomChanged:Connect(function(delta)
		local c = Tuning.Camera
		self.zoom = math.clamp(self.zoom + delta * 0.08, c.ZoomMin, c.ZoomMax)
	end)
	controllers.WorldController.WorldLoaded:Connect(function()
		if not state:isRolling() and state.round.state == "Playing" then
			self.mode = "Reveal"
		end
	end)
	state.BallChanged:Connect(function(part)
		if part then
			-- Face the landmark (the big goal) so the first view is "everything I'll eat".
			local world = controllers.WorldController
			local landmark = world and world.props[world.landmarkId]
			if landmark then
				local to = Vector3.new(landmark.x - part.Position.X, 0, landmark.z - part.Position.Z)
				self.yaw = math.atan2(-to.X, -to.Z)
			else
				self.yaw = math.atan2(part.Position.X, part.Position.Z)
			end
			self:setMode("Chase")
		elseif self.mode == "Chase" and state.playerState ~= "Rider" then
			self:setMode("Default")
		end
	end)
	-- Rolled up: keep chasing, now following the ball we're stuck to.
	state.PlayerStateChanged:Connect(function(newState)
		if newState == "Rider" then
			self:shake(0.6)
			self:setMode("Chase")
		end
	end)
	state.DiameterChanged:Connect(function(new, old)
		-- Big jumps (rolling up a player) get a dramatic pull-back.
		if new > old * 1.15 then
			distSpring:impulse((new - old) * 4)
			self:shake(0.35)
		end
	end)
	movement.Dashed:Connect(function()
		self:kickFov(9)
		self:shake(0.12)
	end)
	movement.Bonked:Connect(function(speed)
		self:shake(math.clamp(speed / math.max(Growth.maxSpeed(state.diameter), 1) * 0.45, 0.1, 0.6))
	end)
	movement.Landed:Connect(function(impact)
		if impact > 40 then
			self:shake(math.clamp(impact / 200, 0.05, 0.3))
		end
	end)
	task.spawn(function()
		while true do
			task.wait(3)
			if self.mode == "Chase" then
				refreshFilter()
			end
		end
	end)
	RunService:BindToRenderStep("RTW_Camera", Enum.RenderPriority.Camera.Value + 1, function(dt)
		-- Waiting to drop into a running round: show the map. Otherwise hand back the default camera.
		local world = controllers.WorldController
		local waiting = not state:isRolling() and state.round.state == "Playing" and world and world.ready
		if waiting and self.mode == "Default" then
			self.mode = "Reveal"
		elseif not waiting and self.mode == "Reveal" then
			self:setMode("Default")
		end
		if self.mode == "Chase" then
			chase(self, dt)
		elseif self.mode == "Reveal" then
			reveal(dt)
		elseif self.mode == "Scripted" and scripted then
			local cf = scripted(dt)
			if cf then
				cam.CameraType = Enum.CameraType.Scriptable
				cam.CFrame = cf
			else
				scripted = nil
				self:setMode(if state:isRolling() then "Chase" else "Default")
			end
		end
	end)
end

return CameraController
