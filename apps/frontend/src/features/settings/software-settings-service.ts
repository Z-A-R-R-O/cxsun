import type { AuthSession } from "src/features/auth/auth-client"
import { getCompanySetting, saveCompanySetting } from "./company-settings-client"
import {
  defaultSoftwareSettingsState,
  type FavoriteDashboardApp,
  type SoftwareSettingsState,
  type SoftwareToggleSetting,
} from "./software-settings"

const storageKeyPrefix = "cxsun-software-settings:company:"

export function loadCompanySoftwareSettings(companyId: string | number | null | undefined) {
  if (!companyId) return defaultSoftwareSettingsState
  try {
    const stored = window.localStorage.getItem(companySoftwareSettingsStorageKey(companyId))
    return stored ? mergeSoftwareSettings(defaultSoftwareSettingsState, JSON.parse(stored) as Partial<SoftwareSettingsState>) : defaultSoftwareSettingsState
  } catch {
    return defaultSoftwareSettingsState
  }
}

export function saveCompanySoftwareSettings(companyId: string | number | null | undefined, state: SoftwareSettingsState) {
  if (!companyId) return
  window.localStorage.setItem(companySoftwareSettingsStorageKey(companyId), JSON.stringify(state))
}

export async function loadCompanySoftwareSettingsFromServer(session: AuthSession, companyId: string | number | null | undefined, options?: { signal?: AbortSignal }) {
  const record = await getCompanySetting<Partial<SoftwareSettingsState>>(session, "software", companyId, options)
  const state = mergeSoftwareSettings(defaultSoftwareSettingsState, record.values)
  saveCompanySoftwareSettings(companyId ?? record.companyId, state)
  return state
}

export async function saveCompanySoftwareSettingsToServer(session: AuthSession, companyId: string | number | null | undefined, state: SoftwareSettingsState, options?: { signal?: AbortSignal }) {
  const record = await saveCompanySetting<Partial<SoftwareSettingsState>>(session, "software", state, companyId, options)
  const saved = mergeSoftwareSettings(defaultSoftwareSettingsState, record.values)
  saveCompanySoftwareSettings(companyId ?? record.companyId, saved)
  return saved
}

export function updateToggleList(settings: readonly SoftwareToggleSetting[], settingId: string, enabled: boolean) {
  return settings.map((setting) => (setting.id === settingId ? { ...setting, enabled } : setting))
}

export function updateSalesBillingLayoutSetting(state: SoftwareSettingsState, settingId: string, enabled: boolean): SoftwareSettingsState {
  return { ...state, salesBillingLayout: updateToggleList(state.salesBillingLayout, settingId, enabled) }
}

export function updateSalesPrintingSetting(state: SoftwareSettingsState, settingId: string, enabled: boolean): SoftwareSettingsState {
  return { ...state, salesPrintingSettings: updateToggleList(state.salesPrintingSettings, settingId, enabled) }
}

export function updateSalesPrintingOption(state: SoftwareSettingsState, value: string): SoftwareSettingsState {
  return { ...state, salesPrintingOptions: { ...state.salesPrintingOptions, customTerms: value } }
}

export function updateLetterheadSetting<K extends keyof SoftwareSettingsState["letterheadSettings"]>(state: SoftwareSettingsState, key: K, value: SoftwareSettingsState["letterheadSettings"][K]): SoftwareSettingsState {
  return { ...state, letterheadSettings: { ...state.letterheadSettings, [key]: value } }
}

export function updateCustomiseSetting(state: SoftwareSettingsState, settingId: string, enabled: boolean): SoftwareSettingsState {
  return {
    ...state,
    customiseGroups: state.customiseGroups.map((group) => ({ ...group, settings: updateToggleList(group.settings, settingId, enabled) })),
  }
}

export function updateFeatureSetting(state: SoftwareSettingsState, settingId: string, enabled: boolean): SoftwareSettingsState {
  return { ...state, features: updateToggleList(state.features, settingId, enabled) }
}

function mergeSoftwareSettings(defaults: SoftwareSettingsState, storedState: Partial<SoftwareSettingsState>): SoftwareSettingsState {
  const storedCustomise = new Map((storedState.customiseGroups ?? []).flatMap((group) => group.settings ?? []).map((setting) => [setting.id, setting.enabled]))
  const storedFeatures = new Map((storedState.features ?? []).map((setting) => [setting.id, setting.enabled]))
  const storedLayout = new Map((storedState.salesBillingLayout ?? []).map((setting) => [setting.id, setting.enabled]))
  const storedPrinting = new Map((storedState.salesPrintingSettings ?? []).map((setting) => [setting.id, setting.enabled]))

  return {
    favoriteDashboardApp: normalizeFavoriteDashboardApp(storedState.favoriteDashboardApp),
    salesGstApiMode: normalizeSalesGstApiMode(storedState.salesGstApiMode),
    dutiesTaxSettings: { ...defaults.dutiesTaxSettings, ...(storedState.dutiesTaxSettings ?? {}) },
    letterheadSettings: { ...defaults.letterheadSettings, ...(storedState.letterheadSettings ?? {}) },
    salesPrintingOptions: { ...defaults.salesPrintingOptions, ...(storedState.salesPrintingOptions ?? {}) },
    salesBillingLayout: defaults.salesBillingLayout.map((setting) => ({ ...setting, enabled: storedLayout.get(setting.id) ?? setting.enabled })),
    salesPrintingSettings: defaults.salesPrintingSettings.map((setting) => ({ ...setting, enabled: storedPrinting.get(setting.id) ?? setting.enabled })),
    customiseGroups: defaults.customiseGroups.map((group) => ({
      ...group,
      settings: group.settings.map((setting) => ({ ...setting, enabled: storedCustomise.get(setting.id) ?? setting.enabled })),
    })),
    features: defaults.features.map((setting) => ({ ...setting, enabled: storedFeatures.get(setting.id) ?? setting.enabled })),
  }
}

function companySoftwareSettingsStorageKey(companyId: string | number) {
  return `${storageKeyPrefix}${companyId}`
}

function normalizeFavoriteDashboardApp(value: unknown): FavoriteDashboardApp {
  return value === "billing" ? "billing" : "application"
}

function normalizeSalesGstApiMode(value: unknown) {
  return value === "eway_only" ? "eway_only" : "einvoice_eway"
}
