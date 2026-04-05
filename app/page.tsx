export const dynamic = 'force-dynamic'

import { getAllWards, getLatestSignals } from '@/lib/queries'
import { SIGNAL_META } from '@/lib/score'
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
            东京23区街区升级预测 — 房价动量 x 人口活力 交叉分析
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6">
          数据来源：国土交通省 reinfolib（成交价）+ 総務省 e-Stat（人口統計）
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map(ward => {
            const sig = signalMap[ward.code]
            const hasData = ACTIVE_WARD_CODES.includes(ward.code)
            const meta = sig?.upgrade_signal ? SIGNAL_META[sig.upgrade_signal] : SIGNAL_META.unknown

            return (
              <a
                key={ward.code}
                href={hasData ? `/ward/${ward.code}` : '#'}
                className={`bg-white rounded-xl border px-4 py-4 transition-all ${
                  hasData
                    ? 'border-gray-100 hover:border-blue-300 hover:shadow-sm'
                    : 'border-gray-50 opacity-50 cursor-default'
                }`}
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
                  <div className="mt-3 flex items-center justify-between">
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
                )}
                {!hasData && (
                  <div className="mt-2 text-xs text-gray-400">房价数据即将上线</div>
                )}
              </a>
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
