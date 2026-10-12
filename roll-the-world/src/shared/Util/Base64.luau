--!strict
-- Base64 for byte strings, so compact binary blobs (bitsets) can live safely in DataStore JSON.

local Base64 = {}

local ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local encodeMap: { [number]: string } = {}
local decodeMap: { [number]: number } = {}
for i = 1, #ALPHABET do
	local ch = ALPHABET:sub(i, i)
	encodeMap[i - 1] = ch
	decodeMap[string.byte(ch)] = i - 1
end

function Base64.encode(bytes: string): string
	local out = table.create(math.ceil(#bytes / 3) * 4)
	for i = 1, #bytes, 3 do
		local a, b, c = string.byte(bytes, i, i + 2)
		local n = bit32.lshift(a, 16) + bit32.lshift(b or 0, 8) + (c or 0)
		table.insert(out, encodeMap[bit32.extract(n, 18, 6)])
		table.insert(out, encodeMap[bit32.extract(n, 12, 6)])
		table.insert(out, if b then encodeMap[bit32.extract(n, 6, 6)] else "=")
		table.insert(out, if c then encodeMap[bit32.extract(n, 0, 6)] else "=")
	end
	return table.concat(out)
end

function Base64.decode(text: string): string
	local out = {}
	local clean = text:gsub("[^%w%+/=]", "")
	for i = 1, #clean, 4 do
		local c1, c2, c3, c4 = string.byte(clean, i, i + 3)
		if not c1 or not c2 then
			break
		end
		local v1, v2 = decodeMap[c1] or 0, decodeMap[c2] or 0
		local pad3 = c3 == nil or c3 == 61
		local pad4 = c4 == nil or c4 == 61
		local v3 = if pad3 then 0 else (decodeMap[c3 :: number] or 0)
		local v4 = if pad4 then 0 else (decodeMap[c4 :: number] or 0)
		local n = bit32.lshift(v1, 18) + bit32.lshift(v2, 12) + bit32.lshift(v3, 6) + v4
		table.insert(out, string.char(bit32.extract(n, 16, 8)))
		if not pad3 then
			table.insert(out, string.char(bit32.extract(n, 8, 8)))
		end
		if not pad4 then
			table.insert(out, string.char(bit32.extract(n, 0, 8)))
		end
	end
	return table.concat(out)
end

return Base64
