--!strict
-- Critically-damped-ish scalar spring for bouncy UI numbers and squash/stretch.

export type Spring = {
	position: number,
	velocity: number,
	target: number,
	stiffness: number,
	damping: number,
	step: (self: Spring, dt: number) -> number,
	impulse: (self: Spring, v: number) -> (),
	snap: (self: Spring, v: number) -> (),
}

local Spring = {}
Spring.__index = Spring

function Spring.new(initial: number, stiffness: number?, damping: number?): Spring
	return (setmetatable({
		position = initial,
		velocity = 0,
		target = initial,
		stiffness = stiffness or 170,
		damping = damping or 18,
	}, Spring) :: any) :: Spring
end

function Spring.step(self: any, dt: number): number
	-- Sub-step for stability at low frame rates.
	local steps = math.max(1, math.ceil(dt / (1 / 120)))
	local h = dt / steps
	for _ = 1, steps do
		local force = (self.target - self.position) * self.stiffness - self.velocity * self.damping
		self.velocity += force * h
		self.position += self.velocity * h
	end
	return self.position
end

function Spring.impulse(self: any, v: number)
	self.velocity += v
end

function Spring.snap(self: any, v: number)
	self.position = v
	self.target = v
	self.velocity = 0
end

return Spring
