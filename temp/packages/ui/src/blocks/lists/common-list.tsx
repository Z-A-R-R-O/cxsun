"use client";

import type { ReactNode } from "react";
import {
  ListDetailCard,
  ListEmptyState,
  ListPageFrame,
  ListPaginationCard,
  ListTableCard,
  ListToolbarCard,
  buildShowingLabel,
  type ListColumnOption,
  type ListFilterOption,
  type ListPageFrameProps,
} from "./shared";

export type CommonListColumnOption = ListColumnOption;
export type CommonListFilterOption = ListFilterOption;
export type CommonListPageFrameProps = ListPageFrameProps;

export const CommonListPageFrame = ListPageFrame;
export const CommonListToolbarCard = ListToolbarCard;
export const CommonListTableCard = ListTableCard;
export const CommonListPaginationCard = ListPaginationCard;
export const CommonListEmptyState = ListEmptyState;
export const CommonListPopupFormCard = ListDetailCard;
export const buildCommonListShowingLabel = buildShowingLabel;

export function CommonListPopupLayout({ children }: { readonly children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}
