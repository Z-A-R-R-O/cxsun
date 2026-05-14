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

export type MasterListColumnOption = CommonListColumnOption
export type MasterListFilterOption = CommonListFilterOption

export const MasterListPageFrame = CommonListPageFrame
export const MasterListToolbarCard = CommonListToolbarCard
export const MasterListTableCard = CommonListTableCard
export const MasterListPaginationCard = CommonListPaginationCard
export const MasterListEmptyState = CommonListEmptyState
export const MasterListShowCard = CommonListFormCard
export const MasterListUpsertCard = CommonListFormCard
export const buildMasterListShowingLabel = buildCommonListShowingLabel

export function MasterListShowLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">{children}</div>
}

export function MasterListUpsertLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}
