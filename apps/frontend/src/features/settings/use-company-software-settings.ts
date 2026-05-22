import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import type { AuthSession } from "src/features/auth/auth-client"
import { listCompanies } from "src/features/company/company-client"
import { defaultSoftwareSettingsState, type SoftwareSettingsState } from "./software-settings"
import {
  loadCompanySoftwareSettings,
  loadCompanySoftwareSettingsFromServer,
  saveCompanySoftwareSettings,
  saveCompanySoftwareSettingsToServer,
} from "./software-settings-service"

export function useCompanySoftwareSettings(session: AuthSession) {
  const [state, setState] = useState<SoftwareSettingsState>(defaultSoftwareSettingsState)
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [companyName, setCompanyName] = useState("Active company")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void listCompanies(session)
      .then((companies) => {
        const company = companies.find((item) => item.isPrimary) ?? companies[0] ?? null
        setCompanyId(company?.id ?? null)
        setCompanyName(company?.name ?? "Active company")
        setState(loadCompanySoftwareSettings(company?.id))
        return loadCompanySoftwareSettingsFromServer(session, company?.id, { signal: controller.signal })
      })
      .then((settings) => {
        if (!controller.signal.aborted) setState(settings)
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          toast.error("Could not load company settings", { description: error instanceof Error ? error.message : "Using local settings for now." })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoaded(true)
      })

    return () => controller.abort()
  }, [session])

  async function saveNow(nextState = state) {
    saveCompanySoftwareSettings(companyId, nextState)
    const saved = await saveCompanySoftwareSettingsToServer(session, companyId, nextState)
    setState(saved)
    toast.success("Company settings saved", { description: `${companyName} settings are now shared across devices.` })
  }

  return [state, setState as Dispatch<SetStateAction<SoftwareSettingsState>>, { companyId, companyName, isLoaded, saveNow }] as const
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

