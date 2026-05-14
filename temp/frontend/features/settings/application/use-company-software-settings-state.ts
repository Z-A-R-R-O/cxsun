"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { readStoredApplicationContext } from "../../auth/infrastructure/session-storage";
import {
  loadCompanySoftwareSettings,
  loadCompanySoftwareSettingsFromServer,
  saveCompanySoftwareSettings,
  saveCompanySoftwareSettingsToServer,
} from "./software-settings-service";
import {
  defaultSoftwareSettingsState,
  type SoftwareSettingsState,
} from "../domain/software-settings";

interface CompanySoftwareSettingsContext {
  readonly companyId: string | null;
  readonly companyName: string;
}

interface CompanySoftwareSettingsActions {
  readonly isLoaded: boolean;
  readonly saveNow: () => Promise<void>;
}

export function useCompanySoftwareSettingsState() {
  const [state, setState] = useState<SoftwareSettingsState>(defaultSoftwareSettingsState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [context, setContext] = useState<CompanySoftwareSettingsContext>({
    companyId: null,
    companyName: "Active company",
  });
  const skipNextSave = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    const applicationContext = readStoredApplicationContext();
    const companyId = applicationContext?.company.id ?? null;
    setContext({
      companyId,
      companyName: applicationContext?.company.name ?? "Active company",
    });
    setState(loadCompanySoftwareSettings(companyId));

    if (!companyId) {
      setIsLoaded(true);
      return () => controller.abort();
    }

    void loadCompanySoftwareSettingsFromServer(companyId, { signal: controller.signal })
      .then((settings) => {
        if (controller.signal.aborted) return;
        setState(settings);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        toast.error("Could not load company settings", {
          description: error instanceof Error ? error.message : "Using local settings for now.",
        });
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        skipNextSave.current = true;
        setIsLoaded(true);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    saveCompanySoftwareSettings(context.companyId, state);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void saveCompanySoftwareSettingsToServer(context.companyId, state, {
        signal: controller.signal,
      }).catch((error: unknown) => {
        if (isAbortError(error)) return;
        toast.error("Could not save company settings", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [context.companyId, isLoaded, state]);

  async function saveNow() {
    saveCompanySoftwareSettings(context.companyId, state);
    await saveCompanySoftwareSettingsToServer(context.companyId, state);
    toast.success("Company settings saved", {
      description: `${context.companyName} settings are now shared across devices.`,
    });
  }

  return [
    state,
    setState as Dispatch<SetStateAction<SoftwareSettingsState>>,
    context,
    { isLoaded, saveNow },
  ] as const satisfies readonly [
    SoftwareSettingsState,
    Dispatch<SetStateAction<SoftwareSettingsState>>,
    CompanySoftwareSettingsContext,
    CompanySoftwareSettingsActions,
  ];
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
