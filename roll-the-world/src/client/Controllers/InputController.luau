--!nonstrict
-- All player input in one place. Movement comes from Roblox's own control module (dynamic thumbstick,
-- WASD/arrows, left stick) so it feels native everywhere; actions are bound with ContextActionService.
-- Camera orbit never needs right-click: Q/E, left-drag, one-finger drag (touch), right stick.

local ContextActionService = game:GetService("ContextActionService")
local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Signal = require(ReplicatedStorage.Shared.Util.Signal)

local InputController = {}

InputController.ActionPressed = Signal.new() -- (actionName)
InputController.ZoomChanged = Signal.new() -- (delta)
InputController.InputTypeChanged = Signal.new() -- ("Touch" | "Gamepad" | "Keyboard")
InputController.inputType = "Keyboard"
InputController.orbit = Vector2.zero -- accumulated orbit delta this frame (radians-ish), consumed by camera
InputController.orbitHeld = false
InputController.keyOrbit = 0 -- -1..1 from Q/E or right stick X
InputController.keyPitch = 0
InputController.lastMove = Vector3.zero

local controls = nil
local dragging = false
local dragInput: InputObject? = nil
local lastDragPos: Vector2? = nil

local function detectInputType(input: InputObject)
	local t = input.UserInputType
	local kind
	if t == Enum.UserInputType.Touch then
		kind = "Touch"
	elseif t.Name:find("Gamepad") then
		kind = "Gamepad"
	elseif t == Enum.UserInputType.Keyboard or t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.MouseMovement then
		kind = "Keyboard"
	end
	if kind and kind ~= InputController.inputType then
		InputController.inputType = kind
		InputController.InputTypeChanged:Fire(kind)
	end
end

-- Raw move input in camera space: X = right, Z = back (forward is -Z), magnitude 0..1.
function InputController:getMoveVector(): Vector3
	local v = Vector3.zero
	if controls then
		local ok, result = pcall(function()
			return controls:GetMoveVector()
		end)
		if ok and result then
			v = result
		end
	end
	if v.Magnitude > 1 then
		v = v.Unit
	end
	self.lastMove = v
	return v
end

-- Short rumble on gamepads (and phones that support it). intensity 0..1.
function InputController:rumble(intensity: number, duration: number)
	local HapticService = game:GetService("HapticService")
	local targets = { Enum.UserInputType.Gamepad1, Enum.UserInputType.Touch }
	for _, t in targets do
		local ok, supported = pcall(function()
			return HapticService:IsVibrationSupported(t)
		end)
		if ok and supported then
			pcall(function()
				HapticService:SetMotor(t, Enum.VibrationMotor.Large, math.clamp(intensity, 0, 1))
				HapticService:SetMotor(t, Enum.VibrationMotor.Small, math.clamp(intensity * 0.7, 0, 1))
			end)
			task.delay(duration, function()
				pcall(function()
					HapticService:SetMotor(t, Enum.VibrationMotor.Large, 0)
					HapticService:SetMotor(t, Enum.VibrationMotor.Small, 0)
				end)
			end)
		end
	end
end

-- Called by HUD touch buttons as well as keybinds.
function InputController:press(action: string)
	self.ActionPressed:Fire(action)
end

-- Consume the orbit delta accumulated since the last call.
function InputController:takeOrbit(): Vector2
	local o = self.orbit
	self.orbit = Vector2.zero
	return o
end

