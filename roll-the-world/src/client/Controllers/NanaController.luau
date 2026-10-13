--!nonstrict
-- Builds Nana Nova (smooth meshes) at her hub anchor and gives her a cosy idle: gentle rocking,
-- head tilts, knitting needles clicking, the galaxy yarn ball slowly turning.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local NanaNova = require(Shared.Data.NanaNova)
local PropBuilder = require(Shared.PropBuilder)

local NanaController = {}

local nana: Model? = nil
local chair: Model? = nil
local base: CFrame = CFrame.new()
local parts, offsets, tags = {}, {}, {}

local function build(anchor: BasePart)
	local ground = anchor.CFrame * CFrame.new(0, -anchor.Size.Y / 2, 0)
	local chairModel = PropBuilder.buildParts(NanaNova.Chair, "NanaChair")
	chairModel:PivotTo(ground)
	chairModel.Parent = Workspace
	local nanaModel = PropBuilder.buildParts(NanaNova.Parts, "NanaNova")
	base = ground * CFrame.new(0, 4.6, -0.3)
	nanaModel:PivotTo(base)
	nanaModel.Parent = Workspace
	chair, nana = chairModel, nanaModel
	local pivot = nanaModel:GetPivot()
	for _, d in nanaModel:GetDescendants() do
		if d:IsA("BasePart") then
			table.insert(parts, d)
			table.insert(offsets, pivot:ToObjectSpace(d.CFrame))
			table.insert(tags, d:GetAttribute("Tag"))
		end
	end
end

local function animate()
	if not nana or not nana.Parent then
		return
	end
	local t = os.clock()
	local rock = math.sin(t * 1.4) * 0.05
	local root = base * CFrame.Angles(rock, 0, 0)
	local cfs = {}
	for i, part in parts do
		local offset = offsets[i]
		local tag = tags[i]
		if tag == "head" then
			offset = CFrame.new(0, 6.5, 0) * CFrame.Angles(math.sin(t * 0.7) * 0.05, math.sin(t * 0.45) * 0.12, math.sin(t * 0.9) * 0.06) * CFrame.new(0, -6.5, 0) * offset
		elseif tag == "needle" then
			offset = offset * CFrame.Angles(0, 0, math.sin(t * 7) * 0.12)
		elseif tag == "arm" then
			offset = CFrame.new(0, 0, math.sin(t * 7) * 0.06) * offset
		elseif tag == "yarn" then
			local center = CFrame.new(0, 3.6, 2.4)
			offset = center * CFrame.Angles(0, t * 0.6, 0) * center:Inverse() * offset
		end
		cfs[i] = root * offset
	end
	Workspace:BulkMoveTo(parts, cfs, Enum.BulkMoveMode.FireCFrameChanged)
	if chair then
		chair:PivotTo(base * CFrame.new(0, -4.6, 0.3) * CFrame.Angles(rock, 0, 0))
	end
end

function NanaController:start()
	task.spawn(function()
		local hub = Workspace:WaitForChild("Hub", 60)
		local anchor = hub and hub:WaitForChild("NanaAnchor", 30)
		if anchor then
			build(anchor)
		end
	end)
	RunService.RenderStepped:Connect(animate)
end

return NanaController
