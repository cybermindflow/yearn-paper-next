import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const modeFilter = searchParams.get('mode') // optional: 'practice' | 'diagnosis' | 'exam'

  // If mode filter provided, first get papers with that mode
  let paperIds: string[]
  if (modeFilter && ['practice', 'diagnosis', 'exam'].includes(modeFilter)) {
    const { data: filteredPapers } = await supabaseAdmin
      .from('papers')
      .select('id')
      .eq('parent_id', session.parentId)
      .eq('mode', modeFilter)
    paperIds = (filteredPapers || []).map(p => p.id)
  } else {
    const { data: allPapers } = await supabaseAdmin
      .from('papers')
      .select('id')
      .eq('parent_id', session.parentId)
    paperIds = (allPapers || []).map(p => p.id)
  }

  if (paperIds.length === 0) return NextResponse.json({ scores: [] })

  const { data: scores } = await supabaseAdmin
    .from('scores')
    .select(`
      *,
      papers(subject, topic, unit, mode, delivery_mode, generated_at)
    `)
    .in('paper_id', paperIds)
    .order('completed_at', { ascending: false })

  return NextResponse.json({ scores: scores || [] })
}

export async function POST(req: NextRequest) {
  // Manual score entry for PDF mode
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paperId, totalQuestions, correctCount } = await req.json()

  // Verify ownership
  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .eq('parent_id', session.parentId)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

  const { data: score } = await supabaseAdmin
    .from('scores')
    .insert({
      paper_id: paperId,
      child_id: paper.child_id,
      total_questions: totalQuestions,
      correct_count: correctCount,
      score_percentage: parseFloat(scorePercentage.toFixed(2)),
    })
    .select()
    .single()

  // Update paper status
  await supabaseAdmin
    .from('papers')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', paperId)

  return NextResponse.json({ success: true, score })
}
