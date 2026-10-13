--!nonstrict
-- Tiny declarative UI helpers for a cohesive, chunky, bouncy look (no default Roblox styling).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Theme = require(ReplicatedStorage.Shared.Config.Theme)

local Ui: any = {}

-- Ui.new("Frame", { Size = ..., [Ui.Children] = {...} })
function Ui.new(className: string, props: { [any]: any }?, children: { Instance }?): any
	local inst: any = Instance.new(className)
	if inst:IsA("GuiObject") then
		(inst :: any).BorderSizePixel = 0
	end
	if inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox") then
		(inst :: any).FontFace = Theme.Font.Bold;
		(inst :: any).TextColor3 = Theme.Color.White;
		(inst :: any).BackgroundTransparency = 1
	end
	local parent = nil
	local propList: { [any]: any } = props or {}
	for k, v in propList do
		if k == "Parent" then
			parent = v
		else
			(inst :: any)[k] = v
		end
	end
	local childList: { Instance } = children or {}
	for _, child in childList do
		child.Parent = inst
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end

function Ui.corner(radius: UDim?): UICorner
	return Ui.new("UICorner", { CornerRadius = radius or Theme.Radius.Medium }) :: UICorner
end

function Ui.stroke(thickness: number?, color: Color3?, mode: Enum.ApplyStrokeMode?): UIStroke
	return Ui.new("UIStroke", {
		Thickness = thickness or Theme.Stroke.Medium,
		Color = color or Theme.Color.Ink,
		ApplyStrokeMode = mode or Enum.ApplyStrokeMode.Contextual,
		LineJoinMode = Enum.LineJoinMode.Round,
	}) :: UIStroke
end

function Ui.padding(px: number): UIPadding
	local u = UDim.new(0, px)
	return Ui.new("UIPadding", { PaddingTop = u, PaddingBottom = u, PaddingLeft = u, PaddingRight = u }) :: UIPadding
end

function Ui.gradient(top: Color3, bottom: Color3, rotation: number?): UIGradient
	return Ui.new("UIGradient", { Color = ColorSequence.new(top, bottom), Rotation = rotation or 90 }) :: UIGradient
end

function Ui.tween(inst: Instance, info: TweenInfo, goals: { [string]: any }): Tween
	local t = TweenService:Create(inst, info, goals)
	t:Play()
	return t
end

-- Big outlined display text (size counter, banners).
function Ui.display(text: string, props: { [any]: any }?): TextLabel
	local label = Ui.new("TextLabel", {
		Text = text,
		FontFace = Theme.Font.Display,
		TextScaled = true,
		TextColor3 = Theme.Color.White,
	}, { Ui.stroke(4, Theme.Color.Ink) })
	local propList: { [any]: any } = props or {}
	for k, v in propList do
		label[k] = v
	end
	return label
end

