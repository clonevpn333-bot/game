local Shared = game:GetService("ReplicatedStorage").Shared
local Progression = require(Shared.Logic.Progression)
local Achievements = require(Shared.Data.Achievements)
local Titles = require(Shared.Data.Titles)
local Cosmetics = require(Shared.Data.Cosmetics)
local Events = require(Shared.Data.Events)
local Kits = require(Shared.Data.Kits)

describe("Levels", function()
	it("level curve is monotonic and round-trips", function()
		local xp = 0
		for level = 1, 60 do
			local l, into = Progression.levelFromXp(xp)
			expect(l).toBe(level)
			expect(into).toBe(0)
			xp += Progression.xpToNext(level)
		end
		local l, into, need = Progression.levelFromXp(Progression.xpToNext(1) + 10)
		expect(l).toBe(2)
		expect(into).toBe(10)
		expect(need).toBe(Progression.xpToNext(2))
	end)

	it("a decent round levels a new player up quickly", function()
		local xp = Progression.roundXp({ finalDiameter = 120, placement = 2, players = 8, discoveries = 10, playersRolled = 1 })
		expect(xp).toBeGreaterThan(Progression.xpToNext(1))
		-- ...but level 20 takes real play (dozens of rounds).
		local total = 0
		for level = 1, 19 do
			total += Progression.xpToNext(level)
		end
		expect(total / xp).toBeGreaterThan(25)
	end)

	it("every level rewards something and milestone rewards exist", function()
		for level = 2, 60 do
			local r = Progression.levelReward(level)
			expect(r.stardust).toBeGreaterThan(0)
			if r.shell then
				expect(Cosmetics.ById[r.shell] ~= nil).toBe(true)
				expect(Cosmetics.ById[r.shell].source).toBe("Level")
			end
			if r.title then
				expect(Titles.ById[r.title] ~= nil).toBe(true)
			end
		end
		local nextLevel = Progression.nextBigReward(1)
		expect(nextLevel ~= nil).toBe(true)
	end)
end)

describe("Achievements", function()
	it("reference real titles and shells", function()
		for _, a in Achievements.List do
			expect(a.goal).toBeGreaterThan(0)
			if a.title then
				expect(Titles.ById[a.title] ~= nil).toBe(true)
			end
			if a.shell then
				expect(Cosmetics.ById[a.shell] ~= nil).toBe(true)
			end
		end
	end)

	it("unlock from profile stats once", function()
		local profile = { stats = { rounds = 1, wins = 0, absorbed = 1200 }, achievements = {} }
		local got = Progression.newAchievements(profile)
		local ids = {}
		for _, a in got do
			ids[a.id] = true
			profile.achievements[a.id] = true
		end
		expect(ids.FirstRound).toBe(true)
		expect(ids.Absorb1k).toBe(true)
		expect(ids.FirstWin).toBe(nil)
		expect(#Progression.newAchievements(profile)).toBe(0)
	end)
end)

describe("Rolledex sets", function()
	it("every map has several finishable sets", function()
		local perKit = {}
		for _, set in Progression.sets() do
			perKit[set.kitId] = (perKit[set.kitId] or 0) + 1
			expect(#set.uids >= 4 and #set.uids <= 8).toBe(true)
			expect(set.reward).toBeGreaterThan(0)
		end
		for _, kit in Kits.List do
			expect((perKit[kit.id] or 0) >= 3).toBe(true)
			expect(Titles.ForKit[kit.id] ~= nil).toBe(true)
		end
	end)

	it("progress counts discovered members", function()
		local set = Progression.sets()[1]
		local found = { [set.uids[1]] = true, [set.uids[2]] = true }
		expect(Progression.setProgress(set, function(u)
			return found[u] == true
		end)).toBe(2)
		expect(#Progression.setsForUid(set.uids[1]) >= 1).toBe(true)
	end)
end)

describe("Golden Runner", function()
	it("is a minor event", function()
		local e = Events.get("GoldenRunner")
		expect(e ~= nil).toBe(true)
		expect(e and e.major).toBe(false)
	end)
end)
