# Deploying Nova Arcade

The repository root **is** the website. There is no build output folder, no
server, no environment variables. Everything below is copy-paste.

Files that get served: `index.html`, `games.json`, `sw.js`,
`manifest.webmanifest`, `games/`, `portal/`.

---

## Before you deploy (30 seconds)

```bash
node tools/build.mjs        # rebuild bundles + games.json, stamp the service worker
node tools/check-budgets.mjs   # fails if any art or bundle is missing/oversized
```

If both print clean, you are ready. Skip this only if you have not touched
anything in `src/`.

---

## Option A — Netlify (recommended)

Netlify honours `_headers`, so your game bundles get a one-year immutable cache
and the shell stays fresh. This is the fastest path to a live URL.

### A1. Drag and drop (no account setup, ~1 minute)

1. Go to **https://app.netlify.com/drop**
2. Drag the **whole project folder** onto the page.
3. Wait for the upload bar to finish.
4. Netlify shows a URL like `https://spontaneous-marzipan-4c1f2e.netlify.app`.
5. Click **Site configuration → Change site name** to rename it to something
   like `nova-arcade`, giving you `https://nova-arcade.netlify.app`.

### A2. From the command line

```bash
npm install -g netlify-cli
netlify login                       # opens a browser once
netlify deploy --prod --dir .
```

When it asks, choose **Create & configure a new site**, pick a team, and give it
a name. It prints the live URL when it finishes.

### A3. Connected to GitHub (auto-deploys on every push)

1. Push this branch to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub**.
3. Pick the repo, then set:
   - **Branch to deploy:** `claude/html5-game-portal-arch-opll9h` (or `main`)
   - **Build command:** `node tools/build.mjs --check`
   - **Publish directory:** `.`  ← a single dot
4. **Deploy site.** Every push now redeploys automatically.

---

## Option B — Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | your account |
| Link to existing project? | **N** |
| Project name? | `nova-arcade` |
| In which directory is your code located? | `./` |
| Want to modify settings? | **N** |

Vercel prints the production URL. `vercel.json` in the repo already sets the
cache headers, so nothing else is needed.

Or through the dashboard: **Add New → Project → Import** the repo, set
**Framework Preset: Other**, **Root Directory: `./`**, leave the build command
**empty**, and deploy.

---

## Option C — GitHub Pages (free, tied to the repo)

1. Push the branch to GitHub.
2. Repo → **Settings → Pages**.
3. Under **Source**, choose **GitHub Actions**.
4. Merge to `main` (or run the workflow manually from the **Actions** tab —
   `Deploy to GitHub Pages` → **Run workflow**).
5. Your site lands at `https://<your-username>.github.io/<repo-name>/`.

The workflow (`.github/workflows/pages.yml`) verifies the bundles are current
before publishing, so a stale build cannot go out.

**One caveat:** GitHub Pages sets its own ~10-minute cache TTL and ignores
`_headers`. It still works fine — the service worker caches each game after its
first launch and never re-fetches it — but Netlify or Vercel give better
first-visit caching.

---

## After deploying: making shareable links

Open your live site and click **Links** in the top bar.

1. Paste your live address into **Your site address**
   (e.g. `https://nova-arcade.netlify.app/`).
2. Pick a game.
3. Copy one of:
   - **Direct link** — `https://nova-arcade.netlify.app/#/play/bonecrown`
     opens straight into that game, skipping the library.
   - **Embed code** — a ready `<iframe>` with the correct
     `allow="fullscreen; pointer-lock; autoplay; gamepad"` list, so mouse-look
     works wherever you paste it.
   - **Copy all links** — every game's direct link at once.

The address you type is remembered, so you only set it once.

---

## Installing it like an app

On the live site, Chrome shows an **Install** button in the top bar (and one in
the address bar). Installing gives it its own window with no URL bar and its own
icon in the ChromeOS shelf, and it keeps working offline for any game you have
launched at least once.

---

## Troubleshooting

**Games show but won't launch.** Your host is serving `games/*.html` as
something other than `text/html`. Netlify, Vercel and Pages all get this right;
a custom server may need `text/html` for `.html`.

**Mouse look does not capture.** Click once inside the game frame first —
browsers only grant pointer lock from a real click. If you pressed Esc within
the last second, Chrome blocks the next request; the portal retries
automatically after the cooldown.

**Everything is slow on a Chromebook.** Open the game, then use the quality
selector in the player bar — pick **Performance** or **Performance+**. It
relaunches the game at a lower internal resolution, which is the setting these
engines actually honour. Check **Device** in the top bar: if it says *software
rasteriser*, hardware acceleration is off — turn it on at
`chrome://settings/system`.

**A game is stale after you updated it.** Bundles are cached by content hash, so
a rebuild changes the URL automatically. If you need a hard reset, open
**Device → Clear cache**.
