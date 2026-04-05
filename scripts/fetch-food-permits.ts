// 東京都食品関係営業台帳（許可）CSV → um_food_permits テーブル
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { WARD_NAME_TO_CODE } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const CSV_URL = 'https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/shokuhin-kyoka2-1'
const CSV_PATH = '/tmp/tokyo-food-permits.csv'

// 住所から区名を抽出
function extractWard(address: string): string | null {
  for (const wardName of Object.keys(WARD_NAME_TO_CODE)) {
    if (address.includes(wardName)) return wardName
  }
  return null
}

// 飲食店関連の営業種類のみ
const FOOD_TYPES = ['飲食店営業', '喫茶店営業', '菓子製造業', 'そうざい製造業']

function isFoodBusiness(type: string): boolean {
  return FOOD_TYPES.some(ft => type.includes(ft))
}

async function run() {
  // Download CSV if not cached
  if (!fs.existsSync(CSV_PATH)) {
    console.log('Downloading CSV...')
    const res = await fetch(CSV_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(CSV_PATH, buf)
    console.log(`Saved to ${CSV_PATH}`)
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())

  // Parse header
  const header = lines[0].replace(/\uFEFF/, '').split(',').map(h => h.trim())
  console.log('Columns:', header)
  // Expected: 屋号, 営業所所在地, 営業者氏名, 営業者住所, 営業の種類, 申請区分, 営業所電話番号, 初回許可日, ...

  const addrIdx = header.findIndex(h => h.includes('営業所所在地'))
  const typeIdx = header.findIndex(h => h.includes('営業の種類'))
  const dateIdx = header.findIndex(h => h.includes('初回許可日'))
  const nameIdx = header.findIndex(h => h.includes('屋号'))

  if (addrIdx < 0 || typeIdx < 0 || dateIdx < 0) {
    console.error('Column mismatch:', { addrIdx, typeIdx, dateIdx })
    process.exit(1)
  }

  console.log(`\nParsing ${lines.length - 1} rows...\n`)

  const records: {
    ward_code: string; permit_date: string;
    business_type: string; facility_name: string; address: string
  }[] = []

  let skipped = 0
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse (no quoted commas in this dataset)
    const cols = lines[i].split(',')
    const address = cols[addrIdx]?.trim() ?? ''
    const type = cols[typeIdx]?.trim() ?? ''
    const dateStr = cols[dateIdx]?.trim() ?? ''
    const name = cols[nameIdx]?.trim() ?? ''

    // Filter: Tokyo 23 wards only + food businesses only
    const wardName = extractWard(address)
    if (!wardName) { skipped++; continue }
    if (!isFoodBusiness(type)) { skipped++; continue }

    // Parse date (YYYY/M/D format)
    if (!dateStr || !dateStr.includes('/')) { skipped++; continue }
    const parts = dateStr.split('/')
    const year = parseInt(parts[0])
    if (year < 2010) { skipped++; continue } // only 2010+

    const month = parts[1].padStart(2, '0')
    const day = parts[2].padStart(2, '0')
    const permitDate = `${year}-${month}-${day}`

    records.push({
      ward_code: WARD_NAME_TO_CODE[wardName],
      permit_date: permitDate,
      business_type: type,
      facility_name: name,
      address,
    })
  }

  console.log(`Parsed: ${records.length} food permits (skipped ${skipped})`)

  // Ward summary
  const byCounts: Record<string, number> = {}
  for (const r of records) {
    byCounts[r.ward_code] = (byCounts[r.ward_code] || 0) + 1
  }
  for (const [code, count] of Object.entries(byCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    const name = Object.entries(WARD_NAME_TO_CODE).find(([, c]) => c === code)?.[0]
    console.log(`  ${name} (${code}): ${count} permits`)
  }

  // Batch upsert
  console.log(`\nInserting ${records.length} records...`)
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await sb.from('um_food_permits').insert(batch)
    if (error) {
      console.error(`  Batch ${i} error: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  const { count } = await sb.from('um_food_permits').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Done: ${inserted} inserted, ${count} total in um_food_permits`)
}

run().catch(e => { console.error(e); process.exit(1) })
