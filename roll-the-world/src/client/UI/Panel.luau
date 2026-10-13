--!nonstrict
-- Modal panel shell shared by every menu (Nana's board, Rolledex, Shop, Galaxy, streak popup):
-- dimmed backdrop, chunky card with a colored header, icon + title, close button, bouncy open and
-- close, Escape / backdrop-click to close. Only one panel is open at a time.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Theme = require(ReplicatedStorage.Shared.Config.Theme)
local Signal = require(ReplicatedStorage.Shared.Util.Signal)
local Ui = require(script.Parent.Ui)

local Panel = {}
Panel.__index = Panel

local openPanel = nil
Panel.Opened = Signal.new() -- (panel)
Panel.Closed = Signal.new() -- (panel)

export type Options = {
	name: string,
	title: string,
	icon: string,
	color: Color3,
	size: Vector2?,
	parent: Instance,
	dismissable: boolean?, -- default true
}

function Panel.new(opts: Options)
	local self = setmetatable({}, Panel)
	self.name = opts.name
	self.isOpen = false
	self.Opened = Signal.new()
	self.Closed = Signal.new()
	local size = opts.size or Vector2.new(760, 520)
	self.backdrop = Ui.new("TextButton", {
		Name = opts.name .. "Backdrop",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Theme.Color.Overlay,
		BackgroundTransparency = 1,
		AutoButtonColor = false,
		Text = "",
		Visible = false,
		ZIndex = 50,
		Parent = opts.parent,
	})
	self.card = Ui.new("Frame", {
		Name = opts.name,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.52),
		Size = UDim2.fromOffset(size.X, size.Y),
		BackgroundColor3 = Theme.Color.PanelAlt,
		ZIndex = 51,
		Visible = false,
		Parent = opts.parent,
	}, {
		Ui.corner(Theme.Radius.Large),
		Ui.stroke(4, Theme.Color.Ink),
		Ui.new("UISizeConstraint", { MaxSize = Vector2.new(size.X, size.Y) }),
	})
	self.scale = Ui.new("UIScale", { Scale = 1, Parent = self.card })
	local header = Ui.new("Frame", {
		Name = "Header",
		Size = UDim2.new(1, 0, 0, 70),
		BackgroundColor3 = opts.color,
		ZIndex = 52,
		Parent = self.card,
	}, {
		Ui.corner(Theme.Radius.Large),
		Ui.gradient(Color3.new(1, 1, 1), Color3.fromRGB(215, 215, 215)),
	})
	-- Square off the header's bottom corners.
	Ui.new("Frame", {
		Position = UDim2.new(0, 0, 1, -24),
		Size = UDim2.new(1, 0, 0, 24),
		BackgroundColor3 = opts.color,
		ZIndex = 52,
		Parent = header,
	}, { Ui.gradient(Color3.fromRGB(235, 235, 235), Color3.fromRGB(215, 215, 215)) })
	Ui.new("TextLabel", {
		Text = opts.icon,
		Position = UDim2.fromOffset(16, 8),
		Size = UDim2.fromOffset(54, 54),
		TextScaled = true,
		ZIndex = 53,
		Parent = header,
	})
	self.titleLabel = Ui.new("TextLabel", {
		Text = opts.title,
		Position = UDim2.fromOffset(80, 10),
		Size = UDim2.new(1, -170, 0, 50),
		TextScaled = true,
		FontFace = Theme.Font.Display,
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 53,
		Parent = header,
	}, { Ui.stroke(3, Theme.Color.Ink) })
	self.headerRight = Ui.new("Frame", {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -78, 0, 14),
		Size = UDim2.fromOffset(220, 42),
		BackgroundTransparency = 1,
		ZIndex = 53,
		Parent = header,
	})
	local _, closeHolder = Ui.button({
		text = "✕",
		size = UDim2.fromOffset(50, 50),
		position = UDim2.new(1, -62, 0, 9),
		color = Theme.Color.Bad,
		radius = Theme.Radius.Pill,
		parent = header,
		onClick = function()
			self:close()
		end,
	})
	closeHolder.ZIndex = 54
	self.body = Ui.new("Frame", {
		Name = "Body",
		Position = UDim2.fromOffset(16, 82),
		Size = UDim2.new(1, -32, 1, -96),
		BackgroundTransparency = 1,
		ZIndex = 52,
		Parent = self.card,
	})
	if opts.dismissable ~= false then
		self.backdrop.Activated:Connect(function()
			self:close()
		end)
	end
	return self
end

function Panel:setTitle(text: string)
	self.titleLabel.Text = text
end

function Panel:open()
	if self.isOpen then
		return
	end
	if openPanel and openPanel ~= self then
		openPanel:close(true)
	end
	openPanel = self
	self.isOpen = true
	self.backdrop.Visible = true
	self.card.Visible = true
	self.backdrop.BackgroundTransparency = 1
	Ui.tween(self.backdrop, Theme.Tween.Smooth, { BackgroundTransparency = 0.45 })
	self.scale.Scale = 0.6
	Ui.tween(self.scale, Theme.Tween.Pop, { Scale = 1 })
	self.Opened:Fire()
	Panel.Opened:Fire(self)
end

function Panel:close(instant: boolean?)
	if not self.isOpen then
		return
	end
	self.isOpen = false
	if openPanel == self then
		openPanel = nil
	end
	if instant then
		self.backdrop.Visible = false
		self.card.Visible = false
	else
		Ui.tween(self.backdrop, Theme.Tween.Quick, { BackgroundTransparency = 1 })
		local t = Ui.tween(self.scale, Theme.Tween.Quick, { Scale = 0.7 })
		t.Completed:Once(function()
			if not self.isOpen then
				self.backdrop.Visible = false
				self.card.Visible = false
			end
		end)
	end
	self.Closed:Fire()
	Panel.Closed:Fire(self)
end

function Panel:toggle()
	if self.isOpen then
		self:close()
	else
		self:open()
	end
end

function Panel.current()
	return openPanel
end

function Panel.closeAll()
	if openPanel then
		openPanel:close()
	end
end

-- A vertical/grid scrolling area inside a panel body.
function Panel.scroller(parent: Instance, props: { [string]: any }?): ScrollingFrame
	local frame = Ui.new("ScrollingFrame", {
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		ScrollBarThickness = 8,
		ScrollBarImageColor3 = Theme.Color.InkSoft,
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		ZIndex = 52,
		Parent = parent,
	})
	for k, v in (props or {}) :: { [string]: any } do
		frame[k] = v
	end
	return frame
end

UserInputService.InputBegan:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.Escape or input.KeyCode == Enum.KeyCode.ButtonB then
		if openPanel then
			openPanel:close()
		end
	end
end)

return Panel
