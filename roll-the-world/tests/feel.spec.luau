-- Feel report + guard rails for the movement model. Prints a table of how the ball handles at each
-- size, and fails if any size drifts outside the "feels good" envelope we designed for:
--   * reach ~90% top speed quickly (zippy small, never sluggish big)
--   * reverse direction (180) in well under a second small, under ~1.6s huge
--   * coast a satisfying but controllable distance (in ball diameters)
local Shared = game:GetService("ReplicatedStorage").Shared
local MovementModel = require(Shared.Logic.MovementModel)
local Growth = require(Shared.Logic.Growth)
local Tuning = require(Shared.Config.Tuning)

local DT = 1 / 60
local GRAVITY = 196.2

local function input(x, z)
	return { dirX = x, dirZ = z, grounded = true, dashing = false, speedMult = 1 }
end

local function timeToSpeed(d, frac)
	local vx, vz, t = 0, 0, 0
	local target = Growth.maxSpeed(d) * frac
	while math.sqrt(vx * vx + vz * vz) < target and t < 10 do
		vx, vz = MovementModel.step(vx, vz, d, input(1, 0), DT)
		t += DT
	end
	return t
end

local function reverseTime(d)
	local max = Growth.maxSpeed(d)
	local vx, vz, t = max, 0, 0
	while vx > -max * 0.8 and t < 10 do
		vx, vz = MovementModel.step(vx, vz, d, input(-1, 0), DT)
		t += DT
	end
	return t
end

local function turn90Time(d)
	local max = Growth.maxSpeed(d)
	local vx, vz, t = max, 0, 0
	while t < 10 do
		vx, vz = MovementModel.step(vx, vz, d, input(0, 1), DT)
		t += DT
		local angle = math.deg(math.atan2(vz, vx))
		if angle > 80 then
			break
		end
	end
	return t
end

local function stopDistance(d)
	local vx, vz, dist, t = Growth.maxSpeed(d), 0, 0, 0
	local max = vx
	while vx > max * 0.05 and t < 20 do
		vx, vz = MovementModel.step(vx, vz, d, input(0, 0), DT)
		dist += vx * DT
		t += DT
	end
	return dist, t
end

describe("Movement feel", function()
	it("stays inside the designed envelope at every size", function()
		print("\n   D(studs)  speed  speed(D/s)  t90%   180turn  90turn  coast(D)  coast(s)  hop(D)  air(s)")
		for _, d in { 3, 8, 20, 50, 120, 250 } do
			local max = Growth.maxSpeed(d)
			local t90 = timeToSpeed(d, 0.9)
			local rev = reverseTime(d)
			local t90turn = turn90Time(d)
			local coast, coastT = stopDistance(d)
			local hop = Growth.hopHeight(d)
			local air = 2 * MovementModel.hopVelocity(hop, GRAVITY) / GRAVITY
			print(string.format("   %7.0f  %5.0f  %10.1f  %4.2fs  %6.2fs  %5.2fs  %8.1f  %7.2fs  %6.2f  %5.2f",
				d, max, max / d, t90, rev, t90turn, coast / d, coastT, hop / d, air))
			-- Envelope assertions.
			expect(t90).toBeLessThan(1.1)
			expect(rev).toBeLessThan(if d < 30 then 0.8 else 1.6)
			expect(t90turn).toBeLessThan(if d < 30 then 0.45 else 0.9)
			expect(coast / d).toBeGreaterThan(0.4)
			expect(coast / d).toBeLessThan(if d < 30 then 9 else 4)
			expect(air).toBeGreaterThan(0.35)
		end
		local _ = Tuning
	end)

	it("dash is a real burst and keeps momentum briefly", function()
		local d = 10
		local max = Growth.maxSpeed(d)
		local vx = max * (1 + Tuning.Ball.DashBoost)
		local vz = 0
		local t = 0
		while t < Tuning.Ball.DashDuration do
			vx, vz = MovementModel.step(vx, vz, d, { dirX = 1, dirZ = 0, grounded = true, dashing = true, speedMult = 1 }, DT)
			t += DT
		end
		expect(vx).toBeGreaterThan(max * 1.3)
	end)
end)
