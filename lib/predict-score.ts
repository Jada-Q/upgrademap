// 反推方法论预测评分（Spence/Heuer/Munger 框架）
// 学科根源:
//   Akerlof 1970 - Market for Lemons (information asymmetry)
//   Spence 1973  - Job Market Signaling (costly signal vs cheap talk)
//   Heuer 1999   - Psychology of Intelligence Analysis (multi-source ACH)
//   Porter 1996  - What Is Strategy? (silent = strategic No)
//   Munger 1995  - Psychology of Human Misjudgment (incentive override)
//
// 与 lib/score.ts 共存不替换:
//   score.ts        = 历史动量 (momentum + accel + tier)
//   predict-score.ts = 反推方法论 (multi-source costly signal)
//
// Weights 是 initial guess (price 0.35 / pop 0.30 / permits 0.20 / accel 0.15)
// 待 backtest 校准 — 参见 needs-dogfood-first.md 2026-08-06 rerun

export type PredictInput = {
  price_yoy_pct: number | null
  price_acceleration: number | null
  price_vs_tokyo_avg: number | null
  total_pop_yoy_pct: number | null
  pop_25_44_yoy_pct: number | null
  permits_count: number | null
  permits_yoy_pct: number | null
  momentum_score: number | null  // 用于 divergence 对比
}

export type SignalSource = {
  name: string
  type: 'costly' | 'cheap' | 'silent'
  strength: number     // 0-100
  raw: number | null
  note: string
}

export type PredictResult = {
  score: number
  signal_count: number  // ≥3 = high (H1 三角校验)
  confidence: 'high' | 'medium' | 'low'
  costly_signals: SignalSource[]
  silent_signals: SignalSource[]
  divergence_from_momentum: number | null
  override_warning: string | null  // H3
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function calcPredictScore(input: PredictInput): PredictResult {
  const costly: SignalSource[] = []
  const silent: SignalSource[] = []
  let totalSignal = 0
  let totalWeight = 0
  let signalCount = 0

  // Signal 1: 房价 YoY (Spence costly — 真实成交价不可伪造)
  if (input.price_yoy_pct !== null) {
    const strength = clamp(input.price_yoy_pct * 5 + 50, 0, 100)
    costly.push({
      name: '房价动量',
      type: 'costly',
      strength,
      raw: input.price_yoy_pct,
      note: 'reinfolib 真实成交 (Spence costly)',
    })
    totalSignal += strength * 0.35
    totalWeight += 0.35
    signalCount++
  }

  // Signal 2: 人口净流入 (Spence "voting with feet" — 搬家成本极高)
  if (input.total_pop_yoy_pct !== null) {
    const strength = clamp(input.total_pop_yoy_pct * 15 + 50, 0, 100)
    costly.push({
      name: '人口净流入',
      type: 'costly',
      strength,
      raw: input.total_pop_yoy_pct,
      note: 'e-Stat 普查 (voting with feet)',
    })
    totalSignal += strength * 0.30
    totalWeight += 0.30
    signalCount++
  } else {
    silent.push({
      name: '人口数据',
      type: 'silent',
      strength: 0,
      raw: null,
      note: '数据缺失',
    })
  }

  // Signal 3: 商业活力 (餐饮新店许可 — 开店投入实金，costly)
  if (input.permits_yoy_pct !== null) {
    const strength = clamp(input.permits_yoy_pct * 8 + 50, 0, 100)
    costly.push({
      name: '商业活力',
      type: 'costly',
      strength,
      raw: input.permits_yoy_pct,
      note: '東京都食品営業許可 (开店成本不可伪造)',
    })
    totalSignal += strength * 0.20
    totalWeight += 0.20
    signalCount++
  } else if (input.permits_count !== null && input.permits_count < 5) {
    silent.push({
      name: '商业活力',
      type: 'silent',
      strength: 30,
      raw: input.permits_count,
      note: 'H2: 长期低许可 = 商业战略 No',
    })
  }

  // Acceleration (附加 weight，不算独立 signal)
  if (input.price_acceleration !== null) {
    const accel = clamp(input.price_acceleration * 5 + 50, 0, 100)
    totalSignal += accel * 0.15
    totalWeight += 0.15
  }

  // Score: normalize by actual weight used (handle missing signals gracefully)
  const score = totalWeight === 0
    ? 50
    : Math.round((totalSignal / totalWeight) * 100) / 100

  // H1 三角校验 confidence
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (signalCount >= 3) confidence = 'high'
  else if (signalCount === 2) confidence = 'medium'

  // Divergence from historical momentum
  const divergence = input.momentum_score !== null
    ? Math.round((score - input.momentum_score) * 10) / 10
    : null

  // H3 Incentive override warning
  let override_warning: string | null = null
  if (
    input.price_yoy_pct !== null &&
    input.price_yoy_pct > 5 &&
    input.permits_yoy_pct !== null &&
    input.permits_yoy_pct < -5
  ) {
    override_warning = 'H3: 房价上涨 vs 商业萎缩 = 投机信号 vs 实需信号冲突'
  }
  if (
    input.total_pop_yoy_pct !== null &&
    input.total_pop_yoy_pct < -1 &&
    input.price_yoy_pct !== null &&
    input.price_yoy_pct > 3
  ) {
    override_warning = 'H3: 人口流出 vs 房价上涨 = 投机性涨价警告'
  }

  return {
    score,
    signal_count: signalCount,
    confidence,
    costly_signals: costly,
    silent_signals: silent,
    divergence_from_momentum: divergence,
    override_warning,
  }
}
