"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  buildProductColumnOptions,
  filterProducts,
  formatProductDate,
  formatProductMoney,
  getProduct,
  listProducts,
  softDeleteProduct,
} from "../../application/product-list.service";
import {
  defaultProductColumnVisibility,
  productStatusFilters,
  type ProductColumnId,
  type ProductRecord,
  type ProductStatusFilter,
} from "../../domain/product";

export function ProductListPage() {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [products, setProducts] = useState<readonly ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<ProductColumnId, boolean>>(
    defaultProductColumnVisibility,
  );

  const filteredProducts = useMemo(
    () =>
      filterProducts({ products, searchValue, statusFilter }).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [products, searchValue, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const pageProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      buildProductColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    listProducts({ signal: controller.signal })
      .then((records) => {
        setProducts(records);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProducts([]);
          setLoadError(error instanceof Error ? error.message : "Unable to load products.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          hideGlobalLoader();
        }
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [showGlobalLoader]);

  async function deleteProduct(product: ProductRecord) {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteProduct(product.id);
      setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
      toast.success("Product deleted", { description: `${product.name} was soft deleted.` });
    } catch (error) {
      toast.error("Could not delete product", { description: getErrorMessage(error) });
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/product/new">
            <Plus className="size-4" />
            New Product
          </Link>
        </Button>
      }
      description="Create and review billing and accounts product records."
      technicalName="page.product.list"
      title="Products"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={productStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as ProductStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={() => setVisibleColumns(defaultProductColumnVisibility)}
        searchPlaceholder="Search product, code, category, brand, or billing masters"
        searchValue={searchValue}
      />
      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.name ? <ListHeader>Product</ListHeader> : null}
                {visibleColumns.category ? <ListHeader>Category</ListHeader> : null}
                {visibleColumns.price ? <ListHeader>Price</ListHeader> : null}
                {visibleColumns.stock ? <ListHeader>Stock</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader align="right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageProducts.map((product, index) => (
                <tr
                  key={product.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.code ? (
                    <td className="px-4 py-2.5 font-mono text-xs">{product.code}</td>
                  ) : null}
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => {
                          showGlobalLoader();
                          router.push(`/desk/product/${product.id}`);
                        }}
                      >
                        {product.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.category ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {product.categoryName ?? product.productGroupName ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.price ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatProductMoney(product.basePrice)}
                    </td>
                  ) : null}
                  {visibleColumns.stock ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {product.totalStockQuantity}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <StatusBadge isActive={product.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatProductDate(product.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <RowActions product={product} onDelete={() => deleteProduct(product)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageProducts.length === 0 ? (
          <MasterListEmptyState>
            {isLoading ? "Loading products from database." : "No products found."}
          </MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredProducts.length,
        })}
        singularLabel="products"
        totalCount={filteredProducts.length}
        totalPages={totalPages}
        onPageChange={(nextPage) => setCurrentPage(nextPage)}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue);
          setCurrentPage(1);
        }}
      />
    </MasterListPageFrame>
  );
}

export function ProductShowPage({ productId }: { readonly productId: number }) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    setIsLoading(true);
    getProduct(productId, { signal: controller.signal })
      .then((record) => setProduct(record))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setProduct(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          hideGlobalLoader();
        }
      });
    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [productId, showGlobalLoader]);

  if (!product) {
    return (
      <MasterListPageFrame
        description={isLoading ? "Loading product record." : "The requested product was not found."}
        technicalName="page.product.show"
        title={isLoading ? "Loading product" : "Product not found"}
      >
        <MasterListShowCard title="Details">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/product">Back to products</Link>
          </Button>
        </MasterListShowCard>
      </MasterListPageFrame>
    );
  }

  const currentProduct = product;

  async function handleSoftDelete() {
    const hideGlobalLoader = showGlobalLoader();
    try {
      await softDeleteProduct(currentProduct.id);
      toast.success("Product deleted", { description: `${currentProduct.name} was soft deleted.` });
      router.push("/desk/product");
    } catch (error) {
      hideGlobalLoader();
      toast.error("Could not delete product", { description: getErrorMessage(error) });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/product">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/product/${currentProduct.id}/edit?returnTo=show`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleSoftDelete}>
            <Trash2 className="size-4" />
            Soft delete
          </Button>
        </div>
      }
      description={currentProduct.code}
      technicalName="page.product.show"
      title={currentProduct.name}
    >
      <MasterListShowLayout
        cards={[
          <MasterListShowCard key="detail" title="Details" className="lg:col-span-2">
            <SimpleRows rows={productDetailRows(currentProduct)} />
          </MasterListShowCard>,
          <MasterListShowCard key="billing" title="Billing">
            <SimpleRows rows={productBillingRows(currentProduct)} />
          </MasterListShowCard>,
          <MasterListShowCard key="notes" title="Notes">
            <SimpleRows rows={[["Description", currentProduct.description ?? "-"]]} />
          </MasterListShowCard>,
        ]}
      />
    </MasterListPageFrame>
  );
}

function RowActions({
  product,
  onDelete,
}: {
  readonly product: ProductRecord;
  readonly onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1">
        <DropdownMenuItem asChild>
          <Link href={`/desk/product/${product.id}`} className="gap-2.5">
            <Eye className="size-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/desk/product/${product.id}/edit?returnTo=list`} className="gap-2.5">
            <Pencil className="size-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2.5 text-destructive focus:text-destructive"
          onSelect={onDelete}
        >
          <Trash2 className="size-4" />
          Soft delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ListHeader({
  align = "left",
  children,
}: {
  readonly align?: "left" | "right";
  readonly children: ReactNode;
}) {
  return (
    <th
      className={`border-b border-border/70 px-4 py-2.5 text-${align} text-sm font-medium text-foreground`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ isActive }: { readonly isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
          : "rounded-full border-border/80 bg-background text-muted-foreground"
      }
    >
      {isActive ? "active" : "inactive"}
    </Badge>
  );
}

function SimpleRows({ rows }: { readonly rows: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value], index) => (
            <tr key={index} className="border-b border-border/60 last:border-b-0">
              <th className="w-44 bg-muted/35 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                {label}
              </th>
              <td className="px-4 py-3 text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function productDetailRows(product: ProductRecord): readonly (readonly [ReactNode, ReactNode])[] {
  return [
    ["ID", product.id],
    ["Code", product.code],
    ["Name", product.name],
    ["Base price", formatProductMoney(product.basePrice)],
    ["Cost price", formatProductMoney(product.costPrice)],
    ["Active", <StatusBadge key="active" isActive={product.isActive} />],
    ["Created at", formatProductDate(product.createdAt)],
    ["Updated at", formatProductDate(product.updatedAt)],
  ];
}

function productBillingRows(product: ProductRecord): readonly (readonly [ReactNode, ReactNode])[] {
  return [
    ["Product Type", product.productTypeName ?? product.productTypeId ?? "-"],
    ["HSN Code", product.hsnCodeId ?? "-"],
    ["Unit", product.unitId ?? "-"],
    ["GST Tax", product.taxId ?? "-"],
  ];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
