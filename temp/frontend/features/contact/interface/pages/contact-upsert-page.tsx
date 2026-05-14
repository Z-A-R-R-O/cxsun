"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Save, Trash2, X } from "lucide-react";
import {
  AnimatedTabs,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  MasterListPageFrame,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  Separator,
  Switch,
  useGlobalLoader,
} from "@cxnext/ui";
import { createCommonRecord, listCommonRecords } from "../../../common/application/common-service";
import type { CommonRecord } from "../../../common/domain/common-master";
import { getContact, upsertContact } from "../../application/contact-upsert.service";
import { prepareContactForSave } from "../../application/contact-upsert.service";
import type { ContactUpsertInput } from "../../domain/contact";
import { createDefaultContactFormValues, toContactFormValues } from "../../domain/contact-form";
import {
  ContactField,
  ContactSection,
  ContactStatusSwitch,
  ContactTextInput,
} from "../components/contact-form-sections";

type ContactEditReturnTo = "list" | "show";
type LocationLookupKey = "countries" | "states" | "districts" | "cities" | "pincodes";
type LocationLookupMap = Record<LocationLookupKey, readonly CommonRecord[]>;
type SelectOption = { readonly label: string; readonly value: string };

const emptyLocationLookups: LocationLookupMap = {
  countries: [],
  states: [],
  districts: [],
  cities: [],
  pincodes: [],
};

const addressTypeDisplayOrder = [
  { label: "Billing Address", matches: ["Billing Address", "Billing", "BILL"] },
  { label: "Shipping Address", matches: ["Shipping Address", "Shipping", "SHIP"] },
  { label: "Secondary Address", matches: ["Secondary Address", "Secondary", "SECONDARY"] },
  { label: "Third Address", matches: ["Third Address", "Third", "THIRD"] },
] as const;

const contactTypeOptions = [
  {
    value: "contact-type:customer",
    label: "Customer",
    ledgerId: "ledger:sundry-debitors",
    ledgerName: "Customer",
  },
  {
    value: "contact-type:supplier",
    label: "Supplier",
    ledgerId: "ledger:sundry-creditors",
    ledgerName: "Supplier",
  },
  {
    value: "contact-type:vendor-customer",
    label: "Vendor Customer",
    ledgerId: "ledger:vendor-customer",
    ledgerName: "Vendor Customer",
  },
  {
    value: "contact-type:staff",
    label: "Staff",
    ledgerId: "ledger:indirect-expenses",
    ledgerName: "Indirect Expenses",
  },
] as const;

