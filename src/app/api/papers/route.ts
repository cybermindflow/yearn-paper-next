import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { checkUsageLimit } from '@/lib/usageLimits'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('parent_id', session.parentId)
    .order('generated_at', { ascending: false })

  return NextResponse.json({ papers: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Usage limit check
  const usage = await checkUsageLimit(session.parentId)
  if (!usage.allowed) {
    return NextResponse.json({
      error: `已達免費版使用上限（${usage.limit} 次），請聯絡殷學社教育中心升級方案。`
    }, { status: 403 })
  }

  const { childId, subject, topic, unit, questionTypes, difficultyLevel, pageCount, mode } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('papers')
    .insert({
      parent_id: session.parentId,
      child_id: childId || null,
      subject: subject || '常識科',
      topic: topic || '生活多姿彩',
      unit: unit || '單元一',
      question_types: questionTypes || ['mc'],
      difficulty_level: difficultyLevel || 1,
      page_count: pageCount || 2,
      mode: mode || 'online',
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '建立練習卷失敗' }, { status: 500 })
  return NextResponse.json({ paper: data })
}
