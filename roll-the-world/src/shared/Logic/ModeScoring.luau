--!strict
-- Mode rules that are pure functions: per-player score, standings, team balance and totals,
-- and how the vote between rounds is resolved. Unit tested in tests/modes.spec.luau.

local Modes = require(script.Parent.Parent.Data.Modes)

local ModeScoring = {}

export type Stats = {
	userId: number,
	finalDiameter: number,
	crownTime: number?,
	goldPoints: number?,
	team: string?,
	[string]: any,
}

ModeScoring.TEAMS = { "Red", "Blue" }

function ModeScoring.score(modeId: string, s: Stats): number
	local mode = Modes.get(modeId)
	if mode.scoring == "crown" then
		return s.crownTime or 0
	elseif mode.scoring == "gold" then
		return s.goldPoints or 0
	end
	return s.finalDiameter
end

function ModeScoring.teamTotals(list: { Stats }): { [string]: number }
	local totals = { Red = 0, Blue = 0 }
	for _, s in list do
		if s.team and totals[s.team] then
			totals[s.team] += s.finalDiameter
		end
	end
	return totals
end

-- The winning team (nil if not a team mode or a dead tie).
function ModeScoring.winningTeam(modeId: string, list: { Stats }): string?
	if Modes.get(modeId).scoring ~= "team" then
		return nil
	end
	local t = ModeScoring.teamTotals(list)
	if t.Red == t.Blue then
		return nil
	end
	return if t.Red > t.Blue then "Red" else "Blue"
end

-- Standings: best first. In team modes the winning team's players come first.
function ModeScoring.standings(modeId: string, list: { Stats }): { Stats }
	local sorted = table.clone(list)
	local winner = ModeScoring.winningTeam(modeId, list)
	table.sort(sorted, function(a, b)
		if winner then
			local aw, bw = a.team == winner, b.team == winner
			if aw ~= bw then
				return aw
			end
		end
		local sa, sb = ModeScoring.score(modeId, a), ModeScoring.score(modeId, b)
		if sa == sb then
			if a.finalDiameter ~= b.finalDiameter then
				return a.finalDiameter > b.finalDiameter
			end
			return a.userId < b.userId
		end
		return sa > sb
	end)
	return sorted
end

-- Team for a new arrival: the side with fewer members (ties alternate by count parity).
function ModeScoring.pickTeam(counts: { [string]: number }): string
	local red, blue = counts.Red or 0, counts.Blue or 0
	if red == blue then
		return if (red + blue) % 2 == 0 then "Red" else "Blue"
	end
	return if red < blue then "Red" else "Blue"
end

-- Resolve votes: most votes wins; ties go to the earliest-listed tied option unless a tiebreak
-- index (random, from the caller) is given.
function ModeScoring.resolveVote(optionCount: number, votes: { [any]: number }, tiebreak: number?): number
	local counts = table.create(optionCount, 0)
	for _, idx in votes do
		if counts[idx] then
			counts[idx] += 1
		end
	end
	local best = -1
	local tied = {}
	for i, c in counts do
		if c > best then
			best = c
			tied = { i }
		elseif c == best then
			table.insert(tied, i)
		end
	end
	if #tied == 0 then
		return 1
	end
	local pick = if tiebreak then ((tiebreak - 1) % #tied) + 1 else 1
	return tied[pick]
end

return ModeScoring
