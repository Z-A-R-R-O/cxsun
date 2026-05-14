import { notFound } from "next/navigation";
import { TenantShowPage } from "../../../../../features/tenant/interface/pages/tenant-pages";

export default async function TenantShowRoute({
  params,
}: {
  readonly params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  if (!/^\d+$/.test(tenantId)) {
    notFound();
  }

  const numericTenantId = Number.parseInt(tenantId, 10);

  return <TenantShowPage tenantId={numericTenantId} />;
}
