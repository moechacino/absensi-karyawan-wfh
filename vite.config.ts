import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Activate updates after all app windows close, preserving in-flight forms.
        registerType: 'prompt',
        injectRegister: 'script',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Absensi Karyawan WFH',
          short_name: 'Absensi',
          description: 'Absensi dan jadwal kerja karyawan WFH.',
          lang: 'id',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#18392b',
          background_color: '#f6f7f4',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api(?:\/|$)/],
          // Only build assets are cached; API data and private files stay on the network.
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
        },
      }),
    ],
    server: {
      proxy: API_PROXY_TARGET
        ? { '/api/v1': { target: API_PROXY_TARGET, changeOrigin: true } }
        : undefined,
    },
  }
})
