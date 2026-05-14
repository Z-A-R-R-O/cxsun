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
  buildContactColumnOptions,
  filterContacts,
  formatContactDate,
  getContact,
  listContacts,
  softDeleteContact,
} from "../../application/contact-list.service";
import {
  contactStatusFilters,
  defaultContactColumnVisibility,
  type ContactColumnId,
  type ContactRecord,
  type ContactStatusFilter,
} from "../../domain/contact";

export function ContactListPage() {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [contacts, setContacts] = useState<readonly ContactRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<ContactColumnId, boolean>>(
    defaultContactColumnVisibility,
  );

  const filteredContacts = useMemo(
    () =>
      filterContacts({ contacts, searchValue, statusFilter }).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [contacts, searchValue, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / rowsPerPage));
  const pageContacts = filteredContacts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const columnOptions = useMemo(
    () =>
      buildContactColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    listContacts({ signal: controller.signal })
      .then((records) => {
        setContacts(records);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setContacts([]);
          setLoadError(error instanceof Error ? error.message : "Unable to load contacts.");
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

  async function deleteContact(contact: ContactRecord) {
    const hideGlobalLoader = showGlobalLoader();

    try {
      await softDeleteContact(contact.id);
      setContacts((currentContacts) => currentContacts.filter((item) => item.id !== contact.id));
      toast.success("Contact deleted", { description: `${contact.name} was soft deleted.` });
    } catch (error) {
      toast.error("Could not delete contact", { description: getErrorMessage(error) });
    } finally {
      hideGlobalLoader();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/contact/new">
            <Plus className="size-4" />
            New Contact
          </Link>
        </Button>
      }
      description="Create and review contact, party, tax, communication, and banking records."
      technicalName="page.contact.list"
      title="Contacts"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={contactStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as ContactStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={() => setVisibleColumns(defaultContactColumnVisibility)}
        searchPlaceholder="Search contact, code, phone, email, GSTIN, or ledger"
        searchValue={searchValue}
      />
      {loadError ? <MasterListEmptyState>{loadError}</MasterListEmptyState> : null}
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.name ? <ListHeader>Contact</ListHeader> : null}
                {visibleColumns.ledger ? <ListHeader>Ledger</ListHeader> : null}
                {visibleColumns.phone ? <ListHeader>Phone</ListHeader> : null}
                {visibleColumns.email ? <ListHeader>Email</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader align="right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageContacts.map((contact, index) => (
                <tr
                  key={contact.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.code ? (
                    <td className="px-4 py-2.5 font-mono text-xs">{contact.code}</td>
                  ) : null}
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => {
                          showGlobalLoader();
                          router.push(`/desk/contact/${contact.id}`);
                        }}
                      >
                        {contact.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.ledger ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {contact.ledgerName ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.phone ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {contact.primaryPhone ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.email ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {contact.primaryEmail ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <StatusBadge isActive={contact.isActive} />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatContactDate(contact.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <RowActions contact={contact} onDelete={() => deleteContact(contact)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageContacts.length === 0 ? (
          <MasterListEmptyState>
            {isLoading ? "Loading contacts from database." : "No contacts found."}
          </MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredContacts.length,
        })}
        singularLabel="contacts"
        totalCount={filteredContacts.length}
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

export function ContactShowPage({ contactId }: { readonly contactId: number }) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();
    setIsLoading(true);
    getContact(contactId, { signal: controller.signal })
      .then((record) => setContact(record))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setContact(null);
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
  }, [contactId, showGlobalLoader]);

  if (!contact) {
    return (
      <MasterListPageFrame
        description={isLoading ? "Loading contact record." : "The requested contact was not found."}
        technicalName="page.contact.show"
        title={isLoading ? "Loading contact" : "Contact not found"}
      >
        <MasterListShowCard title="Details">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/contact">Back to contacts</Link>
          </Button>
        </MasterListShowCard>
      </MasterListPageFrame>
    );
  }

  const currentContact = contact;

  async function handleSoftDelete() {
    const hideGlobalLoader = showGlobalLoader();
    try {
      await softDeleteContact(currentContact.id);
      toast.success("Contact deleted", { description: `${currentContact.name} was soft deleted.` });
      router.push("/desk/contact");
    } catch (error) {
      hideGlobalLoader();
      toast.error("Could not delete contact", { description: getErrorMessage(error) });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/contact">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/contact/${currentContact.id}/edit?returnTo=show`}>
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
      description={currentContact.code}
      technicalName="page.contact.show"
      title={currentContact.name}
    >
      <MasterListShowLayout
        cards={[
          <MasterListShowCard key="detail" title="Details" className="lg:col-span-2">
            <SimpleRows rows={contactDetailRows(currentContact)} />
          </MasterListShowCard>,
          <MasterListShowCard key="addresses" title="Addresses">
            <SimpleRows
              rows={currentContact.addresses.map(
                (item) => [item.addressLine1, item.addressLine2 ?? "-"] as const,
              )}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="communication" title="Communication">
            <SimpleRows
              rows={[
                ...currentContact.emails.map((item) => [item.emailType, item.email] as const),
                ...currentContact.phones.map((item) => [item.phoneType, item.phoneNumber] as const),
              ]}
            />
          </MasterListShowCard>,
          <MasterListShowCard key="finance" title="Finance">
            <SimpleRows rows={contactFinanceRows(currentContact)} />
          </MasterListShowCard>,
        ]}
      />
    </MasterListPageFrame>
  );
}

function RowActions({
  contact,
  onDelete,
}: {
  readonly contact: ContactRecord;
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
          <Link href={`/desk/contact/${contact.id}`} className="gap-2.5">
            <Eye className="size-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/desk/contact/${contact.id}/edit?returnTo=list`} className="gap-2.5">
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
          {rows.length ? (
            rows.map(([label, value], index) => (
              <tr key={index} className="border-b border-border/60 last:border-b-0">
                <th className="w-44 bg-muted/35 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {label}
                </th>
                <td className="px-4 py-3 text-foreground">{value}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-muted-foreground">No records.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function contactDetailRows(contact: ContactRecord): readonly (readonly [ReactNode, ReactNode])[] {
  return [
    ["ID", contact.id],
    ["Code", contact.code],
    ["Name", contact.name],
    ["Legal name", contact.legalName ?? "-"],
    ["GSTIN", contact.gstin ?? "-"],
    ["PAN", contact.pan ?? "-"],
    ["Primary email", contact.primaryEmail ?? "-"],
    ["Primary phone", contact.primaryPhone ?? "-"],
    ["Active", <StatusBadge key="active" isActive={contact.isActive} />],
    ["Created at", formatContactDate(contact.createdAt)],
    ["Updated at", formatContactDate(contact.updatedAt)],
  ];
}

function contactFinanceRows(contact: ContactRecord): readonly (readonly [ReactNode, ReactNode])[] {
  return [
    ["Ledger", contact.ledgerName ?? "-"],
    ["Opening balance", contact.openingBalance],
    ["Credit limit", contact.creditLimit],
    ...contact.bankAccounts.map((bank) => [bank.bankName, bank.accountNumber] as const),
    ...contact.gstDetails.map((gst) => [gst.state, gst.gstin] as const),
  ];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
