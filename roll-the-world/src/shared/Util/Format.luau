--!strict
-- Human-readable formatting: sizes in real-world units, big numbers, timers.

local Format = {}

-- Converts a diameter in studs to a display string given the tier's centimetres-per-stud scale.
-- Returns value string and unit separately so the HUD can animate the number and style the unit.
function Format.sizeParts(diameterStuds: number, cmPerStud: number): (string, string)
	local cm = diameterStuds * cmPerStud
	if cm < 1 then
		return string.format("%.1f", cm * 10), "mm"
	elseif cm < 100 then
		if cm < 10 then
			return string.format("%.1f", cm), "cm"
		end
		return string.format("%d", math.floor(cm + 0.5)), "cm"
	elseif cm < 100000 then
		local m = cm / 100
		if m < 10 then
			return string.format("%.2f", m), "m"
		elseif m < 100 then
			return string.format("%.1f", m), "m"
		end
		return string.format("%d", math.floor(m + 0.5)), "m"
	else
		local km = cm / 100000
		if km < 10 then
			return string.format("%.2f", km), "km"
		elseif km < 100 then
			return string.format("%.1f", km), "km"
		end
		return Format.compact(km), "km"
	end
end

function Format.size(diameterStuds: number, cmPerStud: number): string
	local v, u = Format.sizeParts(diameterStuds, cmPerStud)
	return v .. " " .. u
end

-- 1234 -> "1,234"
function Format.commas(n: number): string
	local negative = n < 0
	local s = tostring(math.floor(math.abs(n)))
	local reversed = s:reverse():gsub("(%d%d%d)", "%1,")
	local out = reversed:reverse()
	if out:sub(1, 1) == "," then
		out = out:sub(2)
	end
	return (negative and "-" or "") .. out
end

-- 15300 -> "15.3K"
function Format.compact(n: number): string
	local abs = math.abs(n)
	local limits = { 1e12, 1e9, 1e6, 1e3 }
	local suffixes = { "T", "B", "M", "K" }
	for i, limit in limits do
		if abs >= limit then
			local v = n / limit
			if math.abs(v) >= 100 then
				return string.format("%d%s", math.floor(v), suffixes[i])
			end
			local text = string.format("%.1f", v):gsub("%.0$", "")
			return text .. suffixes[i]
		end
	end
	return tostring(math.floor(n))
end

-- 125 -> "2:05"
function Format.clock(seconds: number): string
	seconds = math.max(0, math.ceil(seconds))
	return string.format("%d:%02d", seconds // 60, seconds % 60)
end

-- 90061 -> "1d 1h"
function Format.duration(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	local d = seconds // 86400
	local h = (seconds % 86400) // 3600
	local m = (seconds % 3600) // 60
	if d > 0 then
		return string.format("%dd %dh", d, h)
	elseif h > 0 then
		return string.format("%dh %dm", h, m)
	end
	return string.format("%dm", math.max(1, m))
end

function Format.percent(fraction: number): string
	return string.format("%d%%", math.floor(fraction * 100 + 0.5))
end

function Format.ordinal(n: number): string
	local suffix = "th"
	local lastTwo = n % 100
	if lastTwo < 11 or lastTwo > 13 then
		local last = n % 10
		if last == 1 then
			suffix = "st"
		elseif last == 2 then
			suffix = "nd"
		elseif last == 3 then
			suffix = "rd"
		end
	end
	return tostring(n) .. suffix
end

return Format
