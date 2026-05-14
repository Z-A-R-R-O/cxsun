import { notFound } from "next/navigation";
import { PurchaseShowPage } from "../../../../../features/purchase/interface/pages/purchase-pages";

export default async function PurchaseShowRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ purchaseId: string }>;
  readonly searchParams: Promise<{ print?: string }>;
}) {
  const { purchaseId } = await params;
  const query = await searchParams;

  if (!/^\d+$/.test(purchaseId)) {
    notFound();
  }

  return (
    <PurchaseShowPage
      purchaseId={Number.parseInt(purchaseId, 10)}
      shouldPrint={query.print === "1"}
    />
  );
}
