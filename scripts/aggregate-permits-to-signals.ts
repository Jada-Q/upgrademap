// Bug #1 fix: aggregate um_food_permits → um_signals.new_permits_count + permits_yoy_pct
// Trailing 12 months vs previous 12 months yoy
// Run: npx tsx scripts/aggregate-permits-to-signals.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  // Verify table has data first
  const { count: totalRows, error: countErr } = await sb
    .from('um_food_permits')
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.error(`um_food_permits read error: ${countErr.message}`)
    process.exit(1)
  }
  console.log(`um_food_permits total rows: ${totalRows}\n`)
  if (!totalRows || totalRows === 0) {
    console.error('No permits data — run scripts/fetch-food-permits.ts first')
    process.exit(1)
  }

  // Time windows: trailing 12mo vs previous 12mo (calendar-aligned to today)
  const now = new Date()
  const t1 = new Date(now)
  t1.setFullYear(t1.getFullYear() - 1)
  const t2 = new Date(now)
  t2.setFullYear(t2.getFullYear() - 2)

  const t1Str = t1.toISOString().slice(0, 10)
  const t2Str = t2.toISOString().slice(0, 10)
  const nowStr = now.toISOString().slice(0, 10)

  console.log(`Recent 12mo: ${t1Str} ~ ${nowStr}`)
  console.log(`Prev 12mo:   ${t2Str} ~ ${t1Str}\n`)

  // Get period from existing signals (so upsert doesn't conflict)
  const { data: anyExisting } = await sb
    .from('um_signals')
    .select('period')
    .limit(1)
  const period = anyExisting?.[0]?.period ?? '2024Q4'
  console.log(`Using period: ${period}\n`)

  let updated = 0
  for (const ward of TOKYO_WARDS) {
    // Recent 12mo count
    const { count: recent, error: e1 } = await sb
      .from('um_food_permits')
      .select('*', { count: 'exact', head: true })
      .eq('ward_code', ward.code)
      .gte('permit_date', t1Str)
      .lte('permit_date', nowStr)

    // Previous 12mo count
    const { count: previous, error: e2 } = await sb
      .from('um_food_permits')
      .select('*', { count: 'exact', head: true })
      .eq('ward_code', ward.code)
      .gte('permit_date', t2Str)
      .lt('permit_date', t1Str)

    if (e1 || e2) {
      console.error(`  ${ward.name_ja} read error`)
      continue
    }

    const recentN = recent ?? 0
    const prevN = previous ?? 0
    const yoy = prevN > 0 ? ((recentN / prevN) - 1) * 100 : null

    // Upsert ONLY the permit fields (other columns preserved)
    const { error: upErr } = await sb.from('um_signals').upsert(
      {
        ward_code: ward.code,
        period,
        new_permits_count: recentN,
        permits_yoy_pct: yoy !== null ? Math.round(yoy * 100) / 100 : null,
      },
      { onConflict: 'ward_code,period' }
    )

    if (upErr) {
      console.error(`  ${ward.name_ja} upsert: ${upErr.message}`)
      continue
    }

    updated++
    const yoyStr = yoy !== null ? `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%` : 'NULL'
    console.log(
      `  ${ward.name_zh.padEnd(6)} recent=${recentN.toString().padStart(4)} prev=${prevN.toString().padStart(4)} yoy=${yoyStr.padStart(8)}`
    )
  }

  console.log(`\n✅ Updated ${updated}/${TOKYO_WARDS.length} wards`)
  console.log('Now /predict will show ●●● for wards with all 3 signals')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
