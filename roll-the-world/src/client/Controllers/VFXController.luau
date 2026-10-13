--!nonstrict
-- Visual effects with pooled emitters (mobile friendly): absorb pops colored like the prop,
-- rarity sparkles, bonk stars + shockwave rings, landing dust, dash trails, glints on rare props,
-- wordless emoji reactions. Counts scale with the graphics quality setting.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Growth = require(Shared.Logic.Growth)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Rarity = require(Shared.Config.Rarity)
local Mutations = require(Shared.Data.Mutations)

local VFXController = {}

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"

local controllers
local state, settings
local folder: Folder
local emitterPool = {}
local trail: Trail? = nil
local trailAttachments = {}

function VFXController:init(c)
	controllers = c
end

local function quality(): number
	return if settings then settings:qualityFactor() else 1
end

local function getEmitter(): (Part, ParticleEmitter)
	for _, e in emitterPool do
		if not e.busy then
			e.busy = true
			task.delay(2.5, function()
				e.busy = false
			end)
			return e.part, e.emitter
		end
	end
	local part = Instance.new("Part")
	part.Name = "Emitter"
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.Transparency = 1
	part.Size = Vector3.one * 0.2
	part.Parent = folder
	local emitter = Instance.new("ParticleEmitter")
	emitter.Enabled = false
	emitter.Parent = part
	local e = { part = part, emitter = emitter, busy = true }
	table.insert(emitterPool, e)
	task.delay(2.5, function()
		e.busy = false
	end)
	return part, emitter
end

local function burst(pos: Vector3, opts)
	local part, emitter = getEmitter()
	part.CFrame = CFrame.new(pos)
	emitter.Texture = opts.texture or SPARKLE
	emitter.Color = ColorSequence.new(opts.color or Color3.new(1, 1, 1), opts.color2 or opts.color or Color3.new(1, 1, 1))
	emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, opts.size or 1), NumberSequenceKeypoint.new(1, 0) })
	emitter.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, opts.alpha or 0), NumberSequenceKeypoint.new(1, 1) })
	emitter.Lifetime = NumberRange.new(opts.life or 0.35, (opts.life or 0.35) * 1.6)
	emitter.Speed = NumberRange.new((opts.speed or 10) * 0.5, opts.speed or 10)
	emitter.SpreadAngle = Vector2.new(180, 180)
	emitter.Drag = opts.drag or 4
	emitter.Acceleration = opts.accel or Vector3.zero
	emitter.LightEmission = opts.light or 0.6
	emitter.Rotation = NumberRange.new(0, 360)
	emitter.RotSpeed = NumberRange.new(-180, 180)
	emitter:Emit(math.max(1, math.floor((opts.count or 8) * quality())))
end

-- Absorb pop at a contact point, tinted with the prop's main color.
function VFXController:pop(pos: Vector3, color: Color3, size: number, rarityOrder: number?)
	burst(pos, { color = color, color2 = Color3.new(1, 1, 1), size = math.clamp(size * 0.35, 0.3, 14), speed = math.clamp(size * 2.5, 6, 120), count = 7, life = 0.3 })
	if rarityOrder and rarityOrder >= 3 then
		burst(pos, { color = color, color2 = Color3.fromRGB(255, 255, 255), size = math.clamp(size * 0.5, 0.6, 18), speed = math.clamp(size * 4, 10, 160), count = 10 + rarityOrder * 3, life = 0.6, light = 1 })
	end
end

function VFXController:sparkle(pos: Vector3, color: Color3, size: number, count: number?)
	burst(pos, { color = color, color2 = Color3.new(1, 1, 1), size = size, speed = size * 6, count = count or 18, life = 0.8, light = 1, drag = 3 })
end

function VFXController:poof(pos: Vector3, size: number, color: Color3?)
	burst(pos, { texture = SMOKE, color = color or Color3.fromRGB(255, 250, 240), size = math.clamp(size * 0.8, 0.6, 40), speed = math.clamp(size * 1.5, 3, 60), count = 6, life = 0.5, light = 0.2, alpha = 0.3 })
end

function VFXController:dust(pos: Vector3, size: number)
	burst(pos, { texture = SMOKE, color = Color3.fromRGB(255, 244, 228), size = math.clamp(size * 0.6, 0.4, 50), speed = math.clamp(size * 1.2, 2, 80), count = 5, life = 0.6, light = 0.1, alpha = 0.45, accel = Vector3.new(0, size * 0.5, 0) })
