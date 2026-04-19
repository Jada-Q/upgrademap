// 删除 um_signals 里的 stale rows：保留每个 ward 的最新 period
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  const { data } = await sb.from('um_signals').select('ward_code, period').order('ward_code').order('period')
  if (!data) return

  const byWard: Record<string, string[]> = {}
  for (const r of data) {
    byWard[r.ward_code] ??= []
    byWard[r.ward_code].push(r.period)
  }

  for (const [code, periods] of Object.entries(byWard)) {
    if (periods.length <= 1) continue
    const latest = periods[periods.length - 1]
    const stale = periods.slice(0, -1)
    for (const p of stale) {
      const { error } = await sb.from('um_signals').delete().eq('ward_code', code).eq('period', p)
      console.log(`  ${error ? '⚠️' : '✓'} delete ${code} ${p} (kept ${latest})`)
    }
  }

  console.log('\n✓ cleanup done')
}
run()
