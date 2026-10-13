local Shared = game:GetService("ReplicatedStorage").Shared
local WorldGen = require(Shared.Logic.WorldGen)
local PropLibrary = require(Shared.Logic.PropLibrary)
local Kits = require(Shared.Data.Kits)
local Tuning = require(Shared.Config.Tuning)
local Absorb = require(Shared.Logic.Absorb)

describe("PropLibrary", function()
	it("registers every kit with 40+ props spanning the size ladder", function()
		for _, kit in Kits.List do
			local defs = PropLibrary.ByKit[kit.id]
			expect(#defs >= 40).toBeTruthy()
			local smallest, largest = math.huge, 0
			for _, def in defs do
				if not def.landmark then
					smallest = math.min(smallest, def.metrics.absorbSize)
					largest = math.max(largest, def.metrics.absorbSize)
				end
			end
			-- Something absorbable at the very start, and something big enough for late game.
			expect(smallest).toBeLessThan(Absorb.threshold(Tuning.Ball.StartDiameter))
			expect(largest).toBeGreaterThan(60)
		end
	end)

	it("normalises every recipe so it rests on the ground", function()
		for _, def in PropLibrary.All do
			expect(math.abs(def.metrics.minY) < 1e-3).toBeTruthy()
		end
	end)

	it("has exactly one landmark per kit", function()
		for _, kit in Kits.List do
			local n = 0
			for _, def in PropLibrary.ByKit[kit.id] do
				if def.landmark then
					n += 1
				end
			end
			expect(n).toBe(1)
		end
	end)

	it("keeps uids inside each kit's reserved range", function()
		local ranges = { KitchenCounter = 100, BackyardBBQ = 200, CandyShop = 300 }
		for kitId, base in ranges do
			for _, def in PropLibrary.ByKit[kitId] do
				expect(def.uid >= base and def.uid < base + 100).toBeTruthy()
			end
		end
	end)
end)

describe("WorldGen", function()
	for _, kit in Kits.List do
		it("generates a full map for " .. kit.id, function()
			local result = WorldGen.generate(kit, 12345)
			expect(#result.props).toBeGreaterThan(900)
			expect(#result.spawns).toBe(24)
			expect(result.landmarkId > 0).toBeTruthy()
			local spawnLevel = result.spawnCenter[2]
			-- Plenty of absorbable things right around spawn.
			local nearSpawn = 0
			local startThreshold = Absorb.threshold(Tuning.Ball.StartDiameter)
			for _, p in result.props do
				local def = PropLibrary.ByUid[p.uid]
				local dx, dz = p.x - result.spawnCenter[1], p.z - result.spawnCenter[3]
				if dx * dx + dz * dz < 150 * 150 and def.metrics.absorbSize * p.scale <= startThreshold and math.abs(p.y - spawnLevel) < 1 then
					nearSpawn += 1
				end
			end
			expect(nearSpawn).toBeGreaterThan(120)
			-- Everything inside the arena.
			for _, p in result.props do
				expect(math.abs(p.x) < kit.arenaHalf and math.abs(p.z) < kit.arenaHalf).toBeTruthy()
			end
		end)
	end

	it("is deterministic for a given seed", function()
		local kit = Kits.List[1]
		local a = WorldGen.generate(kit, 777)
		local b = WorldGen.generate(kit, 777)
		expect(#a.props).toBe(#b.props)
		for i = 1, #a.props do
			expect(a.props[i].uid).toBe(b.props[i].uid)
			expect(a.props[i].x).toBe(b.props[i].x)
			expect(a.props[i].z).toBe(b.props[i].z)
		end
	end)

	it("differs between seeds", function()
		local kit = Kits.List[2]
		local a = WorldGen.generate(kit, 1)
		local b = WorldGen.generate(kit, 2)
		expect(a.props[10].x ~= b.props[10].x or a.props[10].uid ~= b.props[10].uid).toBeTruthy()
	end)
end)

describe("First seconds", function()
	it("every spawn point has a pickup within ~1 second and plenty within 5", function()
		local startD = Tuning.Ball.StartDiameter
		local threshold = Absorb.threshold(startD)
		local speed = require(Shared.Logic.Growth).maxSpeed(startD)
		local worstNearest, worstCount = 0, math.huge
		for _, kit in Kits.List do
			for _, seed in { 3, 17, 99 } do
				local result = WorldGen.generate(kit, seed)
				for _, s in result.spawns do
					local nearest, within5s = math.huge, 0
					for _, p in result.props do
						local def = PropLibrary.ByUid[p.uid]
						if def.metrics.absorbSize * p.scale <= threshold and math.abs(p.y - (s[2] - 3)) < 1 then
							local dist = math.sqrt((p.x - s[1]) ^ 2 + (p.z - s[3]) ^ 2)
							nearest = math.min(nearest, dist)
							if dist <= speed * 5 * 0.7 then
								within5s += 1
							end
						end
					end
					worstNearest = math.max(worstNearest, nearest)
					worstCount = math.min(worstCount, within5s)
				end
			end
		end
		print(string.format("  first seconds: worst nearest pickup %.1f studs (%.2fs at top speed), fewest pickups within 5s reach: %d", worstNearest, worstNearest / speed, worstCount))
		expect(worstNearest / speed).toBeLessThan(1.0)
		expect(worstCount).toBeGreaterThan(15)
	end)
end)
