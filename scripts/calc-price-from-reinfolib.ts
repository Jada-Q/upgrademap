// um_reinfolib_tx → ward×quarter 均价 → YoY/accel/vsTokyo → upsert um_signals
// 独立于 YieldMap，覆盖 23 区
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Row = { ward_code: string; year: number; quarter: number; price_per_sqm: number | null }

async function run() {
  console.log('Loading um_reinfolib_tx...')

  // Page through all rows
  let all: Row[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb
      .from('um_reinfolib_tx')
      .select('ward_code, year, quarter, price_per_sqm')
      .not('price_per_sqm', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (error) { console.error(error); return }
    if (!data?.length) break
    all = all.concat(data as Row[])
    if (data.length < PAGE) break
    offset += PAGE
  }
  console.log(`  loaded ${all.length} rows`)

  // Group: ward × quarter → [price_per_sqm]
  const wardQ: Record<string, Record<string, number[]>> = {}
  for (const r of all) {
    if (!r.price_per_sqm) continue
    const q = `${r.year}Q${r.quarter}`
    wardQ[r.ward_code] ??= {}
    wardQ[r.ward_code][q] ??= []
    wardQ[r.ward_code][q].push(r.price_per_sqm)
  }

  // Ward × quarter averages, sorted chronologically
  const wardAvgs: Record<string, { period: string; avg: number; n: number }[]> = {}
  for (const [code, qs] of Object.entries(wardQ)) {
    wardAvgs[code] = Object.entries(qs)
      .map(([period, prices]) => ({
        period,
        avg: prices.reduce((s, v) => s + v, 0) / prices.length,
        n: prices.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // Tokyo-wide average per quarter (across all wards' averages)
  const tokyoQ: Record<string, number[]> = {}
  for (const avgs of Object.values(wardAvgs)) {
    for (const { period, avg } of avgs) {
      tokyoQ[period] ??= []
      tokyoQ[period].push(avg)
    }
  }
  const tokyoAvg: Record<string, number> = {}
  for (const [p, vs] of Object.entries(tokyoQ)) {
    tokyoAvg[p] = vs.reduce((s, v) => s + v, 0) / vs.length
  }

  // Compute signals per ward
  const signals: { ward_code: string; period: string; price_yoy_pct: number | null; price_acceleration: number | null; price_vs_tokyo_avg: number | null }[] = []

  for (const [code, avgs] of Object.entries(wardAvgs)) {
    if (avgs.length < 5) continue  // need ≥5 quarters for YoY

    const rolling4 = (endIdx: number) => {
      const start = Math.max(0, endIdx - 3)
      const slice = avgs.slice(start, endIdx + 1)
      return slice.reduce((s, v) => s + v.avg, 0) / slice.length
    }

    const lastIdx = avgs.length - 1
    const current = rolling4(lastIdx)
    const period = avgs[lastIdx].period

    const yoyIdx = lastIdx - 4
    const yoyBase = yoyIdx >= 0 ? rolling4(yoyIdx) : null
    const yoyPct = yoyBase ? ((current / yoyBase) - 1) * 100 : null

    let accel: number | null = null
    if (yoyIdx >= 1 && yoyPct !== null) {
      const prevCur = rolling4(lastIdx - 1)
      const prevBase = rolling4(yoyIdx - 1)
      const prevYoy = ((prevCur / prevBase) - 1) * 100
      accel = yoyPct - prevYoy
    }

    const tokyoNow = tokyoAvg[period]
    const vsTokyo = tokyoNow ? ((current / tokyoNow) - 1) * 100 : null

    signals.push({
      ward_code: code,
      period,
      price_yoy_pct: yoyPct !== null ? Math.round(yoyPct * 100) / 100 : null,
      price_acceleration: accel !== null ? Math.round(accel * 100) / 100 : null,
      price_vs_tokyo_avg: vsTokyo !== null ? Math.round(vsTokyo * 100) / 100 : null,
    })

    const name = TOKYO_WARDS.find(w => w.code === code)?.name_ja ?? code
    console.log(`${name.padEnd(6, '　')} ${period}  avg=${Math.round(current / 10000)}万/㎡  YoY=${yoyPct?.toFixed(1) ?? '—'}  accel=${accel?.toFixed(1) ?? '—'}  vs東京=${vsTokyo?.toFixed(1) ?? '—'}%`)
  }

  // Upsert
  for (const s of signals) {
    const { error } = await sb.from('um_signals').upsert(s, { onConflict: 'ward_code,period' })
    if (error) console.warn(`  upsert ${s.ward_code}: ${error.message}`)
  }
  console.log(`\n✓ ${signals.length} signals upserted`)
}
run().catch(e => { console.error(e); process.exit(1) })
