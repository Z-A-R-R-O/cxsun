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
  type EntryContextCriteria,
} from "../services/entries.repository";

@Injectable()
export class DeleteMoneyEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
  ) {}

  public async execute(kind: MoneyEntryKind, entryId: string, context: EntryContextCriteria) {
    const wasDeleted = await this.entriesRepository.softDeleteMoney(kind, entryId, context);
    if (wasDeleted)
      await this.eventPublisher.publishAll([EntryAggregate.deletedEvent(kind, entryId)]);
    return wasDeleted;
  }
}
