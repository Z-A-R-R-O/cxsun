import type { ReactElement } from "react"
import type { AuthSession } from "src/features/auth/auth-client"
import { CommonModulePage } from "./common-data-page"

interface CommonPageProps {
  session: AuthSession
}

type CommonPageComponent = (props: CommonPageProps) => ReactElement

export function CommonDataPage({ moduleKey, session }: { moduleKey: string; session: AuthSession }) {
  const Page = commonPageRegistry[moduleKey]
  return Page ? <Page session={session} /> : <GenericCommonPage moduleKey={moduleKey} session={session} />
}

function GenericCommonPage({ moduleKey, session }: CommonPageProps & { moduleKey: string }) {
  return <CommonModulePage moduleKey={moduleKey} session={session} />
}

function CountriesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="countries" session={session} />
}

function StatesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="states" session={session} />
}

function DistrictsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="districts" session={session} />
}

function CitiesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="cities" session={session} />
}

function PincodesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="pincodes" session={session} />
}

function ContactGroupsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="contactGroups" session={session} />
}

function ContactTypesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="contactTypes" session={session} />
}

function AddressTypesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="addressTypes" session={session} />
}

function BankNamesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="bankNames" session={session} />
}

function ProductGroupsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="productGroups" session={session} />
}

function ProductCategoriesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="productCategories" session={session} />
}

function ProductTypesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="productTypes" session={session} />
}

function HsnCodesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="hsnCodes" session={session} />
}

function BrandsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="brands" session={session} />
}

function ColoursCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="colours" session={session} />
}

function SizesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="sizes" session={session} />
}

function UnitsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="units" session={session} />
}

function TaxesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="taxes" session={session} />
}

function CurrenciesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="currencies" session={session} />
}

function OrderTypesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="orderTypes" session={session} />
}

function StylesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="styles" session={session} />
}

function TransportsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="transports" session={session} />
}

function WarehousesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="warehouses" session={session} />
}

function DestinationsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="destinations" session={session} />
}

function PaymentTermsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="paymentTerms" session={session} />
}

function AccountingYearCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="accountingYear" session={session} />
}

function MonthsCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="months" session={session} />
}

function StockRejectionTypesCommonPage({ session }: CommonPageProps) {
  return <CommonModulePage moduleKey="stockRejectionTypes" session={session} />
}

const commonPageRegistry: Record<string, CommonPageComponent> = {
  accountingYear: AccountingYearCommonPage,
  addressTypes: AddressTypesCommonPage,
  bankNames: BankNamesCommonPage,
  brands: BrandsCommonPage,
  cities: CitiesCommonPage,
  colours: ColoursCommonPage,
  contactGroups: ContactGroupsCommonPage,
  contactTypes: ContactTypesCommonPage,
  countries: CountriesCommonPage,
  currencies: CurrenciesCommonPage,
  destinations: DestinationsCommonPage,
  districts: DistrictsCommonPage,
  hsnCodes: HsnCodesCommonPage,
  months: MonthsCommonPage,
  orderTypes: OrderTypesCommonPage,
  paymentTerms: PaymentTermsCommonPage,
  pincodes: PincodesCommonPage,
  productCategories: ProductCategoriesCommonPage,
  productGroups: ProductGroupsCommonPage,
  productTypes: ProductTypesCommonPage,
  sizes: SizesCommonPage,
  states: StatesCommonPage,
  stockRejectionTypes: StockRejectionTypesCommonPage,
  styles: StylesCommonPage,
  taxes: TaxesCommonPage,
  transports: TransportsCommonPage,
  units: UnitsCommonPage,
  warehouses: WarehousesCommonPage,
}
