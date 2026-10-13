--!nonstrict
-- Hub-side client behaviour: restores normal walking controls/camera in the hub, keeps the VIP
-- lounge gate solid for non-VIPs (character physics is client-owned, so this is enforced locally),
-- and adds a soft ambient particle drift so the floating island feels alive.

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local HubController = {}

local controllers

function HubController:init(c)
	controllers = c
end

local function setVipGate(hub: Instance)
	local gate = hub:FindFirstChild("VipGate", true)
	if gate and gate:IsA("BasePart") then
		local isVip = Players.LocalPlayer:GetAttribute("VIP") == true
		gate.CanCollide = not isVip
		gate.Transparency = if isVip then 0.85 else 0.6
	end
end

local function ambience(hub: Instance)
	local top = hub:FindFirstChild("Top")
	if not top or not top:IsA("BasePart") then
		return
	end
	-- Emitting straight from the island part spreads motes over its whole volume.
	local motes = Instance.new("ParticleEmitter")
	motes.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	motes.Color = ColorSequence.new(Color3.fromRGB(255, 236, 170), Color3.fromRGB(200, 182, 255))
	motes.LightEmission = 1
	motes.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(0.5, 0.6), NumberSequenceKeypoint.new(1, 0) })
	motes.Lifetime = NumberRange.new(4, 7)
	motes.Rate = 14
	motes.Speed = NumberRange.new(0.5, 1.5)
	motes.SpreadAngle = Vector2.new(180, 180)
	motes.Acceleration = Vector3.new(0, 0.6, 0)
	motes.Shape = Enum.ParticleEmitterShape.Box
	motes.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
	motes.Parent = top
end

function HubController:start()
	task.spawn(function()
		local hub = Workspace:WaitForChild("Hub", 60)
		if hub then
			setVipGate(hub)
			ambience(hub)
			Players.LocalPlayer:GetAttributeChangedSignal("VIP"):Connect(function()
				setVipGate(hub)
			end)
		end
	end)
	local state = controllers.ClientState
	state.PlayerStateChanged:Connect(function(newState)
		if newState == "Hub" and controllers.CameraController then
			controllers.CameraController:setMode("Default")
		end
	end)
end

return HubController
