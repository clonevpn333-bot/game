local Shared = game:GetService("ReplicatedStorage").Shared
local Daily = require(Shared.Logic.Daily)
local Profile = require(Shared.Logic.Profile)
local Cosmetics = require(Shared.Data.Cosmetics)

describe("Login streak", function()
	it("climbs on consecutive days, ignores same-day claims, resets after a gap", function()
		local s = { day = -1, count = 0, best = 0 }
		local today = Daily.dayIndex(1_760_000_000)
		local s1, r1 = Daily.claimStreak(s, today)
		expect(s1 and s1.count).toBe(1)
		expect(r1 and r1.stardust).toBe(100)
		local again = Daily.claimStreak(s1 :: any, today)
		expect(again).toBe(nil)
		local s2 = Daily.claimStreak(s1 :: any, today + 1)
		expect(s2 and s2.count).toBe(2)
		local s3 = Daily.claimStreak(s2 :: any, today + 3)
		expect(s3 and s3.count).toBe(1)
		expect(s3 and s3.best).toBe(2)
	end)

	it("drops exclusive shells that exist", function()
		for day, shell in Daily.StreakShells do
			expect(Daily.streakReward(day).shell).toBe(shell)
			expect(Cosmetics.ById[shell] ~= nil).toBe(true)
			expect(Cosmetics.ById[shell].source).toBe("Streak")
		end
		-- Week two pays more than week one.
		expect(Daily.streakReward(9).stardust).toBeGreaterThan(Daily.streakReward(2).stardust)
	end)
end)

describe("Nana's requests", function()
	it("are deterministic per player and day, one per tier, no duplicate kinds", function()
		for userId = 1, 60 do
			local a = Daily.generate(userId * 7919, 20000 + userId)
			local b = Daily.generate(userId * 7919, 20000 + userId)
			expect(#a).toBe(3)
			local kinds = {}
			for i, r in a do
				expect(r.tier).toBe(i)
				expect(r.kind).toBe(b[i].kind)
				expect(r.target).toBe(b[i].target)
				expect(r.target).toBeGreaterThan(0)
				expect(kinds[r.kind]).toBe(nil)
				kinds[r.kind] = true
				if r.kind == "absorbTag" then
					expect(r.tag ~= nil).toBe(true)
				end
			end
		end
	end)

	it("vary between days", function()
		local distinct = {}
		for day = 1, 30 do
			local list = Daily.generate(12345, 20000 + day)
			distinct[list[1].kind .. list[2].kind .. list[3].kind] = true
		end
		local n = 0
		for _ in distinct do
			n += 1
		end
		expect(n).toBeGreaterThan(8)
	end)

	it("use tags every kit can satisfy", function()
		expect(#Daily.friendlyTags()).toBeGreaterThan(2)
	end)

	it("progress from events and complete exactly once", function()
		local req = { kind = "critters", tier = 1, target = 2, progress = 0, reward = 150, done = false, claimed = false }
		local changed = Daily.apply(req :: any, { kind = "absorb", critter = false })
		expect(changed).toBe(false)
		Daily.apply(req :: any, { kind = "absorb", critter = true })
		local _, completed = Daily.apply(req :: any, { kind = "absorb", critter = true })
		expect(completed).toBe(true)
		local again = Daily.apply(req :: any, { kind = "absorb", critter = true })
		expect(again).toBe(false)
		expect(req.progress).toBe(2)

		local size = { kind = "reachSize", tier = 2, target = 80, progress = 0, reward = 300, done = false, claimed = false }
		Daily.apply(size :: any, { kind = "size", diameter = 50.7 })
		Daily.apply(size :: any, { kind = "size", diameter = 20 })
		expect(size.progress).toBe(50)
	end)

	it("swap gives a different kind of the same tier", function()
		local list = Daily.generate(99, 20500)
		local swapped = Daily.reroll(list, 2, 99, 20500, 0)
		expect(swapped ~= nil).toBe(true)
		if swapped then
			expect(swapped.tier).toBe(2)
			for _, r in list do
				expect(swapped.kind ~= r.kind).toBe(true)
			end
		end
	end)
end)

describe("Profile", function()
	it("reconciles junk and old saves into a valid profile", function()
		local p = Profile.reconcile({ stardust = -50, cores = "nope", cosmetics = { equipped = { shell = "Missing" } }, galaxy = { planets = { a = 1 } } })
		expect(p.stardust).toBe(0)
		expect(p.cores.equipped).toBe("Classic")
		expect(p.cores.owned.Classic).toBe(1)
		expect(p.cosmetics.equipped.shell).toBe("Classic")
		expect(#p.galaxy.planets).toBe(0)
		expect(p.version).toBe(Profile.VERSION)
		local fresh = Profile.reconcile(nil)
		expect(fresh.streak.day).toBe(-1)
		expect(Profile.clientView(fresh).receipts).toBe(nil)
	end)

	it("keeps best and recent planets plus pinned ones", function()
		local planets = {}
		for i = 1, 40 do
			table.insert(planets, { id = i, t = i, d = (i * 37) % 101, kit = "K", tier = 1, colors = {}, props = {}, name = "P", place = 1, pinned = i == 3 })
		end
		local kept = Profile.trimGalaxy(planets :: any)
		expect(#kept).toBeLessThan(22)
		local has3, has40 = false, false
		for _, p in kept do
			has3 = has3 or p.id == 3
			has40 = has40 or p.id == 40
		end
		expect(has3).toBe(true)
		expect(has40).toBe(true)
	end)
end)
