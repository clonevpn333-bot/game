--!strict
-- 2D (XZ) uniform-grid spatial hash for fast "what is near this ball" queries over thousands of props.
-- Items are referenced by integer id. Each item occupies every cell its bounding circle overlaps.

export type SpatialHash = {
	cellSize: number,
	cells: { [number]: { [number]: boolean } },
	items: { [number]: { x: number, z: number, r: number, cells: { number } } },
	count: number,
	insert: (self: SpatialHash, id: number, x: number, z: number, radius: number) -> (),
	remove: (self: SpatialHash, id: number) -> (),
	move: (self: SpatialHash, id: number, x: number, z: number, radius: number?) -> (),
	query: (self: SpatialHash, x: number, z: number, radius: number, out: { number }?) -> { number },
	has: (self: SpatialHash, id: number) -> boolean,
}

local SpatialHash = {}
SpatialHash.__index = SpatialHash

-- Packs integer cell coords (within +/- 32767) into one number key.
local function key(cx: number, cz: number): number
	return (cx + 32768) * 65536 + (cz + 32768)
end

function SpatialHash.new(cellSize: number): SpatialHash
	return (setmetatable({ cellSize = cellSize, cells = {}, items = {}, count = 0 }, SpatialHash) :: any) :: SpatialHash
end

function SpatialHash.insert(self: any, id: number, x: number, z: number, radius: number)
	if self.items[id] then
		self:remove(id)
	end
	local cs = self.cellSize
	local cellList = {}
	local x0, x1 = math.floor((x - radius) / cs), math.floor((x + radius) / cs)
	local z0, z1 = math.floor((z - radius) / cs), math.floor((z + radius) / cs)
	for cx = x0, x1 do
		for cz = z0, z1 do
			local k = key(cx, cz)
			local cell = self.cells[k]
			if not cell then
				cell = {}
				self.cells[k] = cell
			end
			cell[id] = true
			table.insert(cellList, k)
		end
	end
	self.items[id] = { x = x, z = z, r = radius, cells = cellList }
	self.count += 1
end

function SpatialHash.remove(self: any, id: number)
	local item = self.items[id]
	if not item then
		return
	end
	for _, k in item.cells do
		local cell = self.cells[k]
		if cell then
			cell[id] = nil
			if next(cell) == nil then
				self.cells[k] = nil
			end
		end
	end
	self.items[id] = nil
	self.count -= 1
end

function SpatialHash.move(self: any, id: number, x: number, z: number, radius: number?)
	local item = self.items[id]
	local r = radius or (item and item.r) or 0
	if item then
		local cs = self.cellSize
		-- Skip the rebuild when the occupied cell range is unchanged.
		local same = math.floor((item.x - item.r) / cs) == math.floor((x - r) / cs)
			and math.floor((item.x + item.r) / cs) == math.floor((x + r) / cs)
			and math.floor((item.z - item.r) / cs) == math.floor((z - r) / cs)
			and math.floor((item.z + item.r) / cs) == math.floor((z + r) / cs)
		if same then
			item.x, item.z, item.r = x, z, r
			return
		end
	end
	self:insert(id, x, z, r)
end

-- Returns ids whose bounding circle may intersect the query circle (broad phase, de-duplicated).
function SpatialHash.query(self: any, x: number, z: number, radius: number, out: { number }?): { number }
	local result = out or {}
	local seen = {}
	local cs = self.cellSize
	local x0, x1 = math.floor((x - radius) / cs), math.floor((x + radius) / cs)
	local z0, z1 = math.floor((z - radius) / cs), math.floor((z + radius) / cs)
	for cx = x0, x1 do
		for cz = z0, z1 do
			local cell = self.cells[key(cx, cz)]
			if cell then
				for id in cell do
					if not seen[id] then
						seen[id] = true
						local item = self.items[id]
						local dx, dz = item.x - x, item.z - z
						local reach = item.r + radius
						if dx * dx + dz * dz <= reach * reach then
							table.insert(result, id)
						end
					end
				end
			end
		end
	end
	return result
end

function SpatialHash.has(self: any, id: number): boolean
	return self.items[id] ~= nil
end

return SpatialHash
