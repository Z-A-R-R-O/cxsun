import { BrandLogo } from "../branding/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo imageClassName="h-8" />
          <p>cxnext platform foundation</p>
        </div>
        <p>Modular monolith, DDD, and event-ready by design.</p>
      </div>
    </footer>
  );
}
