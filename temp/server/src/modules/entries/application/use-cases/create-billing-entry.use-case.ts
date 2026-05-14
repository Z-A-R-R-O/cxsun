import { Inject, Injectable } from "@nestjs/common";
import { EntryAggregate } from "../../domain/aggregates/entry.aggregate";
import type { BillingEntryKind } from "../../domain/entry-record";
import { DocumentNumberService } from "../../../document-settings/application/document-number.service";
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
export class CreateBillingEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
    @Inject(ENTRIES_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: EntriesDomainEventPublisher,
    private readonly documentNumberService: DocumentNumberService,
    private readonly stockService: StockService,
  ) {}

  public async execute(kind: BillingEntryKind, input: BillingEntryInput) {
    const entryInput = await this.withDocumentNumber(kind, input);
    const entry = await this.entriesRepository.createBilling(kind, entryInput);
    await this.stockService.syncBillingEntry(kind, entry);
    await this.eventPublisher.publishAll([EntryAggregate.fromRecord(entry).createdEvent()]);
    return entry;
  }

  private async withDocumentNumber(kind: BillingEntryKind, input: BillingEntryInput) {
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
