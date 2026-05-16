import { commonModuleDefinitions } from '../../../../common/registry.js'
import type { MasterDataModuleDefinition } from '../../../master-record/domain/value-objects/master-data-definition.js'

export type {
  MasterDataColumnDefinition,
  MasterDataColumnType,
  MasterDataKind,
  MasterDataModuleDefinition,
} from '../../../master-record/domain/value-objects/master-data-definition.js'

export const masterDataDefinitions: MasterDataModuleDefinition[] = commonModuleDefinitions

export type MasterDataModuleKey = (typeof masterDataDefinitions)[number]['key']

export function getMasterDataDefinition(key: string) {
  return masterDataDefinitions.find((definition) => definition.key === key) ?? null
}
