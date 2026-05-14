"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  Separator,
  Switch,
  buildMasterListShowingLabel,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  buildTenantColumnOptions,
  createTenantSlug,
  filterTenants,
  formatTenantDate,
  getTenant,
  listTenants,
  softDeleteTenant,
  upsertTenant,
} from "../../application/tenant-service";
import {
  defaultTenantColumnVisibility,
  tenantStatusFilters,
  type TenantColumnId,
  type TenantRecord,
  type TenantStatusFilter,
  type TenantUpsertInput,
} from "../../domain/tenant";

const tenantSchema = z.object({
  name: z.string().min(2, "Enter tenant name"),
  slug: z
    .string()
    .min(2, "Enter tenant slug")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Use lowercase letters, numbers, and hyphens",
    }),
  isActive: z.boolean(),
});

type TenantSortKey = Exclude<TenantColumnId, "status"> | "status";
type TenantSortDirection = "asc" | "desc";
type TenantEditReturnTo = "list" | "show";

export function TenantListPage() {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [tenants, setTenants] = useState<readonly TenantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortState, setSortState] = useState<{
    readonly key: TenantSortKey;
    readonly direction: TenantSortDirection;
  }>({
    key: "name",
    direction: "asc",
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<TenantColumnId, boolean>>(
    defaultTenantColumnVisibility,
  );

  const filteredTenants = useMemo(() => {
    const matchingTenants = filterTenants({
      tenants,
      searchValue,
      statusFilter,
    });

    return [...matchingTenants].sort((left, right) =>
      compareTenantRecords(left, right, sortState.key, sortState.direction),
    );
  }, [searchValue, sortState.direction, sortState.key, statusFilter, tenants]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / rowsPerPage));

  useEffect(() => {
    window.localStorage.removeItem("cxnext.tenants");

    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    listTenants({ signal: controller.signal })
      .then((records) => {
        setTenants(records);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setTenants([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load tenants.");
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
  }, [showGlobalLoader]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageTenants = filteredTenants.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const columnOptions = useMemo(
    () =>
      buildTenantColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) => {
          setVisibleColumns((currentValue) => ({
            ...currentValue,
            [columnId]: checked,
          }));
        },
      }),
    [visibleColumns],
  );

  async function deleteTenant(tenant: TenantRecord) {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteTenant(tenant.id);
      setTenants((currentTenants) => currentTenants.filter((item) => item.id !== tenant.id));
      toast.success("Tenant deleted", {
        description: `${tenant.name} was soft deleted.`,
      });
    } catch (error) {
      toast.error("Could not delete tenant", {
        description: getErrorMessage(error),
      });
    } finally {
      hideGlobalLoader();
    }
  }

  function showAllColumns() {
    setVisibleColumns(defaultTenantColumnVisibility);
  }

  function toggleSort(nextKey: TenantSortKey) {
    setSortState((currentValue) => {
      if (currentValue.key === nextKey) {
        return {
          key: nextKey,
          direction: currentValue.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key: nextKey,
        direction: "asc",
      };
    });
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/tenant/new">
            <Plus className="size-4" />
            New Tenant
          </Link>
        </Button>
      }
      description="Create and review organisation tenant records."
      technicalName="page.tenant.list"
      title="Tenants"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={tenantStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as TenantStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={showAllColumns}
        searchPlaceholder="Search tenant, slug, status, or id"
        searchValue={searchValue}
      />

      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}

      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <th className="w-16 border-b border-border/70 px-4 py-2.5 text-left text-sm font-medium text-foreground">
                  #
                </th>
                {visibleColumns.name ? (
                  <TableHeaderCell
                    label="Tenant"
                    sortDirection={sortState.key === "name" ? sortState.direction : null}
                    onSort={() => toggleSort("name")}
                  />
                ) : null}
                {visibleColumns.slug ? (
                  <TableHeaderCell
                    label="Slug"
                    sortDirection={sortState.key === "slug" ? sortState.direction : null}
                    onSort={() => toggleSort("slug")}
                  />
                ) : null}
                {visibleColumns.status ? (
                  <TableHeaderCell
                    label="Status"
                    sortDirection={sortState.key === "status" ? sortState.direction : null}
                    onSort={() => toggleSort("status")}
                  />
                ) : null}
                {visibleColumns.updated ? (
                  <TableHeaderCell
                    label="Updated"
                    sortDirection={sortState.key === "updated" ? sortState.direction : null}
                    onSort={() => toggleSort("updated")}
                  />
                ) : null}
                <th className="w-24 border-b border-border/70 px-4 py-2.5 text-right text-sm font-medium text-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageTenants.map((tenant, index) => (
                <tr
                  key={tenant.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => {
                          showGlobalLoader();
                          router.push(`/desk/tenant/${tenant.id}`);
                        }}
                      >
                        {tenant.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.slug ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {tenant.slug}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <TenantStatusBadge isActive={tenant.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatTenantDate(tenant.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full border border-transparent hover:border-border/80 hover:bg-background data-[state=open]:border-border/80 data-[state=open]:bg-muted/70"
                          aria-label="Tenant actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-2xl p-1">
                        <DropdownMenuItem asChild>
                          <Link href={`/desk/tenant/${tenant.id}`} className="gap-2.5">
                            <Eye className="size-4" />
                            View tenant
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/desk/tenant/${tenant.id}/edit?returnTo=list`}
                            className="gap-2.5"
                          >
                            <Pencil className="size-4" />
                            Edit tenant
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2.5 text-destructive focus:text-destructive"
                          onSelect={() => deleteTenant(tenant)}
                        >
                          <Trash2 className="size-4" />
                          Soft delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageTenants.length === 0 ? (
          <MasterListEmptyState>
            {isLoading ? "Loading tenants from database." : "No tenants found."}
          </MasterListEmptyState>
        ) : null}
      </MasterListTableCard>

      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredTenants.length,
        })}
        singularLabel="tenants"
        totalCount={filteredTenants.length}
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

export function TenantShowPage({ tenantId }: { readonly tenantId: number }) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoading(true);
    setTenant(null);

    getTenant(tenantId, { signal: controller.signal })
      .then((record) => {
        setTenant(record);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setTenant(null);
        }
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
  }, [showGlobalLoader, tenantId]);

  if (!tenant) {
    return (
      <MasterListPageFrame
        description={
          isLoading
            ? "Loading tenant record from the live database."
            : "The requested tenant record was not found."
        }
        technicalName={isLoading ? "page.tenant.show.loading" : "page.tenant.show.missing"}
        title={isLoading ? "Loading tenant" : "Tenant not found"}
      >
        <MasterListShowCard title="Details">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading tenant record." : "Return to the tenant list."}
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/desk/tenant">Back to tenants</Link>
            </Button>
          </div>
        </MasterListShowCard>
      </MasterListPageFrame>
    );
  }

  const currentTenant = tenant;

  async function handleSoftDelete() {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteTenant(currentTenant.id);
      setTenant(null);
      toast.success("Tenant deleted", {
        description: `${currentTenant.name} was soft deleted.`,
      });
      router.push("/desk/tenant");
    } catch (error) {
      hideGlobalLoader();
      toast.error("Could not delete tenant", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/tenant">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/tenant/${currentTenant.id}/edit?returnTo=show`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleSoftDelete}>
            <Trash2 className="size-4" />
            Soft delete
          </Button>
        </div>
      }
      description={currentTenant.slug}
      technicalName="page.tenant.show"
      title={currentTenant.name}
    >
      <MasterListShowLayout
        cards={[
          <MasterListShowCard key="detail" title="Details" className="lg:col-span-2">
            <TenantDetailsTable tenant={currentTenant} />
          </MasterListShowCard>,
        ]}
      />
    </MasterListPageFrame>
  );
}

export function TenantUpsertPage({
  returnTo = "show",
  tenantId,
}: {
  readonly returnTo?: TenantEditReturnTo;
  readonly tenantId?: number;
}) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const isEdit = Boolean(tenantId);
  const returnToQuery = isEdit ? `?returnTo=${returnTo}` : "";
  const [existingTenant, setExistingTenant] = useState<TenantRecord | null>(null);
  const [tenantNavigation, setTenantNavigation] = useState<{
    readonly previousId: number | null;
    readonly nextId: number | null;
  }>({
    previousId: null,
    nextId: null,
  });
  const [isLoaded, setIsLoaded] = useState(!isEdit);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      name: existingTenant?.name ?? "",
      slug: existingTenant?.slug ?? "",
      isActive: existingTenant?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      const parsedValue = tenantSchema.safeParse(value);
      if (!parsedValue.success) {
        setMessage("Resolve validation errors before saving.");
        return;
      }

      const hideGlobalLoader = showGlobalLoader();

      try {
        const tenant = await upsertTenant(parsedValue.data as TenantUpsertInput, tenantId);
        setMessage(null);
        toast.success(isEdit ? "Tenant updated" : "Tenant created", {
          description: `${tenant.name} was saved.`,
        });
        router.push(getTenantUpsertReturnPath(tenant.id, isEdit, returnTo));
      } catch (error) {
        hideGlobalLoader();
        const errorMessage = getErrorMessage(error);
        setMessage(errorMessage);
        toast.error(isEdit ? "Could not update tenant" : "Could not create tenant", {
          description: errorMessage,
        });
      }
    },
  });

  useEffect(() => {
    if (!tenantId) {
      setExistingTenant(null);
      setTenantNavigation({
        previousId: null,
        nextId: null,
      });
      setIsLoaded(true);
      return;
    }

    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoaded(false);
    setExistingTenant(null);

    Promise.all([
      getTenant(tenantId, { signal: controller.signal }),
      listTenants({ signal: controller.signal }),
    ])
      .then(([record, records]) => {
        setExistingTenant(record);
        setTenantNavigation(getTenantNavigation(records, tenantId));

        if (record) {
          form.setFieldValue("name", record.name);
          form.setFieldValue("slug", record.slug);
          form.setFieldValue("isActive", record.isActive);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setExistingTenant(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoaded(true);
          hideGlobalLoader();
        }
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [form, showGlobalLoader, tenantId]);

  if (isEdit && !isLoaded) {
    return (
      <MasterListPageFrame
        description="Loading tenant record from the live database."
        technicalName="page.tenant.upsert.loading"
        title="Loading tenant"
      >
        <MasterListUpsertCard title="Tenant setup">
          <p className="text-sm text-muted-foreground">Loading tenant record.</p>
        </MasterListUpsertCard>
      </MasterListPageFrame>
    );
  }

  if (isEdit && !existingTenant) {
    return (
      <MasterListPageFrame
        description="The requested tenant record was not found."
        technicalName="page.tenant.upsert.missing"
        title="Tenant not found"
      >
        <MasterListUpsertCard title="Tenant setup">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Return to the tenant list.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/desk/tenant">
                <ArrowLeft className="size-4" />
                Back to tenants
              </Link>
            </Button>
          </div>
        </MasterListUpsertCard>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!tenantNavigation.previousId}
                onClick={() => {
                  if (tenantNavigation.previousId) {
                    showGlobalLoader();
                    router.push(
                      `/desk/tenant/${tenantNavigation.previousId}/edit${returnToQuery}`,
                    );
                  }
                }}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!tenantNavigation.nextId}
                onClick={() => {
                  if (tenantNavigation.nextId) {
                    showGlobalLoader();
                    router.push(`/desk/tenant/${tenantNavigation.nextId}/edit${returnToQuery}`);
                  }
                }}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </>
          ) : null}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={getTenantCancelPath(tenantId, isEdit, returnTo)}>
              <X className="size-4" />
              Cancel
            </Link>
          </Button>
        </div>
      }
      description={
        isEdit
          ? "Update tenant identity and active status."
          : "Create a tenant record with an auto-numbered integer id."
      }
      technicalName="page.tenant.upsert"
      title={isEdit ? "Edit tenant" : "New tenant"}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result = tenantSchema.shape.name.safeParse(value);
                    return result.success ? undefined : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <FieldShell error={field.state.meta.errors[0]} label="Tenant name">
                    <Input
                      name={field.name}
                      value={field.state.value}
                      placeholder="Acme Inc"
                      className="h-11 rounded-xl"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        field.handleChange(nextName);
                        if (!isEdit) {
                          form.setFieldValue("slug", createTenantSlug(nextName));
                        }
                      }}
                    />
                  </FieldShell>
                )}
              </form.Field>
              <form.Field
                name="slug"
                validators={{
                  onChange: ({ value }) => {
                    const result = tenantSchema.shape.slug.safeParse(value);
                    return result.success ? undefined : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <FieldShell error={field.state.meta.errors[0]} label="Slug">
                    <Input
                      name={field.name}
                      value={field.state.value}
                      placeholder="acme-inc"
                      className="h-11 rounded-xl"
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(createTenantSlug(event.target.value))}
                    />
                  </FieldShell>
                )}
              </form.Field>
            </div>
            <form.Field name="isActive">
              {(field) => (
                <label
                  className={
                    field.state.value
                      ? "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3"
                  }
                >
                  <span>
                    <span className="block text-sm font-medium">Active</span>
                    <span className="block text-xs text-muted-foreground dark:text-emerald-200/80">
                      Active tenants can be selected in organisation workflows.
                    </span>
                  </span>
                  <Switch
                    checked={field.state.value}
                    aria-label="Active"
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                </label>
              )}
            </form.Field>
            {message ? (
              <p className="text-sm font-medium text-muted-foreground">{message}</p>
            ) : null}
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="rounded-xl">
                <Save className="size-4" />
                {isEdit ? "Update tenant" : "Create tenant"}
              </Button>
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={getTenantCancelPath(tenantId, isEdit, returnTo)}>
                  <X className="size-4" />
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

