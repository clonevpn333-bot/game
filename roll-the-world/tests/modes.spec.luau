local Shared = game:GetService("ReplicatedStorage").Shared
local Modes = require(Shared.Data.Modes)
local Mutators = require(Shared.Data.Mutators)
local Mutations = require(Shared.Data.Mutations)
local ModeScoring = require(Shared.Logic.ModeScoring)
local Tuning = require(Shared.Config.Tuning)

describe("Game modes", function()
	it("are well formed and varied", function()
		local scorings = {}
		for _, m in Modes.List do
			expect(Modes.get(m.id)).toBe(m)
			expect(m.weight).toBeGreaterThan(0)
			expect(m.color:match("^#%x%x%x%x%x%x$") ~= nil).toBe(true)
			expect(#m.description).toBeGreaterThan(10)
			scorings[m.scoring] = true
			local length = m.length or Tuning.Round.Length
			for _, t in m.eventTimes or Tuning.Round.EventTimes do
				expect(t).toBeLessThan(length - Tuning.Round.FinalRoll)
			end
		end
		for _, kind in { "size", "crown", "gold", "team" } do
			expect(scorings[kind]).toBe(true)
		end
		expect(Modes.get("nope").id).toBe("Classic")
	end)

	it("mutators reference real things", function()
		for _, m in Mutators.List do
			expect(Mutators.get(m.id)).toBe(m)
			expect(m.weight).toBeGreaterThan(0)
		end
		expect(Mutations.ById.Golden ~= nil).toBe(true)
	end)

	it("score by the mode's rule", function()
		local a = { userId = 1, finalDiameter = 50, crownTime = 10, goldPoints = 3 }
		local b = { userId = 2, finalDiameter = 30, crownTime = 40, goldPoints = 9 }
		expect(ModeScoring.standings("Classic", { b, a })[1].userId).toBe(1)
		expect(ModeScoring.standings("CrownChase", { a, b })[1].userId).toBe(2)
		expect(ModeScoring.standings("GoldRush", { a, b })[1].userId).toBe(2)
	end)

	it("team standings put the winning team first", function()
		local list = {
			{ userId = 1, finalDiameter = 90, team = "Red" },
			{ userId = 2, finalDiameter = 40, team = "Blue" },
			{ userId = 3, finalDiameter = 70, team = "Blue" },
		}
		expect(ModeScoring.winningTeam("TeamRoll", list)).toBe("Blue")
		local s = ModeScoring.standings("TeamRoll", list)
		expect(s[1].userId).toBe(3)
		expect(s[2].userId).toBe(2)
		expect(s[3].userId).toBe(1)
		expect(ModeScoring.winningTeam("Classic", list)).toBe(nil)
	end)

	it("balances teams", function()
		local counts = { Red = 0, Blue = 0 }
		for _ = 1, 9 do
			local t = ModeScoring.pickTeam(counts)
			counts[t] += 1
		end
		expect(math.abs(counts.Red - counts.Blue)).toBeLessThan(2)
	end)

	it("resolves votes by majority with tie breaks", function()
		expect(ModeScoring.resolveVote(3, { a = 2, b = 2, c = 1 })).toBe(2)
		expect(ModeScoring.resolveVote(3, {})).toBe(1)
		local tie = { a = 1, b = 3 }
		local picks = {}
		for tb = 1, 4 do
			picks[ModeScoring.resolveVote(3, tie, tb)] = true
		end
		expect(picks[1] and picks[3]).toBe(true)
	end)
end)
