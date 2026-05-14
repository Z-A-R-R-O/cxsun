"use client";

import type { SalesItemInput, SalesRecord } from "../../domain/sales";
import { SalesInvoiceDocument } from "./sales-print-page";

const address = [
  "SF No. 593, 3rd Street",
  "Anna Nagar Extension, KPN Colony, Near old bus stand",
  "Tirupur - 641602",
].join("\n");

const fixtureSets = [
  {
    documentNo: "SAL-FIX-005",
    lineCount: 5,
    title: "5 item lines",
    pattern: [1, 1, 3],
  },
  {
    documentNo: "SAL-FIX-010",
    lineCount: 10,
    title: "10 item lines",
    pattern: [1, 2, 3, 1, 3],
  },
  {
    documentNo: "SAL-FIX-024",
    lineCount: 24,
    title: "24 item lines",
    pattern: [1, 2, 3, 1, 2, 3, 1, 2, 3, 3, 3],
  },
  {
    documentNo: "SAL-FIX-035",
    lineCount: 35,
    title: "35 item lines, above one-page limit",
    pattern: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 2, 3],
  },
] as const;

export function SalesPrintFixturesPage() {
  return (
    <main className="min-h-screen bg-neutral-200 py-6 text-black print:bg-white print:py-0">
      <div className="mx-auto mb-5 flex w-[198mm] max-w-[calc(100vw-24px)] items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Sales print line fixtures</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Real invoice component with 5, 10, 24, and 35 calculated item-line samples.
          </p>
        </div>
        <button
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
          onClick={() => window.print()}
          type="button"
        >
          Print
        </button>
      </div>
      <div className="space-y-8 print:space-y-0">
        {fixtureSets.map((fixture) => (
          <section
            key={fixture.documentNo}
            className="mx-auto w-fit print:break-after-page print:first:break-before-auto"
          >
            <div className="mx-auto mb-2 w-[198mm] max-w-[calc(100vw-24px)] rounded-md bg-white px-3 py-2 text-sm shadow-sm print:hidden">
              <b>{fixture.title}</b>
              <span className="ml-2 text-neutral-600">
                Invoice {fixture.documentNo} uses {fixture.lineCount} calculated item lines.
              </span>
            </div>
            <div className="overflow-hidden rounded-md bg-white shadow-sm print:rounded-none print:shadow-none">
              <SalesInvoiceDocument
                industryName="Offset Printing"
                record={makeFixtureRecord(fixture.documentNo, fixture.pattern)}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function makeFixtureRecord(documentNo: string, linePattern: readonly number[]): SalesRecord {
  const items = linePattern.map((lineCount, index) => makeFixtureItem(index, lineCount));
  const taxable = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gst = items.reduce(
    (sum, item) => sum + (item.quantity * item.rate * item.taxRate) / 100,
    0,
  );
  const grandTotal = taxable + gst;

  return {
    balanceAmount: grandTotal,
    billingAddress: address,
    documentDate: "2026-04-30",
    documentNo,
    dueDate: "2026-05-15",
    eInvoiceAckDate: "2026-04-30",
    eInvoiceAckNo: `ACK-${documentNo.slice(-3)}-2026`,
    eInvoiceIrn: `IRN-${documentNo.slice(-3)}-FIXTURE`,
    eInvoiceSignedQr: null,
    ewayBillDate: "2026-04-30",
    ewayBillNo: `EWB-${documentNo.slice(-3)}-2026`,
    grandTotal,
    id: Number(documentNo.slice(-3)),
    isActive: true,
    items,
    notes: null,
    partyId: "fixture-party",
    partyName: "Sundar Kala Arunes Company Pvt Ltd",
    paymentStatus: "unpaid",
    placeOfSupply: "cgst-sgst",
    referenceNo: "SO-REF-001",
    roundOff: 0,
    shippingAddress: address,
    status: "posted",
    terms: null,
    updatedAt: "2026-04-30T10:30:00.000Z",
  };
}

function makeFixtureItem(index: number, lineCount: number): SalesItemInput {
  const quantity = 12 + index;
  const rate = 48.5 + index * 1.75;
  const taxable = quantity * rate;

  return {
    areaSq: 0,
    colour: null,
    dcNo: `DC-${String(740 + index).padStart(4, "0")}`,
    description: null,
    discountAmount: 0,
    discountType: null,
    discountValue: 0,
    freeQuantity: 0,
    hsnCodeId: index % 2 === 0 ? "52081110" : "49111090",
    isActive: true,
    mrp: 0,
    poNo: `PO-${String(320 + index).padStart(4, "0")}`,
    productId: null,
    productName: makeParticulars(index, lineCount),
    productSku: null,
    quantity,
    rate,
    size: null,
    sortOrder: index + 1,
    taxAmount: (taxable * 18) / 100,
    taxId: "gst-18",
    taxRate: 18,
    unitId: "pcs",
  };
}

function makeParticulars(index: number, lineCount: number) {
  const lines = [
    index % 2 === 0
      ? "100 % COTTON KNITTED DYED FABRIC 24 GG 180 GSM - RED"
      : "OFFSET PRINTED CARTON LABEL WITH LAMINATION - GREEN",
    "Customer PO artwork matched with colour proof and finished packing",
    "Batch packed by shade and lot for invoice line testing",
  ];

  return lines.slice(0, lineCount).join("\n");
}
