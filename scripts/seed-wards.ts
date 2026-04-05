import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { TOKYO_WARDS } from '../lib/constants'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
  console.log('Seeding um_wards...')
  const rows = TOKYO_WARDS.map(w => ({ code: w.code, name_ja: w.name_ja, name_zh: w.name_zh }))
  const { error } = await sb.from('um_wards').upsert(rows, { ignoreDuplicates: true })
  if (error) { console.error('Error:', error.message); process.exit(1) }

  const { count } = await sb.from('um_wards').select('*', { count: 'exact', head: true })
  console.log(`Done: ${count} wards`)
}

run()