function TableHeaderCell({
  label,
  onSort,
  sortDirection,
}: {
  readonly label: string;
  readonly onSort: () => void;
  readonly sortDirection: TenantSortDirection | null;
}) {
  return (
    <th className="border-b border-border/70 px-4 py-2.5 text-left text-sm font-medium text-foreground">
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <button
          type="button"
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Sort ${label}`}
          onClick={onSort}
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="size-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="size-4" />
          ) : (
            <ArrowUpDown className="size-4" />
          )}
        </button>
      </div>
    </th>
  );
}

function compareTenantRecords(
  left: TenantRecord,
  right: TenantRecord,
  key: TenantSortKey,
  direction: TenantSortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (key === "updated") {
    return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * multiplier;
  }

  if (key === "status") {
    return String(left.isActive).localeCompare(String(right.isActive)) * multiplier;
  }

  return left[key].localeCompare(right[key]) * multiplier;
}

function getTenantNavigation(tenants: readonly TenantRecord[], tenantId: number) {
  const orderedTenants = [...tenants].sort((left, right) => left.id - right.id);
  const currentIndex = orderedTenants.findIndex((tenant) => tenant.id === tenantId);

  if (currentIndex === -1) {
    return {
      previousId: null,
      nextId: null,
    };
  }

  return {
    previousId: orderedTenants[currentIndex - 1]?.id ?? null,
    nextId: orderedTenants[currentIndex + 1]?.id ?? null,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function getTenantUpsertReturnPath(
  tenantId: number,
  isEdit: boolean,
  returnTo: TenantEditReturnTo,
) {
  if (isEdit && returnTo === "list") {
    return "/desk/tenant";
  }

  return `/desk/tenant/${tenantId}`;
}

function getTenantCancelPath(
  tenantId: number | undefined,
  isEdit: boolean,
  returnTo: TenantEditReturnTo,
) {
  if (!isEdit || !tenantId || returnTo === "list") {
    return "/desk/tenant";
  }

  return `/desk/tenant/${tenantId}`;
}

function TenantStatusBadge({ isActive }: { readonly isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "rounded-full border-border/80 bg-background text-muted-foreground"
      }
    >
      {isActive ? "active" : "inactive"}
    </Badge>
  );
}

function TenantDetailsTable({ tenant }: { readonly tenant: TenantRecord }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          <TenantDetailsRow label="ID" value={String(tenant.id)} />
          <TenantDetailsRow label="Name" value={tenant.name} />
          <TenantDetailsRow label="Slug" value={tenant.slug} monospace />
          <TenantDetailsRow label="Active" value={<TenantStatusBadge isActive={tenant.isActive} />} />
          <TenantDetailsRow label="Created at" value={formatTenantDate(tenant.createdAt)} />
          <TenantDetailsRow label="Updated at" value={formatTenantDate(tenant.updatedAt)} />
          <TenantDetailsRow label="Deleted at" value={formatTenantDate(tenant.deletedAt)} />
        </tbody>
      </table>
    </div>
  );
}

function TenantDetailsRow({
  label,
  monospace = false,
  value,
}: {
  readonly label: string;
  readonly monospace?: boolean;
  readonly value: ReactNode;
}) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <th className="w-52 bg-muted/35 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
        {label}
      </th>
      <td
        className={
          monospace ? "px-4 py-3 font-mono text-sm text-foreground" : "px-4 py-3 text-foreground"
        }
      >
        {value}
      </td>
    </tr>
  );
}

function FieldShell({
  children,
  error,
  label,
}: {
  readonly children: ReactNode;
  readonly error: unknown;
  readonly label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{String(error)}</p> : null}
    </div>
  );
}
