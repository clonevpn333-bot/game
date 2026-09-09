# Among Us 3D — Definitive Edition

A first-person, browser-based take on Among Us. Same crewmates, same UI language, same
task list, same shop — rebuilt in light 3D so you play it from inside the ship instead of
looking down on it.

Open `index.html` in any modern browser. There is no build step, no install and no server:
Three.js and PeerJS are vendored in `vendor/`, so it works from `file://` or any static host.

---

## What's in it

### Maps
All five official maps, laid out room-for-room with corridors, vents, sealable doors and
map-specific systems:

| Map | Rooms | Notable |
|---|---|---|
| **The Airship** (default) | 19 | Avert Crash Course (two-person code entry), Vault, Gap Room, Records |
| The Skeld | 14 | Reactor + O2 meltdowns, Security cams, Admin table |
| MIRA HQ | 13 | Door Log instead of cameras, Decontamination |
| Polus | 15 | Seismic Stabilizers, outdoor areas, Vitals |
| The Fungle | 17 | Mushroom Mixup sabotage, Campfire, Fishing Dock |

Corridors are generated from each map's adjacency list, so every room is guaranteed
reachable, and walls, ceilings, doors and vents are built from the resulting floor plan.

### Roles
Every role currently in the game, with the real cooldowns and lobby options:

**Crewmate** · **Engineer** (vent access) · **Scientist** (portable Vitals on a task-charged
battery) · **Noisemaker** (death alert) · **Tracker** (place a tracker, follow it on the map)
· **Detective** (take Notes on a body, Interrogate suspects in the meeting) ·
**Guardian Angel** (granted on death — shield the living) · **Judge** (Overrule a vote once;
wrong, and you're the one ejected)

**Impostor** · **Shapeshifter** (copy a player, optionally leaving a skin behind) ·
**Phantom** (turn invisible) · **Viper** (acid kills — bodies dissolve on a timer)

### Tasks
Per-map task lists matching the real games, split into Common / Long / Short, with
multi-step tasks (Fuel Engines, Empty Garbage, Divert Power, Pick Up Towels…) and 25
distinct minigames: wiring, keypads, card swipes, Simon, sliders, dials, target shooting,
sorting, chart plotting, timing bars, the MedBay scan and more. Visual tasks show a beam
everyone nearby can see, so they still clear you.

### Sabotages
Reactor / Seismic Stabilizers, Oxygen, Lights, Comms, Doors, Avert Crash Course and
Mushroom Mixup. Critical sabotages run a countdown and can end the round.

### Meetings
Discussion and voting timers, the voting grid with per-player vote pips, anonymous votes,
Confirm Ejects wording, skip votes, text chat plus Among Us-style quick chat, ghost chat the
living can't read, and the ejection cutscene.

### Shop & progression
Beans, Stars and Pods; hats, visors, skins, pets and nameplates; three Cosmicubes with
branching paths unlocked in order with Pods; a level/XP track with a Bean multiplier; and
a live 3D customization screen.

---

## Multiplayer — serverless

Online play is pure peer-to-peer WebRTC. **There is no game server.**

* **Room codes** — one player hosts and gets a six-character code; everyone else joins with
  it. Signalling goes through the public PeerJS broker; no account, no backend of yours.
* **Direct Connect** — if you'd rather not touch a broker at all, the host creates an offer
  blob, the guest pastes it back an answer blob, and the connection is established with
  nothing in between.
* **Voice chat** — a WebRTC audio mesh. Proximity by default (volume falls off with distance
  and through walls), everyone hears everyone in meetings, ghosts hear only ghosts. Modes:
  Off / Proximity / Meetings Only / Always On, plus push-to-talk.
* **Text chat** — lobby chat, meeting chat with quick-chat presets, and separate ghost chat.
* **AI bots** — empty slots fill with bots, so a two-player room still plays like a full one.

The host is authoritative and sends each peer a *filtered* snapshot: you only ever receive
your own role and your fellow Impostors', never anyone else's.

## AI bots

Bots run their task lists, path around with A*, react to bodies, fix sabotages, and vote.
Impostor bots stalk isolated targets, check for witnesses before killing, vent away, fake
tasks, sabotage, and bluff in the meeting chat — including self-reports and bandwagoning.

---

## Controls

| Key | Action |
|---|---|
| `W A S D` | Move |
| Mouse | Look (click the view to capture the pointer) |
| `E` | Use / do task / call meeting |
| `Q` | Kill |
| `R` | Report body |
| `F` | Vent |
| `C` | Role ability |
| `Tab` | Map |
| `M` | Sabotage map |
| `V` | Mic toggle (or push-to-talk) |
| `T` | Ghost chat |
| `Esc` | Pause menu |

Touch devices get an on-screen stick plus drag-to-look automatically.

---

## Layout

```
index.html          screens, HUD and overlays
css/style.css       the whole UI
vendor/             three.min.js, peerjs.min.js (vendored — works offline)
js/data.js          colours, cosmetics, roles, lobby settings
js/save.js          wallet, cosmetics, level, settings (localStorage)
js/audio.js         procedural WebAudio SFX + ambient bed
js/models.js        crewmate, hats, visors, skins, pets, ghosts, bodies
js/maps.js          the five maps and their task lists
js/nav.js           corridor generation, collision grid, A*
js/world.js         walls, floors, ceilings, doors, vents, consoles, props
js/tasks.js         the 25 minigame engines
js/roles.js         role assignment and options
js/ai.js            bot brains
js/net.js           P2P transport, voice, chat
js/meeting.js       meetings, voting, ejection
js/hud.js           HUD, map, Admin, Cameras, Vitals, Door Log
js/shop.js          shop, Cosmicubes, customization
js/menu.js          menus, lobby, settings
js/game.js          round flow, movement, kills, sabotage, sync
```

## Notes

* Single-player Freeplay works entirely offline; only the room-code path needs the internet
  (for WebRTC signalling and STUN).
* Graphics quality, FOV, sensitivity, head bob and a third-person toggle live under
  Settings → My Settings.
