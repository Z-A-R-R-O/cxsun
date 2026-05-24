export type DocumentEntryKind = 'deliveryNote' | 'payment' | 'purchase' | 'purchaseReceipt' | 'receipt' | 'sales'

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
  prefixEnabled: boolean
  separator: string
  separatorEnabled: boolean
  suffix: string
  suffixEnabled: boolean
  nextNumber: number
  padding: number
  autoEnabled: boolean
  preview: string
  updatedAt: Date
}

export interface DocumentNumberSettingInput {
  kind: DocumentEntryKind
  prefix?: string | null
  prefixEnabled?: boolean | number | null
  separator?: string | null
  separatorEnabled?: boolean | number | null
  suffix?: string | null
  suffixEnabled?: boolean | number | null
  nextNumber?: number | string | null
  padding?: number | string | null
  autoEnabled?: boolean | number | null
}

export const documentEntryKinds = ['sales', 'purchase', 'purchaseReceipt', 'deliveryNote', 'payment', 'receipt'] as const
