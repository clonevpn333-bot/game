--!strict
-- Table helpers used by save migrations, live config merging and UI.

local TableUtil = {}

function TableUtil.deepCopy<T>(value: T): T
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for k, v in value :: any do
		out[TableUtil.deepCopy(k)] = TableUtil.deepCopy(v)
	end
	return (out :: any) :: T
end

-- Fills missing keys in `target` from `defaults`, recursively. Existing values win.
function TableUtil.reconcile(target: { [any]: any }, defaults: { [any]: any }): { [any]: any }
	for k, v in defaults do
		if target[k] == nil then
			target[k] = TableUtil.deepCopy(v)
		elseif type(v) == "table" and type(target[k]) == "table" and next(v) ~= nil and #v == 0 then
			-- Only recurse into dictionary-shaped defaults; arrays are replaced wholesale.
			TableUtil.reconcile(target[k], v)
		end
	end
	return target
end

-- Overlay `patch` on top of `base` (patch wins), returning a new table.
function TableUtil.merge(base: { [any]: any }, patch: { [any]: any }?): { [any]: any }
	local out = TableUtil.deepCopy(base)
	if not patch then
		return out
	end
	for k, v in patch do
		if type(v) == "table" and type(out[k]) == "table" and #v == 0 and next(v) ~= nil then
			out[k] = TableUtil.merge(out[k], v)
		else
			out[k] = TableUtil.deepCopy(v)
		end
	end
	return out
end

function TableUtil.keys<K>(t: { [K]: any }): { K }
	local out = {}
	for k in t do
		table.insert(out, k)
	end
	return out
end

function TableUtil.count(t: { [any]: any }): number
	local n = 0
	for _ in t do
		n += 1
	end
	return n
end

function TableUtil.map<T, U>(list: { T }, fn: (T, number) -> U): { U }
	local out = table.create(#list)
	for i, v in list do
		out[i] = fn(v, i)
	end
	return out
end

function TableUtil.filter<T>(list: { T }, fn: (T) -> boolean): { T }
	local out = {}
	for _, v in list do
		if fn(v) then
			table.insert(out, v)
		end
	end
	return out
end

function TableUtil.find<T>(list: { T }, fn: (T) -> boolean): T?
	for _, v in list do
		if fn(v) then
			return v
		end
	end
	return nil
end

function TableUtil.freeze<T>(t: T): T
	if type(t) == "table" and not table.isfrozen(t :: any) then
		for _, v in t :: any do
			if type(v) == "table" then
				TableUtil.freeze(v)
			end
		end
		table.freeze(t :: any)
	end
	return t
end

return TableUtil
