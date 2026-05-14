import { Global, Module } from "@nestjs/common";
import { InMemoryEventBus } from "@cxnext/event";
import { EVENT_BUS } from "./event.constants";

@Global()
@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useFactory: () => new InMemoryEventBus(),
    },
  ],
  exports: [EVENT_BUS],
})
export class EventsModule {}
