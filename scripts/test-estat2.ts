import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APP_ID = process.env.ESTAT_APP_ID!
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

async function run() {
  // 社会・人口統計体系 A 人口・世帯 (0000020101)
  // This has annual data for municipalities
  console.log('=== 社会・人口統計体系 A 人口・世帯 for 港区 ===\n')
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=0000020101&cdArea=13103&limit=50`
  const res = await fetch(url)
  const json = await res.json()
  const status = json?.GET_STATS_DATA?.RESULT?.STATUS
  console.log('Status:', status)

  if (status === 0) {
    const data = json.GET_STATS_DATA.STATISTICAL_DATA
    // Show dimensions
    const classes = data.CLASS_INF?.CLASS_OBJ
    if (classes) {
      for (const cls of (Array.isArray(classes) ? classes : [classes])) {
        console.log(`\nDimension: ${cls['@id']} (${cls['@name']})`)
        const cats = Array.isArray(cls.CLASS) ? cls.CLASS : [cls.CLASS]
        for (const c of cats.slice(0, 20)) {
          console.log(`  ${c['@code']} = ${c['@name']}`)
        }
        if (cats.length > 20) console.log(`  ... (${cats.length} total)`)
      }
    }

    // Show sample values
    const values = data.DATA_INF?.VALUE
    if (values) {
      const arr = Array.isArray(values) ? values : [values]
      console.log(`\nSample values (first 10 of ${arr.length}):`)
      for (const v of arr.slice(0, 10)) {
        console.log(`  ${JSON.stringify(v)}`)
      }
    }
  } else {
    console.log('Error:', JSON.stringify(json.GET_STATS_DATA?.RESULT))
  }
}

run().catch(e => console.error(e))
