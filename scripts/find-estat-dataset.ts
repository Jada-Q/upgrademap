import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APP_ID = process.env.ESTAT_APP_ID!
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

async function search(query: string) {
  const url = `${BASE}/getStatsList?appId=${APP_ID}&searchWord=${encodeURIComponent(query)}&limit=20`
  const res = await fetch(url)
  const json = await res.json()
  const tables = json?.GET_STATS_LIST?.DATALIST_INF?.TABLE_INF
  if (!tables) return []
  return Array.isArray(tables) ? tables : [tables]
}

async function tryFetch(statsDataId: string, areaCode: string) {
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${statsDataId}&cdArea=${areaCode}&limit=10`
  const res = await fetch(url)
  const json = await res.json()
  const status = json?.GET_STATS_DATA?.RESULT?.STATUS
  if (status !== 0) return null
  return json.GET_STATS_DATA?.STATISTICAL_DATA
}

async function run() {
  // Search for 2020 census with age breakdown at municipal level
  console.log('=== Search: 国勢調査 年齢 市区町村 2020 ===\n')
  const r1 = await search('国勢調査 年齢 市区町村 2020')
  for (const t of r1.slice(0, 5)) {
    console.log(`${t['@id']} | ${t.TITLE?.['$'] || t.TITLE}`)
  }

  // Search for 住民基本台帳 (resident register, more frequent updates)
  console.log('\n=== Search: 住民基本台帳 人口 年齢 市区町村 東京 ===\n')
  const r2 = await search('住民基本台帳 人口 年齢 市区町村 東京')
  for (const t of r2.slice(0, 5)) {
    console.log(`${t['@id']} | ${t.TITLE?.['$'] || t.TITLE}`)
  }

  // Search for 社会人口統計体系 (social/demographic stats system - has time series)
  console.log('\n=== Search: 社会・人口統計体系 人口 東京 特別区 ===\n')
  const r3 = await search('社会・人口統計体系 人口 東京 特別区')
  for (const t of r3.slice(0, 5)) {
    console.log(`${t['@id']} | ${t.TITLE?.['$'] || t.TITLE}`)
  }

  // Try fetching from the first promising dataset
  const candidates = [...r1, ...r2, ...r3]
  for (const c of candidates.slice(0, 3)) {
    const id = c['@id']
    console.log(`\nTrying ${id} for 港区 (13103)...`)
    const data = await tryFetch(id, '13103')
    if (data) {
      const values = data.DATA_INF?.VALUE
      const classes = data.CLASS_INF?.CLASS_OBJ
      if (classes) {
        for (const cls of (Array.isArray(classes) ? classes : [classes])) {
          console.log(`  Dimension: ${cls['@id']} (${cls['@name']})`)
          const cats = cls.CLASS
          if (Array.isArray(cats)) {
            console.log(`    ${cats.slice(0, 5).map((c: any) => `${c['@code']}=${c['@name']}`).join(', ')}...`)
          }
        }
      }
      if (values) {
        const sample = Array.isArray(values) ? values.slice(0, 3) : [values]
        console.log(`  Sample data:`, JSON.stringify(sample, null, 2))
      }
      break
    }
  }
}

run().catch(e => console.error(e))
