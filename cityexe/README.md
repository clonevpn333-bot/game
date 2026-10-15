# CITY.EXE

A living city you can watch, interfere with, and step into.

About 1,400–1,800 persistent citizens live in one hand-tuned procedural city. They have homes, jobs, money, needs, traits, friends, partners, cars and a life log, and the city keeps running whether you watch it or not. Zoom over it, click anyone, and dive down to play as them in third person: walk, drive their car, respond to calls as a police officer, fight fires, drive a cab, fly the news helicopter. When you let go, their AI carries on from wherever you left them.

```bash
cd cityexe
npm start            # → http://localhost:8080  (Node 18+, no install needed)
```

Any static file server works (`python3 -m http.server`), because the game is plain ES modules with Three.js vendored in `vendor/`. Open `?fresh` to start a brand-new city, or `?seed=1234` for a different layout.

The title screen offers two ways to play. **Life** is BitLife meets GTA: make a character, wake up in your family's home and live one life in the city. **Sandbox** (`?sandbox`) is the original god's-eye view, where you can possess anyone.

## What you can do

| | |
|---|---|
| **Observe** | Free camera (pan, zoom, orbit), pause / slow-mo / 1× / 3× / 8× / fast-forward / skip time, hover tooltips, click anyone or anything for a concise card, follow people, live event ticker (click to fly there), bookmark citizens (★) and get alerted when something big happens to them, find people by name or job (`/`) |
| **Possess** | Double-click (or `P`) anyone not in jail or hospital. The camera swoops down and you take over whatever they're doing in the live simulation: a driver mid-commute, a cop mid-chase, a shopper at the register. `R` = autopilot (they live their life, you ride along), `Q` = leave the body |
| **On foot** | Third-person controller with run/jump, enter buildings, talk to people, get into your car, steal or carjack others' cars (people report you), rob stores (`G`), arrest suspects (officers), treat the injured (paramedics), hose down fires (firefighters), repair the grid (lineworkers) |
| **Driving** | Arcade physics with handbrake drifts, damage, crashes that create real incidents, sirens that make traffic pull over (`L`), horn, headlights. Bus drivers serve stops, cabbies pick up people who hail them, tow trucks hook wrecks, ambulances deliver patients |
| **Flying** | The Channel 6 news helicopter covers big stories; police Air 1 joins chases with a searchlight. Possess the pilot to fly |
| **Interiors** | Shops, restaurants, bars, homes, offices, police station (holding cells with whoever was actually arrested), fire station, hospital (beds with actual patients), metro stations (ride the train between stations), mall, warehouses, garages. They're populated by the citizens who are really inside |
| **God tools** (`G`) | Fire, blackout, broken traffic light, accident, gridlock, crime wave, riot, zoo escape, tornado, meteor, flood, economic boom/crash, every weather type, skip to night/morning |
| **History** | The City Archive (`H`) records major events by year, city records (longest chase, worst crash, longest blackout, richest citizen), and places to remember (craters, memorials, ruins) |
| **Life mode** | Create a character with a background (struggling, working class, middle class, wealthy, or a country kid out past the city limits) and a real family of citizens. Stats (health, happiness, smarts, looks, fitness, karma), skills and needs. Phone (`P`): messages, contacts, GPS, bank, lottery, news. Home computer: apply for jobs (clerk to officer to teacher to dealer), college programs, rent or buy homes with a mortgage, buy cars, a social feed. Clock in (`C`), perform, get promoted or fired. Date, marry, have or adopt kids, break up. Random life events, birthdays, inheritance, death and playing on as your heir |
| **Personalities** | Everyone has a Big Five profile, an archetype, likes, pet peeves, a backstory and a way of talking. Talk to anyone (`T`) |
| **Nightlife & money** | Nightclub, cabaret lounge, casino (blackjack, roulette, slots, three-card poker), bars. A daily lottery draw with real odds, banks with deposits and loans |
| **Crime** | Weapons (`X` to draw, right mouse to aim, left to fire or swing), mugging at gunpoint, a 5-star wanted level, police who return fire. Bank heists are hard: tellers only have their drawers; the money is in a steel vault you have to drill or burn through while guards shoot back and the alarm brings every unit in the city. Gun stores need a licence. The underground board on your computer (get an invite from a gang member) sells gear and illegal hardware, launders dirty cash and connects you to three gangs with turf, feuds and missions. Sell product on the street at night (`B`), and watch out for undercover cops. Jail time, lawyers, escape attempts, hospital bills |
| **The dark side** | A few citizens hide something. Night-time killers follow people walking alone. Stalkers watch a neighbour's building and escalate. Con artists empty pensioners' savings, an arsonist sets fires, and some people have a violent streak. They prey on other citizens and only rarely on you. Detectives work every case, link serial crimes ("the Night Caller") and make arrests. You can read the police blotter in the phone's news app |
| **Outskirts** | County Road 9 leads out of the city to Pinewood Hollow: cabins, trailers and farmhouses with yards, a working farm with jobs, firepits, gardens and woodpiles. It's cheap and quiet, and 25 minutes from everything |
| **EXE Mode** | Optional, in Settings. Rare, subtle, unexplained things start accumulating underneath the normal simulation |

