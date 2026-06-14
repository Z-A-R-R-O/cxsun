import { envNumber, envOptionalString, envString } from './env.js'

export const settings = {
  server: {
    host: envString('CODEIT_HOST', '0.0.0.0'),
    port: envNumber('CODEIT_PORT', 7820),
    logLevel: envString('CODEIT_LOG_LEVEL', 'info'),
  },
  providers: {
    openrouter: {
      apiKey: envOptionalString('OPENROUTER_API_KEY'),
      baseUrl: envString('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    },
    openai: {
      apiKey: envOptionalString('OPENAI_API_KEY'),
      baseUrl: envString('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    },
    deepseek: {
      apiKey: envOptionalString('DEEPSEEK_API_KEY'),
      baseUrl: envString('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
    },
    opencode: {
      apiKey: envOptionalString('OPENCODE_API_KEY'),
      baseUrl: envString('OPENCODE_BASE_URL', 'https://opencode.ai/zen/v1'),
    },
  },
  package: {
    version: '1.0.0',
  },
} as const
