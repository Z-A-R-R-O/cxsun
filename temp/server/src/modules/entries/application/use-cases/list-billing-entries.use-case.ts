import { Inject, Injectable } from "@nestjs/common";
import type { BillingEntryKind } from "../../domain/entry-record";
import {
  ENTRIES_REPOSITORY,
  type EntriesRepository,
  type EntryContextCriteria,
} from "../services/entries.repository";

@Injectable()
export class ListBillingEntriesUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
  ) {}

  public execute(kind: BillingEntryKind, context: EntryContextCriteria) {
    return this.entriesRepository.listBilling(kind, context);
  }
}
