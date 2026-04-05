export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllWards, getWardSignal, getWardPopulation, calcPopGrowth } from '@/lib/queries'
import { calcPriceScore, calcPopScore, calcCompositeScore, SIGNAL_META, getConfidence } from '@/lib/score'
import { ACTIVE_WARD_CODES } from '@/lib/constants'
import { ScoreBar } from './ScoreBar'
import { PopChart } from './PopChart'

type Props = { params: Promise<{ code: string }> }

export default async function WardPage({ params }: Props) {
  const { code } = await params
  const [wards, signal, popData] = await Promise.all([
    getAllWards(),
    getWardSignal(code),
    getWardPopulation(code),
  ])

  const ward = wards.find(w => w.code === code)
  if (!ward) notFound()

  const hasPrice = ACTIVE_WARD_CODES.includes(code)
  const { totalPct, workingPct } = calcPopGrowth(popData)

  const priceScore = signal
    ? calcPriceScore(signal.price_yoy_pct, signal.price_acceleration, signal.price_vs_tokyo_avg)
    : 50
  const popScore = calcPopScore(totalPct, workingPct)
  const composite = calcCompositeScore(priceScore, popScore)
  const meta = signal?.upgrade_signal ? SIGNAL_META[signal.upgrade_signal] : SIGNAL_META.unknown
  const confidence = getConfidence(hasPrice, totalPct != null)

  const latestPop = popData.at(-1)
  const prevPop = popData.at(-2)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← 返回总览</Link>
          <div className="flex items-baseline gap-3 mt-2">
            <h1 className="text-2xl font-bold text-gray-900">{ward.name_zh}</h1>
            <span className="text-gray-400 text-sm">{ward.name_ja}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{meta.desc}</p>
          <div className={`inline-flex items-center gap-1.5 mt-2 text-xs px-2 py-1 rounded ${confidence.bg} ${confidence.color}`}>
            <span className="font-medium">{confidence.label}</span>
            <span className="opacity-70">— {confidence.desc}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 综合评分 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">综合升级评分</h2>
            <div className="text-2xl font-bold text-gray-900">{composite.toFixed(0)} <span className="text-sm font-normal text-gray-400">/ 100</span></div>
          </div>

          <div className="space-y-3">
            <ScoreBar label="房价动量" score={priceScore} color={hasPrice ? 'blue' : 'gray'} disabled={!hasPrice} />
            <ScoreBar label="人口活力" score={popScore} color="green" />
          </div>
          {!hasPrice && (
            <p className="text-xs text-amber-600 mt-3">
              该区成交价数据未接入，评分仅基于人口趋势
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">更多评分维度开发中</p>
        </div>

        {/* 房价指标 */}
        {hasPrice && signal && (
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">房价动量</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className={`text-xl font-bold ${(signal.price_yoy_pct ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {signal.price_yoy_pct != null ? `${signal.price_yoy_pct >= 0 ? '+' : ''}${signal.price_yoy_pct.toFixed(1)}%` : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">年同比</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${(signal.price_acceleration ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                  {signal.price_acceleration != null
                    ? (signal.price_acceleration > 2 ? '加速中' : signal.price_acceleration < -2 ? '减速中' : '平稳')
                    : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  涨幅趋势{signal.price_acceleration != null ? ` (${signal.price_acceleration >= 0 ? '+' : ''}${signal.price_acceleration.toFixed(1)})` : ''}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${(signal.price_vs_tokyo_avg ?? 0) <= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                  {signal.price_vs_tokyo_avg != null ? `${signal.price_vs_tokyo_avg >= 0 ? '+' : ''}${signal.price_vs_tokyo_avg.toFixed(1)}%` : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">vs 东京均值</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              加速度 {'>'} 0 表示涨幅在扩大 · vs东京均值为负表示价格低于平均（潜在上涨空间）
            </p>
          </div>
        )}

        {!hasPrice && (
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 text-center">
            <p className="text-sm text-amber-700">该区成交价数据尚未接入</p>
            <p className="text-xs text-amber-600 mt-1">点击右下角「想看哪个区？」告诉我们，我们会优先接入</p>
          </div>
        )}

        {/* 人口趋势 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">人口趋势（国勢調査）</h2>

          {latestPop && prevPop && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {latestPop.total_population ? (latestPop.total_population / 10000).toFixed(1) : '—'}万
                </div>
                <div className="text-xs text-gray-400 mt-1">{latestPop.year}年 总人口</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${(totalPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {totalPct != null ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%` : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">5年增长率</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${(workingPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {workingPct != null ? `${workingPct >= 0 ? '+' : ''}${workingPct.toFixed(1)}%` : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">生产年龄(15-64)增长</div>
              </div>
            </div>
          )}

          <PopChart data={popData} />
        </div>

        {/* YieldMap 链接 */}
        {hasPrice && (
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-700 mb-2">想看具体车站周边的成交价走势？</p>
            <a
              href="https://yieldmap-theta.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              打开 YieldMap（姊妹工具）查看站点级数据 <span className="text-blue-200">↗</span>
            </a>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-8">
          数据来源：国土交通省 reinfolib + 総務省 e-Stat · 评分仅供参考，不构成投资建议
        </p>
      </div>
    </div>
  )
}
