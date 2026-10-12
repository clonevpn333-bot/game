--!strict
-- Derives gameplay metrics (bounding box, absorb size, volume, contact radius) from a prop recipe.
-- Pure math so it runs in tests and identically on server and client.

local PropMetrics = {}

export type Metrics = {
	sx: number,
	sy: number,
	sz: number,
	minY: number,
	centerY: number,
	absorbSize: number,
	volume: number,
	contactRadius: number,
	footprint: number, -- radius of the prop's XZ footprint (for placement spacing)
	mainColor: string,
}

-- 3x3 rotation matrix for CFrame.fromEulerAnglesYXZ(rx, ry, rz) = Ry * Rx * Rz (radians).
local function rotationYXZ(rx: number, ry: number, rz: number): { number }
	local cx, sx = math.cos(rx), math.sin(rx)
	local cy, sy = math.cos(ry), math.sin(ry)
	local cz, sz = math.cos(rz), math.sin(rz)
	-- Ry
	local ry11, ry13, ry31, ry33 = cy, sy, -sy, cy
	-- Rx * Rz
	local a11, a12, a13 = cz, -sz, 0
	local a21, a22, a23 = cx * sz, cx * cz, -sx
	local a31, a32, a33 = sx * sz, sx * cz, cx
	-- Ry * (Rx * Rz)
	return {
		ry11 * a11 + ry13 * a31, ry11 * a12 + ry13 * a32, ry11 * a13 + ry13 * a33,
		a21, a22, a23,
		ry31 * a11 + ry33 * a31, ry31 * a12 + ry33 * a32, ry31 * a13 + ry33 * a33,
	}
end

local function mul(a: { number }, b: { number }): { number }
	local out = table.create(9, 0)
	for r = 0, 2 do
		for c = 0, 2 do
			local s = 0
			for k = 0, 2 do
				s += a[r * 3 + k + 1] * b[k * 3 + c + 1]
			end
			out[r * 3 + c + 1] = s
		end
	end
	return out
end

-- Rotation that maps a cylinder's native X axis onto +Y (roll 90 degrees about Z).
local UPRIGHT = rotationYXZ(0, 0, math.pi / 2)

function PropMetrics.partRotation(part: any): { number }
	local rot = part.rot
	local m = if rot then rotationYXZ(math.rad(rot[1]), math.rad(rot[2]), math.rad(rot[3])) else rotationYXZ(0, 0, 0)
	if part.upright then
		m = mul(m, UPRIGHT)
	end
	return m
end

-- Half extents of the axis-aligned bounds of a rotated box.
local function rotatedHalfExtents(m: { number }, hx: number, hy: number, hz: number): (number, number, number)
	return math.abs(m[1]) * hx + math.abs(m[2]) * hy + math.abs(m[3]) * hz,
		math.abs(m[4]) * hx + math.abs(m[5]) * hy + math.abs(m[6]) * hz,
		math.abs(m[7]) * hx + math.abs(m[8]) * hy + math.abs(m[9]) * hz
end

function PropMetrics.compute(parts: { any }, fill: number?): Metrics
	assert(#parts > 0, "prop recipe has no parts")
	local minX, minY, minZ = math.huge, math.huge, math.huge
	local maxX, maxY, maxZ = -math.huge, -math.huge, -math.huge
	local bestVolume, mainColor = -1, "#ffffff"
	for _, part in parts do
		local m = PropMetrics.partRotation(part)
		local hx, hy, hz = part.size[1] / 2, part.size[2] / 2, part.size[3] / 2
		if part.shape == "Ball" and part.size[1] == part.size[2] and part.size[2] == part.size[3] then
			-- Spheres are rotation invariant.
			hx, hy, hz = hx, hx, hx
		end
		local ex, ey, ez = rotatedHalfExtents(m, hx, hy, hz)
		local px, py, pz = part.pos[1], part.pos[2], part.pos[3]
		minX, maxX = math.min(minX, px - ex), math.max(maxX, px + ex)
		minY, maxY = math.min(minY, py - ey), math.max(maxY, py + ey)
		minZ, maxZ = math.min(minZ, pz - ez), math.max(maxZ, pz + ez)
		local v = part.size[1] * part.size[2] * part.size[3]
		if v > bestVolume and not part.neon and part.tag ~= "eye" then
			bestVolume = v
			mainColor = part.color
		end
	end
	local sx, sy, sz = maxX - minX, maxY - minY, maxZ - minZ
	local dims = { sx, sy, sz }
	table.sort(dims, function(a, b)
		return a > b
	end)
	local absorbSize = dims[1] * 0.6 + dims[2] * 0.4
	local f = fill or 0.55
	local halfDiag = 0.5 * math.sqrt(sx * sx + sy * sy + sz * sz)
	return {
		sx = sx,
		sy = sy,
		sz = sz,
		minY = minY,
		centerY = (minY + maxY) / 2,
		absorbSize = absorbSize,
		volume = sx * sy * sz * f,
		-- Fuzzy contact sphere: between the inscribed and circumscribed radius.
		contactRadius = (halfDiag + dims[2] / 2) / 2,
		footprint = 0.5 * math.sqrt(sx * sx + sz * sz),
		mainColor = mainColor,
	}
end

return PropMetrics
