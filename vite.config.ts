import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages at https://<owner>.github.io/temperance/
const BASE = '/temperance/'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
let hash = 'dev'
try {
  hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {
  /* not a git checkout */
}

export default defineConfig({
  base: BASE,
  // Parallel dev servers each get their own pre-bundle cache (VITE_CACHE_DIR=node_modules/.vite-5181),
  // so one server re-optimizing a dependency never invalidates another's. Unset: the default.
  cacheDir: process.env.VITE_CACHE_DIR || undefined,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(hash),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Temperance',
        short_name: 'Temperance',
        description: 'A stoic calorie and macro tracker.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#050507',
        theme_color: '#050507',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp}'],
        // the social preview is for link unfurls only; never precache it on the phone
        globIgnores: ['og.png', 'og.svg'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) chunking: keep the 3D stack in its own cached chunks.
        advancedChunks: {
          groups: [
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ },
            { name: 'r3f', test: /[\\/]node_modules[\\/]@react-three[\\/]/ },
          ],
        },
      },
    },
  },
})
