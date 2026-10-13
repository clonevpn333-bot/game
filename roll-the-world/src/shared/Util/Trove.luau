--!strict
-- Cleanup bag. Add instances, connections, functions, threads or anything with Destroy/Disconnect.

export type Trove = {
	Add: <T>(self: Trove, item: T) -> T,
	Clean: (self: Trove) -> (),
	Destroy: (self: Trove) -> (),
}

local Trove = {}
Trove.__index = Trove

function Trove.new(): Trove
	return (setmetatable({ _items = {} }, Trove) :: any) :: Trove
end

local function cleanupItem(item: any): ()
	local kind = typeof(item)
	if kind == "function" then
		item()
	elseif kind == "RBXScriptConnection" then
		item:Disconnect()
	elseif kind == "Instance" then
		item:Destroy()
	elseif kind == "thread" then
		pcall(task.cancel, item)
	elseif kind == "table" then
		if type(item.Destroy) == "function" then
			item:Destroy()
		elseif type(item.Disconnect) == "function" then
			item:Disconnect()
		end
	end
end

function Trove.Add(self: any, item: any): any
	table.insert(self._items, item)
	return item
end

function Trove.Clean(self: any)
	local items = self._items
	self._items = {}
	for i = #items, 1, -1 do
		local item = items[i]
		local ok, err = pcall(function()
			cleanupItem(item)
		end)
		if not ok then
			warn("[Trove] cleanup error: " .. tostring(err))
		end
	end
end

function Trove.Destroy(self: any)
	self:Clean()
end

return Trove
