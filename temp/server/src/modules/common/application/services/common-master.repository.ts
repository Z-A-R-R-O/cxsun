import type {
  CommonMasterRecord,
  CommonMasterUpsertParams,
} from "../../domain/entities/common-master-record";
import type { CommonMasterModuleKey } from "../../domain/value-objects/common-master-definition";

export interface CommonMasterRepository {
  list(moduleKey: CommonMasterModuleKey): Promise<readonly CommonMasterRecord[]>;
  getById(moduleKey: CommonMasterModuleKey, id: string): Promise<CommonMasterRecord | null>;
  create(moduleKey: CommonMasterModuleKey, params: CommonMasterUpsertParams): Promise<CommonMasterRecord>;
  update(
    moduleKey: CommonMasterModuleKey,
    id: string,
    params: CommonMasterUpsertParams,
  ): Promise<CommonMasterRecord | null>;
  softDelete(moduleKey: CommonMasterModuleKey, id: string): Promise<boolean>;
  forceDelete(moduleKey: CommonMasterModuleKey, id: string): Promise<boolean>;
}

export const COMMON_MASTER_REPOSITORY = Symbol("COMMON_MASTER_REPOSITORY");
