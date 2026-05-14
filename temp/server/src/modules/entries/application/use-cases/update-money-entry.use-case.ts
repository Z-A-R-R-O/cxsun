import { Inject, Injectable } from "@nestjs/common";
import { EntryAggregate } from "../../domain/aggregates/entry.aggregate";
import type { MoneyEntryKind } from "../../domain/entry-record";
import {
  ENTRIES_DOMAIN_EVENT_PUBLISHER,
  type EntriesDomainEventPublisher,
} from "../services/domain-event-publisher";
import {
  ENTRIES_REPOSITORY,
  type EntriesRepository,
  type MoneyEntryInput,
} from "../services/entries.repository";

@Injectable()
export class UpdateMoneyEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
  ) {}

  public async execute(kind: MoneyEntryKind, entryId: string, input: MoneyEntryInput) {
    const entry = await this.entriesRepository.updateMoney(kind, entryId, input);
    if (entry)
      await this.eventPublisher.publishAll([EntryAggregate.fromRecord(entry).updatedEvent()]);
    return entry;
  }
}
