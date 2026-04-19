// 快速验证 reinfolib API key + endpoint 可用
// 拉千代田区 2024Q4 一个季度的数据，只看条数不打印敏感内容
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const KEY = process.env.REINFOLIB_API_KEY
if (!KEY) {
  console.error('❌ REINFOLIB_API_KEY 未设置，请先从 yieldmap/.env.local 复制')
  process.exit(1)
}
console.log(`✓ API key loaded (length=${KEY.length})`)

async function run() {
  const url = new URL('https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001')
  url.searchParams.set('year', '2024')
  url.searchParams.set('quarter', '4')
  url.searchParams.set('area', '13')
  url.searchParams.set('city', '13101') // 千代田区

  const res = await fetch(url.toString(), {
    headers: { 'Ocp-Apim-Subscription-Key': KEY! },
  })

  console.log(`  HTTP ${res.status}`)
  if (!res.ok) {
    console.error('  body:', (await res.text()).slice(0, 200))
    process.exit(1)
  }

  const json = await res.json() as { data?: any[] }
  const records = json.data ?? []
  console.log(`  returned ${records.length} records`)

  const mansion = records.filter(r => String(r.Type).includes('マンション'))
  console.log(`  マンション filter: ${mansion.length} records`)

  if (mansion[0]) {
    const sample = mansion[0]
    console.log('  sample keys:', Object.keys(sample).join(','))
    console.log('  sample Period:', sample.Period)
    console.log('  sample PricePerUnit:', sample.PricePerUnit)
    console.log('  sample Municipality:', sample.Municipality)
    console.log('  sample DistrictName:', sample.DistrictName)
  }
}

run().catch(e => { console.error(e); process.exit(1) })
