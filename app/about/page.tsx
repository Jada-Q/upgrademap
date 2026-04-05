import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UpgradeMap — 关于',
  description: '基于真实成交价和人口趋势，发现东京正在升级的街区',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-12">
        <p className="text-sm font-medium text-blue-600 mb-3">东京不动产数据工具</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          哪个区正在涨？<br />
          <span className="text-blue-600">用数据回答，不靠感觉。</span>
        </h1>
        <p className="text-lg text-gray-500 mt-5 max-w-xl">
          UpgradeMap 交叉分析东京 23 区的真实成交价和人口趋势，帮你发现正在升级的街区
          — 在别人注意到之前。
        </p>
        <div className="flex gap-3 mt-8">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            查看 23 区评分
          </Link>
          <Link
            href="/compare"
            className="bg-white border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            横向对比排名
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">你可能遇到过这些问题</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { q: '"中介说这个区在涨"', a: '但你不知道是真涨还是话术' },
              { q: '"朋友推荐了一个区"', a: '但你不确定是不是已经涨到头了' },
              { q: '"想找价格洼地"', a: '但 23 个区逐个查太费时间' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="font-medium text-gray-900 text-sm">{q}</p>
                <p className="text-xs text-gray-400 mt-2">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-8">怎么判断一个区在升级？</h2>
        <div className="space-y-6">
          {[
            {
              num: '1',
              title: '房价动量',
              desc: '不看绝对价格，看趋势。年涨幅是多少？涨幅在加速还是减速？比东京均价高还是低？',
              source: '数据来源：国土交通省 reinfolib 真实成交价',
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              num: '2',
              title: '人口活力',
              desc: '人口在增长的区域，需求会持续。重点看总人口和生产年龄人口（15-64岁）的变化趋势。',
              source: '数据来源：総務省 e-Stat 国勢調査',
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              num: '→',
              title: '交叉分析出信号',
              desc: '两项数据交叉，识别出三种信号：早期升级（价格低但在涨+人口增长）、活跃升级（双增长）、成熟/风险（价高但人口放缓）。',
              source: '帮你判断：是买入窗口，还是该观望',
              color: 'text-gray-900',
              bg: 'bg-gray-50',
            },
          ].map(({ num, title, desc, source, color, bg }) => (
            <div key={title} className="flex gap-4">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                <span className={`font-bold ${color}`}>{num}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
                <p className="text-xs text-gray-400 mt-1">{source}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Signals explained */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">三种升级信号</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                label: '早期升级',
                bg: 'bg-green-50 border-green-100',
                color: 'text-green-700',
                desc: '价格低于东京均值但在加速上涨，同时人口在增长',
                action: '潜在买入窗口 — 关注这些区',
              },
              {
                label: '活跃升级',
                bg: 'bg-blue-50 border-blue-100',
                color: 'text-blue-700',
                desc: '价格和人口双增长，升级已经在进行中',
                action: '考虑入场 — 但注意已不是最低点',
              },
              {
                label: '成熟/风险',
                bg: 'bg-orange-50 border-orange-100',
                color: 'text-orange-700',
                desc: '价格高位但人口增长放缓',
                action: '谨慎 — 注意回调风险',
              },
            ].map(({ label, bg, color, desc, action }) => (
              <div key={label} className={`rounded-xl p-4 border ${bg}`}>
                <p className={`font-semibold text-sm ${color}`}>{label}</p>
                <p className="text-xs text-gray-600 mt-2">{desc}</p>
                <p className={`text-xs font-medium mt-3 ${color}`}>{action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">适合谁用？</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { who: '在日华人购房者', use: '买房前快速筛选值得关注的区域，避开已见顶的区' },
            { who: '不动产投资者', use: '用数据辅助判断投资时机，发现价格洼地' },
            { who: '不动产从业者', use: '向客户展示区域趋势时有数据支撑' },
            { who: '海外投资者', use: '远程了解东京各区动态，中文界面零门槛' },
          ].map(({ who, use }) => (
            <div key={who} className="border border-gray-100 rounded-xl p-4">
              <p className="font-semibold text-gray-900 text-sm">{who}</p>
              <p className="text-xs text-gray-500 mt-1">{use}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600">
        <div className="max-w-3xl mx-auto px-5 py-12 text-center">
          <h2 className="text-xl font-bold text-white mb-3">免费使用，无需注册</h2>
          <p className="text-blue-100 text-sm mb-6">
            数据每季度更新 · 覆盖东京全 23 区 · 持续接入更多数据源
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-blue-600 font-medium px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            立即查看 23 区评分
          </Link>
        </div>
      </section>

      {/* Footer / Disclaimer */}
      <footer className="max-w-3xl mx-auto px-5 py-8 text-center">
        <p className="text-xs text-gray-400">
          数据来源：国土交通省 reinfolib + 総務省 e-Stat · 评分算法基于公开数据的统计分析，仅供参考，不构成投资建议
        </p>
        <p className="text-xs text-gray-300 mt-2">
          UpgradeMap by Jada
        </p>
      </footer>
    </div>
  )
}
