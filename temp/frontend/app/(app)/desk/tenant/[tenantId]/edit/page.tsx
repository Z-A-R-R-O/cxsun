import { notFound } from "next/navigation";
import { TenantUpsertPage } from "../../../../../../features/tenant/interface/pages/tenant-pages";

export default async function TenantEditRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ tenantId: string }>;
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const { tenantId } = await params;
  const { returnTo } = await searchParams;

  if (!/^\d+$/.test(tenantId)) {
    notFound();
  }

  const numericTenantId = Number.parseInt(tenantId, 10);
  const editReturnTo = returnTo === "list" ? "list" : "show";

  return <TenantUpsertPage tenantId={numericTenantId} returnTo={editReturnTo} />;
}
