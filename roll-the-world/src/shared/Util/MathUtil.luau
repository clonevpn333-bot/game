--!strict
-- Small numeric helpers shared by client and server.

local MathUtil = {}

function MathUtil.clamp01(x: number): number
	return if x < 0 then 0 elseif x > 1 then 1 else x
end

function MathUtil.lerp(a: number, b: number, t: number): number
	return a + (b - a) * t
end

function MathUtil.inverseLerp(a: number, b: number, v: number): number
	if a == b then
		return 0
	end
	return (v - a) / (b - a)
end

function MathUtil.remap(v: number, a0: number, a1: number, b0: number, b1: number, clamp: boolean?): number
	local t = MathUtil.inverseLerp(a0, a1, v)
	if clamp then
		t = MathUtil.clamp01(t)
	end
	return b0 + (b1 - b0) * t
end

-- Frame-rate independent exponential smoothing factor.
function MathUtil.damp(speed: number, dt: number): number
	return 1 - math.exp(-speed * dt)
end

function MathUtil.smoothstep(t: number): number
	t = MathUtil.clamp01(t)
	return t * t * (3 - 2 * t)
end

function MathUtil.easeOutBack(t: number): number
	local c1 = 1.70158
	local c3 = c1 + 1
	return 1 + c3 * (t - 1) ^ 3 + c1 * (t - 1) ^ 2
end

function MathUtil.easeOutElastic(t: number): number
	if t <= 0 then
		return 0
	elseif t >= 1 then
		return 1
	end
	local c4 = (2 * math.pi) / 3
	return 2 ^ (-10 * t) * math.sin((t * 10 - 0.75) * c4) + 1
end

function MathUtil.sphereVolume(diameter: number): number
	return math.pi / 6 * diameter * diameter * diameter
end

function MathUtil.diameterFromVolume(volume: number): number
	return (6 * math.max(volume, 0) / math.pi) ^ (1 / 3)
end

function MathUtil.round(x: number, step: number?): number
	local s = step or 1
	return math.floor(x / s + 0.5) * s
end

-- Shortest signed angle difference in radians.
function MathUtil.angleDelta(a: number, b: number): number
	local d = (b - a) % (2 * math.pi)
	if d > math.pi then
		d -= 2 * math.pi
	end
	return d
end

-- Evenly distributed unit vectors on a sphere (returned as x, y, z triples).
function MathUtil.fibonacciSphere(count: number): { { number } }
	local points = table.create(count)
	local golden = math.pi * (3 - math.sqrt(5))
	for i = 0, count - 1 do
		local y = 1 - (i / math.max(count - 1, 1)) * 2
		local radius = math.sqrt(math.max(0, 1 - y * y))
		local theta = golden * i
		table.insert(points, { math.cos(theta) * radius, y, math.sin(theta) * radius })
	end
	return points
end

return MathUtil
