import { notFound } from "next/navigation";
import { PaymentUpsertPage } from "../../../../../../features/payment/interface/pages/payment-pages";

export default async function PaymentEditRoute({
  params,
}: {
  readonly params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  if (!/^\d+$/.test(paymentId)) {
    notFound();
  }

  return <PaymentUpsertPage paymentId={Number.parseInt(paymentId, 10)} />;
}
