// e-Stat API: 社会・人口統計体系 A 人口・世帯 (statsDataId=0000020101)
// 東京23区の年度別人口データを取得 → um_population テーブルに格納
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APP_ID = process.env.ESTAT_APP_ID!
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 必要な指標コード
const INDICATORS = {
  'A1101': 'total_population',  // 総人口
  'A1302': 'pop_15_64',        // 15～64歳人口（生産年齢）
  'A1303': 'pop_65_plus',      // 65歳以上人口
  'A1700': 'households',       // 一般世帯数
} as const

type IndicatorKey = keyof typeof INDICATORS

async function fetchWardData(wardCode: string, wardName: string): Promise<void> {
  const catCodes = Object.keys(INDICATORS).join(',')
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=0000020101&cdArea=${wardCode}&cdCat01=${catCodes}&limit=10000`

  const res = await fetch(url)
  const json = await res.json()
  const status = json?.GET_STATS_DATA?.RESULT?.STATUS

  if (status !== 0) {
    console.warn(`  ⚠ ${wardName}: API status ${status}`)
    return
  }

  const values = json.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
  if (!values) { console.warn(`  ⚠ ${wardName}: no data`); return }

  const arr = Array.isArray(values) ? values : [values]

  // Group by year
  const byYear: Record<number, Record<string, number>> = {}
  for (const v of arr) {
    const timeStr = v['@time'] as string // e.g. "2020100000"
    const year = parseInt(timeStr.slice(0, 4))
    if (year < 2000) continue // only need 2000+

    const cat = v['@cat01'] as IndicatorKey
    const field = INDICATORS[cat]
    if (!field) continue

    const value = parseInt(v['$'])
    if (isNaN(value)) continue

    if (!byYear[year]) byYear[year] = {}
    byYear[year][field] = value
  }

  // Upsert into um_population
  const rows = Object.entries(byYear).map(([yearStr, data]) => ({
    ward_code: wardCode,
    year: parseInt(yearStr),
    total_population: data.total_population ?? null,
    pop_25_44: data.pop_15_64 ?? null, // 15-64 as proxy (e-Stat doesn't have 25-44 in this dataset)
    households: data.households ?? null,
  }))

  if (rows.length === 0) { console.log(`  ${wardName}: 0 years`); return }

  const { error } = await sb.from('um_population').upsert(rows, { onConflict: 'ward_code,year' })
  if (error) console.error(`  ${wardName} upsert error: ${error.message}`)
  else console.log(`  ${wardName}: ${rows.length} years (${rows[0].year}-${rows[rows.length - 1].year})`)
}

async function run() {
  if (!APP_ID) { console.error('ESTAT_APP_ID not set'); process.exit(1) }

  console.log('Fetching e-Stat population data for Tokyo 23 wards...\n')

  for (const ward of TOKYO_WARDS) {
    process.stdout.write(`📊 ${ward.name_ja}... `)
    await fetchWardData(ward.code, ward.name_ja)
    // Rate limit: 1 req/sec
    await new Promise(r => setTimeout(r, 1000))
  }

  // Verify
  const { count } = await sb.from('um_population').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Done: ${count} records in um_population`)
}

run().catch(e => { console.error(e); process.exit(1) })
