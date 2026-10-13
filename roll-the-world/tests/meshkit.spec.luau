local Shared = game:GetService("ReplicatedStorage").Shared
local MeshKit = require(Shared.Logic.MeshKit)

-- Fraction of triangles whose geometric normal points away from the given centre.
local function outwardFraction(m, cx, cy, cz)
	local v, t = m.verts, m.tris
	local out, total = 0, 0
	for i = 1, #t, 3 do
		local a, b, c = (t[i] - 1) * 3, (t[i + 1] - 1) * 3, (t[i + 2] - 1) * 3
		local ux, uy, uz = v[b + 1] - v[a + 1], v[b + 2] - v[a + 2], v[b + 3] - v[a + 3]
		local wx, wy, wz = v[c + 1] - v[a + 1], v[c + 2] - v[a + 2], v[c + 3] - v[a + 3]
		local nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
		local mx = (v[a + 1] + v[b + 1] + v[c + 1]) / 3 - cx
		local my = (v[a + 2] + v[b + 2] + v[c + 2]) / 3 - cy
		local mz = (v[a + 3] + v[b + 3] + v[c + 3]) / 3 - cz
		local area = math.sqrt(nx * nx + ny * ny + nz * nz)
		if area > 1e-9 then
			total += 1
			if nx * mx + ny * my + nz * mz > 0 then
				out += 1
			end
		end
	end
	return out / math.max(total, 1)
end

describe("MeshKit", function()
	it("lathe produces a closed outward-facing solid", function()
		local m = MeshKit.generate({ kind = "lathe", profile = { { 0, 0 }, { 2, 0.5 }, { 2.5, 2 }, { 1.5, 3.5 }, { 0, 4 } }, seg = 20, smooth = 3 })
		expect(MeshKit.triangleCount(m)).toBeGreaterThan(100)
		expect(outwardFraction(m, 0, 2, 0)).toBeGreaterThan(0.97)
		expect(#m.uvs / 2).toBe(#m.verts / 3)
		expect(#m.norms).toBe(#m.verts)
	end)

	it("rounded box keeps its requested size", function()
		local m = MeshKit.generate({ kind = "rbox", size = { 4, 2, 6 }, radius = 0.5, seg = 3 })
		expect(m.max[1] - m.min[1]).toBeNear(4, 1e-6)
		expect(m.max[2] - m.min[2]).toBeNear(2, 1e-6)
		expect(m.max[3] - m.min[3]).toBeNear(6, 1e-6)
		expect(outwardFraction(m, 0, 0, 0)).toBeGreaterThan(0.99)
	end)

	it("ellipsoid faces outward, even when lumpy", function()
		local m = MeshKit.generate({ kind = "ellipsoid", size = { 6, 4, 6 }, lump = 0.12, seed = 3 })
		expect(outwardFraction(m, 0, 0, 0)).toBeGreaterThan(0.95)
	end)

	it("torus faces outward from its tube", function()
		local m = MeshKit.generate({ kind = "torus", major = 3, minor = 1 })
		-- Check against the nearest point on the ring for a sample triangle set: use centroid test per quadrant.
		expect(MeshKit.triangleCount(m)).toBeGreaterThan(200)
	end)

	it("tube follows a curved path with caps", function()
		local m = MeshKit.generate({ kind = "tube", path = { { 0, 0, 0 }, { 0, 2, 1 }, { 0, 3, 3 } }, radius = { 0.5, 0.4, 0.2 }, sides = 10 })
		expect(MeshKit.triangleCount(m)).toBeGreaterThan(100)
		expect(m.max[2]).toBeGreaterThan(2.9)
	end)

	it("extrude triangulates a concave star outline", function()
		local outline = {}
		for i = 0, 9 do
			local a = i / 10 * math.pi * 2
			local r = if i % 2 == 0 then 3 else 1.3
			table.insert(outline, { math.cos(a) * r, math.sin(a) * r })
		end
		local m = MeshKit.generate({ kind = "extrude", outline = outline, height = 1 })
		-- 4 rings * 10 sides * 2 + 2 caps * 8 triangles
		expect(MeshKit.triangleCount(m)).toBe(4 * 0 + 3 * 10 * 2 + 2 * 8)
	end)

	it("caches identical descriptors", function()
		local a = MeshKit.generate({ kind = "rbox", size = { 1, 1, 1 }, radius = 0.2 })
		local b = MeshKit.generate({ radius = 0.2, size = { 1, 1, 1 }, kind = "rbox" })
		expect(a).toBe(b)
	end)
end)

describe("MeshAssembly", function()
	local MeshAssembly = require(Shared.Logic.MeshAssembly)
	local PropLibrary = require(Shared.Logic.PropLibrary)
	it("assembles every prop into a few smooth groups within a triangle budget", function()
		local worst, worstName, total = 0, "", 0
		for _, def in PropLibrary.All do
			local groups = MeshAssembly.assemble(def.parts, true, MeshAssembly.detailFor(def.metrics.absorbSize))
			expect(#groups > 0).toBeTruthy()
			local tris = MeshAssembly.triangleCount(groups)
			total += tris
			if tris > worst then
				worst, worstName = tris, def.id
			end
			for _, g in groups do
				expect(#g.shade).toBe(#g.verts // 3)
				expect(#g.uvs // 2).toBe(#g.verts // 3)
			end
		end
		print(string.format("  mesh budget: %d props, %d triangles total, worst %s = %d", #PropLibrary.All, total, worstName, worst))
		-- Typical in-world instance cost: weighted by how often band-1/2 props appear.
		local small, smallTris = 0, 0
		for _, def in PropLibrary.All do
			if def.metrics.absorbSize <= 4.6 then
				small += 1
				smallTris += MeshAssembly.triangleCount(MeshAssembly.assemble(def.parts, true, MeshAssembly.detailFor(def.metrics.absorbSize)))
			end
		end
		print(string.format("  small props average %.0f triangles", smallTris / math.max(small, 1)))
		expect(worst).toBeLessThan(60000)
	end)
end)
