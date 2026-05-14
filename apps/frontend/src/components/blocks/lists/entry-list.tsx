import type { ReactNode } from "react"

import {
  CommonListEmptyState,
  CommonListFormCard,
  CommonListPageFrame,
  CommonListPaginationCard,
  CommonListTableCard,
  CommonListToolbarCard,
  buildCommonListShowingLabel,
  type CommonListColumnOption,
  type CommonListFilterOption,
} from "./common-list"

export type EntryListColumnOption = CommonListColumnOption
export type EntryListFilterOption = CommonListFilterOption

export const EntryListPageFrame = CommonListPageFrame
export const EntryListToolbarCard = CommonListToolbarCard
export const EntryListTableCard = CommonListTableCard
export const EntryListPaginationCard = CommonListPaginationCard
export const EntryListEmptyState = CommonListEmptyState
export const EntryListUpsertCard = CommonListFormCard
export const EntryListPrintPreviewCard = CommonListFormCard
export const buildEntryListShowingLabel = buildCommonListShowingLabel

export function EntryListPrintPreviewLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">{children}</div>
}

export function EntryListUpsertLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}
