import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_LOCATION_REPOSITORY,
  type CommonLocationRepository,
} from "../../services/common-location.repository";
import type { CommonLocationModuleKey } from "../../../domain/value-objects/common-location-definition";

@Injectable()
export class ListCommonLocationRecordsUseCase {
  public constructor(
    @Inject(COMMON_LOCATION_REPOSITORY)
    private readonly commonLocationRepository: CommonLocationRepository,
  ) {}

  public execute(moduleKey: CommonLocationModuleKey) {
    return this.commonLocationRepository.list(moduleKey);
  }
}
