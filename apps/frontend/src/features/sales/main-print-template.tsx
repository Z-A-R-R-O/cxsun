import type { ReactNode } from "react"

export function MainPrintTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 7mm 4mm 5mm;
        }

        @media print {
          html,
          body {
            width: auto;
            height: auto;
            min-height: 0;
            margin: 0;
            background: #ffffff !important;
          }

          body {
            display: block;
          }

          body:has(.sales-print-page) *:has(.sales-print-page) {
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          body:has(.sales-print-page) *:has(.sales-print-page) > *:not(.sales-print-page):not(:has(.sales-print-page)) {
            display: none !important;
          }

          .sales-print-page {
            position: static !important;
            width: 100% !important;
            overflow: visible !important;
          }

          .main-print-sheet {
            display: block;
          }

          .sales-print-copy {
            display: block;
            width: 100%;
            overflow: visible;
            break-after: auto;
            page-break-after: auto;
          }

          .sales-print-copy:not(:last-child) {
            break-after: page;
            page-break-after: always;
          }

          .sales-print-extended-page:not(:last-child) {
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>
      <section className="main-print-sheet mx-auto w-[210mm] max-w-full origin-top bg-white font-[Verdana,Arial,sans-serif] text-[10px] text-black print:mx-auto print:mt-0 print:w-[198mm] print:max-w-none">
        {children}
      </section>
    </>
  )
}
