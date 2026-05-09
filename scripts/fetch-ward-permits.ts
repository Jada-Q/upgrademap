// Bug #1 fix #2: 23 区独立 food permits 接入
// CKAN catalog 找到 5 个区有 direct CSV (中央/港/新宿/江東/中野)
// 各区 schema 不同，normalize 后插入 um_food_permits
// Run: npx tsx scripts/fetch-ward-permits.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type WardInfo = { code: string; name: string; schema: 'A' | 'B'; csvFile: string }

const WARD_FILES: WardInfo[] = [
  { code: '13102', name: '中央区',   schema: 'A', csvFile: '/tmp/ward-permits/chuo-u8.csv' },
  { code: '13103', name: '港区',     schema: 'A', csvFile: '/tmp/ward-permits/minato-u8.csv' },
  { code: '13104', name: '新宿区',   schema: 'A', csvFile: '/tmp/ward-permits/shinjuku-u8.csv' },
  { code: '13108', name: '江東区',   schema: 'A', csvFile: '/tmp/ward-permits/koto-u8.csv' },
  { code: '13114', name: '中野区',   schema: 'B', csvFile: '/tmp/ward-permits/nakano-u8.csv' },
]

const FOOD_TYPES = ['飲食店営業', '喫茶店営業', '菓子製造業', 'そうざい製造業']

function isFoodBusiness(type: string): boolean {
  return FOOD_TYPES.some(ft => type.includes(ft))
}

function parseCSVRow(line: string): string[] {
  const out: string[] = []
  let curr = ''
  let inQuote = false
  for (const ch of line) {
    if (ch === '"' && !inQuote) inQuote = true
    else if (ch === '"' && inQuote) inQuote = false
    else if (ch === ',' && !inQuote) { out.push(curr); curr = '' }
    else curr += ch
  }
  out.push(curr)
  return out
}

function parseDate(s: string): string | null {
  if (!s) return null
  const m = s.match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})/)
  if (!m) return null
  const [, y, mo, d] = m
  const yi = parseInt(y)
  if (yi < 2000 || yi > 2030) return null
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

async function processWard(info: WardInfo): Promise<number> {
  console.log(`\n${info.code} ${info.name} (schema ${info.schema}, ${path.basename(info.csvFile)})`)
  if (!fs.existsSync(info.csvFile)) {
    console.error(`  file missing`); return 0
  }
  const raw = fs.readFileSync(info.csvFile, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 2) { console.log('  empty'); return 0 }

  const headerLine = lines[0].replace(/^﻿/, '')
  const header = parseCSVRow(headerLine).map(h => h.replace(/"/g, '').trim())

  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = header.findIndex(h => h === name)
      if (idx >= 0) return idx
    }
    return -1
  }

  let nameIdx: number, addrIdx: number, typeIdx: number
  // 多个 date 列名 candidates，row-level fallback (字段经常空)
  const dateColNames = info.schema === 'A'
    ? ['初回許可年月日', '許可年月日', '許可開始日', '許可日']
    : ['初回許可年月日', '許可日', '許可開始日', '許可年月日']
  if (info.schema === 'A') {
    nameIdx = findCol('施設名称')
    addrIdx = findCol('所在地_連結表記')
    typeIdx = findCol('営業の種類')
  } else {
    nameIdx = findCol('営業所名称')
    addrIdx = findCol('営業所所在地')
    typeIdx = findCol('営業の種類')
  }
  const dateIndices = dateColNames.map(n => findCol(n)).filter(i => i >= 0)
  if (nameIdx < 0 || addrIdx < 0 || typeIdx < 0 || dateIndices.length === 0) {
    console.error(`  schema mismatch: name=${nameIdx} addr=${addrIdx} type=${typeIdx} date_cols=${dateIndices.length}`)
    console.error(`  header sample:`, header.slice(0, 15))
    return 0
  }

  const records: Array<{
    ward_code: string
    permit_date: string
    business_type: string
    facility_name: string
    address: string
  }> = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]).map(c => c.replace(/"/g, '').trim())
    const name = cols[nameIdx] ?? ''
    const addr = cols[addrIdx] ?? ''
    const type = cols[typeIdx] ?? ''
    if (!isFoodBusiness(type)) { skipped++; continue }
    // Row-level fallback: try each date column until one parses
    let permitDate: string | null = null
    for (const idx of dateIndices) {
      permitDate = parseDate(cols[idx] ?? '')
      if (permitDate) break
    }
    if (!permitDate) { skipped++; continue }
    records.push({
      ward_code: info.code,
      permit_date: permitDate,
      business_type: type,
      facility_name: name,
      address: addr,
    })
  }

  console.log(`  parsed=${records.length} skipped=${skipped}`)

  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await sb.from('um_food_permits').insert(batch)
    if (error) console.error(`  batch ${i}: ${error.message}`)
    else inserted += batch.length
  }
  console.log(`  inserted=${inserted}`)
  return inserted
}

async function run() {
  const codes = WARD_FILES.map(w => w.code)
  console.log(`Clearing existing data for: ${codes.join(', ')}`)
  const { error: delErr } = await sb.from('um_food_permits').delete().in('ward_code', codes)
  if (delErr) { console.error(delErr.message); process.exit(1) }

  let total = 0
  for (const w of WARD_FILES) total += await processWard(w)

  console.log(`\n✅ Total inserted: ${total} across ${WARD_FILES.length} wards`)
  console.log('Next: npx tsx scripts/aggregate-permits-to-signals.ts')
}

run().catch(e => { console.error(e); process.exit(1) })
