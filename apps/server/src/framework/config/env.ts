import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

type EnvValue = string | undefined

const workspaceRoot = resolve(
  process.cwd(),
  process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../..' : '.',
)
const envFile = readEnvFile(resolve(workspaceRoot, '.env'))
const runtimeEnv = { ...envFile, ...process.env }

export function envString(key: string, fallback = '') {
  const value = normalizeValue(runtimeEnv[key])
  return value === undefined || value === '' ? fallback : value
}

export function envOptionalString(key: string) {
  const value = normalizeValue(runtimeEnv[key])
  return value === '' ? undefined : value
}

export function envNumber(key: string, fallback: number) {
  const value = envOptionalString(key)
  if (value === undefined) return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function envSecret(secretRef: string, fallbackKey?: string) {
  return envOptionalString(secretRef) ?? (fallbackKey ? envOptionalString(fallbackKey) : undefined)
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}

  const values: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/)
    if (!match) continue

    const [, rawKey, rawValue] = match
    const key = rawKey.trim()
    if (!key) continue

    values[key] = parseEnvValue(rawValue)
  }

  return values
}

function parseEnvValue(rawValue: string) {
  const trimmed = rawValue.trim()
  if (!trimmed) return ''

  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

function normalizeValue(value: EnvValue) {
  return typeof value === 'string' ? parseEnvValue(value) : undefined
}
