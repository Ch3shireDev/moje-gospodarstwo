import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

// `vite build --mode android` – paczka dla aplikacji Capacitor: backend liczy się na telefonie (__LOCAL_API__),
// a service worker PWA jest zbędny (pliki i tak są w APK). W zwykłym buildzie kod backendu nie trafia do paczki.
export default defineConfig(({ mode }) => ({
  define: { __LOCAL_API__: JSON.stringify(mode === 'android') },
  resolve: {
    alias: {
      'virtual-local-api': fileURLToPath(new URL(mode === 'android' ? './src/local/localApi.js' : './src/local/noLocalApi.js', import.meta.url)),
    },
  },
  plugins: [
    react(),
    mode !== 'android' && VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Moje Gospodarstwo',
        short_name: 'Moje Gospodarstwo',
        description: 'Ocena wody na działce ewidencyjnej, przyczyny i działania: retencja, agrotechnika, nawadnianie.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f1e8',
        theme_color: '#1d3a2a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Ostatnie raporty działają offline (np. w polu bez zasięgu).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 45,
              expiration: { maxEntries: 40, maxAgeSeconds: 24 * 3600 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa',
              expiration: { maxEntries: 3000, maxAgeSeconds: 14 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // żeby otworzyć z telefonu w tej samej sieci
    // W docker-compose.dev.yml API_URL=http://server:8787
    proxy: { '/api': process.env.API_URL || 'http://localhost:8787' },
    fs: { allow: ['..'] }, // tryb android importuje backend z ../server/src
  },
}));
