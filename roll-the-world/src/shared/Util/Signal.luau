--!strict
-- Minimal, allocation-light signal. Handlers run synchronously in connection order.
-- Handlers that yield are fine (each runs in its own thread via task.spawn when `deferred` is false
-- we call directly; yielding handlers will block later handlers, so prefer non-yielding handlers).

export type Connection = {
	Connected: boolean,
	Disconnect: (self: Connection) -> (),
}

export type Signal<T...> = {
	Connect: (self: Signal<T...>, fn: (T...) -> ()) -> Connection,
	Once: (self: Signal<T...>, fn: (T...) -> ()) -> Connection,
	Fire: (self: Signal<T...>, T...) -> (),
	Wait: (self: Signal<T...>) -> T...,
	DisconnectAll: (self: Signal<T...>) -> (),
}

local Signal = {}
Signal.__index = Signal

local ConnectionMT = {}
ConnectionMT.__index = ConnectionMT

function ConnectionMT.Disconnect(self: any)
	if not self.Connected then
		return
	end
	self.Connected = false
	local signal = self._signal
	local list = signal._handlers
	for i = #list, 1, -1 do
		if list[i] == self then
			table.remove(list, i)
			break
		end
	end
end

function Signal.new<T...>(): Signal<T...>
	local self = setmetatable({ _handlers = {} }, Signal)
	return (self :: any) :: Signal<T...>
end

function Signal.Connect(self: any, fn)
	local conn = setmetatable({ Connected = true, _fn = fn, _signal = self }, ConnectionMT)
	table.insert(self._handlers, conn)
	return conn
end

function Signal.Once(self: any, fn)
	local conn
	conn = self:Connect(function(...)
		conn:Disconnect()
		fn(...)
	end)
	return conn
end

function Signal.Fire(self: any, ...)
	-- Copy so handlers may disconnect during dispatch.
	local list = table.clone(self._handlers)
	for _, conn in list do
		if conn.Connected then
			local ok, err = pcall(conn._fn, ...)
			if not ok then
				warn("[Signal] handler error: " .. tostring(err))
			end
		end
	end
end

function Signal.Wait(self: any)
	local thread = coroutine.running()
	self:Once(function(...)
		task.spawn(thread, ...)
	end)
	return coroutine.yield()
end

function Signal.DisconnectAll(self: any)
	for _, conn in self._handlers do
		conn.Connected = false
	end
	table.clear(self._handlers)
end

return Signal
