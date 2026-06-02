import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/exam/history
 * Returns all completed exam records for the current parent.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all exam papers for this parent
  const { data: examPapers } = await supabaseAdmin
    .from('papers')
    .select('id')
    .eq('parent_id', session.parentId)
    .eq('mode', 'exam')

  if (!examPapers || examPapers.length === 0) {
    return NextResponse.json({ exams: [] })
  }

  const paperIds = examPapers.map(p => p.id)

  // Get scores joined with paper info
  const { data: scores } = await supabaseAdmin
    .from('scores')
    .select(`
      id,
      paper_id,
      total_questions,
      correct_count,
      score_percentage,
      time_spent_seconds,
      completed_at,
      papers(id, subject, topic, time_limit_minutes, generated_at)
    `)
    .in('paper_id', paperIds)
    .order('completed_at', { ascending: false })

  return NextResponse.json({ exams: scores || [] })
}
