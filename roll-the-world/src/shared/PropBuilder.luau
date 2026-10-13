--!nonstrict
-- Turns prop recipes into Roblox Models (client side).
--
-- Preferred path: MeshAssembly merges each recipe into a few smooth meshes (bevelled edges, real
-- curves, baked contact shading, UVs for material textures) and we upload them to EditableMesh
-- -> MeshPart. One template per prop type is built once per session and cloned per instance.
-- Fallback path: if EditableMesh is unavailable (device budget, experience setting), the same
-- recipe is built from primitive parts so the game always works.
--
-- Every model has an invisible "Hitbox" PrimaryPart sized to the prop's bounds whose pivot sits at
-- ground level, so PivotTo(CFrame.new(x, groundY, z)) places a prop correctly.

local AssetService = game:GetService("AssetService")
local CollectionService = game:GetService("CollectionService")

local PropLibrary = require(script.Parent.Logic.PropLibrary)
local PropMetrics = require(script.Parent.Logic.PropMetrics)
local MeshAssembly = require(script.Parent.Logic.MeshAssembly)
local MeshKit = require(script.Parent.Logic.MeshKit)
local Mutations = require(script.Parent.Data.Mutations)
local Tuning = require(script.Parent.Config.Tuning)

local PropBuilder = {}

local templates: { [number]: Model } = {}
local building: { [number]: boolean } = {}
local editableAvailable = Tuning.Graphics.UseEditableMesh
PropBuilder.stats = { meshTemplates = 0, fallbackTemplates = 0, meshFailures = 0 }

local function material(name: string?): Enum.Material
	if not name then
		return Enum.Material.SmoothPlastic
	end
	local ok, value = pcall(function()
		return (Enum.Material :: any)[name]
	end)
	return if ok and value then value else Enum.Material.SmoothPlastic
end
PropBuilder.material = material

local function toCFrame(spec: any): CFrame
	local m = PropMetrics.partRotation(spec)
	return CFrame.new(spec.pos[1], spec.pos[2], spec.pos[3], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9])
end

local function styleVisual(part: BasePart, castShadow: boolean)
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.Massless = true
	part.CastShadow = castShadow
	if part:IsA("Part") then
		part.TopSurface = Enum.SurfaceType.Smooth
		part.BottomSurface = Enum.SurfaceType.Smooth
	end
end

-- FALLBACK: primitive parts ----------------------------------------------------------------------

local function primitive(spec: any): BasePart
	local part: BasePart
	if spec.shape == "Wedge" then
		part = Instance.new("WedgePart")
	elseif spec.shape == "CornerWedge" then
		part = Instance.new("CornerWedgePart")
	elseif spec.shape == "Ball" and not (spec.size[1] == spec.size[2] and spec.size[2] == spec.size[3]) then
		local p = Instance.new("Part")
		p.Shape = Enum.PartType.Block
		local mesh = Instance.new("SpecialMesh")
		mesh.MeshType = Enum.MeshType.Sphere
		mesh.Parent = p
		part = p
	else
		local p = Instance.new("Part")
		p.Shape = if spec.shape == "Ball" then Enum.PartType.Ball elseif spec.shape == "Cylinder" then Enum.PartType.Cylinder else Enum.PartType.Block
		part = p
	end
	part.Size = Vector3.new(math.max(spec.size[1], 0.05), math.max(spec.size[2], 0.05), math.max(spec.size[3], 0.05))
	part.CFrame = toCFrame(spec)
	part.Color = Color3.fromHex(spec.color)
	part.Material = if spec.neon then Enum.Material.Neon else material(spec.material)
	part.Transparency = spec.transparency or 0
	part.Reflectance = spec.reflectance or 0
	styleVisual(part, math.max(spec.size[1], spec.size[2], spec.size[3]) > 2.5 and not spec.neon)
	if spec.tag then
		part:SetAttribute("Tag", spec.tag)
		part:SetAttribute("Pivot", Vector3.new(spec.pos[1], spec.pos[2], spec.pos[3]))
	end
	part:SetAttribute("BaseColor", spec.color)
	return part
end

