--!strict
-- Absorption rules: what can stick to a ball, contact tests, and player-vs-player size checks.
-- Pure functions over numbers so the server, the predicting client and tests agree exactly.

local Tuning = require(script.Parent.Parent.Config.Tuning)

local Absorb = {}

export type Context = {
	ratioBonus: number?, -- added to the absorb ratio (Sticky Rain etc.)
	finalRoll: boolean?,
}

function Absorb.ratio(ctx: Context?): number
	return Tuning.Absorb.Ratio + ((ctx and ctx.ratioBonus) or 0)
end

-- Largest absorbSize a ball of this diameter can pick up.
function Absorb.threshold(diameter: number, ctx: Context?): number
	return diameter * Absorb.ratio(ctx)
end

function Absorb.canAbsorbProp(diameter: number, absorbSize: number, isLandmark: boolean, ctx: Context?): boolean
	if isLandmark then
		if not (ctx and ctx.finalRoll) then
			return false
		end
		return absorbSize <= diameter * Tuning.Absorb.LandmarkReach
	end
	return absorbSize <= Absorb.threshold(diameter, ctx)
end

-- Sphere-vs-fuzzy-sphere contact. `reach` is extra tolerance (latency compensation).
function Absorb.inContact(
	bx: number,
	by: number,
	bz: number,
	ballRadius: number,
	px: number,
	py: number,
	pz: number,
	propRadius: number,
	reach: number
): boolean
	local dx, dy, dz = px - bx, py - by, pz - bz
	local limit = ballRadius + propRadius * (1 - Tuning.Absorb.ContactSlack) + reach
	return dx * dx + dy * dy + dz * dz <= limit * limit
end

-- Distance from point P to segment AB (used to sweep fast balls between server ticks).
function Absorb.segmentDistanceSq(
	ax: number,
	ay: number,
	az: number,
	bx: number,
	by: number,
	bz: number,
	px: number,
	py: number,
	pz: number
): number
	local abx, aby, abz = bx - ax, by - ay, bz - az
	local apx, apy, apz = px - ax, py - ay, pz - az
	local lenSq = abx * abx + aby * aby + abz * abz
	local t = 0
	if lenSq > 1e-9 then
		t = math.clamp((apx * abx + apy * aby + apz * abz) / lenSq, 0, 1)
	end
	local cx, cy, cz = ax + abx * t - px, ay + aby * t - py, az + abz * t - pz
	return cx * cx + cy * cy + cz * cz
end

-- Extra contact reach for props much smaller than the ball (the "vacuum" feel). 0 for props near
-- the threshold, rising to D * VacuumReach for the tiniest crumbs.
function Absorb.vacuumReach(diameter: number, absorbSize: number, threshold: number): number
	local a = Tuning.Absorb
	local limit = threshold * a.VacuumBelow
	if absorbSize >= limit or limit <= 0 then
		return 0
	end
	return diameter * a.VacuumReach * (1 - absorbSize / limit)
end

-- Server-side latency allowance for a ball moving at `speed`.
function Absorb.latencyReach(speed: number): number
	local a = Tuning.Absorb
	return math.min(speed * a.LatencyReachPerSpeed, a.LatencyReachMax)
end

-- Can ball A (diameter da) roll up ball B (diameter db)?
function Absorb.canAbsorbBall(da: number, db: number): boolean
	return da >= db * Tuning.Pvp.AbsorbRatio
end

-- Two balls are "similar size" (eligible to bump rather than absorb).
function Absorb.isBumpPair(da: number, db: number): boolean
	local big, small = math.max(da, db), math.min(da, db)
	return big < small * Tuning.Pvp.AbsorbRatio
end

-- Number of props knocked loose by a bump at the given closing speed.
function Absorb.bumpScatterCount(closingSpeed: number): number
	local p = Tuning.Pvp
	if closingSpeed < p.BumpMinRelativeSpeed then
		return 0
	end
	return math.clamp(math.floor((closingSpeed - p.BumpMinRelativeSpeed) * p.BumpScatterPerSpeed) + 1, 1, p.BumpScatterMax)
end

return Absorb
