--!strict
-- Token-bucket rate limiter keyed by an arbitrary key (usually a Player or userId).

export type RateLimiter = {
	allow: (self: RateLimiter, key: any, cost: number?) -> boolean,
	reset: (self: RateLimiter, key: any) -> (),
}

local RateLimiter = {}
RateLimiter.__index = RateLimiter

-- ratePerSecond: refill speed. burst: bucket capacity.
-- clock: injectable time source (defaults to os.clock) so tests are deterministic.
function RateLimiter.new(ratePerSecond: number, burst: number, clock: (() -> number)?): RateLimiter
	local self = setmetatable({
		_rate = ratePerSecond,
		_burst = burst,
		_buckets = setmetatable({}, { __mode = "k" }) :: any,
		_clock = clock or os.clock,
	}, RateLimiter)
	return (self :: any) :: RateLimiter
end

function RateLimiter.allow(self: any, key: any, cost: number?): boolean
	local c = cost or 1
	local now = self._clock()
	local bucket = self._buckets[key]
	if not bucket then
		bucket = { tokens = self._burst, t = now }
		self._buckets[key] = bucket
	end
	bucket.tokens = math.min(self._burst, bucket.tokens + (now - bucket.t) * self._rate)
	bucket.t = now
	if bucket.tokens >= c then
		bucket.tokens -= c
		return true
	end
	return false
end

function RateLimiter.reset(self: any, key: any)
	self._buckets[key] = nil
end

return RateLimiter
