--!nonstrict
-- Visuals for every ball: a squashy shell, a lumpy "packed with stuff" core that rolls with the
-- ball, and the props you've rolled up sticking out of it (newest/biggest/rarest kept visible,
-- older small ones folded into the core). All client-built from compact server state.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Spring = require(Shared.Util.Spring)
local MathUtil = require(Shared.Util.MathUtil)
local PropBuilder = require(Shared.PropBuilder)
local Rarity = require(Shared.Config.Rarity)
local Tuning = require(Shared.Config.Tuning)
local Absorb = require(Shared.Logic.Absorb)
local Format = require(Shared.Util.Format)
local Cosmetics = require(Shared.Data.Cosmetics)

local BallVisualController = {}
BallVisualController.balls = {} :: { [number]: any }
BallVisualController.Stuck = Signal.new() -- (userId, prop) fired when a prop lands on a ball

local controllers
local state
local folder: Folder
local flights = {} -- props flying into balls
local myUserId = Players.LocalPlayer.UserId
local LUMPS = MathUtil.fibonacciSphere(34)

local PALETTE = {
	Color3.fromRGB(255, 122, 69),
	Color3.fromRGB(77, 196, 255),
	Color3.fromRGB(255, 120, 196),
	Color3.fromRGB(120, 214, 110),
	Color3.fromRGB(176, 108, 255),
	Color3.fromRGB(255, 196, 46),
	Color3.fromRGB(64, 214, 200),
	Color3.fromRGB(255, 92, 120),
}

function BallVisualController:init(c)
	controllers = c
end

local function visualPart(name: string, color: Color3, material: Enum.Material?): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Shape = Enum.PartType.Block
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Massless = true
	p.CastShadow = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere
	mesh.Parent = p
	return p
end

