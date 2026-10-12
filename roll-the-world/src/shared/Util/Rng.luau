--!strict
-- Deterministic, platform-independent PRNG (xoshiro128**). Used by world generation and request
-- generation so the same seed always yields the same result on server, client and in tests.

export type Rng = {
	nextU32: (self: Rng) -> number,
	float: (self: Rng) -> number,
	range: (self: Rng, lo: number, hi: number) -> number,
	int: (self: Rng, lo: number, hi: number) -> number,
	chance: (self: Rng, p: number) -> boolean,
	pick: <T>(self: Rng, list: { T }) -> T,
	weighted: <T>(self: Rng, list: { T }, weightOf: (T) -> number) -> T?,
	shuffle: <T>(self: Rng, list: { T }) -> { T },
	gauss: (self: Rng) -> number,
	fork: (self: Rng, salt: number) -> Rng,
}

local Rng = {}
Rng.__index = Rng

local band, bor, bxor, lshift, rshift = bit32.band, bit32.bor, bit32.bxor, bit32.lshift, bit32.rshift

local function rotl(x: number, k: number): number
	return bor(lshift(x, k), rshift(x, 32 - k))
end

-- 32-bit multiply mod 2^32 without losing precision in doubles.
local function mul32(a: number, b: number): number
	local aHi, aLo = rshift(a, 16), band(a, 0xFFFF)
	local bHi, bLo = rshift(b, 16), band(b, 0xFFFF)
	local lo = aLo * bLo
	local mid = band(aHi * bLo + aLo * bHi, 0xFFFF)
	return band(lo + lshift(mid, 16), 0xFFFFFFFF)
end

local function splitmix(state: number): (number, number)
	state = band(state + 0x9E3779B9, 0xFFFFFFFF)
	local z = state
	z = mul32(bxor(z, rshift(z, 16)), 0x85EBCA6B)
	z = mul32(bxor(z, rshift(z, 13)), 0xC2B2AE35)
	z = bxor(z, rshift(z, 16))
	return state, z
end

function Rng.new(seed: number): Rng
	local s = band(math.floor(math.abs(seed)) % 4294967296, 0xFFFFFFFF)
	local a, b, c, d
	s, a = splitmix(s)
	s, b = splitmix(s)
	s, c = splitmix(s)
	s, d = splitmix(s)
	if a == 0 and b == 0 and c == 0 and d == 0 then
		a = 1
	end
	return (setmetatable({ _s0 = a, _s1 = b, _s2 = c, _s3 = d }, Rng) :: any) :: Rng
end

function Rng.nextU32(self: any): number
	local s0, s1, s2, s3 = self._s0, self._s1, self._s2, self._s3
	local result = mul32(rotl(mul32(s1, 5), 7), 9)
	local t = lshift(s1, 9)
	s2 = bxor(s2, s0)
	s3 = bxor(s3, s1)
	s1 = bxor(s1, s2)
	s0 = bxor(s0, s3)
	s2 = bxor(s2, t)
	s3 = rotl(s3, 11)
	self._s0, self._s1, self._s2, self._s3 = s0, s1, s2, s3
	return result
end

function Rng.float(self: any): number
	return self:nextU32() / 4294967296
end

function Rng.range(self: any, lo: number, hi: number): number
	return lo + (hi - lo) * self:float()
end

function Rng.int(self: any, lo: number, hi: number): number
	if hi < lo then
		lo, hi = hi, lo
	end
	return lo + (self:nextU32() % (hi - lo + 1))
end

function Rng.chance(self: any, p: number): boolean
	return self:float() < p
end

function Rng.pick(self: any, list)
	assert(#list > 0, "Rng.pick on empty list")
	return list[self:int(1, #list)]
end

function Rng.weighted(self: any, list, weightOf)
	local total = 0
	for _, item in list do
		total += math.max(0, weightOf(item))
	end
	if total <= 0 then
		return nil
	end
	local roll = self:float() * total
	for _, item in list do
		roll -= math.max(0, weightOf(item))
		if roll <= 0 then
			return item
		end
	end
	return list[#list]
end

function Rng.shuffle(self: any, list)
	for i = #list, 2, -1 do
		local j = self:int(1, i)
		list[i], list[j] = list[j], list[i]
	end
	return list
end

function Rng.gauss(self: any): number
	local u1 = math.max(self:float(), 1e-9)
	local u2 = self:float()
	return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
end

function Rng.fork(self: any, salt: number): Rng
	return Rng.new(bxor(self:nextU32(), band(math.floor(salt * 2654435761) % 4294967296, 0xFFFFFFFF)))
end

-- Stable string hash (FNV-1a) for seeding from ids.
function Rng.hashString(str: string): number
	local h = 0x811C9DC5
	for i = 1, #str do
		h = bxor(h, string.byte(str, i))
		h = mul32(h, 0x01000193)
	end
	return h
end

return Rng