### Controls

City view: `WASD`/drag pan · wheel zoom · right-drag or `Q`/`E` rotate · click inspect · double-click / `P` possess · `F` follow · `M` bookmark · `Space` pause · `1`–`5` speed · `0` slow-mo · `B` bookmarks · `H` archive · `G` god tools · `/` search.

Life / on foot: `P` phone · `T` talk · `C` clock in · `X` weapon · right mouse aim · left mouse fire · `G` mug / rob · `B` sell product (night).

Possessed: `WASD` move/drive · mouse look (click to lock the pointer) · `Shift` run/boost · `Space` jump/handbrake · `E` interact · `F` enter/exit vehicle · `G` crime · `H` horn · `L` siren/searchlight · `R` autopilot · `Q` leave · `C` camera. Helicopter: `W/S` pitch, `A/D` turn, `Space`/`C` altitude.

## How the simulation works

Everything you see is simulated. Nothing is a menu-only stand-in.

- **Citizens** (`js/sim/citizens.js`) decide at a low, staggered tick rate. The inputs are shift schedules, needs (energy, hunger, social, fun), money, traits and relationships. Possible actions: work, sleep, eat, shop, errands (pharmacy, fuel, car service), visit friends, meet at bars, walk in the park, look for work, and occasionally commit crimes when desperate and dishonest. Trips are chained legs: walk → get in car → drive → park in a curb slot or garage → walk → enter, or walk to a metro station, bus stop or taxi.
- **Traffic** (`js/sim/traffic.js`) is every car on a lane graph:
  - IDM car-following, traffic lights, all-way stops (also when signals fail or lose power), intersection reservations and don't-block-the-box rules
  - Curb parking, merging, yielding to sirens, and passing stopped obstacles
  - Vehicles switch to 2-D rigid-body physics when you drive them, when they crash, or when a tornado throws them
- **Emergency services** (`js/sim/services.js`, `incidents.js`): fleet vehicles crewed by on-shift citizens.
  - Dispatch picks the nearest available unit.
  - Police patrol, scan for wanted suspects, chase them (PIT maneuvers, backup units, helicopter tracking), arrest and book them.
  - Paramedics treat and transport patients to the hospital, firefighters spray burning buildings, tow trucks clear wrecks, and utility crews restore power.
- **Economy** (`economy.js`):
  - Businesses pay wages for hours actually worked, earn from real customer visits (plus a modest regional-visitor term), restock through physical deliveries, and get robbed.
  - Businesses go bankrupt and lay people off; entrepreneurs found new ones named after themselves.
- **Infrastructure**: a power grid with four zones and substations (blackouts hit signals, streetlights, shops, homes, metro and crime), weather (rain/snow change grip and speed, heat waves overload the grid), buses driven by bus drivers, an underground metro, taxis.
- **Evolution & history** (`evolution.js`, `history.js`): damaged buildings are repaired by real construction crews, and ruins are cleared and rebuilt. Empty buildings in declining areas get abandoned and later demolished. People move in, move out, move up, get evicted, date, break up, retire and age. Every major event lands in the archive.

