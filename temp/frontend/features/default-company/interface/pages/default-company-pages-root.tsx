"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Edit, MoreHorizontal } from "lucide-react";
import {
  Button,
  CommonListEmptyState,
  CommonListPageFrame,
  CommonListPopupFormCard,
  CommonListPopupLayout,
  CommonListTableCard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  cn,
  useGlobalLoader,
} from "@cxnext/ui";
import type {
  AccountingYearRecord,
  DefaultCompanyRecord,
  DefaultCompanyUpdateInput,
} from "../../../application-context/domain/application-context";
import {
  listAccountingYears,
  listDefaultCompanies,
  updateDefaultCompany,
} from "../../../application-context/infrastructure/application-context-api";
import { persistStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import { listCompanies } from "../../../company/application/company-service";
import type { CompanyRecord } from "../../../company/domain/company";
import { formatCommonDate } from "../../../common/application/common-service";

export function DefaultCompanyListPage() {
  const { show: showGlobalLoader } = useGlobalLoader();
  const [records, setRecords] = useState<readonly DefaultCompanyRecord[]>([]);
  const [companies, setCompanies] = useState<readonly CompanyRecord[]>([]);
  const [accountingYears, setAccountingYears] = useState<readonly AccountingYearRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    Promise.all([
      listDefaultCompanies({ signal: controller.signal }),
      listCompanies({ signal: controller.signal }),
      listAccountingYears({ signal: controller.signal }),
    ])
      .then(([nextRecords, nextCompanies, nextAccountingYears]) => {
        setRecords(nextRecords);
        setCompanies(nextCompanies);
        setAccountingYears(nextAccountingYears);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRecords([]);
        setLoadError(error instanceof Error ? error.message : "Could not load default company.");
      })
      .finally(() => {
        if (!controller.signal.aborted) hideGlobalLoader();
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [showGlobalLoader]);

  const activeRecord = records[0] ?? null;

  async function reload() {
    const hideGlobalLoader = showGlobalLoader();
    try {
      setRecords(await listDefaultCompanies());
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <CommonListPageFrame
      description="Select the single default company and accounting year used by the application."
      technicalName="page.organisation.default-company"
      title="Default Company"
    >
      {message ? <p className="text-sm font-medium text-muted-foreground">{message}</p> : null}
      {loadError ? <CommonListEmptyState>{loadError}</CommonListEmptyState> : null}
      <CommonListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <Header>#</Header>
                <Header>Tenant</Header>
                <Header>Industry</Header>
                <Header>Company</Header>
                <Header>Accounting Year</Header>
                <Header>Updated</Header>
                <Header className="sticky right-0 z-10 bg-muted/95 text-right">Action</Header>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr
                  key={record.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{record.tenant.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatIndustryLabel(record.industry.code, record.industry.name)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {formatCompanyLabel(record.company.code, record.company.name)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {record.accountingYear.name}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatCommonDate(record.updatedAt)}
                  </td>
                  <td className="sticky right-0 bg-card/95 px-4 py-2 text-right shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.55)]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Default company actions"
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-full"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-2xl p-1">
                        <DropdownMenuItem className="gap-2.5" onSelect={() => setIsEditOpen(true)}>
                          <Edit className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 ? (
          <CommonListEmptyState>No default company configured.</CommonListEmptyState>
        ) : null}
      </CommonListTableCard>
      {isEditOpen ? (
        <DefaultCompanyDialog
          accountingYears={accountingYears}
          companies={companies}
          record={activeRecord}
          onClose={() => setIsEditOpen(false)}
          onSaved={async (record) => {
            persistStoredApplicationContext(record);
            setIsEditOpen(false);
            setMessage("Default company updated.");
            await reload();
          }}
        />
      ) : null}
    </CommonListPageFrame>
  );
}

function formatIndustryLabel(code: string | null | undefined, name: string) {
  return code ? `${code} - ${name}` : name;
}

function formatCompanyLabel(code: string | null | undefined, name: string) {
  return code ? `${code} - ${name}` : name;
}

function DefaultCompanyDialog({
  accountingYears,
  companies,
  record,
  onClose,
  onSaved,
}: {
  readonly accountingYears: readonly AccountingYearRecord[];
  readonly companies: readonly CompanyRecord[];
  readonly record: DefaultCompanyRecord | null;
  readonly onClose: () => void;
  readonly onSaved: (record: DefaultCompanyRecord) => void | Promise<void>;
}) {
  const { show: showGlobalLoader } = useGlobalLoader();
  const [draft, setDraft] = useState<DefaultCompanyUpdateInput>(() =>
    buildDraft(record, companies, accountingYears),
  );
  const [error, setError] = useState<string | null>(null);
  const filteredAccountingYears = useMemo(
    () => accountingYears.filter((accountingYear) => accountingYear.isActive),
    [accountingYears],
  );

  async function submit() {
    if (!draft.companyId || !draft.accountingYearId) {
      setError("Select company and accounting year.");
      return;
    }
    const hideGlobalLoader = showGlobalLoader();
    try {
      const nextRecord = await updateDefaultCompany(draft);
      await onSaved(nextRecord);
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
          title="Edit Default Company"
          description="Only one default company context is active for the application."
        >
          <div className="grid w-[min(760px,calc(100vw-2rem))] gap-4 p-1 md:grid-cols-2">
            <Field label="Company">
              <select
                className="h-11 cursor-pointer rounded-xl border border-input bg-background px-3"
                value={draft.companyId}
                onChange={(event) => {
                  const company = companies.find((item) => String(item.id) === event.target.value);
                  const nextAccountingYear = accountingYears.find(
                    (accountingYear) => accountingYear.isActive,
                  );
                  setDraft((current) => ({
                    ...current,
                    companyId: event.target.value,
                    tenantId: String(company?.tenantId ?? current.tenantId),
                    industryId: String(company?.industryId ?? current.industryId),
                    accountingYearId: nextAccountingYear?.id ?? "",
                  }));
                }}
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {formatCompanyLabel(company.code, company.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Accounting Year">
              <select
                className="h-11 cursor-pointer rounded-xl border border-input bg-background px-3"
                value={draft.accountingYearId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, accountingYearId: event.target.value }))
                }
              >
                {filteredAccountingYears.map((accountingYear) => (
                  <option key={accountingYear.id} value={accountingYear.id}>
                    {accountingYear.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            <Button type="button" className="rounded-xl" onClick={submit}>
              Update
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

function buildDraft(
  record: DefaultCompanyRecord | null,
  companies: readonly CompanyRecord[],
  accountingYears: readonly AccountingYearRecord[],
): DefaultCompanyUpdateInput {
  const company =
    companies.find((item) => String(item.id) === record?.company.id) ?? companies[0] ?? null;
  const accountingYear =
    accountingYears.find((item) => item.id === record?.accountingYear.id) ??
    accountingYears.find((item) => item.isActive) ??
    null;

  return {
    tenantId: record?.tenant.id ?? String(company?.tenantId ?? "1"),
    industryId: record?.industry.id ?? String(company?.industryId ?? "1"),
    companyId: record?.company.id ?? String(company?.id ?? "1"),
    accountingYearId: record?.accountingYear.id ?? accountingYear?.id ?? "",
  };
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
