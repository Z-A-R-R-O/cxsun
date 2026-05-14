import { CONTACT_REPOSITORY } from "../application/services/contact.repository";
import { DOMAIN_EVENT_PUBLISHER } from "../application/services/domain-event-publisher";
import { EventBusDomainEventPublisher } from "./adapters/event-bus-domain-event-publisher";
import { KyselyContactRepository } from "./persistence/kysely-contact.repository";

export const contactProviders = [
  {
    provide: CONTACT_REPOSITORY,
    useClass: KyselyContactRepository,
  },
  {
    provide: DOMAIN_EVENT_PUBLISHER,
    useClass: EventBusDomainEventPublisher,
  },
] as const;
