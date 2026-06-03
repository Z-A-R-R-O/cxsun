import { envNumber, envOptionalString, envString } from './env.js'

export const settings = {
  server: {
    host: envString('HOST', '0.0.0.0'),
    port: envNumber('PORT', 6005),
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
  cors: {
    origins: envOptionalString('CORS_ORIGINS'),
  },
  redis: {
    host: envString('REDIS_HOST', 'localhost'),
    port: envNumber('REDIS_PORT', 6379),
    password: envOptionalString('REDIS_PASSWORD'),
    db: envNumber('REDIS_DB', 0),
    tls: envString('REDIS_TLS', 'false') === 'true',
  },
  queue: {
    enabled: envString('QUEUE_ENABLED', 'true') !== 'false',
    backupIntervalHours: envNumber('DATABASE_BACKUP_INTERVAL_HOURS', 6),
  },
  mail: {
    enabled: envString('MAIL_ENABLED', 'false') === 'true',
    provider: envString('MAIL_PROVIDER', 'smtp'),
    smtpHost: envString('MAIL_SMTP_HOST', 'smtp.hostinger.com'),
    smtpPort: envNumber('MAIL_SMTP_PORT', 465),
    smtpSecure: envString('MAIL_SMTP_SECURE', 'true') !== 'false',
    username: envString('MAIL_USERNAME', ''),
    password: envString('MAIL_PASSWORD', ''),
    fromEmail: envString('MAIL_FROM_EMAIL', envString('MAIL_USERNAME', '')),
    fromName: envOptionalString('MAIL_FROM_NAME'),
    replyTo: envOptionalString('MAIL_REPLY_TO'),
    imapHost: envString('MAIL_IMAP_HOST', 'imap.hostinger.com'),
    imapPort: envNumber('MAIL_IMAP_PORT', 993),
    pop3Host: envString('MAIL_POP3_HOST', 'pop.hostinger.com'),
    pop3Port: envNumber('MAIL_POP3_PORT', 995),
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