### Simulation levels of detail

The city never runs full AI for everyone every frame:

| Level | What runs |
|---|---|
| Indoors | Abstract: needs decay, a decision every ~15–25 game minutes, interiors materialize the occupants only when you enter |
| Outdoors, far | Pedestrians tick at ¼ rate (and walk faster off-screen), no animation; cars run the cheap 1-D lane model |
| Outdoors, near | Full update, animated, pickable |
| Possessed | Player physics and interactions |
| Fast-forward ("Skip time") and offline catch-up | Trips resolve by ETA, incidents resolve probabilistically; emergency fleets stay physical in fast-forward |

Rendering is instanced throughout: the whole skyline is three draw calls (a facade shader draws windows, storefronts, lit rooms, power state, damage, fire, boarded windows and scaffolding per instance), vehicles are one instanced mesh per model, and people are eight part meshes animated per instance.

### Persistence

The city autosaves (gzip + IndexedDB) every in-game day, every two minutes and when the tab is hidden. When you come back, it simulates up to three days of what happened while you were away (about three game minutes per real minute) and shows a "While you were away" summary, including your bookmarked people.

## Project layout

```
cityexe/
  index.html, css/style.css
  js/main.js            boot, save/load, wiring
  js/game.js            loop, picking, observe mode
  js/sim/               world, cityGen, roads, sidewalks, traffic, peds, citizens, economy,
                        services, incidents, transit, power, weather, evolution, history,
                        disasters, helis, anomaly, save; life, lifeState, careers, persona,
                        lottery, combat, heists, crime (gangs), dark (killers, investigations)
  js/render/            renderer (sky, sun, bloom), post (AO, grading), cityView, materials
                        (surface shader, ModelKit), vehicleModels, vehicleView, peopleView, fx,
                        eventView, interiors, layouts (authored floorplans), furniture
  js/play/              cameraRig, possession, godTools, activities, weapons
  js/ui/                hud, lifeUI (creator, phone, computer, talk, jail), panels, games (casino)
  js/audio/audio.js     procedural WebAudio
  test/                 headless sim + browser screenshot scenarios
  vendor/               three.js r170 (MIT)
```

## Single-file build

`node tools/build-single.mjs [out.html]` bundles every module, Three.js and the
stylesheet into one self-contained HTML file (default `dist/cityexe.html`,
about 0.9 MB) that runs by double-clicking it, without a server. Needs
`esbuild` (`npm i -D esbuild`).

## Tests

```bash
node test/sim-headless.mjs 1 8      # one simulated day at 8×, prints traffic/incident stats
node test/long-run.mjs 30           # 30 days abstract: economy, evolution, sample life stories
node test/browser-shot.mjs out police   # boots the game in headless Chromium, waits for an organic
                                        # incident, possesses the responding officer, saves screenshots
node test/sim-crime.mjs 2.5         # gangs, feuds, missions, scams and cases over a few days
node test/sim-dark.mjs              # forces killers and stalkers to act and traces each hunt
```

Other browser scenarios are `overview`, `possess`, `god`, `interior`, `rooms`, `closeup`, and the Life-mode scenarios `life`, `crime` and `country` (run them with a `?life` query, e.g. `node test/browser-shot.mjs out crime "?life"`). See `test/scenarios.mjs` for the full list.

## Known limitations

- One travel lane per direction (overtaking is a scripted pass maneuver).
- Pedestrians don't collide with each other.
- Time compression makes cross-town walks take game-hours, so citizens prefer cars, metro, buses and cabs for longer trips.
- Interiors are authored per building type, not per building, and there are no stairs between floors.
- Pinewood Hollow is reached through a gateway at the city's edge, not by a drivable road.
- Software-rendered/integrated GPUs: use Settings → Graphics → Medium/Low (disables bloom/shadows).
