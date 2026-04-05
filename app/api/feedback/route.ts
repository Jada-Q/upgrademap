import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { ward, comment } = await req.json()

  if (!ward || typeof ward !== 'string') {
    return NextResponse.json({ error: 'ward is required' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Try insert; if table doesn't exist, fall back gracefully
  const { error } = await sb.from('um_feedback').insert({
    ward: ward.trim().slice(0, 100),
    comment: (comment || '').trim().slice(0, 500),
  })

  if (error) {
    // Log server-side for debugging, but don't expose details
    console.error('Feedback insert error:', error.message)
    return NextResponse.json({ error: 'save failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
