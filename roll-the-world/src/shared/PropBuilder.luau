--!strict
-- Turns prop recipes (pure data) into Roblox Models. Templates are built once per uid and cloned.
-- Every model has an invisible "Hitbox" PrimaryPart sized to the prop's bounds whose pivot sits at
-- ground level, so PivotTo(CFrame.new(x, groundY, z)) places a prop correctly.

local CollectionService = game:GetService("CollectionService")

local PropLibrary = require(script.Parent.Logic.PropLibrary)
local PropMetrics = require(script.Parent.Logic.PropMetrics)
local Mutations = require(script.Parent.Data.Mutations)

local PropBuilder = {}

local templates: { [number]: Model } = {}

local function material(name: string?): Enum.Material
	if not name then
		return Enum.Material.SmoothPlastic
	end
	local ok, value = pcall(function()
		return (Enum.Material :: any)[name]
	end)
	return if ok and value then value else Enum.Material.SmoothPlastic
end

local function toCFrame(spec: any): CFrame
	local m = PropMetrics.partRotation(spec)
	return CFrame.new(spec.pos[1], spec.pos[2], spec.pos[3], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9])
end

local function makePart(spec: any): BasePart
	local part: BasePart
	local size = Vector3.new(spec.size[1], spec.size[2], spec.size[3])
	if spec.shape == "Wedge" then
		part = Instance.new("WedgePart")
	elseif spec.shape == "CornerWedge" then
		part = Instance.new("CornerWedgePart")
	elseif spec.shape == "Ball" and not (spec.size[1] == spec.size[2] and spec.size[2] == spec.size[3]) then
		-- Ellipsoid: block part rendered with a sphere mesh that stretches to the part's size.
		local p = Instance.new("Part")
		p.Shape = Enum.PartType.Block
		local mesh = Instance.new("SpecialMesh")
		mesh.MeshType = Enum.MeshType.Sphere
		mesh.Parent = p
		part = p
	else
		local p = Instance.new("Part")
		if spec.shape == "Ball" then
			p.Shape = Enum.PartType.Ball
		elseif spec.shape == "Cylinder" then
			p.Shape = Enum.PartType.Cylinder
		else
			p.Shape = Enum.PartType.Block
		end
		part = p
	end
	part.Size = Vector3.new(math.max(size.X, 0.05), math.max(size.Y, 0.05), math.max(size.Z, 0.05))
	part.CFrame = toCFrame(spec)
	part.Color = Color3.fromHex(spec.color)
	part.Material = material(spec.material)
	part.Transparency = spec.transparency or 0
	part.Reflectance = spec.reflectance or 0
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.Massless = true
	part.CastShadow = math.max(size.X, size.Y, size.Z) > 2.5 and not spec.neon
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	if spec.tag then
		part:SetAttribute("Tag", spec.tag)
	end
	part:SetAttribute("BaseColor", spec.color)
	return part
end

local function buildTemplate(def: PropLibrary.PropDef): Model
	local model = Instance.new("Model")
	model.Name = def.id
	local m = def.metrics
	local hitbox = Instance.new("Part")
	hitbox.Name = "Hitbox"
	hitbox.Size = Vector3.new(math.max(m.sx, 0.2), math.max(m.sy, 0.2), math.max(m.sz, 0.2))
	hitbox.CFrame = CFrame.new(0, m.centerY, 0)
	hitbox.PivotOffset = CFrame.new(0, -m.centerY, 0)
	hitbox.Transparency = 1
	hitbox.Anchored = true
	hitbox.CanCollide = false
	hitbox.CanQuery = false
	hitbox.CanTouch = false
	hitbox.CastShadow = false
	hitbox.Parent = model
	model.PrimaryPart = hitbox
	for i, spec in def.parts do
		local part = makePart(spec)
		part.Name = "P" .. i
		part.Parent = model
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = hitbox
		weld.Part1 = part
		weld.Parent = part
	end
	model:SetAttribute("Uid", def.uid)
	return model
end

