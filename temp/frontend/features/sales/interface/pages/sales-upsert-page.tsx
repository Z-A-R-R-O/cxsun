"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  MasterListPageFrame,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  SavePrintButtons,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  getSales,
  listSalesContactLookups,
  listSalesProductLookups,
  prepareSalesInput,
  upsertSales,
} from "../../application/sales-service";
import { getActiveCompany } from "../../../company/application/company-service";
import { getCoreEnvSettings } from "../../../settings/infrastructure/core-settings-api";
import { getNextDocumentNumber } from "../../../document-settings/infrastructure/document-settings-api";
import {
  defaultSalesInput,
  type SalesInput,
  type SalesLookupOption,
} from "../../domain/sales";
import { SalesVoucherTabs, salesTypeOptions } from "../components/sales-voucher-form";

export function SalesUpsertPage({ salesId }: { readonly salesId?: number }) {
  const router = useRouter();
  const { show } = useGlobalLoader();
  const isEdit = Boolean(salesId);
  const [form, setForm] = useState<SalesInput>(createSalesVoucherInput());
  const [contacts, setContacts] = useState<readonly SalesLookupOption[]>([]);
  const [diagnostic, setDiagnostic] = useState<SalesDiagnostic | null>(null);
  const [industryCode, setIndustryCode] = useState<string | null>(null);
  const [industryName, setIndustryName] = useState<string | null>(null);
  const [products, setProducts] = useState<readonly SalesLookupOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void listSalesContactLookups({ signal: controller.signal })
      .then(setContacts)
      .catch((error) => {
        if (isAbortError(error)) return;
        setContacts([]);
      });
    void listSalesProductLookups({ signal: controller.signal })
      .then(setProducts)
      .catch((error) => {
        if (isAbortError(error)) return;
        setProducts([]);
      });
    if (!salesId) {
      void getNextDocumentNumber("sales", { signal: controller.signal })
        .then((setting) => {
          if (controller.signal.aborted) return;
          if (!setting.autoEnabled) {
            setForm((current) => ({ ...current, autoDocumentNo: false }));
            return;
          }
          setForm((current) =>
            current.autoDocumentNo || !current.documentNo.trim()
              ? { ...current, autoDocumentNo: true, documentNo: setting.preview }
              : current,
          );
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            toast.error("Could not load next invoice number", {
              description: getErrorMessage(error),
            });
          }
        });
    }
    void Promise.all([
      getActiveCompany({ signal: controller.signal }),
      getCoreEnvSettings({ signal: controller.signal }).catch(() => null),
    ])
      .then(([company, settings]) => {
        if (controller.signal.aborted) return;
        setIndustryCode(getAppTypeFromSettings(settings) ?? company?.industryCode ?? null);
        setIndustryName(company?.industryName ?? null);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setIndustryCode(null);
        setIndustryName(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!salesId) return;
    const hide = show();
    void getSales(salesId)
      .then((record) => {
        if (!record) return;
        setDiagnostic(null);
        setForm({
          ...defaultSalesInput(),
          ...record,
          autoDocumentNo: false,
          documentDate: record.documentDate.slice(0, 10),
          dueDate: record.dueDate ? record.dueDate.slice(0, 10) : null,
          eInvoiceAckDate: record.eInvoiceAckDate ? record.eInvoiceAckDate.slice(0, 10) : null,
          ewayBillDate: record.ewayBillDate ? record.ewayBillDate.slice(0, 10) : null,
          placeOfSupply: record.placeOfSupply ?? salesTypeOptions[0].value,
        });
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        setDiagnostic({
          message,
          source: `GET /entries/sales/${salesId}`,
          title: "Could not load sales invoice",
        });
        toast.error("Could not load sales invoice", { description: message });
      })
      .finally(hide);
  }, [salesId, show]);

  async function save(printAfterSave = false) {
    const hide = show();
    try {
      const saved = await upsertSales(prepareSalesInput(form), salesId);
      setDiagnostic(null);
      toast.success(isEdit ? "Sales updated" : "Sales created");
      if (printAfterSave) {
        router.push(`/desk/sales/${saved.id}?print=1`);
        return;
      }
      router.push(`/desk/sales/${saved.id}`);
    } catch (error) {
      const message = getErrorMessage(error);
      setDiagnostic({
        message,
        source: `${salesId ? "PATCH" : "POST"} /entries/sales${salesId ? `/${salesId}` : ""}`,
        title: "Could not save sales invoice",
      });
      toast.error("Could not save sales", {
        description: message,
      });
    } finally {
      hide();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href="/desk/sales">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        </div>
      }
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description="Create a tabbed sales voucher with item-level GST totals."
      technicalName="page.entries.sales.upsert"
      title={isEdit ? "Edit sales" : "New sales"}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <SalesVoucherTabs
                contacts={contacts}
                form={form}
                industryCode={industryCode}
                industryName={industryName}
                products={products}
                setForm={setForm}
              />
            </div>
            <div className="flex flex-wrap justify-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <SavePrintButtons saveLabel="Save" onSavePrint={() => void save(true)} />
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={salesId ? `/desk/sales/${salesId}` : "/desk/sales"}>
                  <ArrowLeft className="size-4" />
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </MasterListUpsertCard>
        {diagnostic ? <SalesDiagnosticBanner diagnostic={diagnostic} /> : null}
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

interface SalesDiagnostic {
  readonly message: string;
  readonly source: string;
  readonly title: string;
}

function SalesDiagnosticBanner({ diagnostic }: { readonly diagnostic: SalesDiagnostic }) {
  async function copyError() {
    const text = [
      diagnostic.title,
      `Source: ${diagnostic.source}`,
      `Message: ${diagnostic.message}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Error copied");
    } catch {
      toast.error("Could not copy error");
    }
  }

  return (
    <div className="relative rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 pr-12 text-sm">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 size-8 rounded-md text-destructive hover:bg-destructive/10"
        onClick={() => void copyError()}
        aria-label="Copy error"
      >
        <Copy className="size-4" />
      </Button>
      <div className="font-semibold text-destructive">{diagnostic.title}</div>
      <div className="mt-1 text-foreground">{diagnostic.message}</div>
      <div className="mt-2 font-mono text-xs text-muted-foreground">{diagnostic.source}</div>
    </div>
  );
}

function createSalesVoucherInput(): SalesInput {
  return {
    ...defaultSalesInput(),
    items: [],
    placeOfSupply: salesTypeOptions[0].value,
  };
}

function getAppTypeFromSettings(settings: Awaited<ReturnType<typeof getCoreEnvSettings>> | null) {
  return (
    settings?.groups
      .flatMap((group) => group.settings)
      .find((setting) => setting.key === "APP_TYPE")
      ?.value.trim() || null
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
