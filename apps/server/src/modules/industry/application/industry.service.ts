import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { IndustryUpsertInput } from '../domain/industry.types.js'
import { IndustryRepository, normalizeIndustryCode } from '../infrastructure/industry.repository.js'

@Injectable()
export class IndustryService {
  constructor(
    @Inject(IndustryRepository) private readonly industries: IndustryRepository,
  ) {}

  list() {
    return this.industries.list()
  }

  async destroy(id: number) {
    return (await this.industries.softDelete(id))
      ? { ok: true }
      : { ok: false, error: 'Industry was not found.' }
  }

  async restore(id: number) {
    return (await this.industries.restore(id))
      ? { ok: true }
      : { ok: false, error: 'Industry was not found.' }
  }

  async upsert(input: IndustryUpsertInput) {
    const code = normalizeIndustryCode(input.code)
    const name = input.name?.trim()

    if (!code) {
      return { ok: false, error: 'Industry code is required.' }
    }

    if (!name) {
      return { ok: false, error: 'Industry name is required.' }
    }

    if (await this.industries.hasCode(code, input.id)) {
      return { ok: false, error: 'Industry code is already used.' }
    }

    return {
      ok: true,
      industry: await this.industries.upsert({ ...input, code, name }),
    }
  }
}
