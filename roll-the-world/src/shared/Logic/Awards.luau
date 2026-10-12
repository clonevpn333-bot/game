--!strict
-- End-of-round award selection. Several categories so more than one player feels like a winner:
-- each category prefers a player who hasn't already won something, when one qualifies.

export type PlayerRound = {
	userId: number,
	name: string,
	finalDiameter: number,
	peakDiameter: number,
	discoveries: number,
	playersRolled: number,
	timesRolled: number,
	comebackRatio: number, -- final size / size right after last respawn (0 if never rolled)
	requestsCompleted: number,
	rarestOrder: number, -- rarity order of rarest find, + mutation bonus (0 = none)
	rarestUid: number,
	rarestMutation: number,
}

export type Award = {
	id: string,
	title: string,
	icon: string,
	userId: number,
	name: string,
	value: number,
}

local Awards = {}

Awards.Categories = {
	{
		id = "Biggest",
		title = "Biggest Ball",
		icon = "🏆",
		score = function(p: PlayerRound): number
			return p.finalDiameter
		end,
		minimum = 0,
		exclusive = false, -- the top prize always goes to the true winner
	},
	{
		id = "RarestFind",
		title = "Rarest Find",
		icon = "💎",
		score = function(p: PlayerRound): number
			return p.rarestOrder
		end,
		minimum = 3, -- Rare or better
		exclusive = true,
	},
	{
		id = "MostPlayersRolled",
		title = "Player Roller",
		icon = "🌀",
		score = function(p: PlayerRound): number
			return p.playersRolled
		end,
		minimum = 1,
		exclusive = true,
	},
	{
		id = "BestComeback",
		title = "Best Comeback",
		icon = "🔥",
		score = function(p: PlayerRound): number
			return if p.timesRolled > 0 then p.comebackRatio else 0
		end,
		minimum = 1.5,
		exclusive = true,
	},
	{
		id = "MostDiscoveries",
		title = "Top Explorer",
		icon = "🔍",
		score = function(p: PlayerRound): number
			return p.discoveries
		end,
		minimum = 1,
		exclusive = true,
	},
	{
		id = "RequestCompleted",
		title = "Nana's Helper",
		icon = "🧶",
		score = function(p: PlayerRound): number
			return p.requestsCompleted
		end,
		minimum = 1,
		exclusive = true,
	},
}

function Awards.select(players: { PlayerRound }): { Award }
	local awards: { Award } = {}
	local winners: { [number]: boolean } = {}
	for _, cat in Awards.Categories do
		local ranked = {}
		for _, p in players do
			local s = cat.score(p)
			if s >= cat.minimum and s > 0 then
				table.insert(ranked, { p = p, s = s })
			end
		end
		table.sort(ranked, function(a, b)
			if a.s == b.s then
				return a.p.userId < b.p.userId
			end
			return a.s > b.s
		end)
		local pick = ranked[1]
		if pick and cat.exclusive then
			-- Prefer someone who hasn't won yet, as long as they're within 75% of the best score.
			for _, entry in ranked do
				if not winners[entry.p.userId] and entry.s >= ranked[1].s * 0.75 then
					pick = entry
					break
				end
			end
		end
		if pick then
			winners[pick.p.userId] = true
			table.insert(awards, {
				id = cat.id,
				title = cat.title,
				icon = cat.icon,
				userId = pick.p.userId,
				name = pick.p.name,
				value = pick.s,
			})
		end
	end
	return awards
end

-- Final standings by size (for the podium).
function Awards.standings(players: { PlayerRound }): { PlayerRound }
	local sorted = table.clone(players)
	table.sort(sorted, function(a, b)
		if a.finalDiameter == b.finalDiameter then
			return a.userId < b.userId
		end
		return a.finalDiameter > b.finalDiameter
	end)
	return sorted
end

return Awards
