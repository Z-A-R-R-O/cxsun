import {
  defaultSoftwareSettingsState,
  type FavoriteDashboardApp,
  type SoftwareSettingsState,
  type SoftwareToggleSetting,
} from "../domain/software-settings";
import { getCompanySetting, saveCompanySetting } from "../infrastructure/company-settings-api";

export const softwareSettingsStorageKey = "cxnext-software-settings";
export const companySoftwareSettingsStorageKeyPrefix = `${softwareSettingsStorageKey}:company:`;

export function loadSoftwareSettings(): SoftwareSettingsState {
  if (typeof window === "undefined") {
    return defaultSoftwareSettingsState;
  }

  const storedValue = window.localStorage.getItem(softwareSettingsStorageKey);
  if (!storedValue) {
    return defaultSoftwareSettingsState;
  }

  try {
    return mergeSoftwareSettings(
      defaultSoftwareSettingsState,
      JSON.parse(storedValue) as Partial<SoftwareSettingsState>,
    );
  } catch {
    return defaultSoftwareSettingsState;
  }
}

export function saveSoftwareSettings(state: SoftwareSettingsState) {
  window.localStorage.setItem(softwareSettingsStorageKey, JSON.stringify(state));
}

export function hasPublishedSoftwareSettings() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(softwareSettingsStorageKey))
  );
}

export function loadCompanySoftwareSettings(companyId: string | null | undefined) {
  if (!companyId) {
    return defaultSoftwareSettingsState;
  }

  return loadSoftwareSettingsFromKey(companySoftwareSettingsStorageKey(companyId));
}

export function saveCompanySoftwareSettings(
  companyId: string | null | undefined,
  state: SoftwareSettingsState,
) {
  if (!companyId) {
    return;
  }

  window.localStorage.setItem(companySoftwareSettingsStorageKey(companyId), JSON.stringify(state));
}

export async function loadCompanySoftwareSettingsFromServer(
  companyId: string | null | undefined,
  options?: { readonly signal?: AbortSignal },
) {
  if (!companyId) {
    return defaultSoftwareSettingsState;
  }

  const record = await getCompanySetting<Partial<SoftwareSettingsState>>(
    "software",
    companyId,
    options,
  );
  const state = mergeSoftwareSettings(defaultSoftwareSettingsState, record.values);
  saveCompanySoftwareSettings(companyId, state);
  return state;
}

export async function saveCompanySoftwareSettingsToServer(
  companyId: string | null | undefined,
  state: SoftwareSettingsState,
  options?: { readonly signal?: AbortSignal },
) {
  if (!companyId) {
    return state;
  }

  const record = await saveCompanySetting<Partial<SoftwareSettingsState>>(
    "software",
    companyId,
    state,
    options,
  );
  const savedState = mergeSoftwareSettings(defaultSoftwareSettingsState, record.values);
  saveCompanySoftwareSettings(companyId, savedState);
  return savedState;
}

export function hasPublishedCompanySoftwareSettings(companyId: string | null | undefined) {
  if (typeof window === "undefined" || !companyId) {
    return false;
  }

  return Boolean(window.localStorage.getItem(companySoftwareSettingsStorageKey(companyId)));
}

export function updateCustomiseSetting(
  state: SoftwareSettingsState,
  settingId: string,
  enabled: boolean,
): SoftwareSettingsState {
  return {
    ...state,
    customiseGroups: state.customiseGroups.map((group) => ({
      ...group,
      settings: updateToggleList(group.settings, settingId, enabled),
    })),
  };
}

export function updateSalesBillingLayoutSetting(
  state: SoftwareSettingsState,
  settingId: string,
  enabled: boolean,
): SoftwareSettingsState {
  return {
    ...state,
    salesBillingLayout: updateToggleList(state.salesBillingLayout, settingId, enabled),
  };
}

export function updateSalesPrintingSetting(
  state: SoftwareSettingsState,
  settingId: string,
  enabled: boolean,
): SoftwareSettingsState {
  return {
    ...state,
    salesPrintingSettings: updateToggleList(state.salesPrintingSettings, settingId, enabled),
  };
}

export function updateSalesPrintingOption(
  state: SoftwareSettingsState,
  key: keyof SoftwareSettingsState["salesPrintingOptions"],
  value: string,
): SoftwareSettingsState {
  return {
    ...state,
    salesPrintingOptions: {
      ...state.salesPrintingOptions,
      [key]: value,
    },
  };
}

