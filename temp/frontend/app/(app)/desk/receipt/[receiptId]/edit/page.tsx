import { notFound } from "next/navigation";
import { ReceiptUpsertPage } from "../../../../../../features/receipt/interface/pages/receipt-pages";

export default async function ReceiptEditRoute({
  params,
}: {
  readonly params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;

  if (!/^\d+$/.test(receiptId)) {
    notFound();
  }

  return <ReceiptUpsertPage receiptId={Number.parseInt(receiptId, 10)} />;
}
