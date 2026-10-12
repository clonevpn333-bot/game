--!strict
-- Compact binary encoding for prop lists sent to clients (one buffer instead of thousands of
-- instances). Record layout (19 bytes): u16 id, u16 uid, f32 x, f32 y, f32 z, u8 yaw, u8 scale, u8 mutation.
-- Loot uses the same layout. Critter state uses its own 13-byte layout.

local PropCodec = {}

local RECORD = 19

export type Record = {
	id: number,
	uid: number,
	x: number,
	y: number,
	z: number,
	yaw: number,
	scale: number,
	mutation: number,
}

local function quantYaw(yaw: number): number
	return math.floor(((yaw % (2 * math.pi)) / (2 * math.pi)) * 255 + 0.5) % 256
end

local function quantScale(scale: number): number
	return math.clamp(math.floor((scale - 0.25) * 100 + 0.5), 0, 255)
end

function PropCodec.encode(records: { Record }): buffer
	local b = buffer.create(#records * RECORD)
	for i, r in records do
		local o = (i - 1) * RECORD
		buffer.writeu16(b, o, r.id)
		buffer.writeu16(b, o + 2, r.uid)
		buffer.writef32(b, o + 4, r.x)
		buffer.writef32(b, o + 8, r.y)
		buffer.writef32(b, o + 12, r.z)
		buffer.writeu8(b, o + 16, quantYaw(r.yaw))
		buffer.writeu8(b, o + 17, quantScale(r.scale))
		buffer.writeu8(b, o + 18, r.mutation)
	end
	return b
end

function PropCodec.decode(b: buffer): { Record }
	local count = buffer.len(b) // RECORD
	local out = table.create(count)
	for i = 1, count do
		local o = (i - 1) * RECORD
		out[i] = {
			id = buffer.readu16(b, o),
			uid = buffer.readu16(b, o + 2),
			x = buffer.readf32(b, o + 4),
			y = buffer.readf32(b, o + 8),
			z = buffer.readf32(b, o + 12),
			yaw = buffer.readu8(b, o + 16) / 255 * 2 * math.pi,
			scale = buffer.readu8(b, o + 17) / 100 + 0.25,
			mutation = buffer.readu8(b, o + 18),
		}
	end
	return out
end

-- Quantised scale exactly as clients will see it (server uses this so both sides agree).
function PropCodec.roundTripScale(scale: number): number
	return quantScale(scale) / 100 + 0.25
end

-- Critters: u16 id, f32 x, f32 y, f32 z, u8 yaw, u8 state  (16 bytes)
local CRITTER = 16

export type CritterRecord = { id: number, x: number, y: number, z: number, yaw: number, state: number }

function PropCodec.encodeCritters(records: { CritterRecord }): buffer
	local b = buffer.create(#records * CRITTER)
	for i, r in records do
		local o = (i - 1) * CRITTER
		buffer.writeu16(b, o, r.id)
		buffer.writef32(b, o + 2, r.x)
		buffer.writef32(b, o + 6, r.y)
		buffer.writef32(b, o + 10, r.z)
		buffer.writeu8(b, o + 14, quantYaw(r.yaw))
		buffer.writeu8(b, o + 15, r.state)
	end
	return b
end

function PropCodec.decodeCritters(b: buffer): { CritterRecord }
	local count = buffer.len(b) // CRITTER
	local out = table.create(count)
	for i = 1, count do
		local o = (i - 1) * CRITTER
		out[i] = {
			id = buffer.readu16(b, o),
			x = buffer.readf32(b, o + 2),
			y = buffer.readf32(b, o + 6),
			z = buffer.readf32(b, o + 10),
			yaw = buffer.readu8(b, o + 14) / 255 * 2 * math.pi,
			state = buffer.readu8(b, o + 15),
		}
	end
	return out
end

return PropCodec
