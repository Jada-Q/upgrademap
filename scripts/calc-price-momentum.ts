import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { ACTIVE_WARD_CODES, WARD_NAME_TO_CODE } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Tx = { station_id: string; period_year: number; period_quarter: number; price_per_sqm: number }
type StationWard = { id: string; ward: string }

async function run() {
  console.log('Calculating price momentum from YieldMap transactions...\n')

  // 1. Get station → ward mapping from YieldMap's stations table
  const { data: stations } = await sb.from('stations').select('id, ward')
  if (!stations?.length) { console.error('No stations found'); return }

  const stationWard: Record<string, string> = {}
  for (const s of stations as StationWard[]) {
    const code = WARD_NAME_TO_CODE[s.ward]
    if (code) stationWard[s.id] = code
  }

  // 2. Get all transactions (paginated to avoid row limits)
  let txs: Tx[] = []
  let offset = 0
  const BATCH = 1000
  while (true) {
    const { data, error } = await sb
      .from('transactions')
      .select('station_id, period_year, period_quarter, price_per_sqm')
      .not('price_per_sqm', 'is', null)
      .range(offset, offset + BATCH - 1)
    if (error) { console.error('Query error:', error.message); break }
    if (!data?.length) break
    txs = txs.concat(data as Tx[])
    if (data.length < BATCH) break
    offset += BATCH
  }
  console.log(`Loaded ${txs.length} transactions`)
  if (!txs.length) { console.error('No transactions found'); return }

  // 3. Group by ward + quarter
  const wardQuarters: Record<string, Record<string, number[]>> = {}
  for (const tx of txs as Tx[]) {
    const wardCode = stationWard[tx.station_id]
    if (!wardCode) continue
    if (!wardQuarters[wardCode]) wardQuarters[wardCode] = {}
    const qKey = `${tx.period_year}Q${tx.period_quarter}`
    if (!wardQuarters[wardCode][qKey]) wardQuarters[wardCode][qKey] = []
    wardQuarters[wardCode][qKey].push(tx.price_per_sqm)
  }

  // 4. Compute quarterly averages per ward
  const wardAvgs: Record<string, { period: string; avg: number }[]> = {}
  for (const [ward, quarters] of Object.entries(wardQuarters)) {
    wardAvgs[ward] = Object.entries(quarters)
      .map(([period, prices]) => ({
        period,
        avg: prices.reduce((s, v) => s + v, 0) / prices.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // 5. Compute Tokyo-wide average per quarter (across all active wards)
  const tokyoQuarters: Record<string, number[]> = {}
  for (const avgs of Object.values(wardAvgs)) {
    for (const { period, avg } of avgs) {
      if (!tokyoQuarters[period]) tokyoQuarters[period] = []
      tokyoQuarters[period].push(avg)
    }
  }
  const tokyoAvg: Record<string, number> = {}
  for (const [p, vals] of Object.entries(tokyoQuarters)) {
    tokyoAvg[p] = vals.reduce((s, v) => s + v, 0) / vals.length
  }

  // 6. For each ward, compute YoY%, acceleration, vs-tokyo for latest period
  const signals: {
    ward_code: string; period: string;
    price_yoy_pct: number | null;
    price_acceleration: number | null;
    price_vs_tokyo_avg: number | null;
  }[] = []

  for (const [wardCode, avgs] of Object.entries(wardAvgs)) {
    if (avgs.length < 5) continue // need at least 5 quarters for YoY

    // Rolling 4-quarter average
    function rolling4(endIdx: number): number {
      const start = Math.max(0, endIdx - 3)
      const slice = avgs.slice(start, endIdx + 1)
      return slice.reduce((s, v) => s + v.avg, 0) / slice.length
    }

    const lastIdx = avgs.length - 1
    const currentAvg = rolling4(lastIdx)
    const currentPeriod = avgs[lastIdx].period

    // YoY: compare rolling4 now vs rolling4 one year ago
    const yoyIdx = lastIdx - 4
    const yoyAvg = yoyIdx >= 0 ? rolling4(yoyIdx) : null
    const priceYoyPct = yoyAvg ? ((currentAvg / yoyAvg) - 1) * 100 : null

    // Acceleration: compare current YoY% vs prior-quarter YoY%
    let priceAcceleration: number | null = null
    if (yoyIdx >= 1) {
      const prevCurrentAvg = rolling4(lastIdx - 1)
      const prevYoyAvg = rolling4(yoyIdx - 1)
      const prevYoyPct = ((prevCurrentAvg / prevYoyAvg) - 1) * 100
      if (priceYoyPct !== null) priceAcceleration = priceYoyPct - prevYoyPct
    }

    // vs Tokyo average
    const tokyoNow = tokyoAvg[currentPeriod]
    const priceVsTokyo = tokyoNow ? ((currentAvg / tokyoNow) - 1) * 100 : null

    signals.push({
      ward_code: wardCode,
      period: currentPeriod,
      price_yoy_pct: priceYoyPct ? Math.round(priceYoyPct * 100) / 100 : null,
      price_acceleration: priceAcceleration ? Math.round(priceAcceleration * 100) / 100 : null,
      price_vs_tokyo_avg: priceVsTokyo ? Math.round(priceVsTokyo * 100) / 100 : null,
    })

    const wardName = Object.keys(WARD_NAME_TO_CODE).find(k => WARD_NAME_TO_CODE[k] === wardCode)
    console.log(`${wardName} (${wardCode}):`)
    console.log(`  avg: ${Math.round(currentAvg / 10000)}万/㎡  YoY: ${priceYoyPct?.toFixed(1) ?? '—'}%  accel: ${priceAcceleration?.toFixed(1) ?? '—'}  vs東京: ${priceVsTokyo?.toFixed(1) ?? '—'}%`)
  }

  // 7. Upsert into um_signals
  for (const s of signals) {
    const { error } = await sb.from('um_signals').upsert({
      ward_code: s.ward_code,
      period: s.period,
      price_yoy_pct: s.price_yoy_pct,
      price_acceleration: s.price_acceleration,
      price_vs_tokyo_avg: s.price_vs_tokyo_avg,
    }, { onConflict: 'ward_code,period' })
    if (error) console.error(`  upsert error for ${s.ward_code}: ${error.message}`)
  }

  console.log(`\nDone: ${signals.length} ward signals computed`)
}

run().catch(e => { console.error(e); process.exit(1) })