const msmeCategoryOptions: readonly SelectOption[] = [
  { value: "micro", label: "Micro" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

export function ContactUpsertPage({
  contactId,
  returnTo = "show",
}: {
  readonly contactId?: number;
  readonly returnTo?: ContactEditReturnTo;
}) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const isEdit = Boolean(contactId);
  const [form, setForm] = useState<ContactUpsertInput>(createDefaultContactFormValues());
  const [locationLookups, setLocationLookups] = useState<LocationLookupMap>(emptyLocationLookups);
  const [addressTypes, setAddressTypes] = useState<readonly CommonRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(!isEdit);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      loadLocationLookups(controller.signal),
      listCommonRecords("addressTypes", { signal: controller.signal }),
    ])
      .then(([nextLocationLookups, addressTypeRecords]) => {
        setLocationLookups(nextLocationLookups);
        setAddressTypes(addressTypeRecords);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error(error);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!contactId) {
      setForm(createDefaultContactFormValues());
      setIsLoaded(true);
      return;
    }

    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoaded(false);
    getContact(contactId, { signal: controller.signal })
      .then((record) => {
        if (record) {
          setForm(toContactFormValues(record));
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoaded(true);
          hideGlobalLoader();
        }
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [contactId, showGlobalLoader]);

  async function createLocationLookup(
    moduleKey: LocationLookupKey,
    label: string,
    address: ContactUpsertInput["addresses"][number],
  ) {
    const payload = buildLocationCreatePayload(moduleKey, label, address);
    if (!payload) {
      toast.error("Select parent location first", {
        description: `Choose the parent fields needed before creating ${locationLookupLabel(moduleKey)}.`,
      });
      return null;
    }

    try {
      const record = await createCommonRecord(moduleKey, payload);
      setLocationLookups((current) => ({
        ...current,
        [moduleKey]: [...current[moduleKey], record],
      }));
      toast.success(`${locationLookupLabel(moduleKey)} created`, {
        description: getCommonRecordLabel(record),
      });
      return record;
    } catch (error) {
      toast.error(`Could not create ${locationLookupLabel(moduleKey).toLowerCase()}`, {
        description: getErrorMessage(error),
      });
      return null;
    }
  }

  async function saveContact() {
    if (form.name.trim().length < 2) {
      setMessage("Enter contact name.");
      return;
    }

    if (!resolveContactTypeValue(form)) {
      setMessage("Select contact type.");
      return;
    }

    const hideGlobalLoader = showGlobalLoader();

    try {
      const contact = await upsertContact(
        prepareContactForSave(normalizeContactAddressTypes(form, addressTypes)),
        contactId,
      );
      toast.success(isEdit ? "Contact updated" : "Contact created", {
        description: `${contact.name} was saved.`,
      });
      router.push(isEdit && returnTo === "list" ? "/desk/contact" : `/desk/contact/${contact.id}`);
    } catch (error) {
      hideGlobalLoader();
      const errorMessage = getErrorMessage(error);
      setMessage(errorMessage);
      toast.error("Could not save contact", { description: errorMessage });
    }
  }

  if (isEdit && !isLoaded) {
    return (
      <MasterListPageFrame
        description="Loading contact record."
        technicalName="page.contact.upsert.loading"
        title="Contact"
      >
        <ContactSection title="Contact setup">
          <p className="text-sm text-muted-foreground">Loading contact.</p>
        </ContactSection>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link
            href={contactId && returnTo === "show" ? `/desk/contact/${contactId}` : "/desk/contact"}
          >
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      description={
        isEdit
          ? "Update contact identity, tax, communication, and finance details."
          : "Create a structured contact record."
      }
      technicalName="page.contact.upsert"
      title={isEdit ? "Edit contact" : "New contact"}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void saveContact();
            }}
          >
            <AnimatedTabs
              tabs={[
                {
                  value: "details",
                  label: "Details",
                  content: (
                    <ContactTabPanel>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ContactField label="Name">
                          <ContactTextInput
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                          />
                        </ContactField>
                        <ContactField label="Code">
                          <ContactTextInput
                            value={form.code}
                            placeholder="Auto generated"
                            onChange={(event) =>
                              setForm({ ...form, code: event.target.value.toUpperCase() })
                            }
                          />
                        </ContactField>
                        <ContactField label="Legal name">
                          <ContactTextInput
                            value={form.legalName ?? ""}
                            onChange={(event) =>
                              setForm({ ...form, legalName: event.target.value })
                            }
                          />
                        </ContactField>
                        <ContactField label="Contact Type *">
                          <ThemedSelect
                            value={resolveContactTypeValue(form)}
                            placeholder="Select contact type"
                            options={contactTypeOptions}
                            onValueChange={(value) => {
                              const selectedType = contactTypeOptions.find(
                                (option) => option.value === value,
                              );
                              setForm({
                                ...form,
                                contactTypeId: selectedType?.value ?? null,
                                ledgerId: selectedType?.ledgerId ?? null,
                                ledgerName: selectedType?.ledgerName ?? null,
                              });
                            }}
                          />
                        </ContactField>
                        <ContactField label="Opening balance">
                          <Input
                            type="number"
                            className="h-11 rounded-xl"
                            value={form.openingBalance}
                            onChange={(event) =>
                              setForm({ ...form, openingBalance: Number(event.target.value || 0) })
                            }
                          />
                        </ContactField>
                        <ContactField label="Credit limit">
                          <Input
                            type="number"
                            className="h-11 rounded-xl"
                            value={form.creditLimit}
                            onChange={(event) =>
                              setForm({ ...form, creditLimit: Number(event.target.value || 0) })
                            }
                          />
                        </ContactField>
                        <div className="md:col-span-2">
                          <ContactStatusSwitch
                            checked={form.isActive}
                            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                          />
                        </div>
                      </div>
                    </ContactTabPanel>
                  ),
                },
                {
                  value: "tax",
                  label: "Tax Details",
                  content: (
                    <ContactTabPanel>
                      <div className="space-y-5">
                        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                          <ContactField label="GSTIN">
                            <ContactTextInput
                              value={form.gstin ?? ""}
                              onChange={(event) =>
                                setForm({ ...form, gstin: event.target.value.toUpperCase() })
                              }
                            />
                          </ContactField>
                          <ContactField label="PAN">
                            <ContactTextInput
                              value={form.pan ?? ""}
                              onChange={(event) =>
                                setForm({ ...form, pan: event.target.value.toUpperCase() })
                              }
                            />
                          </ContactField>
                          <ContactField label="MSME No">
                            <ContactTextInput
                              value={form.msmeNo ?? ""}
                              onChange={(event) => setForm({ ...form, msmeNo: event.target.value })}
                            />
                          </ContactField>
                          <ContactField label="MSME Category">
                            <ThemedSelect
                              value={form.msmeType ?? ""}
                              placeholder="Select MSME category"
                              options={msmeCategoryOptions}
                              onValueChange={(value) => setForm({ ...form, msmeType: value })}
                            />
                          </ContactField>
                          <ContactField label="TAN No">
                            <ContactTextInput
                              value={form.tan ?? ""}
                              onChange={(event) =>
                                setForm({ ...form, tan: event.target.value.toUpperCase() })
                              }
                            />
                          </ContactField>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <ContactToggleCard
                            checked={form.tdsAvailable}
                            label="TDS Available"
                            description="Enable when this contact has TDS applicability."
                            onCheckedChange={(checked) =>
                              setForm({ ...form, tdsAvailable: checked })
                            }
                          />
                          <ContactToggleCard
                            checked={form.tcsAvailable}
                            label="TCS Available"
                            description="Enable when this contact has TCS applicability."
                            onCheckedChange={(checked) =>
                              setForm({ ...form, tcsAvailable: checked })
                            }
                          />
                        </div>
                      </div>
                    </ContactTabPanel>
                  ),
                },
                {
                  value: "communication",
                  label: "Communication",
                  content: (
                    <ContactTabPanel>
                      <div className="space-y-5">
                        <ContactCollectionSection
                          title="Contact Emails"
                          description="Operational and communication email addresses."
                          onAdd={() =>
                            setForm({
                              ...form,
                              emails: [
                                ...form.emails,
                                { email: "", emailType: "", isPrimary: false },
                              ],
                            })
                          }
                        >
                          {form.emails.map((email, index) => (
                            <ContactCollectionRow
                              key={index}
                              onRemove={() =>
                                setForm({
                                  ...form,
                                  emails: form.emails.filter((_, itemIndex) => itemIndex !== index),
                                })
                              }
                            >
                              <ContactField label="Email">
                                <ContactTextInput
                                  type="email"
                                  value={email.email}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      emails: updateCollectionItem(form.emails, index, {
                                        email: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                              <ContactField label="Email Type">
                                <ContactTextInput
                                  value={email.emailType}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      emails: updateCollectionItem(form.emails, index, {
                                        emailType: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                              <ContactPrimaryCheckbox
                                checked={email.isPrimary}
                                label="Primary email"
                                onCheckedChange={(checked) =>
                                  setForm({
                                    ...form,
                                    emails: form.emails.map((item, itemIndex) => ({
                                      ...item,
                                      isPrimary: itemIndex === index ? checked : false,
                                    })),
                                  })
                                }
                              />
                            </ContactCollectionRow>
                          ))}
                        </ContactCollectionSection>
                        <ContactCollectionSection
                          title="Contact Phones"
                          description="Phone and messaging channels used by the contact."
                          onAdd={() =>
                            setForm({
                              ...form,
                              phones: [
                                ...form.phones,
                                { phoneNumber: "", phoneType: "", isPrimary: false },
                              ],
                            })
                          }
                        >
                          {form.phones.map((phone, index) => (
                            <ContactCollectionRow
                              key={index}
                              onRemove={() =>
                                setForm({
                                  ...form,
                                  phones: form.phones.filter((_, itemIndex) => itemIndex !== index),
                                })
                              }
                            >
                              <ContactField label="Phone Number">
                                <ContactTextInput
                                  value={phone.phoneNumber}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      phones: updateCollectionItem(form.phones, index, {
                                        phoneNumber: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                              <ContactField label="Phone Type">
                                <ContactTextInput
                                  value={phone.phoneType}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      phones: updateCollectionItem(form.phones, index, {
                                        phoneType: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                              <ContactPrimaryCheckbox
                                checked={phone.isPrimary}
                                label="Primary phone"
                                onCheckedChange={(checked) =>
                                  setForm({
                                    ...form,
                                    phones: form.phones.map((item, itemIndex) => ({
                                      ...item,
                                      isPrimary: itemIndex === index ? checked : false,
                                    })),
                                  })
                                }
                              />
                            </ContactCollectionRow>
                          ))}
                        </ContactCollectionSection>
                        <ContactCollectionSection
                          title="Social Links"
                          description="Public links used in profile and storefront surfaces."
                          onAdd={() =>
                            setForm({
                              ...form,
                              socialLinks: [
                                ...form.socialLinks,
                                { platform: "", url: "", isActive: true },
                              ],
                            })
                          }
                        >
                          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                            <ContactField label="Website">
                              <ContactTextInput
                                value={form.website ?? ""}
                                onChange={(event) =>
                                  setForm({ ...form, website: event.target.value })
                                }
                              />
                            </ContactField>
                          </div>
                          {form.socialLinks.map((link, index) => (
                            <ContactCollectionRow
                              key={index}
                              onRemove={() =>
                                setForm({
                                  ...form,
                                  socialLinks: form.socialLinks.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                })
                              }
                            >
                              <ContactField label="Platform">
                                <ContactTextInput
                                  value={link.platform}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      socialLinks: updateCollectionItem(form.socialLinks, index, {
                                        platform: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                              <ContactField label="URL">
                                <ContactTextInput
                                  value={link.url}
                                  onChange={(event) =>
                                    setForm({
                                      ...form,
                                      socialLinks: updateCollectionItem(form.socialLinks, index, {
                                        url: event.target.value,
                                      }),
                                    })
                                  }
                                />
                              </ContactField>
                            </ContactCollectionRow>
                          ))}
                        </ContactCollectionSection>
                      </div>
                    </ContactTabPanel>
                  ),
                },
                {
                  value: "addresses",
                  label: "Addressing",
                  content: (
                    <ContactTabPanel>
                      <ContactCollectionHeader
                        title="Address Book"
                        description="Reusable contact addresses linked to common location masters."
                        onAdd={() =>
                          setForm({
                            ...form,
                            addresses: [
                              ...form.addresses,
                              {
                                ...createDefaultContactFormValues().addresses[0]!,
                                addressTypeId: getDefaultAddressTypeId(addressTypes),
                                isDefault: form.addresses.length === 0,
                              },
                            ],
                          })
                        }
                      />
                      <div className="space-y-4">
                        {form.addresses.map((address, index) => (
                          <ContactCollectionRow
                            key={index}
                            gridClassName="md:grid-cols-2"
                            onRemove={() =>
                              setForm({
                                ...form,
                                addresses: form.addresses.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              })
                            }
                          >
                            <div className="md:col-span-2">
                              <AddressTypeSelect
                                label="Address Type"
                                options={addressTypes}
                                value={address.addressTypeId}
                                onChange={(value) =>
                                  setForm({
                                    ...form,
                                    addresses: updateAddress(form, index, { addressTypeId: value }),
                                  })
                                }
                              />
                            </div>
                            <ContactField label="Address">
                              <ContactTextInput
                                value={address.addressLine1}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    addresses: updateAddress(form, index, {
                                      addressLine1: event.target.value,
                                    }),
                                  })
                                }
                              />
                            </ContactField>
                            <ContactField label="Area / Location">
                              <ContactTextInput
                                value={address.addressLine2 ?? ""}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    addresses: updateAddress(form, index, {
                                      addressLine2: event.target.value,
                                    }),
                                  })
                                }
                              />
                            </ContactField>
                            <AddressLookupInput
                              label="Country"
                              moduleKey="countries"
                              options={locationLookups.countries}
                              value={address.countryId}
                              onChange={(value) =>
                                setForm({
                                  ...form,
                                  addresses: updateAddress(form, index, { countryId: value }),
                                })
                              }
                              onCreate={(label) =>
                                createLocationLookup("countries", label, address)
                              }
                            />
                            <AddressLookupInput
                              label="State"
                              moduleKey="states"
                              options={locationLookups.states}
                              value={address.stateId}
                              onChange={(value) =>
                                setForm({
                                  ...form,
                                  addresses: updateAddress(form, index, { stateId: value }),
                                })
                              }
                              onCreate={(label) => createLocationLookup("states", label, address)}
                            />
                            <AddressLookupInput
                              label="District"
                              moduleKey="districts"
                              options={locationLookups.districts}
                              value={address.districtId}
                              onChange={(value) =>
                                setForm({
                                  ...form,
                                  addresses: updateAddress(form, index, { districtId: value }),
                                })
                              }
                              onCreate={(label) =>
                                createLocationLookup("districts", label, address)
                              }
                            />
                            <AddressLookupInput
                              label="City"
                              moduleKey="cities"
                              options={locationLookups.cities}
                              value={address.cityId}
                              onChange={(value) =>
                                setForm({
                                  ...form,
                                  addresses: updateAddress(form, index, { cityId: value }),
                                })
                              }
                              onCreate={(label) => createLocationLookup("cities", label, address)}
                            />
                            <AddressLookupInput
                              label="Pincode"
                              moduleKey="pincodes"
                              options={locationLookups.pincodes}
                              value={address.pincodeId}
                              onChange={(value) =>
                                setForm({
                                  ...form,
                                  addresses: updateAddress(form, index, { pincodeId: value }),
                                })
                              }
                              onCreate={(label) => createLocationLookup("pincodes", label, address)}
                            />
                            <label
                              className={
                                address.isDefault
                                  ? "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-950"
                                  : "flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-border/70 bg-muted/10 px-4 py-2"
                              }
                            >
                              <span>
                                <span className="block text-sm font-medium leading-tight">
                                  Primary address
                                </span>
                                <span className="block text-xs leading-tight text-muted-foreground">
                                  Used as the main contact address.
                                </span>
                              </span>
                              <Switch
                                checked={address.isDefault}
                                aria-label="Primary address"
                                onCheckedChange={(checked) =>
                                  setForm({
                                    ...form,
                                    addresses: form.addresses.map((item, itemIndex) => ({
                                      ...item,
                                      isDefault: itemIndex === index ? checked : false,
                                    })),
                                  })
                                }
                              />
                            </label>
                          </ContactCollectionRow>
                        ))}
                      </div>
                    </ContactTabPanel>
                  ),
                },
                {
                  value: "notes",
                  label: "Notes",
                  content: (
                    <ContactTabPanel>
                      <ContactField label="Description">
                        <textarea
                          value={form.description ?? ""}
                          className="min-h-28 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                          onChange={(event) =>
                            setForm({ ...form, description: event.target.value })
                          }
                        />
                      </ContactField>
                    </ContactTabPanel>
                  ),
                },
              ]}
            />
            {message ? (
              <p className="text-sm font-medium text-muted-foreground">{message}</p>
            ) : null}
            <Separator />
            <Button type="submit" className="rounded-xl">
              <Save className="size-4" />
              {isEdit ? "Update contact" : "Create contact"}
            </Button>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

function ContactTabPanel({ children }: { readonly children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
      {children}
    </div>
  );
}

function resolveContactTypeValue(form: ContactUpsertInput) {
  const directMatch = contactTypeOptions.find((option) => option.value === form.contactTypeId);
  if (directMatch) return directMatch.value;

  const legacyContactTypeMatch = legacyContactTypeAliases.find(
    (alias) => alias.value === form.contactTypeId,
  );
  if (legacyContactTypeMatch) return legacyContactTypeMatch.nextValue;

  const ledgerMatch = contactTypeOptions.find(
    (option) =>
      [option.ledgerName, ...legacyLedgerAliases(option.value)].some(
        (ledgerName) =>
          normalizeLookupText(ledgerName) === normalizeLookupText(form.ledgerName ?? ""),
      ),
  );

  return ledgerMatch?.value ?? "";
}

const legacyContactTypeAliases = [
  { value: "contact-type:partner", nextValue: "contact-type:vendor-customer" },
] as const;

function legacyLedgerAliases(contactTypeValue: string) {
  if (contactTypeValue === "contact-type:customer") return ["Sundry Debtors"];
  if (contactTypeValue === "contact-type:supplier") return ["Sundry Creditors"];
  return [];
}

function ContactToggleCard({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  readonly checked: boolean;
  readonly description: string;
  readonly label: string;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={
        checked
          ? "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
          : "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3"
      }
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} aria-label={label} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function ContactCollectionSection({
  children,
  description,
  onAdd,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly onAdd: () => void;
  readonly title: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
      <ContactCollectionHeader title={title} description={description} onAdd={onAdd} />
      {children}
    </section>
  );
}

function ContactCollectionHeader({
  description,
  onAdd,
  title,
}: {
  readonly description: string;
  readonly onAdd: () => void;
  readonly title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" variant="outline" className="rounded-xl" onClick={onAdd}>
        Add
      </Button>
    </div>
  );
}

function ContactCollectionRow({
  children,
  gridClassName = "md:grid-cols-[1fr_1fr_auto]",
  onRemove,
}: {
  readonly children: ReactNode;
  readonly gridClassName?: string;
  readonly onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="ghost" className="h-8 gap-2 rounded-lg" onClick={onRemove}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>
      <div className={`grid gap-x-6 gap-y-5 ${gridClassName}`}>{children}</div>
    </div>
  );
}

function ContactPrimaryCheckbox({
  checked,
  label,
  onCheckedChange,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 pt-7 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        className="size-4 cursor-pointer"
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function updateCollectionItem<T extends object>(
  items: readonly T[],
  index: number,
  patch: Partial<T>,
) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function updateAddress(
  form: ContactUpsertInput,
  index: number,
  patch: Partial<ContactUpsertInput["addresses"][number]>,
) {
  return form.addresses.map((address, itemIndex) =>
    itemIndex === index ? { ...address, ...patch } : address,
  );
}

function normalizeContactAddressTypes(
  form: ContactUpsertInput,
  addressTypes: readonly CommonRecord[],
): ContactUpsertInput {
  return {
    ...form,
    addresses: form.addresses.map((address) => ({
      ...address,
      addressTypeId:
        resolveAddressTypeValue(address.addressTypeId, addressTypes) ??
        getDefaultAddressTypeId(addressTypes) ??
        address.addressTypeId,
    })),
  };
}

function AddressTypeSelect({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string | null) => void;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const selectOptions = getAddressTypeSelectOptions(options);
  const resolvedValue = resolveAddressTypeValue(value, options) ?? getDefaultAddressTypeId(options);
  return (
    <ContactField label={label}>
      <ThemedSelect
        value={resolvedValue ?? ""}
        placeholder="Select address type"
        options={
          selectOptions.length
            ? selectOptions
            : [{ value: value ?? "", label: formatLookupFallback(value) || "Billing Address" }]
        }
        onValueChange={(nextValue) => onChange(nextValue || getDefaultAddressTypeId(options))}
      />
    </ContactField>
  );
}

function ThemedSelect({
  onValueChange,
  options,
  placeholder,
  value,
}: {
  readonly onValueChange: (value: string) => void;
  readonly options: readonly SelectOption[];
  readonly placeholder: string;
  readonly value: string;
}) {
  const selectedOption = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full cursor-pointer justify-between rounded-xl border-input bg-background px-3 text-left font-normal text-foreground shadow-sm hover:bg-accent/50"
        >
          <span
            className={
              selectedOption ? "min-w-0 truncate" : "min-w-0 truncate text-muted-foreground"
            }
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[120] max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl p-1 shadow-xl"
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2"
              onSelect={() => onValueChange(option.value)}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {isSelected ? (
                <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddressLookupInput({
  label,
  moduleKey,
  onChange,
  onCreate,
  options,
  value,
}: {
  readonly label: string;
  readonly moduleKey: LocationLookupKey;
  readonly onChange: (value: string | null) => void;
  readonly onCreate: (label: string) => Promise<CommonRecord | null>;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  const selectedOption = findLookupOption(options, selectedValue);
  const [query, setQuery] = useState(() =>
    selectedOption
      ? getLocationRecordLabel(moduleKey, selectedOption)
      : formatLookupFallback(value),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    getLocationRecordLabel(moduleKey, option).toLowerCase().includes(normalizedQuery),
  );
  const exactOption = options.find(
    (option) => getLocationRecordLabel(moduleKey, option).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(query.trim()) && !exactOption;
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => setSelectedValue(value), [value]);
  useEffect(() => {
    setQuery(
      selectedOption
        ? getLocationRecordLabel(moduleKey, selectedOption)
        : formatLookupFallback(selectedValue),
    );
  }, [moduleKey, selectedOption, selectedValue]);
  useEffect(() => setActiveIndex(0), [query, options]);

  function selectOption(option: CommonRecord) {
    const nextValue = String(option.id);
    setQuery(getLocationRecordLabel(moduleKey, option));
    setSelectedValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  }

  async function createAndSelect() {
    const labelValue = query.trim();
    if (!labelValue) return;
    const record = await onCreate(labelValue);
    if (!record) return;
    const nextValue = String(record.id);
    setQuery(getLocationRecordLabel(moduleKey, record));
    setSelectedValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  }

  async function selectActiveOption() {
    if (optionCount === 0) return;
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) {
      selectOption(activeOption);
      return;
    }
    if (canCreate && activeIndex === filteredOptions.length) await createAndSelect();
  }

  return (
    <div className="relative z-10 grid gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 cursor-pointer rounded-xl"
        value={query}
        placeholder={`Search ${label.toLowerCase()}`}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => (optionCount ? (current + 1) % optionCount : 0));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) =>
              optionCount ? (current - 1 + optionCount) % optionCount : 0,
            );
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            void selectActiveOption();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          if (exactOption) {
            const nextValue = String(exactOption.id);
            setSelectedValue(nextValue);
            onChange(nextValue);
          }
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          const matchingOption = options.find(
            (option) =>
              getLocationRecordLabel(moduleKey, option).toLowerCase() ===
              nextQuery.trim().toLowerCase(),
          );
          const nextValue = matchingOption ? String(matchingOption.id) : null;
          setSelectedValue(nextValue);
          onChange(nextValue);
        }}
      />
      {isOpen && optionCount > 0 ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = isLookupOptionSelected(option, selectedValue);
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                className={
                  activeIndex === index
                    ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="min-w-0 truncate">
                  {getLocationRecordLabel(moduleKey, option)}
                </span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>
            );
          })}
          {canCreate ? (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === filteredOptions.length}
              className={
                activeIndex === filteredOptions.length
                  ? "block w-full cursor-pointer rounded-lg bg-muted px-3 py-2 text-left text-sm font-medium text-primary"
                  : "block w-full cursor-pointer rounded-lg bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              }
              onMouseDown={async (event) => {
                event.preventDefault();
                await createAndSelect();
              }}
            >
              + Create {locationLookupLabel(moduleKey)} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

async function loadLocationLookups(signal: AbortSignal): Promise<LocationLookupMap> {
  const [countries, states, districts, cities, pincodes] = await Promise.all([
    listCommonRecords("countries", { signal }),
    listCommonRecords("states", { signal }),
    listCommonRecords("districts", { signal }),
    listCommonRecords("cities", { signal }),
    listCommonRecords("pincodes", { signal }),
  ]);
  return { countries, states, districts, cities, pincodes };
}

function buildLocationCreatePayload(
  moduleKey: LocationLookupKey,
  label: string,
  address: ContactUpsertInput["addresses"][number],
) {
  const code = toLookupCode(label);
  switch (moduleKey) {
    case "countries":
      return { code, name: label, phoneCode: null, isActive: true };
    case "states": {
      const countryId = toNumericId(address.countryId);
      return countryId ? { countryId, code, name: label, isActive: true } : null;
    }
    case "districts": {
      const stateId = toNumericId(address.stateId);
      return stateId ? { stateId, code, name: label, isActive: true } : null;
    }
    case "cities": {
      const stateId = toNumericId(address.stateId);
      const districtId = toNumericId(address.districtId);
      return stateId && districtId
        ? { stateId, districtId, code, name: label, isActive: true }
        : null;
    }
    case "pincodes": {
      const countryId = toNumericId(address.countryId);
      const stateId = toNumericId(address.stateId);
      const districtId = toNumericId(address.districtId);
      const cityId = toNumericId(address.cityId);
      return countryId && stateId && districtId && cityId
        ? { countryId, stateId, districtId, cityId, code: label, areaName: null, isActive: true }
        : null;
    }
  }
}

function getCommonRecordLabel(record: CommonRecord) {
  const name = typeof record.name === "string" ? record.name : "";
  const code = typeof record.code === "string" ? record.code : "";
  const areaName = typeof record.areaName === "string" ? record.areaName : "";
  return name || areaName || code || String(record.id);
}

function getLocationRecordLabel(moduleKey: LocationLookupKey, record: CommonRecord) {
  const code = typeof record.code === "string" ? record.code.trim() : "";
  if (moduleKey === "pincodes") return code || String(record.id);
  return getCommonRecordLabel(record);
}

function findLookupOption(options: readonly CommonRecord[], value: string | null) {
  if (!value) return undefined;
  return options.find((option) => isLookupOptionSelected(option, value));
}

function isLookupOptionSelected(option: CommonRecord, value: string | null) {
  if (!value) return false;
  const optionId = String(option.id);
  return optionId === String(value) || optionId === String(toNumericId(value));
}

function getDefaultAddressTypeId(addressTypes: readonly CommonRecord[]) {
  return getAddressTypeSelectOptions(addressTypes)[0]?.value ?? null;
}

function resolveAddressTypeValue(value: string | null, addressTypes: readonly CommonRecord[]) {
  const selectOptions = getAddressTypeSelectOptions(addressTypes);
  if (!value) return getDefaultAddressTypeId(addressTypes);
  const directMatch = selectOptions.find((option) => option.value === String(value));
  if (directMatch) return directMatch.value;
  const labelMatch = getAddressTypeCandidates(value)
    .map((candidate) =>
      selectOptions.find(
        (option) => normalizeLookupText(option.label) === normalizeLookupText(candidate),
      ),
    )
    .find(Boolean);
  return labelMatch?.value ?? null;
}

function getAddressTypeSelectOptions(addressTypes: readonly CommonRecord[]) {
  return addressTypeDisplayOrder.reduce<SelectOption[]>((selectOptions, displayType) => {
    const record = addressTypes.find((option) =>
      displayType.matches.some((candidate) => matchesAddressTypeRecord(option, candidate)),
    );
    if (record) selectOptions.push({ value: String(record.id), label: displayType.label });
    return selectOptions;
  }, []);
}

function getAddressTypeCandidates(value: string) {
  const cleanValue = formatLookupFallback(value);
  return [cleanValue, cleanValue.replace(/\s+\d+$/g, "")].filter(Boolean);
}

function matchesAddressTypeRecord(option: CommonRecord, value: string) {
  const normalizedValue = normalizeLookupText(value);
  return (
    normalizeLookupText(getCommonRecordLabel(option)) === normalizedValue ||
    normalizeLookupText(String(option.code ?? "")) === normalizedValue
  );
}

function formatLookupFallback(value: string | null) {
  if (!value) return "";
  const rawValue = String(value);
  const [, suffix] = rawValue.split(":");
  return suffix ? titleCaseLookupValue(suffix) : rawValue;
}

function titleCaseLookupValue(value: string) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function locationLookupLabel(moduleKey: LocationLookupKey) {
  return (
    {
      countries: "Country",
      states: "State",
      districts: "District",
      cities: "City",
      pincodes: "Pincode",
    } as const
  )[moduleKey];
}

function toLookupCode(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function toNumericId(value: string | null) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function normalizeLookupText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
