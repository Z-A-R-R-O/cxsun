import { notFound } from "next/navigation";
import { IndustryShowPage } from "../../../../../features/industry/interface/pages/industry-pages";

export default async function IndustryShowRoute({
  params,
}: {
  readonly params: Promise<{ industryId: string }>;
}) {
  const { industryId } = await params;

  if (!/^\d+$/.test(industryId)) {
    notFound();
  }

  return <IndustryShowPage industryId={Number.parseInt(industryId, 10)} />;
}
