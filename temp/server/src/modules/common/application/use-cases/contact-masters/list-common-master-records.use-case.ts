import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_MASTER_REPOSITORY,
  type CommonMasterRepository,
} from "../../services/common-master.repository";
import type { CommonMasterModuleKey } from "../../../domain/value-objects/common-master-definition";

@Injectable()
export class ListCommonMasterRecordsUseCase {
  public constructor(
    @Inject(COMMON_MASTER_REPOSITORY)
    private readonly commonMasterRepository: CommonMasterRepository,
  ) {}

  public execute(moduleKey: CommonMasterModuleKey) {
    return this.commonMasterRepository.list(moduleKey);
  }
}
