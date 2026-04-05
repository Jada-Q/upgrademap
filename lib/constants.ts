// 東京23区の市区町村コード
export const TOKYO_WARDS: { code: string; name_ja: string; name_zh: string }[] = [
  { code: '13101', name_ja: '千代田区', name_zh: '千代田区' },
  { code: '13102', name_ja: '中央区',   name_zh: '中央区' },
  { code: '13103', name_ja: '港区',     name_zh: '港区' },
  { code: '13104', name_ja: '新宿区',   name_zh: '新宿区' },
  { code: '13105', name_ja: '文京区',   name_zh: '文京区' },
  { code: '13106', name_ja: '台東区',   name_zh: '台东区' },
  { code: '13107', name_ja: '墨田区',   name_zh: '墨田区' },
  { code: '13108', name_ja: '江東区',   name_zh: '江东区' },
  { code: '13109', name_ja: '品川区',   name_zh: '品川区' },
  { code: '13110', name_ja: '目黒区',   name_zh: '目黒区' },
  { code: '13111', name_ja: '大田区',   name_zh: '大田区' },
  { code: '13112', name_ja: '世田谷区', name_zh: '世田谷区' },
  { code: '13113', name_ja: '渋谷区',   name_zh: '涩谷区' },
  { code: '13114', name_ja: '中野区',   name_zh: '中野区' },
  { code: '13115', name_ja: '杉並区',   name_zh: '杉并区' },
  { code: '13116', name_ja: '豊島区',   name_zh: '丰岛区' },
  { code: '13117', name_ja: '北区',     name_zh: '北区' },
  { code: '13118', name_ja: '荒川区',   name_zh: '荒川区' },
  { code: '13119', name_ja: '板橋区',   name_zh: '板桥区' },
  { code: '13120', name_ja: '練馬区',   name_zh: '练马区' },
  { code: '13121', name_ja: '足立区',   name_zh: '足立区' },
  { code: '13122', name_ja: '葛飾区',   name_zh: '葛饰区' },
  { code: '13123', name_ja: '江戸川区', name_zh: '江户川区' },
]

// YieldMap已有数据的6区
export const ACTIVE_WARD_CODES = ['13101', '13102', '13103', '13104', '13110', '13113']

// ward名 → code 反查
export const WARD_NAME_TO_CODE: Record<string, string> = {}
for (const w of TOKYO_WARDS) {
  WARD_NAME_TO_CODE[w.name_ja] = w.code
}

// 信号颜色
export const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  early:   { label: '早期升级', color: 'text-green-600',  bg: 'bg-green-50' },
  active:  { label: '活跃升级', color: 'text-blue-600',   bg: 'bg-blue-50' },
  mature:  { label: '成熟/风险', color: 'text-orange-500', bg: 'bg-orange-50' },
  unknown: { label: '信号不足', color: 'text-gray-400',   bg: 'bg-gray-50' },
}
