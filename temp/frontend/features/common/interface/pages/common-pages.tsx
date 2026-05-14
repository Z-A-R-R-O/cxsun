"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Edit, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import {
  Button,
  CommonListEmptyState,
  CommonListPageFrame,
  CommonListPaginationCard,
  CommonListPopupFormCard,
  CommonListPopupLayout,
  CommonListTableCard,
  CommonListToolbarCard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  buildCommonListShowingLabel,
  cn,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  createCommonRecord,
  dropCommonRecord,
  fallbackCommonModules,
  forceDeleteCommonRecord,
  formatCommonDate,
  updateCommonRecord,
  type CommonColumnDefinition,
  type CommonModuleDefinition,
  type CommonReferenceLookupMap,
  type CommonRecord,
} from "../../application/common-service";
import {
  StatusBadge,
  buildCommonColumnOptions,
  buildDefaultColumnVisibility,
  buildDraft,
  commonStatusFilters,
  formatValue,
  getModuleDescription,
  loadRecordsAndLookups,
  toCamelCase,
  validateDraft,
} from "./common-page-helpers";

type DialogMode = "create" | "edit";
type CommonStatusFilter = "all" | "active" | "inactive";

export function CommonListPage({ moduleKey }: { readonly moduleKey: string }) {
  const { show: showGlobalLoader } = useGlobalLoader();
  const [modules, setModules] = useState<readonly CommonModuleDefinition[]>([]);
  const [records, setRecords] = useState<readonly CommonRecord[]>([]);
  const [referenceLookups, setReferenceLookups] = useState<CommonReferenceLookupMap>({});
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommonStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    readonly mode: DialogMode;
    readonly record: CommonRecord | null;
  } | null>(null);
  const definition =
    modules.find((item) => item.key === moduleKey) ??
    fallbackCommonModules.find((item) => item.key === moduleKey) ??
    null;

  const filteredRecords = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !normalized || JSON.stringify(record).toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && record.isActive) ||
        (statusFilter === "inactive" && !record.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [records, searchValue, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const pageRecords = filteredRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      definition
        ? buildCommonColumnOptions({
            definition,
            visibleColumns,
            onToggle: (columnId, checked) =>
              setVisibleColumns((current) => ({ ...current, [columnId]: checked })),
          })
        : [],
    [definition, visibleColumns],
  );

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    setModules(fallbackCommonModules);
    loadRecordsAndLookups(moduleKey, definition, { signal: controller.signal })
      .then(({ records: nextRecords, referenceLookups: nextReferenceLookups }) => {
        setRecords(nextRecords);
        setReferenceLookups(nextReferenceLookups);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRecords([]);
        setReferenceLookups({});
        setLoadError(error instanceof Error ? error.message : "Could not load common module.");
      })
      .finally(() => {
        if (!controller.signal.aborted) hideGlobalLoader();
      });
    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [definition, moduleKey, showGlobalLoader]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!definition) return;
    setVisibleColumns(buildDefaultColumnVisibility(definition));
    setStatusFilter("all");
    setSearchValue("");
    setCurrentPage(1);
  }, [definition]);

  async function reload() {
    if (!definition) return;
    const hideGlobalLoader = showGlobalLoader();
    try {
      const nextData = await loadRecordsAndLookups(moduleKey, definition);
      setRecords(nextData.records);
      setReferenceLookups(nextData.referenceLookups);
    } finally {
      hideGlobalLoader();
    }
  }

  async function handleDrop(record: CommonRecord, force = false) {
    const hideGlobalLoader = showGlobalLoader();
    try {
      if (force) await forceDeleteCommonRecord(moduleKey, record.id);
      else await dropCommonRecord(moduleKey, record.id);
      setMessage(force ? "Record force deleted." : "Record dropped.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      hideGlobalLoader();
    }
  }

  if (!definition && !loadError) {
    return (
      <CommonListPageFrame title="Common" description="" technicalName="page.common.loading">
        {null}
      </CommonListPageFrame>
    );
  }

  return (
    <CommonListPageFrame
      action={
        definition ? (
          <Button
            type="button"
            className="h-11 rounded-xl px-4"
            onClick={() => setDialog({ mode: "create", record: null })}
          >
            <Plus className="size-4" />
            New {definition.label}
          </Button>
        ) : null
      }
      description={
        definition
          ? getModuleDescription(moduleKey, definition.label)
          : "Common module was not found."
      }
      technicalName={`page.common.${moduleKey}`}
      title={definition?.label ?? "Common module"}
    >
      <CommonListToolbarCard
        columns={columnOptions}
        filterOptions={commonStatusFilters}
        filterValue={statusFilter}
        onShowAllColumns={() => {
          if (definition) setVisibleColumns(buildDefaultColumnVisibility(definition));
        }}
        searchPlaceholder="Search any field, id, or status"
        searchValue={searchValue}
        onFilterValueChange={(value) => {
          setStatusFilter(value as CommonStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
      />
      {message ? <p className="text-sm font-medium text-muted-foreground">{message}</p> : null}
      {loadError ? <CommonListEmptyState>{loadError}</CommonListEmptyState> : null}
      {definition ? (
        <CommonListTableCard className="rounded-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead className="bg-muted/55">
                <tr>
                  <Header>#</Header>
                  {definition.columns.map((column) =>
                    visibleColumns[column.key] ? (
                      <Header key={column.key}>{column.label}</Header>
                    ) : null,
                  )}
                  {visibleColumns.status ? <Header>Status</Header> : null}
                  {visibleColumns.updated ? <Header>Updated</Header> : null}
                  <Header className="sticky right-0 z-10 bg-muted/95 text-right">Action</Header>
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
                    {definition.columns.map((column) =>
                      visibleColumns[column.key] ? (
                        <td key={column.key} className="px-4 py-2.5">
                          {formatValue(record[toCamelCase(column.key)], column, referenceLookups)}
                        </td>
                      ) : null,
                    )}
                    {visibleColumns.status ? (
                      <td className="px-4 py-2.5">
                        <StatusBadge active={record.isActive} />
                      </td>
                    ) : null}
                    {visibleColumns.updated ? (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatCommonDate(record.updatedAt)}
                      </td>
                    ) : null}
                    <td className="sticky right-0 bg-card/95 px-4 py-2 text-right shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.55)]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`${record.id} actions`}
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-full"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1">
                          <DropdownMenuItem
                            className="gap-2.5"
                            onSelect={() => setDialog({ mode: "edit", record })}
                          >
                            <Edit className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2.5" onSelect={() => handleDrop(record)}>
                            <Trash2 className="size-4" />
                            Drop
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2.5 text-destructive focus:text-destructive"
                            onSelect={() => handleDrop(record, true)}
                          >
                            <X className="size-4" />
                            Force delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageRecords.length === 0 ? (
            <CommonListEmptyState>No records found.</CommonListEmptyState>
          ) : null}
        </CommonListTableCard>
      ) : null}
      <CommonListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildCommonListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredRecords.length,
        })}
        singularLabel="records"
        totalCount={filteredRecords.length}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
      />
      {definition && dialog ? (
        <CommonUpsertDialog
          definition={definition}
          mode={dialog.mode}
          record={dialog.record}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            const savedAction = dialog.mode === "edit" ? "updated" : "created";
            setDialog(null);
            setMessage(`${definition.label} ${savedAction}.`);
            toast.success(`${definition.label} ${savedAction}`, {
              description: "Changes are ready in the list.",
            });
            await reload();
          }}
        />
      ) : null}
    </CommonListPageFrame>
  );
}