end

-- Expanding neon ring on the ground (bonks, bumps, landings of big balls).
function VFXController:shockwave(pos: Vector3, radius: number, color: Color3?)
	if quality() < 0.6 and radius < 8 then
		return
	end
	local ring = Instance.new("Part")
	ring.Shape = Enum.PartType.Cylinder
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanQuery = false
	ring.CanTouch = false
	ring.Material = Enum.Material.Neon
	ring.Color = color or Color3.fromRGB(255, 240, 200)
	ring.Transparency = 0.2
	ring.Size = Vector3.new(0.2, radius * 0.3, radius * 0.3)
	ring.CFrame = CFrame.new(pos) * CFrame.Angles(0, 0, math.pi / 2)
	ring.Parent = folder
	local tween = TweenService:Create(ring, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.1, radius * 2, radius * 2),
		Transparency = 1,
	})
	tween:Play()
	tween.Completed:Once(function()
		ring:Destroy()
	end)
end

-- Little floating emoji reaction (critters fleeing, giggling when rolled up, stickers).
function VFXController:emoji(pos: Vector3, text: string, duration: number?)
	local anchor = Instance.new("Part")
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.CanTouch = false
	anchor.Transparency = 1
	anchor.Size = Vector3.one * 0.2
	anchor.CFrame = CFrame.new(pos)
	anchor.Parent = folder
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(48, 48)
	gui.AlwaysOnTop = true
	gui.LightInfluence = 0
	gui.MaxDistance = 250
	gui.Adornee = anchor
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Text = text
	label.TextScaled = true
	label.Parent = gui
	gui.Parent = anchor
	local d = duration or 1
	TweenService:Create(gui, TweenInfo.new(d, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { StudsOffsetWorldSpace = Vector3.new(0, 4, 0) }):Play()
	TweenService:Create(label, TweenInfo.new(d * 0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, d * 0.6), { TextTransparency = 1 }):Play()
	task.delay(d + 0.1, function()
		anchor:Destroy()
	end)
end

-- Persistent soft glint on rare / mutated props so they read as treasure from a distance.
function VFXController:attachGlint(part: BasePart, color: Color3, strong: boolean)
	if quality() < 0.55 and not strong then
		return
	end
	local att = Instance.new("Attachment")
	att.Parent = part
	local e = Instance.new("ParticleEmitter")
	e.Texture = SPARKLE
	e.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
	e.LightEmission = 1
	local s = math.clamp(part.Size.Magnitude * 0.25, 0.4, 8)
	e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(0.4, s), NumberSequenceKeypoint.new(1, 0) })
	e.Lifetime = NumberRange.new(0.6, 1.1)
	e.Rate = if strong then 6 else 2.5
	e.Speed = NumberRange.new(0.2, 1)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Rotation = NumberRange.new(0, 360)
	e.RotSpeed = NumberRange.new(-90, 90)
	e.Parent = att
	e:Emit(1)
end

local function setupTrail()
	if trail then
		trail:Destroy()
		trail = nil
	end
	for _, a in trailAttachments do
		a:Destroy()
	end
	table.clear(trailAttachments)
	local balls = controllers.BallVisualController
	local me = balls and balls.balls[Players.LocalPlayer.UserId]
	if not me then
		return
	end
	local a0 = Instance.new("Attachment")
	a0.Parent = me.shell
	local a1 = Instance.new("Attachment")
	a1.Parent = me.shell
	trailAttachments = { a0, a1 }
	local t = Instance.new("Trail")
	t.Attachment0 = a0
	t.Attachment1 = a1
	t.Lifetime = 0.35
	t.LightEmission = 0.6
	t.FaceCamera = true
	t.Color = ColorSequence.new(Color3.new(1, 1, 1), me.color)
	t.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 1) })
	t.WidthScale = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 0) })
	t.Enabled = false
	t.Parent = me.shell
	trail = t
end

