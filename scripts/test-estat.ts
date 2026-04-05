import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APP_ID = process.env.ESTAT_APP_ID!
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 1. 先搜索东京人口相关数据集
async function searchDatasets() {
  const url = `${BASE}/getStatsList?appId=${APP_ID}&searchWord=東京都+人口&statsField=02` // 02=人口・世帯
  console.log('Searching for Tokyo population datasets...\n')
  const res = await fetch(url)
  const json = await res.json()
  const tables = json?.GET_STATS_LIST?.DATALIST_INF?.TABLE_INF
  if (!tables) { console.log('No results:', JSON.stringify(json).slice(0, 500)); return }

  const list = Array.isArray(tables) ? tables : [tables]
  console.log(`Found ${list.length} datasets. Top 10:\n`)
  for (const t of list.slice(0, 10)) {
    const id = t['@id']
    const title = t.TITLE?.['$'] || t.TITLE || '(no title)'
    const cycle = t.CYCLE || ''
    const survey = t.STAT_NAME?.['$'] || ''
    console.log(`ID: ${id}`)
    console.log(`  ${survey} / ${title}`)
    console.log(`  周期: ${cycle}`)
    console.log()
  }
}

// 2. 试拉一个已知的人口数据集
async function testFetch() {
  // 社会・人口統計体系 - 基礎データ - 東京都
  // Try statsDataId for population census summary
  const statsIds = [
    '0000010101', // 国勢調査 人口等基本集計
    '0003448233', // 住民基本台帳に基づく人口
  ]

  for (const sid of statsIds) {
    console.log(`\nTrying statsDataId: ${sid}`)
    const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${sid}&cdArea=13103&limit=5`
    const res = await fetch(url)
    const json = await res.json()
    const status = json?.GET_STATS_DATA?.RESULT?.STATUS
    console.log(`  Status: ${status}`)
    if (status === 0) {
      const values = json.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
      if (values) console.log(`  Sample:`, JSON.stringify(values.slice?.(0, 3) || values, null, 2))
    }
  }
}

async function run() {
  await searchDatasets()
  await testFetch()
}

run().catch(e => console.error(e))
