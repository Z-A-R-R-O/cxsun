import type { Provider } from "@nestjs/common";
import { COMMON_LOCATION_REPOSITORY } from "../application/services/common-location.repository";
import { COMMON_DOMAIN_EVENT_PUBLISHER } from "../application/services/domain-event-publisher";
import { CreateCommonLocationRecordUseCase } from "../application/use-cases/location/create-common-location-record.use-case";
import { DeleteCommonLocationRecordUseCase } from "../application/use-cases/location/delete-common-location-record.use-case";
import { GetCommonLocationRecordUseCase } from "../application/use-cases/location/get-common-location-record.use-case";
import { ListCommonLocationRecordsUseCase } from "../application/use-cases/location/list-common-location-records.use-case";
import { UpdateCommonLocationRecordUseCase } from "../application/use-cases/location/update-common-location-record.use-case";
import { EventBusDomainEventPublisher } from "./adapters/event-bus-domain-event-publisher";
import { KyselyCommonLocationRepository } from "./persistence/kysely-common-location.repository";

export const commonLocationProviders: Provider[] = [
  ListCommonLocationRecordsUseCase,
  GetCommonLocationRecordUseCase,
  CreateCommonLocationRecordUseCase,
  UpdateCommonLocationRecordUseCase,
  DeleteCommonLocationRecordUseCase,
  {
    provide: COMMON_LOCATION_REPOSITORY,
    useClass: KyselyCommonLocationRepository,
  },
  {
    provide: COMMON_DOMAIN_EVENT_PUBLISHER,
    useClass: EventBusDomainEventPublisher,
  },
];
