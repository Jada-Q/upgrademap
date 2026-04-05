'use client'

type Props = {
  label: string
  score: number
  color: 'blue' | 'green' | 'orange' | 'gray'
  disabled?: boolean
}

const COLORS = {
  blue:   { bar: 'bg-blue-500',   text: 'text-blue-600' },
  green:  { bar: 'bg-green-500',  text: 'text-green-600' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-600' },
  gray:   { bar: 'bg-gray-300',   text: 'text-gray-400' },
}

export function ScoreBar({ label, score, color, disabled }: Props) {
  const c = COLORS[color]
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-sm text-gray-600 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all ${c.bar}`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${c.text}`}>
        {disabled ? '—' : score.toFixed(0)}
      </span>
    </div>
  )
}
