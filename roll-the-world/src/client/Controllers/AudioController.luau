--!nonstrict
-- Sound design: pops pitched by prop size with a rising combo ladder on rapid pickups (the
-- "coin streak" feeling), a rolling loop and growth hum tied to speed/size, stingers for big
-- moments, and kit music with a Final Roll intensity layer. All ids live in Config/Sounds.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage.Shared
local Net = require(Shared.Net)
local Sounds = require(Shared.Config.Sounds)
local Rarity = require(Shared.Config.Rarity)
local Growth = require(Shared.Logic.Growth)
local Absorb = require(Shared.Logic.Absorb)
local Kits = require(Shared.Data.Kits)
local PropLibrary = require(Shared.Logic.PropLibrary)

local AudioController = {}

local controllers
local state, settings
local group: SoundGroup
local musicGroup: SoundGroup
local pools: { [string]: { Sound } } = {}
local loops: { [string]: Sound } = {}
local music: { [string]: Sound } = {}
local currentMusic: string? = nil
local combo = 0
local lastPopAt = 0
local popsThisFrame = 0

function AudioController:init(c)
	controllers = c
end

local function makeSound(name: string, parent: Instance): Sound?
	local def = Sounds[name]
	if not def or def.id == "" then
		return nil
	end
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = def.id
	s.Volume = def.volume
	s.Looped = def.looped == true
	s.PlaybackSpeed = def.pitch or 1
	s.SoundGroup = if name:sub(1, 5) == "Music" then musicGroup else group
	s.Parent = parent
	return s
end

-- One-shot. opts: pitch (multiplier), volume (multiplier).
function AudioController:play(name: string, opts: { [string]: number }?)
	local def = Sounds[name]
	if not def or def.id == "" then
		return
	end
	local pool = pools[name]
	if not pool then
		pool = {}
		pools[name] = pool
	end
	local sound
	for _, s in pool do
		if not s.IsPlaying then
			sound = s
			break
		end
	end
	if not sound then
		if #pool >= 6 then
			sound = pool[1]
			sound:Stop()
		else
			sound = makeSound(name, SoundService)
			if not sound then
				return
			end
			table.insert(pool, sound)
		end
	end
	local jitter = def.pitchJitter or 0
	local pitch = (def.pitch or 1) * ((opts and opts.pitch) or 1) * (1 + (math.random() * 2 - 1) * jitter)
	sound.PlaybackSpeed = math.clamp(pitch, 0.2, 4)
	sound.Volume = def.volume * ((opts and opts.volume) or 1)
	sound.TimePosition = 0
	sound:Play()
end

-- Absorb pop: small things squeak high, big things thunk low; quick streaks climb in pitch.
function AudioController:pop(relativeSize: number, isLocal: boolean, distance: number?)
	local now = os.clock()
	popsThisFrame += 1
	if popsThisFrame > 4 then
		return -- a vacuum-cleaner moment would just be noise
	end
	if isLocal then
		if now - lastPopAt < 0.55 then
			combo = math.min(combo + 1, 18)
		else
			combo = 0
		end
		lastPopAt = now
	end
	local base = 1.75 - math.clamp(relativeSize, 0, 1.2) * 0.9
	local ladder = if isLocal then 1 + combo * 0.028 else 1
	local volume = if isLocal then 1 else math.clamp(1 - (distance or 0) / 300, 0.05, 0.5)
	local name = if relativeSize > 0.55 then "PopBig" elseif relativeSize < 0.18 then "PopSoft" else "Pop"
	self:play(name, { pitch = base * ladder, volume = volume })
end

local function setMusic(name: string?)
	if currentMusic == name then
		return
	end
	if currentMusic and music[currentMusic] then
		local old = music[currentMusic]
		task.spawn(function()
			for i = 10, 0, -1 do
				old.Volume = (Sounds[currentMusic or ""] and Sounds[currentMusic].volume or 0.3) * i / 10
				task.wait(0.08)
			end
			old:Stop()
		end)
	end
	currentMusic = name
	if name then
		local s = music[name]
		if not s then
			s = makeSound(name, SoundService)
			if s then
				music[name] = s
			end
		end
		if s then
			s.Volume = Sounds[name].volume
			s:Play()
		end
	end
end

local function updateMusic()
	local round = state.round
	if round.state == "Playing" and state.playerState ~= "Hub" then
		if round.phase == "FinalRoll" and Sounds.MusicFinalRoll.id ~= "" then
			setMusic("MusicFinalRoll")
		else
			local kit = round.kitId and Kits.get(round.kitId)
			setMusic(if kit then kit.music else "MusicHub")
		end
	elseif round.state == "Results" then
		setMusic(if Sounds.MusicResults.id ~= "" then "MusicResults" else "MusicHub")
	else
		setMusic("MusicHub")
	end
