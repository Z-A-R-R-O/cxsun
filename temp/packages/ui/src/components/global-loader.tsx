"use client";

import * as React from "react";

import { cn } from "../lib";

type GlobalLoaderContextValue = {
  readonly isLoading: boolean;
  readonly show: () => () => void;
  readonly hideAll: () => void;
};

const GlobalLoaderContext = React.createContext<GlobalLoaderContextValue | null>(null);

export function GlobalLoaderProvider({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  const [pendingCount, setPendingCount] = React.useState(0);

  const show = React.useCallback(() => {
    let isStopped = false;
    setPendingCount((currentCount) => currentCount + 1);

    return () => {
      if (isStopped) {
        return;
      }

      isStopped = true;
      setPendingCount((currentCount) => Math.max(0, currentCount - 1));
    };
  }, []);

  const hideAll = React.useCallback(() => {
    setPendingCount(0);
  }, []);

  const value = React.useMemo(
    () => ({
      isLoading: pendingCount > 0,
      show,
      hideAll,
    }),
    [hideAll, pendingCount, show],
  );

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <GlobalLoader isVisible={value.isLoading} className={className} />
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = React.useContext(GlobalLoaderContext);

  if (!context) {
    throw new Error("useGlobalLoader must be used within GlobalLoaderProvider.");
  }

  return context;
}

export function GlobalLoader({
  className,
  isVisible,
}: {
  readonly className?: string;
  readonly isVisible: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/35 backdrop-blur-[1px] transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
      aria-hidden={!isVisible}
      role="status"
    >
      <div className="relative flex size-32 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-border/60 bg-background/80 shadow-[0_16px_40px_rgba(15,23,42,0.08)]" />
        <div className="absolute inset-1 rounded-full border border-border/45 bg-background/95" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-foreground/75 border-r-foreground/35 animate-spin" />
        <div className="absolute inset-3 rounded-full border border-border/30" />
        <div className="relative flex size-20 items-center justify-center rounded-full border border-border/70 bg-background shadow-sm">
          <picture className="inline-flex items-center justify-center">
            <source media="(prefers-color-scheme: dark)" srcSet="/storage/logo/logo-dark.svg" />
            <img
              src="/storage/logo/logo.svg"
              alt="cxnext"
              className="h-10 w-auto"
            />
          </picture>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
