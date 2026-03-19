import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || '/',
    server: {
      port: 5173,
      proxy: mode === 'development' ? {
        '/api': 'http://localhost:4000',
        '/media': 'http://localhost:4000',
      } : undefined,
    },
  }
})
