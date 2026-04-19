import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  // Count rows per ward
  const { data } = await sb.from('um_signals').select('ward_code, period, price_yoy_pct, price_vs_tokyo_avg, upgrade_score, upgrade_signal').order('ward_code').order('period')
  if (!data) return

  console.log(`Total rows: ${data.length}`)
  const byWard: Record<string, any[]> = {}
  for (const r of data) {
    byWard[r.ward_code] ??= []
    byWard[r.ward_code].push(r)
  }

  for (const [code, rows] of Object.entries(byWard)) {
    if (rows.length > 1) {
      console.log(`⚠️ ${code}: ${rows.length} rows`)
      rows.forEach(r => console.log(`    ${r.period}  yoy=${r.price_yoy_pct}  vsTokyo=${r.price_vs_tokyo_avg}  score=${r.upgrade_score}  signal=${r.upgrade_signal}`))
    }
  }

  // Focus on problem wards
  for (const code of ['13113', '13110', '13122', '13120']) {
    console.log(`\n--- ${code} ---`)
    byWard[code]?.forEach(r => console.log(`  ${r.period}  yoy=${r.price_yoy_pct}  vsTokyo=${r.price_vs_tokyo_avg}  score=${r.upgrade_score}  signal=${r.upgrade_signal}`))
  }
}
run()
