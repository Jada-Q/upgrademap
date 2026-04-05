'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

type PopRow = {
  year: number
  total_population: number | null
  pop_25_44: number | null
}

export function PopChart({ data }: { data: PopRow[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">暂无人口数据</div>
  }

  const chartData = data.map(d => ({
    year: String(d.year),
    total: d.total_population ? Math.round(d.total_population / 10000) : 0,
    working: d.pop_25_44 ? Math.round(d.pop_25_44 / 10000) : 0,
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => `${v}万`}
          />
          <Tooltip
            formatter={(value, name) => [
              `${value}万人`,
              name === 'total' ? '总人口' : '生产年龄(15-64)',
            ]}
            labelFormatter={l => `${l}年`}
          />
          <Bar dataKey="total" fill="#93c5fd" radius={[4, 4, 0, 0]} name="total" />
          <Bar dataKey="working" fill="#3b82f6" radius={[4, 4, 0, 0]} name="working" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-300 inline-block" /> 总人口
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> 生产年龄(15-64)
        </span>
      </div>
    </div>
  )
}
