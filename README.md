<p align="center"><img src=".github/banner.png" alt="Bitty Buddies: pixel pets, fantasy folk and a shrine on a grassy strip" width="100%"></p>

# Bitty Buddies

> **© 2026 WiggleCodes. All rights reserved.**
> This code is public for viewing only. It may not be copied, modified, claimed as your own, or re-uploaded anywhere without written permission. See [LICENSE](LICENSE).

Blocky pixel pets that wander along the bottom of your screen, plus little builds (shrine, campfire, lantern) they like to nap beside. Windows + macOS, auto-updates from GitHub Releases.

## Run it locally

```bash
npm install
npm start
```

Everything lives in the **tray / menu-bar icon** (the little dog):

- **Spawn** → pick a category (Critters, Fantasy Folk) → pick a pet
- **Build** → Shrine, Campfire, Lantern Post
- **Clear**, **Hide everything**, **Size**, **Start with computer**, **Check for updates…**

On the desktop: **click** a pet to make it jump, **drag** to pick it up and throw it, **right-click** for Sit / Nap / Walk / Remove. Builds can be dragged along the ground. Everything you place is remembered between launches. Clicks pass straight through to your desktop everywhere except on the pets themselves.

## Releasing + auto-update

1. Create the GitHub repo and check `package.json → build.publish` points at it (it's set to `WiggleCodes/bitty-buddies`; change `owner` if you'd rather put it in your org).
2. Push the code. The workflow in `.github/workflows/release.yml` needs no secrets for unsigned builds.
3. To ship a version: bump `"version"` in `package.json` (e.g. 1.0.1), commit and push to `main`, then go to **Actions → Release → Run workflow**. It creates the `v1.0.1` tag, builds the Windows installer and the Mac `.dmg`/`.zip`, and attaches them to a Release. Pushing a `v1.0.1` tag yourself works too.
4. Installed apps check for updates on launch and every 4 hours (or via the tray).

**Windows** downloads updates in the background and asks to restart. Unsigned builds show a SmartScreen warning on first install ("More info → Run anyway").

**macOS** can only self-install updates when the app is code-signed (Apple Developer account, £79/yr). Until then, the Mac app tells you a new version is out and opens the download page. First launch of an unsigned build: right-click the app → **Open**. If macOS says it's "damaged", run `xattr -cr "/Applications/Bitty Buddies.app"`. Once you have a certificate, add the `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` secrets, remove `CSC_IDENTITY_AUTO_DISCOVERY: false` from the workflow, and set `autoDownload = true` for Mac in `src/main.js`.

## Website

`site/` is the Bitty Buddies website: a live meadow of pets you can click and throw, then a dig down through the underground to the roster and download links. It uses the app's real sprites, so new pets show up on the site automatically.

To publish it, go to the repo's **Settings → Pages**, set **Source** to **GitHub Actions**, and push to `main`. It goes live at `https://wigglecodes.github.io/bitty-buddies/`. GitHub Pages needs the repo to be public on a free plan.

## Licence keys (locked packs)

Packs marked `licensed: true` (Fantasy Folk for now) show as 🔒 in the Spawn menu until a key covering them is entered through the tray's **Enter licence key…**. There's no server: you make keys on your own computer, and the app checks each key's digital signature offline.

**One-time setup**
```bash
npm run keys -- init
```
This saves your private signing key to `~/.bitty-buddies-licence/`, outside the repo, and writes the matching public key to `src/licence-public.pem`. Commit the public key, but **never commit or share the private key**: anyone who has it can make keys. Back it up, because if you lose it you'd need new keys and a new app release.

**Making and managing keys**
```bash
npm run keys -- create --packs fantasy --note "Sam, paid 12 Nov"
npm run keys -- create --packs '*'           # every licensed pack, including future ones
npm run keys -- list
npm run keys -- revoke <id or key>           # then commit + push revoked.json
```
Send the whole `BITTY-…` key to the buyer. To revoke one, the tool adds its id to `revoked.json`. Once you push that to `main`, apps fetch it from GitHub on launch and lock the pack again. Offline apps keep working until they next get online.

Limits of this approach: a key isn't tied to one computer, so a shared key works anywhere until you revoke it.

To lock any other pack, add `licensed: true` next to its `name`, then make keys with `--packs <pack-id>`.

## Adding your own category (packs)

Each category is one file in `src/packs/`. To add one:

1. Copy `src/packs/critters.js` to e.g. `src/packs/my-pack.js`.
2. Change `id` and `name` (the name is what shows in the Spawn menu).
3. Add the filename to `src/packs/index.js`.
4. Run `npm run preview` to render every sprite to `preview.png` and check your art.

Item fields:

| field | meaning |
|---|---|
| `name`, `blurb` | Menu label |
| `kind` | `'pet'` (Spawn menu) or `'build'` (Build menu) |
| `move` | `'walk'`, `'hop'` or `'none'` |
| `speed` | Walk speed at Medium size |
| `w`, `h` | Sprite size in pixels (default 16×16) |
| `feet` | Row just below the feet (default `h - 2`) |
| `glow` | Builds only: `{ x, y, r, rgb: '255,200,100' }` soft light |
| `draw(P, s)` | Paints the sprite facing **right**. `P.r(x, y, w, h, '#hex')` fills a rectangle, `P.p(x, y, '#hex')` a pixel. `s.pose` is `walk` / `idle` / `sit` / `sleep`, `s.frame` is 0 or 1, `s.blink` is true mid-blink |

`src/packs/fantasy.js` has a `humanoid()` helper that draws a basic person you can dress up, and `src/packs/builds.js` shows larger structures.

## Layout

```
src/main.js            tray, overlay window, settings, auto-update
src/licence.js         offline key checks + revoke list
src/licence-window/    the "Enter licence key" window
tools/licence-keys.js  makes, lists and revokes licence keys (npm run keys)
revoked.json           revoked key ids, read by the app from GitHub
site/                  the website (published by .github/workflows/pages.yml)
src/preload.js         safe bridge between main and the overlay
src/renderer/          the overlay: physics, behaviour, drawing, mouse handling
src/shared/pixel.js    pixel-grid helpers used everywhere
src/packs/             one file per category
scripts/make-icons.js  regenerates app + tray icons (npm run icons)
scripts/preview.js     renders all sprites to preview.png (npm run preview)
scripts/make-banner.js regenerates the README banner (npm run banner)
```

## Licence

© 2026 WiggleCodes. All rights reserved. You may view the code and use official releases for personal use. You may not copy, modify, claim as your own, or re-upload this code or its artwork anywhere. Full terms in [LICENSE](LICENSE).
