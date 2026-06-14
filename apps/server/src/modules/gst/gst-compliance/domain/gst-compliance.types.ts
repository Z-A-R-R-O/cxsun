export type GstProvider = 'whitebooks'
export type GstProviderEnvironment = 'sandbox' | 'production'
export type GstProviderPurpose = 'einvoice_eway' | 'eway_only'

export const gstComplianceOperations = [
  'authenticate',
  'gstnDetails',
  'syncGstinFromCommonPortal',
  'generateIrn',
  'getEinvoiceByIrn',
  'getIrnByDocument',
  'cancelIrn',
  'getRejectedIrns',
  'generateEwaybillByIrn',
  'getEwaybillByIrn',
  'cancelEwaybill',
  'getB2cQrCode',
] as const

export type GstComplianceOperation = typeof gstComplianceOperations[number]

export interface GstProviderSettingsInput {
  companyId?: string | number | null
  provider?: GstProvider | null
  environment?: GstProviderEnvironment | null
  baseUrl?: string | null
  email?: string | null
  username?: string | null
  password?: string | null
  clientId?: string | null
  clientSecret?: string | null
  gstin?: string | null
  ipAddress?: string | null
  isEnabled?: boolean | number | null
}

export interface GstProviderGlobalSettingsInput {
  provider?: GstProvider | null
  environment?: GstProviderEnvironment | null
  purpose?: GstProviderPurpose | null
  baseUrl?: string | null
  email?: string | null
  clientId?: string | null
  clientSecret?: string | null
  ipAddress?: string | null
  isEnabled?: boolean | number | null
}

export interface GstProviderGlobalSettingsRecord {
  id: string
  uuid: string
  provider: GstProvider
  environment: GstProviderEnvironment
  purpose: GstProviderPurpose
  baseUrl: string
  email: string
  clientId: string
  clientSecret: string
  ipAddress: string
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GstProviderSettingsRecord {
  id: string
  uuid: string
  companyId: string
  provider: GstProvider
  environment: GstProviderEnvironment
  purpose: GstProviderPurpose
  baseUrl: string
  email: string
  username: string
  hasPassword: boolean
  password?: string
  clientId: string
  hasClientSecret: boolean
  clientSecret?: string
  gstin: string
  ipAddress: string
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GstProviderSettingsSecretRecord extends GstProviderSettingsRecord {
  password: string
  clientSecret: string
}

export interface GstComplianceOperationInput {
  companyId?: string | number | null
  sourceType?: string | null
  sourceId?: string | number | null
  sourceUuid?: string | null
  documentNo?: string | null
  documentDate?: string | null
  payload?: unknown
  query?: Record<string, unknown>
  environment?: GstProviderEnvironment | null
  purpose?: GstProviderPurpose | null
  forceRefreshToken?: boolean | number | null
}

export interface GstComplianceOperationRecord {
  id: string
  uuid: string
  settingId: string | null
  companyId: string
  provider: GstProvider
  environment: GstProviderEnvironment
  operation: GstComplianceOperation
  sourceType: string | null
  sourceId: number | null
  sourceUuid: string | null
  documentNo: string | null
  method: string
  endpoint: string
  httpStatus: number | null
  providerStatus: string | null
  gatewayStatus: string | null
  success: boolean
  errorCode: string | null
  errorMessage: string | null
  retryState: string
  retryCount: number
  nextRetryAt: Date | null
  generatedAt: Date | null
  cancelledAt: Date | null
  requestJson: Record<string, unknown>
  responseJson: unknown
  createdBy: string
  createdAt: Date
}

export interface GstComplianceDocumentRecord {
  id: string
  uuid: string
  companyId: string
  provider: GstProvider
  environment: GstProviderEnvironment
  sourceType: string
  sourceId: number | null
  sourceUuid: string | null
  documentType: string
  documentNo: string
  documentDate: string | null
  gstin: string | null
  irn: string | null
  ackNo: string | null
  ackDate: string | null
  signedInvoice: string | null
  signedQr: string | null
  ewayBillNo: string | null
  ewayBillDate: string | null
  ewayValidUpto: string | null
  irnStatus: string
  ewayStatus: string
  irnGeneratedAt: string | null
  irnCancelledAt: string | null
  ewayGeneratedAt: string | null
  ewayCancelledAt: string | null
  retryState: string
  lastOperationId: string | null
  updatedAt: Date
}
