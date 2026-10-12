-- Exports prop recipes, Nana Nova and one generated map per kit as JSON (between markers) so
-- tools/preview/render.js can draw previews. Run: SPEC_DIR=tools/preview node tools/test.js
local Shared = game:GetService("ReplicatedStorage").Shared
local PropLibrary = require(Shared.Logic.PropLibrary)
local PropMetrics = require(Shared.Logic.PropMetrics)
local WorldGen = require(Shared.Logic.WorldGen)
local Kits = require(Shared.Data.Kits)
local NanaNova = require(Shared.Data.NanaNova)

local function encode(v)
	local t = type(v)
	if t == "number" then
		if v ~= v or v == math.huge or v == -math.huge then return "0" end
		return string.format("%.4g", v)
	elseif t == "string" then
		return string.format("%q", v)
	elseif t == "boolean" then
		return tostring(v)
	elseif t == "table" then
		if #v > 0 or next(v) == nil then
			local out = {}
			for i, x in v do out[i] = encode(x) end
			return "[" .. table.concat(out, ",") .. "]"
		end
		local out = {}
		for k, x in v do table.insert(out, string.format("%q", tostring(k)) .. ":" .. encode(x)) end
		return "{" .. table.concat(out, ",") .. "}"
	end
	return "null"
end

local function partsOut(parts)
	local out = {}
	for _, p in parts do
		table.insert(out, {
			s = p.shape, z = p.size, p = p.pos, r = PropMetrics.partRotation(p),
			c = p.color, m = p.material or "SmoothPlastic", t = p.transparency or 0, n = p.neon == true,
		})
	end
	return out
end

local props = {}
for _, def in PropLibrary.All do
	props[tostring(def.uid)] = { name = def.name, kit = def.kitId, rarity = def.rarity, size = def.metrics.absorbSize, parts = partsOut(def.parts), variants = def.variants or {} }
end
local maps = {}
for _, kit in Kits.List do
	local r = WorldGen.generate(kit, 4242)
	local placed = {}
	for _, p in r.props do table.insert(placed, { p.uid, p.x, p.y, p.z, p.yaw, p.scale, p.id }) end
	maps[kit.id] = { geometry = r.geometry, props = placed, arenaHalf = r.arenaHalf, spawn = r.spawnCenter, lighting = kit.lighting }
end
print("@@JSON@@" .. encode({ props = props, nana = partsOut(NanaNova.Parts), chair = partsOut(NanaNova.Chair), maps = maps }) .. "@@END@@")
