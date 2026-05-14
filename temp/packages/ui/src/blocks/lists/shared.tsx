"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Columns3, Filter, Search } from "lucide-react";
import { Button } from "../../components/button";
import { Card, CardContent } from "../../components/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Input } from "../../components/input";
import { cn } from "../../lib";

export interface ListFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface ListColumnOption {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  onCheckedChange(checked: boolean): void;
}

export interface ListPageFrameProps {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly technicalName?: string;
  readonly className?: string;
}

export interface ListToolbarCardProps {
  readonly searchValue: string;
  onSearchValueChange(nextValue: string): void;
  readonly searchPlaceholder: string;
  readonly filterValue?: string;
  readonly filterOptions?: readonly ListFilterOption[];
  onFilterValueChange?(nextValue: string): void;
  readonly columns?: readonly ListColumnOption[];
  onShowAllColumns?(): void;
  readonly className?: string;
}

export interface ListPaginationCardProps {
  readonly singularLabel: string;
  readonly totalCount: number;
  readonly showingLabel: string;
  readonly page: number;
  readonly totalPages: number;
  readonly rowsPerPage: number;
  readonly rowsPerPageOptions?: readonly number[];
  onRowsPerPageChange?(nextValue: number): void;
  onPreviousPage?(): void;
  onNextPage?(): void;
  onPageChange?(nextPage: number): void;
  readonly className?: string;
}

export function ListPageFrame({
  action,
  children,
  className,
  description,
  technicalName,
  title,
}: ListPageFrameProps) {
  return (
    <section
      data-technical-name={technicalName}
      className={cn("mx-auto w-[94%] space-y-4 py-4 sm:w-[92%] lg:w-[90%] lg:py-6", className)}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-medium tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ListToolbarCard({
  className,
  columns,
  filterOptions,
  filterValue,
  onFilterValueChange,
  onSearchValueChange,
  onShowAllColumns,
  searchPlaceholder,
  searchValue,
}: ListToolbarCardProps) {
  return (
    <Card className={cn("rounded-2xl border-border/70 bg-card/95 shadow-sm", className)}>
      <CardContent className="flex flex-col gap-2 p-2.5 sm:p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-2xl flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 rounded-xl border-border/80 bg-background/95 pl-10 text-sm shadow-none"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
          {filterOptions && filterOptions.length > 0 && filterValue && onFilterValueChange ? (
            <ListFilterMenu
              filterOptions={filterOptions}
              filterValue={filterValue}
              onFilterValueChange={onFilterValueChange}
            />
          ) : null}
          {columns && columns.length > 0 ? (
            <ListColumnMenu columns={columns} onShowAllColumns={onShowAllColumns} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ListFilterMenu({
  filterOptions,
  filterValue,
  onFilterValueChange,
}: {
  readonly filterOptions: readonly ListFilterOption[];
  readonly filterValue: string;
  onFilterValueChange(nextValue: string): void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-xl border-border/80 bg-background/95 px-3.5 text-sm shadow-none"
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-[1rem] font-medium">
            Filter options
          </DropdownMenuLabel>
          <button
            type="button"
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onFilterValueChange(filterOptions[0]?.id ?? filterValue)}
          >
            Clear
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {filterOptions.map((option) => {
            const selected = filterValue === option.id;

            return (
              <DropdownMenuItem
                key={option.id}
                className="gap-3 rounded-xl px-3 py-2.5"
                onSelect={() => onFilterValueChange(option.id)}
              >
                <span className="flex size-4 items-center justify-center">
                  {selected ? <Check className="size-4" /> : null}
                </span>
                <span>{option.label}</span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ListColumnMenu({
  columns,
  onShowAllColumns,
}: {
  readonly columns: readonly ListColumnOption[];
  readonly onShowAllColumns?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-xl border-border/80 bg-background/95 px-3.5 text-sm shadow-none"
        >
          <Columns3 className="size-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-medium">Visible columns</DropdownMenuLabel>
          {onShowAllColumns ? (
            <button
              type="button"
              className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={onShowAllColumns}
            >
              Show all
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.checked}
              disabled={column.disabled}
              className="rounded-xl py-2.5 pl-9 pr-3"
              onCheckedChange={(checked) => column.onCheckedChange(Boolean(checked))}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ListTableCard({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Card
      className={cn("overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm", className)}
    >
      {children}
    </Card>
  );
}

export function ListPaginationCard({
  className,
  onPageChange,
  onNextPage,
  onPreviousPage,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions = [10, 20, 50],
  showingLabel,
  singularLabel,
  totalCount,
  totalPages,
}: ListPaginationCardProps) {
  const pageItems = buildPaginationItems(page, totalPages);

  return (
    <Card className={cn("rounded-2xl border-border/70 bg-card/95 shadow-sm", className)}>
      <CardContent className="flex flex-col gap-2.5 px-4 py-2.5 text-sm text-muted-foreground sm:px-4.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Total {singularLabel}:{" "}
            <span className="font-semibold text-foreground">{totalCount}</span>
          </span>
          <label className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              className="h-8.5 min-w-18 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground outline-none"
              value={rowsPerPage}
              onChange={(event) => onRowsPerPageChange?.(Number.parseInt(event.target.value, 10))}
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <span>{showingLabel}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 rounded-xl px-2 text-muted-foreground"
              disabled={page <= 1}
              onClick={onPreviousPage}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8.5 min-w-8.5 rounded-xl px-0",
                      item === page
                        ? "border-black bg-black text-white hover:bg-black/95 hover:text-white"
                        : "text-muted-foreground",
                    )}
                    onClick={() => onPageChange?.(item)}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 rounded-xl px-2 text-muted-foreground"
              disabled={page >= totalPages}
              onClick={onNextPage}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ListEmptyState({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("px-6 py-14 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function ListDetailCard({
  children,
  className,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly title?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-border/70 bg-card/95 shadow-sm", className)}>
      {title || description ? (
        <div className="border-b border-border/70 px-5 py-4">
          {title ? <h2 className="text-base font-medium text-foreground">{title}</h2> : null}
          {description ? (
            <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function ListFormCard({
  children,
  className,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly title?: string;
}) {
  return (
    <ListDetailCard className={className} description={description} title={title}>
      {children}
    </ListDetailCard>
  );
}

export function buildShowingLabel({
  page,
  pageSize,
  totalCount,
}: {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}) {
  if (totalCount === 0) {
    return "Showing 0 to 0 of 0";
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(totalCount, page * pageSize);

  return `Showing ${from} to ${to} of ${totalCount}`;
}

export function createSearchHandler(
  callback: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return (event) => callback(event.target.value);
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}
