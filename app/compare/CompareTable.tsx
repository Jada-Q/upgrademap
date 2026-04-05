'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SIGNAL_META, getConfidence } from '@/lib/score'
import { ACTIVE_WARD_CODES } from '@/lib/constants'

type Ward = { code: string; name_ja: string; name_zh: string }
type Signal = {
  ward_code: string
  price_yoy_pct: number | null
  price_acceleration: number | null
  price_vs_tokyo_avg: number | null
  total_pop_yoy_pct: number | null
  pop_25_44_yoy_pct: number | null
  upgrade_score: number | null
  upgrade_signal: string | null
}

type Row = { ward: Ward; signal: Signal | null }
type SortKey = 'score' | 'priceYoy' | 'popYoy' | 'vsAvg'

export function CompareTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('score')

  const sorted = [...rows].sort((a, b) => {
    const sa = a.signal
    const sb = b.signal
    switch (sortKey) {
      case 'score':    return (sb?.upgrade_score ?? -1) - (sa?.upgrade_score ?? -1)
      case 'priceYoy': return (sb?.price_yoy_pct ?? -999) - (sa?.price_yoy_pct ?? -999)
      case 'popYoy':   return (sb?.total_pop_yoy_pct ?? -999) - (sa?.total_pop_yoy_pct ?? -999)
      case 'vsAvg':    return (sa?.price_vs_tokyo_avg ?? 999) - (sb?.price_vs_tokyo_avg ?? 999)
    }
  })

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => setSortKey(k)}
      className={`font-medium transition-colors px-2 py-1.5 rounded-lg text-xs sm:text-sm ${
        sortKey === k
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}{sortKey === k ? ' ↓' : ''}
    </button>
  )

  return (
    <div>
      {/* Sort controls - always visible */}
      <div className="flex flex-wrap gap-1 mb-4">
        <span className="text-xs text-gray-400 self-center mr-1">排序：</span>
        <SortBtn k="score" label="综合分" />
        <SortBtn k="priceYoy" label="房价" />
        <SortBtn k="vsAvg" label="vs均值" />
        <SortBtn k="popYoy" label="人口" />
      </div>

      {/* Desktop: table */}
      <table className="w-full text-sm hidden md:table">
        <thead>
          <tr className="text-xs border-b border-gray-200">
            <th className="text-left py-3 pr-3 font-medium text-gray-400">区</th>
            <th className="text-center py-3 pr-3 font-medium text-gray-400">信号</th>
            <th className="text-right py-3 pr-3 font-medium text-gray-400">综合分</th>
            <th className="text-right py-3 pr-3 font-medium text-gray-400">房价YoY</th>
            <th className="text-right py-3 pr-3 font-medium text-gray-400">vs均值</th>
            <th className="text-right py-3 pr-3 font-medium text-gray-400">人口增长</th>
            <th className="text-center py-3 font-medium text-gray-400">数据</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ ward, signal }) => {
            const meta = signal?.upgrade_signal ? SIGNAL_META[signal.upgrade_signal] : SIGNAL_META.unknown
            const hasPrice = ACTIVE_WARD_CODES.includes(ward.code)
            const confidence = getConfidence(hasPrice, signal?.total_pop_yoy_pct != null)

            return (
              <tr key={ward.code} className="border-b border-gray-100 hover:bg-white transition-colors">
                <td className="py-3 pr-3">
                  <Link href={`/ward/${ward.code}`} className="font-medium text-blue-600 hover:underline">
                    {ward.name_zh}
                  </Link>
                  <div className="text-xs text-gray-400">{ward.name_ja}</div>
                </td>
                <td className="py-3 pr-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right">
                  {signal?.upgrade_score != null
                    ? <span className="font-bold text-gray-900">{signal.upgrade_score.toFixed(0)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3 text-right">
                  {hasPrice && signal?.price_yoy_pct != null ? (
                    <span className={`font-medium ${signal.price_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {signal.price_yoy_pct >= 0 ? '+' : ''}{signal.price_yoy_pct.toFixed(1)}%
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3 text-right">
                  {hasPrice && signal?.price_vs_tokyo_avg != null ? (
                    <span className={`font-medium ${signal.price_vs_tokyo_avg <= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                      {signal.price_vs_tokyo_avg >= 0 ? '+' : ''}{signal.price_vs_tokyo_avg.toFixed(1)}%
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-3 text-right">
                  {signal?.total_pop_yoy_pct != null ? (
                    <span className={`font-medium ${signal.total_pop_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {signal.total_pop_yoy_pct >= 0 ? '+' : ''}{signal.total_pop_yoy_pct.toFixed(1)}%
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidence.bg} ${confidence.color}`}>
                    {confidence.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {sorted.map(({ ward, signal }, i) => {
          const meta = signal?.upgrade_signal ? SIGNAL_META[signal.upgrade_signal] : SIGNAL_META.unknown
          const hasPrice = ACTIVE_WARD_CODES.includes(ward.code)
          const confidence = getConfidence(hasPrice, signal?.total_pop_yoy_pct != null)

          return (
            <Link
              key={ward.code}
              href={`/ward/${ward.code}`}
              className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-5">{i + 1}</span>
                  <div>
                    <span className="font-semibold text-gray-900">{ward.name_zh}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{ward.name_ja}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  {signal?.upgrade_score != null && (
                    <span className="font-bold text-gray-900 text-lg">{signal.upgrade_score.toFixed(0)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                {hasPrice && signal?.price_yoy_pct != null && (
                  <span>
                    房价{' '}
                    <span className={signal.price_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {signal.price_yoy_pct >= 0 ? '+' : ''}{signal.price_yoy_pct.toFixed(1)}%
                    </span>
                  </span>
                )}
                {signal?.total_pop_yoy_pct != null && (
                  <span>
                    人口{' '}
                    <span className={signal.total_pop_yoy_pct >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {signal.total_pop_yoy_pct >= 0 ? '+' : ''}{signal.total_pop_yoy_pct.toFixed(1)}%
                    </span>
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidence.bg} ${confidence.color}`}>
                  {confidence.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
