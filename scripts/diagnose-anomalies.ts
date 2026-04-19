// 诊断新宿/豊島评分异常：拉原始信号 + 人口数据
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { calcPriceScore, calcPopScore, calcCompositeScore, classifySignal } from '../lib/score'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TARGETS = [
  { code: '13104', name: '新宿区' },
  { code: '13116', name: '豊島区' },
  { code: '13113', name: '渋谷区' }, // 参照：也有价格数据但排名不高
  { code: '13103', name: '港区'   }, // 参照：共识升级，排名也高
]

async function run() {
  for (const t of TARGETS) {
    console.log(`\n=== ${t.name} (${t.code}) ===`)

    const { data: sig } = await sb.from('um_signals').select('*').eq('ward_code', t.code).single()
    console.log('um_signals:', JSON.stringify(sig, null, 2))

    const { data: pop } = await sb.from('um_population').select('*').eq('ward_code', t.code).order('year')
    console.log('um_population:', JSON.stringify(pop, null, 2))

    if (sig && pop && pop.length >= 2) {
      const latest = pop[pop.length - 1]
      const prev   = pop[pop.length - 2]
      const totalPct = latest.total_population && prev.total_population
        ? ((latest.total_population / prev.total_population) - 1) * 100 : null
      const workingPct = latest.pop_25_44 && prev.pop_25_44
        ? ((latest.pop_25_44 / prev.pop_25_44) - 1) * 100 : null

      const priceScore = calcPriceScore(sig.price_yoy_pct, sig.price_acceleration, sig.price_vs_tokyo_avg)
      const popScore   = calcPopScore(totalPopPct(totalPct), popPct(workingPct))
      const composite  = calcCompositeScore(priceScore, popScore)
      const signal     = classifySignal(priceScore, popScore, sig.price_vs_tokyo_avg)
      console.log(`\n  → 重算: priceScore=${priceScore}, popScore=${popScore}, composite=${composite}, signal=${signal}`)
      console.log(`    input: totalPopPct=${totalPct?.toFixed(2)}, workingPopPct=${workingPct?.toFixed(2)}`)
    }
  }
}

function totalPopPct(v: number | null) { return v }
function popPct(v: number | null) { return v }

run().catch(e => { console.error(e); process.exit(1) })
