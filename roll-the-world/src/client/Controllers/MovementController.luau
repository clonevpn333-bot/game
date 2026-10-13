--!nonstrict
-- Local ball physics: momentum-based rolling with snappy acceleration, strong turn-in, a coasting
-- brake, hop and dash. The client owns its ball, so input feels instant; the server validates.
--
-- We steer by setting the ball's horizontal velocity toward a force-limited target every physics
-- step and drive its spin to match true rolling, so stuck props visibly roll with the ball while
-- the motion stays tight and predictable at every size.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Growth = require(Shared.Logic.Growth)
local Tuning = require(Shared.Config.Tuning)
local Cores = require(Shared.Data.Cores)
local Animations = require(Shared.Config.Animations)

local MovementController = {}

MovementController.Hopped = Signal.new()
MovementController.Dashed = Signal.new()
MovementController.Landed = Signal.new() -- (impactSpeed)
MovementController.Bonked = Signal.new() -- (speed, hitPart, hitPosition, normal)
MovementController.grounded = false
MovementController.speed = 0
MovementController.velocity = Vector3.zero
MovementController.heading = Vector3.new(0, 0, -1)
MovementController.dashReadyAt = 0
MovementController.dashUntil = 0
MovementController.lastDash = -math.huge
MovementController.moveInput = Vector3.zero -- world-space desired direction (0..1)
MovementController.enabled = false

local controllers
local state, input, camera
local ball: BasePart? = nil
local riderAttachment: Attachment? = nil
local alignPos: AlignPosition? = nil
local alignOri: AlignOrientation? = nil
local animTracks = {}
local lastHop = -math.huge
local lastGroundedAt = 0
local airborneSince = 0
local wasGrounded = true
local prevHorizontal = Vector3.zero
local lastBonk = 0
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

function MovementController:init(c)
	controllers = c
end

local function speedMultiplier(): number
	local mult = 1
	local def = Cores.get(state.core)
	if def and def.speedMult then
		mult *= def.speedMult(state.coreLevel)
	end
	local event = state.round.event
	if event and event.speedMult then
		mult *= event.speedMult
	end
	if state.playerState == "Merged" then
		mult *= Tuning.Merge.SpeedPenalty
	end
	return mult
end

local function hopHeight(d: number): number
	local h = Growth.hopHeight(d)
	local def = Cores.get(state.core)
	if def and def.hopMult then
		h *= def.hopMult(state.coreLevel)
	end
	return h
end

function MovementController:dashCooldown(): number
	local def = Cores.get(state.core)
	local mult = if def and def.dashCooldownMult then def.dashCooldownMult(state.coreLevel) else 1
	return Tuning.Ball.DashCooldown * mult
end

function MovementController:dashProgress(): number
	local cd = self:dashCooldown()
	return math.clamp((os.clock() - self.lastDash) / cd, 0, 1)
end

local function refreshFilter()
	local list = {}
	local character = Players.LocalPlayer.Character
	if character then
		table.insert(list, character)
	end
	if state.ballModel then
		table.insert(list, state.ballModel)
	end
	local visuals = Workspace:FindFirstChild("BallVisuals")
	if visuals then
		table.insert(list, visuals)
	end
	rayParams.FilterDescendantsInstances = list
end

local function loadAnimations(character: Model)
	table.clear(animTracks)
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	if not animator then
		return
	end
	local rig = if humanoid.RigType == Enum.HumanoidRigType.R6 then "R6" else "R15"
	local ids = Animations[rig]
	for _, name in { "Run", "Idle", "Fall", "Cheer" } do
		local anim = Instance.new("Animation")
		anim.AnimationId = ids[name]
		local ok, track = pcall(function()
			return animator:LoadAnimation(anim)
		end)
		if ok and track then
			track.Priority = if name == "Cheer" then Enum.AnimationPriority.Action2 else Enum.AnimationPriority.Action
			track.Looped = name ~= "Cheer"
			animTracks[name] = track
		end
	end
end

