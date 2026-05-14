import { Inject, Injectable } from "@nestjs/common";
import type { BillingEntryKind } from "../../domain/entry-record";
import {
  ENTRIES_REPOSITORY,
  type EntriesRepository,
  type EntryContextCriteria,
} from "../services/entries.repository";

@Injectable()
export class GetBillingEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
  ) {}

  public execute(kind: BillingEntryKind, entryId: string, context: EntryContextCriteria) {
    return this.entriesRepository.getBilling(kind, entryId, context);
  }
}