-- Build an anchored model straight from a list of part specs (NPCs, hub decor, previews).
-- The model's pivot is at the recipe origin.
function PropBuilder.buildParts(parts: { any }, name: string): Model
	local model = Instance.new("Model")
	model.Name = name
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = Vector3.new(0.2, 0.2, 0.2)
	root.Transparency = 1
	root.Anchored = true
	root.CanCollide = false
	root.CanQuery = false
	root.CanTouch = false
	root.CFrame = CFrame.new()
	root.Parent = model
	model.PrimaryPart = root
	for i, spec in parts do
		local part = makePart(spec)
		part.Name = (spec.tag or "P") .. i
		part.Parent = model
	end
	return model
end

function PropBuilder.template(uid: number): Model?
	local existing = templates[uid]
	if existing then
		return existing
	end
	local def = PropLibrary.get(uid)
	if not def then
		return nil
	end
	local model = buildTemplate(def)
	templates[uid] = model
	return model
end

local function lerpColor(a: Color3, b: Color3, t: number): Color3
	return a:Lerp(b, t)
end

-- Apply a mutation layer (color tint, material, light, rainbow tag) to a built model.
function PropBuilder.applyMutation(model: Model, mutationIndex: number)
	model:SetAttribute("Mutation", mutationIndex)
	local mut = Mutations.get(mutationIndex)
	if not mut then
		return
	end
	local tint = if mut.color then Color3.fromHex(mut.color) else nil
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") and d.Name ~= "Hitbox" and d:GetAttribute("Tag") ~= "eye" then
			if tint and mut.tintStrength > 0 then
				d.Color = lerpColor(d.Color, tint, mut.tintStrength)
			end
			if mut.material and d.Material ~= Enum.Material.Neon then
				d.Material = material(mut.material)
			end
			if mut.reflectance then
				d.Reflectance = mut.reflectance
			end
		end
	end
	if mut.rainbow then
		CollectionService:AddTag(model, "RainbowProp")
	end
	local hitbox = model.PrimaryPart
	if hitbox and mut.light then
		local light = Instance.new("PointLight")
		light.Color = Color3.fromHex(mut.light)
		light.Range = math.clamp(hitbox.Size.Magnitude * 1.2, 4, 40)
		light.Brightness = 1.2
		light.Shadows = false
		light.Parent = hitbox
	end
end

-- Recolor parts that share the recipe's primary color with the variant color.
function PropBuilder.applyVariant(model: Model, def: PropLibrary.PropDef, instanceId: number)
	local variant = PropLibrary.variantColor(def, instanceId)
	if not variant then
		return
	end
	local primary = def.parts[1].color
	local color = Color3.fromHex(variant)
	for _, d in model:GetChildren() do
		if d:IsA("BasePart") and d:GetAttribute("BaseColor") == primary then
			d.Color = color
		end
	end
end

-- Build a ready-to-place clone. scale includes any Giant/Tiny mutation multiplier.
function PropBuilder.create(uid: number, instanceId: number, scale: number, mutationIndex: number): Model?
	local template = PropBuilder.template(uid)
	local def = PropLibrary.get(uid)
	if not template or not def then
		return nil
	end
	local model = template:Clone()
	PropBuilder.applyVariant(model, def, instanceId)
	local mut = Mutations.get(mutationIndex)
	local finalScale = scale * (if mut then mut.scale else 1)
	if math.abs(finalScale - 1) > 1e-3 then
		model:ScaleTo(finalScale)
	end
	if mutationIndex > 0 then
		PropBuilder.applyMutation(model, mutationIndex)
	end
	model:SetAttribute("PropId", instanceId)
	return model
end

-- Unanchor a model so it can be welded to a moving ball. Parts keep their internal welds.
function PropBuilder.makeDynamic(model: Model)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = false
			d.CanCollide = false
			d.CanQuery = false
			d.CanTouch = false
			d.Massless = true
		end
	end
end

-- Remove internal welds and anchor every part (used when a stuck prop is knocked off and flies).
function PropBuilder.makeStatic(model: Model)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
end

return PropBuilder
