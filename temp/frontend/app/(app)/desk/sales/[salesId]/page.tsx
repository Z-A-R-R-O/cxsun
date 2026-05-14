import { notFound } from "next/navigation";
import { SalesShowPage } from "../../../../../features/sales/interface/pages/sales-pages";

export default async function SalesShowRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ salesId: string }>;
  readonly searchParams: Promise<{ print?: string }>;
}) {
  const { salesId } = await params;
  const query = await searchParams;

  if (!/^\d+$/.test(salesId)) {
    notFound();
  }

  return <SalesShowPage salesId={Number.parseInt(salesId, 10)} shouldPrint={query.print === "1"} />;
}
