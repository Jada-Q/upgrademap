import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const keys = ['SUPABASE_DB_URL', 'DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'SUPABASE_POOLER_URL']
for (const k of keys) {
  const v = process.env[k]
  console.log(`${k}: ${v ? `SET (length=${v.length})` : 'missing'}`)
}
