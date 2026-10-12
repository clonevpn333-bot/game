--!strict
-- Every remote in the game. Server -> client unless marked C2S. Unreliable remotes carry
-- high-frequency, loss-tolerant state (critter positions, merge input).

export type RemoteKind = "Event" | "Unreliable" | "Function"

local Definitions: { [string]: RemoteKind } = {
	-- Round + world
	RoundState = "Event", -- (snapshot)
	WorldLoad = "Event", -- (kitId, seed, propBuffer, landmarkId)
	PropsRemoved = "Event", -- ({ {propId, absorberBallId} })
	LootSpawned = "Event", -- (buffer)
	PropsMutated = "Event", -- ({ {propId, mutationIndex} })
	CritterState = "Unreliable", -- (buffer)
	WorldEvent = "Event", -- (eventId | nil, info)
	Announce = "Event", -- (kind, data)

	-- Ball + absorption
	Absorbed = "Event", -- (list of absorb results for the local player)
	BallFx = "Event", -- (kind, data) bonks, bumps, squash for everyone nearby
	Impulse = "Event", -- (velocityChange: Vector3) applied by the owning client
	PlayerState = "Event", -- (state, data) Rolling / Rider / Merged / Hub
	LaunchSequence = "Event",
	Results = "Event",
	PlanetCreated = "Event",

	-- Data sync
	ProfileSync = "Event", -- (clientProfile)
	Toast = "Event", -- (kind, data)

	-- C2S
	AbsorbClaim = "Event", -- ({ propIds })
	Action = "Event", -- (actionName, arg?)
	MergeInput = "Unreliable", -- (moveX, moveZ)
	Social = "Event", -- (kind, arg)

	-- C2S request/response for menus
	Request = "Function", -- (action, payload) -> (ok, result)
}

return Definitions
