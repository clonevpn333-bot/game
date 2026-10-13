--!strict
-- Every sound id in the game. Defaults point at sounds that ship inside the Roblox client
-- (rbxasset://), which every experience may use. Replace `id` with licensed Creator Store
-- audio (rbxassetid://...) to upgrade; an empty id is skipped silently so music slots are optional.

export type SoundDef = {
	id: string,
	volume: number,
	pitch: number?,
	pitchJitter: number?,
	looped: boolean?,
}

local Sounds: { [string]: SoundDef } = {
	-- Absorb pops: pitch is driven by prop size relative to the ball (small = high).
	-- Soft, organic pops (no electronic beeps). Swap for Creator Store "pop"/"plop" SFX ids to upgrade.
	Pop = { id = "rbxasset://sounds/snap.mp3", volume = 0.3, pitch = 0.95, pitchJitter = 0.07 },
	PopSoft = { id = "rbxasset://sounds/snap.mp3", volume = 0.2, pitch = 1.15, pitchJitter = 0.08 },
	PopBig = { id = "rbxasset://sounds/action_jump_land.mp3", volume = 0.65, pitch = 0.75, pitchJitter = 0.05 },
	PopBigLayer = { id = "rbxasset://sounds/snap.mp3", volume = 0.35, pitch = 0.6, pitchJitter = 0.04 },
	Bonk = { id = "rbxasset://sounds/action_jump_land.mp3", volume = 0.8, pitchJitter = 0.08 },
	Clang = { id = "rbxasset://sounds/impact_water.mp3", volume = 0.9, pitch = 0.6, pitchJitter = 0.05 },
	Hop = { id = "rbxasset://sounds/action_jump.mp3", volume = 0.6, pitchJitter = 0.05 },
	Land = { id = "rbxasset://sounds/action_jump_land.mp3", volume = 0.4, pitchJitter = 0.1 },
	Dash = { id = "rbxasset://sounds/swoosh.wav", volume = 0.7, pitchJitter = 0.05 },
	GrowthHum = { id = "rbxasset://sounds/action_falling.mp3", volume = 0.0, looped = true },
	RollLoop = { id = "rbxasset://sounds/action_footsteps_plastic.mp3", volume = 0.0, looped = true },

	-- Stingers
	NewDiscovery = { id = "rbxasset://sounds/electronicpingshort.wav", volume = 0.3, pitch = 0.9 },
	Legendary = { id = "rbxasset://sounds/victory.wav", volume = 0.8 },
	PlayerRolled = { id = "rbxasset://sounds/snap.mp3", volume = 1, pitch = 0.7 },
	GotRolled = { id = "rbxasset://sounds/swoosh.wav", volume = 0.9, pitch = 0.6 },
	BurstOff = { id = "rbxasset://sounds/Rocket shot.wav", volume = 0.8 },
	EventStart = { id = "rbxasset://sounds/electronicpingshort.wav", volume = 0.45, pitch = 0.55 },
	FinalRoll = { id = "rbxasset://sounds/electronicpingshort.wav", volume = 0.5, pitch = 0.45 },
	Launch = { id = "rbxasset://sounds/Rocket whoosh 01.wav", volume = 1 },
	Podium = { id = "rbxasset://sounds/victory.wav", volume = 0.8 },
	Merge = { id = "rbxasset://sounds/snap.mp3", volume = 0.8, pitch = 1.3 },
	Split = { id = "rbxasset://sounds/swoosh.wav", volume = 0.7, pitch = 1.3 },
	Coin = { id = "rbxasset://sounds/snap.mp3", volume = 0.4, pitch = 1.45, pitchJitter = 0.05 },
	Meteor = { id = "rbxasset://sounds/Rocket whoosh 01.wav", volume = 0.5, pitch = 0.7, pitchJitter = 0.1 },

	-- UI
	Click = { id = "rbxasset://sounds/button.wav", volume = 0.5 },
	Hover = { id = "rbxasset://sounds/clickfast.wav", volume = 0.2, pitch = 1.4 },
	Open = { id = "rbxasset://sounds/swoosh.wav", volume = 0.35, pitch = 1.5 },
	Close = { id = "rbxasset://sounds/swoosh.wav", volume = 0.3, pitch = 1.2 },
	Purchase = { id = "rbxasset://sounds/victory.wav", volume = 0.6 },
	Error = { id = "rbxasset://sounds/clickfast.wav", volume = 0.5, pitch = 0.5 },
	Toast = { id = "rbxasset://sounds/clickfast.wav", volume = 0.25, pitch = 0.8 },
	Tick = { id = "rbxasset://sounds/clickfast.wav", volume = 0.4, pitch = 0.9 },

	-- Music slots: fill with licensed tracks from the Creator Store (Roblox-owned music is free to use).
	MusicHub = { id = "", volume = 0.35, looped = true },
	MusicKitchen = { id = "", volume = 0.35, looped = true },
	MusicBackyard = { id = "", volume = 0.35, looped = true },
	MusicCandy = { id = "", volume = 0.35, looped = true },
	MusicFinalRoll = { id = "", volume = 0.45, looped = true },
	MusicEventLayer = { id = "", volume = 0.3, looped = true },
	MusicResults = { id = "", volume = 0.4, looped = true },
}

return Sounds
