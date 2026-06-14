import { Injectable } from '../../core/decorators/injectable.js'
import { settings } from '../../framework/config/index.js'
import mysql from 'mysql2/promise'
import { createDecipheriv, createCipheriv, createHash, randomBytes } from 'crypto'
import { envOptionalString, envString, envNumber } from '../../framework/config/env.js'

export interface ProviderSettings {
  apiKey: string
  baseUrl: string
}

export interface CodeItSettings {
  openrouter: ProviderSettings
  openai: ProviderSettings
  deepseek: ProviderSettings
  opencode: ProviderSettings
}

function getEncryptionKey(): Buffer {
  const jwtSecret = envOptionalString('JWT_SECRET') ?? ''
  const appTitle = envOptionalString('OPENROUTER_APP_TITLE') ?? 'CXSun ZETRO'
  const secret = jwtSecret || appTitle || 'cxsun-zetro-local-secret'
  return createHash('sha256').update(secret).digest()
}

function decryptSecret(ciphertext: string, iv: string, tag: string): string {
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

let dbPool: mysql.Pool | null = null

function getDbPool(): mysql.Pool {
  if (dbPool) return dbPool

  const host = envString('DB_HOST', 'localhost')
  const port = envNumber('DB_PORT', 3306)
  const user = envString('DB_USER', 'root')
  const password = envString('DB_PASSWORD', '')
  const database = envString('DB_NAME', 'cxsun_master')

  dbPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  })

  return dbPool
}

async function loadSettingsFromDb(fallbackSettings: CodeItSettings): Promise<CodeItSettings> {
  try {
    const pool = getDbPool()
    const [rows]: any = await pool.query('SELECT * FROM agent_provider_connections')
    const updated = { ...fallbackSettings }

    for (const row of rows) {
      const providerKey = row.provider_key
      const key = providerKey === 'opencode' ? 'opencode' : providerKey
      if (key in updated) {
        let apiKey = ''
        if (row.api_key_ciphertext && row.api_key_iv && row.api_key_tag) {
          try {
            apiKey = decryptSecret(row.api_key_ciphertext, row.api_key_iv, row.api_key_tag)
          } catch (err) {
            console.error(`[SettingsStore] Failed to decrypt key for ${providerKey}:`, err)
          }
        }
        updated[key as keyof CodeItSettings] = {
          apiKey: apiKey || fallbackSettings[key as keyof CodeItSettings].apiKey,
          baseUrl: row.base_url || fallbackSettings[key as keyof CodeItSettings].baseUrl,
        }
      }
    }
    return updated
  } catch (err) {
    console.error('[SettingsStore] Failed to load settings from DB:', err)
    return fallbackSettings
  }
}

async function saveSettingToDb(providerKey: string, apiKey: string, baseUrl: string) {
  try {
    const pool = getDbPool()
    const [rows]: any = await pool.query(
      'SELECT id, api_key_ciphertext, api_key_iv, api_key_tag FROM agent_provider_connections WHERE provider_key = ?',
      [providerKey]
    )

    const existing = rows[0]
    let encrypted = { ciphertext: '', iv: '', tag: '' }
    if (apiKey) {
      encrypted = encryptSecret(apiKey)
    } else if (existing) {
      encrypted = {
        ciphertext: existing.api_key_ciphertext || '',
        iv: existing.api_key_iv || '',
        tag: existing.api_key_tag || '',
      }
    }

    const providerName = providerKey === 'openrouter' ? 'OpenRouter'
                       : providerKey === 'openai' ? 'OpenAI / GPT'
                       : providerKey === 'deepseek' ? 'DeepSeek'
                       : providerKey === 'opencode' ? 'OpenCode Zen'
                       : providerKey
    const providerKind = providerKey === 'openai' || providerKey === 'deepseek' || providerKey === 'opencode' ? 'openai' : 'openrouter'
    const defaultModel = providerKey === 'openrouter' ? 'nex-agi/nex-n2-pro:free'
                       : providerKey === 'openai' ? 'gpt-4.1-mini'
                       : providerKey === 'deepseek' ? 'deepseek-chat'
                       : providerKey === 'opencode' ? 'north-mini-code-free'
                       : ''

    if (existing) {
      await pool.query(
        `UPDATE agent_provider_connections SET 
          provider_name = ?, 
          base_url = ?, 
          api_key_ciphertext = ?, 
          api_key_iv = ?, 
          api_key_tag = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [providerName, baseUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag, existing.id]
      )
    } else {
      const uuid = Math.random().toString(36).substring(2, 10).toUpperCase()
      await pool.query(
        `INSERT INTO agent_provider_connections 
          (uuid, provider_key, provider_name, provider_kind, base_url, api_key_ciphertext, api_key_iv, api_key_tag, default_model, is_active, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'configured')`,
        [uuid, providerKey, providerName, providerKind, baseUrl, encrypted.ciphertext, encrypted.iv, encrypted.tag, defaultModel]
      )
    }
  } catch (err) {
    console.error(`[SettingsStore] Failed to save settings for ${providerKey} to DB:`, err)
  }
}

@Injectable()
export class SettingsStore {
  private currentSettings: CodeItSettings = {
    openrouter: {
      apiKey: settings.providers.openrouter.apiKey ?? '',
      baseUrl: settings.providers.openrouter.baseUrl,
    },
    openai: {
      apiKey: settings.providers.openai.apiKey ?? '',
      baseUrl: settings.providers.openai.baseUrl,
    },
    deepseek: {
      apiKey: settings.providers.deepseek.apiKey ?? '',
      baseUrl: settings.providers.deepseek.baseUrl,
    },
    opencode: {
      apiKey: settings.providers.opencode.apiKey ?? '',
      baseUrl: settings.providers.opencode.baseUrl,
    },
  }

  private lastFetchTime = 0
  private cacheTTL = 5000 // 5 seconds cache

  async get(): Promise<CodeItSettings> {
    const now = Date.now()
    if (now - this.lastFetchTime > this.cacheTTL) {
      this.currentSettings = await loadSettingsFromDb(this.currentSettings)
      this.lastFetchTime = now
    }
    return this.currentSettings
  }

  async update(newSettings: Partial<CodeItSettings>): Promise<CodeItSettings> {
    if (newSettings.openrouter) {
      this.currentSettings.openrouter = { ...this.currentSettings.openrouter, ...newSettings.openrouter }
      await saveSettingToDb('openrouter', this.currentSettings.openrouter.apiKey, this.currentSettings.openrouter.baseUrl)
    }
    if (newSettings.openai) {
      this.currentSettings.openai = { ...this.currentSettings.openai, ...newSettings.openai }
      await saveSettingToDb('openai', this.currentSettings.openai.apiKey, this.currentSettings.openai.baseUrl)
    }
    if (newSettings.deepseek) {
      this.currentSettings.deepseek = { ...this.currentSettings.deepseek, ...newSettings.deepseek }
      await saveSettingToDb('deepseek', this.currentSettings.deepseek.apiKey, this.currentSettings.deepseek.baseUrl)
    }
    if (newSettings.opencode) {
      this.currentSettings.opencode = { ...this.currentSettings.opencode, ...newSettings.opencode }
      await saveSettingToDb('opencode', this.currentSettings.opencode.apiKey, this.currentSettings.opencode.baseUrl)
    }
    this.lastFetchTime = 0 // Invalidate cache immediately on update
    return this.currentSettings
  }
}
