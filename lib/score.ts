// 升级信号评分算法
// Phase 1-2: 2信号版（房价 + 人口），Phase 3 加入商业信号

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function calcPriceScore(yoyPct: number | null, acceleration: number | null, vsTokyoAvg: number | null): number {
  if (yoyPct === null) return 50

  const momentum = clamp(yoyPct * 3, -30, 30) + 50
  const accel = acceleration !== null ? clamp(acceleration * 5, -25, 25) + 50 : 50
  // 低于东京均值 = 更多上涨空间 = 高分
  const value = vsTokyoAvg !== null ? clamp(-vsTokyoAvg * 1.5, -25, 25) + 50 : 50

  return Math.round((0.4 * momentum + 0.3 * accel + 0.3 * value) * 100) / 100
}

export function calcPopScore(totalPopPct: number | null, workingPopPct: number | null): number {
  if (totalPopPct === null && workingPopPct === null) return 50

  const total = totalPopPct !== null ? clamp(totalPopPct * 10, -25, 25) + 50 : 50
  const working = workingPopPct !== null ? clamp(workingPopPct * 15, -30, 30) + 50 : 50

  return Math.round((0.6 * working + 0.4 * total) * 100) / 100
}

export function calcCompositeScore(priceScore: number, popScore: number, commercialScore?: number): number {
  if (commercialScore !== undefined) {
    return Math.round((0.35 * priceScore + 0.30 * popScore + 0.35 * commercialScore) * 100) / 100
  }
  // 2信号版: 55/45 split
  return Math.round((0.55 * priceScore + 0.45 * popScore) * 100) / 100
}

export function classifySignal(
  priceScore: number,
  popScore: number,
  vsTokyoAvg: number | null,
): string {
  if (priceScore > 55 && (vsTokyoAvg ?? 0) < -5 && popScore > 55) {
    return 'early'
  }
  if (priceScore > 55 && popScore > 50) {
    return 'active'
  }
  // mature = 价格真的高（vsTokyoAvg > 0）+ 人口指标转弱。
  // 必要条件：价格绝对值高于东京均值，否则"低价+老龄化"会被误贴 mature 标。
  if (priceScore > 55 && popScore < 45 && (vsTokyoAvg ?? -99) > 0) {
    return 'mature'
  }
  return 'unknown'
}

export const SIGNAL_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  early:   { label: '早期升级', color: 'text-green-600',  bg: 'bg-green-50',  desc: '人口增长 + 价格低于均值但在加速 — 潜在买入窗口' },
  active:  { label: '活跃升级', color: 'text-blue-600',   bg: 'bg-blue-50',   desc: '人口和价格双增长 — 已在升级中' },
  mature:  { label: '成熟/风险', color: 'text-orange-500', bg: 'bg-orange-50', desc: '价格高但人口增长放缓 — 注意回调风险' },
  unknown: { label: '信号不足', color: 'text-gray-400',   bg: 'bg-gray-50',   desc: '数据不足以做出判断' },
}

// Data confidence level based on available signals
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export function getConfidence(hasPriceData: boolean, hasPopData: boolean): {
  level: ConfidenceLevel
  label: string
  color: string
  bg: string
  desc: string
} {
  if (hasPriceData && hasPopData) {
    return { level: 'high', label: '2项数据', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: '基于真实成交价 + 人口统计' }
  }
  if (hasPopData) {
    return { level: 'medium', label: '1项数据', color: 'text-amber-600', bg: 'bg-amber-50', desc: '仅基于人口统计，成交价数据待接入' }
  }
  return { level: 'low', label: '数据不足', color: 'text-gray-400', bg: 'bg-gray-50', desc: '暂无可用数据' }
}
