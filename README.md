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

### Putting it on the internet

The whole site is a folder of static files with hash routing (`#/h/<key>`), so it works on any
static host with no configuration.

**GitHub Pages (already wired up):** `.github/workflows/pages.yml` publishes `site/` on every
push. Enable it once at **Settings → Pages → Source → GitHub Actions**. Your link is then
`https://<user>.github.io/<repo>/`.

**Netlify:** `netlify deploy --prod` (or connect the repo). `netlify.toml` sets publish `site`.

**Anything else:** upload the contents of `site/` — Vercel, Cloudflare Pages, a school web
folder, a USB stick. There is nothing to configure.

---

## Summit

### Playing with friends — no server, no downloads

Summit hosts itself. One of you presses **Host a run** and the game claims a five-letter
room code on a free public matchmaking broker (`wss://0.peerjs.com`, plain HTTPS on port 443).
Everyone else types that code and presses **Join**. The host's tab runs the authoritative
simulation — the exact same code the Node server runs — and everyone connects to it directly
over WebRTC, with a TCP/443 relay as fallback so locked-down networks still get through.

1. Open the site. Type a name.
2. **Host a run** → read out the five-letter code.
3. Friends type the code → **Join**.
4. Ready up in the hangar. Four climbers per room.

The host has to keep the tab open — it is the server. If the broker is unreachable from your
network the run still starts; you just climb alone until someone can dial in.

### Optional: a dedicated server

If you would rather run one (it survives the host closing their tab, and joins are instant):

```
npm run server                 # ws://localhost:8787/ws
PORT=9000 npm run server
```

`GET /health` returns `{ ok, rooms, players, up }`. Put the address in **Advanced → Dedicated
server** on the menu. Over `https` the address must be `wss://`. Deploy `server/index.js` to
Render / Fly / Railway as a single web service if you want it permanent.

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
