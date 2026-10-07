/// <reference types="vite/client" />

// Tells TypeScript which variables from .env files we use.
interface ImportMetaEnv {
  readonly VITE_TMDB_TOKEN?: string
}
