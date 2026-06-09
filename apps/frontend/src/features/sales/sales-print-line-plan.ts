import type { SalesEntryItem } from "./sales-client"

export const salesPrintMinimumItemLineBudget = 12
export const salesPrintMaximumItemLineBudget = 12
export const salesPrintExtendedItemOnlyLineBudget = 24
export const salesPrintFinalTotalsLineBudget = 11

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
  void item
  return 1
}

export function getSalesItemPrintTextLineCount(item: SalesEntryItem) {
  return Math.max(
    getClampedPrintLineCount(item.product_name, 32),
    getClampedPrintLineCount(item.description ?? "", 30),
  )
}

export function getClampedPrintLineCount(value: string, charactersPerLine: number, maxLines = 2) {
  const lineCount = value
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(Array.from(line.trim()).length / charactersPerLine)), 0)
  return Math.min(maxLines, Math.max(1, lineCount))
}

export function getSalesPrintLineBudget(itemLineCounts: readonly number[]) {
  void itemLineCounts
  return salesPrintMinimumItemLineBudget
}

export function getSalesPrintPagedLinePlan(items: readonly SalesEntryItem[]) {
  const pages: Array<{
    readonly lineBudget: number
    readonly rows: SalesPrintLineRow[]
    readonly startIndex: number
    readonly usedLines: number
  }> = []
  let itemIndex = 0

  while (items.length - itemIndex > salesPrintFinalTotalsLineBudget) {
    const startIndex = itemIndex
    const lineBudget = salesPrintExtendedItemOnlyLineBudget
    const rows: SalesPrintLineRow[] = []
    let usedLines = 0

    while (itemIndex < items.length && usedLines < lineBudget) {
      const item = items[itemIndex]
      if (!item) break
      const lineCount = getSalesItemPrintLineCount(item)
      if (usedLines + lineCount > lineBudget) break
      rows.push({ index: itemIndex, item, kind: "item", lineCount })
      usedLines += lineCount
      itemIndex += 1
    }

    pages.push({ lineBudget, rows, startIndex, usedLines })
  }

  const finalStartIndex = itemIndex
  const finalRows: SalesPrintLineRow[] = []
  let finalUsedLines = 0
  while (itemIndex < items.length && finalUsedLines < salesPrintFinalTotalsLineBudget) {
    const item = items[itemIndex]
    if (!item) break
    const lineCount = getSalesItemPrintLineCount(item)
    if (finalUsedLines + lineCount > salesPrintFinalTotalsLineBudget) break
    finalRows.push({ index: itemIndex, item, kind: "item", lineCount })
    finalUsedLines += lineCount
    itemIndex += 1
  }

  for (let index = finalStartIndex + finalRows.length; finalUsedLines < salesPrintFinalTotalsLineBudget; index += 1) {
    finalRows.push({ index, kind: "blank" })
    finalUsedLines += 1
  }
  pages.push({ lineBudget: salesPrintFinalTotalsLineBudget, rows: finalRows, startIndex: finalStartIndex, usedLines: finalUsedLines })

  return pages
}
