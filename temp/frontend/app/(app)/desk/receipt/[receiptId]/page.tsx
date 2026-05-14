import { notFound } from "next/navigation";
import { ReceiptShowPage } from "../../../../../features/receipt/interface/pages/receipt-pages";

export default async function ReceiptShowRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ receiptId: string }>;
  readonly searchParams: Promise<{ print?: string }>;
}) {
  const { receiptId } = await params;
  const query = await searchParams;

  if (!/^\d+$/.test(receiptId)) {
    notFound();
  }

  return (
    <ReceiptShowPage
      receiptId={Number.parseInt(receiptId, 10)}
      shouldPrint={query.print === "1"}
    />
  );
}
