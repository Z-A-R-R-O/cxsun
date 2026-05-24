import type { DeliveryNoteEntryItem } from "./delivery-note-client"

export const DeliveryNotePrintMinimumItemLineBudget = 12
export const DeliveryNotePrintMaximumItemLineBudget = 12

export type DeliveryNotePrintLineRow =
  | {
      readonly index: number
      readonly item: DeliveryNoteEntryItem
      readonly kind: "item"
      readonly lineCount: number
    }
  | {
      readonly index: number
      readonly kind: "blank"
    }

export function getDeliveryNotePrintLinePlan(items: readonly DeliveryNoteEntryItem[]) {
  const itemLineCounts = items.map((item) => getDeliveryNoteItemPrintLineCount(item))
  const lineBudget = getDeliveryNotePrintLineBudget(itemLineCounts)
  let usedLines = 0
  let requiresTwoPageTemplate = false
  const rows: DeliveryNotePrintLineRow[] = []

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

export function getDeliveryNoteItemPrintLineCount(item: DeliveryNoteEntryItem) {
  void item
  return 1
}

export function getDeliveryNoteItemPrintTextLineCount(item: DeliveryNoteEntryItem) {
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

export function getDeliveryNotePrintLineBudget(itemLineCounts: readonly number[]) {
  void itemLineCounts
  return DeliveryNotePrintMinimumItemLineBudget
}