export function updateSalesDocumentSetting(
  state: SoftwareSettingsState,
  key: keyof SoftwareSettingsState["salesDocumentSettings"],
  value: string,
): SoftwareSettingsState {
  return {
    ...state,
    salesDocumentSettings: {
      ...state.salesDocumentSettings,
      [key]: value,
    },
  };
}

export function updateDutiesTaxSetting(
  state: SoftwareSettingsState,
  key: keyof SoftwareSettingsState["dutiesTaxSettings"],
  value: string,
): SoftwareSettingsState {
  return {
    ...state,
    dutiesTaxSettings: {
      ...state.dutiesTaxSettings,
      [key]: value,
    },
  };
}

export function updateFeatureSetting(
  state: SoftwareSettingsState,
  settingId: string,
  enabled: boolean,
): SoftwareSettingsState {
  return {
    ...state,
    features: updateToggleList(state.features, settingId, enabled),
  };
}

export function updateFavoriteDashboardApp(
  state: SoftwareSettingsState,
  favoriteDashboardApp: FavoriteDashboardApp,
): SoftwareSettingsState {
  return {
    ...state,
    favoriteDashboardApp,
  };
}

function updateToggleList(
  settings: readonly SoftwareToggleSetting[],
  settingId: string,
  enabled: boolean,
) {
  return settings.map((setting) => (setting.id === settingId ? { ...setting, enabled } : setting));
}

function mergeSoftwareSettings(
  defaults: SoftwareSettingsState,
  storedState: Partial<SoftwareSettingsState>,
): SoftwareSettingsState {
  const storedCustomiseSettings = new Map(
    (storedState.customiseGroups ?? [])
      .flatMap((group) => group.settings ?? [])
      .map((setting) => [setting.id, setting.enabled]),
  );
  const storedFeatures = new Map(
    (storedState.features ?? []).map((setting) => [setting.id, setting.enabled]),
  );
  const storedSalesBillingLayout = new Map(
    (storedState.salesBillingLayout ?? []).map((setting) => [setting.id, setting.enabled]),
  );
  const storedSalesPrintingSettings = new Map(
    (storedState.salesPrintingSettings ?? []).map((setting) => [setting.id, setting.enabled]),
  );

  return {
    favoriteDashboardApp: normalizeFavoriteDashboardApp(storedState.favoriteDashboardApp),
    dutiesTaxSettings: {
      ...defaults.dutiesTaxSettings,
      ...(storedState.dutiesTaxSettings ?? {}),
    },
    salesDocumentSettings: {
      ...defaults.salesDocumentSettings,
      ...(storedState.salesDocumentSettings ?? {}),
    },
    salesPrintingOptions: {
      ...defaults.salesPrintingOptions,
      ...(storedState.salesPrintingOptions ?? {}),
    },
    salesBillingLayout: defaults.salesBillingLayout.map((setting) => ({
      ...setting,
      enabled: storedSalesBillingLayout.get(setting.id) ?? setting.enabled,
    })),
    salesPrintingSettings: defaults.salesPrintingSettings.map((setting) => ({
      ...setting,
      enabled: storedSalesPrintingSettings.get(setting.id) ?? setting.enabled,
    })),
    customiseGroups: defaults.customiseGroups.map((group) => ({
      ...group,
      settings: group.settings.map((setting) => ({
        ...setting,
        enabled: storedCustomiseSettings.get(setting.id) ?? setting.enabled,
      })),
    })),
    features: defaults.features.map((setting) => ({
      ...setting,
      enabled: storedFeatures.get(setting.id) ?? setting.enabled,
    })),
  };
}

function loadSoftwareSettingsFromKey(storageKey: string) {
  if (typeof window === "undefined") {
    return defaultSoftwareSettingsState;
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return defaultSoftwareSettingsState;
  }

  try {
    return mergeSoftwareSettings(
      defaultSoftwareSettingsState,
      JSON.parse(storedValue) as Partial<SoftwareSettingsState>,
    );
  } catch {
    return defaultSoftwareSettingsState;
  }
}

function companySoftwareSettingsStorageKey(companyId: string) {
  return `${companySoftwareSettingsStorageKeyPrefix}${companyId}`;
}

function normalizeFavoriteDashboardApp(value: unknown): FavoriteDashboardApp {
  return value === "billing" ? "billing" : "application";
}
