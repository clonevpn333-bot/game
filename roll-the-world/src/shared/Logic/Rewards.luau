--!strict
-- Stardust reward math for one player's round. Pure so the economy can be unit tested and tuned.

local Tuning = require(script.Parent.Parent.Config.Tuning)

export type RoundInput = {
	finalDiameter: number,
	cmPerStud: number,
	discoveries: number, -- brand-new Rolledex entries this round
	newVariants: number, -- new mutation variants this round
	playersRolled: number,
	awards: number,
	rarityPoints: number, -- sum of RarityBonus over everything absorbed
	friendsInServer: number,
	vip: boolean,
	doubleStardust: boolean,
	eventMultiplier: number?,
}

export type Breakdown = {
	size: number,
	discoveries: number,
	players: number,
	awards: number,
	rarity: number,
	participation: number,
	base: number,
	multiplier: number,
	total: number,
}

local Rewards = {}

function Rewards.round(input: RoundInput): Breakdown
	local r = Tuning.Rewards
	local meters = input.finalDiameter * input.cmPerStud / 100
	local size = math.floor(meters * r.StardustPerMeterGrown + 0.5)
	local discoveries = input.discoveries * r.StardustPerDiscovery + input.newVariants * r.StardustPerNewVariant
	local players = input.playersRolled * r.StardustPerPlayerRolled
	local awards = input.awards * r.StardustPerAward
	local rarity = math.floor(input.rarityPoints)
	local participation = r.StardustParticipation
	local base = size + discoveries + players + awards + rarity + participation

	local multiplier = 1
	multiplier += math.min(input.friendsInServer * r.FriendBonusPerFriend, r.FriendBonusMax)
	if input.vip then
		multiplier += r.VipBonus
	end
	multiplier *= input.eventMultiplier or 1
	if input.doubleStardust then
		multiplier *= r.DoubleStardustPassMultiplier
	end
	local total = math.min(math.floor(base * multiplier + 0.5), r.RoundStardustCap)
	return {
		size = size,
		discoveries = discoveries,
		players = players,
		awards = awards,
		rarity = rarity,
		participation = participation,
		base = base,
		multiplier = multiplier,
		total = total,
	}
end

return Rewards
