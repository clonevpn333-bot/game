# rewind. — the TikTok time machine

Scroll real, original TikToks from **2020** and **September–December 2023**, inside a UI that changes mood with the era
(late-night violet LED haze for 2020, amber dusk and falling leaves for fall 2023).

```bash
cd rewind
npm start            # http://localhost:5173   (Node 18+, no install needed to run)
```

Open it through `localhost` rather than double-clicking the file: TikTok's player is happier with a real `http://` origin.
(`index.html` still loads from `file://`, but embeds may refuse to start.) Your original single-file version is preserved in `legacy/`.

## What's in the box

| | |
|---|---|
| **Library** | `data/library.json` — 713 records (669 playable) with creator, title, upload date, vibe/trend tags, sound (only where a source names it), status, provenance link |
| **Eras** | 2020 · Sep · Oct · Nov · Dec 2023 · All Fall 2023, plus a month timeline (Jan–Dec 2020, Sep–Dec 2023) |
| **Atmosphere** | Per-era animated backgrounds (LED bokeh + floor strip + ring-light halo; amber bokeh + leaves, Nov rain, Dec cool motes). Sep/Oct/Nov/Dec each have their own palette. Intensity, blur, depth sliders; reduce-motion switch (also honors the OS setting); optional synthesized room tone (off by default) |
| **Feed** | Shuffled differently every visit: unseen posts first, the same trend/creator never back-to-back. Wheel, swipe, ↑/↓, J/K. Double-tap to favorite. Autoplay-next |
| **Reliability** | One visible TikTok player at a time, plus one hidden **preload of the next video** (swipe-to-playing measured at ~50 ms instead of ~950 ms; a dead next video is dropped from the feed before you reach it). adaptive timeouts (12 s "never became ready", ×2.5 for the first video of a visit because it downloads TikTok's player, ×2 on slow/data-saver connections; 45 s buffering patience — measured: first video takes 13 s on slow 3G and 29 s at 150 kbps, so a fixed 10 s would have skipped good videos), a Skip button during any wait, removed posts (TikTok error 1001) are skipped and remembered, auto-skip pauses after repeated failures with an explanation instead of looping, autoplay-blocked → tap-to-play, "Tap for sound" (TikTok starts muted) |
| **Explore** | Vibe filters, 4 moods, 10 collections (Peak Quarantine, Back-to-School 2023, Fall Night Scroll, Iconic Sounds, Main Character Energy, Unhinged Viral Era, The Rizz Era, Pop Song Moments, Charli & the Dances, Fortnite & FNAF), search (creator / trend / sound / month), **Transport me**, favorites, "similar vibe", session timer ("You've been in October 2023 for 18 minutes") |
| **Keys** | `↓/J` next · `↑/K` prev · `Space` play/pause · `F` favorite · `M` mute · `S` shuffle · `T` transport · `1–6` eras · `[ ]` prev/next era · `/` search · `O` open on TikTok · `H` hide · `?` help |

The main screen is deliberately bare (video, a few icons, **Transport me**). Everything else lives in the ☰ drawer.

## How "verified" works — read this

Statuses in the library mean exactly this:

* **`verified`** — TikTok's public oEmbed endpoint confirmed the post exists *at the date checked* (`lastChecked`).
* **`playback: "ok"`** — additionally, the post reached the player's *playing* state in a real Chrome (`playbackChecked`). Audio output is not checked (headless).
* **`unverified`** — the upload date was decoded from the video ID but nothing else has been confirmed.
* **`broken`** — gone, private, or refused by the embedded player (error 1001). Kept as a record, never played.

Current state: 654 posts have `playback: "ok"` (played in Chrome 155 on 2026-10-14); 15 more exist but timed out or errored in that test and stay `verified` without a playback mark; 44 are `broken` (9 from the original seed list plus 35 the player rejected).

Dates are not trusted from sources: a TikTok ID embeds its creation timestamp, so every entry's date is decoded from its own ID and
`npm test` fails if the library disagrees or an entry falls outside 2020 / Sep–Dec 2023. Old posts get deleted all the time; re-run the checks now and then.

## Keep adding videos (light tooling)

```bash
# 1. Add posts. Dates are decoded from the ID, out-of-era posts are refused, oEmbed fills in creator/title.
npm run add -- https://www.tiktok.com/@name/video/7290505556610141473 --tags=memes,viral-chaos --provenance=https://source.page
npm run add -- --file=urls.txt --tags=dances

# 2. Re-check that everything still exists (marks verified / broken, fixes creator handles)
npm run verify

# 3. (optional) Prove playback in real Chrome, then write the results into the library
npm i
node scripts/check-playback.mjs --chrome="/path/to/google-chrome" --out=health.json
node scripts/apply-health.mjs health.json
```

* The library is plain JSON (`data/library.json`). After hand edits run `npm run build:data` (it validates and regenerates `data/library.js`, which is what the page loads).
* Tags: use the vibe ids in `data/meta.json` (`dances`, `memes`, `skits`, `aesthetic`, `fall-vibe`, `iconic-sounds`, `viral-chaos`, `rizz`, `pop-songs`, `gaming`, …). **The first tag that isn't a vibe is treated as the post's specific trend** (e.g. `roman-empire`) and is used to keep any one trend from dominating a feed.
* New collections / moods / vibes: edit `data/meta.json` (collections match by `months`, `tagsAny`, `period`, `creators`, or `ids`).
* In the app, **Add videos** lets you paste links for yourself (stored locally as *unverified*); **Export** gives you JSON to merge.
* Use **real Google Chrome** for `check-playback`. The open-source Chromium that Playwright bundles cannot decode H.264, so every TikTok clip fails there with error 3001.
* Behind a proxy on Node 22: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/path/ca.pem npm run verify`.

Where the current library came from: literal TikTok links on Know Your Meme entries, TikTok Newsroom's *Year on TikTok* 2020/2023 pages and a BuzzFeed 2020 dance roundup — each ID date-checked, then oEmbed-checked. Each record's `provenance` points at its source page. No scraping of TikTok itself.

## Tests

```bash
npm test             # 19 unit tests: ID→date, URL parsing, feed filters, shuffle variety, coverage per era, anti-domination, scripts (mock oEmbed)
npm i && npm run test:e2e   # 11 browser tests, TikTok's player simulated (CHROME_BIN=… to choose a browser)
```

The e2e tests *simulate* TikTok's player (served at TikTok's origin so the origin checks are real) because that is the only way to force removed, hanging and blocked videos on demand. Real playback is covered separately by `check-playback`.

## Known limitations

* **Not every post will play for everyone.** TikTok can remove posts, restrict embedding by region/age/account, start muted, or change its player. The app handles all of that gracefully, but it cannot fix it.
* **Preload:** TikTok's player does nothing with `autoplay=0` (no ready event, ignores `play`), so the preload runs with autoplay on, muted and paused the moment it's ready. If a preload isn't ready when you swipe, it simply loads normally. Preload is skipped in data-saver mode.
* **Sound:** TikTok autoplays muted until the browser allows audio; the "Tap for sound" prompt handles this. Audio was not verified in headless testing.
* **Tag quality:** the library skews toward memes and sounds because its sources are meme histories. Posts from trend pages are tagged by their trend; unknown ones default to `memes`. Dances, cozy and aesthetic content, especially in fall 2023, are thinner than they should be — the best next additions.
* **Some requested formats couldn't be sourced:** specific "which bedroom would you choose", "phobia types" and "now you won't let go" videos, and Fortnite Chapter 2 season clips, aren't documented in any source I could reach, so none were added rather than guessed. If you have links, `npm run add` takes them.
* Dec 2023 (76 playable) and Jan–May 2020 are the smallest periods. Current playable counts: 2020 = 227, Sep = 127, Oct = 132, Nov = 107, Dec = 76.
* `rewind.html`/`seed-videos.json` in `legacy/` are the originals; 9 of those 70 posts have since been deleted from TikTok and are flagged `broken`.
* Independent project, not affiliated with TikTok. Playback uses TikTok's official embedded player; nothing is downloaded or re-hosted.
