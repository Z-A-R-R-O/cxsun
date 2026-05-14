import { Inject, Injectable } from "@nestjs/common";
import type { MoneyEntryKind } from "../../domain/entry-record";
import {
  ENTRIES_REPOSITORY,
  type EntriesRepository,
  type EntryContextCriteria,
} from "../services/entries.repository";

@Injectable()
export class GetMoneyEntryUseCase {
  public constructor(
    @Inject(ENTRIES_REPOSITORY)
    private readonly entriesRepository: EntriesRepository,
  ) {}

  public execute(kind: MoneyEntryKind, entryId: string, context: EntryContextCriteria) {
    return this.entriesRepository.getMoney(kind, entryId, context);
  }
}
