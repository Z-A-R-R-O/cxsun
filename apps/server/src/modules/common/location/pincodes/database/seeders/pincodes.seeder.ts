import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { pincodesCommonDefinition } from '../../domain/value-objects/pincodes.definition.js'

const citiesSeedCodes = [
  '-', 'MAA', 'CBE', 'MDU', 'TPR', 'TRY', 'SLM', 'ERD', 'TNV',
  'TTK', 'VLR', 'DGL', 'TNJ', 'HSR', 'NGL', 'AVD', 'TBM', 'KPM',
  'CUD', 'KRR', 'SVK', 'KMU', 'MTP', 'PLD', 'UDT', 'DHP', 'KGL',
  'BLR', 'BOM', 'DEL', 'HYD', 'AMD', 'CCU', 'LDH', 'JAI', 'LKO',
  'COK', 'GOI', 'PAT', 'IDR',
]

const citiesDistrictMap: Record<string, string> = {
  'MAA': 'TN-CHN', 'CBE': 'TN-CBE', 'MDU': 'TN-MDU', 'TPR': 'TN-TPR',
  'TRY': 'TN-TRY', 'SLM': 'TN-SLM', 'ERD': 'TN-ERD', 'TNV': 'TN-TNV',
  'TTK': 'TN-TTK', 'VLR': 'TN-VLR', 'DGL': 'TN-DGL', 'TNJ': 'TN-TNJ',
  'HSR': 'TN-KGI', 'NGL': 'TN-KKI', 'AVD': 'TN-TRYR', 'TBM': 'TN-CHG',
  'KPM': 'TN-KPM', 'CUD': 'TN-CUD', 'KRR': 'TN-KRR', 'SVK': 'TN-VNR',
  'KMU': 'TN-TNJ', 'MTP': 'TN-CBE', 'PLD': 'TN-CBE', 'UDT': 'TN-TPR',
  'DHP': 'TN-TPR', 'KGL': 'TN-TPR', 'BLR': 'KA-BLR', 'BOM': 'MH-MUM',
  'DEL': 'DL-ND', 'HYD': 'TG-HYD', 'AMD': 'GJ-AHM', 'CCU': 'WB-KOL',
  'LDH': 'PB-LDH', 'JAI': 'RJ-JPR', 'LKO': 'UP-LKO', 'COK': 'KL-ERN',
  'GOI': 'GA-NGA', 'PAT': 'BR-PAT', 'IDR': 'MP-IND',
}

const districtStateMap: Record<string, string> = {
  'TN-CHN': 'TN', 'TN-CBE': 'TN', 'TN-MDU': 'TN', 'TN-TPR': 'TN',
  'TN-TRY': 'TN', 'TN-SLM': 'TN', 'TN-ERD': 'TN', 'TN-TNV': 'TN',
  'TN-TTK': 'TN', 'TN-VLR': 'TN', 'TN-DGL': 'TN', 'TN-TNJ': 'TN',
  'TN-KKI': 'TN', 'TN-KGI': 'TN', 'TN-KPM': 'TN', 'TN-CUD': 'TN',
  'TN-KRR': 'TN', 'TN-VNR': 'TN', 'TN-TVR': 'TN', 'TN-TRYR': 'TN',
  'TN-CHG': 'TN', 'KA-BLR': 'KA', 'MH-MUM': 'MH', 'DL-ND': 'DL',
  'TG-HYD': 'TG', 'GJ-AHM': 'GJ', 'WB-KOL': 'WB', 'PB-LDH': 'PB',
  'RJ-JPR': 'RJ', 'UP-LKO': 'UP', 'KL-ERN': 'KL', 'GA-NGA': 'GA',
  'BR-PAT': 'BR', 'MP-IND': 'MP',
}

