import { ProductShowPage } from "../../../../../features/product/interface/pages/product-show-page";

export default async function ProductShowRoute({
  params,
}: {
  readonly params: Promise<{ readonly productId: string }>;
}) {
  const { productId } = await params;
  return <ProductShowPage productId={Number(productId)} />;
}
