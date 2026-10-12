--!strict
-- Global registry of every prop across every World Kit, keyed by permanent uid and by "kit:id".
-- Computes metrics once at load and normalises recipes so every prop's lowest point sits at y = 0.

local Kits = require(script.Parent.Parent.Data.Kits)
local PropMetrics = require(script.Parent.PropMetrics)
local Rarity = require(script.Parent.Parent.Config.Rarity)

export type PropDef = {
	uid: number,
	id: string,
	kitId: string,
	name: string,
	rarity: string,
	tags: { string },
	tagSet: { [string]: boolean },
	hint: string,
	parts: { any },
	variants: { string }?,
	weight: number,
	critter: any?,
	landmark: boolean,
	fill: number,
	metrics: PropMetrics.Metrics,
}

local PropLibrary = {}

PropLibrary.ByUid = {} :: { [number]: PropDef }
PropLibrary.ByKey = {} :: { [string]: PropDef }
PropLibrary.ByKit = {} :: { [string]: { PropDef } }
PropLibrary.All = {} :: { PropDef }
PropLibrary.MaxUid = 0

local function register(kit: any, raw: any)
	assert(type(raw.uid) == "number" and raw.uid > 0 and raw.uid < 4096, "bad uid on " .. tostring(raw.id))
	assert(PropLibrary.ByUid[raw.uid] == nil, "duplicate prop uid " .. raw.uid)
	local metrics = PropMetrics.compute(raw.parts, raw.fill)
	local parts = raw.parts
	if math.abs(metrics.minY) > 1e-3 then
		-- Shift recipe so the prop rests on the ground.
		local shift = -metrics.minY
		local shifted = table.create(#parts)
		for i, p in parts do
			local copy = table.clone(p)
			copy.pos = { p.pos[1], p.pos[2] + shift, p.pos[3] }
			shifted[i] = copy
		end
		parts = shifted
		metrics.centerY += shift
		metrics.minY = 0
	end
	local tagSet = {}
	for _, tag in raw.tags do
		tagSet[tag] = true
	end
	if raw.critter then
		tagSet.critter = true
	end
	local def: PropDef = {
		uid = raw.uid,
		id = raw.id,
		kitId = kit.id,
		name = raw.name,
		rarity = raw.rarity,
		tags = raw.tags,
		tagSet = tagSet,
		hint = raw.hint or "",
		parts = parts,
		variants = raw.variants,
		weight = raw.weight or 1,
		critter = raw.critter,
		landmark = raw.landmark == true,
		fill = raw.fill or 0.55,
		metrics = metrics,
	}
	assert(Rarity.Defs[def.rarity :: any], "bad rarity on " .. def.id)
	PropLibrary.ByUid[def.uid] = def
	PropLibrary.ByKey[kit.id .. ":" .. def.id] = def
	table.insert(PropLibrary.ByKit[kit.id], def)
	table.insert(PropLibrary.All, def)
	PropLibrary.MaxUid = math.max(PropLibrary.MaxUid, def.uid)
end

for _, kit in Kits.List do
	PropLibrary.ByKit[kit.id] = {}
	for _, raw in kit.props do
		register(kit, raw)
	end
end

table.sort(PropLibrary.All, function(a, b)
	return a.uid < b.uid
end)

function PropLibrary.get(uid: number): PropDef?
	return PropLibrary.ByUid[uid]
end

function PropLibrary.find(kitId: string, id: string): PropDef?
	return PropLibrary.ByKey[kitId .. ":" .. id]
end

-- Variant color for a placed prop instance (deterministic from its instance id).
function PropLibrary.variantColor(def: PropDef, instanceId: number): string?
	local variants = def.variants
	if not variants or #variants == 0 then
		return nil
	end
	return variants[(instanceId % #variants) + 1]
end

return PropLibrary
