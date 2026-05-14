"use client";

import { GlobalLoaderProvider, useGlobalLoader } from "@cxnext/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoaderProvider>
        <RouteLoaderReset />
        {children}
      </GlobalLoaderProvider>
      <Toaster closeButton richColors position="top-right" />
    </QueryClientProvider>
  );
}

function RouteLoaderReset() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const { hideAll } = useGlobalLoader();

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    hideAll();
  }, [hideAll, pathname]);

  return null;
}