local function bindActions()
	ContextActionService:BindActionAtPriority("RTW_Hop", function(_, state)
		if state == Enum.UserInputState.Begin then
			InputController:press("Hop")
		end
		return Enum.ContextActionResult.Sink
	end, false, Enum.ContextActionPriority.High.Value, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
	ContextActionService:BindActionAtPriority("RTW_Dash", function(_, state)
		if state == Enum.UserInputState.Begin then
			InputController:press("Dash")
		end
		return Enum.ContextActionResult.Sink
	end, false, Enum.ContextActionPriority.High.Value, Enum.KeyCode.LeftShift, Enum.KeyCode.RightShift, Enum.KeyCode.ButtonX, Enum.KeyCode.ButtonR2)
	ContextActionService:BindActionAtPriority("RTW_Emote", function(_, state)
		if state == Enum.UserInputState.Begin then
			InputController:press("EmoteWheel")
		end
		return Enum.ContextActionResult.Sink
	end, false, Enum.ContextActionPriority.Medium.Value, Enum.KeyCode.G, Enum.KeyCode.ButtonY)
	ContextActionService:BindActionAtPriority("RTW_Burst", function(_, state)
		if state == Enum.UserInputState.Begin then
			InputController:press("Burst")
		end
		return Enum.ContextActionResult.Pass
	end, false, Enum.ContextActionPriority.Medium.Value, Enum.KeyCode.F, Enum.KeyCode.ButtonB)
end

-- While rolling, Space and Shift belong to us; in the hub they go back to the normal character.
function InputController:setRollingBindings(rolling: boolean)
	if rolling then
		bindActions()
	else
		ContextActionService:UnbindAction("RTW_Hop")
		ContextActionService:UnbindAction("RTW_Dash")
	end
end

function InputController:start()
	local player = Players.LocalPlayer
	task.spawn(function()
		local ok, module = pcall(function()
			local moduleScript: any = player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")
			return (require :: any)(moduleScript)
		end)
		if ok and module then
			controls = module:GetControls()
		else
			warn("[Input] PlayerModule unavailable; movement input disabled")
		end
	end)

	if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
		self.inputType = "Touch"
	elseif UserInputService.GamepadEnabled and GuiService:IsTenFootInterface() then
		self.inputType = "Gamepad"
	end

	UserInputService.InputBegan:Connect(function(input, processed)
		detectInputType(input)
		if processed then
			return
		end
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.MouseButton2 then
			dragging = true
			lastDragPos = Vector2.new(input.Position.X, input.Position.Y)
		elseif t == Enum.UserInputType.Touch then
			-- Touches on the right 60% of the screen orbit the camera (left side is the thumbstick).
			local viewport = workspace.CurrentCamera.ViewportSize
			if input.Position.X > viewport.X * 0.4 and not dragInput then
				dragInput = input
				lastDragPos = Vector2.new(input.Position.X, input.Position.Y)
			end
		elseif input.KeyCode == Enum.KeyCode.Q then
			self.keyOrbit = -1
		elseif input.KeyCode == Enum.KeyCode.E then
			self.keyOrbit = 1
		end
	end)
	UserInputService.InputEnded:Connect(function(input)
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.MouseButton2 then
			dragging = false
			self.orbitHeld = false
		elseif input == dragInput then
			dragInput = nil
			self.orbitHeld = false
		elseif input.KeyCode == Enum.KeyCode.Q and self.keyOrbit < 0 then
			self.keyOrbit = 0
		elseif input.KeyCode == Enum.KeyCode.E and self.keyOrbit > 0 then
			self.keyOrbit = 0
		end
	end)
	UserInputService.InputChanged:Connect(function(input, processed)
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseMovement and dragging and lastDragPos then
			local pos = Vector2.new(input.Position.X, input.Position.Y)
			local delta = pos - lastDragPos
			lastDragPos = pos
			if delta.Magnitude > 0.5 then
				self.orbit += delta
				self.orbitHeld = true
			end
		elseif input == dragInput and lastDragPos then
			local pos = Vector2.new(input.Position.X, input.Position.Y)
			self.orbit += (pos - lastDragPos)
			lastDragPos = pos
			self.orbitHeld = true
		elseif t == Enum.UserInputType.MouseWheel and not processed then
			-- Two-finger scroll on a MacBook trackpad arrives as MouseWheel.
			self.ZoomChanged:Fire(-input.Position.Z)
		elseif input.KeyCode == Enum.KeyCode.Thumbstick2 then
			local x, y = input.Position.X, input.Position.Y
			self.keyOrbit = if math.abs(x) > 0.2 then x else 0
			self.keyPitch = if math.abs(y) > 0.2 then y else 0
		end
	end)
	UserInputService.TouchPinch:Connect(function(_, scale, _, state)
		if state == Enum.UserInputState.Change then
			self.ZoomChanged:Fire((1 - scale) * 4)
		end
	end)
	bindActions()
end

return InputController
