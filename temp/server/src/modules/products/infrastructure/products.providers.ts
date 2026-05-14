import { PRODUCT_DOMAIN_EVENT_PUBLISHER } from "../application/services/domain-event-publisher";
import { PRODUCT_REPOSITORY } from "../application/services/product.repository";
import { EventBusProductDomainEventPublisher } from "./adapters/event-bus-domain-event-publisher";
import { KyselyProductRepository } from "./persistence/kysely-product.repository";

export const productProviders = [
  {
    provide: PRODUCT_REPOSITORY,
    useClass: KyselyProductRepository,
  },
  {
    provide: PRODUCT_DOMAIN_EVENT_PUBLISHER,
    useClass: EventBusProductDomainEventPublisher,
  },
];
