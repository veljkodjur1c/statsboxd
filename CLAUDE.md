# Statsboxd

A web app for exploring Letterboxd statistics. The user uploads their Letterboxd
data export (a ZIP file) and the app computes everything in the browser:

- average rating per genre
- average rating per actor
- top directors
- ratings by decade

Genre, cast and crew data comes from the TMDB API. There is no backend — the app
is a static site deployed to GitHub Pages.

## Stack (agreed — do not change without asking)

- React + Vite + TypeScript
- PapaParse — CSV parsing
- JSZip — reading the export ZIP
- Recharts — charts
- Styling: plain CSS with CSS custom properties (no CSS framework)
- Linting: oxlint (comes with the Vite template)
- Tests: Vitest — `*.test.ts` files next to the code they test (`src/lib/`)

## Working rules

The user is learning React and TypeScript. Therefore:

- Work in small steps. After each step, stop and explain what was done and why.
- Explain new React/TypeScript concepts the first time they appear in the code.
- Do not add any library (npm package) or external resource outside the agreed
  stack without asking first.
- Do not commit without asking.
- Language: explanations to the user are in Serbian; UI text, code, comments
  and docs are in English.

## UI

- English UI. v2 design, concept "projection room" (v1, the gold theme, is
  the git tag `v1.0`). The design system is the Artifact "Statsboxd Design
  System" (https://claude.ai/artifact/BcG4RKYQQ97WvPdTGKf6Jm): tokens, usage
  rules and a preview of every component. Where it and the code disagree,
  the code wins (e.g. the wrap card is no longer white there).
