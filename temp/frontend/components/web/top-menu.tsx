import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@cxnext/ui";
import { BrandLogo } from "../branding/brand-logo";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function TopMenu() {
  return (
    <header className="border-b border-border bg-background/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <BrandLogo href="/" imageClassName="h-8" />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/desk">
              <LayoutDashboard />
              Desk
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
