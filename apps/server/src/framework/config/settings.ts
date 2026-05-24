import { envNumber, envOptionalString, envString } from './env.js'

export const settings = {
  server: {
    host: envString('HOST', '0.0.0.0'),
    port: envNumber('PORT', 6001),
    logLevel: envString('LOG_LEVEL', 'info'),
    bodyLimitBytes: envNumber('BODY_LIMIT_BYTES', 30 * 1024 * 1024),
  },
  auth: {
    jwtSecret: envOptionalString('JWT_SECRET'),
  },
  urls: {
    frontend: envOptionalString('FRONTEND_URL'),
    electronDevServer: envOptionalString('ELECTRON_DEV_SERVER_URL'),
    vitePort: envNumber('VITE_PORT', 6010),
    backendHealth: envOptionalString('BACKEND_HEALTH_URL'),
  },
  package: {
    version: envString('npm_package_version', '0.0.0'),
  },
} as const

export function getFrontendUrl(host = 'localhost') {
  return settings.urls.frontend
    ?? settings.urls.electronDevServer
    ?? `http://${host}:${settings.urls.vitePort}`
}

export function getBackendHealthUrl(host = '127.0.0.1') {
  return settings.urls.backendHealth ?? `http://${host}:${settings.server.port}/health`
}
