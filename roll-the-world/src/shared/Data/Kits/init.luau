--!strict
-- World Kit registry. Adding a kit = add a data module here + a prop library. No code changes.

local Kits = {}

Kits.List = {
	require(script.KitchenCounter),
	require(script.BackyardBBQ),
	require(script.CandyShop),
} :: { any }

Kits.ById = {} :: { [string]: any }
for _, kit in Kits.List do
	assert(Kits.ById[kit.id] == nil, "duplicate kit id " .. kit.id)
	Kits.ById[kit.id] = kit
end

function Kits.get(id: string): any
	return Kits.ById[id]
end

function Kits.forTier(tier: number): { any }
	local out = {}
	for _, kit in Kits.List do
		if kit.tier == tier then
			table.insert(out, kit)
		end
	end
	return out
end

return Kits
