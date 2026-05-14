import type { Provider } from "@nestjs/common";
import { COMMON_MASTER_REPOSITORY } from "../application/services/common-master.repository";
import { COMMON_DOMAIN_EVENT_PUBLISHER } from "../application/services/domain-event-publisher";
import { CreateCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/create-common-master-record.use-case";
import { DeleteCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/delete-common-master-record.use-case";
import { GetCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/get-common-master-record.use-case";
import { ListCommonMasterRecordsUseCase } from "../application/use-cases/contact-masters/list-common-master-records.use-case";
import { UpdateCommonMasterRecordUseCase } from "../application/use-cases/contact-masters/update-common-master-record.use-case";
import { EventBusDomainEventPublisher } from "./adapters/event-bus-domain-event-publisher";
import { KyselyCommonMasterRepository } from "./persistence/kysely-common-master.repository";

export const commonMasterProviders: Provider[] = [
  ListCommonMasterRecordsUseCase,
  GetCommonMasterRecordUseCase,
  CreateCommonMasterRecordUseCase,
  UpdateCommonMasterRecordUseCase,
  DeleteCommonMasterRecordUseCase,
  {
    provide: COMMON_MASTER_REPOSITORY,
    useClass: KyselyCommonMasterRepository,
  },
  {
    provide: COMMON_DOMAIN_EVENT_PUBLISHER,
    useClass: EventBusDomainEventPublisher,
  },
];