-- The Roller: the avatar balances on top of the ball, running on it like a circus performer.
local function attachRider()
	local character = Players.LocalPlayer.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end
	if alignPos then
		alignPos:Destroy()
	end
	if alignOri then
		alignOri:Destroy()
	end
	if riderAttachment then
		riderAttachment:Destroy()
	end
	local att = Instance.new("Attachment")
	att.Name = "RollerAttachment"
	att.Parent = hrp
	local ap = Instance.new("AlignPosition")
	ap.Mode = Enum.PositionAlignmentMode.OneAttachment
	ap.Attachment0 = att
	ap.RigidityEnabled = true
	ap.Parent = hrp
	local ao = Instance.new("AlignOrientation")
	ao.Mode = Enum.OrientationAlignmentMode.OneAttachment
	ao.Attachment0 = att
	ao.RigidityEnabled = false
	ao.Responsiveness = 30
	ao.MaxTorque = math.huge
	ao.Parent = hrp
	riderAttachment, alignPos, alignOri = att, ap, ao
	loadAnimations(character)
end

local function detachRider()
	if alignPos then
		alignPos:Destroy()
		alignPos = nil
	end
	if alignOri then
		alignOri:Destroy()
		alignOri = nil
	end
	if riderAttachment then
		riderAttachment:Destroy()
		riderAttachment = nil
	end
	for _, track in animTracks do
		pcall(function()
			track:Stop(0.2)
		end)
	end
end

function MovementController:bind(part: BasePart?)
	ball = part
	self.enabled = part ~= nil
	if part then
		refreshFilter()
		attachRider()
		self.lastDash = -math.huge
		input:setRollingBindings(true)
	else
		detachRider()
		input:setRollingBindings(false)
	end
end

local function groundCheck(pos: Vector3, radius: number): (boolean, Vector3?)
	local result = Workspace:Raycast(pos, Vector3.new(0, -(radius + math.max(0.6, radius * 0.12)), 0), rayParams)
	if result then
		return true, result.Normal
	end
	return false, nil
end

-- Mobile auto-steer: bend the input a little toward absorbable stuff ahead.
local function autoSteer(dir: Vector3, d: number): Vector3
	if input.inputType ~= "Touch" or not controllers.SettingsController.values.autoSteer then
		return dir
	end
	local world = controllers.WorldController
	if not world or not ball then
		return dir
	end
	local target = world:steerTarget(ball.Position, dir, d)
	if not target then
		return dir
	end
	local to = Vector3.new(target.X - ball.Position.X, 0, target.Z - ball.Position.Z)
	if to.Magnitude < 0.1 then
		return dir
	end
	to = to.Unit
	local maxAngle = math.rad(Tuning.Ball.AutoSteerMaxAngle)
	local angle = math.acos(math.clamp(dir:Dot(to), -1, 1))
	if angle < 1e-3 then
		return dir
	end
	local t = math.min(1, maxAngle / angle) * 0.6
	local blended = dir:Lerp(to, t)
	return if blended.Magnitude > 1e-3 then blended.Unit * dir.Magnitude else dir
end

function MovementController:hop()
	if not ball or not self.enabled then
		return
	end
	local now = os.clock()
	if now - lastHop < Tuning.Ball.HopCooldown then
		return
	end
	-- Coyote time: allow hopping just after rolling off an edge.
	if not self.grounded and now - lastGroundedAt > 0.15 then
		return
	end
	lastHop = now
	local h = hopHeight(state.diameter)
	local vy = math.sqrt(2 * Workspace.Gravity * h)
	local v = ball.AssemblyLinearVelocity
	ball.AssemblyLinearVelocity = Vector3.new(v.X, math.max(v.Y, 0) + vy, v.Z)
	self.Hopped:Fire(h)
	Net.send("Action", "hop")
end

function MovementController:dash()
	if not ball or not self.enabled then
		return
	end
	local now = os.clock()
	if now - self.lastDash < self:dashCooldown() then
		return
	end
	self.lastDash = now
	self.dashUntil = now + Tuning.Ball.DashDuration
	local dir = if self.moveInput.Magnitude > 0.1 then self.moveInput.Unit else self.heading
	local maxSpeed = Growth.maxSpeed(state.diameter) * speedMultiplier()
	local v = ball.AssemblyLinearVelocity
	local horizontal = Vector3.new(v.X, 0, v.Z)
	-- Redirect momentum into the dash direction, then add the boost: dashes always go where you aim.
	local boosted = dir * math.max(horizontal.Magnitude, maxSpeed * 0.6) + dir * maxSpeed * Tuning.Ball.DashBoost
	ball.AssemblyLinearVelocity = Vector3.new(boosted.X, math.max(v.Y, 0) + 4, boosted.Z)
	self.Dashed:Fire(dir)
	Net.send("Action", "dash")
