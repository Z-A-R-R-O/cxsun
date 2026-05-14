import { notFound } from "next/navigation";
import { ContactShowPage } from "../../../../../features/contact/interface/pages/contact-pages";

export default async function ContactShowRoute({
  params,
}: {
  readonly params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;

  if (!/^\d+$/.test(contactId)) {
    notFound();
  }

  return <ContactShowPage contactId={Number.parseInt(contactId, 10)} />;
}
