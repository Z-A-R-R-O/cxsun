import type { ReactNode } from "react";
import { Footer } from "../../components/web/footer";
import { TopMenu } from "../../components/web/top-menu";

export default function WebLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopMenu />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
