import { Injectable } from '../../../core/decorators/injectable.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { Industry, IndustryUpsertInput } from '../domain/industry.types.js'

@Injectable()
export class IndustryRepository {
  async list(): Promise<Industry[]> {
    return getDatabase()
      .selectFrom('industries')
      .selectAll()
      .orderBy('name', 'asc')
      .execute() as Promise<Industry[]>
  }

  async findById(id: number): Promise<Industry | undefined> {
    return getDatabase()
      .selectFrom('industries')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as Promise<Industry | undefined>
  }

  async hasCode(code: string, exceptId?: number): Promise<boolean> {
    const query = getDatabase()
      .selectFrom('industries')
      .select('id')
      .where('code', '=', code)

    const industry = exceptId
      ? await query.where('id', '!=', exceptId).executeTakeFirst()
      : await query.executeTakeFirst()

    return Boolean(industry)
  }

  async upsert(input: IndustryUpsertInput): Promise<Industry> {
    const data = {
      code: normalizeIndustryCode(input.code),
      name: input.name.trim(),
      payload_schema: JSON.stringify(input.payload_schema ?? {}),
      default_features: JSON.stringify(input.default_features ?? []),
      default_ui_settings: JSON.stringify(input.default_ui_settings ?? {}),
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      await getDatabase()
        .updateTable('industries')
        .set(data)
        .where('id', '=', input.id)
        .execute()

      const industry = await this.findById(input.id)

      if (!industry) {
        throw new Error('Industry update did not return a persisted industry.')
      }

      return industry
    }

    await getDatabase()
      .insertInto('industries')
      .values(data)
      .execute()

    const industries = await this.list()
    const industry = industries.find((item) => item.code === data.code)

    if (!industry) {
      throw new Error('Industry insert did not return a persisted industry.')
    }

    return industry
  }
}

export function normalizeIndustryCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