local function colorFor(userId: number): Color3
	return PALETTE[(userId % #PALETTE) + 1]
end

local function materialNamed(name: string?): Enum.Material
	local ok, m = pcall(function()
		return (Enum.Material :: any)[name or "SmoothPlastic"]
	end)
	return if ok and m then m else Enum.Material.SmoothPlastic
end

local function lumpShade(base: Color3, i: number): Color3
	local h, s, v = base:ToHSV()
	return Color3.fromHSV((h + (i % 5 - 2) * 0.015) % 1, math.clamp(s * (0.8 + (i % 3) * 0.12), 0, 1), math.clamp(v * (0.82 + (i % 4) * 0.06), 0, 1))
end

-- Dress a ball in its shell cosmetic (Shell attribute; "Classic" = the owner's personal color).
local function applyShell(entry)
	local def = Cosmetics.shell(entry.part:GetAttribute("Shell"))
	local base = if def.color then Color3.fromHex(def.color) else colorFor(entry.userId)
	local accent = if def.color2 then Color3.fromHex(def.color2) else nil
	local material = materialNamed(def.material)
	entry.color = base
	entry.rainbow = def.rainbow == true
	entry.shell.Color = base
	entry.shell.Material = material
	entry.shell.Reflectance = def.reflectance or 0.04
	for i, lump in entry.lumps do
		if accent and i % 3 == 0 then
			lump.Color = accent
			lump.Material = if def.neon then Enum.Material.Neon else material
		else
			lump.Color = lumpShade(base, i)
			lump.Material = material
		end
	end
end

local function layoutLumps(entry)
	local d = entry.diameter
	local r = d / 2
	for i, lump in entry.lumps do
		local p = LUMPS[i]
		local dir = Vector3.new(p[1], p[2], p[3])
		local size = d * (0.2 + (i % 3) * 0.04)
		lump.Size = Vector3.new(size, size * 0.42, size)
		local cf = CFrame.lookAt(Vector3.zero, dir) * CFrame.Angles(-math.pi / 2, 0, 0)
		local weld = lump:FindFirstChild("W") :: Weld
		if weld then
			weld.C0 = CFrame.new(dir * (r - size * 0.12)) * (cf - cf.Position)
		end
	end
end

local function createEntry(model: Model)
	local part = model:WaitForChild("Ball", 10) :: BasePart?
	if not part then
		return
	end
	local userId = part:GetAttribute("OwnerId") or 0
	if BallVisualController.balls[userId] then
		BallVisualController.balls[userId].folder:Destroy()
	end
	local color = colorFor(userId)
	local vf = Instance.new("Model")
	vf.Name = "BallVisual_" .. userId
	vf.Parent = folder

	local shell = visualPart("Shell", color, Enum.Material.SmoothPlastic)
	shell.Anchored = true
	shell.Reflectance = 0.04
	shell.Parent = vf

	local lumps = {}
	for i = 1, #LUMPS do
		local lump = visualPart("Lump", lumpShade(color, i))
		lump.Anchored = false
		local weld = Instance.new("Weld")
		weld.Name = "W"
		weld.Part0 = part
		weld.Part1 = lump
		weld.Parent = lump
		lump.Parent = vf
		table.insert(lumps, lump)
	end

	local entry = {
		userId = userId,
		model = model,
		part = part,
		folder = vf,
		shell = shell,
		shellMesh = shell:FindFirstChildOfClass("SpecialMesh"),
		lumps = lumps,
		lumpCursor = 1,
		stuck = {},
		diameter = part:GetAttribute("Diameter") or part.Size.X,
		squash = Spring.new(0, 220, 11),
		color = color,
		isLocal = userId == myUserId,
		shield = nil,
		tag = nil,
	}
	layoutLumps(entry)
	BallVisualController.balls[userId] = entry

	-- Name + size tag for other players' balls (readable PvP at a glance).
	if not entry.isLocal then
		local player = Players:GetPlayerByUserId(userId)
		local gui = Instance.new("BillboardGui")
		gui.Name = "Tag"
		gui.Size = UDim2.fromOffset(160, 44)
		gui.AlwaysOnTop = true
		gui.MaxDistance = 600
		gui.LightInfluence = 0
		gui.Adornee = part
		local label = Instance.new("TextLabel")
		label.BackgroundTransparency = 1
		label.Size = UDim2.fromScale(1, 1)
		label.FontFace = Font.new("rbxasset://fonts/families/FredokaOne.json")
		label.TextScaled = true
		label.TextColor3 = Color3.new(1, 1, 1)
		label.Text = if player then player.DisplayName else (part:GetAttribute("OwnerName") or "?")
		local stroke = Instance.new("UIStroke")
		stroke.Thickness = 2
		stroke.Color = Color3.fromRGB(38, 26, 74)
		stroke.Parent = label
		label.Parent = gui
		gui.Parent = vf
		entry.tag = { gui = gui, label = label, name = label.Text }
	end

	part:GetAttributeChangedSignal("Diameter"):Connect(function()
		BallVisualController:onDiameter(entry, part:GetAttribute("Diameter"))
	end)
	applyShell(entry)
	part:GetAttributeChangedSignal("Shell"):Connect(function()
		applyShell(entry)
		if controllers.VFXController then
			controllers.VFXController:sparkle(part.Position, entry.color, entry.diameter, 16)
		end
	end)
	return entry
end

local function removeEntry(userId: number)
	local entry = BallVisualController.balls[userId]
	if entry then
		entry.folder:Destroy()
		BallVisualController.balls[userId] = nil
	end
end

function BallVisualController:hasBall(userId: number): boolean
	local e = self.balls[userId]
	return e ~= nil and e.part.Parent ~= nil
end

-- Fold a stuck prop into the core: shrink it away and tint a lump with its color.
local function fold(entry, s)
	if s.folded then
		return
	end
	s.folded = true
	local lump = entry.lumps[entry.lumpCursor]
	entry.lumpCursor = entry.lumpCursor % #entry.lumps + 1
	if lump then
		lump.Color = s.color
	end
	if s.model then
		local model = s.model
		s.model = nil
		task.spawn(function()
			for _ = 1, 6 do
				if not model.Parent then
					return
				end
				pcall(function()
					model:ScaleTo(math.max(0.05, model:GetScale() * 0.7))
				end)
				task.wait(0.03)
			end
			model:Destroy()
		end)
	end
end

-- Keep visible stuck props under budget: fold smallest/oldest commons first.
local function enforceBudget(entry)
	local cap = if entry.isLocal then Tuning.Absorb.VisibleStuckLocal else Tuning.Absorb.VisibleStuckRemote
	local q = controllers.SettingsController and controllers.SettingsController:qualityFactor() or 1
	cap = math.floor(cap * math.clamp(q, 0.5, 1.1))
	local visible = {}
	for _, s in entry.stuck do
		if not s.folded and s.model then
			table.insert(visible, s)
		end
	end
	if #visible <= cap then
		return
	end
	table.sort(visible, function(a, b)
		return a.keep < b.keep
	end)
	for i = 1, #visible - cap do
		fold(entry, visible[i])
	end
end

function BallVisualController:onDiameter(entry, d: number)
	local old = entry.diameter
	entry.diameter = d
	layoutLumps(entry)
	local r = d / 2
	for i = #entry.stuck, 1, -1 do
		local s = entry.stuck[i]
		-- Buried by growth: fold into the core.
		if not s.folded and r > s.absorbR + s.size * 0.55 then
			fold(entry, s)
		end
		if s.folded then
			table.remove(entry.stuck, i)
		end
	end
	if d > old then
		entry.squash:impulse(math.clamp((d - old) / old * 6, 0.02, 0.6))
	end
end

local function stickPlacement(entry, s): CFrame
	-- Prop stands out of the surface along `dir`, base embedded ~35% of its height.
	local dir = s.dir
	local up = Vector3.yAxis
	local basis = CFrame.lookAt(Vector3.zero, dir, if math.abs(dir:Dot(up)) > 0.95 then Vector3.xAxis else up) * CFrame.Angles(-math.pi / 2, 0, 0)
	basis = basis * CFrame.Angles(0, s.spin, 0)
	local embed = s.height * 0.38
	return CFrame.new(dir * (s.absorbR - embed)) * basis
end

local function attach(entry, s)
	local model = s.model
	if not model or not model.Parent then
		return
	end
	PropBuilder.makeDynamic(model)
	local hitbox = model.PrimaryPart
	if not hitbox then
		return
	end
	local place = stickPlacement(entry, s)
	local weld = Instance.new("Weld")
	weld.Name = "Stick"
	weld.Part0 = entry.part
	weld.Part1 = hitbox
	weld.C0 = place * hitbox.PivotOffset:Inverse()
	weld.Parent = hitbox
	model.Parent = entry.folder
end

-- A prop starts flying into a ball (absorbed). Takes ownership of p.model.
function BallVisualController:absorbProp(userId: number, p)
	local entry = self.balls[userId]
	local model = p.model
	p.model = nil
	if model then
		-- Grabbed props must never collide again (a still-solid prop flying in shoves the ball).
		for _, d in model:GetDescendants() do
			if d:IsA("BasePart") then
				d.CanCollide = false
				d.CanQuery = false
				d.CanTouch = false
			end
		end
	end
	if not entry then
		if model then
			model:Destroy()
		end
		return
	end
	local ballCF = entry.part.CFrame
	local r = entry.diameter / 2
	local fromPos = if model then model:GetPivot().Position else Vector3.new(p.x, p.cy, p.z)
	local toward = Vector3.new(p.x, p.cy, p.z) - ballCF.Position
	local worldDir = if toward.Magnitude > 1e-3 then toward.Unit else Vector3.new(0, 1, 0)
	local rarity = Rarity.get(p.def.rarity)
	local s = {
		propId = p.id,
		uid = p.uid,
		mutation = p.mutation,
		model = model,
		dir = ballCF:VectorToObjectSpace(worldDir),
		spin = math.random() * math.pi * 2,
		absorbR = r,
		size = p.absorbSize,
		height = p.def.metrics.sy * p.eff,
		color = Color3.fromHex(p.def.metrics.mainColor),
		-- Higher keep score = stays visible longer (big and rare things poke out longest).
		keep = p.absorbSize / math.max(entry.diameter, 0.1) * 4 + rarity.order * 0.8 + (if p.mutation > 0 then 2 else 0) + os.clock() * 0.001,
		folded = false,
	}
	table.insert(entry.stuck, s)
	entry.squash:impulse(math.clamp(p.absorbSize / math.max(entry.diameter, 0.1) * 0.5, 0.03, 0.35))
	if model then
		-- Remote balls far from the camera skip the flight and fold straight in (cheap).
		local cam = Workspace.CurrentCamera
		if not entry.isLocal and (cam.CFrame.Position - ballCF.Position).Magnitude > 500 then
			fold(entry, s)
		else
			PropBuilder.makeStatic(model)
			-- Bigger props take a little longer and glide in (smooth), small ones snap in (punchy).
			local rel = p.absorbSize / math.max(entry.diameter, 1)
			table.insert(flights, {
				entry = entry,
				s = s,
				from = fromPos,
				fromCF = model:GetPivot(),
				t0 = os.clock(),
				dur = math.clamp(0.1 + rel * 0.45, 0.1, 0.36),
				smooth = rel > 0.3,
			})
		end
	else
		fold(entry, s)
	end
	enforceBudget(entry)
end

-- Move a predicted prop from one ball to another (another player beat us to it).
function BallVisualController:reassign(fromUserId: number, toUserId: number, p)
	local from = self.balls[fromUserId]
	if not from then
		return
	end
	for i, s in from.stuck do
		if s.propId == p.id then
			table.remove(from.stuck, i)
			if s.model then
				p.model = s.model
				local hb = s.model.PrimaryPart
				local weld = hb and hb:FindFirstChild("Stick")
				if weld then
					weld:Destroy()
				end
				PropBuilder.makeStatic(s.model)
				s.model.Parent = Workspace:FindFirstChild("ClientProps")
			end
			self:absorbProp(toUserId, p)
			return
		end
	end
end

-- Undo a local prediction (server never confirmed it).
function BallVisualController:release(userId: number, p)
	local entry = self.balls[userId]
	if not entry then
		return
	end
	for i, s in entry.stuck do
		if s.propId == p.id then
			table.remove(entry.stuck, i)
			if s.model then
				s.model:Destroy()
			end
			return
		end
	end
end

-- The nearest ball big enough to roll us up (camera leans toward it).
function BallVisualController:nearestThreat(): Vector3?
	local me = self.balls[myUserId]
	if not me or not me.part.Parent then
		return nil
	end
	local best, bestDist = nil, math.huge
	for userId, e in self.balls do
		if userId ~= myUserId and e.part.Parent and Absorb.canAbsorbBall(e.diameter, me.diameter) then
			local dist = (e.part.Position - me.part.Position).Magnitude
			if dist < me.diameter * 8 + e.diameter * 2 and dist < bestDist then
				best, bestDist = e.part.Position, dist
			end
		end
	end
	return best
end

local function onKnock(data)
	local entry = BallVisualController.balls[data.ball]
	if not entry then
		return
	end
	local removed = 0
	for i = #entry.stuck, 1, -1 do
		if removed >= data.count then
			break
		end
		local s = entry.stuck[i]
		if not s.folded then
			if s.model then
				if controllers.VFXController then
					controllers.VFXController:poof(s.model:GetPivot().Position, s.size)
				end
				s.model:Destroy()
				s.model = nil
			end
			table.remove(entry.stuck, i)
			removed += 1
		end
	end
	entry.squash:impulse(0.4)
end

local function updateFlights()
	local now = os.clock()
	for i = #flights, 1, -1 do
		local f = flights[i]
		local s = f.s
		local entry = f.entry
		if not s.model or not entry.part.Parent then
			table.remove(flights, i)
			continue
		end
		local t = math.clamp((now - f.t0) / f.dur, 0, 1)
		local target = entry.part.CFrame * stickPlacement(entry, s)
		if f.smooth then
			-- Ease-out cubic for position AND rotation: big things glide onto the ball.
			local e = 1 - (1 - t) ^ 3
			s.model:PivotTo(f.fromCF:Lerp(target, e))
		else
			local eased = MathUtil.easeOutBack(t)
			local pos = f.from:Lerp(target.Position, math.clamp(eased, 0, 1.08))
			s.model:PivotTo((target - target.Position) + pos)
		end
		if t >= 1 then
			table.remove(flights, i)
			attach(entry, s)
			BallVisualController.Stuck:Fire(entry.userId, s)
		end
	end
end

local function updateShells(dt: number)
	local parts, cfs = {}, {}
	local serverNow = Workspace:GetServerTimeNow()
	for userId, e in BallVisualController.balls do
		if not e.part.Parent then
			removeEntry(userId)
			continue
		end
		local sq = e.squash:step(dt)
		-- Smooth physical growth toward the server's diameter (no hitches on big absorbs).
		local target = e.diameter
		local current = e.part.Size.X
		if math.abs(current - target) > 1e-3 then
			local new = current + (target - current) * math.min(1, dt * 14)
			if math.abs(target - new) < 0.005 then
				new = target
			end
			e.part.Size = Vector3.one * new
			if e.isLocal and new > current and not e.part.Anchored then
				e.part.CFrame += Vector3.new(0, (new - current) / 2, 0)
			end
		end
		if e.rainbow then
			local hue = (os.clock() * 0.12 + (userId % 7) * 0.13) % 1
			e.color = Color3.fromHSV(hue, 0.62, 1)
			e.shell.Color = e.color
			e.rainbowTick = (e.rainbowTick or 0) + dt
			if e.rainbowTick > 0.1 then
				e.rainbowTick = 0
				for i, lump in e.lumps do
					lump.Color = lumpShade(Color3.fromHSV((hue + i * 0.03) % 1, 0.62, 1), i)
				end
			end
		end
		local d = e.part.Size.X
		local shellD = d * 0.97
		e.shell.Size = Vector3.one * shellD
		if e.shellMesh then
			e.shellMesh.Scale = Vector3.new(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5)
		end
		table.insert(parts, e.shell)
		table.insert(cfs, CFrame.new(e.part.Position - Vector3.new(0, sq * d * 0.5, 0)))
		-- Spawn shield bubble.
		local shieldUntil = e.part:GetAttribute("ShieldUntil")
		local shielded = shieldUntil and serverNow < shieldUntil
		if shielded and not e.shield then
			local bubble = visualPart("Shield", Color3.fromRGB(150, 220, 255), Enum.Material.ForceField)
			bubble.Anchored = true
			bubble.Transparency = 0.2
			bubble.Parent = e.folder
			e.shield = bubble
		elseif not shielded and e.shield then
			e.shield:Destroy()
			e.shield = nil
		end
		if e.shield then
			e.shield.Size = Vector3.one * d * 1.35
			table.insert(parts, e.shield)
			table.insert(cfs, CFrame.new(e.part.Position))
		end
		if e.tag then
			e.tag.gui.StudsOffsetWorldSpace = Vector3.new(0, d * 0.7 + 3, 0)
			e.tag.label.Text = e.tag.name .. "  " .. Format.size(d, state.round.cmPerStud or 1)
			local me = BallVisualController.balls[myUserId]
			if me then
				-- Red tag = can roll you up; green = you can roll them up.
				local color = Color3.new(1, 1, 1)
				if Absorb.canAbsorbBall(d, me.diameter) then
					color = Color3.fromRGB(255, 120, 120)
				elseif Absorb.canAbsorbBall(me.diameter, d) then
					color = Color3.fromRGB(140, 255, 150)
				end
				e.tag.label.TextColor3 = color
			end
		end
	end
	if #parts > 0 then
		Workspace:BulkMoveTo(parts, cfs, Enum.BulkMoveMode.FireCFrameChanged)
	end
end

function BallVisualController:start()
	state = controllers.ClientState
	folder = Workspace:FindFirstChild("BallVisuals") or Instance.new("Folder")
	folder.Name = "BallVisuals"
	folder.Parent = Workspace
	local balls = Workspace:WaitForChild("Balls")
	local function onAdded(model)
		if model:IsA("Model") then
			task.spawn(createEntry, model)
		end
	end
	balls.ChildAdded:Connect(onAdded)
	for _, m in balls:GetChildren() do
		onAdded(m)
	end
	balls.ChildRemoved:Connect(function(model)
		for userId, e in self.balls do
			if e.model == model then
				removeEntry(userId)
			end
		end
	end)
	Net.connect("BallFx", function(kind, data)
		if kind == "knock" then
			onKnock(data)
		end
	end)
	RunService.RenderStepped:Connect(function(dt)
		updateFlights()
		updateShells(dt)
	end)
end

return BallVisualController