-- Approximate a smooth-mesh spec with primitives (fallback only).
local function fallbackSpecs(spec: any): { any }
	if spec.shape ~= "Mesh" then
		return { spec }
	end
	local d = spec.mesh
	local out = {}
	local function sub(shape: string, size: { number }, lx: number, ly: number, lz: number, extraRot: { number }?)
		-- Local offset rotated by the spec rotation.
		local m = PropMetrics.partRotation(spec)
		local wx = spec.pos[1] + m[1] * lx + m[2] * ly + m[3] * lz
		local wy = spec.pos[2] + m[4] * lx + m[5] * ly + m[6] * lz
		local wz = spec.pos[3] + m[7] * lx + m[8] * ly + m[9] * lz
		table.insert(out, {
			shape = shape,
			size = size,
			pos = { wx, wy, wz },
			rot = extraRot or spec.rot,
			upright = shape == "Cylinder" and extraRot == nil,
			color = spec.color,
			material = spec.material,
			transparency = spec.transparency,
			neon = spec.neon,
			tag = spec.tag,
		})
	end
	if d.kind == "lathe" then
		local prof = d.profile
		for i = 1, #prof - 1 do
			local a, b = prof[i], prof[i + 1]
			local h = math.abs(b[2] - a[2])
			local r = (a[1] + b[1]) / 2
			if h > 0.05 and r > 0.05 then
				sub("Cylinder", { h, r * 2, r * 2 }, 0, (a[2] + b[2]) / 2, 0)
			end
		end
	elseif d.kind == "ellipsoid" then
		sub("Ball", { d.size[1], d.size[2], d.size[3] }, 0, 0, 0)
	elseif d.kind == "rbox" then
		sub("Block", { d.size[1], d.size[2], d.size[3] }, 0, 0, 0)
	elseif d.kind == "torus" then
		for i = 0, 9 do
			local a = i / 10 * math.pi * 2
			sub("Ball", { d.minor * 2.2, d.minor * 2.2, d.minor * 2.2 }, math.cos(a) * d.major, 0, math.sin(a) * d.major)
		end
	elseif d.kind == "tube" then
		local pts = MeshKit.smoothCurve(d.path, 2)
		for i = 1, #pts do
			local p = pts[i]
			local r = if type(d.radius) == "table" then d.radius[math.clamp(math.floor((i - 1) / 2) + 1, 1, #d.radius)] else d.radius
			sub("Ball", { r * 2, r * 2, r * 2 }, p[1], p[2], p[3])
		end
	else
		local s = spec.size
		local c = spec.meshCenter or { 0, 0, 0 }
		sub("Block", { s[1], s[2], s[3] }, c[1], c[2], c[3])
	end
	return out
end

-- MESH PATH: EditableMesh -> MeshPart ------------------------------------------------------------

local function groupBounds(g): (Vector3, Vector3)
	local v = g.verts
	local minX, minY, minZ = math.huge, math.huge, math.huge
	local maxX, maxY, maxZ = -math.huge, -math.huge, -math.huge
	for i = 1, #v, 3 do
		minX, maxX = math.min(minX, v[i]), math.max(maxX, v[i])
		minY, maxY = math.min(minY, v[i + 1]), math.max(maxY, v[i + 1])
		minZ, maxZ = math.min(minZ, v[i + 2]), math.max(maxZ, v[i + 2])
	end
	return Vector3.new((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2), Vector3.new(maxX - minX, maxY - minY, maxZ - minZ)
end

-- Uploads one merged group. Yields (CreateMeshPartAsync). Returns nil on any failure.
local function meshPartFromGroup(g): MeshPart?
	local center, size = groupBounds(g)
	local ok, result = pcall(function()
		local em = AssetService:CreateEditableMesh()
		local v, n, uv, shade, tris = g.verts, g.norms, g.uvs, g.shade, g.tris
		local count = #v // 3
		local vids = table.create(count)
		local nids = table.create(count)
		local uvids = table.create(count)
		local cids = if Tuning.Graphics.VertexShading then table.create(count) else nil
		for i = 1, count do
			local o = (i - 1) * 3
			vids[i] = em:AddVertex(Vector3.new(v[o + 1] - center.X, v[o + 2] - center.Y, v[o + 3] - center.Z))
			nids[i] = em:AddNormal(Vector3.new(n[o + 1], n[o + 2], n[o + 3]))
			uvids[i] = em:AddUV(Vector2.new(uv[(i - 1) * 2 + 1], 1 - uv[(i - 1) * 2 + 2]))
			if cids then
				local s = shade[i]
				cids[i] = em:AddColor(Color3.new(s, s, s), 1)
			end
		end
		local flip = Tuning.Graphics.FlipWinding
		for t = 1, #tris, 3 do
			local a, b, c = tris[t], tris[t + 1], tris[t + 2]
			if flip then
				b, c = c, b
			end
			local face = em:AddTriangle(vids[a], vids[b], vids[c])
			em:SetFaceNormals(face, { nids[a], nids[b], nids[c] })
			em:SetFaceUVs(face, { uvids[a], uvids[b], uvids[c] })
			if cids then
				em:SetFaceColors(face, { cids[a], cids[b], cids[c] })
			end
		end
		local mp = AssetService:CreateMeshPartAsync(Content.fromObject(em), {
			CollisionFidelity = Enum.CollisionFidelity.Box,
		})
		return mp
	end)
	if not ok or not result then
		PropBuilder.stats.meshFailures += 1
		if PropBuilder.stats.meshFailures == 1 then
			warn("[PropBuilder] EditableMesh unavailable, using primitive fallback: " .. tostring(result))
		end
		if PropBuilder.stats.meshFailures >= 3 then
			editableAvailable = false
		end
		return nil
	end
	local mp = result :: MeshPart
	mp.Size = Vector3.new(math.max(size.X, 0.05), math.max(size.Y, 0.05), math.max(size.Z, 0.05))
	mp.CFrame = CFrame.new(center)
	mp.Color = Color3.fromHex(g.color)
	mp.Material = material(g.material)
	mp.Transparency = g.transparency
	mp.Reflectance = g.reflectance
	styleVisual(mp, not g.neon and g.transparency < 0.5 and math.max(size.X, size.Y, size.Z) > 2)
	mp:SetAttribute("BaseColor", g.color)
	if g.tag then
		mp:SetAttribute("Tag", g.tag)
		local p = g.pivot
		mp:SetAttribute("Pivot", Vector3.new(p[1], p[2], p[3]))
	end
	return mp
end

local function newModel(name: string, metrics: any): (Model, Part)
	local model = Instance.new("Model")
	model.Name = name
	local hitbox = Instance.new("Part")
	hitbox.Name = "Hitbox"
	hitbox.Size = Vector3.new(math.max(metrics.sx, 0.2), math.max(metrics.sy, 0.2), math.max(metrics.sz, 0.2))
	hitbox.CFrame = CFrame.new(0, metrics.centerY, 0)
	hitbox.PivotOffset = CFrame.new(0, -metrics.centerY, 0)
	hitbox.Transparency = 1
	hitbox.Anchored = true
	hitbox.CanCollide = false
	hitbox.CanQuery = false
	hitbox.CanTouch = false
	hitbox.CastShadow = false
	hitbox.Parent = model
	model.PrimaryPart = hitbox
	return model, hitbox
end

local function weld(hitbox: BasePart, part: BasePart)
	local w = Instance.new("WeldConstraint")
	w.Part0 = hitbox
	w.Part1 = part
	w.Parent = part
end

local function buildFallback(parts: { any }, model: Model, hitbox: BasePart)
	local i = 0
	for _, spec in parts do
		for _, sub in fallbackSpecs(spec) do
			i += 1
			local part = primitive(sub)
			part.Name = "P" .. i
			part.Parent = model
			weld(hitbox, part)
		end
	end
end

-- Build a model from a recipe. Yields when using the mesh path.
local function buildRecipe(name: string, parts: { any }, metrics: any, detail: number): (Model, boolean)
	local model, hitbox = newModel(name, metrics)
	if editableAvailable then
		local groups = MeshAssembly.assemble(parts, Tuning.Graphics.VertexShading, detail)
		local built = {}
		local failed = false
		for gi, g in groups do
			local mp = meshPartFromGroup(g)
			if not mp then
				failed = true
				break
			end
			mp.Name = "M" .. gi
			table.insert(built, mp)
		end
		if not failed then
			for _, mp in built do
				mp.Parent = model
				weld(hitbox, mp)
			end
			return model, true
		end
		for _, mp in built do
			mp:Destroy()
		end
	end
	buildFallback(parts, model, hitbox)
	return model, false
end

local function templateFor(def): Model
	local model, isMesh = buildRecipe(def.id, def.parts, def.metrics, MeshAssembly.detailFor(def.metrics.absorbSize))
	model:SetAttribute("Uid", def.uid)
	if isMesh then
		PropBuilder.stats.meshTemplates += 1
	else
		PropBuilder.stats.fallbackTemplates += 1
	end
	return model
end

-- Ensure a template exists. Yields while building; concurrent callers wait for the same build.
function PropBuilder.template(uid: number): Model?
	local existing = templates[uid]
	if existing then
		return existing
	end
	local def = PropLibrary.get(uid)
	if not def then
		return nil
	end
	if building[uid] then
		while building[uid] do
			task.wait()
		end
		return templates[uid]
	end
	building[uid] = true
	local ok, model = pcall(templateFor, def)
	if not ok then
		warn("[PropBuilder] template " .. def.id .. " failed: " .. tostring(model))
		local fallback, hitbox = newModel(def.id, def.metrics)
		buildFallback(def.parts, fallback, hitbox)
		model = fallback
	end
	templates[uid] = model
	building[uid] = nil
	return model
end

function PropBuilder.hasTemplate(uid: number): boolean
	return templates[uid] ~= nil
end

-- Build templates for many props in the background (current kit first). onProgress(done, total).
function PropBuilder.prepareAsync(uids: { number }, onProgress: ((number, number) -> ())?)
	local total = #uids
	local done = 0
	local perFrame = Tuning.Graphics.TemplatesPerFrame
	for i, uid in uids do
		PropBuilder.template(uid)
		done += 1
		if onProgress then
			onProgress(done, total)
		end
		if i % perFrame == 0 then
			task.wait()
		end
	end
end

-- Build an arbitrary recipe (Nana Nova, hub decor, shop previews). Yields.
function PropBuilder.buildParts(parts: { any }, name: string, detail: number?): Model
	local metrics = PropMetrics.compute(parts, 1)
	local model = buildRecipe(name, parts, metrics, detail or 1)
	-- Pivot at the recipe origin rather than the ground-centred hitbox convention.
	model.PrimaryPart.PivotOffset = CFrame.new(0, -metrics.centerY, 0)
	return model
end

local function lerpColor(a: Color3, b: Color3, t: number): Color3
	return a:Lerp(b, t)
end

local function visualParts(model: Model): { BasePart }
	local out = {}
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") and d.Name ~= "Hitbox" then
			table.insert(out, d)
		end
	end
	return out
end

-- Apply a mutation layer (color tint, material, light, rainbow tag) to a built model.
function PropBuilder.applyMutation(model: Model, mutationIndex: number)
	model:SetAttribute("Mutation", mutationIndex)
	local mut = Mutations.get(mutationIndex)
	if not mut then
		return
	end
	local tint = if mut.color then Color3.fromHex(mut.color) else nil
	for _, d in visualParts(model) do
		if d:GetAttribute("Tag") ~= "eye" then
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
function PropBuilder.applyVariant(model: Model, def, instanceId: number)
	local variant = PropLibrary.variantColor(def, instanceId)
	if not variant then
		return
	end
	local primary = def.parts[1].color
	local color = Color3.fromHex(variant)
	for _, d in visualParts(model) do
		if d:GetAttribute("BaseColor") == primary then
			d.Color = color
		end
	end
end

-- Build a ready-to-place clone. Yields only if the template isn't prepared yet.
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

function PropBuilder.makeStatic(model: Model)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
end

return PropBuilder