- Colors: neutral near-black surfaces; aqua `--color-accent` (#3ee3d2) is the
  projector's light, for everything you can act on (primary buttons, focus,
  links, hovered bar); amber `--color-star` (#f5b544) only ever means a
  rating; white `--color-inverse` only for the selected Chart/Table segment.
  Text on aqua is near-black, never white.
- Fonts (Google Fonts): Bricolage Grotesque for headings and big numbers,
  JetBrains Mono for small labels (`.kicker`, axis ticks, counters), system
  font stack for body text.
- Layout: top bar (logo, TMDB key button, "Upload another export") + a grid
  of left-aligned cards (`.card`, `.card-header` with `.kicker` and
  `.card-title`, optional control on the right).
- Signature motifs, each in its place only: ticket-stub tiles for the four
  headline numbers, mono "edge print" kickers ("Reel 01 · Genres"), the
  film-strip progress bar, the projector beam on the upload screen.
- Brand: `src/components/brand/Logo.tsx` (lens tube, beam, 3 bars) and
  `Mascot.tsx` — a projector with `mood: 'idle' | 'busy' | 'sad' | 'happy'`,
  decorative (`aria-hidden`), animated with CSS only. Icons are hand-drawn
  SVGs in `src/components/Icon.tsx` (`IconName` union), no icon package.
- The closing "That's a wrap." card (`WrapCard`) is deliberately quiet: no
  fill, hairline border, secondary button. It must not compete with the stats.
- Motion: every animation sits inside
  `@media (prefers-reduced-motion: no-preference)`, and `index.css` has a
  reduce-motion safety net. Results rise in one block after another; dialogs
  and their backdrop fade in.
- Design tokens (colors, spacing, radii, shadows, motion, fonts) live as CSS
  variables in `src/index.css`. Reuse them instead of hard-coding values.
- CSS organisation: `src/index.css` holds tokens, base styles, helpers
  (`.kicker`, `.visually-hidden`), shared parts (card, buttons, icon button,
  film list, stars) and the page shell. Every component's own styles are in
  a CSS file next to it, imported by the component (`import './X.css'`).
  It is still global CSS, so class names must be unique. Vite puts the CSS
  of the lazy results components into the lazy chunk.

## Letterboxd export (notes)

- The export is a ZIP of CSV files at the archive root: `ratings.csv`,
  `watched.csv`, `diary.csv`, `reviews.csv`, `watchlist.csv`, `profile.csv`,
  `comments.csv`.
- It also has `deleted/`, `orphaned/`, `likes/` and `lists/` folders, some with
  files of the same name (e.g. `deleted/diary.csv`) — always read the root files.
- Columns (confirmed on a real export):
  - `ratings.csv`: `Date, Name, Year, Letterboxd URI, Rating` (rating 0.5–5 in
    half-star steps)
  - `watched.csv`: `Date, Name, Year, Letterboxd URI`
  - `diary.csv`: `Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date`
- In `diary.csv`, `Letterboxd URI` links to the diary entry, not the film, so
  it never matches `watched.csv`. Diary entries are linked to films by name +
  year instead (`parseDiary`); `Watched Date` is the day the film was seen.
- Parsing lives in `src/lib/letterboxd.ts`.
- The parsed export is remembered (`src/lib/savedExport.ts`, localStorage
  `statsboxd:export:v1`, ~60 KB for 268 films): the upload screen then offers
  "Continue with last export" and "Forget it". The JSON is shape-checked on
  load; bump the version when `LetterboxdExport` changes. If saving fails,
  the older one is removed so a stale export is never offered.
- The export has no TMDB IDs — films are matched via TMDB search by title + year.

## TMDB (notes)

- Code: `src/lib/tmdb.ts` (API calls + key handling), `src/lib/enrich.ts`
  (all films, cache, progress).
- `GET /search/movie` (with `primary_release_year`, falling back to a search
  without a year that accepts ±1 year) to find a film, then
  `GET /movie/{id}?append_to_response=credits` for genres, cast (top 15) and
  directors (crew member with `job === "Director"`), plus `vote_average`,
  `vote_count` and `runtime` (TMDB sends 0 for "unknown"; stored as null).
- API key: the user's own key (localStorage `statsboxd:tmdbToken`) wins over
  the built-in one (`VITE_TMDB_TOKEN` in `.env.local`, never committed; see
  `.env.example`). Both TMDB credential types work: Read Access Token (Bearer
  header) and the old 32-char API key (`api_key` param).
- With no backend, any built-in key is visible in the client bundle. For the
  deploy it comes from the GitHub Actions secret `VITE_TMDB_TOKEN`.
- Cache: localStorage `statsboxd:tmdb:v2`, keyed by Letterboxd URI; `null`
  means "no TMDB match". Bump the version when `TmdbFilm` changes and add the
  old key to `OLD_CACHE_KEYS` (in `enrich.ts`), which deletes it. Failed
  requests are not cached, so "Retry" refetches only those.
- 4 films in flight at once. Every request also triggers a CORS preflight, and
  TMDB's 429 on a preflight reaches `fetch` as a plain network error — so
  network errors are retried (growing delay) just like a 429. After 8
  consecutive failures the run gives up; unfinished films count as failed.
- Free for non-commercial use with attribution. The footer has the official
  TMDB logo (`src/assets/tmdb-logo.svg`, the "alt short" file from
  themoviedb.org/about/logos-attribution, unmodified, smaller than our own
  branding) and the "not endorsed or certified by TMDB" notice.

## Statistics (notes)

- Code: `src/lib/stats.ts` (pure functions, no React); UI in
  `src/components/StatsSection.tsx` and `StatTable.tsx`.
- Results page (`Results.tsx`): "Now showing · Your stats" title, the four
  ticket tiles (films watched, films rated, average rating, watch time),
  notices (failed + Retry, "not found" as `<details>`), "How
  you rate" (2/3) beside "Latest ratings" (1/3) — all in `ExportSummary` —
  then a hint line, the four stat cards, the crowd card and the wrap card.
- Watch time (`watchTime`): TMDB runtimes, each film once, in hours; films
  without a runtime count as 0. It replaced the "Matched on TMDB" tile — the
  hint line and the notices already say when films weren't matched.
- Reel 05 "You vs. the crowd" (`CrowdCard`, `crowdComparison`): your rating
  against the TMDB average halved to stars, for rated films with at least
  `MIN_CROWD_VOTES` (50) votes. A verdict sentence + your/crowd averages,
  then the 5 films you liked most above and most below the crowd. Hidden
  when no film qualifies.
- Stat cards in a 2-column `.stats-grid` (one column below ~500px per card):
  Reel 01 Genres and Reel 02 Decades (charts) first, then Reel 03 Actors and
  Reel 04 Directors (tables). The Chart/Table switch is in the card header;
  "Show all" is a small secondary button in the footer track.
- Every table shows 10 rows until "Show all" (`VISIBLE_ROWS` in `StatTable`).
  `.stat-card` is a grid that reserves room for heading, 2-line description,
  header + 10 rows and the button, so collapsed cards are all the same height;
  rows have a fixed height and long names are ellipsized.
- Year picker (`YearSelect`, native `<select>`, beside the results title):
  "All time" or a year from the diary (`diaryYears`). `Results` narrows the
  export with `filterByYear` and passes that to everything below it. A year
  holds the films logged in the diary that year (a rewatch counts in each
  year), with their current ratings; never-logged films are all-time only.
  The picker is hidden when the diary is empty. TMDB notices stay all-time.
  In a year, "Latest ratings" becomes "Last watched" (`latestDiaryEntries`,
  by watch date): a rating's `Date` changes whenever the rating is edited,
  so it can point to a later year.
- Films = `watched` ∪ `ratings`, one entry per Letterboxd URI.
- Per group: Films = watched films, Rated = rated films, Avg = average of the
  ratings (unrated films don't affect it).
- Genres / actors (all 15 stored cast members) / directors only use films
  matched on TMDB; people are keyed by TMDB id. Decades use the Letterboxd year.
- Minimum rated films to be listed (`MIN_RATED`): genres 1, actors 3,
  directors 2. Default sort: average ↓, then rated ↓, then name; decades by name.
- Sorting (`sortGroups`): clicking a column header sorts by it (names A→Z,
  numbers high→low first); clicking it again flips the direction. Ties use
  average ↓, rated ↓, name; groups without an average always go last.
- Each `GroupStat` carries its `filmList`. Clicking a name opens
  `FilmListDialog`, built on the shared `Modal` (native `<dialog>` via
  `showModal()`, rendered into `<body>` with a portal; Esc, × and backdrop
  click close it; `KeySettingsDialog` uses it too): films sorted by your rating ↓ (unrated last), then
  newest first, each linking to its Letterboxd page. Shared helpers such as
  `formatStars` live in `src/lib/format.ts`.

## Charts (notes)

- Recharts 3. Charts live in `src/components/charts/`; their shared look
  (tick style, grid, bar color, max bar size, reduced-motion switch) is in
  `chartTheme.ts`. `chartTheme.ts` also imports `charts.css` (chart plot,
  key, glass tooltip, mono axis font, glow), so every chart brings its CSS.
  Recharts 3 draws tick labels in a separate layer
  (`.recharts-yAxis-tick-labels`), not inside `.yAxis`.
- Rating distribution (½★–5★ histogram) is the "How you rate" card; it
  stretches to the height of "Latest ratings" beside it. Genre (horizontal bars) and decade (columns) charts are the default view of
  their stat cards, with a Chart/Table switch (`renderChart` render prop on
  `StatTable`). The chart area has the same height as the table area, so
  cards stay equal. Clicking a bar opens the same `FilmListDialog`.
- Rules (from the dataviz guidelines): one y-scale per chart, never two —
  extra numbers go in the tooltip or table; one series = one color, no legend
  box; bars `--color-chart` (#23a99b — a deeper step of the aqua; the accent
  itself failed the palette validator's lightness band for fills on the dark
  surface), the hovered bar lights up to the accent with a glow
  (`.recharts-active-bar`); bars ≤ 24px with 4px rounded ends; hairline solid
  gridlines; axis numbers in mono 11px, genre names in the body font, muted,
  never the bar color; tooltips show the value first, in the display font;
  the overall-average reference line is explained by an HTML key above
  the plot; the table view is the accessible twin; no animation with
  `prefers-reduced-motion`.
- Everything that uses Recharts is behind `src/components/Results.tsx`, which
  `App` loads lazily (`React.lazy` + `Suspense`) and starts downloading as
  soon as a file is chosen. Initial JS ~362 KB (114 KB gzipped), the results
  chunk ~381 KB (110 KB gzipped).

## Deploy (notes)

- Live at https://veljkodjur1c.github.io/statsboxd/ (GitHub Pages, source:
  GitHub Actions). The repository must stay public for free Pages.
- `.github/workflows/deploy.yml` runs on every push to `main` (or by hand from
  the Actions tab): `npm ci` → `npm run lint` → `npm test` → `npm run build` with the
  `VITE_TMDB_TOKEN` repository secret → upload `dist/` → deploy.
- `vite.config.ts` sets `base: '/statsboxd/'` for the build and for
  `npm run preview`; the dev server stays at `/`. Reference assets by importing
  them (like the TMDB logo) or via `import.meta.env.BASE_URL`, never with a
  hard-coded leading `/`.
- A local `npm run build` bakes the token from `.env.local` into `dist/` —
  never share or upload a local `dist/`.

## Phases

1. Project setup + dark theme ✓
2. ZIP upload + CSV parsing (JSZip, PapaParse) ✓
3. TMDB integration + caching ✓
4. Computing the statistics ✓
5. Charts (Recharts) ✓
6. Deploy to GitHub Pages (Vite `base` option, GitHub Actions) ✓
7. v2 redesign: design system, brand and mascot, every screen restyled
   (branch `redesign`; v1 kept as tag `v1.0`) ✓
8. Feature expansion (branch `features`; the v2 design with v1 features is
   tag `v2.0`), one commit per step:
   1. Vitest + tests for `letterboxd.ts` and `stats.ts` ✓
   2. Filter by year watched (`diary.csv` → `Watched Date`) ✓
   3. Remember the last export between visits ✓
   4. TMDB `vote_average` + `runtime`: "You vs. the crowd", total watch time ✓
   5. Privacy line on the upload screen, mobile check
   6. Shareable summary image

## Commands

- `npm run dev` — dev server at http://localhost:5173
- `npm run build` — type-check (`tsc -b`) + production build into `dist/`
- `npm run lint` — oxlint
- `npm test` — run the tests once (Vitest)
- `npm run preview` — serve the production build locally at
  http://localhost:4173/statsboxd/
