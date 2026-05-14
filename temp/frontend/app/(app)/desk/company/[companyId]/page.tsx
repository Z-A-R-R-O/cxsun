import { notFound } from "next/navigation";
import { CompanyShowPage } from "../../../../../features/company/interface/pages/company-pages";

export default async function CompanyShowRoute({
  params,
}: {
  readonly params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  if (!/^\d+$/.test(companyId)) {
    notFound();
  }

  return <CompanyShowPage companyId={Number.parseInt(companyId, 10)} />;
}
