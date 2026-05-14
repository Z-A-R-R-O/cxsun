"use client";

import { Printer, Save } from "lucide-react";
import { Button } from "./button";

export function SavePrintButtons({
  onSavePrint,
  saveLabel,
}: {
  readonly onSavePrint: () => void;
  readonly saveLabel: string;
}) {
  return (
    <>
      <Button type="submit" className="rounded-xl">
        <Save className="size-4" />
        {saveLabel}
      </Button>
      <Button type="button" variant="outline" className="rounded-xl" onClick={onSavePrint}>
        <Printer className="size-4" />
        Save & Print
      </Button>
    </>
  );
}
