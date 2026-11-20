import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Deux cibles :
// - par défaut : application installable (PWA) pour GitHub Pages ;
// - `--mode artifact` : un seul fichier HTML pour claude.ai (synchro COROS + sauvegarde en ligne).
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'
  const plugins: PluginOption[] = [react(), tailwindcss()]
  if (artifact) plugins.push(viteSingleFile())
  else
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Foulée — suivi sportif',
          short_name: 'Foulée',
          description: 'Course, renfo, muscu, courses, records, sommeil et repas au même endroit.',
          lang: 'fr',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#0f1115',
          theme_color: '#eb6834',
          icons: [
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    )

  return {
    // base relative : l'app fonctionne aussi bien sur GitHub Pages (/Sports/) qu'en local
    base: './',
    plugins,
    resolve: artifact ? { alias: { 'virtual:pwa-register': '/src/stubs/pwa-register.ts' } } : undefined,
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      chunkSizeWarningLimit: 2000,
    },
  }
})
