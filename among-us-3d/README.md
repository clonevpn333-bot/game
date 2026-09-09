# Among Us 3D — Definitive Edition

A first-person, browser-based take on Among Us. Same crewmates, same UI language, same
task list, same shop — rebuilt in light 3D so you play it from inside the ship instead of
looking down on it.

Open `index.html` in any modern browser. There is no build step, no install and no server:
Three.js and PeerJS are vendored in `vendor/`, so it works from `file://` or any static host.

## Download & play

**Grab the files**

* Download the ZIP from GitHub: the branch page → **Code ▾ → Download ZIP**, or
  `git clone -b claude/3d-among-us-game-xhh2w3 https://github.com/clonevpn333-bot/game.git`
* Unzip it, open the `among-us-3d` folder, and double-click **`index.html`**.

That's it — Freeplay against AI bots runs straight from your hard drive with no internet.

**Playing online (up to 15 players; six is a great size)**

1. One person clicks **ONLINE → CREATE ROOM** and reads out the six-character code.
2. Everyone else types their name and the code, then clicks **JOIN ROOM**.
3. Allow the microphone prompt if you want voice chat.
4. The host presses **START**. Any empty slots fill with AI bots, so six humans plus
   four bots plays like a full ten-player lobby.

For online play everyone needs the same copy of the files — either all download it, or the
host serves it (`python3 -m http.server` in the `among-us-3d` folder, or drop it on GitHub
Pages / Netlify) and shares the link.

---

## What's in it

### Role reveal
Every round opens on the full cinematic: a starfield, your crew lined up with you front and
centre, and the big word — **CREWMATE** in blue or **IMPOSTOR** in glowing red — followed by
"There is 1 Impostor among us". Specialists get a card naming the role, what it does and the
key that fires its ability, and Impostors get their fellow Impostors in the line-up plus
"Shhh… no more talking now." A badge under the task bar then says what you are for the whole
round, and updates if you die or are promoted to Guardian Angel.

### Always-on minimap
The map sits in the corner the entire round, showing the deck, your position and a facing
wedge, your next task markers, closed doors, live sabotages, vents (if you can use them),
your tracked player, and — once you are a ghost — everybody. The room you are standing in is
named underneath. Press the ⤢ button to switch between the whole deck and a zoomed view.

### Maps
All five official maps, laid out room-for-room with corridors, vents, sealable doors and
map-specific systems. Interiors are built out rather than boxed in: panelled walls with ribs
and conduit runs, framed doorways with status lamps, ceiling pipes and light strips down
every corridor, windows wherever a wall backs onto open sky, corner posts, hazard banding at
room thresholds, and per-room set dressing (reactor cores, medbay beds, cargo crates, vault
doors, kitchen counters, shower stalls, camera banks).

| Map | Rooms | Notable |
|---|---|---|
| **The Airship** (default) | 19 | Avert Crash Course (two-person code entry), Vault, Gap Room, Records |
| The Skeld | 14 | Reactor + O2 meltdowns, Security cams, Admin table |
| MIRA HQ | 13 | Door Log instead of cameras, Decontamination |
| Polus | 15 | Seismic Stabilizers, outdoor areas, Vitals |
| The Fungle | 17 | Mushroom Mixup sabotage, Campfire, Fishing Dock |

Corridors are generated from each map's adjacency list, so every room is guaranteed
reachable, and walls, ceilings, doors and vents are built from the resulting floor plan.

### Models and animation
Crewmates are built procedurally — bean body, curved visor with a rounded-rect patch that
hugs the head, backpack, stub legs with shoes, and mitten arms — toon-shaded with a black
outline shell. They walk with a real cycle: legs swing, arms counter-swing, the body bobs and
squashes on each footfall, the hat lags a beat behind, and pets trot along hopping in time.
Venting scales you down into the floor, kills throw a lunge and a camera shake, ghosts drift
and sway, bodies settle onto the deck, and Viper kills dissolve.

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
* **Direct Connect** — if you'd rather not touch a broker at all, the host presses
  **CREATE OFFER** once per guest, sends each blob to a different player, and pastes their
  answer back. Five guests, five offers: a full six-player room with no infrastructure
  whatsoever. The host relays the guests' handshakes to each other, so voice still meshes
  fully rather than routing through the host.
* **Voice chat** — a full WebRTC audio mesh: every player holds a direct audio link to
  every other player, on both the room-code and Direct Connect paths. Proximity by default
  (volume falls off with distance and is muffled through walls), everyone hears everyone in
  meetings, ghosts hear only ghosts. Modes: Off / Proximity / Meetings Only / Always On,
  plus push-to-talk.
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

## Two ways to ship it

* `index.html` — the normal multi-file game.
* `among-us-3d-single.html` — the whole game bundled into one self-contained HTML file
  (rebuild it any time with `python3 build-single.py`).
* `overclock-ii.html` — **the second site**: the Overclock launcher rebranded, carrying this
  game and nothing else.

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
js/memory.js        what each bot witnessed: proof, alibis, bias, hearsay
js/chat.js          local chat parser and grounded bot replies
js/intro.js         the role reveal cinematic
js/game.js          round flow, movement, kills, sabotage, sync
build-single.py     bundles everything into one HTML file
```

## Notes

* Single-player Freeplay works entirely offline; only the room-code path needs the internet
  (for WebRTC signalling and STUN).
* Graphics quality, FOV, sensitivity, head bob and a third-person toggle live under
  Settings → My Settings.
