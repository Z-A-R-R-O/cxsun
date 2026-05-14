import { notFound } from "next/navigation";
import { cxsunRecords } from "../../../../../../features/cxsun/domain/data";
import { CxsunRecordDetailPage } from "../../../../../../features/cxsun/interface/pages/cxsun-workspace";
import {
  getDeskPortal,
  type DeskPortalId,
} from "../../../../../../features/desk/application/desk-registry";

export function generateStaticParams() {
  return cxsunRecords.map((record) => ({
    portal: "cxsun",
    recordId: record.id,
  }));
}

export default async function DeskRecordDetailPage({
  params,
}: {
  readonly params: Promise<{ portal: DeskPortalId; recordId: string }>;
}) {
  const { portal: portalId, recordId } = await params;
  const portal = getDeskPortal(portalId);

  if (portal.id !== portalId || portal.id !== "cxsun") {
    notFound();
  }

  return <CxsunRecordDetailPage recordId={recordId} />;
}