-- Chunky button with a drop "lip", hover/press bounce and click sound.
function Ui.button(props: { [string]: any }): (TextButton, Frame)
	local color = props.color or Theme.Color.Primary
	local h, s, v = color:ToHSV()
	local dark = Color3.fromHSV(h, math.min(1, s * 1.1), v * 0.72)
	local holder = Ui.new("Frame", {
		Name = props.name or "Button",
		Size = props.size or UDim2.fromOffset(160, 64),
		Position = props.position or UDim2.new(),
		AnchorPoint = props.anchor or Vector2.zero,
		BackgroundColor3 = dark,
		LayoutOrder = props.order or 0,
		Parent = props.parent,
	}, {
		Ui.corner(props.radius or Theme.Radius.Medium),
	}) :: Frame
	local scale = Ui.new("UIScale", { Parent = holder }) :: UIScale
	local button = Ui.new("TextButton", {
		Name = "Face",
		Size = UDim2.new(1, 0, 1, -6),
		BackgroundColor3 = color,
		BackgroundTransparency = 0,
		AutoButtonColor = false,
		Text = props.text or "",
		TextScaled = true,
		FontFace = props.font or Theme.Font.Bold,
		Parent = holder,
	}, {
		Ui.corner(props.radius or Theme.Radius.Medium),
		Ui.stroke(3, Theme.Color.Ink, Enum.ApplyStrokeMode.Border),
		Ui.new("UIGradient", {
			Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(225, 225, 225)),
			Rotation = 90,
		}),
		Ui.new("UIPadding", { PaddingTop = UDim.new(0.14, 0), PaddingBottom = UDim.new(0.14, 0), PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }),
	}) :: TextButton
	local textStroke = Ui.stroke(2.5, Theme.Color.Ink, Enum.ApplyStrokeMode.Contextual)
	textStroke.Parent = button
	button.MouseEnter:Connect(function()
		Ui.tween(scale, Theme.Tween.Quick, { Scale = 1.05 })
	end)
	button.MouseLeave:Connect(function()
		Ui.tween(scale, Theme.Tween.Quick, { Scale = 1 })
		Ui.tween(button, Theme.Tween.Quick, { Position = UDim2.new() })
	end)
	button.MouseButton1Down:Connect(function()
		Ui.tween(scale, Theme.Tween.Quick, { Scale = 0.94 })
		Ui.tween(button, Theme.Tween.Quick, { Position = UDim2.fromOffset(0, 4) })
	end)
	button.MouseButton1Up:Connect(function()
		Ui.tween(scale, Theme.Tween.Pop, { Scale = 1 })
		Ui.tween(button, Theme.Tween.Quick, { Position = UDim2.new() })
	end)
	if props.onClick then
		button.Activated:Connect(function()
			if Ui.onClickSound then
				Ui.onClickSound()
			end
			props.onClick()
		end)
	end
	return button, holder
end

-- A ViewportFrame showing a model, auto-framed. `model` is cloned.
function Ui.viewport(model: Model?, props: { [any]: any }?): ViewportFrame
	local vp = Ui.new("ViewportFrame", {
		BackgroundTransparency = 1,
		Ambient = Color3.fromRGB(200, 190, 220),
		LightColor = Color3.fromRGB(255, 248, 235),
		LightDirection = Vector3.new(-0.6, -1, -0.5),
	})
	local propList: { [any]: any } = props or {}
	for k, v in propList do
		vp[k] = v
	end
	if model then
		Ui.setViewportModel(vp, model)
	end
	return vp
end

function Ui.setViewportModel(vp: ViewportFrame, model: Model, silhouette: boolean?)
	for _, c in vp:GetChildren() do
		if c:IsA("Model") or c:IsA("Camera") or c:IsA("WorldModel") then
			c:Destroy()
		end
	end
	local clone = model:Clone()
	for _, d in clone:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
			if silhouette then
				d.Color = Color3.fromRGB(40, 28, 80)
				d.Material = Enum.Material.SmoothPlastic
			end
		elseif d:IsA("ParticleEmitter") or d:IsA("PointLight") then
			d:Destroy()
		end
	end
	clone:PivotTo(CFrame.new())
	clone.Parent = vp
	local cf, size = clone:GetBoundingBox()
	local radius = math.max(size.Magnitude / 2, 0.2)
	local cam = Instance.new("Camera")
	cam.FieldOfView = 30
	local dir = Vector3.new(0.7, 0.5, 1).Unit
	cam.CFrame = CFrame.lookAt(cf.Position + dir * radius / math.sin(math.rad(15)) * 1.05, cf.Position)
	cam.Parent = vp
	vp.CurrentCamera = cam
end

-- Uniform UI scale so layouts read the same on phones, tablets, PCs and TVs.
function Ui.autoScale(gui: ScreenGui): UIScale
	local scale = Ui.new("UIScale", { Parent = gui }) :: UIScale
	local function update()
		local cam = Workspace.CurrentCamera
		local vs = cam.ViewportSize
		local s = math.clamp(math.min(vs.X / 1280, vs.Y / 760), 0.6, 1.4)
		if game:GetService("GuiService"):IsTenFootInterface() then
			s *= 1.25
		end
		scale.Scale = s
	end
	update()
	Workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(update)
	return scale
end

return Ui
