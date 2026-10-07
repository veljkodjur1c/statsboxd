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

- `GET /search/movie?query=…&year=…` to find a film.
- `GET /movie/{id}?append_to_response=credits` for genres, cast and crew
  (director = crew member with `job === "Director"`).
- With no backend, the API key ends up in the client bundle — how to handle it
  is decided in phase 3.
- Cache responses so repeated runs don't refetch, and respect rate limits.
- TMDB requires attribution in the UI.

## Phases

1. Project setup + dark theme ✓
2. ZIP upload + CSV parsing (JSZip, PapaParse) ← current
3. TMDB integration + caching
4. Computing the statistics
5. Charts (Recharts)
6. Deploy to GitHub Pages (Vite `base` option, GitHub Actions)

## Commands

- `npm run dev` — dev server at http://localhost:5173
- `npm run build` — type-check (`tsc -b`) + production build into `dist/`
- `npm run lint` — oxlint
- `npm run preview` — serve the production build locally
