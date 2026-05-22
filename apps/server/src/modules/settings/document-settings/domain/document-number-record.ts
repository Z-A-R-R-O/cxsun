export type DocumentEntryKind = 'payment' | 'purchase' | 'receipt' | 'sales'

export interface DocumentNumberContext {
  companyId?: string
  accountingYearId?: string
}

export interface DocumentNumberSettingRecord {
  id: string
  companyId: string
  accountingYearId: string
  kind: DocumentEntryKind
  prefix: string
  separator: string
  nextNumber: number
  padding: number
  autoEnabled: boolean
  preview: string
  updatedAt: Date
}

export interface DocumentNumberSettingInput {
  kind: DocumentEntryKind
  prefix?: string | null
  separator?: string | null
  nextNumber?: number | string | null
  padding?: number | string | null
  autoEnabled?: boolean | number | null
}

export const documentEntryKinds = ['sales', 'purchase', 'payment', 'receipt'] as const

