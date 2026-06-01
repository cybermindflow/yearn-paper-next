import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { checkUsageLimit } from '@/lib/usageLimits'

// POST /api/diagnosis/create-paper
// Creates a diagnosis paper record (without generating questions yet).
// Returns paperId for subsequent batch generation calls.

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

  const body = await req.json()
  const {
    subject,
    grade,
    knowledgePointIds,
    deliveryMode = 'online',
    childId,
  } = body

  if (!subject || !grade || !knowledgePointIds || knowledgePointIds.length === 0) {
    return NextResponse.json({ error: '缺少必要參數：subject, grade, knowledgePointIds' }, { status: 400 })
  }

  const totalQuestions = knowledgePointIds.length * 3

  // Create paper record with mode='diagnosis', status='pending'
  const { data: paper, error: paperError } = await supabaseAdmin
    .from('papers')
    .insert({
      parent_id: session.parentId,
      child_id: childId || null,
      subject,
      topic: '診斷測驗',
      unit: `${grade} ${subject} 診斷`,
      question_types: ['mc', 'tf'],
      difficulty_level: 1,
      page_count: Math.ceil(totalQuestions / 3),
      mode: 'diagnosis',
      delivery_mode: deliveryMode,
      status: 'pending',
    })
    .select()
    .single()

  if (paperError || !paper) {
    console.error('[create-paper] Paper insert error:', paperError?.message)
    return NextResponse.json({ error: '建立診斷卷失敗' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    paperId: paper.id,
    totalQuestions,
    knowledgePointCount: knowledgePointIds.length,
  })
}
