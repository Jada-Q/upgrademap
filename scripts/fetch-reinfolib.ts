// reinfolib API → um_reinfolib_tx
// 用法:
//   npx tsx scripts/fetch-reinfolib.ts                # 默认全 23 区，2018-2024
//   npx tsx scripts/fetch-reinfolib.ts 2015 2024      # 指定年份范围
//   npx tsx scripts/fetch-reinfolib.ts 2024 2024 13108  # 指定范围 + 单区
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const KEY = process.env.REINFOLIB_API_KEY
if (!KEY) {
  console.error('❌ REINFOLIB_API_KEY 未设置')
  process.exit(1)
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface TxRecord {
  Type: string
  Municipality: string
  DistrictName: string
  TradePrice: string
  PricePerUnit: string
  Area: string
  BuildingYear: string
  Period: string
  [k: string]: string
}

function parsePeriod(raw: string): { year: number; quarter: number } | null {
  const m = raw.match(/(\d{4})年第(\d)四半期/)
  return m ? { year: +m[1], quarter: +m[2] } : null
}

function parseNumber(v: string): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function parseBuildYear(v: string): number | null {
  if (!v) return null
  const ym = v.match(/(\d{4})年/)
  if (ym) return +ym[1]
  const eras: Record<string, number> = { '昭和': 1925, '平成': 1988, '令和': 2018 }
  for (const [era, base] of Object.entries(eras)) {
    const m = v.match(new RegExp(`${era}(\\d+)年`))
    if (m) return base + +m[1]
  }
  return null
}

async function fetchWardQuarter(code: string, year: number, q: number): Promise<TxRecord[]> {
  const url = new URL('https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001')
  url.searchParams.set('year', String(year))
  url.searchParams.set('quarter', String(q))
  url.searchParams.set('area', '13')
  url.searchParams.set('city', code)
  const res = await fetch(url.toString(), { headers: { 'Ocp-Apim-Subscription-Key': KEY! } })
  if (!res.ok) {
    console.warn(`    ⚠️ HTTP ${res.status} ${code} ${year}Q${q}`)
    return []
  }
  const json = await res.json() as { data?: TxRecord[] }
  return json.data ?? []
}

async function run() {
  const args = process.argv.slice(2)
  const START = args[0] ? +args[0] : 2018
  const END   = args[1] ? +args[1] : 2024
  const SINGLE_WARD = args[2]

  const wards = SINGLE_WARD ? TOKYO_WARDS.filter(w => w.code === SINGLE_WARD) : TOKYO_WARDS

  console.log(`🚀 Fetching ${wards.length} wards × ${START}-${END} × 4 quarters`)
  console.log(`   (${wards.length * (END - START + 1) * 4} API calls)\n`)

  let totalInserted = 0
  let totalSkipped = 0

  for (const w of wards) {
    console.log(`📍 ${w.name_ja} (${w.code})`)

    for (let year = START; year <= END; year++) {
      for (let q = 1; q <= 4; q++) {
        process.stdout.write(`  ${year}Q${q}... `)
        const records = await fetchWardQuarter(w.code, year, q)
        const mansions = records.filter(r => r.Type?.includes('マンション'))

        if (mansions.length === 0) {
          process.stdout.write('0件\n')
          continue
        }

        const rows = []
        for (const r of mansions) {
          const period = parsePeriod(r.Period)
          if (!period) { totalSkipped++; continue }
          const tradePrice = parseNumber(r.TradePrice)
          const areaSqm    = parseNumber(r.Area)
          if (!tradePrice || !areaSqm || areaSqm <= 0) { totalSkipped++; continue }
          const pricePerSqm = parseNumber(r.PricePerUnit) ?? Math.round(tradePrice / areaSqm)

          rows.push({
            ward_code: w.code,
            year: period.year,
            quarter: period.quarter,
            district_name: r.DistrictName || null,
            trade_price: tradePrice,
            price_per_sqm: pricePerSqm,
            area_sqm: areaSqm,
            building_year: parseBuildYear(r.BuildingYear),
            building_type: r.Type,
          })
        }

        if (rows.length > 0) {
          // Idempotent re-runs: delete existing (ward, year, quarter) batch first
          await sb.from('um_reinfolib_tx').delete()
            .eq('ward_code', w.code).eq('year', year).eq('quarter', q)

          const { error } = await sb.from('um_reinfolib_tx').insert(rows)
          if (error) {
            console.warn(`    ⚠️ insert error: ${error.message}`)
          } else {
            totalInserted += rows.length
          }
        }
        process.stdout.write(`${rows.length}件\n`)

        // Rate limit: 1 req/sec to be safe
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  console.log(`\n✓ Done: inserted=${totalInserted}, skipped=${totalSkipped}`)
}

run().catch(e => { console.error(e); process.exit(1) })
