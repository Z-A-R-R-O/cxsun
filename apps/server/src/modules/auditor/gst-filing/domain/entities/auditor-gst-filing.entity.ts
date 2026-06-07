export interface AuditorGstFilingRecord {
  id: number
  uuid: string
  contact_id: number
  contact_name: string
  month_id: string | null
  month_name: string
  accounting_year_id: string | null
  accounting_year_name: string
  gstr1_arn: string | null
  gstr1_date: string | null
  gstr3b_arn: string | null
  gstr3b_date: string | null
  status: string
  is_active: boolean
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface AuditorGstFilingUpsertInput {
  id?: number
  uuid?: string
  contact_id?: number
  contactId?: number
  contact_name?: string
  contactName?: string
  client_id?: number
  clientId?: number
  client_name?: string
  clientName?: string
  month_id?: string | null
  monthId?: string | null
  month_name?: string
  monthName?: string
  accounting_year_id?: string | null
  accountingYearId?: string | null
  accounting_year_name?: string
  accountingYearName?: string
  gstr1_arn?: string | null
  gstr1Arn?: string | null
  gstr1_date?: string | null
  gstr1Date?: string | null
  gstr3b_arn?: string | null
  gstr3bArn?: string | null
  gstr3b_date?: string | null
  gstr3bDate?: string | null
  status?: string
  is_active?: boolean
  isActive?: boolean
}