function CommonUpsertDialog({
  definition,
  mode,
  record,
  onClose,
  onSaved,
}: {
  readonly definition: CommonModuleDefinition;
  readonly mode: DialogMode;
  readonly record: CommonRecord | null;
  readonly onClose: () => void;
  readonly onSaved: () => void | Promise<void>;
}) {
  const { show: showGlobalLoader } = useGlobalLoader();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => buildDraft(definition, record));
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const validationError = validateDraft(definition, draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const hideGlobalLoader = showGlobalLoader();
    try {
      if (mode === "edit" && record) await updateCommonRecord(definition.key, record.id, draft);
      else await createCommonRecord(definition.key, draft);
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <CommonListPopupLayout>
        <CommonListPopupFormCard
          title={mode === "edit" ? `Edit ${definition.label}` : `New ${definition.label}`}
          description="Update the fields and save directly from this popup."
        >
          <div className="grid max-h-[72vh] w-[min(920px,calc(100vw-2rem))] gap-4 overflow-y-auto p-1 md:grid-cols-2">
            {definition.columns.map((column) => (
              <EditorField key={column.key} column={column} draft={draft} setDraft={setDraft} />
            ))}
            <label
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3",
                draft.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-border/70 bg-muted/10",
              )}
            >
              <span className="text-sm font-medium">Active</span>
              <input
                type="checkbox"
                className="size-4 cursor-pointer"
                checked={Boolean(draft.isActive)}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
            </label>
          </div>
          {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            <Button type="button" className="rounded-xl" onClick={submit}>
              {mode === "edit" ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CommonListPopupFormCard>
      </CommonListPopupLayout>
    </div>
  );
}

function EditorField({
  column,
  draft,
  setDraft,
}: {
  readonly column: CommonColumnDefinition;
  readonly draft: Record<string, unknown>;
  readonly setDraft: (
    updater: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
}) {
  const key = toCamelCase(column.key);
  if (column.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
        <span className="text-sm font-medium">{column.label}</span>
        <input
          type="checkbox"
          className="size-4 cursor-pointer"
          checked={Boolean(draft[key])}
          onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.checked }))}
        />
      </label>
    );
  }
  return (
    <Field label={column.label}>
      <Input
        className="h-11 rounded-xl"
        type={column.type === "number" ? "number" : "text"}
        value={String(draft[key] ?? "")}
        onChange={(event) => {
          const value =
            column.type === "number" ? Number(event.target.value || 0) : event.target.value;
          setDraft((current) => {
            return { ...current, [key]: value };
          });
        }}
      />
    </Field>
  );
}

function Field({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Header({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}