end

function MovementController:applyImpulse(dv: Vector3)
	if ball and ball.Parent then
		ball.AssemblyLinearVelocity += dv
	end
end

local function updateRider()
	if not ball or not alignPos or not alignOri then
		return
	end
	local character = Players.LocalPlayer.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local scale = if character then character:GetScale() else 1
	local hip = (if humanoid then humanoid.HipHeight else 2) + 1
	local r = ball.Size.X / 2
	alignPos.Position = ball.Position + Vector3.new(0, r + hip * 0.92, 0)
	local h = MovementController.heading
	alignOri.CFrame = CFrame.lookAt(Vector3.zero, Vector3.new(h.X, 0, h.Z))
	-- Animation: run on the ball proportionally to speed; idle balance when still; flail in the air.
	local run, idle, fall = animTracks.Run, animTracks.Idle, animTracks.Fall
	local speedFrac = MovementController.speed / math.max(Growth.maxSpeed(state.diameter), 1)
	if not MovementController.grounded and fall then
		if not fall.IsPlaying then
			fall:Play(0.15)
		end
		if run and run.IsPlaying then
			run:Stop(0.15)
		end
	elseif speedFrac > 0.08 and run then
		if fall and fall.IsPlaying then
			fall:Stop(0.15)
		end
		if not run.IsPlaying then
			run:Play(0.2)
		end
		if idle and idle.IsPlaying then
			idle:Stop(0.2)
		end
		run:AdjustSpeed(math.clamp(0.6 + speedFrac * 1.6, 0.6, 2.4) / math.sqrt(math.max(scale, 0.3)))
	elseif idle then
		if fall and fall.IsPlaying then
			fall:Stop(0.15)
		end
		if run and run.IsPlaying then
			run:Stop(0.25)
		end
		if not idle.IsPlaying then
			idle:Play(0.25)
		end
	end
end

