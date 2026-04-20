import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  const tables = ['um_reinfolib_tx', 'um_signals', 'um_population', 'um_score_snapshots', 'um_feedback']
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true })
    console.log(`${t.padEnd(25)} ${error ? `err: ${error.message}` : `${count} rows`}`)
  }

  console.log('\n=== um_reinfolib_tx 按年分布（分页汇总）===')
  const byYear: Record<number, number> = {}
  for (let y = 2018; y <= 2024; y++) {
    const { count } = await sb.from('um_reinfolib_tx').select('*', { count: 'exact', head: true }).eq('year', y)
    byYear[y] = count ?? 0
    console.log(`  ${y}: ${count}`)
  }

  console.log('\n=== um_signals 排行榜（upgrade_score 降序）===')
  const { data: rank } = await sb.from('um_signals').select('ward_code, period, price_yoy_pct, price_vs_tokyo_avg, upgrade_score, upgrade_signal').order('upgrade_score', { ascending: false })
  if (rank) {
    rank.forEach((r, i) => {
      console.log(`  #${String(i + 1).padStart(2)} ${r.ward_code}  score=${String(r.upgrade_score).padStart(5)}  signal=${r.upgrade_signal?.padEnd(7)}  yoy=${r.price_yoy_pct}  vs東京=${r.price_vs_tokyo_avg}%`)
    })
  }

  console.log('\n=== um_score_snapshots 最新快照日期 ===')
  const { data: snaps } = await sb.from('um_score_snapshots').select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1)
  console.log(`  ${snaps?.[0]?.snapshot_date ?? '(无)'}`)
}
run()
