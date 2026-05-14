"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
  buildIndustryColumnOptions,
  filterIndustries,
  formatIndustryDate,
  getIndustry,
  listIndustries,
  softDeleteIndustry,
  upsertIndustry,
} from "../../application/industry-service";
import {
  defaultIndustryColumnVisibility,
  industryStatusFilters,
  type IndustryColumnId,
  type IndustryRecord,
  type IndustryStatusFilter,
  type IndustryUpsertInput,
} from "../../domain/industry";

const industrySchema = z.object({
  code: z.string().trim().min(2, "Enter industry code"),
  name: z.string().trim().min(2, "Enter industry name"),
  isActive: z.boolean(),
});

export function IndustryListPage() {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [industries, setIndustries] = useState<readonly IndustryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<IndustryStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<IndustryColumnId, boolean>>(
    defaultIndustryColumnVisibility,
  );

  const filteredIndustries = useMemo(
    () =>
      filterIndustries({
        industries,
        searchValue,
        statusFilter,
      }),
    [industries, searchValue, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredIndustries.length / rowsPerPage));
  const pageIndustries = filteredIndustries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      buildIndustryColumnOptions({
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

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    listIndustries({ signal: controller.signal })
      .then((records) => {
        setIndustries(records);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setIndustries([]);
        setLoadError(getErrorMessage(error));
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

  async function deleteIndustry(industry: IndustryRecord) {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteIndustry(industry.id);
      setIndustries((currentIndustries) =>
        currentIndustries.filter((item) => item.id !== industry.id),
      );
      toast.success("Industry deleted", {
        description: `${industry.name} was soft deleted.`,
      });
    } catch (error) {
      toast.error("Could not delete industry", {
        description: getErrorMessage(error),
      });
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/industry/new">
            <Plus className="size-4" />
            New Industry
          </Link>
        </Button>
      }
      description="Create and review software type industry records."
      technicalName="page.organisation.industries"
      title="Industries"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={industryStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as IndustryStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search industry, code, status, or id"
        searchValue={searchValue}
      />

      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}

      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <th className="w-16 border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  #
                </th>
                {visibleColumns.code ? (
                  <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                    Code
                  </th>
                ) : null}
                {visibleColumns.name ? (
                  <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                    Industry
                  </th>
                ) : null}
                {visibleColumns.status ? (
                  <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                    Status
                  </th>
                ) : null}
                {visibleColumns.updated ? (
                  <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                    Updated
                  </th>
                ) : null}
                <th className="w-24 border-b border-border/70 px-4 py-2.5 text-right font-medium text-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageIndustries.map((industry, index) => (
                <tr
                  key={industry.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.code ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {industry.code}
                    </td>
                  ) : null}
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => {
                          showGlobalLoader();
                          router.push(`/desk/industry/${industry.id}`);
                        }}
                      >
                        {industry.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <IndustryStatusBadge isActive={industry.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatIndustryDate(industry.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`${industry.name} actions`}
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-full border border-transparent hover:border-border/80 hover:bg-background"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-2xl p-1">
                        <DropdownMenuItem asChild>
                          <Link href={`/desk/industry/${industry.id}`} className="gap-2.5">
                            <Eye className="size-4" />
                            View industry
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/desk/industry/${industry.id}/edit?returnTo=list`}
                            className="gap-2.5"
                          >
                            <Pencil className="size-4" />
                            Edit industry
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2.5 text-destructive focus:text-destructive"
                          onSelect={() => deleteIndustry(industry)}
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
        {pageIndustries.length === 0 && !isLoading ? (
          <MasterListEmptyState>No industries found.</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>

      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredIndustries.length,
        })}
        singularLabel="industries"
        totalCount={filteredIndustries.length}
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

export function IndustryShowPage({ industryId }: { readonly industryId: number }) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [industry, setIndustry] = useState<IndustryRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoading(true);
    setIndustry(null);

    getIndustry(industryId, { signal: controller.signal })
      .then((record) => setIndustry(record))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setIndustry(null);
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
  }, [industryId, showGlobalLoader]);

  if (!industry) {
    if (isLoading) {
      return (
        <MasterListPageFrame
          description=""
          technicalName="page.industry.show.loading"
          title="Industry"
        >
          {null}
        </MasterListPageFrame>
      );
    }

    return (
      <MasterListPageFrame
        description="The requested industry record was not found."
        technicalName="page.industry.show.missing"
        title="Industry not found"
      >
        <MasterListShowCard title="Details">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Return to the industry list.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/desk/industry">Back to industries</Link>
            </Button>
          </div>
        </MasterListShowCard>
      </MasterListPageFrame>
    );
  }

  const currentIndustry = industry;

  async function handleSoftDelete() {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteIndustry(currentIndustry.id);
      toast.success("Industry deleted", {
        description: `${currentIndustry.name} was soft deleted.`,
      });
      router.push("/desk/industry");
    } catch (error) {
      hideGlobalLoader();
      toast.error("Could not delete industry", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/industry">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/industry/${currentIndustry.id}/edit?returnTo=show`}>
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
      description={currentIndustry.name}
      technicalName="page.industry.show"
      title={currentIndustry.name}
    >
      <MasterListShowLayout
        cards={[
          <MasterListShowCard key="detail" title="Details" className="lg:col-span-2">
            <IndustryDetailsTable industry={currentIndustry} />
          </MasterListShowCard>,
        ]}
      />
    </MasterListPageFrame>
  );
}

export function IndustryUpsertPage({
  industryId,
  returnTo = "show",
}: {
  readonly industryId?: number;
  readonly returnTo?: "list" | "show";
}) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const isEdit = Boolean(industryId);
  const [existingIndustry, setExistingIndustry] = useState<IndustryRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(!isEdit);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      name: existingIndustry?.name ?? "",
      code: existingIndustry?.code ?? "",
      isActive: existingIndustry?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      const parsedValue = industrySchema.safeParse(value);

      if (!parsedValue.success) {
        setMessage("Resolve validation errors before saving.");
        return;
      }

      const hideGlobalLoader = showGlobalLoader();

      try {
        const industry = await upsertIndustry(parsedValue.data as IndustryUpsertInput, industryId);
        setMessage(null);
        toast.success(isEdit ? "Industry updated" : "Industry created", {
          description: `${industry.name} was saved.`,
        });
        router.push(
          isEdit && returnTo === "list" ? "/desk/industry" : `/desk/industry/${industry.id}`,
        );
      } catch (error) {
        hideGlobalLoader();
        const errorMessage = getErrorMessage(error);
        setMessage(errorMessage);
        toast.error(isEdit ? "Could not update industry" : "Could not create industry", {
          description: errorMessage,
        });
      }
    },
  });

  useEffect(() => {
    if (!industryId) {
      setExistingIndustry(null);
      setIsLoaded(true);
      return;
    }

    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoaded(false);
    setExistingIndustry(null);

    getIndustry(industryId, { signal: controller.signal })
      .then((record) => {
        setExistingIndustry(record);

        if (record) {
          form.setFieldValue("name", record.name);
          form.setFieldValue("code", record.code);
          form.setFieldValue("isActive", record.isActive);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setExistingIndustry(null);
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
  }, [form, industryId, showGlobalLoader]);

  if (isEdit && !isLoaded) {
    return (
      <MasterListPageFrame
        description=""
        technicalName="page.industry.upsert.loading"
        title="Industry"
      >
        {null}
      </MasterListPageFrame>
    );
  }

  if (isEdit && !existingIndustry) {
    return (
      <MasterListPageFrame
        description="The requested industry record was not found."
        technicalName="page.industry.upsert.missing"
        title="Industry not found"
      >
        <MasterListUpsertCard title="Industry setup">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Return to the industry list.</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/desk/industry">Back to industries</Link>
            </Button>
          </div>
        </MasterListUpsertCard>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={getIndustryCancelPath(industryId, isEdit, returnTo)}>
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      description={
        isEdit ? "Update industry code, identity, and active status." : "Create an industry record."
      }
      technicalName="page.industry.upsert"
      title={isEdit ? "Edit industry" : "New industry"}
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
            <form.Field
              name="code"
              validators={{
                onChange: ({ value }) => {
                  const result = industrySchema.shape.code.safeParse(value);
                  return result.success ? undefined : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <FieldShell error={field.state.meta.errors[0]} label="Industry code">
                  <Input
                    name={field.name}
                    value={field.state.value}
                    placeholder="GARMENTS"
                    className="h-11 rounded-xl font-mono uppercase"
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(normalizeIndustryCodeInput(event.target.value))
                    }
                  />
                </FieldShell>
              )}
            </form.Field>
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const result = industrySchema.shape.name.safeParse(value);
                  return result.success ? undefined : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <FieldShell error={field.state.meta.errors[0]} label="Industry name">
                  <Input
                    name={field.name}
                    value={field.state.value}
                    placeholder="Garments"
                    className="h-11 rounded-xl"
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value.trimStart())}
                  />
                </FieldShell>
              )}
            </form.Field>
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
                      Active industries can be selected in organisation workflows.
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
                {isEdit ? "Update industry" : "Create industry"}
              </Button>
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={getIndustryCancelPath(industryId, isEdit, returnTo)}>
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

function IndustryStatusBadge({ isActive }: { readonly isActive: boolean }) {
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

function IndustryDetailsTable({ industry }: { readonly industry: IndustryRecord }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          <IndustryDetailsRow label="ID" value={String(industry.id)} />
          <IndustryDetailsRow label="Code" value={industry.code} />
          <IndustryDetailsRow label="Name" value={industry.name} />
          <IndustryDetailsRow
            label="Active"
            value={<IndustryStatusBadge isActive={industry.isActive} />}
          />
          <IndustryDetailsRow label="Created at" value={formatIndustryDate(industry.createdAt)} />
          <IndustryDetailsRow label="Updated at" value={formatIndustryDate(industry.updatedAt)} />
          <IndustryDetailsRow label="Deleted at" value={formatIndustryDate(industry.deletedAt)} />
        </tbody>
      </table>
    </div>
  );
}

function IndustryDetailsRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <th className="w-52 bg-muted/35 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
        {label}
      </th>
      <td className="px-4 py-3 text-foreground">{value}</td>
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

function getIndustryCancelPath(
  industryId: number | undefined,
  isEdit: boolean,
  returnTo: "list" | "show",
) {
  if (!isEdit || !industryId || returnTo === "list") {
    return "/desk/industry";
  }

  return `/desk/industry/${industryId}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function normalizeIndustryCodeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+/, "");
}
