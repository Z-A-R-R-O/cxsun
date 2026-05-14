"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  AnimatedTabs,
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
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import { listIndustries } from "../../../industry/application/industry-service";
import type { IndustryRecord } from "../../../industry/domain/industry";
import { listTenants } from "../../../tenant/application/tenant-service";
import type { TenantRecord } from "../../../tenant/domain/tenant";
import { createCommonRecord, listCommonRecords } from "../../../common/application/common-service";
import type { CommonRecord } from "../../../common/domain/common-master";
import { MasterAutocompleteLookup } from "../../../common/interface/components/master-autocomplete-lookup";
import {
  buildCompanyColumnOptions,
  filterCompanies,
  formatCompanyDate,
  getCompany,
  listCompanies,
  softDeleteCompany,
  upsertCompany,
} from "../../application/company-service";
import type { MediaItemRecord } from "../../../settings/infrastructure/media-manager-api";
import {
  deleteMedia as deleteMediaFile,
  listMedia,
  uploadMedia as uploadMediaFile,
} from "../../../settings/infrastructure/media-manager-api";
import {
  companyStatusFilters,
  defaultCompanyColumnVisibility,
  type CompanyColumnId,
  type CompanyRecord,
  type CompanyStatusFilter,
  type CompanyUpsertInput,
} from "../../domain/company";

type LocationLookupKey = "countries" | "states" | "districts" | "cities" | "pincodes";
type LocationLookupMap = Record<LocationLookupKey, readonly CommonRecord[]>;
type ThemedSelectOption = { readonly label: string; readonly value: string };

const emptyLocationLookups: LocationLookupMap = {
  countries: [],
  states: [],
  districts: [],
  cities: [],
  pincodes: [],
};

const addressTypeDisplayOrder = [
  { label: "Billing Address", matches: ["Billing Address", "Billing", "BILL"] },
  { label: "Shipping Address", matches: ["Shipping Address", "Shipping", "SHIP"] },
  { label: "Secondary Address", matches: ["Secondary Address", "Secondary", "SECONDARY"] },
  { label: "Third Address", matches: ["Third Address", "Third", "THIRD"] },
] as const;

const companyLogoVariants = [
  { type: "logo", label: "Logo" },
  { type: "logo-dark", label: "Logo Dark" },
  { type: "favicon", label: "Favicon" },
  { type: "letter-head", label: "Letter Head" },
] as const;

const companyLogoBasePath = "/storage/logo";
const companyBankQrBasePath = "/storage/bank-qr";
const defaultCompanyLogoFileNames: Record<(typeof companyLogoVariants)[number]["type"], string> = {
  logo: "logo.svg",
  "logo-dark": "logo-dark.svg",
  favicon: "favicon.svg",
  "letter-head": "logo.svg",
};

const defaultCompanyLogoUrls: Record<(typeof companyLogoVariants)[number]["type"], string> = {
  logo: `${companyLogoBasePath}/logo.svg`,
  "logo-dark": `${companyLogoBasePath}/logo-dark.svg`,
  favicon: `${companyLogoBasePath}/favicon.svg`,
  "letter-head": `${companyLogoBasePath}/logo.svg`,
};

