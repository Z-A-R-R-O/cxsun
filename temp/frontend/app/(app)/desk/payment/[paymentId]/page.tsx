import { notFound } from "next/navigation";
import { PaymentShowPage } from "../../../../../features/payment/interface/pages/payment-pages";

export default async function PaymentShowRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ paymentId: string }>;
  readonly searchParams: Promise<{ print?: string }>;
}) {
  const { paymentId } = await params;
  const query = await searchParams;

  if (!/^\d+$/.test(paymentId)) {
    notFound();
  }

  return (
    <PaymentShowPage
      paymentId={Number.parseInt(paymentId, 10)}
      shouldPrint={query.print === "1"}
    />
  );
}