local function step(dt: number)
	if not ball or not ball.Parent or not MovementController.enabled then
		return
	end
	if ball.Anchored then
		return
	end
	local self = MovementController
	local d = state.diameter
	local r = ball.Size.X / 2
	local pos = ball.Position
	local now = os.clock()

	-- Input -> world direction using the camera's yaw (camera-relative controls).
	local raw = input:getMoveVector()
	local yaw = camera and camera.yaw or 0
	local forward = Vector3.new(-math.sin(yaw), 0, -math.cos(yaw))
	local right = Vector3.new(math.cos(yaw), 0, -math.sin(yaw))
	local desired = right * raw.X - forward * raw.Z
	if desired.Magnitude > 1 then
		desired = desired.Unit
	end
	if desired.Magnitude > 0.05 then
		desired = autoSteer(desired, d)
	end
	self.moveInput = desired

	local grounded = groundCheck(pos, r)
	if grounded then
		lastGroundedAt = now
	end
	if grounded and not wasGrounded and now - airborneSince > 0.15 then
		self.Landed:Fire(math.abs(prevHorizontal.Y))
	end
	if not grounded and wasGrounded then
		airborneSince = now
	end
	wasGrounded = grounded
	self.grounded = grounded

	local maxSpeed = Growth.maxSpeed(d) * speedMultiplier()
	local v = ball.AssemblyLinearVelocity
	local horizontal = Vector3.new(v.X, 0, v.Z)
	local dashing = now < self.dashUntil
	local cap = if dashing then maxSpeed * (1 + Tuning.Ball.DashBoost) else maxSpeed

	local accel = maxSpeed / Growth.accelTime(d)
	if not grounded then
		accel *= Tuning.Ball.AirControl
	end

	local newHorizontal
	if desired.Magnitude > 0.05 then
		local target = desired * cap * math.clamp(desired.Magnitude, 0, 1)
		local diff = target - horizontal
		local rate = accel
		-- Turn-in: steering against current motion gets extra grip so turns feel crisp, not floaty.
		if horizontal.Magnitude > 1 and horizontal.Unit:Dot(desired.Unit) < 0.6 then
			rate *= Tuning.Ball.TurnAssist
		end
		if dashing and horizontal.Magnitude > target.Magnitude then
			-- Don't eat dash momentum; let it bleed off naturally.
			diff = desired.Unit * math.max(0, target.Magnitude - horizontal:Dot(desired.Unit)) + (horizontal - desired.Unit * horizontal:Dot(desired.Unit)) * -0.5
		end
		local maxStep = rate * dt
		if diff.Magnitude > maxStep then
			diff = diff.Unit * maxStep
		end
		newHorizontal = horizontal + diff
	else
		-- Coast: exponential brake (a heavy ball rolls a little longer than a pea).
		local brake = if grounded then dt / Growth.brakeTime(d) else dt * 0.2
		newHorizontal = horizontal * math.max(0, 1 - brake * 2.2)
	end
	-- Speed cap with a soft ceiling (momentum from slopes/bumps decays instead of snapping).
	local mag = newHorizontal.Magnitude
	if mag > cap then
		newHorizontal = newHorizontal.Unit * math.max(cap, mag - accel * 1.5 * dt)
	end

	-- Bonk detection: a sudden loss of speed while pushing into something.
	local prevSpeed = prevHorizontal.Magnitude
	if prevSpeed > maxSpeed * 0.35 and horizontal.Magnitude < prevSpeed * 0.45 and now - lastBonk > 0.35 then
		local dir = Vector3.new(prevHorizontal.X, 0, prevHorizontal.Z).Unit
		local hit = Workspace:Raycast(pos, dir * (r + math.max(2, r * 0.6)), rayParams)
		if hit then
			lastBonk = now
			-- Bounce back a little: it teaches "too big!" without words.
			local bounce = -dir * prevSpeed * 0.35
			newHorizontal = newHorizontal + bounce
			self.Bonked:Fire(prevSpeed, hit.Instance, hit.Position, hit.Normal)
			if prevSpeed >= maxSpeed * Tuning.Absorb.BonkMinSpeed then
				Net.send("Action", "bonk", prevSpeed)
			end
		end
	end

	local vy = v.Y
	ball.AssemblyLinearVelocity = Vector3.new(newHorizontal.X, vy, newHorizontal.Z)
	-- Spin to match rolling without slipping (visual + keeps stuck props rolling believably).
	if grounded then
		local spin = Vector3.yAxis:Cross(newHorizontal) / math.max(r, 0.1)
		ball.AssemblyAngularVelocity = ball.AssemblyAngularVelocity:Lerp(spin, math.min(1, dt * 12))
	end

	prevHorizontal = Vector3.new(newHorizontal.X, vy, newHorizontal.Z)
	self.velocity = ball.AssemblyLinearVelocity
	self.speed = newHorizontal.Magnitude
	if self.speed > maxSpeed * 0.12 then
		self.heading = self.heading:Lerp(newHorizontal.Unit, math.min(1, dt * 10))
		if self.heading.Magnitude > 1e-3 then
			self.heading = self.heading.Unit
		end
	elseif desired.Magnitude > 0.2 then
		self.heading = self.heading:Lerp(desired.Unit, math.min(1, dt * 6)).Unit
	end
end

function MovementController:start()
	state = controllers.ClientState
	input = controllers.InputController
	camera = controllers.CameraController
	state.BallChanged:Connect(function(part)
		self:bind(part)
	end)
	if state.ball then
		self:bind(state.ball)
	end
	input.ActionPressed:Connect(function(action)
		if action == "Hop" then
			self:hop()
		elseif action == "Dash" then
			self:dash()
		end
	end)
	Net.connect("Impulse", function(dv: Vector3)
		if typeof(dv) == "Vector3" then
			self:applyImpulse(dv)
		end
	end)
	Players.LocalPlayer.CharacterAdded:Connect(function()
		task.wait(0.2)
		if ball then
			refreshFilter()
			attachRider()
		end
	end)
	RunService.PreSimulation:Connect(step)
	RunService.RenderStepped:Connect(updateRider)
	state.DiameterChanged:Connect(function()
		refreshFilter()
	end)
end

return MovementController
