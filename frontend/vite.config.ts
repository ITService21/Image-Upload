import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: mode === 'development' ? {
      '/api': 'http://localhost:4000',
      '/media': 'http://localhost:4000',
    } : undefined,
  },
}))
