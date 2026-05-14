import type { ReactNode } from "react";
import { BrandLogo } from "../../components/branding/brand-logo";

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo href="/" imageClassName="h-10" className="justify-center" />
        </div>
        <section className="w-full">{children}</section>
      </div>
    </main>
  );
}
