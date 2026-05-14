import { notFound } from "next/navigation";
import { DeskDashboard } from "../../../../components/dashboard/desk-dashboard";
import { BillingWorkspacePage } from "../../../../features/billing/interface/pages/billing-workspace-page";
import { CxsunOverviewPage } from "../../../../features/cxsun/interface/pages/cxsun-workspace";
import {
  deskPortals,
  getDeskPortal,
  type DeskPortalId,
} from "../../../../features/desk/application/desk-registry";

export function generateStaticParams() {
  return deskPortals.map((portal) => ({ portal: portal.id }));
}

export default async function DeskPortalPage({
  params,
}: {
  readonly params: Promise<{ portal: DeskPortalId }>;
}) {
  const { portal: portalId } = await params;
  const portal = getDeskPortal(portalId);

  if (portal.id !== portalId) {
    notFound();
  }

  if (portal.id === "cxsun") {
    return <CxsunOverviewPage />;
  }

  if (portal.id === "billing") {
    return <BillingWorkspacePage />;
  }

  return <DeskDashboard portal={portal} />;
}
