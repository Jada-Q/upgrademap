import { createClient } from '@supabase/supabase-js'

export function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export type Ward = {
  code: string
  name_ja: string
  name_zh: string
}

export type Signal = {
  ward_code: string
  period: string
  price_yoy_pct: number | null
  price_acceleration: number | null
  price_vs_tokyo_avg: number | null
  pop_25_44_yoy_pct: number | null
  total_pop_yoy_pct: number | null
  new_permits_count: number | null
  permits_yoy_pct: number | null
  upgrade_score: number | null
  upgrade_signal: string | null
}

export type PopulationRow = {
  ward_code: string
  year: number
  total_population: number | null
  pop_25_44: number | null // actually 15-64 from census
  households: number | null
}

export async function getAllWards(): Promise<Ward[]> {
  const sb = getClient()
  const { data } = await sb.from('um_wards').select('*').order('code')
  return data ?? []
}

export async function getLatestSignals(): Promise<Signal[]> {
  const sb = getClient()
  const { data } = await sb.from('um_signals').select('*').order('ward_code')
  return data ?? []
}

export async function getWardSignal(wardCode: string): Promise<Signal | null> {
  const sb = getClient()
  const { data } = await sb.from('um_signals').select('*').eq('ward_code', wardCode).single()
  return data ?? null
}

export async function getWardPopulation(wardCode: string): Promise<PopulationRow[]> {
  const sb = getClient()
  const { data } = await sb.from('um_population').select('*').eq('ward_code', wardCode).order('year')
  return data ?? []
}

// 人口増減率を計算（直近2期間）
export function calcPopGrowth(pop: PopulationRow[]): { totalPct: number | null; workingPct: number | null } {
  if (pop.length < 2) return { totalPct: null, workingPct: null }
  const latest = pop[pop.length - 1]
  const prev = pop[pop.length - 2]
  const yearDiff = latest.year - prev.year
  if (!yearDiff) return { totalPct: null, workingPct: null }

  const totalPct = latest.total_population && prev.total_population
    ? ((latest.total_population / prev.total_population) - 1) * 100
    : null

  const workingPct = latest.pop_25_44 && prev.pop_25_44
    ? ((latest.pop_25_44 / prev.pop_25_44) - 1) * 100
    : null

  return { totalPct, workingPct }
}
