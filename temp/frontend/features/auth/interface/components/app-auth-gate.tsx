"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readStoredAuthSession } from "../../infrastructure/session-storage";

export function AppAuthGate({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");

  useEffect(() => {
    const session = readStoredAuthSession();

    if (!session) {
      setStatus("blocked");
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setStatus("allowed");
  }, [pathname, router]);

  if (status !== "allowed") {
    return null;
  }

  return <>{children}</>;
}
