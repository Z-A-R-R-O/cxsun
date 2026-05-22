import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { districtsCommonDefinition } from './definition.js'

const districtsRows: { code: string; name: string; stateCode: string }[] = [
  { code: '-', name: '-', stateCode: '-' },
  { code: 'TN-CHN', name: 'Chennai', stateCode: 'TN' },
  { code: 'TN-CBE', name: 'Coimbatore', stateCode: 'TN' },
  { code: 'TN-MDU', name: 'Madurai', stateCode: 'TN' },
  { code: 'TN-TPR', name: 'Tiruppur', stateCode: 'TN' },
  { code: 'TN-TRY', name: 'Tiruchirappalli', stateCode: 'TN' },
  { code: 'TN-SLM', name: 'Salem', stateCode: 'TN' },
  { code: 'TN-ERD', name: 'Erode', stateCode: 'TN' },
  { code: 'TN-TNV', name: 'Tirunelveli', stateCode: 'TN' },
  { code: 'TN-TTK', name: 'Thoothukudi', stateCode: 'TN' },
  { code: 'TN-VLR', name: 'Vellore', stateCode: 'TN' },
  { code: 'TN-DGL', name: 'Dindigul', stateCode: 'TN' },
  { code: 'TN-TNJ', name: 'Thanjavur', stateCode: 'TN' },
  { code: 'TN-KKI', name: 'Kanniyakumari', stateCode: 'TN' },
  { code: 'TN-KGI', name: 'Krishnagiri', stateCode: 'TN' },
  { code: 'TN-KPM', name: 'Kancheepuram', stateCode: 'TN' },
  { code: 'TN-CUD', name: 'Cuddalore', stateCode: 'TN' },
  { code: 'TN-KRR', name: 'Karur', stateCode: 'TN' },
  { code: 'TN-VNR', name: 'Virudhunagar', stateCode: 'TN' },
  { code: 'TN-TVR', name: 'Thiruvarur', stateCode: 'TN' },
  { code: 'TN-TRYR', name: 'Tiruvallur', stateCode: 'TN' },
  { code: 'TN-CHG', name: 'Chengalpattu', stateCode: 'TN' },
  { code: 'KA-BLR', name: 'Bengaluru Urban', stateCode: 'KA' },
  { code: 'MH-MUM', name: 'Mumbai', stateCode: 'MH' },
  { code: 'DL-ND', name: 'New Delhi', stateCode: 'DL' },
  { code: 'TG-HYD', name: 'Hyderabad', stateCode: 'TG' },
  { code: 'GJ-AHM', name: 'Ahmedabad', stateCode: 'GJ' },
  { code: 'WB-KOL', name: 'Kolkata', stateCode: 'WB' },
  { code: 'PB-LDH', name: 'Ludhiana', stateCode: 'PB' },
  { code: 'RJ-JPR', name: 'Jaipur', stateCode: 'RJ' },
  { code: 'UP-LKO', name: 'Lucknow', stateCode: 'UP' },
  { code: 'KL-ERN', name: 'Ernakulam', stateCode: 'KL' },
  { code: 'GA-NGA', name: 'North Goa', stateCode: 'GA' },
  { code: 'BR-PAT', name: 'Patna', stateCode: 'BR' },
  { code: 'MP-IND', name: 'Indore', stateCode: 'MP' },
]

export function seedDistrictsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(
    database,
    districtsCommonDefinition,
    districtsRows.map((row) => ({ name: row.name, state_id: stateId(row.stateCode) })),
  )
}

function stateId(code: string) {
  const stateCodes = [
    '-', 'TN', 'AP', 'AR', 'AS', 'BR', 'CT', 'GA', 'GJ', 'HR', 'HP', 'JH', 'KA', 'KL', 'MP', 'MH',
    'MN', 'ML', 'MZ', 'NL', 'OD', 'PB', 'RJ', 'SK', 'TG', 'TR', 'UP', 'UT', 'WB', 'AN', 'CH', 'DN',
    'DL', 'JK', 'LA', 'LD', 'PY',
  ]
  return Math.max(1, stateCodes.indexOf(code) + 1)
}
