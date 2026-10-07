# DREAM COURIER

A linear third-person dream adventure built with Three.js.

You are **Ori**, a courier on **the Route** — the network that carries humanity's dreams. The first delivery is a sealed jar of morning in a soft, cloudy, pastel sky-town. Each delivery after that goes deeper: through a velvet sky-station, a giant child's bedroom, an empty mall, an endless hotel, the machinery under the dream, a flooded sea of memories, the yellow rooms, an unfinished dream, and finally the Sleepless Core — where the Route's last parcel waits for you to decide what dreaming is worth.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5188
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve dist/ on http://127.0.0.1:4188
```

## Controls

| Action | Keyboard / mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | left stick | left joystick |
| Look | mouse (click the view to capture it) | right stick | drag the view |
| Sprint (vault low obstacles) | Shift | L3 / LT | push the joystick to its edge |
| Jump (push into a ledge to climb it) | Space | A | JUMP |
| Sneak (toggle) | C | B | SNEAK |
| Talk / deliver / continue dialogue | E | X | USE |
| Dream Pulse (wake anchors, stun Husks) | Q / right mouse | Y / RB | PULSE |
| Swing courier bag | F / left mouse | LB / RT | SWING |
| Pause | Esc | Start | ❚❚ |

Progress saves automatically at checkpoints. Chapters you've reached stay open in **Chapters**. Each chapter hides three optional **Dream Stamps**.

## The ten chapters

1. **The Cloud District:** pillowy rooftops, a grey garden you wake with the parcel, and a lighthouse delivery.
2. **The Velvet Station:** a dusk railway concourse, a sky-train ride, an unmapped platform, and a staircase printed from tickets.
3. **The Playroom Quarter:** Ori is tiny in a sleeping giant bedroom; a toy-train ferry, the first Parcel Husks, and a hallway that goes too far.
4. **The Quiet Mall:** endless muzak, hidden glass walkways revealed only while you keep pulsing, and mannequins that move when unobserved.
5. **The Long Hall:** a corridor that loops until you take the lit door, Lost Courier stealth in a sunset office, and Room 0.
6. **Below the Route:** conveyor belts recycling old dreams, a vast shaft, and Pell, who remembers.
7. **The Sleeping Sea:** drifting houses, frozen memories, a tide puzzle, and Watchers in the water.
8. **The Yellow Rooms:** a seeded backrooms maze; stand still and you fade; follow the hum while the Sleepless hunt.
9. **The Unfinished Dream:** grey fragments of every earlier place; stairs where down is up.
10. **The Sleepless Core:** a collapsing route, the Core, the truth about the Route, and the final choice (two endings).

## How it's built

- **Stack:** Vite + TypeScript + Three.js r186, [`postprocessing`](https://github.com/pmndrs/postprocessing) (bloom, tone mapping, vignette, noise, plus a custom `DreamEffect` for edge blur, warp, split-toning, glitch and chromatic fringe). Fonts are bundled (Fredoka, Nunito).
- **Dream shading:** every material gets a sun- and height-tinted fog, rim light and optional vertex "breathing" through `onBeforeCompile`. The sky dome uses the same fog function, so the horizon blends into the world.
- **World scale:** every chapter has three layers:
  - the playable route;
  - an extended layer of unreachable streets, rooms and islands;
  - a distant layer of skyline rings, floating districts, cloud banks and repeating rooms.

  Static geometry is merged per material with baked vertex AO.
- **Ori:** a procedural rig skinned to one `SkinnedMesh`, animated by damped procedural clips, all built in-engine. The clips:
  - idle that changes with dread;
  - walk, run and sprint cycles driven by distance travelled;
  - jump, fall and land squash;
  - mantle, vault, crouch-walk, bag swing, pulse, hurt and talk.

  The scarf is a verlet chain, the bag is a spring pendulum, and facial expressions follow each dialogue line.
- **Controller:** a kinematic capsule against AABB/ramp colliders, with:
  - step-up and ground snap;
  - moving-platform carry;
  - ledge mantling and sprint-vaulting;
  - water volumes;
  - coyote time and jump buffering.
- **Threats:**
  - **Parcel Husks:** melee with a telegraphed lunge.
  - **Lost Couriers:** lantern view cones and a suspicion meter.
  - **Static Figures:** move only when off-screen or occluded.
  - **Watchers:** vanish when looked at, or approach when you look away.
  - **The Sleepless:** relentless chasers.
- **Audio:** all procedural Web Audio:
  - a generative chord pad and music-box score that detunes and slows as the dream decays;
  - mall muzak;
  - fluorescent hum, wind, water, machinery and drone beds;
  - a convolution reverb;
  - event SFX and per-speaker dialogue voice blips.

Design notes are in [`docs/DESIGN.md`](docs/DESIGN.md), references in [`docs/REFERENCES.md`](docs/REFERENCES.md), and QA evidence in [`artifacts/final-evidence.md`](artifacts/final-evidence.md).

The previous, unrelated prototype in this repository is preserved under `legacy/schedule-i/`.
