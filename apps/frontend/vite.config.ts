import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envDir = resolve(__dirname, '../..')
const serverStatePath = resolve(envDir, 'build/dev/server.json')

function apiProxyTarget(env: Record<string, string>) {
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL
  if (env.VITE_API_BASE_URL) return env.VITE_API_BASE_URL

  try {
    if (!existsSync(serverStatePath)) return 'http://localhost:6001'
    const state = JSON.parse(readFileSync(serverStatePath, 'utf8')) as { apiBaseUrl?: string; port?: number }
    return state.apiBaseUrl || `http://localhost:${state.port || 6001}`
  } catch {
    return 'http://localhost:6001'
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    process.env.NODE_ENV = 'production'
  }

  const env = loadEnv(mode, envDir, '')
  const apiTarget = apiProxyTarget(env)

  return {
    envDir,
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    build: {
      outDir: '../../build/frontend',
      emptyOutDir: true,
      chunkSizeWarningLimit: 450,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
        output: {
          codeSplitting: {
            includeDependenciesRecursively: false,
            maxSize: 450 * 1024,
            minSize: 20 * 1024,
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 60,
              },
              {
                name: 'radix',
                test: /node_modules[\\/](@radix-ui|radix-ui|@floating-ui|cmdk|vaul)[\\/]/,
                priority: 50,
              },
              {
                name: 'data-grid',
                test: /node_modules[\\/](@tanstack|@dnd-kit)[\\/]/,
                priority: 45,
              },
              {
                name: 'charts',
                test: /node_modules[\\/](recharts|d3-|decimal.js)[\\/]/,
                priority: 40,
              },
              {
                name: 'icons',
                test: /node_modules[\\/](lucide-react|@tabler)[\\/]/,
                priority: 35,
              },
              {
                name: 'date-ui',
                test: /node_modules[\\/](date-fns|react-day-picker)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor',
                test: /node_modules[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        src: resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 6010,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 6010,
    },
  }
})
