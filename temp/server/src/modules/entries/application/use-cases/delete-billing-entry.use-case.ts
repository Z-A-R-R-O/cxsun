import { Inject, Injectable } from "@nestjs/common";
import { EntryAggregate } from "../../domain/aggregates/entry.aggregate";
import type { BillingEntryKind } from "../../domain/entry-record";
import { StockService } from "../../../stock/application/stock.service";
import {
  ENTRIES_DOMAIN_EVENT_PUBLISHER,
  type EntriesDomainEventPublisher,
} from "../services/domain-event-publisher";
import {
  ENTRIES_REPOSITORY,
  type EntriesRepository,
  type EntryContextCriteria,
} from "../services/entries.repository";

@Injectable()
export class DeleteBillingEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
    private readonly stockService: StockService,
  ) {}

  public async execute(kind: BillingEntryKind, entryId: string, context: EntryContextCriteria) {
    const entry = await this.entriesRepository.getBilling(kind, entryId, context);
    const wasDeleted = await this.entriesRepository.softDeleteBilling(kind, entryId, context);
    if (wasDeleted) {
      if (entry) {
        await this.stockService.voidBillingEntry(kind, entry);
      }
      await this.eventPublisher.publishAll([EntryAggregate.deletedEvent(kind, entryId)]);
    }
    return wasDeleted;
  }
}
