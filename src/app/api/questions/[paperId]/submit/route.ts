import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paperId } = await params
  const { answers, timeSpentSeconds } = await req.json()
  // answers: { [questionId]: string }

  // Verify ownership
  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .eq('parent_id', session.parentId)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get questions
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('paper_id', paperId)

  if (!questions) return NextResponse.json({ error: 'No questions' }, { status: 404 })

  // Grade answers
  let correctCount = 0
  const now = new Date().toISOString()
  const updates = questions.map(q => {
    const childAnswer = answers[q.id] ?? null
    const isObjective = ['mc', 'tf', 'fill', 'match', 'classify'].includes(q.question_type)
    let isCorrect: boolean | null = null

    if (isObjective && childAnswer !== null) {
      isCorrect = childAnswer.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()
      if (isCorrect) correctCount++
    }
    // Subjective: isCorrect stays null (needs manual review)

    return {
      id: q.id,
      paper_id: paperId,
      child_answer: childAnswer,
      is_correct: isCorrect,
      answered_at: now,
    }
  })

  // Batch upsert all questions in ONE request (avoid Vercel timeout)
  const { error: upsertError } = await supabaseAdmin
    .from('questions')
    .upsert(updates, { onConflict: 'id' })

  if (upsertError) {
    console.error('Upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
  }

  // Count only objective questions for score
  const objectiveQuestions = questions.filter(q =>
    ['mc', 'tf', 'fill', 'match', 'classify'].includes(q.question_type)
  )
  const totalObjective = objectiveQuestions.length
  const scorePercentage = totalObjective > 0 ? (correctCount / totalObjective) * 100 : 0

  // Save score and update paper status in parallel
  const [scoreResult] = await Promise.all([
    supabaseAdmin
      .from('scores')
      .insert({
        paper_id: paperId,
        child_id: paper.child_id,
        total_questions: questions.length,
        correct_count: correctCount,
        score_percentage: parseFloat(scorePercentage.toFixed(2)),
        time_spent_seconds: timeSpentSeconds || null,
        mode: paper.mode || 'practice',
      })
      .select()
      .single(),
    supabaseAdmin
      .from('papers')
      .update({ status: 'completed', completed_at: now })
      .eq('id', paperId),
  ])

  return NextResponse.json({
    success: true,
    score: {
      totalQuestions: questions.length,
      correctCount,
      scorePercentage: parseFloat(scorePercentage.toFixed(2)),
      scoreId: scoreResult.data?.id,
    },
  })
}
