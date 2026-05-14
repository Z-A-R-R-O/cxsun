import { notFound } from "next/navigation";
import { PurchaseUpsertPage } from "../../../../../../features/purchase/interface/pages/purchase-pages";

export default async function PurchaseEditRoute({
  params,
}: {
  readonly params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params;

  if (!/^\d+$/.test(purchaseId)) {
    notFound();
  }

  return <PurchaseUpsertPage purchaseId={Number.parseInt(purchaseId, 10)} />;
}
