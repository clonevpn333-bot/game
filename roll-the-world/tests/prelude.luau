-- Test prelude: emulates just enough of the Roblox environment for pure-logic modules,
-- and provides a tiny describe/it/expect framework.

local realRequire = require

-- Virtual instance tree -------------------------------------------------------------------------

local nodes = {}
local function node(pathStr)
	local existing = nodes[pathStr]
	if existing then
		return existing
	end
	local n = { __path = pathStr }
	setmetatable(n, {
		__index = function(self, key)
			if key == "Parent" then
				local parent = pathStr:match("^(.*)/[^/]+$")
				return if parent then node(parent) else nil
			elseif key == "Name" then
				return pathStr:match("([^/]+)$")
			elseif key == "WaitForChild" or key == "FindFirstChild" then
				return function(_, name)
					return node(pathStr .. "/" .. name)
				end
			end
			return node(pathStr .. "/" .. key)
		end,
		__tostring = function()
			return pathStr
		end,
	})
	nodes[pathStr] = n
	return n
end

local shimRequire = function(target)
	if type(target) == "table" and target.__path then
		return realRequire("./" .. target.__path)
	end
	error("test shim: unsupported require target " .. tostring(target))
end
local shimGame = {
	GetService = function(_, name)
		return node(name)
	end,
}

-- Roblox datatype stubs -------------------------------------------------------------------------

local function stubCtor(kind)
	return function(...)
		return { __kind = kind, ... }
	end
end

local Color3 = {
	new = stubCtor("Color3"),
	fromRGB = stubCtor("Color3"),
	fromHex = stubCtor("Color3"),
	fromHSV = stubCtor("Color3"),
}
local Font = { new = stubCtor("Font") }
local UDim = { new = stubCtor("UDim") }
local UDim2 = { new = stubCtor("UDim2"), fromScale = stubCtor("UDim2"), fromOffset = stubCtor("UDim2") }
local TweenInfo = { new = stubCtor("TweenInfo") }
local function enumProxy(prefix)
	return setmetatable({}, {
		__index = function(_, k)
			return enumProxy(prefix .. "." .. k)
		end,
		__tostring = function()
			return prefix
		end,
	})
end
local Enum = enumProxy("Enum")
local warn = function(...)
	print("WARN:", ...)
end
local task = {
	spawn = function(fn, ...)
		local co = coroutine.create(fn)
		coroutine.resume(co, ...)
		return co
	end,
	defer = function(fn, ...)
		fn(...)
	end,
	wait = function()
		return 0
	end,
	cancel = function() end,
}
local typeof = function(v)
	if type(v) == "table" and v.__kind then
		return v.__kind
	end
	return type(v)
end

-- Mini test framework ---------------------------------------------------------------------------

local passed, failed = 0, 0
local failures = {}
local currentSpec = "?"
local prefix = {}

local function describe(name, fn)
	table.insert(prefix, name)
	fn()
	table.remove(prefix)
end

local function it(name, fn)
	local full = currentSpec .. " > " .. table.concat(prefix, " > ") .. " > " .. name
	local ok, err = pcall(fn)
	if ok then
		passed += 1
	else
		failed += 1
		table.insert(failures, full .. "\n    " .. tostring(err))
	end
end

local function fmt(v)
	if type(v) == "string" then
		return string.format("%q", v)
	end
	return tostring(v)
end

local function expect(actual)
	local e = {}
	function e.toBe(expected)
		if actual ~= expected then
			error("expected " .. fmt(expected) .. ", got " .. fmt(actual), 2)
		end
	end
	function e.toBeNear(expected, tolerance)
		if type(actual) ~= "number" or math.abs(actual - expected) > (tolerance or 1e-6) then
			error("expected ~" .. fmt(expected) .. " (+/-" .. tostring(tolerance) .. "), got " .. fmt(actual), 2)
		end
	end
	function e.toBeTruthy()
		if not actual then
			error("expected truthy, got " .. fmt(actual), 2)
		end
	end
	function e.toBeFalsy()
		if actual then
			error("expected falsy, got " .. fmt(actual), 2)
		end
	end
	function e.toBeGreaterThan(n)
		if not (actual > n) then
			error("expected > " .. fmt(n) .. ", got " .. fmt(actual), 2)
		end
	end
	function e.toBeLessThan(n)
		if not (actual < n) then
			error("expected < " .. fmt(n) .. ", got " .. fmt(actual), 2)
		end
	end
	function e.toThrow()
		local ok = pcall(actual)
		if ok then
			error("expected function to throw", 2)
		end
	end
	return e
end

local P = {}

function P.env(virtualPath)
	return node(virtualPath), shimRequire, shimGame, Color3, Font, UDim, UDim2, TweenInfo, Enum, warn, task, typeof, describe, it, expect
end

P.runSpec = function(name, fn)
	currentSpec = name
	local before = passed + failed
	local ok, err = pcall(fn)
	if not ok then
		failed += 1
		table.insert(failures, name .. " (load error)\n    " .. tostring(err))
	elseif passed + failed == before then
		-- A spec that fails to parse can come back from require without running anything.
		failed += 1
		table.insert(failures, name .. " ran no tests (syntax error?)")
	end
end

P.finish = function()
	for _, f in failures do
		print("FAIL " .. f)
	end
	print(string.format("\n%d passed, %d failed", passed, failed))
	if failed > 0 then
		error("tests failed", 0)
	end
end

return P