local function updateTrail()
	if not trail or not trail.Parent then
		return
	end
	local movement = controllers.MovementController
	local d = state.diameter
	local frac = movement.speed / math.max(Growth.maxSpeed(d), 1)
	local dashing = os.clock() < movement.dashUntil + 0.2
	trail.Enabled = dashing or frac > 1.05
	-- Attachments sit on the ball's sides, perpendicular to the heading.
	local h = movement.heading
	local side = Vector3.new(-h.Z, 0, h.X) * d * 0.42
	if #trailAttachments == 2 then
		trailAttachments[1].Position = side - Vector3.new(0, d * 0.2, 0)
		trailAttachments[2].Position = -side - Vector3.new(0, d * 0.2, 0)
	end
end

function VFXController:start()
	state = controllers.ClientState
	settings = controllers.SettingsController
	folder = Workspace:FindFirstChild("VFX") or Instance.new("Folder")
	folder.Name = "VFX"
	folder.Parent = Workspace

	local world = controllers.WorldController
	local input = controllers.InputController
	world.PropAbsorbed:Connect(function(p, absorberKey, isPrediction)
		local isLocal = absorberKey == state.player.UserId
		if isLocal and not isPrediction then
			return
		end
		local pos = Vector3.new(p.x, p.cy, p.z)
		local color = Color3.fromHex(p.def.metrics.mainColor)
		local rarity = Rarity.get(p.def.rarity)
		local mut = Mutations.get(p.mutation)
		self:pop(pos, color, p.absorbSize, rarity.order + (if mut then mut.rarityBoost else 0))
		if isLocal then
			-- Tiny tick for every pickup, a real thump for big ones.
			local rel = p.absorbSize / math.max(state.diameter * 0.62, 0.1)
			if rel > 0.35 then
				input:rumble(math.clamp(rel * 0.6, 0.15, 0.6), 0.08)
			end
		end
		if isLocal and p.critter then
			self:emoji(pos + Vector3.new(0, p.def.metrics.sy * p.eff, 0), if math.random() < 0.5 then "😆" else "🎉", 1.1)
		end
	end)
	local movement = controllers.MovementController
	movement.Bonked:Connect(function(speed, _, hitPos)
		local d = state.diameter
		local frac = math.clamp(speed / math.max(Growth.maxSpeed(d), 1), 0.3, 1.4)
		input:rumble(0.25 + frac * 0.5, 0.12)
		burst(hitPos, { color = Color3.fromRGB(255, 236, 140), size = math.clamp(d * 0.25, 0.5, 30), speed = d * 3 * frac, count = 9, life = 0.45, light = 1 })
		self:shockwave(hitPos, d * 0.9 * frac, Color3.fromRGB(255, 240, 200))
		self:emoji(hitPos + Vector3.new(0, d * 0.5, 0), "💫", 0.7)
	end)
	movement.Landed:Connect(function(impact)
		local ball = state.ball
		if ball and impact > 25 then
			local d = state.diameter
			self:dust(ball.Position - Vector3.new(0, d / 2, 0), d)
			if impact > 60 then
				self:shockwave(ball.Position - Vector3.new(0, d / 2 - 0.2, 0), d * 1.2)
			end
		end
	end)
	movement.Dashed:Connect(function()
		local ball = state.ball
		if ball then
			self:dust(ball.Position - Vector3.new(0, state.diameter / 2, 0), state.diameter * 0.8)
		end
	end)
	world.GoalUnlocked:Connect(function()
		input:rumble(0.6, 0.25)
		local ball = state.ball
		if ball then
			self:sparkle(ball.Position, Color3.fromRGB(255, 214, 64), math.clamp(state.diameter * 0.3, 0.6, 30), 30)
			self:shockwave(ball.Position - Vector3.new(0, state.diameter / 2 - 0.2, 0), state.diameter * 2, Color3.fromRGB(255, 214, 64))
		end
	end)
	Net.connect("Absorbed", function(list)
		local ball = state.ball
		if not ball then
			return
		end
		for _, a in list do
			if a.n or a.v then
				local def = PropLibrary.get(a.uid)
				if def then
					self:sparkle(ball.Position + Vector3.new(0, state.diameter * 0.6, 0), Rarity.color(def.rarity, settings.values.colorblind), math.clamp(state.diameter * 0.2, 0.5, 20), 16)
				end
			end
		end
	end)
	state.BallChanged:Connect(function(part)
		if part then
			task.delay(0.5, setupTrail)
		end
	end)
	RunService.RenderStepped:Connect(updateTrail)
end

return VFXController
