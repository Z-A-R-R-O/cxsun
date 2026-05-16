import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { commonModuleFolderContracts } from '../../../common/registry.js'
import { contactMasterDefinition } from '../../../master/contact/domain/value-objects/contact-master.definition.js'
import { masterDataIdentityMigrationContract } from '../../master-record/database/migrations/master-record.migration.js'
import { masterDataDefinitions } from '../domain/value-objects/master-data-definition.js'
import { orderMasterDefinition } from '../../../master/order/domain/value-objects/order-master.definition.js'
import { productMasterDefinition } from '../../../master/product/domain/value-objects/product-master.definition.js'

const commonDefinitions = masterDataDefinitions.filter((definition) => definition.kind === 'common')
const standaloneMasterDefinitions = [contactMasterDefinition, productMasterDefinition, orderMasterDefinition]
const allDefinitions = [...masterDataDefinitions, ...standaloneMasterDefinitions]
const testDirectory = dirname(fileURLToPath(import.meta.url))

assert.ok(masterDataDefinitions.length > 0, 'master-data definitions must not be empty')
assert.ok(commonDefinitions.length > 0, 'common module definitions must exist')
assert.equal(masterDataDefinitions.filter((definition) => definition.kind === 'master').length, 0, 'master modules must be split out of generic master-data')
assert.equal(standaloneMasterDefinitions.length, 3, 'contact, product, and order standalone master modules must exist')
assert.equal(commonModuleFolderContracts.length, commonDefinitions.length, 'every common module must declare a folder contract')

assertUnique(allDefinitions, 'key')
assertUnique(allDefinitions, 'tableName')
assertUnique(allDefinitions, 'idPrefix')

for (const definition of allDefinitions) {
  assert.match(definition.key, /^[A-Za-z][A-Za-z0-9]*$/, `${definition.key} must be route-safe`)
  assert.match(definition.tableName, /^[a-z][a-z0-9_]*$/, `${definition.key} table name must be SQL-safe`)
  assert.ok(definition.columns.length > 0, `${definition.key} must define columns`)
  assert.ok(
    definition.columns.some((column) => column.required),
    `${definition.key} must have at least one required column`,
  )
  assertUnique(definition.columns, 'key', `${definition.key} column`)
}

for (const definition of standaloneMasterDefinitions) {
  assert.ok(
    definition.tableName.startsWith('masters_'),
    `${definition.key} master table must use masters_ prefix`,
  )
}

for (const folderContract of commonModuleFolderContracts) {
  const definition = commonDefinitions.find((commonDefinition) => commonDefinition.key === folderContract.key)
  assert.ok(definition, `${folderContract.key} folder contract must map to a common definition`)
  assert.equal(definition.group, folderContract.group, `${folderContract.key} folder group must match definition group`)
  assert.match(folderContract.group, /^[a-z][a-z0-9-]*$/, `${folderContract.key} group folder must be URL-safe`)
  assert.match(folderContract.module, /^[a-z][a-z0-9-]*$/, `${folderContract.key} module folder must be URL-safe`)

  const definitionPath = join(
    testDirectory,
    '../../../common',
    folderContract.group,
    folderContract.module,
    'domain/value-objects',
    `${folderContract.module}.definition.ts`,
  )
  assert.ok(existsSync(definitionPath), `${folderContract.key} must live under common/<group>/<module>`)
  assert.ok(folderContract.moduleClass, `${folderContract.key} must declare a standalone module class`)
  assert.ok(folderContract.migration, `${folderContract.key} must declare a standalone migration`)

  const moduleRoot = join(testDirectory, '../../../common', folderContract.group, folderContract.module)
  assert.ok(existsSync(join(moduleRoot, `${folderContract.module}.module.ts`)), `${folderContract.key} must have a module class file`)
  assert.ok(existsSync(join(moduleRoot, 'application', `${folderContract.module}.service.ts`)), `${folderContract.key} must have an application service`)
  assert.ok(existsSync(join(moduleRoot, 'infrastructure/persistence', `${folderContract.module}.repository.ts`)), `${folderContract.key} must have a repository`)
  assert.ok(existsSync(join(moduleRoot, 'interface/http', `${folderContract.module}-v1.controller.ts`)), `${folderContract.key} must have an HTTP controller`)
  assert.ok(existsSync(join(moduleRoot, 'database/migrations', `${folderContract.module}.migration.ts`)), `${folderContract.key} must have a migration`)
}

assert.equal(masterDataIdentityMigrationContract.primaryKeyColumn, 'id')
assert.equal(masterDataIdentityMigrationContract.primaryKeyDefinition, 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY')
assert.equal(masterDataIdentityMigrationContract.publicUuidColumn, 'uuid')
assert.equal(masterDataIdentityMigrationContract.publicUuidDefinition, 'CHAR(8) NOT NULL UNIQUE')
assert.equal(masterDataIdentityMigrationContract.publicUuidLength, 8)

console.info(
  `master-data contract ok: ${commonDefinitions.length} common modules, ${standaloneMasterDefinitions.length} standalone master modules`,
)

function assertUnique<T extends object, K extends keyof T>(items: readonly T[], key: K, label = String(key)) {
  const seen = new Set<unknown>()

  for (const item of items) {
    const value = item[key]
    assert.ok(value !== null && value !== undefined && value !== '', `${label} value must be present`)
    assert.ok(!seen.has(value), `${label} "${String(value)}" must be unique`)
    seen.add(value)
  }
}
