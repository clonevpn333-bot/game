local Shared = game:GetService("ReplicatedStorage").Shared
local Events = require(Shared.Data.Events)
local Mutations = require(Shared.Data.Mutations)
local Monetization = require(Shared.Config.Monetization)
local Tuning = require(Shared.Config.Tuning)

describe("World events", function()
	it("every event is well formed", function()
		local majors, minors = 0, 0
		for _, e in Events.List do
			expect(Events.get(e.id)).toBe(e)
			expect(e.duration).toBeGreaterThan(5)
			expect(e.weight).toBeGreaterThan(0)
			expect(#e.name).toBeGreaterThan(2)
			expect(#e.description).toBeGreaterThan(5)
			expect(e.color:match("^#%x%x%x%x%x%x$") ~= nil).toBe(true)
			if e.mutation then
				expect(Mutations.ById[e.mutation] ~= nil).toBe(true)
			end
			if e.gravityMult then
				expect(e.gravityMult).toBeGreaterThan(0.1)
			end
			-- Every event must actually do something.
			local effect = e.ratioBonus or e.growthMult or e.speedMult or e.gravityMult or e.stardustMult
				or e.mutation or e.meteors or e.stampede or e.giant or e.supplyDrop
			expect(effect ~= nil).toBe(true)
			if e.major then
				majors += 1
			else
				minors += 1
			end
		end
		-- Enough variety that two big events per round don't repeat for a while.
		expect(majors).toBeGreaterThan(#Tuning.Round.EventTimes * 2)
		expect(minors).toBeGreaterThan(1)
	end)

	it("purchasable event products point at real purchasable events", function()
		for _, product in Monetization.Products do
			if product.kind == "ServerEvent" then
				local e = Events.get(product.eventId)
				expect(e ~= nil).toBe(true)
				expect(e and e.purchasable).toBe(true)
			end
		end
	end)

	it("big events fit inside the scramble phase", function()
		local longest = 0
		for _, e in Events.List do
			if e.major then
				longest = math.max(longest, e.duration)
			end
		end
		for _, t in Tuning.Round.EventTimes do
			expect(t + longest).toBeLessThan(Tuning.Round.Length - Tuning.Round.FinalRoll + 1)
		end
	end)
end)
