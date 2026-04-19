// Sanity check: 现有评分 vs 第三方公认升级/停滞区
// 不是严格回测，只看评分顺序和市场直觉是否大致一致
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS, ACTIVE_WARD_CODES } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 共识基准（来自市场/媒体/redev 现状，非数据）
const CONSENSUS_UPGRADED = [
  '13103', // 港区   麻布台 Hills
  '13102', // 中央区 月島・勝どき・豊海
  '13108', // 江東区 清澄白河・豊洲・有明
  '13113', // 渋谷区 渋谷 redev
  '13109', // 品川区 五反田・大崎
  '13110', // 目黒区 中目黒
  '13107', // 墨田区 錦糸町・スカイツリー
  '13116', // 豊島区 池袋 redev
]

const CONSENSUS_SLOW = [
  '13121', // 足立区
  '13122', // 葛飾区
  '13123', // 江戸川区
  '13120', // 練馬区
  '13119', // 板橋区
]

function nameOf(code: string): string {
  return TOKYO_WARDS.find(w => w.code === code)?.name_ja ?? code
}

async function run() {
  const { data: signals, error } = await sb.from('um_signals').select('*').order('upgrade_score', { ascending: false })
  if (error || !signals) {
    console.error('fetch error:', error)
    process.exit(1)
  }

  // 按综合分排序
  const ranked = signals
    .filter(s => s.upgrade_score !== null)
    .map((s, i) => ({ rank: i + 1, ...s }))

  const rankByCode: Record<string, number> = {}
  ranked.forEach(r => { rankByCode[r.ward_code] = r.rank })

  console.log('\n=== 全23区 综合评分排名 ===')
  console.log('Rank  Ward       Score  Signal    PriceData')
  ranked.forEach(r => {
    const priceCovered = ACTIVE_WARD_CODES.includes(r.ward_code) ? '✓' : '–'
    const name = nameOf(r.ward_code).padEnd(6, '　')
    console.log(
      `${String(r.rank).padStart(2)}.   ${name}   ${String(r.upgrade_score).padStart(5)}  ${(r.upgrade_signal || '—').padEnd(8)}  ${priceCovered}`,
    )
  })

  console.log('\n=== 共识「升级/活跃」区的排名（应偏上）===')
  const upgradedRanks: number[] = []
  CONSENSUS_UPGRADED.forEach(code => {
    const r = rankByCode[code]
    if (r) {
      upgradedRanks.push(r)
      console.log(`  ${nameOf(code).padEnd(6, '　')} → #${r}`)
    }
  })
  const upAvg = upgradedRanks.reduce((a, b) => a + b, 0) / upgradedRanks.length
  console.log(`  平均排名: ${upAvg.toFixed(1)} / ${ranked.length}  (越小越好)`)

  console.log('\n=== 共识「停滞/下位」区的排名（应偏下）===')
  const slowRanks: number[] = []
  CONSENSUS_SLOW.forEach(code => {
    const r = rankByCode[code]
    if (r) {
      slowRanks.push(r)
      console.log(`  ${nameOf(code).padEnd(6, '　')} → #${r}`)
    }
  })
  const slowAvg = slowRanks.reduce((a, b) => a + b, 0) / slowRanks.length
  console.log(`  平均排名: ${slowAvg.toFixed(1)} / ${ranked.length}  (越大越好)`)

  console.log('\n=== 判定 ===')
  const gap = slowAvg - upAvg
  const N = ranked.length
  if (gap > N / 3) {
    console.log(`✓ 通过：升级区均位(${upAvg.toFixed(1)}) < 停滞区均位(${slowAvg.toFixed(1)})，差距 ${gap.toFixed(1)} > N/3=${(N/3).toFixed(1)}`)
  } else if (gap > 0) {
    console.log(`△ 弱通过：方向对但区分度不够，gap=${gap.toFixed(1)}`)
  } else {
    console.log(`✗ 不通过：评分与共识方向相反或无差别`)
  }

  // Spearman rank correlation 简化版：给两组样本，看混合后是否能分开
  console.log('\n=== 具体异常点（需要人工复核）===')
  ranked.forEach(r => {
    const isUp = CONSENSUS_UPGRADED.includes(r.ward_code)
    const isSlow = CONSENSUS_SLOW.includes(r.ward_code)
    if (isUp && r.rank > N / 2) {
      console.log(`  ! ${nameOf(r.ward_code)} 共识为升级但排#${r.rank}（下半区）`)
    }
    if (isSlow && r.rank <= N / 2) {
      console.log(`  ! ${nameOf(r.ward_code)} 共识为停滞但排#${r.rank}（上半区）`)
    }
  })
}

run().catch(e => { console.error(e); process.exit(1) })
