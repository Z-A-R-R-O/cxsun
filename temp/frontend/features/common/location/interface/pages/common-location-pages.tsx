"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  buildCommonLocationColumnOptions,
  filterCommonLocation,
  formatCommonLocationDate,
  listCommonLocation,
} from "../../application/common-location-service";
import {
  commonLocationDefinitions,
  commonLocationStatusFilters,
  defaultCommonLocationColumnVisibility,
  type CommonLocationColumnId,
  type CommonLocationModuleKey,
  type CommonLocationRecord,
  type CommonLocationStatusFilter,
} from "../../domain/common-location";

export function CommonLocationListPage({
  moduleKey,
}: {
  readonly moduleKey: CommonLocationModuleKey;
}) {
  const definition = commonLocationDefinitions[moduleKey];
  const { show: showGlobalLoader } = useGlobalLoader();
  const [records, setRecords] = useState<readonly CommonLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommonLocationStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<CommonLocationColumnId, boolean>>({
    ...defaultCommonLocationColumnVisibility,
    references: definition.columns.includes("references"),
  });

  const filteredRecords = useMemo(
    () => filterCommonLocation({ records, searchValue, statusFilter }),
    [records, searchValue, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const pageRecords = filteredRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      buildCommonLocationColumnOptions({
        enabledColumns: definition.columns,
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((current) => ({ ...current, [columnId]: checked })),
      }),
    [definition.columns, visibleColumns],
  );

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    setIsLoading(true);

    listCommonLocation(definition, { signal: controller.signal })
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRecords([]);
        setLoadError(error instanceof Error ? error.message : "Could not load common records.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          hideGlobalLoader();
        }
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [definition, showGlobalLoader]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <MasterListPageFrame
      description={definition.description}
      technicalName={`page.common.${moduleKey}`}
      title={definition.title}
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={commonLocationStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as CommonLocationStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        searchPlaceholder={`Search ${definition.title.toLowerCase()}, code, status, or id`}
        searchValue={searchValue}
      />

      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}

      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.code && definition.columns.includes("code") ? (
                  <ListHeader>Code</ListHeader>
                ) : null}
                {visibleColumns.name && definition.columns.includes("name") ? (
                  <ListHeader>Name</ListHeader>
                ) : null}
                {visibleColumns.references && definition.columns.includes("references") ? (
                  <ListHeader>References</ListHeader>
                ) : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.code && definition.columns.includes("code") ? (
                    <td className="px-4 py-2.5 font-mono text-xs">{record.code}</td>
                  ) : null}
                  {visibleColumns.name && definition.columns.includes("name") ? (
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground">
                        {record.name ?? record.areaName ?? record.id}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{record.id}</div>
                    </td>
                  ) : null}
                  {visibleColumns.references && definition.columns.includes("references") ? (
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatReferences(record)}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <StatusBadge isActive={record.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCommonLocationDate(record.updatedAt)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRecords.length === 0 && !isLoading ? (
          <MasterListEmptyState>No {definition.title.toLowerCase()} found.</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>

      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredRecords.length,
        })}
        singularLabel={definition.title.toLowerCase()}
        totalCount={filteredRecords.length}
        totalPages={totalPages}
        onPageChange={(nextPage) => setCurrentPage(nextPage)}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue);
          setCurrentPage(1);
        }}
      />
    </MasterListPageFrame>
  );
}

function ListHeader({ children }: { readonly children: string }) {
  return (
    <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
      {children}
    </th>
  );
}

function StatusBadge({ isActive }: { readonly isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
          : "rounded-full border-border/80 text-muted-foreground"
      }
    >
      {isActive ? "active" : "inactive"}
    </Badge>
  );
}

function formatReferences(record: CommonLocationRecord) {
  return (
    [record.countryName, record.stateName, record.districtName, record.cityName]
      .filter(Boolean)
      .join(" / ") || "-"
  );
}
