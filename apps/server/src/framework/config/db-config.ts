import { envNumber, envSecret, envString } from './env.js'

export interface MasterDatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export interface TenantDatabaseDefaults {
  host: string
  port: number
  user: string
  secretRef: string
}

const MASTER_CONNECTION_LIMIT = 10
const TENANT_CONNECTION_LIMIT = 5
const TENANT_CONNECT_TIMEOUT_MS = 2_000

export const dbConfig = {
  master: {
    host: envString('DB_HOST', 'localhost'),
    port: envNumber('DB_PORT', 3306),
    database: envString('DB_NAME', 'cxsun_master'),
    user: envString('DB_USER', 'root'),
    password: envString('DB_PASSWORD'),
    connectionLimit: MASTER_CONNECTION_LIMIT,
  } satisfies MasterDatabaseConfig & { connectionLimit: number },
  tenant: {
    defaults: {
      host: envString('DB_HOST', 'localhost'),
      port: envNumber('DB_PORT', 3306),
      user: envString('DB_USER', 'root'),
      secretRef: 'DB_PASSWORD',
    } satisfies TenantDatabaseDefaults,
    connectionLimit: TENANT_CONNECTION_LIMIT,
    connectTimeoutMs: TENANT_CONNECT_TIMEOUT_MS,
    password(secretRef: string) {
      return envSecret(secretRef, 'DB_PASSWORD')
    },
  },
} as const
