// 综合评分计算：读取 um_signals（房价）+ um_population（人口）→ 写入综合分和信号
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'
import { calcPriceScore, calcPopScore, calcCompositeScore, classifySignal } from '../lib/score'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
  console.log('Computing composite scores...\n')

  for (const ward of TOKYO_WARDS) {
    // Get price signal
    const { data: signal } = await sb.from('um_signals').select('*').eq('ward_code', ward.code).single()

    // Get population data
    const { data: popRows } = await sb.from('um_population').select('*').eq('ward_code', ward.code).order('year')

    // Calc population growth (latest 2 census periods)
    let totalPopPct: number | null = null
    let workingPopPct: number | null = null
    if (popRows && popRows.length >= 2) {
      const latest = popRows[popRows.length - 1]
      const prev = popRows[popRows.length - 2]
      if (latest.total_population && prev.total_population) {
        totalPopPct = ((latest.total_population / prev.total_population) - 1) * 100
      }
      if (latest.pop_25_44 && prev.pop_25_44) {
        workingPopPct = ((latest.pop_25_44 / prev.pop_25_44) - 1) * 100
      }
    }

    const priceScore = signal
      ? calcPriceScore(signal.price_yoy_pct, signal.price_acceleration, signal.price_vs_tokyo_avg)
      : 50
    const popScore = calcPopScore(totalPopPct, workingPopPct)
    const composite = calcCompositeScore(priceScore, popScore)
    const upgradeSignal = signal
      ? classifySignal(priceScore, popScore, signal.price_vs_tokyo_avg)
      : 'unknown'

    // Update um_signals (upsert)
    const period = signal?.period ?? '2024Q4'
    const { error } = await sb.from('um_signals').upsert({
      ward_code: ward.code,
      period,
      price_yoy_pct: signal?.price_yoy_pct ?? null,
      price_acceleration: signal?.price_acceleration ?? null,
      price_vs_tokyo_avg: signal?.price_vs_tokyo_avg ?? null,
      pop_25_44_yoy_pct: workingPopPct ? Math.round(workingPopPct * 100) / 100 : null,
      total_pop_yoy_pct: totalPopPct ? Math.round(totalPopPct * 100) / 100 : null,
      upgrade_score: composite,
      upgrade_signal: upgradeSignal,
    }, { onConflict: 'ward_code,period' })

    if (error) { console.error(`  ${ward.name_ja} error: ${error.message}`); continue }

    // Snapshot
    await sb.from('um_score_snapshots').upsert({
      ward_code: ward.code,
      snapshot_date: new Date().toISOString().slice(0, 10),
      upgrade_score: composite,
      upgrade_signal: upgradeSignal,
      price_sub: priceScore,
      population_sub: popScore,
      commercial_sub: null,
    }, { onConflict: 'ward_code,snapshot_date' })

    const signalEmoji = upgradeSignal === 'early' ? '🟢' : upgradeSignal === 'active' ? '🟡' : upgradeSignal === 'mature' ? '🔴' : '⚪'
    console.log(`${signalEmoji} ${ward.name_zh.padEnd(6)} score=${composite.toFixed(1).padStart(5)}  price=${priceScore.toFixed(0).padStart(3)}  pop=${popScore.toFixed(0).padStart(3)}  signal=${upgradeSignal}`)
  }

  console.log('\nDone')
}

run().catch(e => { console.error(e); process.exit(1) })
