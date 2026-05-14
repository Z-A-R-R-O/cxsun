import { Module } from "@nestjs/common";
import { APPLICATION_CONTEXT_REPOSITORY } from "./application/services/application-context.repository";
import {
  GetDefaultCompanyContextUseCase,
  GetDefaultCompanyRecordUseCase,
  UpdateDefaultCompanyUseCase,
} from "./application/use-cases/get-default-company-context.use-case";
import { KyselyApplicationContextRepository } from "./infrastructure/persistence/kysely-application-context.repository";
import { ApplicationContextController } from "./interface/http/application-context.controller";

@Module({
  controllers: [ApplicationContextController],
  providers: [
    GetDefaultCompanyContextUseCase,
    GetDefaultCompanyRecordUseCase,
    UpdateDefaultCompanyUseCase,
    {
      provide: APPLICATION_CONTEXT_REPOSITORY,
      useClass: KyselyApplicationContextRepository,
    },
  ],
})
export class ApplicationContextModule {}
