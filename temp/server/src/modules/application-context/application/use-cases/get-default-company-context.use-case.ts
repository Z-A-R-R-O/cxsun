import { Inject, Injectable } from "@nestjs/common";
import {
  APPLICATION_CONTEXT_REPOSITORY,
  type ApplicationContextRepository,
  type DefaultCompanyUpdateParams,
} from "../services/application-context.repository";

@Injectable()
export class GetDefaultCompanyContextUseCase {
  public constructor(
    @Inject(APPLICATION_CONTEXT_REPOSITORY)
    private readonly repository: ApplicationContextRepository,
  ) {}

  public async execute() {
    return this.repository.getDefaultCompanyContext();
  }
}

@Injectable()
export class GetDefaultCompanyRecordUseCase {
  public constructor(
    @Inject(APPLICATION_CONTEXT_REPOSITORY)
    private readonly repository: ApplicationContextRepository,
  ) {}

  public async execute() {
    return this.repository.getDefaultCompanyRecord();
  }
}

@Injectable()
export class UpdateDefaultCompanyUseCase {
  public constructor(
    @Inject(APPLICATION_CONTEXT_REPOSITORY)
    private readonly repository: ApplicationContextRepository,
  ) {}

  public async execute(params: DefaultCompanyUpdateParams) {
    return this.repository.updateDefaultCompany(params);
  }
}
