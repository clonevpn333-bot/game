-- Headless pacing simulation: one ball greedily rolls toward the nearest absorbable prop on a
-- generated map, using the real growth curve, absorb rules and speed curve.
-- Run: SPEC_DIR=tools/sim node tools/test.js <luau>
local Shared = game:GetService("ReplicatedStorage").Shared
local WorldGen = require(Shared.Logic.WorldGen)
local Kits = require(Shared.Data.Kits)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Growth = require(Shared.Logic.Growth)
local Absorb = require(Shared.Logic.Absorb)
local Tuning = require(Shared.Config.Tuning)
local SpatialHash = require(Shared.Util.SpatialHash)

local EFFICIENCY = 0.65 -- fraction of top speed a real player averages while steering
local DT = 0.1
local LENGTH = 450

local startClock = os.clock()
-- First entry = the shipped tuning; add rows to compare alternatives.
local CONFIGS = {
	{ Gain = Tuning.Growth.Gain, EarlyBoost = Tuning.Growth.EarlyBoost, EarlyScale = Tuning.Growth.EarlyScale },
}
for _, cfg in CONFIGS do
for k, v in cfg do Tuning.Growth[k] = v end
print(string.format("Gain %.2f EarlyBoost %.1f EarlyScale %d", cfg.Gain, cfg.EarlyBoost, cfg.EarlyScale))
for _, kit in Kits.List do
	for _, seed in { 11 } do
		local world = WorldGen.generate(kit, seed)
		local hash = SpatialHash.new(32)
		local props = {}
		for _, p in world.props do
			local def = PropLibrary.ByUid[p.uid]
			if not def.landmark then
				props[p.id] = { x = p.x, z = p.z, size = def.metrics.absorbSize * p.scale, vol = def.metrics.volume * p.scale ^ 3, r = def.metrics.contactRadius * p.scale }
				hash:insert(p.id, p.x, p.z, props[p.id].r)
			end
		end
		local d = Tuning.Ball.StartDiameter
		local x, z = world.spawnCenter[1], world.spawnCenter[3]
		local t = 0
		local absorbTimes = {}
		local marks = {}
		local target = nil
		while t < LENGTH do
			t += DT
			local threshold = Absorb.threshold(d) * (if t > LENGTH - 60 then 1 else 1)
			-- Retarget to the nearest absorbable prop (preferring bigger ones a little, like players do).
			if not target or not props[target] then
				target = nil
				local best = math.huge
				local radius = math.max(40, d * 8)
				for _ = 1, 4 do
					for _, id in hash:query(x, z, radius) do
						local p = props[id]
						if p.size <= threshold then
							local dist = math.sqrt((p.x - x) ^ 2 + (p.z - z) ^ 2)
							local score = dist / (0.6 + p.size / threshold)
							if score < best then
								best, target = score, id
							end
						end
					end
					if target then break end
					radius *= 2
				end
			end
			if target then
				local p = props[target]
				local dx, dz = p.x - x, p.z - z
				local dist = math.sqrt(dx * dx + dz * dz)
				local step = Growth.maxSpeed(d) * EFFICIENCY * DT
				if dist > 0 then
					local k = math.min(1, step / dist)
					x += dx * k
					z += dz * k
				end
			end
			-- Absorb everything in contact (also things we roll over on the way).
			for _, id in hash:query(x, z, d / 2 + d * Tuning.Absorb.VacuumReach + 2) do
				local p = props[id]
				if p and p.size <= threshold and math.sqrt((p.x - x) ^ 2 + (p.z - z) ^ 2) <= d / 2 + p.r * 0.75 + Absorb.vacuumReach(d, p.size, threshold) then
					local mult = if t > LENGTH - 60 then Tuning.Growth.FinalRollMultiplier else 1
					d = Growth.grow(d, p.vol, { multiplier = mult })
					props[id] = nil
					hash:remove(id)
					table.insert(absorbTimes, t)
				end
			end
			for _, m in { 10, 30, 60, 120, 240, 360, 450 } do
				if not marks[m] and t >= m then
					marks[m] = d
				end
			end
		end
		local first60 = 0
		local maxGap = 0
		local last = 0
		for _, at in absorbTimes do
			if at <= 60 then
				first60 += 1
				maxGap = math.max(maxGap, at - last)
				last = at
			end
		end
		print(string.format("%-15s seed %-3d | first 60s: %3d absorbs, longest gap %.1fs | D @10s %.1f @30s %.1f @60s %.1f @2m %.1f @4m %.1f @6m %.1f @end %.1f | total %d",
			kit.id, seed, first60, maxGap, marks[10] or 0, marks[30] or 0, marks[60] or 0, marks[120] or 0, marks[240] or 0, marks[360] or 0, marks[450] or d, #absorbTimes))
	end
end
end
