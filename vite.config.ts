import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// What the page may load and connect to. GitHub Pages can't send HTTP
// headers, so this goes into a <meta> tag. It limits the damage if a script
// ever got in: it can't load code from elsewhere or send data to another
// server (the only network address is TMDB's API).
//  - style-src has 'unsafe-inline' because React and Recharts set style=""
//    attributes; scripts, which matter most, are 'self' only.
//  - Google Fonts: the stylesheet comes from googleapis, the files from gstatic.
//  - data: / blob: images are the inlined TMDB logo and the share image.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src https://api.themoviedb.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// Added to the production build only: the dev server needs an inline script
// for hot reloading, which this policy would block.
function contentSecurityPolicy(): Plugin {
  return {
    name: 'statsboxd:content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: CONTENT_SECURITY_POLICY,
          },
          // First in <head>, so it is in force before anything is loaded.
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), contentSecurityPolicy()],
  // GitHub Pages serves the site from /statsboxd/ (the repository name), so
  // the production build — and `npm run preview`, which serves that build —
  // load files from there. The dev server keeps using the root:
  // http://localhost:5173/
  base: command === 'serve' && !isPreview ? '/' : '/statsboxd/',
}))
