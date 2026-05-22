import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { citiesCommonDefinition } from './definition.js'

const citiesRows: { code: string; name: string; districtCode: string }[] = [
  { code: '-', name: '-', districtCode: '-' },
  { code: 'MAA', name: 'Chennai', districtCode: 'TN-CHN' },
  { code: 'CBE', name: 'Coimbatore', districtCode: 'TN-CBE' },
  { code: 'MDU', name: 'Madurai', districtCode: 'TN-MDU' },
  { code: 'TPR', name: 'Tiruppur', districtCode: 'TN-TPR' },
  { code: 'TRY', name: 'Tiruchirappalli', districtCode: 'TN-TRY' },
  { code: 'SLM', name: 'Salem', districtCode: 'TN-SLM' },
  { code: 'ERD', name: 'Erode', districtCode: 'TN-ERD' },
  { code: 'TNV', name: 'Tirunelveli', districtCode: 'TN-TNV' },
  { code: 'TTK', name: 'Thoothukudi', districtCode: 'TN-TTK' },
  { code: 'VLR', name: 'Vellore', districtCode: 'TN-VLR' },
  { code: 'DGL', name: 'Dindigul', districtCode: 'TN-DGL' },
  { code: 'TNJ', name: 'Thanjavur', districtCode: 'TN-TNJ' },
  { code: 'HSR', name: 'Hosur', districtCode: 'TN-KGI' },
  { code: 'NGL', name: 'Nagercoil', districtCode: 'TN-KKI' },
  { code: 'AVD', name: 'Avadi', districtCode: 'TN-TRYR' },
  { code: 'TBM', name: 'Tambaram', districtCode: 'TN-CHG' },
  { code: 'KPM', name: 'Kancheepuram', districtCode: 'TN-KPM' },
  { code: 'CUD', name: 'Cuddalore', districtCode: 'TN-CUD' },
  { code: 'KRR', name: 'Karur', districtCode: 'TN-KRR' },
  { code: 'SVK', name: 'Sivakasi', districtCode: 'TN-VNR' },
  { code: 'KMU', name: 'Kumbakonam', districtCode: 'TN-TNJ' },
  { code: 'MTP', name: 'Mettupalayam', districtCode: 'TN-CBE' },
  { code: 'PLD', name: 'Pollachi', districtCode: 'TN-CBE' },
  { code: 'UDT', name: 'Udumalaipettai', districtCode: 'TN-TPR' },
  { code: 'DHP', name: 'Dharapuram', districtCode: 'TN-TPR' },
  { code: 'KGL', name: 'Kangeyam', districtCode: 'TN-TPR' },
  { code: 'BLR', name: 'Bengaluru', districtCode: 'KA-BLR' },
  { code: 'BOM', name: 'Mumbai', districtCode: 'MH-MUM' },
  { code: 'DEL', name: 'New Delhi', districtCode: 'DL-ND' },
  { code: 'HYD', name: 'Hyderabad', districtCode: 'TG-HYD' },
  { code: 'AMD', name: 'Ahmedabad', districtCode: 'GJ-AHM' },
  { code: 'CCU', name: 'Kolkata', districtCode: 'WB-KOL' },
  { code: 'LDH', name: 'Ludhiana', districtCode: 'PB-LDH' },
  { code: 'JAI', name: 'Jaipur', districtCode: 'RJ-JPR' },
  { code: 'LKO', name: 'Lucknow', districtCode: 'UP-LKO' },
  { code: 'COK', name: 'Kochi', districtCode: 'KL-ERN' },
  { code: 'GOI', name: 'Panaji', districtCode: 'GA-NGA' },
  { code: 'PAT', name: 'Patna', districtCode: 'BR-PAT' },
  { code: 'IDR', name: 'Indore', districtCode: 'MP-IND' },
]

export function seedCitiesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(
    database,
    citiesCommonDefinition,
    citiesRows.map((row) => ({ name: row.name, district_id: districtId(row.districtCode) })),
  )
}

function districtId(code: string) {
  return Math.max(1, citiesDistrictCodes.indexOf(code) + 1)
}

const citiesDistrictCodes = [
  '-', 'TN-CHN', 'TN-CBE', 'TN-MDU', 'TN-TPR', 'TN-TRY', 'TN-SLM', 'TN-ERD', 'TN-TNV', 'TN-TTK',
  'TN-VLR', 'TN-DGL', 'TN-TNJ', 'TN-KKI', 'TN-KGI', 'TN-KPM', 'TN-CUD', 'TN-KRR', 'TN-VNR',
  'TN-TVR', 'TN-TRYR', 'TN-CHG', 'KA-BLR', 'MH-MUM', 'DL-ND', 'TG-HYD', 'GJ-AHM', 'WB-KOL',
  'PB-LDH', 'RJ-JPR', 'UP-LKO', 'KL-ERN', 'GA-NGA', 'BR-PAT', 'MP-IND',
]
