--!strict
-- The rolling movement model, as pure math (no Roblox types) so it can be measured headless.
-- MovementController calls step() every physics frame; tests/feel.spec.luau measures time to top
-- speed, turn times and stopping distances at every ball size from the same code.

local Tuning = require(script.Parent.Parent.Config.Tuning)
local Growth = require(script.Parent.Growth)

local MovementModel = {}

export type Input = {
	dirX: number, -- desired world direction (magnitude 0..1)
	dirZ: number,
	grounded: boolean,
	dashing: boolean,
	speedMult: number,
}

-- Returns the new horizontal velocity (vx, vz) for one step.
function MovementModel.step(vx: number, vz: number, diameter: number, input: Input, dt: number): (number, number)
	local b = Tuning.Ball
	local maxSpeed = Growth.maxSpeed(diameter) * input.speedMult
	local cap = if input.dashing then maxSpeed * (1 + b.DashBoost) else maxSpeed
	local accel = maxSpeed / Growth.accelTime(diameter)
	if not input.grounded then
		accel *= b.AirControl
	end
	local speed = math.sqrt(vx * vx + vz * vz)
	local inMag = math.sqrt(input.dirX * input.dirX + input.dirZ * input.dirZ)
	local nx, nz
	if inMag > 0.05 then
		local ux, uz = input.dirX / inMag, input.dirZ / inMag
		local strength = math.min(inMag, 1)
		local tx, tz = ux * cap * strength, uz * cap * strength
		local rate = accel
		-- Turn-in: steering against current motion gets extra grip so turns feel crisp.
		if speed > 1 and (vx * ux + vz * uz) / speed < 0.6 then
			rate *= b.TurnAssist
		end
		local dx, dz = tx - vx, tz - vz
		if input.dashing and speed > cap * strength then
			-- Keep dash momentum along the input; only damp the sideways part.
			local along = vx * ux + vz * uz
			local sideX, sideZ = vx - ux * along, vz - uz * along
			local wantAlong = math.max(0, cap * strength - along)
			dx, dz = ux * wantAlong - sideX * 0.5, uz * wantAlong - sideZ * 0.5
		end
		local dmag = math.sqrt(dx * dx + dz * dz)
		local maxStep = rate * dt
		if dmag > maxStep then
			dx, dz = dx / dmag * maxStep, dz / dmag * maxStep
		end
		nx, nz = vx + dx, vz + dz
	else
		-- Coast: exponential brake (a heavy ball rolls a little longer than a pea).
		local brake = if input.grounded then dt / Growth.brakeTime(diameter) * b.BrakeStrength else dt * 0.2
		local k = math.max(0, 1 - brake)
		nx, nz = vx * k, vz * k
	end
	-- Soft cap: momentum above the cap (slopes, bumps, dash) bleeds off instead of snapping.
	local mag = math.sqrt(nx * nx + nz * nz)
	if mag > cap then
		local target = math.max(cap, mag - accel * 1.5 * dt)
		nx, nz = nx / mag * target, nz / mag * target
	end
	return nx, nz
end

-- Hop launch velocity for the given hop height.
function MovementModel.hopVelocity(height: number, gravity: number): number
	return math.sqrt(2 * gravity * height)
end

return MovementModel
