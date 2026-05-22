export type CompanySettingKey = 'apps' | 'software' | 'mail'

export interface CompanySettingRecord {
  companyId: string
  key: CompanySettingKey
  values: Record<string, unknown>
  updatedAt: Date
}

export interface CompanySettingInput {
  values?: Record<string, unknown>
}

export const companySettingKeys = ['apps', 'software', 'mail'] as const

