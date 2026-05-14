import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { resolve } from 'path'

const envDir = resolve(__dirname, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      port: Number(env.VITE_PORT) || 6000,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:6001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: Number(env.VITE_PORT) || 6000,
    },
  }
})