end

local function updateLoops(dt: number)
	popsThisFrame = 0
	local roll = loops.RollLoop
	local hum = loops.GrowthHum
	local movement = controllers.MovementController
	if state:isRolling() and movement then
		local frac = math.clamp(movement.speed / math.max(Growth.maxSpeed(state.diameter), 1), 0, 1.5)
		local sizeAlpha = Growth.sizeAlpha(state.diameter)
		if roll then
			local target = if movement.grounded then 0.12 + frac * 0.45 else 0
			roll.Volume += (target - roll.Volume) * math.min(1, dt * 8)
			roll.PlaybackSpeed = (0.75 + frac * 0.6) * (1.3 - sizeAlpha * 0.6)
		end
		if hum then
			hum.Volume += ((0.04 + sizeAlpha * 0.12) * (0.3 + frac) - hum.Volume) * math.min(1, dt * 3)
			hum.PlaybackSpeed = 1.4 - sizeAlpha * 0.9
		end
	else
		if roll then
			roll.Volume *= 0.9
		end
		if hum then
			hum.Volume *= 0.9
		end
	end
end

function AudioController:start()
	state = controllers.ClientState
	settings = controllers.SettingsController
	group = Instance.new("SoundGroup")
	group.Name = "SFX"
	group.Volume = settings.values.sfx
	group.Parent = SoundService
	musicGroup = Instance.new("SoundGroup")
	musicGroup.Name = "Music"
	musicGroup.Volume = settings.values.music
	musicGroup.Parent = SoundService
	settings.Changed:Connect(function(key, value)
		if key == "sfx" then
			group.Volume = value
		elseif key == "music" then
			musicGroup.Volume = value
		end
	end)
	for _, name in { "RollLoop", "GrowthHum" } do
		local s = makeSound(name, SoundService)
		if s then
			s.Volume = 0
			s:Play()
			loops[name] = s
		end
	end

	local world = controllers.WorldController
	world.PropAbsorbed:Connect(function(p, absorberKey, isPrediction)
		local isLocal = absorberKey == state.player.UserId
		if isLocal and not isPrediction then
			return -- already played at prediction time
		end
		local threshold = Absorb.threshold(state.diameter, state:absorbContext())
		local rel = p.absorbSize / math.max(threshold, 0.1)
		local dist = 0
		if not isLocal then
			dist = (Workspace.CurrentCamera.CFrame.Position - Vector3.new(p.x, p.cy, p.z)).Magnitude
			if dist > 300 then
				return
			end
			rel = 0.4
		end
		self:pop(rel, isLocal, dist)
		if isLocal and p.critter then
			self:play("PopSoft", { pitch = 2.2, volume = 0.8 }) -- the critter's happy giggle
		end
	end)
	Net.connect("Absorbed", function(list)
		for _, a in list do
			if a.n then
				self:play("NewDiscovery")
			end
			local def = PropLibrary.get(a.uid)
			if def and Rarity.get(def.rarity).order >= 5 then
				self:play("Legendary")
			end
		end
	end)
	local movement = controllers.MovementController
	movement.Hopped:Connect(function()
		self:play("Hop", { pitch = 1.2 - Growth.sizeAlpha(state.diameter) * 0.5 })
	end)
	movement.Dashed:Connect(function()
		self:play("Dash", { pitch = 1.1 - Growth.sizeAlpha(state.diameter) * 0.4 })
	end)
	movement.Landed:Connect(function(impact)
		self:play("Land", { volume = math.clamp(impact / 80, 0.2, 1), pitch = 1.1 - Growth.sizeAlpha(state.diameter) * 0.5 })
	end)
	movement.Bonked:Connect(function(speed)
		local frac = math.clamp(speed / math.max(Growth.maxSpeed(state.diameter), 1), 0.3, 1.3)
		self:play("Bonk", { volume = frac, pitch = 1.25 - Growth.sizeAlpha(state.diameter) * 0.5 })
	end)
	state.RoundChanged:Connect(function(round, previous)
		if round.phase == "FinalRoll" and previous.phase ~= "FinalRoll" then
			self:play("FinalRoll")
		end
		updateMusic()
	end)
	state.PlayerStateChanged:Connect(updateMusic)
	Net.connect("Announce", function(kind)
		if kind == "legendary" then
			self:play("Legendary", { volume = 0.6 })
		end
	end)
	controllers.WorldController.GoalUnlocked:Connect(function()
		self:play("NewDiscovery", { pitch = 1.1 })
	end)
	RunService.RenderStepped:Connect(updateLoops)
	updateMusic()
end

return AudioController
