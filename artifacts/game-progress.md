# STARFALL DOMINION — progress

## Intent / constraints
- Single-file HTML client (`starfall.html`), Three.js r160 via import map (jsDelivr). No external asset keys → all art + audio procedural.
- Third-person commander on the ground + real-time galaxy empire layer. Rival AI commanders use the same command API a networked human would.
- Desktop-first (mouse + keyboard). Existing "Schedule I" game in repo left untouched.

## Design brief
- Promise: drop onto alien worlds with a tiny squad and grow it into an interstellar dominion whose cities keep building while you are away.
- Primary verb: fight alongside & command your army (shoot, order, call orbital directives).
- Secondary: capture uplinks, tame/pacify/ally/dominate/exterminate natives, found colonies, pick governors, move fleets, answer invasions.
- 5–30s loop: shoot, reposition squad, call a directive, capture progress ticks.
- 1–5 min: secure a planet → governor & settlers → leave; alerts pull you back; colonies visibly level up.
- Fail/learn: commander down → respawn by drop pod (costs reserve troops); reserves empty → forced evac; planets can fall to sieges.
- Risk/reward: deeper/hostile worlds + rival worlds give captured cities, renown, doctrine points.

## Core loop contract
Commander fights with troops to capture uplinks while natives, titans and rival garrisons pressure the squad; success converts the planet into a colony that grows in real time and funds bigger armies/fleets; failure costs troops, colonies, or forces evac.

## Level plan (per planet)
- Playable disc r≈950 on a 2200² heightfield, far ring to 9 km with biome mountains/landmarks, sky dome w/ gas giant, orbital fleets overhead.
- Landing zone r≈700; central basin (r≈260, flattened) is the settlement site; 3–5 uplinks spread 250–800; nests/monoliths/village/titan lair placed by biome; rival bastion at centre when rival-owned.
- Escalation: nest spawns + rival waves grow with capture count; titan roams; defense missions = waves vs your city.

## Status
- [ ] core / sim / audio / render / models / world / ground / space / ui / main
- [ ] browser QA
