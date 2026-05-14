import { notFound } from "next/navigation";
import { CxsunRecordFormPage } from "../../../../../../features/cxsun/interface/pages/cxsun-workspace";
import {
  getDeskPortal,
  type DeskPortalId,
} from "../../../../../../features/desk/application/desk-registry";

export function generateStaticParams() {
  return [{ portal: "cxsun" }];
}

export default async function DeskRecordCreatePage({
  params,
}: {
  readonly params: Promise<{ portal: DeskPortalId }>;
}) {
  const { portal: portalId } = await params;
  const portal = getDeskPortal(portalId);

  if (portal.id !== portalId || portal.id !== "cxsun") {
    notFound();
  }

  return <CxsunRecordFormPage />;
}
