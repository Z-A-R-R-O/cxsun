import type { ContactColumnId, ContactColumnOption, ContactRecord } from "../domain/contact";
import { contactColumnCatalog } from "../domain/contact";
export { getContact, listContacts, softDeleteContact } from "../infrastructure/contact-api";

export function formatContactDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildContactColumnOptions(params: {
  readonly visibleColumns: Record<ContactColumnId, boolean>;
  readonly onToggle: (columnId: ContactColumnId, checked: boolean) => void;
}): readonly ContactColumnOption[] {
  return contactColumnCatalog.map((column) => ({
    id: column.id,
    label: column.label,
    checked: params.visibleColumns[column.id],
    disabled:
      params.visibleColumns[column.id] &&
      contactColumnCatalog.filter((item) => params.visibleColumns[item.id]).length === 1,
    onCheckedChange: (checked) => params.onToggle(column.id, checked),
  }));
}

export function filterContacts(params: {
  readonly contacts: readonly ContactRecord[];
  readonly searchValue: string;
  readonly statusFilter: "all" | "active" | "inactive";
}) {
  const normalizedSearch = params.searchValue.trim().toLowerCase();

  return params.contacts.filter((contact) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        contact.code,
        contact.name,
        contact.ledgerName,
        contact.primaryEmail,
        contact.primaryPhone,
        contact.gstin,
        contact.isActive ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesStatus =
      params.statusFilter === "all" ||
      (params.statusFilter === "active" && contact.isActive) ||
      (params.statusFilter === "inactive" && !contact.isActive);

    return matchesSearch && matchesStatus;
  });
}
