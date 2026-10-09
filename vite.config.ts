import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from /statsboxd/ (the repository name), so
  // the production build — and `npm run preview`, which serves that build —
  // load files from there. The dev server keeps using the root:
  // http://localhost:5173/
  base: command === 'serve' && !isPreview ? '/' : '/statsboxd/',
}))
