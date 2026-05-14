import { notFound } from "next/navigation";
import {
  CxsunQueuePage,
  CxsunRecordsPage,
} from "../../../../../features/cxsun/interface/pages/cxsun-workspace";
import {
  deskPortals,
  getDeskPortal,
  type DeskPortalId,
} from "../../../../../features/desk/application/desk-registry";

const cxsunSections = ["records", "queue"] as const;

export function generateStaticParams() {
  return [
    ...deskPortals.flatMap((portal) =>
      portal.id === "cxsun" ? cxsunSections.map((section) => ({ portal: portal.id, section })) : [],
    ),
  ];
}

export default async function DeskSectionPage({
  params,
}: {
  readonly params: Promise<{ portal: DeskPortalId; section: string }>;
}) {
  const { portal: portalId, section } = await params;
  const portal = getDeskPortal(portalId);

  if (portal.id !== portalId || portal.id !== "cxsun") {
    notFound();
  }

  if (section === "records") {
    return <CxsunRecordsPage />;
  }

  if (section === "queue") {
    return <CxsunQueuePage />;
  }

  notFound();
}
