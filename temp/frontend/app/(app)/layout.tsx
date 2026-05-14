import type { ReactNode } from "react";
import { AppAuthGate } from "../../features/auth/interface/components/app-auth-gate";
import { DeskShell } from "../../features/desk/interface/shell/desk-shell";

export default function AppLayout({ children }: { readonly children: ReactNode }) {
  return (
    <AppAuthGate>
      <DeskShell>{children}</DeskShell>
    </AppAuthGate>
  );
}
