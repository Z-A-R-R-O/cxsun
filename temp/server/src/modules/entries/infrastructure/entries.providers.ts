import { ENTRIES_DOMAIN_EVENT_PUBLISHER } from "../application/services/domain-event-publisher";
import { ENTRIES_REPOSITORY } from "../application/services/entries.repository";
import { EventBusEntriesDomainEventPublisher } from "./adapters/event-bus-domain-event-publisher";
import { KyselyEntriesRepository } from "./persistence/kysely-entries.repository";

export const entriesProviders = [
  {
    provide: ENTRIES_REPOSITORY,
    useClass: KyselyEntriesRepository,
  },
  {
    provide: ENTRIES_DOMAIN_EVENT_PUBLISHER,
    useClass: EventBusEntriesDomainEventPublisher,
  },
];
