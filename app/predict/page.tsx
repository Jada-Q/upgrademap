// /predict 页 — Bloomberg Terminal 风格反推方法论预测
// 不替换主页评分，独立维度对照
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getAllWards, getLatestSignals } from '@/lib/queries'
import { calcPredictScore } from '@/lib/predict-score'

export default async function PredictPage() {
  const [wards, signals] = await Promise.all([getAllWards(), getLatestSignals()])
  const signalMap: Record<string, typeof signals[0]> = {}
  for (const s of signals) signalMap[s.ward_code] = s

  const rows = wards.map(ward => {
    const sig = signalMap[ward.code]
    const predict = calcPredictScore({
      price_yoy_pct: sig?.price_yoy_pct ?? null,
      price_acceleration: sig?.price_acceleration ?? null,
      price_vs_tokyo_avg: sig?.price_vs_tokyo_avg ?? null,
      total_pop_yoy_pct: sig?.total_pop_yoy_pct ?? null,
      pop_25_44_yoy_pct: sig?.pop_25_44_yoy_pct ?? null,
      permits_count: sig?.new_permits_count ?? null,
      permits_yoy_pct: sig?.permits_yoy_pct ?? null,
      momentum_score: sig?.upgrade_score ?? null,
    })
    return { ward, sig, predict }
  })

  // Sort: signal_count DESC, then |divergence| DESC (most "interesting" 区先)
  rows.sort((a, b) => {
    if (a.predict.signal_count !== b.predict.signal_count) {
      return b.predict.signal_count - a.predict.signal_count
    }
    const aDiv = Math.abs(a.predict.divergence_from_momentum ?? 0)
    const bDiv = Math.abs(b.predict.divergence_from_momentum ?? 0)
    return bDiv - aDiv
  })

  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const highCount = rows.filter(r => r.predict.confidence === 'high').length
  const overrideCount = rows.filter(r => r.predict.override_warning).length

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono text-xs p-3 sm:p-4">
      {/* Header */}
      <div className="border-b border-green-900 pb-2 mb-3 flex flex-col sm:flex-row sm:justify-between gap-1">
        <div>
          <span className="text-green-300 font-bold">UpgradeMap PREDICT</span>
          <span className="ml-2 text-gray-500">/ 反推方法论 23 区</span>
        </div>
        <div className="text-gray-500">{ts} JST</div>
      </div>

      {/* Nav */}
      <div className="mb-3 flex gap-3 text-[10px]">
        <Link href="/" className="text-gray-500 hover:text-green-300">[1] 主页</Link>
        <Link href="/compare" className="text-gray-500 hover:text-green-300">[2] 对比</Link>
        <span className="text-green-300">[3] PREDICT</span>
      </div>

      {/* Stats bar */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
        <span>23 区 · {highCount} 高置信 (●●●)</span>
        <span className="text-yellow-500">{overrideCount} H3 警告</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-green-900 text-gray-500 text-[10px]">
              <th className="text-left px-2 py-1 font-normal">Code</th>
              <th className="text-left px-2 py-1 font-normal">Ward</th>
              <th className="text-right px-2 py-1 font-normal">Mom</th>
              <th className="text-right px-2 py-1 font-normal">Pred</th>
              <th className="text-right px-2 py-1 font-normal">Δ</th>
              <th className="text-center px-2 py-1 font-normal">Sig</th>
              <th className="text-left px-2 py-1 font-normal">Costly</th>
              <th className="text-left px-2 py-1 font-normal">Silent / Override</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ward, sig, predict }) => {
              const mom = sig?.upgrade_score ?? null
              const delta = predict.divergence_from_momentum
              const deltaStr = delta === null ? '--' : delta > 0 ? `+${delta}` : `${delta}`
              const deltaColor =
                delta === null ? 'text-gray-500' :
                delta > 5 ? 'text-green-400' :
                delta < -5 ? 'text-red-400' :
                'text-gray-400'
              const sigDisplay = '●'.repeat(predict.signal_count) + '○'.repeat(Math.max(0, 3 - predict.signal_count))
              const sigColor =
                predict.confidence === 'high' ? 'text-green-400' :
                predict.confidence === 'medium' ? 'text-yellow-500' :
                'text-gray-600'
              const costlyText = predict.costly_signals.length > 0
                ? predict.costly_signals.map(s => s.name).join('·')
                : '--'
              const silentItems = [
                ...predict.silent_signals.map(s => s.name),
                ...(predict.override_warning ? ['H3⚠'] : []),
              ]
              const silentText = silentItems.length > 0 ? silentItems.join('·') : '--'

              return (
                <tr key={ward.code} className="border-b border-gray-900 hover:bg-green-950/40 transition-colors">
                  <td className="px-2 py-1 text-gray-600">{ward.code}</td>
                  <td className="px-2 py-1">
                    <Link href={`/ward/${ward.code}`} className="hover:text-green-300">{ward.name_zh}</Link>
                  </td>
                  <td className="text-right px-2 py-1 text-gray-400">{mom !== null ? mom.toFixed(0) : '--'}</td>
                  <td className="text-right px-2 py-1 text-green-300 font-bold">{predict.score.toFixed(0)}</td>
                  <td className={`text-right px-2 py-1 ${deltaColor}`}>{deltaStr}</td>
                  <td className={`text-center px-2 py-1 ${sigColor}`}>{sigDisplay}</td>
                  <td className="px-2 py-1 text-gray-400 text-[10px]">{costlyText}</td>
                  <td className="px-2 py-1 text-yellow-600 text-[10px]">{silentText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Methodology footer */}
      <div className="mt-4 pt-2 border-t border-green-900 text-gray-500 text-[10px] space-y-1 leading-relaxed">
        <div className="text-gray-400 mb-1">METHODOLOGY (反推方法论 / inverse inference):</div>
        <div><span className="text-green-300">H1</span> 三角校验: ●●● ≥3 独立信号源 = 高置信判断 [Heuer 1999]</div>
        <div><span className="text-green-300">H2</span> 沉默信号: 长期不出 = 战略 No，是护城河前提 [Porter 1996]</div>
        <div><span className="text-green-300">H3</span> Incentive override: cheap talk vs costly signal 冲突相信后者 [Spence 1973]</div>

        {/* Scoring formula transparency */}
        <div className="mt-3 pt-2 border-t border-green-900/50">
          <div className="text-gray-400 mb-1">SCORING (推论依据 / how Pred is computed):</div>
          <div className="font-mono text-gray-500 leading-snug">
            <div>strength<sub>i</sub> = clamp(raw<sub>i</sub> × scale<sub>i</sub> + 50, 0, 100)</div>
            <div className="ml-3">房价动量    raw=price_yoy   scale=5   weight=0.35  ← Spence costly (成交价不可伪造)</div>
            <div className="ml-3">人口净流入  raw=pop_yoy     scale=15  weight=0.30  ← Spence "voting with feet"</div>
            <div className="ml-3">商业活力    raw=permits_yoy scale=8   weight=0.20  ← 開店成本不可伪造</div>
            <div className="ml-3">价格加速度  raw=acceleration scale=5  weight=0.15  ← 趋势二阶导</div>
            <div className="mt-1">Pred = Σ (strength<sub>i</sub> × weight<sub>i</sub>)，缺信号 → neutral 50 × weight (惩罚不完整)</div>
            <div>Δ = Pred − Mom (divergence) — 偏离历史动量越大 = 反推方法论 alpha 越强</div>
          </div>
        </div>

        {/* Data sources */}
        <div className="mt-3 pt-2 border-t border-green-900/50">
          <div className="text-gray-400 mb-1">DATA SOURCES (信号源):</div>
          <div className="ml-3 text-gray-500">
            <div>price_yoy        ← 国土交通省 reinfolib (実成約価)</div>
            <div>pop_yoy          ← 総務省 e-Stat (国勢調査)</div>
            <div>permits_yoy      ← 東京都食品営業許可 <span className="text-yellow-600">⚠️ 集約 pending (Bug #1)</span></div>
            <div>price_acceleration ← reinfolib momentum 二階差分</div>
          </div>
        </div>

        {/* H3 trigger logic */}
        <div className="mt-3 pt-2 border-t border-green-900/50">
          <div className="text-gray-400 mb-1">H3 OVERRIDE 触发条件:</div>
          <div className="ml-3 text-gray-500">
            <div>price_yoy {'>'} 5% AND permits_yoy {'<'} −5% → 投机 vs 实需冲突</div>
            <div>pop_yoy {'<'} −1% AND price_yoy {'>'} 3% → 人口流出 vs 房价上涨 = 投机性涨价</div>
          </div>
        </div>

        <div className="pt-2 text-gray-600">
          基于 Akerlof 1970 不对称信息经济学。Mom = 历史动量 (lib/score.ts: momentum 0.4 + accel 0.3 + tier 0.3) · Pred = 反推综合 (lib/predict-score.ts: 上述公式)
        </div>
        <div className="text-gray-700 italic pt-1">
          数据仅供参考，不构成投资建议 · weights 为 initial guess，待 backtest 校准 · 算法源码 lib/predict-score.ts
        </div>
      </div>
    </div>
  )
}
