--!strict
-- Growable bitset stored as a byte array, serialised to base64 for saving.
-- Used for the Rolledex (prop uid x mutation variant) and Roll Pass claims.

local Base64 = require(script.Parent.Base64)

export type Bitset = {
	bytes: { number },
}

local Bitset = {}

function Bitset.new(): Bitset
	return { bytes = {} }
end

function Bitset.get(set: Bitset, index: number): boolean
	local byteIndex = index // 8 + 1
	local byte = set.bytes[byteIndex]
	if not byte then
		return false
	end
	return bit32.btest(byte, bit32.lshift(1, index % 8))
end

-- Returns true when the bit was newly set.
function Bitset.set(set: Bitset, index: number): boolean
	assert(index >= 0 and index == math.floor(index), "Bitset index must be a non-negative integer")
	local byteIndex = index // 8 + 1
	local bytes = set.bytes
	for i = #bytes + 1, byteIndex do
		bytes[i] = 0
	end
	local mask = bit32.lshift(1, index % 8)
	local before = bytes[byteIndex]
	if bit32.btest(before, mask) then
		return false
	end
	bytes[byteIndex] = bit32.bor(before, mask)
	return true
end

function Bitset.clear(set: Bitset, index: number)
	local byteIndex = index // 8 + 1
	local byte = set.bytes[byteIndex]
	if byte then
		set.bytes[byteIndex] = bit32.band(byte, bit32.bnot(bit32.lshift(1, index % 8)))
	end
end

function Bitset.count(set: Bitset): number
	local total = 0
	for _, byte in set.bytes do
		local b = byte
		while b ~= 0 do
			b = bit32.band(b, b - 1)
			total += 1
		end
	end
	return total
end

function Bitset.encode(set: Bitset): string
	local chars = table.create(#set.bytes)
	for i, byte in set.bytes do
		chars[i] = string.char(byte)
	end
	-- Trim trailing zero bytes to keep saves small.
	local n = #chars
	while n > 0 and set.bytes[n] == 0 do
		chars[n] = nil
		n -= 1
	end
	return Base64.encode(table.concat(chars))
end

function Bitset.decode(text: string?): Bitset
	local set = Bitset.new()
	if not text or text == "" then
		return set
	end
	local raw = Base64.decode(text)
	for i = 1, #raw do
		set.bytes[i] = string.byte(raw, i)
	end
	return set
end

return Bitset
