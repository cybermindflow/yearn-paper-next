import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scoreId } = await params

  // Get score record and verify ownership via paper
  const { data: score } = await supabaseAdmin
    .from('scores')
    .select(`
      *,
      papers(id, subject, topic, unit, mode, parent_id)
    `)
    .eq('id', scoreId)
    .single()

  if (!score) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ownership
  if (score.papers?.parent_id !== session.parentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all questions for this paper with answers
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, question_number, question_text, question_type, options, correct_answer, explanation, child_answer, is_correct')
    .eq('paper_id', score.paper_id)
    .order('question_number', { ascending: true })

  return NextResponse.json({
    score: {
      id: score.id,
      paper_id: score.paper_id,
      total_questions: score.total_questions,
      correct_count: score.correct_count,
      score_percentage: score.score_percentage,
      time_spent_seconds: score.time_spent_seconds,
      completed_at: score.completed_at,
      mode: score.papers?.mode || 'practice',
      subject: score.papers?.subject || '',
      topic: score.papers?.topic || '',
      unit: score.papers?.unit || '',
    },
    questions: questions || [],
  })
}
