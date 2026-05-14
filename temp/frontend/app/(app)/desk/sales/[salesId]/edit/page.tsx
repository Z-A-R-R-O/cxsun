import { notFound } from "next/navigation";
import { SalesUpsertPage } from "../../../../../../features/sales/interface/pages/sales-pages";

export default async function SalesEditRoute({
  params,
}: {
  readonly params: Promise<{ salesId: string }>;
}) {
  const { salesId } = await params;

  if (!/^\d+$/.test(salesId)) {
    notFound();
  }

  return <SalesUpsertPage salesId={Number.parseInt(salesId, 10)} />;
}
