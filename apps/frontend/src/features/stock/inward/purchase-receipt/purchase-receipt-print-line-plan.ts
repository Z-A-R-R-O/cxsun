import type { PurchaseReceiptEntryItem } from "./purchase-receipt-client"

export const PurchaseReceiptPrintMinimumItemLineBudget = 12
export const PurchaseReceiptPrintMaximumItemLineBudget = 12

export type PurchaseReceiptPrintLineRow =
  | {
      readonly index: number
      readonly item: PurchaseReceiptEntryItem
      readonly kind: "item"
      readonly lineCount: number
    }
  | {
      readonly index: number
      readonly kind: "blank"
    }

export function getPurchaseReceiptPrintLinePlan(items: readonly PurchaseReceiptEntryItem[]) {
  const itemLineCounts = items.map((item) => getPurchaseReceiptItemPrintLineCount(item))
  const lineBudget = getPurchaseReceiptPrintLineBudget(itemLineCounts)
  let usedLines = 0
  let requiresTwoPageTemplate = false
  const rows: PurchaseReceiptPrintLineRow[] = []

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

export function getPurchaseReceiptItemPrintLineCount(item: PurchaseReceiptEntryItem) {
  void item
  return 1
}

export function getPurchaseReceiptItemPrintTextLineCount(item: PurchaseReceiptEntryItem) {
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

export function getPurchaseReceiptPrintLineBudget(itemLineCounts: readonly number[]) {
  void itemLineCounts
  return PurchaseReceiptPrintMinimumItemLineBudget
}





