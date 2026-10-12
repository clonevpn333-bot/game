--!strict
-- Runtime type guards for validating remote payloads from untrusted clients.
-- Every guard returns true only for well-formed, finite, bounded values.

local Guard = {}

export type Check = (value: any) -> boolean

local function isFinite(n: number): boolean
	return n == n and n ~= math.huge and n ~= -math.huge
end

function Guard.number(min: number?, max: number?): Check
	return function(v)
		if type(v) ~= "number" or not isFinite(v) then
			return false
		end
		if min and v < min then
			return false
		end
		if max and v > max then
			return false
		end
		return true
	end
end

function Guard.integer(min: number?, max: number?): Check
	local base = Guard.number(min, max)
	return function(v)
		return base(v) and v == math.floor(v)
	end
end

function Guard.string(maxLen: number): Check
	return function(v)
		return type(v) == "string" and #v <= maxLen and utf8.len(v) ~= nil
	end
end

function Guard.boolean(): Check
	return function(v)
		return type(v) == "boolean"
	end
end

function Guard.oneOf(options: { any }): Check
	local set = {}
	for _, o in options do
		set[o] = true
	end
	return function(v)
		return set[v] == true
	end
end

function Guard.optional(check: Check): Check
	return function(v)
		return v == nil or check(v)
	end
end

function Guard.vector3(maxMagnitude: number?): Check
	return function(v)
		if typeof(v) ~= "Vector3" then
			return false
		end
		if not (isFinite(v.X) and isFinite(v.Y) and isFinite(v.Z)) then
			return false
		end
		if maxMagnitude and v.Magnitude > maxMagnitude then
			return false
		end
		return true
	end
end

function Guard.arrayOf(check: Check, maxLen: number): Check
	return function(v)
		if type(v) ~= "table" then
			return false
		end
		local n = 0
		for k, item in v do
			n += 1
			if type(k) ~= "number" or k ~= math.floor(k) or k < 1 or n > maxLen then
				return false
			end
			if not check(item) then
				return false
			end
		end
		return n == #v
	end
end

-- Validates a flat table shape: { field = check }. Unknown keys are rejected.
function Guard.shape(fields: { [string]: Check }): Check
	return function(v)
		if type(v) ~= "table" then
			return false
		end
		for k in v do
			if type(k) ~= "string" or fields[k] == nil then
				return false
			end
		end
		for key, check in fields do
			if not check(v[key]) then
				return false
			end
		end
		return true
	end
end

function Guard.instanceOf(className: string): Check
	return function(v)
		return typeof(v) == "Instance" and v:IsA(className)
	end
end

return Guard
