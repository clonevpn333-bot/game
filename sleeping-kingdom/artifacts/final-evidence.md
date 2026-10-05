# The Sleeping Kingdom — Chapter I evidence

**Run:** `cd sleeping-kingdom && npm install && npm run dev`, then open http://127.0.0.1:5188
(`model.html?char=knight&pose=guard&spin` is the hero model viewer.)

## What ran
- `npx tsc --noEmit`: clean. `npx vite build`: clean (≈800 kB JS, 217 kB gzip).
- Headless Chromium (SwiftShader) via `scripts/capture.mjs` jumped through every story stage with the test hooks:
  title, ride, gate, market, tremor, combat, stair, boss, ending (+ mobile combat at 390×844).
  There were no page errors. The only console error is Google Fonts being blocked by the sandbox proxy; serif fallbacks apply.

## Renderer (worst active-play views, desktop 1280×720)
| Stage | Calls* | Triangles |
| --- | --- | --- |
| ride | 710 | 576k |
| market | 683 | 592k |
| combat | 573 | 572k |
| boss | 435 | 563k |
| ending | 219 | 553k |

*Calls include the shadow pass and the bloom passes. That is over the 300-call budget, and it's the main known perf debt.

## Captures
`artifacts/shots/`: desktop-ride, desktop-market, desktop-combat, desktop-boss, desktop-ending,
mobile-combat, and hero-v2 (hero turnaround from the model viewer).

## Not verified
- Real-GPU frame rate and real input playthrough (only scripted stage jumps and screenshots were exercised).
- Audio was not listened to (it is synthesised; the code paths ran without errors).
