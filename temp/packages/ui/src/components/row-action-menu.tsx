"use client";

import { Eye, MoreHorizontal, Pencil, Printer, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export function RowActionMenu({
  editHref,
  isActive,
  onDelete,
  onPrint = printCurrentPage,
  onRestore,
  printHref,
  viewHref,
}: {
  readonly editHref: string;
  readonly isActive: boolean;
  readonly onDelete: () => void;
  readonly onPrint?: () => void;
  readonly onRestore: () => void;
  readonly printHref?: string;
  readonly viewHref: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1">
        <DropdownMenuItem asChild>
          <a href={viewHref} className="gap-2.5">
            <Eye className="size-4" />
            View
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={editHref} className="gap-2.5">
            <Pencil className="size-4" />
            Edit
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {printHref ? (
          <DropdownMenuItem asChild>
            <a href={printHref} className="gap-2.5">
              <Printer className="size-4" />
              Print
            </a>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="gap-2.5" onSelect={onPrint}>
            <Printer className="size-4" />
            Print
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem
            className="gap-2.5 text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="gap-2.5" onSelect={onRestore}>
            <RotateCcw className="size-4" />
            Restore
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function printCurrentPage() {
  window.print();
}
