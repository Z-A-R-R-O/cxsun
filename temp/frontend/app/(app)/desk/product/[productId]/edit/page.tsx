import { ProductUpsertPage } from "../../../../../../features/product/interface/pages/product-upsert-page";

export default async function ProductEditRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly productId: string }>;
  readonly searchParams: Promise<{ readonly returnTo?: string }>;
}) {
  const [{ productId }, { returnTo }] = await Promise.all([params, searchParams]);

  return (
    <ProductUpsertPage
      productId={Number(productId)}
      returnTo={returnTo === "list" ? "list" : "show"}
    />
  );
}
