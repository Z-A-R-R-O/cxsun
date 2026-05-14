import type { CompanyStatus, CompanyUpsertInput } from './company.types.js'

export interface NormalizedCompanyData {
  name: string
  status: CompanyStatus
  settings: string
  features: string
}

export class CompanyAggregate {
  static normalize(input: CompanyUpsertInput): NormalizedCompanyData {
    const name = input.name?.trim()
    const status = input.status ?? 'active'

    if (!name) {
      throw new CompanyValidationError('Company name is required.')
    }

    if (!['active', 'not_active', 'suspend'].includes(status)) {
      throw new CompanyValidationError('Company status is invalid.')
    }

    return {
      name,
      status,
      settings: JSON.stringify(input.settings ?? {}),
      features: JSON.stringify(input.features ?? []),
    }
  }
}

export class CompanyValidationError extends Error {}

