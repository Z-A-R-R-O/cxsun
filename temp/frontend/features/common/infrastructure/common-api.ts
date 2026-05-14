import type { CommonModuleDefinition, CommonRecord } from "../domain/common-master";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

const commonEndpointByKey: Record<string, string> = {
  countries: "countries",
  states: "states",
  districts: "districts",
  cities: "cities",
  pincodes: "pincodes",
  contactGroups: "contact-groups",
  contactTypes: "contact-types",
  addressTypes: "address-types",
  bankNames: "bank-names",
  productGroups: "product-groups",
  productCategories: "product-categories",
  productTypes: "product-types",
  brands: "brands",
  colours: "colours",
  sizes: "sizes",
  styles: "styles",
  units: "units",
  hsnCodes: "hsn-codes",
  taxes: "taxes",
  warehouses: "warehouses",
  transports: "transports",
  destinations: "destinations",
  orderTypes: "order-types",
  stockRejectionTypes: "stock-rejection-types",
  currencies: "currencies",
  paymentTerms: "payment-terms",
  months: "months",
  accountingYear: "accounting-years",
};

export async function listCommonModules(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/common/modules`, {
    cache: "no-store",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Common metadata request failed with status ${response.status}.`);
  }

  return (await response.json()) as CommonModuleDefinition[];
}

export async function listCommonRecords(
  moduleKey: string,
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(`${getApiBaseUrl()}/common/${getCommonEndpoint(moduleKey)}`, {
    cache: "no-store",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Common list request failed with status ${response.status}.`);
  }

  return (await response.json()) as CommonRecord[];
}

export async function createCommonRecord(moduleKey: string, payload: Record<string, unknown>) {
  const response = await authFetch(
    `${getApiBaseUrl()}/common/${getCommonEndpoint(moduleKey)}`,
    request("POST", payload),
  );

  if (!response.ok) {
    throw new Error(
      await readCommonApiError(
        response,
        `Common create request failed with status ${response.status}.`,
      ),
    );
  }

  return (await response.json()) as CommonRecord;
}

export async function updateCommonRecord(
  moduleKey: string,
  id: number,
  payload: Record<string, unknown>,
) {
  const response = await authFetch(
    `${getApiBaseUrl()}/common/${getCommonEndpoint(moduleKey)}/${encodeURIComponent(String(id))}`,
    request("PATCH", payload),
  );

  if (!response.ok) {
    throw new Error(
      await readCommonApiError(
        response,
        `Common update request failed with status ${response.status}.`,
      ),
    );
  }

  return (await response.json()) as CommonRecord;
}

export async function dropCommonRecord(moduleKey: string, id: number) {
  const response = await authFetch(
    `${getApiBaseUrl()}/common/${getCommonEndpoint(moduleKey)}/${encodeURIComponent(String(id))}`,
    { cache: "no-store", method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(`Common drop request failed with status ${response.status}.`);
  }
}

export async function forceDeleteCommonRecord(moduleKey: string, id: number) {
  const response = await authFetch(
    `${getApiBaseUrl()}/common/${getCommonEndpoint(moduleKey)}/${encodeURIComponent(String(id))}?force=true`,
    { cache: "no-store", method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(`Common force delete request failed with status ${response.status}.`);
  }
}

function request(method: "POST" | "PATCH", payload: Record<string, unknown>) {
  return {
    body: JSON.stringify(payload),
    cache: "no-store" as const,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method,
  };
}

async function readCommonApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      readonly message?: unknown;
      readonly error?: unknown;
    };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Some responses are not JSON.
  }

  return fallback;
}

function getApiBaseUrl() {
  return getRequiredApiUrl();
}

function getCommonEndpoint(moduleKey: string) {
  return commonEndpointByKey[moduleKey] ?? moduleKey;
}
