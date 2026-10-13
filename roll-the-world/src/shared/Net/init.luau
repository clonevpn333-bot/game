--!nonstrict
-- Thin networking wrapper. The server creates remotes; clients wait for them.
-- Every client->server entry point goes through `on`/`action`, which enforce argument guards and
-- per-player token-bucket rate limits so handlers only ever see well-formed, throttled input.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Definitions = require(script.Definitions)
local RateLimiter = require(script.Parent.Util.RateLimiter)

local Net = {}

local FOLDER_NAME = "Remotes"
local remotes: { [string]: Instance } = {}
local actionHandlers: { [string]: { guard: (any) -> boolean, fn: (Player, any) -> any, limiter: any } } = {}
local violationCounts: { [Player]: number } = {}

local IS_SERVER = RunService:IsServer()

local function classFor(kind: string): string
	if kind == "Unreliable" then
		return "UnreliableRemoteEvent"
	elseif kind == "Function" then
		return "RemoteFunction"
	end
	return "RemoteEvent"
end

local function getRemote(name: string): any
	local remote = remotes[name]
	if remote then
		return remote
	end
	assert(Definitions[name], "Unknown remote: " .. name)
	if IS_SERVER then
		error("Net.init() must run before using remote " .. name)
	end
	local folder = ReplicatedStorage:WaitForChild(FOLDER_NAME)
	remote = folder:WaitForChild(name)
	remotes[name] = remote
	return remote
end

-- Logs repeated malformed/over-limit traffic once per burst so exploit attempts are visible.
local function flag(player: Player, reason: string)
	local count = (violationCounts[player] or 0) + 1
	violationCounts[player] = count
	if count == 1 or count % 50 == 0 then
		warn(string.format("[Net] %s (%d) rejected: %s (x%d)", player.Name, player.UserId, reason, count))
	end
end

function Net.init()
	if IS_SERVER then
		local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if not folder then
			folder = Instance.new("Folder")
			folder.Name = FOLDER_NAME
			folder.Parent = ReplicatedStorage
		end
		for name, kind in Definitions do
			local remote = folder:FindFirstChild(name)
			if not remote then
				remote = Instance.new(classFor(kind))
				remote.Name = name
				remote.Parent = folder
			end
			remotes[name] = remote
		end
		local requestRemote = remotes.Request :: RemoteFunction
		requestRemote.OnServerInvoke = function(player: Player, action: any, payload: any)
			if type(action) ~= "string" then
				flag(player, "request action type")
				return false, "bad_request"
			end
			local handler = actionHandlers[action]
			if not handler then
				flag(player, "unknown action " .. action:sub(1, 32))
				return false, "unknown_action"
			end
			if not handler.limiter:allow(player) then
				flag(player, "rate " .. action)
				return false, "slow_down"
			end
			if not handler.guard(payload) then
				flag(player, "payload " .. action)
				return false, "bad_payload"
			end
			local ok, result, extra = pcall(handler.fn, player, payload)
			if not ok then
				warn("[Net] action " .. action .. " errored: " .. tostring(result))
				return false, "server_error"
			end
			return result, extra
		end
		Players.PlayerRemoving:Connect(function(player)
			violationCounts[player] = nil
		end)
	end
end

-- SERVER API -------------------------------------------------------------------------------

-- True for real players (bots use lightweight identity tables that duck-type a Player).
function Net.isPlayer(p: any): boolean
	return typeof(p) == "Instance" and p:IsA("Player")
end

function Net.fire(name: string, player: Player, ...)
	if not Net.isPlayer(player) then
		return
	end
	getRemote(name):FireClient(player, ...)
end

function Net.fireAll(name: string, ...)
	getRemote(name):FireAllClients(...)
end

function Net.fireList(name: string, players: { Player }, ...)
	local remote = getRemote(name)
	for _, player in players do
		if player.Parent then
			remote:FireClient(player, ...)
		end
	end
end

function Net.fireExcept(name: string, except: Player, ...)
	local remote = getRemote(name)
	for _, player in Players:GetPlayers() do
		if player ~= except then
			remote:FireClient(player, ...)
		end
	end
end

export type OnOptions = {
	rate: number?, -- calls per second sustained
	burst: number?,
	guards: { (any) -> boolean }?, -- one guard per positional argument
}

function Net.on(name: string, handler: (Player, ...any) -> (), options: OnOptions?)
	local opts = options or {}
	local limiter = RateLimiter.new(opts.rate or 10, opts.burst or (opts.rate or 10) * 2)
	local guards = opts.guards or {}
	local remote = getRemote(name)
	remote.OnServerEvent:Connect(function(player: Player, ...)
		if not limiter:allow(player) then
			flag(player, "rate " .. name)
			return
		end
		local argCount = select("#", ...)
		if argCount > math.max(#guards, 0) then
			flag(player, "arg count " .. name)
			return
		end
		for i, guard in guards do
			if not guard((select(i, ...))) then
				flag(player, "guard " .. name .. "#" .. i)
				return
			end
		end
		handler(player, ...)
	end)
end

-- Register a menu action reachable through the Request RemoteFunction.
function Net.action(name: string, guard: (any) -> boolean, fn: (Player, any) -> any, rate: number?)
	assert(actionHandlers[name] == nil, "Duplicate action " .. name)
	actionHandlers[name] = {
		guard = guard,
		fn = fn,
		limiter = RateLimiter.new(rate or 4, (rate or 4) * 2),
	}
end

-- CLIENT API -------------------------------------------------------------------------------

function Net.connect(name: string, fn: (...any) -> ()): RBXScriptConnection
	local remote = getRemote(name)
	return remote.OnClientEvent:Connect(fn)
end

function Net.send(name: string, ...)
	getRemote(name):FireServer(...)
end

-- Returns (ok/result, extra). Never throws; network errors come back as (false, "network").
function Net.request(action: string, payload: any?): (any, any)
	local remote = getRemote("Request")
	local ok, result, extra = pcall(function()
		return remote:InvokeServer(action, payload)
	end)
	if not ok then
		return false, "network"
	end
	return result, extra
end

return Net
