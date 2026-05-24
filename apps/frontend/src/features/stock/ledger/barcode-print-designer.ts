import type { StockSerialization, StockSerializationItem } from "./stock-ledger-client"

export interface BarcodePrintDesignerOptions {
  columns?: number
  gapMm?: number
  labelMinHeightMm?: number
  labelWidthMm?: number
  onError?: (message: string) => void
  pageMarginMm?: number
  title?: string
}

const defaultDesignerOptions = {
  columns: 3,
  gapMm: 4,
  labelMinHeightMm: 28,
  labelWidthMm: 64,
  pageMarginMm: 8,
  title: "Barcode Labels",
}

let isBarcodePrintActive = false

export function printBarcodeLabels(items: StockSerializationItem[], serialization: StockSerialization, options: BarcodePrintDesignerOptions = {}) {
  if (!items.length) return false
  if (isBarcodePrintActive) return false
  isBarcodePrintActive = true

  const designerOptions = { ...defaultDesignerOptions, ...options }
  const printFrame = document.createElement("iframe")
  printFrame.setAttribute("aria-hidden", "true")
  printFrame.style.position = "fixed"
  printFrame.style.right = "0"
  printFrame.style.bottom = "0"
  printFrame.style.width = "0"
  printFrame.style.height = "0"
  printFrame.style.border = "0"

  let cleanupTimer: number | undefined
  let isCleanedUp = false
  function cleanup() {
    if (isCleanedUp) return
    isCleanedUp = true
    if (cleanupTimer) window.clearTimeout(cleanupTimer)
    printFrame.remove()
    isBarcodePrintActive = false
  }

  document.body.appendChild(printFrame)
  const printDocument = printFrame.contentDocument
  const printWindow = printFrame.contentWindow
  if (!printDocument || !printWindow) {
    options.onError?.("Cannot prepare label print view")
    cleanup()
    return false
  }

  printDocument.open()
  printDocument.write(createBarcodePrintHtml(items, serialization, designerOptions))
  printDocument.close()
  printWindow.onafterprint = cleanup
  window.setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
      cleanupTimer = window.setTimeout(cleanup, 10000)
    } catch {
      options.onError?.("Cannot print barcode labels")
      cleanup()
    }
  }, 100)

  return true
}

export function createBarcodePrintHtml(items: StockSerializationItem[], serialization: StockSerialization, options: Required<Omit<BarcodePrintDesignerOptions, "onError">>) {
  return `
    <html>
      <head>
        <title>${escapeHtml(options.title)}</title>
        <style>
          @page { size: auto; margin: ${options.pageMarginMm}mm; }
          body { margin: 0; font-family: Arial, sans-serif; color: #000; }
          .sheet { display: grid; grid-template-columns: repeat(${options.columns}, ${options.labelWidthMm}mm); gap: ${options.gapMm}mm; padding: 2mm; }
          .label { min-height: ${options.labelMinHeightMm}mm; padding: 3mm; box-sizing: border-box; page-break-inside: avoid; }
          .product { font-size: 10px; font-weight: 700; margin-bottom: 2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .barcode-box { padding: 1.5mm 0 1mm; text-align: center; }
          .barcode-svg { display: block; width: 100%; height: 13mm; }
          .barcode-value { margin-top: 0.7mm; font-family: "Courier New", monospace; font-size: 7px; font-weight: 700; letter-spacing: 0.4px; }
        </style>
      </head>
      <body><div class="sheet">${createBarcodeLabelHtml(items, serialization)}</div></body>
    </html>
  `
}

function createBarcodeLabelHtml(items: StockSerializationItem[], serialization: StockSerialization) {
  return items.map((item) => `
    <div class="label">
      <div class="product">${escapeHtml(serialization.product_name)}</div>
      <div class="barcode-box">
        ${createCode128BarcodeSvg(item.barcode_value)}
        <div class="barcode-value">${escapeHtml(item.barcode_value)}</div>
      </div>
    </div>
  `).join("")
}

const code128Patterns = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
]

function createCode128BarcodeSvg(value: string) {
  const codes = createCode128BCodes(value)
  const bars: string[] = []
  let x = 0

  codes.forEach((code) => {
    const pattern = code128Patterns[code]
    if (!pattern) return
    for (let index = 0; index < pattern.length; index += 1) {
      const width = Number(pattern[index])
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="50" />`)
      x += width
    }
  })

  return `<svg class="barcode-svg" viewBox="0 0 ${x} 50" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(value)}" xmlns="http://www.w3.org/2000/svg">${bars.join("")}</svg>`
}

function createCode128BCodes(value: string) {
  const startCodeB = 104
  const stop = 106
  const dataCodes = Array.from(value).map((character) => {
    const charCode = character.charCodeAt(0)
    return charCode >= 32 && charCode <= 127 ? charCode - 32 : 31
  })
  const checksum = dataCodes.reduce((total, code, index) => total + code * (index + 1), startCodeB) % 103
  return [startCodeB, ...dataCodes, checksum, stop]
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;")
}
