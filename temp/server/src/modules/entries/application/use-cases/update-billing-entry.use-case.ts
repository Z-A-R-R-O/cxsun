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
  type BillingEntryInput,
  type EntriesRepository,
} from "../services/entries.repository";

@Injectable()
export class UpdateBillingEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
    private readonly stockService: StockService,
  ) {}

  public async execute(kind: BillingEntryKind, entryId: string, input: BillingEntryInput) {
    const entry = await this.entriesRepository.updateBilling(kind, entryId, input);

    if (entry) {
      await this.stockService.syncBillingEntry(kind, entry);
      await this.eventPublisher.publishAll([EntryAggregate.fromRecord(entry).updatedEvent()]);
    }

    return entry;
  }
}
