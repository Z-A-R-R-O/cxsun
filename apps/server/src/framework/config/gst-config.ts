import { envString } from './env.js'

export const gspConfig = {
  environment: envString('GSP_ENVIRONMENT', 'sandbox') === 'production' ? 'production' : 'sandbox',
  sandboxBaseUrl: envString('GSP_SANDBOX_BASE_URL', 'https://apisandbox.whitebooks.in'),
  productionBaseUrl: envString('GSP_BASE_URL', 'https://api.whitebooks.in'),
} as const
