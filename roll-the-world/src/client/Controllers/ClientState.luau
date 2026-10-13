--!nonstrict
-- Client-side store: round snapshot, local player state, local ball, settings-independent facts.
-- Other controllers read from here and listen to its signals.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Signal = require(Shared.Util.Signal)
local Tiers = require(Shared.Config.Tiers)

local ClientState = {}

ClientState.player = Players.LocalPlayer
ClientState.round = ({
	state = "Starting",
	phase = "Scramble",
	endsAt = 0,
	kitId = nil,
	cmPerStud = Tiers.List[1].cmPerStud,
	top = {},
	event = nil,
	landmarkId = 0,
}) :: any
ClientState.playerState = "Loading" -- Loading | Hub | Rolling | Rider | Merged
ClientState.ball = nil :: BasePart? -- local player's physics ball
ClientState.ballModel = nil :: Model?
ClientState.diameter = 3
ClientState.core = "Classic"
ClientState.coreLevel = 1
ClientState.profile = nil
ClientState.lastResults = nil
ClientState.rider = nil -- { hostId, hostBall: Model, burstAt, autoAt, by } while rolled up

ClientState.RoundChanged = Signal.new() -- (round, previous)
ClientState.PlayerStateChanged = Signal.new() -- (state, data)
ClientState.DiameterChanged = Signal.new() -- (new, old)
ClientState.BallChanged = Signal.new() -- (ballPart?)
ClientState.ResultsReceived = Signal.new()
ClientState.ProfileChanged = Signal.new()

function ClientState:serverTime(): number
	return Workspace:GetServerTimeNow()
end

function ClientState:timeLeft(): number
	return math.max(0, self.round.endsAt - self:serverTime())
end

function ClientState:isFinalRoll(): boolean
	return self.round.state == "Playing" and self.round.phase == "FinalRoll"
end

-- The ball the camera should follow: ours, or the one we're stuck to as a rider.
function ClientState:focusBall(): BasePart?
	if self.ball and self.ball.Parent then
		return self.ball
	end
	local host = self.rider and self.rider.hostBall
	local part = host and host:FindFirstChild("Ball")
	if part and part.Parent then
		return part :: BasePart
	end
	return nil
end

function ClientState:isRolling(): boolean
	return self.playerState == "Rolling" and self.ball ~= nil and self.ball.Parent ~= nil
end

function ClientState:absorbContext()
	local event = self.round.event
	return {
		ratioBonus = if event and event.ratioBonus then event.ratioBonus else 0,
		finalRoll = self:isFinalRoll(),
	}
end

local diameterConn

local function bindBall(model: Model?)
	if diameterConn then
		diameterConn:Disconnect()
		diameterConn = nil
	end
	local part = model and (model.PrimaryPart or model:WaitForChild("Ball", 5))
	ClientState.ballModel = model
	ClientState.ball = part
	if part then
		local function update()
			local d = part:GetAttribute("Diameter") or part.Size.X
			local old = ClientState.diameter
			if math.abs(d - old) > 1e-4 then
				ClientState.diameter = d
				ClientState.DiameterChanged:Fire(d, old)
			end
		end
		diameterConn = part:GetAttributeChangedSignal("Diameter"):Connect(update)
		update()
	end
	ClientState.BallChanged:Fire(part)
end

function ClientState:start()
	Net.connect("RoundState", function(snapshot)
		local previous = self.round
		self.round = snapshot
		self.RoundChanged:Fire(snapshot, previous)
	end)
	Net.connect("PlayerState", function(state, data)
		self.playerState = state
		if state == "Rolling" and data then
			self.core = data.core or "Classic"
			self.coreLevel = data.coreLevel or 1
			local model = data.ball
			if not model then
				-- The event can outrun replication of the ball itself; wait for it by name.
				local balls = Workspace:WaitForChild("Balls", 10)
				model = balls and balls:WaitForChild("Ball_" .. self.player.UserId, 10)
			end
			self.rider = nil
			bindBall(model)
		elseif state == "Rider" then
			self.rider = data
			bindBall(nil)
		elseif state ~= "Rolling" then
			self.rider = nil
			bindBall(nil)
		end
		self.PlayerStateChanged:Fire(state, data)
	end)
	self.player:GetAttributeChangedSignal("RollState"):Connect(function()
		local state = self.player:GetAttribute("RollState")
		if state and state ~= self.playerState and state ~= "Rolling" then
			self.playerState = state
			bindBall(nil)
			self.PlayerStateChanged:Fire(state, nil)
		end
	end)
	Net.connect("Results", function(results)
		self.lastResults = results
		self.ResultsReceived:Fire(results)
	end)
	Net.connect("ProfileSync", function(profile)
		self.profile = profile
		self.ProfileChanged:Fire(profile)
	end)
end

return ClientState
