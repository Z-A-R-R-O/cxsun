"use client";

import Link from "next/link";
import { ChevronDown, Home } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cxnext/ui";
import { deskPortals, type DeskPortalDefinition } from "../../application/desk-registry";

export function DeskBreadcrumb({ activePortal }: { readonly activePortal: DeskPortalDefinition }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        Home
      </Link>
      <span className="text-muted-foreground">/</span>
      <Link href="/desk" className="text-muted-foreground hover:text-foreground">
        Desk
      </Link>
      <span className="text-muted-foreground">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {activePortal.label}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Select app</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {deskPortals.map((portal) => (
            <DropdownMenuItem key={portal.id} asChild>
              <Link href={portal.href}>{portal.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
