'use client'

import { useState } from 'react'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [ward, setWard] = useState('')
  const [comment, setComment] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // For now, log to console + store in localStorage as simple collection
    const feedback = { ward, comment, timestamp: new Date().toISOString() }
    const existing = JSON.parse(localStorage.getItem('um_feedback') || '[]')
    existing.push(feedback)
    localStorage.setItem('um_feedback', JSON.stringify(existing))
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setWard(''); setComment('') }, 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all z-50"
      >
        想看哪个区？
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 bg-white rounded-2xl shadow-xl border border-gray-200 p-5 w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">告诉我们你的需求</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>

      {sent ? (
        <div className="text-center py-6 text-sm text-green-600 font-medium">
          感谢反馈！我们会优先接入你关注的区域
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">你最想看哪个区的数据？</label>
            <input
              type="text"
              value={ward}
              onChange={e => setWard(e.target.value)}
              placeholder="例：品川区、世田谷区"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">其他建议（可选）</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="希望增加什么功能？"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            提交
          </button>
        </form>
      )}
    </div>
  )
}
