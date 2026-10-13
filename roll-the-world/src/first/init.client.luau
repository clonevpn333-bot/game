--!nonstrict
-- ReplicatedFirst loader: a tiny branded splash that disappears the moment the game is ready,
-- so players are rolling within seconds instead of staring at a grey screen.

local Players = game:GetService("Players")
local ReplicatedFirst = game:GetService("ReplicatedFirst")
local TweenService = game:GetService("TweenService")

ReplicatedFirst:RemoveDefaultLoadingScreen()

local gui = Instance.new("ScreenGui")
gui.Name = "Splash"
gui.IgnoreGuiInset = true
gui.DisplayOrder = 100
gui.ResetOnSpawn = false

local bg = Instance.new("Frame")
bg.Size = UDim2.fromScale(1, 1)
bg.BackgroundColor3 = Color3.fromRGB(26, 18, 64)
bg.BorderSizePixel = 0
bg.Parent = gui
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new(Color3.fromRGB(60, 40, 130), Color3.fromRGB(20, 12, 48))
gradient.Rotation = 90
gradient.Parent = bg

local title = Instance.new("TextLabel")
title.AnchorPoint = Vector2.new(0.5, 0.5)
title.Position = UDim2.fromScale(0.5, 0.42)
title.Size = UDim2.fromScale(0.7, 0.16)
title.BackgroundTransparency = 1
title.Text = "ROLL THE WORLD"
title.TextScaled = true
title.FontFace = Font.new("rbxasset://fonts/families/LuckiestGuy.json")
title.TextColor3 = Color3.fromRGB(255, 214, 64)
local stroke = Instance.new("UIStroke")
stroke.Thickness = 5
stroke.Color = Color3.fromRGB(38, 26, 74)
stroke.Parent = title
title.Parent = bg

local ball = Instance.new("Frame")
ball.AnchorPoint = Vector2.new(0.5, 0.5)
ball.Position = UDim2.fromScale(0.3, 0.62)
ball.Size = UDim2.fromOffset(54, 54)
ball.BackgroundColor3 = Color3.fromRGB(255, 122, 69)
ball.Parent = bg
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(1, 0)
corner.Parent = ball
local ballStroke = Instance.new("UIStroke")
ballStroke.Thickness = 4
ballStroke.Color = Color3.fromRGB(38, 26, 74)
ballStroke.Parent = ball

gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local rolling = true
task.spawn(function()
	local t = 0
	while rolling do
		t += task.wait()
		local x = 0.3 + (math.sin(t * 1.2) * 0.5 + 0.5) * 0.4
		ball.Position = UDim2.fromScale(x, 0.62)
		ball.Rotation = x * 1440
		local s = 54 + math.sin(t * 2) * 6 + 6
		ball.Size = UDim2.fromOffset(s, s)
	end
end)

if not game:IsLoaded() then
	game.Loaded:Wait()
end
task.wait(0.3)
rolling = false
local info = TweenInfo.new(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
TweenService:Create(bg, info, { BackgroundTransparency = 1 }):Play()
TweenService:Create(title, info, { TextTransparency = 1 }):Play()
TweenService:Create(stroke, info, { Transparency = 1 }):Play()
TweenService:Create(ball, info, { BackgroundTransparency = 1 }):Play()
TweenService:Create(ballStroke, info, { Transparency = 1 }):Play()
task.wait(0.5)
gui:Destroy()
