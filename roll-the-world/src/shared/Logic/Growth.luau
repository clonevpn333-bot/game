--!strict
-- The growth curve. The ball's size is its volume; absorbing adds volume, diameter follows.
-- Early growth is boosted so a brand-new ball visibly swells within seconds, and the boost fades
-- smoothly so late growth stays steady rather than exploding.

local Tuning = require(script.Parent.Parent.Config.Tuning)
local MathUtil = require(script.Parent.Parent.Util.MathUtil)

local Growth = {}

export type Modifiers = {
	multiplier: number?, -- product of event/final roll/comeback/merge multipliers
}

function Growth.earlyBoost(diameter: number): number
	local g = Tuning.Growth
	return 1 + g.EarlyBoost * math.exp(-diameter / g.EarlyScale)
end

-- Volume (cubic studs) a prop contributes when absorbed, before ball-side multipliers.
function Growth.propVolume(baseVolume: number, scale: number): number
	return baseVolume * scale * scale * scale
end

-- Returns the ball's new diameter after absorbing `volume` of stuff.
function Growth.grow(diameter: number, volume: number, mods: Modifiers?): number
	local g = Tuning.Growth
	local mult = (mods and mods.multiplier) or 1
	local gained = volume * g.Gain * Growth.earlyBoost(diameter) * mult
	local newVolume = MathUtil.sphereVolume(diameter) + gained
	return math.min(MathUtil.diameterFromVolume(newVolume), Tuning.Ball.MaxDiameter)
end

-- Removes volume (knocked-off props, burst riders) without going below the start size.
function Growth.shrink(diameter: number, volume: number): number
	local newVolume = math.max(MathUtil.sphereVolume(diameter) - volume, MathUtil.sphereVolume(Tuning.Ball.StartDiameter))
	return MathUtil.diameterFromVolume(newVolume)
end

-- Diameter after absorbing another player's ball of diameter `otherDiameter`.
function Growth.absorbBall(diameter: number, otherDiameter: number, mods: Modifiers?): number
	local share = Tuning.Growth.PlayerVolumeShare
	local mult = (mods and mods.multiplier) or 1
	-- Player volume is not affected by the early boost; it is already a big, earned chunk.
	local newVolume = MathUtil.sphereVolume(diameter) + MathUtil.sphereVolume(otherDiameter) * share * mult
	return math.min(MathUtil.diameterFromVolume(newVolume), Tuning.Ball.MaxDiameter)
end

-- Combined diameter of two merged balls.
function Growth.merge(a: number, b: number): number
	return MathUtil.diameterFromVolume(MathUtil.sphereVolume(a) + MathUtil.sphereVolume(b))
end

-- Split a merged ball back into two by volume share (0..1 for the first ball).
function Growth.split(diameter: number, shareA: number): (number, number)
	local v = MathUtil.sphereVolume(diameter)
	local minV = MathUtil.sphereVolume(Tuning.Ball.StartDiameter)
	local va = math.max(v * shareA, minV)
	local vb = math.max(v * (1 - shareA), minV)
	return MathUtil.diameterFromVolume(va), MathUtil.diameterFromVolume(vb)
end

-- Max ground speed for a ball of diameter D.
function Growth.maxSpeed(diameter: number): number
	local b = Tuning.Ball
	return b.SpeedBase * (math.max(diameter, b.StartDiameter) / b.StartDiameter) ^ b.SpeedExponent
end

-- 0 at start size, 1 at HugeDiameter (log-scaled), used to interpolate "feel" parameters.
function Growth.sizeAlpha(diameter: number): number
	local b = Tuning.Ball
	return MathUtil.clamp01(math.log(math.max(diameter, b.StartDiameter) / b.StartDiameter) / math.log(b.HugeDiameter / b.StartDiameter))
end

function Growth.accelTime(diameter: number): number
	local b = Tuning.Ball
	return MathUtil.lerp(b.AccelTimeSmall, b.AccelTimeHuge, Growth.sizeAlpha(diameter))
end

function Growth.brakeTime(diameter: number): number
	local b = Tuning.Ball
	return MathUtil.lerp(b.BrakeTimeSmall, b.BrakeTimeHuge, Growth.sizeAlpha(diameter))
end

function Growth.hopHeight(diameter: number): number
	local b = Tuning.Ball
	return math.max(b.HopMin, diameter * b.HopPerDiameter)
end

-- Avatar scale so the Roller stays proportional to the ball.
function Growth.riderScale(diameter: number): number
	local b = Tuning.Ball
	-- A default avatar is ~5 studs tall at scale 1.
	return math.clamp(diameter * b.RiderHeightFraction / 5, b.RiderScaleMin, b.RiderScaleMax)
end

return Growth
