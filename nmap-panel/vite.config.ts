// frontend/vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const rootDir = import.meta.dirname

// Куда dev-сервер проксирует /api. По умолчанию локальный бэкенд на :5000.
// Переопределяется через VITE_API_PROXY (напр. http://127.0.0.1:5000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy = env.VITE_API_PROXY || 'http://127.0.0.1:5000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      host: true,          // слушать на всех интерфейсах — удобно тестировать с другой машины/ВМ
      port: 5173,
      proxy: {
        // фронт ходит на относительный /api → vite перебрасывает на бэкенд,
        // поэтому в браузере нет хардкода хоста и CORS не нужен
        '/api': {
          target: apiProxy,
          changeOrigin: true,
        },
      },
    },
  }
})
