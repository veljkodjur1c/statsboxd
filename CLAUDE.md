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

- English UI, dark "cinematic" theme.
- Amber/gold accent; Playfair Display (Google Fonts) for headings, system font
  stack for body text.
- Design tokens (colors, spacing, fonts) live as CSS variables in `src/index.css`.
  Reuse them instead of hard-coding values.

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
- Parsing lives in `src/lib/letterboxd.ts`.
- The export has no TMDB IDs — films are matched via TMDB search by title + year.

## TMDB (notes)

- Code: `src/lib/tmdb.ts` (API calls + key handling), `src/lib/enrich.ts`
  (all films, cache, progress).
- `GET /search/movie` (with `primary_release_year`, falling back to a search
  without a year that accepts ±1 year) to find a film, then
  `GET /movie/{id}?append_to_response=credits` for genres, cast (top 15) and
  directors (crew member with `job === "Director"`).
- API key: the user's own key (localStorage `statsboxd:tmdbToken`) wins over
  the built-in one (`VITE_TMDB_TOKEN` in `.env.local`, never committed; see
  `.env.example`). Both TMDB credential types work: Read Access Token (Bearer
  header) and the old 32-char API key (`api_key` param).
- With no backend, any built-in key is visible in the client bundle. For the
  deploy it comes from a GitHub Actions secret (phase 6).
- Cache: localStorage `statsboxd:tmdb:v1`, keyed by Letterboxd URI; `null`
  means "no TMDB match". Bump the version when `TmdbFilm` changes. Failed
  requests are not cached, so "Retry" refetches only those.
- 4 films in flight at once. Every request also triggers a CORS preflight, and
  TMDB's 429 on a preflight reaches `fetch` as a plain network error — so
  network errors are retried (growing delay) just like a 429. After 8
  consecutive failures the run gives up; unfinished films count as failed.
- Free for non-commercial use with attribution. The footer has the text; the
  TMDB logo must be added before the public deploy (phase 6).

## Statistics (notes)

- Code: `src/lib/stats.ts` (pure functions, no React); UI in
  `src/components/StatsSection.tsx` and `StatTable.tsx`.
- Every table shows 10 rows until "Show all" (`VISIBLE_ROWS` in `StatTable`).
  `.stat-card` is a grid that reserves room for heading, 2-line description,
  header + 10 rows and the button, so collapsed cards are all the same height;
  rows have a fixed height and long names are ellipsized.
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
  `FilmListDialog` (native `<dialog>` via `showModal()`, rendered into
  `<body>` with a portal): films sorted by your rating ↓ (unrated last), then
  newest first, each linking to its Letterboxd page. Shared helpers such as
  `formatStars` live in `src/lib/format.ts`.

## Charts (notes)

- Recharts 3. Charts live in `src/components/charts/`; their shared look
  (tick style, grid, bar color, max bar size, reduced-motion switch) is in
  `chartTheme.ts`.
- Rating distribution (½★–5★ histogram) sits in the "Your export" card.
  Genre (horizontal bars) and decade (columns) charts are the default view of
  their stat cards, with a Chart/Table switch (`renderChart` render prop on
  `StatTable`). The chart area has the same height as the table area, so
  cards stay equal. Clicking a bar opens the same `FilmListDialog`.
- Rules (from the dataviz guidelines): one y-scale per chart, never two —
  extra numbers go in the tooltip or table; one series = one color, no legend
  box; bars `--color-chart` (#b8862f — the accent #e8b04b failed the palette
  validator's lightness band for fills on the dark surface), hovered bar
  lights up to the accent; bars ≤ 24px with 4px rounded ends; hairline solid
  gridlines; axis text muted, never the bar color; tooltips show the value
  first; the overall-average reference line is explained by an HTML key above
  the plot; the table view is the accessible twin; no animation with
  `prefers-reduced-motion`.
- Recharts makes the JS bundle ~720 KB (215 KB gzipped); Vite warns about it.
  Lazy-loading the charts is an option for phase 6.

## Phases

1. Project setup + dark theme ✓
2. ZIP upload + CSV parsing (JSZip, PapaParse) ✓
3. TMDB integration + caching ✓
4. Computing the statistics ✓
5. Charts (Recharts) ✓
6. Deploy to GitHub Pages (Vite `base` option, GitHub Actions)

## Commands

- `npm run dev` — dev server at http://localhost:5173
- `npm run build` — type-check (`tsc -b`) + production build into `dist/`
- `npm run lint` — oxlint
- `npm run preview` — serve the production build locally
