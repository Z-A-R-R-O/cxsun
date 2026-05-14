import type {
  CommonLocationRecord,
  CommonLocationUpsertParams,
} from "../../domain/entities/common-location-record";
import type { CommonLocationModuleKey } from "../../domain/value-objects/common-location-definition";

export interface CommonLocationRepository {
  list(moduleKey: CommonLocationModuleKey): Promise<readonly CommonLocationRecord[]>;
  getById(moduleKey: CommonLocationModuleKey, id: string): Promise<CommonLocationRecord | null>;
  create(
    moduleKey: CommonLocationModuleKey,
    params: CommonLocationUpsertParams,
  ): Promise<CommonLocationRecord>;
  update(
    moduleKey: CommonLocationModuleKey,
    id: string,
    params: CommonLocationUpsertParams,
  ): Promise<CommonLocationRecord | null>;
  softDelete(moduleKey: CommonLocationModuleKey, id: string): Promise<boolean>;
}

export const COMMON_LOCATION_REPOSITORY = Symbol("COMMON_LOCATION_REPOSITORY");