const pincodesRows: { code: string; area_name: string; cityCode: string }[] = [
  { code: '-', area_name: '-', cityCode: '-' },
  { code: '600001', area_name: 'George Town', cityCode: 'MAA' },
  { code: '600017', area_name: 'T Nagar', cityCode: 'MAA' },
  { code: '600028', area_name: 'Mylapore', cityCode: 'MAA' },
  { code: '600042', area_name: 'Velachery', cityCode: 'MAA' },
  { code: '600100', area_name: 'Medavakkam', cityCode: 'MAA' },
  { code: '641001', area_name: 'Town Hall', cityCode: 'CBE' },
  { code: '641002', area_name: 'R S Puram', cityCode: 'CBE' },
  { code: '641004', area_name: 'Peelamedu', cityCode: 'CBE' },
  { code: '641018', area_name: 'Race Course', cityCode: 'CBE' },
  { code: '641035', area_name: 'Saravanampatti', cityCode: 'CBE' },
  { code: '641600', area_name: 'Tiruppur North', cityCode: 'TPR' },
  { code: '641601', area_name: 'Tiruppur', cityCode: 'TPR' },
  { code: '641602', area_name: 'Tiruppur South', cityCode: 'TPR' },
  { code: '641603', area_name: 'Gandhi Nagar', cityCode: 'TPR' },
  { code: '641604', area_name: 'Kumar Nagar', cityCode: 'TPR' },
  { code: '641605', area_name: 'Veerapandi', cityCode: 'TPR' },
  { code: '641606', area_name: 'Vijayapuram', cityCode: 'TPR' },
  { code: '641607', area_name: 'Mannarai', cityCode: 'TPR' },
  { code: '641608', area_name: 'Kangeyam Road', cityCode: 'TPR' },
  { code: '641652', area_name: 'Avinashi', cityCode: 'TPR' },
  { code: '625001', area_name: 'Madurai Main', cityCode: 'MDU' },
  { code: '625020', area_name: 'Anna Nagar', cityCode: 'MDU' },
  { code: '620001', area_name: 'Tiruchirappalli Main', cityCode: 'TRY' },
  { code: '620018', area_name: 'Thillai Nagar', cityCode: 'TRY' },
  { code: '636001', area_name: 'Salem Main', cityCode: 'SLM' },
  { code: '636004', area_name: 'Fairlands', cityCode: 'SLM' },
  { code: '638001', area_name: 'Erode Main', cityCode: 'ERD' },
  { code: '627001', area_name: 'Tirunelveli Town', cityCode: 'TNV' },
  { code: '628001', area_name: 'Thoothukudi', cityCode: 'TTK' },
  { code: '632001', area_name: 'Vellore', cityCode: 'VLR' },
  { code: '624001', area_name: 'Dindigul', cityCode: 'DGL' },
  { code: '613001', area_name: 'Thanjavur', cityCode: 'TNJ' },
  { code: '635109', area_name: 'Hosur', cityCode: 'HSR' },
  { code: '629001', area_name: 'Nagercoil', cityCode: 'NGL' },
  { code: '600054', area_name: 'Avadi', cityCode: 'AVD' },
  { code: '600045', area_name: 'Tambaram', cityCode: 'TBM' },
  { code: '631501', area_name: 'Kancheepuram', cityCode: 'KPM' },
  { code: '607001', area_name: 'Cuddalore', cityCode: 'CUD' },
  { code: '639001', area_name: 'Karur', cityCode: 'KRR' },
  { code: '626123', area_name: 'Sivakasi', cityCode: 'SVK' },
  { code: '612001', area_name: 'Kumbakonam', cityCode: 'KMU' },
  { code: '560001', area_name: 'MG Road', cityCode: 'BLR' },
  { code: '560037', area_name: 'Marathahalli', cityCode: 'BLR' },
  { code: '400001', area_name: 'Fort', cityCode: 'BOM' },
  { code: '400053', area_name: 'Andheri West', cityCode: 'BOM' },
  { code: '110001', area_name: 'Connaught Place', cityCode: 'DEL' },
  { code: '500001', area_name: 'Abids', cityCode: 'HYD' },
  { code: '380001', area_name: 'Ahmedabad GPO', cityCode: 'AMD' },
  { code: '700001', area_name: 'Kolkata GPO', cityCode: 'CCU' },
  { code: '141001', area_name: 'Ludhiana', cityCode: 'LDH' },
  { code: '302001', area_name: 'Jaipur', cityCode: 'JAI' },
  { code: '226001', area_name: 'Lucknow', cityCode: 'LKO' },
  { code: '682001', area_name: 'Fort Kochi', cityCode: 'COK' },
  { code: '403001', area_name: 'Panaji', cityCode: 'GOI' },
  { code: '800001', area_name: 'Patna', cityCode: 'PAT' },
  { code: '452001', area_name: 'Indore', cityCode: 'IDR' },
]

function stateId(code: string) {
  const states = [
    'TN', '-', 'AP', 'AR', 'AS', 'BR', 'CT', 'GA', 'GJ', 'HR',
    'HP', 'JH', 'KA', 'KL', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL',
    'OD', 'PB', 'RJ', 'SK', 'TG', 'TR', 'UP', 'UT', 'WB', 'AN',
    'CH', 'DN', 'DL', 'JK', 'LA', 'LD', 'PY',
  ]
  return states.findIndex((s) => s === code) + 1
}

function districtId(code: string) {
  const districts = [
    '-', 'TN-CHN', 'TN-CBE', 'TN-MDU', 'TN-TPR', 'TN-TRY', 'TN-SLM',
    'TN-ERD', 'TN-TNV', 'TN-TTK', 'TN-VLR', 'TN-DGL', 'TN-TNJ',
    'TN-KKI', 'TN-KGI', 'TN-KPM', 'TN-CUD', 'TN-KRR', 'TN-VNR',
    'TN-TVR', 'TN-TRYR', 'TN-CHG', 'KA-BLR', 'MH-MUM', 'DL-ND',
    'TG-HYD', 'GJ-AHM', 'WB-KOL', 'PB-LDH', 'RJ-JPR', 'UP-LKO',
    'KL-ERN', 'GA-NGA', 'BR-PAT', 'MP-IND',
  ]
  return districts.findIndex((d) => d === code) + 1
}

function cityId(code: string) {
  return citiesSeedCodes.findIndex((c) => c === code) + 1
}

export function seedPincodesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(
    database,
    pincodesCommonDefinition,
    pincodesRows.map((row) => {
      const districtCode = citiesDistrictMap[row.cityCode] ?? ''
      const stateCode = districtStateMap[districtCode] ?? ''
      return {
        country_id: 1,
        state_id: stateId(stateCode),
        district_id: districtId(districtCode),
        city_id: cityId(row.cityCode),
        code: row.code,
        area_name: row.area_name,
      }
    }),
  )
}