const msmeCategoryOptions: readonly ThemedSelectOption[] = [
  { value: "micro", label: "Micro" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

const companySchema = z.object({
  tenantId: z.number().int().positive(),
  industryId: z.number().int().positive(),
  code: z.string().trim().min(2, "Enter company code"),
  name: z.string().trim().min(2, "Enter company name"),
  legalName: z.string().nullable(),
  tagline: z.string().nullable(),
  shortAbout: z.string().nullable(),
  gstinUin: z.string().nullable(),
  pan: z.string().nullable(),
  dateOfIncorporation: z.string().nullable(),
  msmeNo: z.string().nullable(),
  msmeCategory: z.string().nullable(),
  tan: z.string().nullable(),
  tdsAvailable: z.boolean(),
  tdsSection: z.string().nullable(),
  tdsRatePercent: z.number().nullable(),
  tcsAvailable: z.boolean(),
  tcsSection: z.string().nullable(),
  tcsRatePercent: z.number().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  logos: z.array(
    z.object({
      logoUrl: z.string(),
      logoType: z.string(),
      isActive: z.boolean(),
    }),
  ),
  emails: z.array(
    z.object({
      email: z.string(),
      emailType: z.string(),
      isActive: z.boolean(),
    }),
  ),
  phones: z.array(
    z.object({
      phoneNumber: z.string(),
      phoneType: z.string(),
      isPrimary: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
  socialLinks: z.array(
    z.object({
      platform: z.string(),
      url: z.string(),
      isActive: z.boolean(),
    }),
  ),
  bankAccounts: z.array(
    z.object({
      bankName: z.string(),
      accountNumber: z.string(),
      accountHolderName: z.string(),
      ifsc: z.string(),
      branch: z.string().nullable(),
      qrImageUrl: z.string().nullable(),
      isPrimary: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
  addresses: z.array(
    z.object({
      addressTypeId: z.string().nullable(),
      addressLine1: z.string(),
      addressLine2: z.string().nullable(),
      cityId: z.string().nullable(),
      districtId: z.string().nullable(),
      stateId: z.string().nullable(),
      countryId: z.string().nullable(),
      pincodeId: z.string().nullable(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      isDefault: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
});

export function CompanyListPage() {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [companies, setCompanies] = useState<readonly CompanyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<CompanyColumnId, boolean>>(
    defaultCompanyColumnVisibility,
  );

  const filteredCompanies = useMemo(
    () => filterCompanies({ companies, searchValue, statusFilter }),
    [companies, searchValue, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / rowsPerPage));
  const pageCompanies = filteredCompanies.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      buildCompanyColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    listCompanies({ signal: controller.signal })
      .then((records) => {
        setCompanies(records);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCompanies([]);
          setLoadError(getErrorMessage(error));
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
  }, [showGlobalLoader]);

  async function deleteCompany(company: CompanyRecord) {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteCompany(company.id);
      setCompanies((currentCompanies) => currentCompanies.filter((item) => item.id !== company.id));
      toast.success("Company deleted", { description: `${company.name} was soft deleted.` });
    } catch (error) {
      toast.error("Could not delete company", { description: getErrorMessage(error) });
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/company/new">
            <Plus className="size-4" />
            New Company
          </Link>
        </Button>
      }
      description="Create and review tenant and industry specific company records."
      technicalName="page.organisation.companies"
      title="Companies"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={companyStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as CompanyStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search company, code, tenant, industry, status, or id"
        searchValue={searchValue}
      />
      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <th className="w-16 border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  #
                </th>
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.name ? <ListHeader>Company</ListHeader> : null}
                {visibleColumns.tenant ? <ListHeader>Tenant</ListHeader> : null}
                {visibleColumns.industry ? <ListHeader>Industry</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <th className="w-24 border-b border-border/70 px-4 py-2.5 text-right font-medium text-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageCompanies.map((company, index) => (
                <tr
                  key={company.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.code ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {company.code}
                    </td>
                  ) : null}
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => {
                          showGlobalLoader();
                          router.push(`/desk/company/${company.id}`);
                        }}
                      >
                        {company.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.tenant ? (
                    <td className="px-4 py-2.5 text-muted-foreground">{company.tenantName}</td>
                  ) : null}
                  {visibleColumns.industry ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatIndustryLabel(company.industryCode, company.industryName)}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <StatusBadge isActive={company.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCompanyDate(company.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`${company.name} actions`}
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-full border border-transparent hover:border-border/80 hover:bg-background"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-2xl p-1">
                        <DropdownMenuItem asChild>
                          <Link href={`/desk/company/${company.id}`} className="gap-2.5">
                            <Eye className="size-4" />
                            View company
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/desk/company/${company.id}/edit?returnTo=list`}
                            className="gap-2.5"
                          >
                            <Pencil className="size-4" />
                            Edit company
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2.5 text-destructive focus:text-destructive"
                          onSelect={() => deleteCompany(company)}
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
        {pageCompanies.length === 0 && !isLoading ? (
          <MasterListEmptyState>No companies found.</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredCompanies.length,
        })}
        singularLabel="companies"
        totalCount={filteredCompanies.length}
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

export function CompanyShowPage({ companyId }: { readonly companyId: number }) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    setIsLoading(true);
    setCompany(null);
    getCompany(companyId, { signal: controller.signal })
      .then((record) => setCompany(record))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setCompany(null);
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
  }, [companyId, showGlobalLoader]);

  if (!company) {
    if (isLoading) {
      return (
        <MasterListPageFrame
          description=""
          technicalName="page.company.show.loading"
          title="Company"
        >
          {null}
        </MasterListPageFrame>
      );
    }
    return (
      <MasterListPageFrame
        description="The requested company record was not found."
        technicalName="page.company.show.missing"
        title="Company not found"
      >
        <MasterListShowCard title="Details">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/company">Back to companies</Link>
          </Button>
        </MasterListShowCard>
      </MasterListPageFrame>
    );
  }

  const currentCompany = company;

  async function handleSoftDelete() {
    const hideGlobalLoader = showGlobalLoader();
    try {
      await softDeleteCompany(currentCompany.id);
      toast.success("Company deleted", { description: `${currentCompany.name} was soft deleted.` });
      router.push("/desk/company");
    } catch (error) {
      hideGlobalLoader();
      toast.error("Could not delete company", { description: getErrorMessage(error) });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/company">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/company/${currentCompany.id}/edit?returnTo=show`}>
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
      description={`${currentCompany.tenantName} / ${formatIndustryLabel(currentCompany.industryCode, currentCompany.industryName)}`}
      technicalName="page.company.show"
      title={formatCompanyLabel(currentCompany.code, currentCompany.name)}
    >
      <MasterListShowLayout
        cards={[
          <MasterListShowCard key="detail" title="Details" className="lg:col-span-2">
            <CompanyDetailsTable company={currentCompany} />
          </MasterListShowCard>,
          <MasterListShowCard key="tax" title="Tax Details" className="lg:col-span-2">
            <CompanyTaxDetailsTable company={currentCompany} />
          </MasterListShowCard>,
          <MasterListShowCard key="logos" title="Logos">
            <SimpleRows rows={currentCompany.logos.map((logo) => [logo.logoType, logo.logoUrl])} />
          </MasterListShowCard>,
          <MasterListShowCard key="addresses" title="Addresses">
            <SimpleRows
              rows={currentCompany.addresses.map((address) => [
                formatLookupFallback(address.addressTypeId) || "-",
                [address.addressLine1, address.cityId, address.stateId, address.pincodeId]
                  .filter(Boolean)
                  .join(", "),
              ])}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="emails" title="Emails">
            <SimpleRows
              rows={currentCompany.emails.map((email) => [email.emailType, email.email])}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="phones" title="Phones">
            <SimpleRows
              rows={currentCompany.phones.map((phone) => [phone.phoneType, phone.phoneNumber])}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="social" title="Social Links">
            <SimpleRows
              rows={currentCompany.socialLinks.map((link) => [link.platform, link.url])}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="banks" title="Bank accounts">
            <SimpleRows
              rows={currentCompany.bankAccounts.map((bank) => [
                bank.bankName,
                <CompanyBankAccountShowValue bank={bank} key={bank.id} />,
              ])}
            />
          </MasterListShowCard>,
        ]}
      />
    </MasterListPageFrame>
  );
}

export function CompanyUpsertPage({
  companyId,
  returnTo = "show",
}: {
  readonly companyId?: number;
  readonly returnTo?: "list" | "show";
}) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const isEdit = Boolean(companyId);
  const [existingCompany, setExistingCompany] = useState<CompanyRecord | null>(null);
  const [tenants, setTenants] = useState<readonly TenantRecord[]>([]);
  const [industries, setIndustries] = useState<readonly IndustryRecord[]>([]);
  const [locationLookups, setLocationLookups] = useState<LocationLookupMap>(emptyLocationLookups);
  const [addressTypes, setAddressTypes] = useState<readonly CommonRecord[]>([]);
  const [bankNames, setBankNames] = useState<readonly CommonRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(!isEdit);
  const [message, setMessage] = useState<string | null>(null);
  const [logoUploadDialog, setLogoUploadDialog] = useState<{
    readonly currentFileName: string;
    readonly variantType: (typeof companyLogoVariants)[number]["type"];
  } | null>(null);
  const [bankQrUploadDialog, setBankQrUploadDialog] = useState<{
    readonly currentFileName: string;
    readonly onUploaded: (record: MediaItemRecord) => void;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const form = useForm({
    defaultValues: defaultCompanyFormValues(existingCompany),
    onSubmit: async ({ value }) => {
      const normalizedValue = normalizeCompanyLogos(
        normalizeCompanyAddressTypes(value, addressTypes),
      );
      const parsedValue = companySchema.safeParse(normalizedValue);
      if (!parsedValue.success) {
        const nextValidationErrors = buildCompanyValidationErrors(parsedValue.error.issues);
        setValidationErrors(nextValidationErrors);
        setMessage(buildValidationBannerMessage(nextValidationErrors));
        return;
      }
      setValidationErrors({});
      const hideGlobalLoader = showGlobalLoader();
      try {
        const company = await upsertCompany(parsedValue.data as CompanyUpsertInput, companyId);
        toast.success(isEdit ? "Company updated" : "Company created", {
          description: `${company.name} was saved.`,
        });
        router.push(
          isEdit && returnTo === "list" ? "/desk/company" : `/desk/company/${company.id}`,
        );
      } catch (error) {
        hideGlobalLoader();
        const errorMessage = getErrorMessage(error);
        setMessage(errorMessage);
        toast.error(isEdit ? "Could not update company" : "Could not create company", {
          description: errorMessage,
        });
      }
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    const loaders = [
      listTenants({ signal: controller.signal }),
      listIndustries({ signal: controller.signal }),
      loadLocationLookups(controller.signal),
      listCommonRecords("addressTypes", { signal: controller.signal }),
      listCommonRecords("bankNames", { signal: controller.signal }),
    ] as const;
    const companyLoader = companyId
      ? getCompany(companyId, { signal: controller.signal })
      : Promise.resolve(null);
    setIsLoaded(false);
    Promise.all([...loaders, companyLoader])
      .then(
        ([
          tenantRecords,
          industryRecords,
          nextLocationLookups,
          addressTypeRecords,
          bankNameRecords,
          companyRecord,
        ]) => {
          setTenants(tenantRecords);
          setIndustries(industryRecords);
          setLocationLookups(nextLocationLookups);
          setAddressTypes(addressTypeRecords);
          setBankNames(bankNameRecords);
          setExistingCompany(companyRecord);
          const values = normalizeCompanyAddressTypes(
            defaultCompanyFormValues(companyRecord, tenantRecords[0]?.id, industryRecords[0]?.id),
            addressTypeRecords,
          );
          Object.entries(values).forEach(([key, nextValue]) =>
            form.setFieldValue(key as keyof typeof values, nextValue),
          );
        },
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error(error);
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
  }, [companyId, form, showGlobalLoader]);

  async function createLocationLookup(
    moduleKey: LocationLookupKey,
    label: string,
    address: CompanyUpsertInput["addresses"][number],
  ) {
    const payload = buildLocationCreatePayload(moduleKey, label, address);
    if (!payload) {
      toast.error("Select parent location first", {
        description: `Choose the parent fields needed before creating ${locationLookupLabel(moduleKey)}.`,
      });
      return null;
    }

    try {
      const record = await createCommonRecord(moduleKey, payload);
      setLocationLookups((current) => ({
        ...current,
        [moduleKey]: [...current[moduleKey], record],
      }));
      toast.success(`${locationLookupLabel(moduleKey)} created`, {
        description: getCommonRecordLabel(record),
      });
      return record;
    } catch (error) {
      toast.error(`Could not create ${locationLookupLabel(moduleKey).toLowerCase()}`, {
        description: getErrorMessage(error),
      });
      return null;
    }
  }

  async function createBankName(label: string) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return null;

    try {
      const record = await createCommonRecord("bankNames", {
        code: toLookupCode(trimmedLabel) || "BANK",
        description: null,
        isActive: true,
        name: trimmedLabel,
      });
      setBankNames((current) => [...current, record]);
      toast.success("Bank name created", { description: getCommonRecordLabel(record) });
      return record;
    } catch (error) {
      toast.error("Could not create bank name", { description: getErrorMessage(error) });
      return null;
    }
  }

  if (!isLoaded) {
    return (
      <MasterListPageFrame
        description=""
        technicalName="page.company.upsert.loading"
        title="Company"
      >
        {null}
      </MasterListPageFrame>
    );
  }

  if (isEdit && !existingCompany) {
    return (
      <MasterListPageFrame
        description="The requested company record was not found."
        technicalName="page.company.upsert.missing"
        title="Company not found"
      >
        <MasterListUpsertCard title="Company setup">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/company">Back to companies</Link>
          </Button>
        </MasterListUpsertCard>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={getCancelPath(companyId, isEdit, returnTo)}>
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      description={
        isEdit
          ? "Update company code, identity, tenant, industry, and active status."
          : "Create a tenant and industry specific company record."
      }
      technicalName="page.company.upsert"
      title={isEdit ? "Edit company" : "New company"}
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
            <AnimatedTabs
              tabs={[
                {
                  value: "identity",
                  label: "Details",
                  content: (
                    <div className="space-y-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
                      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                        <form.Field name="code">
                          {(field) => (
                            <FieldShell
                              label="Company code"
                              error={validationErrors.code ?? field.state.meta.errors[0]}
                            >
                              <Input
                                className="h-11 rounded-xl font-mono uppercase"
                                value={field.state.value}
                                onChange={(event) =>
                                  field.handleChange(normalizeCodeInput(event.target.value))
                                }
                              />
                            </FieldShell>
                          )}
                        </form.Field>
                        <form.Field name="name">
                          {(field) => (
                            <FieldShell
                              label="Company name"
                              error={validationErrors.name ?? field.state.meta.errors[0]}
                            >
                              <Input
                                className="h-11 rounded-xl"
                                value={field.state.value}
                                onChange={(event) => field.handleChange(event.target.value)}
                              />
                            </FieldShell>
                          )}
                        </form.Field>
                        <form.Field name="tenantId">
                          {(field) => (
                            <FieldShell
                              label="Tenant"
                              error={validationErrors.tenantId ?? field.state.meta.errors[0]}
                            >
                              <ThemedSelect
                                value={String(field.state.value)}
                                placeholder="Select tenant"
                                options={tenants.map((tenant) => ({
                                  value: String(tenant.id),
                                  label: tenant.name,
                                }))}
                                onValueChange={(value) => field.handleChange(Number(value))}
                              />
                            </FieldShell>
                          )}
                        </form.Field>
                        <TextField form={form} name="legalName" label="Legal name" />
                        <form.Field name="industryId">
                          {(field) => (
                            <FieldShell
                              label="Industry"
                              error={validationErrors.industryId ?? field.state.meta.errors[0]}
                            >
                              <ThemedSelect
                                value={String(field.state.value)}
                                placeholder="Select industry"
                                options={industries.map((industry) => ({
                                  value: String(industry.id),
                                  label: formatIndustryLabel(industry.code, industry.name),
                                }))}
                                onValueChange={(value) => field.handleChange(Number(value))}
                              />
                            </FieldShell>
                          )}
                        </form.Field>
                        <div className="md:col-span-2">
                          <TextField form={form} name="tagline" label="Tagline" />
                        </div>
                      </div>
                      <div className="grid gap-4 pt-2 md:grid-cols-2">
                        <SwitchField
                          form={form}
                          name="isPrimary"
                          label="Primary"
                          description="Primary company is used for shared suite context."
                        />
                        <SwitchField
                          form={form}
                          name="isActive"
                          label="Active"
                          description="Active companies can be selected in workflows."
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "registration",
                  label: "Communication",
                  content: (
                    <div className="space-y-5">
                      <CollectionCard
                        title="Company Emails"
                        description="Operational and communication email addresses."
                        actionLabel="Add"
                        onAdd={() =>
                          form.setFieldValue("emails", [
                            ...form.getFieldValue("emails"),
                            { email: "", emailType: "", isActive: true },
                          ])
                        }
                      >
                        <form.Field name="emails">
                          {(field) => (
                            <div className="space-y-4">
                              {field.state.value.map((email, index) => (
                                <CollectionRow
                                  key={index}
                                  onRemove={() =>
                                    field.handleChange(
                                      field.state.value.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <FieldShell label="Email" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={email.email}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, email: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                  <FieldShell label="Email Type" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={email.emailType}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, emailType: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                </CollectionRow>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </CollectionCard>
                      <CollectionCard
                        title="Company Phones"
                        description="Phone and messaging channels used by the company."
                        actionLabel="Add"
                        onAdd={() =>
                          form.setFieldValue("phones", [
                            ...form.getFieldValue("phones"),
                            {
                              phoneNumber: "",
                              phoneType: "",
                              isPrimary: form.getFieldValue("phones").length === 0,
                              isActive: true,
                            },
                          ])
                        }
                      >
                        <form.Field name="phones">
                          {(field) => (
                            <div className="space-y-4">
                              {field.state.value.map((phone, index) => (
                                <CollectionRow
                                  key={index}
                                  onRemove={() =>
                                    field.handleChange(
                                      field.state.value.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <FieldShell label="Phone Number" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={phone.phoneNumber}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, phoneNumber: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                  <FieldShell label="Phone Type" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={phone.phoneType}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, phoneType: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                  <label className="flex items-center gap-3 pt-7 text-sm font-medium">
                                    <input
                                      type="checkbox"
                                      checked={phone.isPrimary}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) => ({
                                            ...item,
                                            isPrimary:
                                              itemIndex === index ? event.target.checked : false,
                                          })),
                                        )
                                      }
                                    />
                                    Primary phone
                                  </label>
                                </CollectionRow>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </CollectionCard>
                      <CollectionCard
                        title="Social Links"
                        description="Public brand links used in profile and storefront surfaces."
                        actionLabel="Add"
                        onAdd={() =>
                          form.setFieldValue("socialLinks", [
                            ...form.getFieldValue("socialLinks"),
                            { platform: "", url: "", isActive: true },
                          ])
                        }
                      >
                        <form.Field name="socialLinks">
                          {(field) => (
                            <div className="space-y-4">
                              {field.state.value.map((link, index) => (
                                <CollectionRow
                                  key={index}
                                  onRemove={() =>
                                    field.handleChange(
                                      field.state.value.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <FieldShell label="Platform" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={link.platform}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, platform: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                  <FieldShell label="URL" error={null}>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={link.url}
                                      onChange={(event) =>
                                        field.handleChange(
                                          field.state.value.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, url: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  </FieldShell>
                                </CollectionRow>
                              ))}
                            </div>
                          )}
                        </form.Field>
                      </CollectionCard>
                      <div className="grid gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:grid-cols-2 md:p-5">
                        <TextField form={form} name="website" label="Website" />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "logos",
                  label: "Logos",
                  content: (
                    <div className="space-y-5 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
                      <form.Field name="logos">
                        {(field) => (
                          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                            {companyLogoVariants.map((variant) => (
                              <FieldShell key={variant.type} label={variant.label} error={null}>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={getLogoVariantFileName(field.state.value, variant.type)}
                                      placeholder={defaultCompanyLogoFileNames[variant.type]}
                                      onChange={(event) =>
                                        field.handleChange(
                                          updateLogoVariantFileName(
                                            field.state.value,
                                            variant.type,
                                            event.target.value,
                                          ),
                                        )
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-11 rounded-xl px-3"
                                      onClick={() =>
                                        setLogoUploadDialog({
                                          currentFileName: getLogoVariantFileName(
                                            field.state.value,
                                            variant.type,
                                          ),
                                          variantType: variant.type,
                                        })
                                      }
                                    >
                                      <ImagePlus className="size-4" />
                                      Upload
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Stored in `{companyLogoBasePath}` as{" "}
                                    {getLogoVariantFileName(field.state.value, variant.type) ||
                                      defaultCompanyLogoFileNames[variant.type]}
                                    .
                                  </p>
                                </div>
                              </FieldShell>
                            ))}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  ),
                },
                {
                  value: "tax",
                  label: "Tax Details",
                  content: (
                    <div className="space-y-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
                      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                        <TextField form={form} name="gstinUin" label="GSTIN / UIN" />
                        <TextField form={form} name="pan" label="PAN" />
                        <TextField form={form} name="msmeNo" label="MSME No" />
                        <form.Field name="msmeCategory">
                          {(field) => (
                            <FieldShell
                              label="MSME Category"
                              error={validationErrors.msmeCategory ?? field.state.meta.errors[0]}
                            >
                              <ThemedSelect
                                value={field.state.value ?? ""}
                                placeholder="Select MSME category"
                                options={msmeCategoryOptions}
                                onValueChange={(value) => field.handleChange(value || null)}
                              />
                            </FieldShell>
                          )}
                        </form.Field>
                        <TextField
                          form={form}
                          name="dateOfIncorporation"
                          label="Date of incorporation"
                          type="date"
                        />
                      </div>
                      <div className="pt-1">
                        <SwitchField
                          form={form}
                          name="tdsAvailable"
                          label="TDS Available"
                          description="Enable when this company has TDS applicability details."
                        />
                      </div>
                      <TextField form={form} name="tan" label="TAN No" />
                      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                        <TextField form={form} name="tdsSection" label="TDS Section" />
                        <NumberField form={form} name="tdsRatePercent" label="TDS Rate %" />
                      </div>
                      <SwitchField
                        form={form}
                        name="tcsAvailable"
                        label="TCS Available"
                        description="Enable when this company has TCS collection applicability."
                      />
                      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                        <TextField form={form} name="tcsSection" label="TCS Section" />
                        <NumberField form={form} name="tcsRatePercent" label="TCS Rate %" />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "accounts",
                  label: "Accounts",
                  content: (
                    <CollectionCard
                      title="Company Bank Accounts"
                      description="Bank accounts used for receipts and payments."
                      actionLabel="Add"
                      onAdd={() =>
                        form.setFieldValue("bankAccounts", [
                          ...form.getFieldValue("bankAccounts"),
                          {
                            bankName: "",
                            accountNumber: "",
                            accountHolderName: form.getFieldValue("legalName") || form.getFieldValue("name"),
                            ifsc: "",
                            branch: null,
                            qrImageUrl: null,
                            isPrimary: form.getFieldValue("bankAccounts").length === 0,
                            isActive: true,
                          },
                        ])
                      }
                    >
                      <form.Field name="bankAccounts">
                        {(field) => (
                          <div className="space-y-4">
                            {field.state.value.map((bankAccount, index) => (
                              <CollectionRow
                                key={index}
                                gridClassName="md:grid-cols-2"
                                onRemove={() =>
                                  field.handleChange(
                                    field.state.value.filter((_, itemIndex) => itemIndex !== index),
                                  )
                                }
                              >
                                <MasterAutocompleteLookup
                                  allowCreate
                                  className="[&_input]:rounded-xl"
                                  defaultId=""
                                  defaultLabel=""
                                  label="Bank name"
                                  moduleKey="bankNames"
                                  getOptionLabel={getCommonRecordLabel}
                                  options={bankNames}
                                  placeholder="Search or create bank"
                                  value={findBankNameId(bankNames, bankAccount.bankName)}
                                  onChange={(_, record) =>
                                    updateCollectionItem(field, index, {
                                      bankName: record ? getCommonRecordLabel(record) : "",
                                    })
                                  }
                                  onQuickCreate={({ label }) => createBankName(label)}
                                />
                                <FieldShell label="Account number" error={null}>
                                  <Input
                                    className="h-11 rounded-xl"
                                    value={bankAccount.accountNumber}
                                    onChange={(event) =>
                                      updateCollectionItem(field, index, {
                                        accountNumber: event.target.value,
                                      })
                                    }
                                  />
                                </FieldShell>
                                <FieldShell label="Account holder name" error={null}>
                                  <Input
                                    className="h-11 rounded-xl"
                                    value={bankAccount.accountHolderName}
                                    onChange={(event) =>
                                      updateCollectionItem(field, index, {
                                        accountHolderName: event.target.value,
                                      })
                                    }
                                  />
                                </FieldShell>
                                <FieldShell label="IFSC" error={null}>
                                  <Input
                                    className="h-11 rounded-xl uppercase"
                                    value={bankAccount.ifsc}
                                    onChange={(event) =>
                                      updateCollectionItem(field, index, {
                                        ifsc: event.target.value.toUpperCase(),
                                      })
                                    }
                                  />
                                </FieldShell>
                                <FieldShell label="Branch" error={null}>
                                  <Input
                                    className="h-11 rounded-xl"
                                    value={bankAccount.branch ?? ""}
                                    onChange={(event) =>
                                      updateCollectionItem(field, index, {
                                        branch: event.target.value || null,
                                      })
                                    }
                                  />
                                </FieldShell>
                                <div className="md:col-span-2">
                                  <FieldShell label="QR image" error={null}>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Input
                                        className="h-11 min-w-[240px] flex-1 rounded-xl"
                                        value={bankAccount.qrImageUrl ?? ""}
                                        placeholder="/storage/bank-qr/account-qr.png"
                                        onChange={(event) =>
                                          updateCollectionItem(field, index, {
                                            qrImageUrl: event.target.value || null,
                                          })
                                        }
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 rounded-xl px-3"
                                        disabled={!companyId}
                                        onClick={() =>
                                          setBankQrUploadDialog({
                                            currentFileName: bankAccount.qrImageUrl ?? "",
                                            onUploaded: (record) =>
                                              updateCollectionItem(field, index, {
                                                qrImageUrl:
                                                  record.publicUrl ??
                                                  buildBankQrStoragePath(record.fileName),
                                              }),
                                          })
                                        }
                                      >
                                        <ImagePlus className="size-4" />
                                        Upload
                                      </Button>
                                    </div>
                                  </FieldShell>
                                </div>
                                <label
                                  className={
                                    bankAccount.isPrimary
                                      ? "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-950"
                                      : "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-border/70 bg-muted/10 px-4 py-2"
                                  }
                                >
                                  <span>
                                    <span className="block text-sm font-medium leading-tight">
                                      Primary bank
                                    </span>
                                    <span className="block text-xs leading-tight text-muted-foreground">
                                      First choice in receipts and payments.
                                    </span>
                                  </span>
                                  <Switch
                                    checked={bankAccount.isPrimary}
                                    aria-label="Primary bank"
                                    onCheckedChange={(checked) =>
                                      field.handleChange(
                                        field.state.value.map((item, itemIndex) => ({
                                          ...item,
                                          isPrimary: itemIndex === index ? checked : false,
                                        })),
                                      )
                                    }
                                  />
                                </label>
                              </CollectionRow>
                            ))}
                          </div>
                        )}
                      </form.Field>
                    </CollectionCard>
                  ),
                },
                {
                  value: "addressing",
                  label: "Addressing",
                  content: (
                    <CollectionCard
                      title="Address Book"
                      description="Reusable company addresses linked to common location masters."
                      actionLabel="Add"
                      onAdd={() =>
                        form.setFieldValue("addresses", [
                          ...form.getFieldValue("addresses"),
                          {
                            addressTypeId: getDefaultAddressTypeId(addressTypes),
                            addressLine1: "",
                            addressLine2: null,
                            cityId: null,
                            districtId: null,
                            stateId: null,
                            countryId: null,
                            pincodeId: null,
                            latitude: null,
                            longitude: null,
                            isDefault: form.getFieldValue("addresses").length === 0,
                            isActive: true,
                          },
                        ])
                      }
                    >
                      <form.Field name="addresses">
                        {(field) => (
                          <div className="space-y-4">
                            {field.state.value.map((address, index) => (
                              <CollectionRow
                                gridClassName="md:grid-cols-2"
                                key={index}
                                onRemove={() =>
                                  field.handleChange(
                                    field.state.value.filter((_, itemIndex) => itemIndex !== index),
                                  )
                                }
                              >
                                <div className="md:col-span-2">
                                  <AddressTypeSelect
                                    label="Address Type"
                                    options={addressTypes}
                                    value={address.addressTypeId}
                                    onChange={(value) =>
                                      updateCollectionItem(field, index, { addressTypeId: value })
                                    }
                                  />
                                </div>
                                <AddressInput
                                  label="Address"
                                  value={address.addressLine1}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, {
                                      addressLine1: value ?? "",
                                    })
                                  }
                                />
                                <AddressInput
                                  label="Area / Location"
                                  value={address.addressLine2 ?? ""}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { addressLine2: value })
                                  }
                                />
                                <AddressLookupInput
                                  label="Country"
                                  moduleKey="countries"
                                  options={locationLookups.countries}
                                  value={address.countryId}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { countryId: value })
                                  }
                                  onCreate={(label) =>
                                    createLocationLookup("countries", label, address)
                                  }
                                />
                                <AddressLookupInput
                                  label="State"
                                  moduleKey="states"
                                  options={locationLookups.states}
                                  value={address.stateId}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { stateId: value })
                                  }
                                  onCreate={(label) =>
                                    createLocationLookup("states", label, address)
                                  }
                                />
                                <AddressLookupInput
                                  label="District"
                                  moduleKey="districts"
                                  options={locationLookups.districts}
                                  value={address.districtId}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { districtId: value })
                                  }
                                  onCreate={(label) =>
                                    createLocationLookup("districts", label, address)
                                  }
                                />
                                <AddressLookupInput
                                  label="City"
                                  moduleKey="cities"
                                  options={locationLookups.cities}
                                  value={address.cityId}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { cityId: value })
                                  }
                                  onCreate={(label) =>
                                    createLocationLookup("cities", label, address)
                                  }
                                />
                                <AddressLookupInput
                                  label="Pincode"
                                  moduleKey="pincodes"
                                  options={locationLookups.pincodes}
                                  value={address.pincodeId}
                                  onChange={(value) =>
                                    updateCollectionItem(field, index, { pincodeId: value })
                                  }
                                  onCreate={(label) =>
                                    createLocationLookup("pincodes", label, address)
                                  }
                                />
                                <label
                                  className={
                                    address.isDefault
                                      ? "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-950"
                                      : "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-border/70 bg-muted/10 px-4 py-2"
                                  }
                                >
                                  <span>
                                    <span className="block text-sm font-medium leading-tight">
                                      Primary address
                                    </span>
                                    <span className="block text-xs leading-tight text-muted-foreground">
                                      Used as the main company address.
                                    </span>
                                  </span>
                                  <Switch
                                    checked={address.isDefault}
                                    aria-label="Primary address"
                                    onCheckedChange={(checked) =>
                                      field.handleChange(
                                        field.state.value.map((item, itemIndex) => ({
                                          ...item,
                                          isDefault: itemIndex === index ? checked : false,
                                        })),
                                      )
                                    }
                                  />
                                </label>
                              </CollectionRow>
                            ))}
                          </div>
                        )}
                      </form.Field>
                    </CollectionCard>
                  ),
                },
                {
                  value: "notes",
                  label: "Notes",
                  content: (
                    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
                      <TextField form={form} name="shortAbout" label="Short about" />
                      <TextField form={form} name="description" label="Description" />
                    </div>
                  ),
                },
              ]}
            />
            {message ? (
              <div
                className={
                  Object.keys(validationErrors).length
                    ? "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    : "text-sm font-medium text-muted-foreground"
                }
              >
                {message}
              </div>
            ) : null}
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="rounded-xl">
                <Save className="size-4" />
                {isEdit ? "Update company" : "Create company"}
              </Button>
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={getCancelPath(companyId, isEdit, returnTo)}>
                  <X className="size-4" />
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
      {logoUploadDialog ? (
        <CompanyLogoUploadDialog
          currentFileName={logoUploadDialog.currentFileName}
          variantType={logoUploadDialog.variantType}
          onClose={() => setLogoUploadDialog(null)}
          onUploaded={(record) => {
            form.setFieldValue(
              "logos",
              updateLogoVariantUrl(
                form.getFieldValue("logos"),
                logoUploadDialog.variantType,
                record.publicUrl ?? buildLogoStoragePath(record.fileName),
              ),
            );
            setLogoUploadDialog(null);
          }}
        />
      ) : null}
      {bankQrUploadDialog ? (
        <CompanyBankQrUploadDialog
          companyId={companyId}
          currentFileName={bankQrUploadDialog.currentFileName}
          onClose={() => setBankQrUploadDialog(null)}
          onUploaded={(record) => {
            bankQrUploadDialog.onUploaded(record);
            setBankQrUploadDialog(null);
          }}
        />
      ) : null}
    </MasterListPageFrame>
  );
}

function ListHeader({ children }: { readonly children: ReactNode }) {
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

function CompanyDetailsTable({ company }: { readonly company: CompanyRecord }) {
  const rows: Array<[string, ReactNode]> = [
    ["ID", company.id],
    ["Code", company.code],
    ["Tenant", company.tenantName],
    ["Industry", formatIndustryLabel(company.industryCode, company.industryName)],
    ["Name", company.name],
    ["Legal name", company.legalName ?? "-"],
    ["Primary email", company.primaryEmail ?? "-"],
    ["Primary phone", company.primaryPhone ?? "-"],
    ["Website", company.website ?? "-"],
    ["Active", <StatusBadge key="active" isActive={company.isActive} />],
    ["Created at", formatCompanyDate(company.createdAt)],
    ["Updated at", formatCompanyDate(company.updatedAt)],
    ["Deleted at", formatCompanyDate(company.deletedAt)],
  ];
  return <SimpleRows rows={rows} />;
}

function CompanyTaxDetailsTable({ company }: { readonly company: CompanyRecord }) {
  const rows: Array<[string, ReactNode]> = [
    ["GSTIN / UIN", company.gstinUin ?? "-"],
    ["PAN", company.pan ?? "-"],
    ["Date of incorporation", company.dateOfIncorporation ?? "-"],
    ["MSME No", company.msmeNo ?? "-"],
    ["MSME Category", company.msmeCategory ?? "-"],
    ["TAN", company.tan ?? "-"],
    ["TDS Available", company.tdsAvailable ? "Yes" : "No"],
    ["TDS Section", company.tdsAvailable ? (company.tdsSection ?? "-") : "-"],
    [
      "TDS Rate",
      company.tdsAvailable && company.tdsRatePercent !== null ? `${company.tdsRatePercent}%` : "-",
    ],
    ["TCS Available", company.tcsAvailable ? "Yes" : "No"],
    ["TCS Section", company.tcsAvailable ? (company.tcsSection ?? "-") : "-"],
    [
      "TCS Rate",
      company.tcsAvailable && company.tcsRatePercent !== null ? `${company.tcsRatePercent}%` : "-",
    ],
  ];
  return <SimpleRows rows={rows} />;
}

function CompanyBankAccountShowValue({
  bank,
}: {
  readonly bank: CompanyRecord["bankAccounts"][number];
}) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 space-y-1">
        <div>{bank.accountHolderName}</div>
        <div className="text-muted-foreground">
          {[
            bank.accountNumber ? `A/c ${bank.accountNumber}` : "",
            bank.ifsc ? `IFSC ${bank.ifsc}` : "",
            bank.branch,
          ]
            .filter(Boolean)
            .join(" / ")}
        </div>
      </div>
      {bank.qrImageUrl ? (
        <img
          src={bank.qrImageUrl}
          alt={`${bank.bankName} QR`}
          className="size-20 rounded-md border border-border object-contain p-1"
        />
      ) : null}
    </div>
  );
}

function SimpleRows({ rows }: { readonly rows: readonly (readonly [ReactNode, ReactNode])[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No records.</p>;
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value], index) => (
            <tr key={index} className="border-b border-border/60 last:border-b-0">
              <th className="w-52 bg-muted/35 px-4 py-3 text-left font-medium text-muted-foreground">
                {label}
              </th>
              <td className="px-4 py-3 text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div
      className={
        error
          ? "grid gap-2 [&_button]:border-destructive [&_button]:focus-visible:ring-destructive/30 [&_input]:border-destructive [&_input]:focus-visible:ring-destructive/30"
          : "grid gap-2"
      }
    >
      <Label className={error ? "text-sm font-medium text-destructive" : "text-sm font-medium"}>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{String(error)}</p> : null}
    </div>
  );
}

function CollectionCard({
  actionLabel,
  children,
  description,
  onAdd,
  title,
}: {
  readonly actionLabel: string;
  readonly children: ReactNode;
  readonly description: string;
  readonly onAdd: () => void;
  readonly title: string;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" className="h-8 rounded-lg px-3" onClick={onAdd}>
          <Plus className="size-4" />
          {actionLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

function CollectionRow({
  children,
  gridClassName = "md:grid-cols-[1fr_1fr_auto]",
  onRemove,
}: {
  readonly children: ReactNode;
  readonly gridClassName?: string;
  readonly onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="ghost" className="h-8 gap-2 rounded-lg" onClick={onRemove}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>
      <div className={`grid gap-x-6 gap-y-5 ${gridClassName}`}>{children}</div>
    </div>
  );
}

function AddressInput({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string | null) => void;
  readonly value: string;
}) {
  return (
    <FieldShell label={label} error={null}>
      <Input
        className="h-11 rounded-xl"
        value={value}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </FieldShell>
  );
}

function AddressTypeSelect({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string | null) => void;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const selectOptions = getAddressTypeSelectOptions(options);
  const resolvedValue = resolveAddressTypeValue(value, options) ?? getDefaultAddressTypeId(options);

  return (
    <FieldShell label={label} error={null}>
      <ThemedSelect
        value={resolvedValue ?? ""}
        placeholder="Select address type"
        options={
          selectOptions.length
            ? selectOptions
            : [{ value: value ?? "", label: formatLookupFallback(value) || "Billing Address" }]
        }
        onValueChange={(nextValue) => onChange(nextValue || getDefaultAddressTypeId(options))}
      />
    </FieldShell>
  );
}

function ThemedSelect({
  onValueChange,
  options,
  placeholder,
  value,
}: {
  readonly onValueChange: (value: string) => void;
  readonly options: readonly ThemedSelectOption[];
  readonly placeholder: string;
  readonly value: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full cursor-pointer justify-between rounded-xl border-input bg-background px-3 text-left font-normal text-foreground shadow-sm hover:bg-accent/50"
        >
          <span
            className={
              selectedOption ? "min-w-0 truncate" : "min-w-0 truncate text-muted-foreground"
            }
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[120] max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl p-1 shadow-xl"
      >
        {options.length ? (
          options.map((option) => {
            const isSelected = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2"
                onSelect={() => onValueChange(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                ) : null}
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem disabled className="rounded-lg px-3 py-2 text-muted-foreground">
            No options available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddressLookupInput({
  label,
  moduleKey,
  onChange,
  onCreate,
  options,
  value,
}: {
  readonly label: string;
  readonly moduleKey: LocationLookupKey;
  readonly onChange: (value: string | null) => void;
  readonly onCreate: (label: string) => Promise<CommonRecord | null>;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  const selectedOption = findLookupOption(options, selectedValue);
  const [query, setQuery] = useState(() =>
    selectedOption
      ? getLocationRecordLabel(moduleKey, selectedOption)
      : formatLookupFallback(value),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    getLocationRecordLabel(moduleKey, option).toLowerCase().includes(normalizedQuery),
  );
  const exactOption = options.find(
    (option) => getLocationRecordLabel(moduleKey, option).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(query.trim()) && !exactOption;
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    setQuery(
      selectedOption
        ? getLocationRecordLabel(moduleKey, selectedOption)
        : formatLookupFallback(selectedValue),
    );
  }, [moduleKey, selectedOption, selectedValue]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options]);

  function selectOption(option: CommonRecord) {
    const nextValue = String(option.id);
    setQuery(getLocationRecordLabel(moduleKey, option));
    setSelectedValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  }

  async function createAndSelect() {
    const labelValue = query.trim();
    if (!labelValue) return;
    const record = await onCreate(labelValue);
    if (!record) return;
    const nextValue = String(record.id);
    setQuery(getLocationRecordLabel(moduleKey, record));
    setSelectedValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  }

  async function selectActiveOption() {
    if (optionCount === 0) return;
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) {
      selectOption(activeOption);
      return;
    }
    if (canCreate && activeIndex === filteredOptions.length) {
      await createAndSelect();
    }
  }

  return (
    <div className="relative z-10 grid gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 cursor-pointer rounded-xl"
        value={query}
        placeholder={`Search ${label.toLowerCase()}`}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => (optionCount ? (current + 1) % optionCount : 0));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) =>
              optionCount ? (current - 1 + optionCount) % optionCount : 0,
            );
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            void selectActiveOption();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          if (exactOption) {
            const nextValue = String(exactOption.id);
            setSelectedValue(nextValue);
            onChange(nextValue);
          }
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          const matchingOption = options.find(
            (option) =>
              getLocationRecordLabel(moduleKey, option).toLowerCase() ===
              nextQuery.trim().toLowerCase(),
          );
          const nextValue = matchingOption ? String(matchingOption.id) : null;
          setSelectedValue(nextValue);
          onChange(nextValue);
        }}
      />
      {isOpen && optionCount > 0 ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = isLookupOptionSelected(option, selectedValue);
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                className={
                  activeIndex === index
                    ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="min-w-0 truncate">
                  {getLocationRecordLabel(moduleKey, option)}
                </span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>
            );
          })}
          {canCreate ? (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === filteredOptions.length}
              className={
                activeIndex === filteredOptions.length
                  ? "block w-full cursor-pointer rounded-lg bg-muted px-3 py-2 text-left text-sm font-medium text-primary"
                  : "block w-full cursor-pointer rounded-lg bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              }
              onMouseDown={async (event) => {
                event.preventDefault();
                await createAndSelect();
              }}
            >
              + Create {locationLookupLabel(moduleKey)} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function updateCollectionItem<T extends object>(
  field: {
    readonly state: { readonly value: readonly T[] };
    readonly handleChange: (value: readonly T[]) => void;
  },
  index: number,
  patch: Partial<T>,
) {
  field.handleChange(
    field.state.value.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ),
  );
}

function CompanyLogoUploadDialog({
  currentFileName,
  onClose,
  onUploaded,
  variantType,
}: {
  readonly currentFileName: string;
  readonly onClose: () => void;
  readonly onUploaded: (record: MediaItemRecord) => void;
  readonly variantType: (typeof companyLogoVariants)[number]["type"];
}) {
  const [targetFileName, setTargetFileName] = useState(currentFileName || defaultLogoFileName(variantType));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileNames, setExistingFileNames] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [overwriteReady, setOverwriteReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const activeCompanyId = readStoredApplicationContext()?.company.id ?? null;
  const normalizedCurrentFileName = trimLogoStoragePath(currentFileName);

  useEffect(() => {
    if (!activeCompanyId) {
      setExistingFileNames([]);
      return;
    }

    const controller = new AbortController();
    void listMedia({
      companyId: activeCompanyId,
      folder: "logo",
      signal: controller.signal,
      visibility: "public",
    })
      .then((items) => setExistingFileNames(items.map((item) => item.fileName.toLowerCase())))
      .catch(() => setExistingFileNames([]));

    return () => controller.abort();
  }, [activeCompanyId]);

  async function submit(forceOverwrite = false) {
    if (!activeCompanyId) {
      setError("Active company context is required before uploading.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }

    if (!isSupportedImageFile(selectedFile)) {
      setError("Choose an image file such as SVG, PNG, JPG, WEBP, GIF, BMP, AVIF, ICO, or TIFF.");
      return;
    }

    const nextFileName = trimLogoStoragePath(targetFileName) || defaultLogoFileName(variantType);
    const normalizedNextFileName = nextFileName.toLowerCase();
    const hasExistingTargetFile = existingFileNames.includes(normalizedNextFileName);
    const isReplacingAssignedLogo =
      Boolean(normalizedCurrentFileName) &&
      normalizedCurrentFileName.toLowerCase() !== normalizedNextFileName;

    if (!forceOverwrite && (hasExistingTargetFile || isReplacingAssignedLogo)) {
      setOverwriteReady(true);
      setError(
        hasExistingTargetFile
          ? `File ${nextFileName} already exists in ${companyLogoBasePath}. Upload again to overwrite it.`
          : `This will replace the current ${variantType} file ${normalizedCurrentFileName} with ${nextFileName}. Upload again to confirm.`,
      );
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const renamedFile = new File([selectedFile], nextFileName, { type: selectedFile.type });
      const uploaded = await uploadMediaFile({
        companyId: activeCompanyId,
        file: renamedFile,
        folder: "logo",
        overwrite: forceOverwrite,
        visibility: "public",
      });
      if (
        isReplacingAssignedLogo &&
        shouldDeletePriorLogoFile(normalizedCurrentFileName, variantType)
      ) {
        await deleteMediaFile({
          companyId: activeCompanyId,
          path: `logo/${normalizedCurrentFileName}`,
          visibility: "public",
        }).catch(() => undefined);
      }
      toast.success("Logo uploaded", {
        description: `${uploaded.fileName} is available in ${companyLogoBasePath}.`,
      });
      onUploaded(uploaded);
    } catch (uploadError) {
      const message = getErrorMessage(uploadError);
      if (message.includes("same name already exists") && !forceOverwrite) {
        setOverwriteReady(true);
        setError(`File ${nextFileName} already exists in ${companyLogoBasePath}. Upload again to overwrite it.`);
      } else {
        setError(message);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-2 backdrop-blur-sm sm:p-4">
      <div className="w-[min(680px,calc(100vw-1rem))] rounded-2xl border border-border/70 bg-card p-5 shadow-2xl sm:w-[min(720px,calc(100vw-2rem))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Upload {variantType}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Files are stored in `{companyLogoBasePath}` and linked back into this company record.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-5 grid gap-4">
          <FieldShell label="Stored file name" error={null}>
            <Input
              className="h-11 rounded-xl"
              value={targetFileName}
              onChange={(event) => {
                setTargetFileName(trimLogoStoragePath(event.target.value));
                setOverwriteReady(false);
                setError(null);
              }}
            />
          </FieldShell>
          <FieldShell label="Choose file" error={null}>
            <Input
              className="h-11 rounded-xl px-3 py-2"
              accept="image/*,.svg,.ico,.avif,.bmp,.tif,.tiff"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setSelectedFile(nextFile);
                if (nextFile) {
                  setTargetFileName((current) =>
                    syncLogoFileNameExtension(
                      trimLogoStoragePath(current) || defaultLogoFileName(variantType),
                      nextFile.name,
                    ),
                  );
                }
                setOverwriteReady(false);
                setError(null);
              }}
            />
          </FieldShell>
          <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Final path: <span className="font-medium text-foreground">{buildLogoStoragePath(targetFileName || defaultLogoFileName(variantType))}</span>
          </div>
          {error ? (
            <div
              className={
                overwriteReady
                  ? "flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  : "rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              }
            >
              {overwriteReady ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : null}
              <span>{error}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <Button
            type="button"
            className="rounded-xl"
            disabled={!selectedFile || isUploading}
            onClick={() => void submit(overwriteReady)}
          >
            <ImagePlus className="size-4" />
            {overwriteReady ? "Overwrite file" : "Upload file"}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyBankQrUploadDialog({
  companyId,
  currentFileName,
  onClose,
  onUploaded,
}: {
  readonly companyId: number | undefined;
  readonly currentFileName: string;
  readonly onClose: () => void;
  readonly onUploaded: (record: MediaItemRecord) => void;
}) {
  const [targetFileName, setTargetFileName] = useState(trimBankQrStoragePath(currentFileName));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function submit() {
    if (!companyId) {
      setError("Save the company before uploading account QR images.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a QR image to upload.");
      return;
    }

    if (!isSupportedImageFile(selectedFile)) {
      setError("Choose an image file such as PNG, JPG, WEBP, SVG, or AVIF.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileName = trimBankQrStoragePath(targetFileName) || selectedFile.name;
      const renamedFile = new File([selectedFile], fileName, { type: selectedFile.type });
      const uploaded = await uploadMediaFile({
        companyId: String(companyId),
        file: renamedFile,
        folder: "bank-qr",
        overwrite: true,
        visibility: "public",
      });
      toast.success("QR image uploaded", {
        description: uploaded.publicUrl ?? buildBankQrStoragePath(uploaded.fileName),
      });
      onUploaded(uploaded);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-2 backdrop-blur-sm sm:p-4">
      <div className="w-[min(560px,calc(100vw-1rem))] rounded-2xl border border-border/70 bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Upload account QR</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Files are stored in `{companyBankQrBasePath}` and linked to this bank account.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-5 grid gap-4">
          <FieldShell label="Stored file name" error={null}>
            <Input
              className="h-11 rounded-xl"
              value={targetFileName}
              placeholder="account-qr.png"
              onChange={(event) => setTargetFileName(trimBankQrStoragePath(event.target.value))}
            />
          </FieldShell>
          <FieldShell label="Choose QR image" error={null}>
            <Input
              className="h-11 rounded-xl px-3 py-2"
              accept="image/*,.svg,.ico,.avif,.bmp,.tif,.tiff"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setSelectedFile(nextFile);
                if (nextFile && !targetFileName) setTargetFileName(nextFile.name);
                setError(null);
              }}
            />
          </FieldShell>
          <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            Final path:{" "}
            <span className="font-medium text-foreground">
              {buildBankQrStoragePath(targetFileName || selectedFile?.name || "account-qr.png")}
            </span>
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <Button
            type="button"
            className="rounded-xl"
            disabled={!selectedFile || isUploading || !companyId}
            onClick={() => void submit()}
          >
            <ImagePlus className="size-4" />
            Upload QR
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function getLogoVariantUrl(
  logos: readonly CompanyUpsertInput["logos"][number][],
  logoType: string,
) {
  return (
    logos.find((logo) => normalizeLogoType(logo.logoType) === normalizeLogoType(logoType))
      ?.logoUrl ?? ""
  );
}

function getLogoVariantFileName(
  logos: readonly CompanyUpsertInput["logos"][number][],
  logoType: string,
) {
  return trimLogoStoragePath(getLogoVariantUrl(logos, logoType));
}

function updateLogoVariantUrl(
  logos: readonly CompanyUpsertInput["logos"][number][],
  logoType: string,
  logoUrl: string,
) {
  const normalizedType = normalizeLogoType(logoType);
  const nextLogo = { logoType, logoUrl, isActive: true };
  const hasExistingLogo = logos.some((logo) => normalizeLogoType(logo.logoType) === normalizedType);

  if (!hasExistingLogo) return [...logos, nextLogo];

  return logos.map((logo) =>
    normalizeLogoType(logo.logoType) === normalizedType ? { ...logo, logoUrl, logoType } : logo,
  );
}

function updateLogoVariantFileName(
  logos: readonly CompanyUpsertInput["logos"][number][],
  logoType: string,
  fileName: string,
) {
  return updateLogoVariantUrl(logos, logoType, canonicalLogoUrl(fileName, logoType));
}

function canonicalLogoUrl(fileName: string, logoType: string) {
  const trimmedFileName = trimLogoStoragePath(fileName);
  if (!trimmedFileName) {
    return buildLogoStoragePath(defaultLogoFileName(logoType));
  }
  return buildLogoStoragePath(trimmedFileName);
}

function buildLogoStoragePath(fileName: string) {
  return `${companyLogoBasePath}/${trimLogoStoragePath(fileName)}`;
}

function buildBankQrStoragePath(fileName: string) {
  return `${companyBankQrBasePath}/${trimBankQrStoragePath(fileName)}`;
}

function trimBankQrStoragePath(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return "";
  return trimmedValue
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?storage\/bank-qr\//i, "")
    .replace(/^\/+/, "");
}

function trimLogoStoragePath(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return "";
  return trimmedValue
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?storage\/logo\//i, "")
    .replace(/^\/+/, "");
}

function defaultLogoFileName(logoType: string) {
  const normalizedType = normalizeLogoType(logoType) as keyof typeof defaultCompanyLogoFileNames;
  return defaultCompanyLogoFileNames[normalizedType] ?? "logo.svg";
}

function shouldDeletePriorLogoFile(fileName: string, logoType: string) {
  const trimmedFileName = trimLogoStoragePath(fileName).toLowerCase();
  return trimmedFileName.length > 0 && trimmedFileName !== defaultLogoFileName(logoType).toLowerCase();
}

function syncLogoFileNameExtension(currentFileName: string, uploadedFileName: string) {
  const normalizedCurrent = trimLogoStoragePath(currentFileName) || "logo";
  const uploadedExtension = pathExtension(uploadedFileName);
  if (!uploadedExtension) {
    return normalizedCurrent;
  }

  const currentBaseName = normalizedCurrent.replace(/\.[^.]+$/g, "");
  return `${currentBaseName}${uploadedExtension}`;
}

function pathExtension(fileName: string) {
  const match = /\.[^.]+$/.exec(fileName.trim());
  return match?.[0].toLowerCase() ?? "";
}

function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }

  return [
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
  ].includes(pathExtension(file.name));
}

function normalizeLogoType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCompanyLogos(value: CompanyUpsertInput): CompanyUpsertInput {
  return {
    ...value,
    logos: value.logos.map((logo) => ({
      ...logo,
      logoUrl: canonicalLogoUrl(logo.logoUrl, logo.logoType),
    })),
  };
}

const companyValidationFieldLabels: Record<string, string> = {
  tenantId: "Tenant",
  industryId: "Industry",
  code: "Company code",
  name: "Company name",
  legalName: "Legal name",
  tagline: "Tagline",
  shortAbout: "Short about",
  gstinUin: "GSTIN",
  pan: "PAN",
  dateOfIncorporation: "Date of incorporation",
  msmeNo: "MSME No",
  msmeCategory: "MSME Category",
  tan: "TAN No",
  tdsSection: "TDS Section",
  tdsRatePercent: "TDS Rate %",
  tcsSection: "TCS Section",
  tcsRatePercent: "TCS Rate %",
  website: "Website",
  description: "Description",
  primaryEmail: "Primary email",
  primaryPhone: "Primary phone",
};

function buildCompanyValidationErrors(
  issues: readonly {
    readonly path: readonly (string | number | symbol)[];
    readonly message: string;
  }[],
) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const [fieldName] = issue.path;
    if (typeof fieldName !== "string" || errors[fieldName]) continue;
    errors[fieldName] = issue.message;
  }
  return errors;
}

function buildValidationBannerMessage(errors: Record<string, string>) {
  const labels = Object.keys(errors).map(
    (fieldName) => companyValidationFieldLabels[fieldName] ?? fieldName,
  );
  return labels.length
    ? `Resolve validation errors before saving. Required fields: ${labels.join(", ")}.`
    : "Resolve validation errors before saving.";
}

function TextField({
  form,
  label,
  name,
  type = "text",
}: {
  readonly form: any;
  readonly label: string;
  readonly name: keyof CompanyUpsertInput;
  readonly type?: string;
}) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <FieldShell label={label} error={field.state.meta.errors[0]}>
          <Input
            type={type}
            className="h-11 rounded-xl"
            value={field.state.value ?? ""}
            onChange={(event) => field.handleChange(event.target.value || null)}
          />
        </FieldShell>
      )}
    </form.Field>
  );
}

function NumberField({
  form,
  label,
  name,
}: {
  readonly form: any;
  readonly label: string;
  readonly name: keyof CompanyUpsertInput;
}) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <FieldShell label={label} error={field.state.meta.errors[0]}>
          <Input
            type="number"
            className="h-11 rounded-xl"
            value={field.state.value ?? ""}
            onChange={(event) =>
              field.handleChange(event.target.value === "" ? null : Number(event.target.value))
            }
          />
        </FieldShell>
      )}
    </form.Field>
  );
}

function SwitchField({
  description,
  form,
  label,
  name,
}: {
  readonly description: string;
  readonly form: any;
  readonly label: string;
  readonly name: "isPrimary" | "isActive" | "tdsAvailable" | "tcsAvailable";
}) {
  return (
    <form.Field name={name}>
      {(field: any) => (
        <label
          className={
            field.state.value
              ? "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
              : "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3"
          }
        >
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-muted-foreground">{description}</span>
          </span>
          <Switch
            checked={field.state.value}
            aria-label={label}
            onCheckedChange={(checked) => field.handleChange(checked)}
          />
        </label>
      )}
    </form.Field>
  );
}

function defaultCompanyFormValues(
  company: CompanyRecord | null,
  tenantId = 1,
  industryId = 1,
): CompanyUpsertInput {
  return {
    tenantId: company?.tenantId ?? tenantId,
    industryId: company?.industryId ?? industryId,
    code: company?.code ?? "",
    name: company?.name ?? "",
    legalName: company?.legalName ?? null,
    tagline: company?.tagline ?? null,
    shortAbout: company?.shortAbout ?? null,
    gstinUin: company?.gstinUin ?? null,
    pan: company?.pan ?? null,
    dateOfIncorporation: company?.dateOfIncorporation ?? null,
    msmeNo: company?.msmeNo ?? null,
    msmeCategory: company?.msmeCategory ?? null,
    tan: company?.tan ?? null,
    tdsAvailable: company?.tdsAvailable ?? false,
    tdsSection: company?.tdsSection ?? null,
    tdsRatePercent: company?.tdsRatePercent ?? null,
    tcsAvailable: company?.tcsAvailable ?? false,
    tcsSection: company?.tcsSection ?? null,
    tcsRatePercent: company?.tcsRatePercent ?? null,
    website: company?.website ?? null,
    description: company?.description ?? null,
    primaryEmail: company?.primaryEmail ?? null,
    primaryPhone: company?.primaryPhone ?? null,
    isPrimary: company?.isPrimary ?? false,
    isActive: company?.isActive ?? true,
    logos: companyLogoVariants.map((variant) => ({
      logoType: variant.type,
      logoUrl:
        company?.logos.find(
          (logo) => normalizeLogoType(logo.logoType) === normalizeLogoType(variant.type),
        )?.logoUrl ?? defaultCompanyLogoUrls[variant.type],
      isActive:
        company?.logos.find(
          (logo) => normalizeLogoType(logo.logoType) === normalizeLogoType(variant.type),
        )?.isActive ?? true,
    })),
    emails: company?.emails.length
      ? company.emails.map((email) => ({
          email: email.email,
          emailType: email.emailType,
          isActive: email.isActive,
        }))
      : [{ email: company?.primaryEmail ?? "", emailType: "Primary", isActive: true }],
    phones: company?.phones.length
      ? company.phones.map((phone) => ({
          phoneNumber: phone.phoneNumber,
          phoneType: phone.phoneType,
          isPrimary: phone.isPrimary,
          isActive: phone.isActive,
        }))
      : [
          {
            phoneNumber: company?.primaryPhone ?? "",
            phoneType: "Mobile",
            isPrimary: true,
            isActive: true,
          },
        ],
    socialLinks:
      company?.socialLinks.map((link) => ({
        platform: link.platform,
        url: link.url,
        isActive: link.isActive,
      })) ?? [],
    bankAccounts:
      company?.bankAccounts.map((bankAccount) => ({
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountHolderName: bankAccount.accountHolderName,
        ifsc: bankAccount.ifsc,
        branch: bankAccount.branch,
        qrImageUrl: bankAccount.qrImageUrl,
        isPrimary: bankAccount.isPrimary,
        isActive: bankAccount.isActive,
      })) ?? [],
    addresses:
      company?.addresses.map((address) => ({
        addressTypeId: address.addressTypeId,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        cityId: address.cityId,
        districtId: address.districtId,
        stateId: address.stateId,
        countryId: address.countryId,
        pincodeId: address.pincodeId,
        latitude: address.latitude,
        longitude: address.longitude,
        isDefault: address.isDefault,
        isActive: address.isActive,
      })) ?? [],
  };
}

function normalizeCompanyAddressTypes(
  value: CompanyUpsertInput,
  addressTypes: readonly CommonRecord[],
): CompanyUpsertInput {
  return {
    ...value,
    addresses: value.addresses.map((address) => ({
      ...address,
      addressTypeId:
        resolveAddressTypeValue(address.addressTypeId, addressTypes) ??
        getDefaultAddressTypeId(addressTypes) ??
        address.addressTypeId,
    })),
  };
}

function getDefaultAddressTypeId(addressTypes: readonly CommonRecord[]) {
  const [firstAddressType] = getAddressTypeSelectOptions(addressTypes);

  return firstAddressType?.value ?? null;
}

function resolveAddressTypeValue(value: string | null, addressTypes: readonly CommonRecord[]) {
  const selectOptions = getAddressTypeSelectOptions(addressTypes);
  if (!value) return getDefaultAddressTypeId(addressTypes);
  const directMatch = selectOptions.find((option) => option.value === String(value));
  if (directMatch) return directMatch.value;
  const labelMatch = getAddressTypeCandidates(value)
    .map((candidate) =>
      selectOptions.find(
        (option) => normalizeLookupText(option.label) === normalizeLookupText(candidate),
      ),
    )
    .find(Boolean);

  return labelMatch?.value ?? null;
}

function getAddressTypeSelectOptions(addressTypes: readonly CommonRecord[]) {
  return addressTypeDisplayOrder.reduce<ThemedSelectOption[]>((selectOptions, displayType) => {
    const record = addressTypes.find((option) =>
      displayType.matches.some((candidate) => matchesAddressTypeRecord(option, candidate)),
    );
    if (record) {
      selectOptions.push({ value: String(record.id), label: displayType.label });
    }
    return selectOptions;
  }, []);
}

function getAddressTypeCandidates(value: string) {
  const cleanValue = formatLookupFallback(value);
  return [cleanValue, cleanValue.replace(/\s+\d+$/g, "")].filter(Boolean);
}

function matchesAddressTypeRecord(option: CommonRecord, value: string) {
  const normalizedValue = normalizeLookupText(value);
  return (
    normalizeLookupText(getCommonRecordLabel(option)) === normalizedValue ||
    normalizeLookupText(String(option.code ?? "")) === normalizedValue
  );
}

function normalizeLookupText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getCancelPath(companyId: number | undefined, isEdit: boolean, returnTo: "list" | "show") {
  if (!isEdit || !companyId || returnTo === "list") return "/desk/company";
  return `/desk/company/${companyId}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatIndustryLabel(code: string | null | undefined, name: string) {
  return code ? `${code} - ${name}` : name;
}

function formatCompanyLabel(code: string | null | undefined, name: string) {
  return code ? `${code} - ${name}` : name;
}

function normalizeCodeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+/, "");
}

async function loadLocationLookups(signal: AbortSignal): Promise<LocationLookupMap> {
  const [countries, states, districts, cities, pincodes] = await Promise.all([
    listCommonRecords("countries", { signal }),
    listCommonRecords("states", { signal }),
    listCommonRecords("districts", { signal }),
    listCommonRecords("cities", { signal }),
    listCommonRecords("pincodes", { signal }),
  ]);

  return { countries, states, districts, cities, pincodes };
}

function buildLocationCreatePayload(
  moduleKey: LocationLookupKey,
  label: string,
  address: CompanyUpsertInput["addresses"][number],
) {
  const code = toLookupCode(label);
  switch (moduleKey) {
    case "countries":
      return { code, name: label, phoneCode: null, isActive: true };
    case "states": {
      const countryId = toNumericId(address.countryId);
      return countryId ? { countryId, code, name: label, isActive: true } : null;
    }
    case "districts": {
      const stateId = toNumericId(address.stateId);
      return stateId ? { stateId, code, name: label, isActive: true } : null;
    }
    case "cities": {
      const stateId = toNumericId(address.stateId);
      const districtId = toNumericId(address.districtId);
      return stateId && districtId
        ? { stateId, districtId, code, name: label, isActive: true }
        : null;
    }
    case "pincodes": {
      const countryId = toNumericId(address.countryId);
      const stateId = toNumericId(address.stateId);
      const districtId = toNumericId(address.districtId);
      const cityId = toNumericId(address.cityId);
      return countryId && stateId && districtId && cityId
        ? {
            countryId,
            stateId,
            districtId,
            cityId,
            code: label,
            areaName: null,
            isActive: true,
          }
        : null;
    }
  }
}

function getCommonRecordLabel(record: CommonRecord) {
  const name = typeof record.name === "string" ? record.name : "";
  const code = typeof record.code === "string" ? record.code : "";
  const areaName = typeof record.areaName === "string" ? record.areaName : "";
  return name || areaName || code || String(record.id);
}

function findBankNameId(bankNames: readonly CommonRecord[], bankName: string) {
  const normalizedBankName = normalizeLookupText(bankName);
  if (!normalizedBankName) return null;
  const record = bankNames.find(
    (item) =>
      normalizeLookupText(getCommonRecordLabel(item)) === normalizedBankName ||
      normalizeLookupText(String(item.code ?? "")) === normalizedBankName,
  );
  return record ? String(record.id) : null;
}

function getLocationRecordLabel(moduleKey: LocationLookupKey, record: CommonRecord) {
  const code = typeof record.code === "string" ? record.code.trim() : "";
  if (moduleKey === "pincodes") return code || String(record.id);
  return getCommonRecordLabel(record);
}

function findLookupOption(options: readonly CommonRecord[], value: string | null) {
  if (!value) return undefined;
  return options.find((option) => isLookupOptionSelected(option, value));
}

function isLookupOptionSelected(option: CommonRecord, value: string | null) {
  if (!value) return false;
  const optionId = String(option.id);
  return optionId === String(value) || optionId === String(toNumericId(value));
}

function formatLookupFallback(value: string | null) {
  if (!value) return "";
  const rawValue = String(value);
  const [, suffix] = rawValue.split(":");
  return suffix ? titleCaseLookupValue(suffix) : rawValue;
}

function titleCaseLookupValue(value: string) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function locationLookupLabel(moduleKey: LocationLookupKey) {
  return (
    {
      countries: "Country",
      states: "State",
      districts: "District",
      cities: "City",
      pincodes: "Pincode",
    } as const
  )[moduleKey];
}

function toLookupCode(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function toNumericId(value: string | null) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}
