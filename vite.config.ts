import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: API_PROXY_TARGET
        ? { '/api/v1': { target: API_PROXY_TARGET, changeOrigin: true } }
        : undefined,
    },
  }
})
