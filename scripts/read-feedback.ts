import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  const { data, error, count } = await sb
    .from('um_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('error:', error.message)
    return
  }

  console.log(`总反馈数: ${count}\n`)
  if (!data || data.length === 0) {
    console.log('(空)')
    return
  }

  for (const r of data) {
    console.log(`── ${r.created_at ?? '?'} ──`)
    for (const [k, v] of Object.entries(r)) {
      if (k === 'id' || k === 'created_at') continue
      if (v === null || v === '') continue
      console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    }
    console.log()
  }
}
run()
