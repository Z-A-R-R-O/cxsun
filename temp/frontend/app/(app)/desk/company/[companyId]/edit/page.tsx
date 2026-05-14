import { notFound } from "next/navigation";
import { CompanyUpsertPage } from "../../../../../../features/company/interface/pages/company-pages";

export default async function CompanyEditRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ companyId: string }>;
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const { companyId } = await params;
  const { returnTo } = await searchParams;

  if (!/^\d+$/.test(companyId)) {
    notFound();
  }

  return (
    <CompanyUpsertPage
      companyId={Number.parseInt(companyId, 10)}
      returnTo={returnTo === "list" ? "list" : "show"}
    />
  );
}
