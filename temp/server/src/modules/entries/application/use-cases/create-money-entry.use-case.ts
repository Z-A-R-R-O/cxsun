import { Inject, Injectable } from "@nestjs/common";
import { EntryAggregate } from "../../domain/aggregates/entry.aggregate";
import type { MoneyEntryKind } from "../../domain/entry-record";
import { DocumentNumberService } from "../../../document-settings/application/document-number.service";
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
export class CreateMoneyEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  public async execute(kind: MoneyEntryKind, input: MoneyEntryInput) {
    const entryInput = await this.withDocumentNumber(kind, input);
    const entry = await this.entriesRepository.createMoney(kind, entryInput);
    await this.eventPublisher.publishAll([EntryAggregate.fromRecord(entry).createdEvent()]);
    return entry;
  }

  private async withDocumentNumber(kind: MoneyEntryKind, input: MoneyEntryInput) {
    if (!input.autoDocumentNo && input.documentNo?.trim()) return input;
    return {
      ...input,
      documentNo: await this.documentNumberService.reserveNext(kind, {
        companyId: input.companyId,
        accountingYearId: input.accountingYearId,
      }),
    };
  }
}
