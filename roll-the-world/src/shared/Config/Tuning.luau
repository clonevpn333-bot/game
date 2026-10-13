--!strict
-- Every gameplay tuning number lives here. Live config may override any leaf via LiveConfig.tuning.
-- Units: studs, seconds, studs/second. "D" = ball diameter in studs.

local Tuning = {
	Ball = {
		StartDiameter = 3,
		MaxDiameter = 1600,
		-- Max ground speed = SpeedBase * (D / StartDiameter) ^ SpeedExponent
		SpeedBase = 23,
		SpeedExponent = 0.45,
		-- Seconds to reach top speed from rest; interpolated on log(D) between small and huge.
		AccelTimeSmall = 0.32,
		AccelTimeHuge = 0.85,
		HugeDiameter = 250,
		-- Extra force multiplier when steering against current velocity (snappy turn-in).
		TurnAssist = 1.9,
		-- Seconds to coast to a stop with no input.
		BrakeTimeSmall = 1.1,
		BrakeTimeHuge = 2.4,
		AirControl = 0.35,
		Density = 0.7,
		Friction = 0.9,
		Elasticity = 0.15,
		-- Hop height in studs = max(HopMin, D * HopPerDiameter)
		HopMin = 5,
		HopPerDiameter = 0.55,
		HopCooldown = 0.35,
		-- Dash adds DashBoost * maxSpeed instantly and lifts the speed cap for DashDuration.
		DashBoost = 0.85,
		DashDuration = 0.5,
		DashCooldown = 2.6,
		-- Mobile auto-steer assist: max bend (degrees) toward absorbable clusters ahead.
		AutoSteerMaxAngle = 22,
		AutoSteerRange = 6, -- multiples of D
		-- Rider avatar height as a fraction of ball diameter, clamped.
		RiderHeightFraction = 0.55,
		RiderScaleMin = 0.35,
		RiderScaleMax = 40,
		RiderScaleStep = 0.08, -- only rescale the avatar when it changes by this fraction
		VoidY = -400,
	},

	Absorb = {
		-- A prop sticks when its absorbSize <= Ratio * D.
		Ratio = 0.62,
		-- Contact tolerance as a fraction of prop radius (props are fuzzy spheres for contact).
		ContactSlack = 0.25,
		-- Extra server-side reach (studs) per stud/sec of ball speed to absorb latency.
		LatencyReachPerSpeed = 0.12,
		LatencyReachMax = 18,
		ClaimRatePerSecond = 45,
		ClaimBurst = 90,
		-- Final Roll: the landmark becomes absorbable once absorbSize <= LandmarkReach * D
		-- (deliberately bigger than the ball, so the round's best roller gets the big moment).
		LandmarkReach = 1.6,
		-- Bonks: props up to BonkKnockRatio * D (too big to absorb) can knock items loose at speed.
		BonkMinSpeed = 0.75, -- fraction of max speed
		BonkKnockCount = 2,
		BonkCooldown = 0.8,
		-- Magnet core / merge magnet reach in multiples of D.
		MagnetReach = 1.1,
		-- Max visible stuck-prop instances per ball (client LOD may lower further).
		VisibleStuckLocal = 44,
		VisibleStuckRemote = 22,
		-- Volume history kept per ball for loot knock-off and planet composition.
		RecentHistory = 60,
	},

	Growth = {
		-- volumeGained = propSolidVolume * Gain * earlyBoost(D) * modifiers
		-- Tuned with tools/sim/growth.spec.luau (see docs/TUNING.md): a solo greedy roller grabs ~5
		-- things/second in the first minute and grows 3 -> ~15 (1 min) -> ~65 (4 min) -> ~150 (end).
		Gain = 0.7,
		EarlyBoost = 2.8,
		EarlyScale = 10, -- D at which early boost has decayed to ~37%
		FinalRollMultiplier = 1.5,
		-- Absorbing another player adds this share of their ball volume.
		PlayerVolumeShare = 0.8,
		-- Absorbing a critter adds this bonus on top of its prop volume.
		CritterBonus = 1.5,
	},

	Pvp = {
		-- A ball absorbs another ball when D_big >= AbsorbRatio * D_small.
		AbsorbRatio = 1.32,
		-- Bumps happen between balls closer in size than AbsorbRatio, approaching faster than this.
		BumpMinRelativeSpeed = 28,
		BumpScatterPerSpeed = 0.04, -- props knocked loose per stud/sec of closing speed
		BumpScatterMax = 8,
		BumpPairCooldown = 1.2,
		BumpImpulse = 0.9, -- multiples of closing speed, applied as a velocity change
		SpawnShield = 6,
		RiderBurstDelay = 3.5,
		RiderAutoBurst = 18, -- riders are auto-burst after this long so nobody is stuck forever
		RiderRespawnFraction = 0.7,
		BurstLaunchSpeed = 90,
		BurstKnockFraction = 0.25, -- fraction of the host ball's recent props knocked loose
		BurstKnockMax = 14,
		BurstHostVolumeLoss = 0.1, -- host loses this fraction of volume (the knocked props)
		ComebackMultiplier = 1.6,
		ComebackDuration = 25,
		-- Drop-in catch-up: start at this fraction of the median ball diameter (never below start).
		CatchUpFraction = 0.45,
		CatchUpBoostDuration = 30,
		CatchUpBoostMultiplier = 1.35,
	},

	Merge = {
		RequestTimeout = 12,
		TouchRange = 1.4, -- multiples of combined radii for the "both pressing Merge while touching" path
		InputBlend = 0.5, -- host weight; partner gets 1 - InputBlend
		MagnetCooldown = 6,
		MagnetDuration = 2.5,
		SpeedPenalty = 0.88, -- merged balls are a little slower so merging isn't dominant
		GrowthPenalty = 0.9,
		MinMergedTime = 3,
		SplitLaunchSpeed = 60,
	},

	Round = {
		Length = 450,
		EventTimes = { 165 }, -- seconds after round start when the round's world event fires
		FinalRoll = 60,
		Launch = 9,
		Results = 12,
		Intermission = 15,
		MinPlayersForPvpAwards = 2,
	},

	World = {
		CritterTickRate = 10,
		CritterFleeRange = 4, -- multiples of ball D
		ReplenishInterval = 3,
		ReplenishMaxPerTick = 6,
		ReplenishRadius = 60,
		LootSettleTime = 0.7,
		LootLifetime = 120,
		MaxLoot = 220,
	},

	Rewards = {
		StardustPerMeterGrown = 60, -- per display metre of final diameter (tier-scaled)
		StardustPerDiscovery = 15,
		StardustPerNewVariant = 30,
		StardustPerPlayerRolled = 20,
		StardustPerAward = 40,
		StardustParticipation = 25,
		RarityBonus = { Common = 0, Uncommon = 1, Rare = 3, Epic = 8, Legendary = 25 },
		FriendBonusPerFriend = 0.1,
		FriendBonusMax = 0.3,
		VipBonus = 0.1,
		DoubleStardustPassMultiplier = 2,
		AdRoundMultiplier = 2,
		AdCooldownRounds = 3,
		RoundStardustCap = 6000,
	},

	Galaxy = {
		KeepBest = 12,
		KeepRecent = 8,
		MaxPinned = 4,
		SignatureProps = 6,
		PlanetColors = 5,
		NameMaxLength = 24,
		LikeCooldownHours = 20,
	},

	Data = {
		AutosaveInterval = 120,
		SessionLockTimeout = 1800, -- seconds before a stale session lock may be stolen
		LoadRetries = 6,
		SaveRetries = 5,
		ReceiptHistory = 60,
	},

	Graphics = {
		-- Build props as smooth EditableMesh meshes (falls back to primitive parts automatically
		-- if the device/experience can't create editable meshes).
		UseEditableMesh = true,
		-- Baked contact shadows / sky light as vertex colors on generated meshes.
		VertexShading = true,
		-- Safety valve: flip triangle winding if generated meshes render inside-out on a platform.
		FlipWinding = false,
		-- Max templates built per frame while preparing a kit in the background.
		TemplatesPerFrame = 2,
		-- Render distance (studs) = clamp(absorbSize * PropRenderScale, Min, Max) per prop,
		-- multiplied by the device quality factor; huge props and landmarks always render.
		PropRenderScale = 70,
		PropRenderMin = 90,
		PropRenderMax = 1600,
	},

	Camera = {
		BaseDistance = 9,
		DistancePerDiameter = 2.6,
		BaseHeight = 4,
		HeightPerDiameter = 1.1,
		FovBase = 70,
		FovSpeedBonus = 12,
		FollowSharpness = 7,
		YawSharpness = 3.2,
		AutoRecenterDelay = 1.6,
		KeyOrbitSpeed = 2.4, -- radians/second
		DragSensitivity = 0.006,
		ShakeMax = 1.2,
		ZoomMin = 0.6,
		ZoomMax = 1.8,
	},
}

return Tuning
