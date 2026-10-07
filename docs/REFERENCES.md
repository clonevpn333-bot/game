# References

Gathered during pre-production (web search; most article hosts were blocked by the session's egress policy, so these are the search-result summaries and the techniques taken from them).

## Mood and art direction
- **Sky: Children of the Light** (thatgamecompany) — cloud-sea worlds; light used visually *and* thematically to make emotional environments; every character, creature and cloud designed toward a dreamlike connection. → Ch1–2 cloud seas, warm rim light, light pillars as wayfinding. ([80.lv interview](https://80.lv/articles/interview-a-deep-dive-into-the-art-of-sky-children-of-the-light-with-thatgamecompany), [GDC Vault: Art of Sky](https://gdcvault.com/play/1026903/Art-of-Sky-Children-of))
- **Yume Nikki** (Kikiyama, 2004) — surreal dream exploration with no combat; ancestor of the walking-sim and of dream-horror. → dream logic, residents that don't behave like people. ([Wikipedia](https://en.wikipedia.org/wiki/Yume_Nikki))
- **Dreamcore** (Montraluz) — soft pastels, nursery murals and faint lullabies contrasted with echoing empty halls; *Playrooms*: padded rooms, plastic castles, ball corridors, oversized blocks, printed city carpets, "the logic of childhood entertainment stripped of functionality or human presence"; tension built without monsters. → Ch3 Playroom Quarter and the pastel-wrong palette. ([PS Store](https://store.playstation.com/en-au/concept/10011875), [Melies: dreamcore look](https://melies.co/cinematic-techniques/genre-looks/dreamcore))
- **POOLS** (Tensori) — "an art gallery styled single player experience"; lets the player wallow in atmosphere instead of jump-scares; takes a safe, sanitary space and expands it to an absurd degree. → Ch4–5, Ch8: scale + repetition over monsters. ([FingerGuns review](https://fingerguns.net/games/2024/05/21/pools-review-pc-the-backroom-buoys/))
- **The Backrooms** meme family — mono-yellow wallpaper, damp carpet, fluorescent hum, "Level 188" hotel corridors. → Ch8 Yellow Rooms. ([80.lv on liminal-space games](https://80.lv/articles/this-indie-game-lets-you-explore-liminal-spaces))

Dreamcore palette summary (Melies): soft liminal interiors — empty rooms, pools, suburban halls lit by childhood practicals gone slightly wrong; low contrast, unresolved space; 1990s suburban pastel or pool cyan, slightly sick.

## Techniques / libraries ("plugins")
- **pmndrs `postprocessing`** — merged effect passes: mipmap Bloom, Vignette, Noise, ChromaticAberration, HueSaturation, ToneMapping + a custom `DreamEffect` (edge blur, warp, tint, glitch). Cheaper than chaining `three/addons` ShaderPasses.
- **three/addons** — `RoundedBoxGeometry` (pillowy architecture), `BufferGeometryUtils.mergeGeometries` (static batching to keep draw calls low).
- **Procedural rigging** — named joint hierarchy (hips → spine → chest → neck → head, shoulders → elbows → wrists, hips → knees → ankles) with authored procedural clips (idle breathe, walk/run/sprint cycles with foot contact timing, jump/fall/land squash, mantle, vault, crouch-walk, bag swing, hurt, talk) blended by weights, plus spring-chain secondary motion on the scarf and bag.
- **Playwright + Chromium** (pre-installed `/opt/pw-browsers`) for screenshots, canvas inspection and bot playtests.
- **@takram/three-clouds** (considered, rejected: geospatial volumetric clouds are too heavy for a browser adventure; stylised instanced cloud puffs with a soft wrap-lit shader read better and cost far less).

## No external generation
The asset-credential probe reported `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`, `ELEVENLABS_API_KEY=MISSING`, so all models are procedural Three.js and all audio is synthesized at runtime with Web Audio.
