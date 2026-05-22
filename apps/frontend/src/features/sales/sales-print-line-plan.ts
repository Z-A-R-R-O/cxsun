import type { SalesEntryItem } from "./sales-client"

export const salesPrintMinimumItemLineBudget = 25
export const salesPrintMaximumItemLineBudget = 25

export type SalesPrintLineRow =
  | {
      readonly index: number
      readonly item: SalesEntryItem
      readonly kind: "item"
      readonly lineCount: number
    }
  | {
      readonly index: number
      readonly kind: "blank"
    }

export function getSalesPrintLinePlan(items: readonly SalesEntryItem[]) {
  const itemLineCounts = items.map((item) => getSalesItemPrintLineCount(item))
  const lineBudget = getSalesPrintLineBudget(itemLineCounts)
  let usedLines = 0
  let requiresTwoPageTemplate = false
  const rows: SalesPrintLineRow[] = []

  items.forEach((item, index) => {
    const lineCount = itemLineCounts[index] ?? 1
    if (usedLines + lineCount > lineBudget) {
      requiresTwoPageTemplate = true
      return
    }

    usedLines += lineCount
    rows.push({ index, item, kind: "item", lineCount })
  })

  if (!requiresTwoPageTemplate) {
    for (let index = rows.length; usedLines < lineBudget; index += 1) {
      rows.push({ index, kind: "blank" })
      usedLines += 1
    }
  }

  return { lineBudget, requiresTwoPageTemplate, rows, usedLines }
}

export function getSalesItemPrintLineCount(item: SalesEntryItem) {
  return Math.max(
    getClampedPrintLineCount(item.product_name, 32),
    getClampedPrintLineCount(item.description ?? "", 30),
  )
}

export function getClampedPrintLineCount(value: string, charactersPerLine: number, maxLines = 3) {
  const lineCount = value
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(Array.from(line.trim()).length / charactersPerLine)), 0)
  return Math.min(maxLines, Math.max(1, lineCount))
}

export function getSalesPrintLineBudget(itemLineCounts: readonly number[]) {
  void itemLineCounts
  return salesPrintMinimumItemLineBudget
}
