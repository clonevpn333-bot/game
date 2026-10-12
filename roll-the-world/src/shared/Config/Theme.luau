--!strict
-- UI design language: chunky rounded shapes, bold display font, bright high-contrast palette.

local Theme = {}

Theme.Font = {
	Display = Font.new("rbxasset://fonts/families/LuckiestGuy.json", Enum.FontWeight.Regular),
	Bold = Font.new("rbxasset://fonts/families/FredokaOne.json", Enum.FontWeight.Regular),
	Body = Font.new("rbxasset://fonts/families/GothamSSm.json", Enum.FontWeight.Bold),
}

Theme.Color = {
	Ink = Color3.fromRGB(38, 26, 74), -- deep violet used for outlines and text strokes
	InkSoft = Color3.fromRGB(70, 56, 120),
	Paper = Color3.fromRGB(255, 250, 240),
	PaperDim = Color3.fromRGB(238, 230, 255),
	Panel = Color3.fromRGB(255, 255, 255),
	PanelAlt = Color3.fromRGB(245, 239, 255),
	Shadow = Color3.fromRGB(24, 14, 52),
	Primary = Color3.fromRGB(255, 122, 69), -- tangerine
	PrimaryDark = Color3.fromRGB(214, 78, 40),
	Secondary = Color3.fromRGB(77, 196, 255), -- sky
	SecondaryDark = Color3.fromRGB(32, 140, 214),
	Accent = Color3.fromRGB(255, 214, 64), -- sunshine
	AccentDark = Color3.fromRGB(222, 166, 22),
	Good = Color3.fromRGB(88, 214, 116),
	GoodDark = Color3.fromRGB(46, 160, 78),
	Bad = Color3.fromRGB(255, 92, 120),
	BadDark = Color3.fromRGB(204, 48, 84),
	Magic = Color3.fromRGB(176, 108, 255),
	MagicDark = Color3.fromRGB(120, 60, 210),
	Stardust = Color3.fromRGB(255, 220, 110),
	White = Color3.new(1, 1, 1),
	Black = Color3.new(0, 0, 0),
	Overlay = Color3.fromRGB(20, 10, 44),
	Space = Color3.fromRGB(26, 18, 64),
}

Theme.Radius = {
	Small = UDim.new(0, 10),
	Medium = UDim.new(0, 18),
	Large = UDim.new(0, 28),
	Pill = UDim.new(1, 0),
}

Theme.Stroke = {
	Thin = 2,
	Medium = 3,
	Thick = 4,
}

Theme.Tween = {
	Pop = TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
	Quick = TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
	Smooth = TweenInfo.new(0.25, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
	Slow = TweenInfo.new(0.6, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
	Bounce = TweenInfo.new(0.5, Enum.EasingStyle.Elastic, Enum.EasingDirection.Out),
}

-- Kit accent colors for portals, banners and the results screen.
Theme.KitColors = {
	KitchenCounter = Color3.fromRGB(255, 176, 92),
	BackyardBBQ = Color3.fromRGB(120, 206, 96),
	CandyShop = Color3.fromRGB(255, 120, 196),
}

return Theme
