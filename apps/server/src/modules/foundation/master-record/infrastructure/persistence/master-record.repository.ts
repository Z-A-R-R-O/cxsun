import { randomInt } from 'crypto'
import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import type { MasterRecord } from '../../domain/entities/master-record.entity.js'
import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../domain/value-objects/master-data-definition.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class MasterRecordRepository {
  async list(context: TenantRuntimeContext, definition: MasterDataModuleDefinition): Promise<MasterRecord[]> {
    return sql<MasterRecord>`
      SELECT *
      FROM ${sql.table(definition.tableName)}
      ORDER BY ${sql.ref(definition.defaultSortKey)} ASC, id ASC
    `.execute(this.database(context)).then((result) => result.rows)
  }

  async find(context: TenantRuntimeContext, definition: MasterDataModuleDefinition, idOrUuid: string): Promise<MasterRecord | null> {
    const result = await sql<MasterRecord>`
      SELECT *
      FROM ${sql.table(definition.tableName)}
      WHERE ${this.idPredicate(idOrUuid)}
      LIMIT 1
    `.execute(this.database(context))

    return result.rows[0] ?? null
  }

  async insert(context: TenantRuntimeContext, definition: MasterDataModuleDefinition, input: Record<string, unknown>) {
    const values = { ...input, uuid: await this.nextUuid(context, definition), deleted_at: null }

    await this.database(context)
      .insertInto(definition.tableName)
      .values(values)
      .execute()

    const created = await this.find(context, definition, String(values.uuid))

    if (!created) {
      throw new Error(`${definition.label} insert did not return a persisted record.`)
    }

    return created
  }

  async update(context: TenantRuntimeContext, definition: MasterDataModuleDefinition, idOrUuid: string, input: Record<string, unknown>) {
    await sql`
      UPDATE ${sql.table(definition.tableName)}
      SET ${sql.join(
        Object.entries(input).map(([key, value]) => sql`${sql.ref(key)} = ${value}`),
        sql`, `,
      )}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.idPredicate(idOrUuid)}
    `.execute(this.database(context))

    return this.find(context, definition, idOrUuid)
  }

  async softDelete(context: TenantRuntimeContext, definition: MasterDataModuleDefinition, idOrUuid: string) {
    const existing = await this.find(context, definition, idOrUuid)

    if (!existing) {
      return null
    }

    await sql`
      UPDATE ${sql.table(definition.tableName)}
      SET is_active = ${false}, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.idPredicate(idOrUuid)}
    `.execute(this.database(context))

    return this.find(context, definition, idOrUuid)
  }

  async restore(context: TenantRuntimeContext, definition: MasterDataModuleDefinition, idOrUuid: string) {
    const existing = await this.find(context, definition, idOrUuid)

    if (!existing) {
      return null
    }

    await sql`
      UPDATE ${sql.table(definition.tableName)}
      SET is_active = ${true}, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.idPredicate(idOrUuid)}
    `.execute(this.database(context))

    return this.find(context, definition, idOrUuid)
  }

  private async nextUuid(context: TenantRuntimeContext, definition: MasterDataModuleDefinition) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const uuid = String(randomInt(10_000_000, 100_000_000))
      const existing = await this.find(context, definition, uuid)

      if (!existing) {
        return uuid
      }
    }

    throw new Error(`Could not generate ${definition.label} public uuid.`)
  }

  private idPredicate(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8
      ? sql`id = ${Number(idOrUuid)}`
      : sql`uuid = ${idOrUuid}`
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

export { MasterRecordRepository as MasterDataRepository }

export function columnSqlType(column: MasterDataColumnDefinition) {
  if (column.type === 'boolean') return 'TINYINT(1)'
  if (column.type === 'number') return column.numberMode === 'decimal' ? 'DOUBLE' : 'INT'
  return 'VARCHAR(255)'
}
