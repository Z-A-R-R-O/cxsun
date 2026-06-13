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
    driver: envString('QUEUE_DRIVER', 'database') === 'redis' ? 'redis' : 'database',
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
  zetro: {
    provider: envString('ZETRO_PROVIDER', 'openrouter'),
    defaultModel: envString('ZETRO_DEFAULT_MODEL', 'nex-agi/nex-n2-pro:free'),
    freeModels: envString(
      'ZETRO_FREE_MODELS',
      'nex-agi/nex-n2-pro:free,nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,poolside/laguna-xs.2:free,poolside/laguna-m.1:free,google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,liquid/lfm-2.5-1.2b-thinking:free,liquid/lfm-2.5-1.2b-instruct:free,nvidia/nemotron-3-nano-30b-a3b:free,nvidia/nemotron-nano-12b-v2-vl:free,qwen/qwen3-next-80b-a3b-instruct:free,nvidia/nemotron-nano-9b-v2:free,openai/gpt-oss-120b:free,openai/gpt-oss-20b:free,qwen/qwen3-coder:free,cognitivecomputations/dolphin-mistral-24b-venice-edition:free,meta-llama/llama-3.3-70b-instruct:free,meta-llama/llama-3.2-3b-instruct:free,nousresearch/hermes-3-llama-3.1-405b:free,nvidia/nemotron-3.5-content-safety:free',
    ),
    premiumModels: envString(
      'ZETRO_PREMIUM_MODELS',
      'openai/gpt-4.1,anthropic/claude-sonnet-4.5,google/gemini-2.5-pro',
    ),
    openRouterApiKey: envOptionalString('OPENROUTER_API_KEY'),
    openRouterBaseUrl: envString('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    httpReferer: envOptionalString('OPENROUTER_HTTP_REFERER') ?? envOptionalString('FRONTEND_URL'),
    appTitle: envString('OPENROUTER_APP_TITLE', 'CXSun ZETRO'),
    openAiApiKey: envOptionalString('OPENAI_API_KEY'),
    geminiApiKey: envOptionalString('GEMINI_API_KEY'),
    openCodeApiKey: envOptionalString('OPENCODE_API_KEY'),
    openCodeBaseUrl: envString('OPENCODE_BASE_URL', 'https://opencode.ai/zen/v1'),
    customAiApiKey: envOptionalString('CUSTOM_AI_API_KEY'),
    requestTimeoutMs: envNumber('ZETRO_REQUEST_TIMEOUT_MS', 30000),
    maxTokens: envNumber('ZETRO_MAX_TOKENS', 700),
    temperature: envNumber('ZETRO_TEMPERATURE', 0.4),
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
