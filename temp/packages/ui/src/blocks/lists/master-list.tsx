"use client";

import type { ReactNode } from "react";
import {
  ListDetailCard,
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

export type MasterListColumnOption = ListColumnOption;
export type MasterListFilterOption = ListFilterOption;
export type MasterListPageFrameProps = ListPageFrameProps;

export const MasterListPageFrame = ListPageFrame;
export const MasterListToolbarCard = ListToolbarCard;
export const MasterListTableCard = ListTableCard;
export const MasterListPaginationCard = ListPaginationCard;
export const MasterListEmptyState = ListEmptyState;
export const MasterListShowCard = ListDetailCard;
export const MasterListUpsertCard = ListFormCard;
export const buildMasterListShowingLabel = buildShowingLabel;

export function MasterListShowLayout({ cards }: { readonly cards: readonly ReactNode[] }) {
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">{cards}</div>;
}

export function MasterListUpsertLayout({ children }: { readonly children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}
