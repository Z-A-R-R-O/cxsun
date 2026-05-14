import type { ReactNode } from "react";

type MainPrintTemplateProps = {
  readonly children: ReactNode;
};

export function MainPrintTemplate({ children }: MainPrintTemplateProps) {
  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 7mm 4mm 5mm;
        }

        @media print {
          html,
          body {
            width: auto;
            min-height: 297mm;
            margin: 0;
            background: #ffffff !important;
          }

          body {
            display: flex;
            justify-content: center;
          }

          .main-print-sheet {
            transform: translateX(1.5mm);
          }
        }
      `}</style>
      <section className="main-print-sheet mx-auto w-[210mm] max-w-full origin-top bg-white font-[Verdana,Arial,sans-serif] text-[10px] text-black print:mx-auto print:mt-0 print:w-[198mm] print:max-w-none">
        {children}
      </section>
    </>
  );
}
