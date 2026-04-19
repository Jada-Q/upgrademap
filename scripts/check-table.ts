import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function run() {
  // 1. Plain select
  const { data, error, count } = await sb.from('um_reinfolib_tx').select('*', { count: 'exact' }).limit(1)
  console.log('error:', error)
  console.log('count:', count)
  console.log('data sample:', data)

  // 2. Try raw REST call
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/um_reinfolib_tx?select=*&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
  })
  console.log('raw GET status:', res.status)
  console.log('raw body:', (await res.text()).slice(0, 400))
}
run()
