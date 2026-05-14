import type { SalesIndustryKind, SalesItemInput } from "../../domain/sales";
import {
  salesLayoutFromIndustry,
  type SalesBillingLayout,
} from "../../application/sales-billing-layout-service";

export const salesPrintMinimumItemLineBudget = 25;
export const salesPrintMaximumItemLineBudget = 25;

export type SalesPrintLineRow =
  | {
      readonly index: number;
      readonly item: SalesItemInput;
      readonly kind: "item";
      readonly lineCount: number;
    }
  | {
      readonly index: number;
      readonly kind: "blank";
    };

export function getSalesPrintLinePlan(
  items: readonly SalesItemInput[],
  industryKind: SalesIndustryKind,
  salesLayout?: SalesBillingLayout,
): {
  readonly requiresTwoPageTemplate: boolean;
  readonly lineBudget: number;
  readonly rows: readonly SalesPrintLineRow[];
  readonly usedLines: number;
} {
  const itemLineCounts = items.map((item) =>
    getSalesItemPrintLineCount(item, industryKind, salesLayout),
  );
  const lineBudget = getSalesPrintLineBudget(itemLineCounts);
  let usedLines = 0;
  let requiresTwoPageTemplate = false;
  const rows: SalesPrintLineRow[] = [];

  items.forEach((item, index) => {
    const lineCount = itemLineCounts[index] ?? 1;
    if (usedLines + lineCount > lineBudget) {
      requiresTwoPageTemplate = true;
      return;
    }

    usedLines += lineCount;
    rows.push({ index, item, kind: "item", lineCount });
  });

  if (!requiresTwoPageTemplate) {
    for (let index = rows.length; usedLines < lineBudget; index += 1) {
      rows.push({ index, kind: "blank" });
      usedLines += 1;
    }
  }

  return { lineBudget, requiresTwoPageTemplate, rows, usedLines };
}

export function getSalesItemPrintLineCount(
  item: SalesItemInput,
  industryKind: SalesIndustryKind,
  salesLayout?: SalesBillingLayout,
) {
  const layout = salesLayout ?? salesLayoutFromIndustry(industryKind);
  const lineCounts = [getClampedPrintLineCount(item.productName, 32)];

  if (layout.usePo) lineCounts.push(getClampedPrintLineCount(item.poNo ?? "", 6));
  if (layout.useDc) lineCounts.push(getClampedPrintLineCount(item.dcNo ?? "", 6));
  if (layout.useSize) lineCounts.push(getClampedPrintLineCount(item.size ?? "", 8));
  if (layout.useColour) lineCounts.push(getClampedPrintLineCount(item.colour ?? "", 9));

  if (industryKind === "garment") {
    lineCounts.push(getClampedPrintLineCount(item.description ?? "", 24));
    return Math.max(...lineCounts);
  }

  if (industryKind === "upvc") {
    lineCounts.push(getClampedPrintLineCount(item.description ?? "", 30));
  }

  return Math.max(...lineCounts);
}

export function getClampedPrintLineCount(value: string, charactersPerLine: number, maxLines = 3) {
  const lineCount = value
    .split(/\r?\n/)
    .reduce(
      (sum, line) =>
        sum + Math.max(1, Math.ceil(Array.from(line.trim()).length / charactersPerLine)),
      0,
    );
  return Math.min(maxLines, Math.max(1, lineCount));
}

export function getSalesPrintLineBudget(itemLineCounts: readonly number[]) {
  void itemLineCounts;
  return salesPrintMinimumItemLineBudget;
}
