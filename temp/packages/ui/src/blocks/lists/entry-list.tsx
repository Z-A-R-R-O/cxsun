"use client";

import type { ReactNode } from "react";
import {
  ListEmptyState,
  ListFormCard,
  ListPageFrame,
  ListPaginationCard,
  ListTableCard,
  ListToolbarCard,
  buildShowingLabel,
  type ListColumnOption,
  type ListFilterOption,
  type ListPageFrameProps,
} from "./shared";

export type EntryListColumnOption = ListColumnOption;
export type EntryListFilterOption = ListFilterOption;
export type EntryListPageFrameProps = ListPageFrameProps;

export const EntryListPageFrame = ListPageFrame;
export const EntryListToolbarCard = ListToolbarCard;
export const EntryListListCard = ListTableCard;
export const EntryListPaginationCard = ListPaginationCard;
export const EntryListEmptyState = ListEmptyState;
export const EntryListUpsertCard = ListFormCard;
export const buildEntryListShowingLabel = buildShowingLabel;

export function EntryListLayout({
  list,
  form,
}: {
  readonly list: ReactNode;
  readonly form: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      {list}
      {form}
    </div>
  );
}
