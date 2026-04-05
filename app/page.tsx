export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getAllWards, getLatestSignals } from '@/lib/queries'
import { SIGNAL_META, getConfidence } from '@/lib/score'
import { ACTIVE_WARD_CODES } from '@/lib/constants'

export default async function HomePage() {
  const [wards, signals] = await Promise.all([getAllWards(), getLatestSignals()])

  const signalMap: Record<string, typeof signals[0]> = {}
  for (const s of signals) signalMap[s.ward_code] = s

  const sorted = [...wards].sort((a, b) => {
    const aActive = ACTIVE_WARD_CODES.includes(a.code)
    const bActive = ACTIVE_WARD_CODES.includes(b.code)
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return (signalMap[b.code]?.upgrade_score ?? 0) - (signalMap[a.code]?.upgrade_score ?? 0)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-gray-900">UpgradeMap</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            发现东京正在涨价的区域 — 基于真实成交价和人口趋势
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-4">
          <Link
            href="/"
            className="flex-1 text-center bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            卡片视图
          </Link>
          <Link
            href="/compare"
            className="flex-1 text-center bg-white border border-gray-200 text-sm font-medium text-gray-700 px-4 py-2.5 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            排名对比
          </Link>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-xs text-blue-600 mb-4">
          数据来源：国土交通省 reinfolib（成交价）+ 総務省 e-Stat（人口統計）
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map(ward => {
            const sig = signalMap[ward.code]
            const hasData = ACTIVE_WARD_CODES.includes(ward.code)
            const meta = sig?.upgrade_signal ? SIGNAL_META[sig.upgrade_signal] : SIGNAL_META.unknown
            const confidence = getConfidence(hasData, sig?.total_pop_yoy_pct != null)

            return (
              <Link
                key={ward.code}
                href={`/ward/${ward.code}`}
                className="bg-white rounded-xl border border-gray-100 px-4 py-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{ward.name_zh}</div>
                    <div className="text-xs text-gray-400">{ward.name_ja}</div>
                  </div>
                  {sig?.upgrade_score != null && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{sig.upgrade_score.toFixed(0)}</div>
                      <div className="text-xs text-gray-400">/ 100</div>
                    </div>
                  )}
                </div>

                {sig && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <div className="flex gap-3 text-xs text-gray-400">
                        {sig.price_yoy_pct != null && (
                          <span>
                            房价{' '}
                            <span className={sig.price_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {sig.price_yoy_pct >= 0 ? '+' : ''}{sig.price_yoy_pct.toFixed(1)}%
                            </span>
                          </span>
                        )}
                        {sig.total_pop_yoy_pct != null && (
                          <span>
                            人口{' '}
                            <span className={sig.total_pop_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {sig.total_pop_yoy_pct >= 0 ? '+' : ''}{sig.total_pop_yoy_pct.toFixed(1)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidence.bg} ${confidence.color}`}>
                        {confidence.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{confidence.desc}</span>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center pb-8">
          早期升级 = 价格低于均值但加速上涨 + 人口增长 · 数据仅供参考，不构成投资建议
        </p>
      </div>
    </div>
  )
}
