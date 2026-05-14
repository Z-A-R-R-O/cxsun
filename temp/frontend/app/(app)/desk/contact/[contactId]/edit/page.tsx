import { notFound } from "next/navigation";
import { ContactUpsertPage } from "../../../../../../features/contact/interface/pages/contact-pages";

export default async function ContactEditRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ contactId: string }>;
  readonly searchParams: Promise<{ returnTo?: string }>;
}) {
  const { contactId } = await params;
  const { returnTo } = await searchParams;

  if (!/^\d+$/.test(contactId)) {
    notFound();
  }

  return (
    <ContactUpsertPage
      contactId={Number.parseInt(contactId, 10)}
      returnTo={returnTo === "list" ? "list" : "show"}
    />
  );
}
