import {
  hasPublishedCompanySoftwareSettings,
  loadCompanySoftwareSettings,
} from "../../settings/application/software-settings-service";
import { readStoredApplicationContext } from "../../auth/infrastructure/session-storage";
import { getSalesIndustryKind, type SalesIndustryKind } from "../domain/sales";

export interface SalesBillingLayout {
  readonly usePo: boolean;
  readonly useDc: boolean;
  readonly useColour: boolean;
  readonly useSize: boolean;
  readonly useEInvoice: boolean;
  readonly useEway: boolean;
}

export function resolveSalesBillingLayout(industryValue: string | null | undefined) {
  const companyId = readStoredApplicationContext()?.company.id ?? null;
  if (hasPublishedCompanySoftwareSettings(companyId)) {
    return salesLayoutFromSettings(loadCompanySoftwareSettings(companyId).salesBillingLayout);
  }

  return salesLayoutFromIndustry(getSalesIndustryKind(industryValue));
}

export function salesLayoutFromSettings(
  settings: readonly { readonly id: string; readonly enabled: boolean }[],
) {
  const enabledById = new Map(settings.map((setting) => [setting.id, setting.enabled]));
  return {
    usePo: enabledById.get("sales-use-po") ?? true,
    useDc: enabledById.get("sales-use-dc") ?? true,
    useColour: enabledById.get("sales-use-colour") ?? false,
    useSize: enabledById.get("sales-use-size") ?? false,
    useEInvoice: enabledById.get("sales-use-einvoice") ?? true,
    useEway: enabledById.get("sales-use-eway") ?? true,
  } satisfies SalesBillingLayout;
}

export function salesLayoutFromIndustry(kind: SalesIndustryKind): SalesBillingLayout {
  if (kind === "garment") {
    return {
      usePo: false,
      useDc: false,
      useColour: true,
      useSize: true,
      useEInvoice: true,
      useEway: true,
    };
  }

  if (kind === "offset") {
    return {
      usePo: true,
      useDc: true,
      useColour: false,
      useSize: false,
      useEInvoice: false,
      useEway: true,
    };
  }

  return {
    usePo: false,
    useDc: false,
    useColour: false,
    useSize: true,
    useEInvoice: false,
    useEway: true,
  };
}
