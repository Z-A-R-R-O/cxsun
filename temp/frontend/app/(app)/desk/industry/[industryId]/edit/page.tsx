import { notFound } from "next/navigation";
import { IndustryUpsertPage } from "../../../../../../features/industry/interface/pages/industry-pages";

export default async function IndustryEditRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ industryId: string }>;
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const { industryId } = await params;
  const { returnTo } = await searchParams;

  if (!/^\d+$/.test(industryId)) {
    notFound();
  }

  return (
    <IndustryUpsertPage
      industryId={Number.parseInt(industryId, 10)}
      returnTo={returnTo === "list" ? "list" : "show"}
    />
  );
}
