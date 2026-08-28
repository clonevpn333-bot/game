# Nova Arcade + Summit

Two things live in this repo:

1. **Nova Arcade** — a private, manifest-driven game hub (`site/`), deployable to Netlify.
2. **Summit** — a four-player co-op climbing game with a real authoritative server (`server/`).

```
npm install          # ws (server) + three/playwright (dev only)
npm run site         # static hub on http://localhost:4321
npm run server       # Summit game server on ws://localhost:8787/ws (also serves the site on :8787)
npm run check        # syntax-checks every JS file
```

---

## Nova Arcade

Open `http://localhost:4321/`. The gate mints **128 bits of CSPRNG entropy**, renders it as a
22-character base62 key and sends you to `/h/<key>` — your private hub. Nobody guesses that URL.

- **Regenerate a link:** the link button in the header (or "My link"). The old key is retired on
  this device and lands on a "retired link" screen; the new one is yours immediately.
- **Your profile** (favourites, recently played, play counts) is namespaced by key, so a
  regenerated link starts clean.

### Adding a game

1. Drop the game into `site/games/<your-game>/` with an `index.html`.
2. Add one entry to `site/games/games.json`:

```json
{
  "id": "your-game",
  "title": "Your Game",
  "tagline": "One line that sells it.",
  "description": "A paragraph for the detail page.",
  "category": "arcade",
  "tags": ["endless", "reflex"],
  "players": "1 player",
  "entry": "games/your-game/index.html",
  "added": "2026-09-01",
  "controls": "WASD · Space",
  "art": { "motif": "neon", "hue": 292, "seed": 17 }
}
```

Nothing else changes. Cover art is generated from the `art` block — motifs are
`summit`, `neon`, `vector`, `prism`, `metro`.

Games run in a sandboxed iframe (`allow-scripts allow-same-origin allow-pointer-lock`) with
fullscreen and pointer lock allowed, and no access to the hub's DOM.

### Deploying to Netlify

`netlify.toml` is already set up: publish directory `site`, no build step, and a rewrite so
`/h/*` serves the hub shell.

```
netlify deploy --prod          # or connect the repo in the Netlify UI
```

---

## Summit

### Running the server

```
npm run server                 # ws://localhost:8787/ws
PORT=9000 npm run server       # any port you like
```

`GET /health` returns `{ ok, rooms, players, up }`. The same process also serves `site/`, so
`http://localhost:8787/games/summit/` works without the static server running.

### How your friends connect

1. Start the server on your machine.
2. Make it reachable:
   - **Same wifi:** they use `ws://<your-lan-ip>:8787/ws` (e.g. `ws://192.168.1.24:8787/ws`).
   - **Over the internet, quick:** `ngrok http 8787` and hand them
     `wss://<subdomain>.ngrok-free.app/ws`.
   - **Over the internet, permanent:** deploy `server/` to Render / Fly / Railway
     (`node server/index.js`, one web service, no database), then use
     `wss://<your-app>.onrender.com/ws`.
3. Everyone opens Summit (from the arcade, or `site/games/summit/index.html`), pastes the
   **server address** into the field on the menu, and types a name.
4. One of you presses **Host a run** and reads out the five-character **room code**.
   The others type it in and press **Join**. Four climbers per room.
5. Ready up in the hangar. When everyone is ready the plane takes off.

The client remembers your name and the server address. If your connection drops, it reconnects
with your token and you resume the same climber — the run keeps going while you are away, and
your teammates see you greyed out until you are back.

> A page served over **https** can only open a **wss://** socket. Over http (localhost, LAN)
> plain `ws://` is fine. If you deploy the hub to Netlify, use a `wss://` server address.

### Controls (built for a MacBook trackpad — no scroll wheel, no right-drag)

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look — click once to capture the pointer |
| **Hold left button** | **Grip the rock.** This is how you climb |
| Space | Jump · mantle a ledge · open the parachute |
| Shift | Sprint |
| E | Interact: open loot, light a campfire, board the helicopter · **hold** to revive |
| F | Boost a teammate up · pick up and drag a downed body (F again to let go) |
| R | Throw a rope to the nearest teammate |
| Q | Ping where you are looking (Shift+Q marks danger) |
| H | Sound the horn |
| 1 – 9 | Use an item · hold **G** to drop it · hold **F** to hand it to a teammate |
| C | Emote wheel (hold, aim, release) |
| T | Chat |
| V | First person / third person |
| Tab | The board (in the hangar) |
| Esc | Release the pointer / pause |

### How a run goes

**Hangar** → ready up, change cosmetics, read the board.
**Flight** → the plane crosses the water; the door opens about seven seconds in. Space to jump.
**Dive** → freefall at terminal speed, Space opens the canopy (it opens itself at 230 m).
**Beach** → land on the sand. From here it is 1400 metres of climbing.
**The mountain** → shoreline, deep jungle, the rock face, alpine snow, the caldera. A campfire
sits at every biome boundary; lighting one saves the run **and brings back everyone who died**.
**Summit** → reach the plateau and the helicopter comes in. Everyone boards, everyone gets paid.

Stamina is the whole game: climbing burns it, hanging burns it, carrying weight burns it faster,
standing on solid ground gives it back, and a campfire gives it back fast. At zero you slide.

### Verifying it works

```
npm run server &                 # or sh tools/srv.sh start
node tools/nettest.js            # headless 2-client run through every phase + reconnect
node tools/climbsim.js SEED-A    # proves a seed's route is climbable using the real movement code
node tools/duotest.js            # two real browsers in one room
node tools/playtest.js           # one browser through a whole run, reports console errors
```

Dev pages: `games/summit/dev.html` (terrain viewer — `?view=beach|mid|summit|air&day=0.4`),
`games/summit/char.html` (climber preview — `?n=4&anim=walk`),
`games/summit/textures.html` (every generated texture).
