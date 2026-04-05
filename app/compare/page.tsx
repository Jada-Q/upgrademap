export const dynamic = 'force-dynamic'

import { getAllWards, getLatestSignals } from '@/lib/queries'
import { CompareTable } from './CompareTable'

export default async function ComparePage() {
  const [wards, signals] = await Promise.all([getAllWards(), getLatestSignals()])

  const signalMap: Record<string, typeof signals[0]> = {}
  for (const s of signals) signalMap[s.ward_code] = s

  const rows = wards.map(w => ({
    ward: w,
    signal: signalMap[w.code] ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/" className="text-sm text-blue-600 hover:underline">← 返回总览</a>
          <h1 className="text-lg font-bold text-gray-900 mt-2">23区横向对比</h1>
          <p className="text-sm text-gray-400">点击表头排序 · 数据来源：reinfolib + e-Stat</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 overflow-x-auto">
        <CompareTable rows={rows} />
        <p className="text-xs text-gray-400 mt-4">
          评分算法：房价动量(55%) + 人口活力(45%) · 商业活力信号即将上线
        </p>
      </div>
    </div>
  )
}
