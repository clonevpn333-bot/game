--!nonstrict
-- Small building blocks shared by the menu panels: cards, progress bars, pills, countdown text and
-- the "stars fly into your Stardust counter" celebration.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Shared = ReplicatedStorage.Shared
local Theme = require(Shared.Config.Theme)
local Format = require(Shared.Util.Format)
local Ui = require(script.Parent.Parent.UI.Ui)

local Common = {}

Common.flyTarget = nil :: GuiObject? -- set by MenuController to the Stardust pill

function Common.card(parent: Instance, props: { [string]: any }?): Frame
	local card = Ui.new("Frame", {
		BackgroundColor3 = Theme.Color.Panel,
		Size = UDim2.new(1, 0, 0, 100),
		Parent = parent,
	}, {
		Ui.corner(Theme.Radius.Medium),
		Ui.stroke(3, Theme.Color.Ink),
	})
	for k, v in (props or {}) :: { [string]: any } do
		card[k] = v
	end
	return card
end

function Common.text(parent: Instance, text: string, props: { [string]: any }?): TextLabel
	local label = Ui.new("TextLabel", {
		Text = text,
		TextScaled = true,
		TextColor3 = Theme.Color.Ink,
		FontFace = Theme.Font.Bold,
		TextXAlignment = Enum.TextXAlignment.Left,
		Size = UDim2.new(1, 0, 0, 24),
		Parent = parent,
	})
	for k, v in (props or {}) :: { [string]: any } do
		label[k] = v
	end
	return label
end

-- Rounded progress bar; returns (frame, setFraction(f, text?)).
function Common.bar(parent: Instance, color: Color3, props: { [string]: any }?)
	local frame = Ui.new("Frame", {
		BackgroundColor3 = Theme.Color.PaperDim,
		Size = UDim2.new(1, 0, 0, 22),
		Parent = parent,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(2, Theme.Color.Ink) })
	for k, v in (props or {}) :: { [string]: any } do
		frame[k] = v
	end
	local fill = Ui.new("Frame", {
		BackgroundColor3 = color,
		Size = UDim2.fromScale(0, 1),
		Parent = frame,
	}, { Ui.corner(Theme.Radius.Pill), Ui.gradient(Color3.new(1, 1, 1), Color3.fromRGB(210, 210, 210)) })
	local label = Ui.new("TextLabel", {
		Size = UDim2.fromScale(1, 1),
		TextScaled = true,
		Text = "",
		ZIndex = 3,
		Parent = frame,
	}, { Ui.stroke(2, Theme.Color.Ink), Ui.new("UIPadding", { PaddingTop = UDim.new(0, 2), PaddingBottom = UDim.new(0, 2) }) })
	local function set(f: number, text: string?)
		f = math.clamp(f, 0, 1)
		Ui.tween(fill, Theme.Tween.Smooth, { Size = UDim2.fromScale(math.max(f, if f > 0 then 0.06 else 0), 1) })
		fill.Visible = f > 0
		label.Text = text or ""
	end
	return frame, set
end

function Common.pill(parent: Instance, text: string, color: Color3, props: { [string]: any }?): (Frame, TextLabel)
	local pill = Ui.new("Frame", {
		BackgroundColor3 = color,
		Size = UDim2.fromOffset(150, 36),
		Parent = parent,
	}, { Ui.corner(Theme.Radius.Pill), Ui.stroke(3, Theme.Color.Ink) })
	for k, v in (props or {}) :: { [string]: any } do
		pill[k] = v
	end
	local label = Ui.new("TextLabel", {
		Text = text,
		Position = UDim2.fromOffset(10, 3),
		Size = UDim2.new(1, -20, 1, -6),
		TextScaled = true,
		FontFace = Theme.Font.Bold,
		Parent = pill,
	}, { Ui.stroke(2, Theme.Color.Ink) })
	return pill, label
end

function Common.stardust(n: number): string
	return "✨ " .. Format.commas(math.floor(n))
end

function Common.countdown(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	local h = seconds // 3600
	local m = (seconds % 3600) // 60
	if h > 0 then
		return string.format("%dh %dm", h, m)
	end
	return string.format("%dm %ds", m, seconds % 60)
end

-- Sets every Text-ish child ZIndex so cards inside panels draw above the panel body.
function Common.raise(root: Instance, z: number)
	if root:IsA("GuiObject") then
		root.ZIndex = z
	end
	for _, d in root:GetDescendants() do
		if d:IsA("GuiObject") then
			d.ZIndex = z
		end
	end
end

-- A burst of ✨ that flies from a source element to the Stardust counter.
function Common.flyStars(from: GuiObject, gui: ScreenGui, count: number?)
	local target = Common.flyTarget
	if not target or not from or not from.Parent then
		return
	end
	local scale = gui:FindFirstChildOfClass("UIScale")
	local s = if scale then scale.Scale else 1
	local a = from.AbsolutePosition + from.AbsoluteSize / 2
	local b = target.AbsolutePosition + Vector2.new(24, target.AbsoluteSize.Y / 2)
	for i = 1, count or 10 do
		local star = Ui.new("TextLabel", {
			Text = "✨",
			AnchorPoint = Vector2.new(0.5, 0.5),
			Size = UDim2.fromOffset(34, 34),
			Position = UDim2.fromOffset(a.X / s, a.Y / s),
			TextScaled = true,
			ZIndex = 200,
			Parent = gui,
		})
		local spread = Vector2.new(math.random(-90, 90), math.random(-70, 40))
		local mid = (a / s) + spread
		task.delay((i - 1) * 0.04, function()
			local t1 = TweenService:Create(star, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = UDim2.fromOffset(mid.X, mid.Y),
			})
			t1:Play()
			t1.Completed:Wait()
			local t2 = TweenService:Create(star, TweenInfo.new(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Position = UDim2.fromOffset(b.X / s, b.Y / s),
				Size = UDim2.fromOffset(18, 18),
			})
			t2:Play()
			t2.Completed:Wait()
			star:Destroy()
		end)
	end
end

return Common
