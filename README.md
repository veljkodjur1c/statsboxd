# Statsboxd

Statsboxd turns your Letterboxd data export into statistics: how you rate
each genre and decade, your top actors and directors, and how your ratings
are spread. It runs entirely in your browser.

**Live site:** https://veljkodjur1c.github.io/statsboxd/

## Features

- **How you rate**: a histogram of your ratings, from ½★ to 5★.
- **Average rating by genre** and **by decade**, each as a chart or a table.
- **Top actors** and **top directors** by your average rating.
- Sortable tables: click a column header, and click it again to flip the
  direction.
- Click any name or bar to see every film behind it, with your rating and a
  link to Letterboxd.
- Film details are cached in your browser, so a second upload is instant.

## How to use

1. On Letterboxd, open **Settings → Data** and export your data
   ([letterboxd.com/settings/data](https://letterboxd.com/settings/data/)).
   You get a ZIP file.
2. Open the [site](https://veljkodjur1c.github.io/statsboxd/) and choose the
   ZIP file, or drop it anywhere on the upload screen.
3. The first time, Statsboxd looks up every film on TMDB to get its genres,
   cast and director. This takes about 25 seconds for ~270 films. After that
   the results come from the cache.

## Privacy

- Your ZIP file is read in your browser and is never uploaded anywhere.
- Only each film's title and year are sent to TMDB, to look it up.
- The TMDB cache, and your own TMDB key if you enter one, are stored in your
  browser's local storage. Nothing is kept anywhere else.

## About the TMDB key

Statsboxd has no server, so the TMDB key it uses has to be part of the
JavaScript the browser downloads. That means anyone can find it there. This
is a deliberate trade-off:

- The key is read-only and only gives access to public film data.
- If it is ever misused, the owner creates a new token on TMDB and replaces
  the `VITE_TMDB_TOKEN` secret in the repository. Meanwhile, visitors can
  keep using the site with their own free key: the key button in the top bar
  opens the TMDB key settings.
- The only way to fully hide the key would be a small server or proxy between
  the browser and TMDB. That would add a backend to maintain, so it is left
  out on purpose.

## Run locally

Requires Node.js 24.

```sh
npm install
cp .env.example .env.local   # then paste your TMDB "API Read Access Token"
npm run dev                  # http://localhost:5173
```

Get a free token at
[themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
Without a token, the app asks for a key in the browser instead.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run preview` | Serves the build at http://localhost:4173/statsboxd/ |
| `npm run lint` | Lints the code with oxlint |

A local build includes the token from `.env.local`, so don't share or upload
your local `dist/` folder.

## Deployment

Every push to `main` runs
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It lints,
builds and publishes the site to GitHub Pages. You can also start it by hand
from the **Actions** tab. Requirements:

- The repository is public. Free GitHub Pages only works for public repos.
- **Settings → Pages → Source** is set to **GitHub Actions**.
- A repository secret named `VITE_TMDB_TOKEN` holds the TMDB token. Without
  it, the site still works but asks visitors for their own key.
- `base` in [`vite.config.ts`](vite.config.ts) matches the repository name
  (`/statsboxd/`).

## Tech stack

React 19, TypeScript and Vite, plus JSZip (reading the ZIP), PapaParse
(CSV), Recharts (charts) and plain CSS.

```
src/
  index.css     design tokens, base styles and shared parts (cards, buttons)
  lib/          pure logic: parsing the export, TMDB calls and cache, statistics
  components/   React components, each with its own CSS file next to it
    brand/      the logo and the projector mascot
    charts/     the Recharts charts and their shared styling
```

## Design

The look is a dark projection room: near-black surfaces, aqua (the
projector's light) for everything you can act on, and amber only for your
ratings. Headings use Bricolage Grotesque, small labels JetBrains Mono. A
little projector mascot shows what the app is doing. The first version, with
a gold theme, is kept as the `v1.0` tag.

## Credits

This product uses the TMDB API but is not endorsed or certified by
[TMDB](https://www.themoviedb.org).

Statsboxd is not affiliated with Letterboxd.
