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
      child_answer: childAnswer,
      is_correct: isCorrect,
      answered_at: now,
    }
  })

  // Parallel update all questions (much faster than sequential, avoids timeout)
  const updateResults = await Promise.all(
    updates.map(u =>
      supabaseAdmin
        .from('questions')
        .update({ child_answer: u.child_answer, is_correct: u.is_correct, answered_at: u.answered_at })
        .eq('id', u.id)
    )
  )

  // Check for errors
  const updateErrors = updateResults.filter(r => r.error)
  if (updateErrors.length > 0) {
    console.error('Update errors:', updateErrors[0].error)
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

  // Build detailed question results for the result page
  const questionDetails = questions
    .sort((a, b) => a.question_number - b.question_number)
    .map(q => ({
      id: q.id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      child_answer: answers[q.id] ?? null,
      is_correct: updates.find(u => u.id === q.id)?.is_correct ?? null,
    }))

  return NextResponse.json({
    success: true,
    score: {
      totalQuestions: questions.length,
      correctCount,
      scorePercentage: parseFloat(scorePercentage.toFixed(2)),
      scoreId: scoreResult.data?.id,
    },
    questions: questionDetails,
  })
}
