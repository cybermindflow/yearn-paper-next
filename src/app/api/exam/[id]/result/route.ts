import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/exam/[id]/result
 * Returns detailed exam report for a completed exam paper.
 * Includes: score overview, time analysis, per-knowledge-point performance, per-question details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get paper (must be exam mode and belong to this parent)
  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('id', id)
    .eq('parent_id', session.parentId)
    .eq('mode', 'exam')
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get score record
  const { data: score } = await supabaseAdmin
    .from('scores')
    .select('*')
    .eq('paper_id', id)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (!score) return NextResponse.json({ error: '尚未提交考試' }, { status: 404 })

  // Get all questions with answers
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('paper_id', id)
    .order('question_number', { ascending: true })

  if (!questions) return NextResponse.json({ error: '找不到題目' }, { status: 404 })

  // Build per-question-type time analysis (estimated from total time)
  const totalSeconds = score.time_spent_seconds || 0
  const mcQuestions = questions.filter(q => q.question_type === 'mc')
  const tfQuestions = questions.filter(q => q.question_type === 'tf')
  const fillQuestions = questions.filter(q => q.question_type === 'fill')
  const shortQuestions = questions.filter(q => ['short', 'essay'].includes(q.question_type))

  // Estimate time per type (weighted average based on typical ratios)
  const avgPerQuestion = questions.length > 0 ? Math.round(totalSeconds / questions.length) : 0

  // Build knowledge point performance map
  // For 常識科 static KB: use knowledge_point field from questions (not available directly)
  // We group by question_type as a proxy, and use paper topic/unit
  // For a richer analysis, we use the question's knowledge_point_id if available
  const knowledgePerformance: Record<string, { name: string; correct: number; total: number }> = {}

  for (const q of questions) {
    const kpKey = q.knowledge_point_id || q.question_type
    const kpName = q.knowledge_point_id || `${q.question_type} 題型`
    if (!knowledgePerformance[kpKey]) {
      knowledgePerformance[kpKey] = { name: kpName, correct: 0, total: 0 }
    }
    knowledgePerformance[kpKey].total++
    if (q.is_correct === true) knowledgePerformance[kpKey].correct++
  }

  // Convert to array and compute percentage
  const knowledgeResults = Object.entries(knowledgePerformance).map(([key, v]) => ({
    id: key,
    name: v.name,
    correct: v.correct,
    total: v.total,
    percentage: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage)

  // Build question details
  const questionDetails = questions.map(q => ({
    id: q.id,
    question_number: q.question_number,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    child_answer: q.child_answer,
    is_correct: q.is_correct,
  }))

  return NextResponse.json({
    paper: {
      id: paper.id,
      subject: paper.subject,
      grade: paper.topic,
      timeLimitMinutes: paper.time_limit_minutes,
      generatedAt: paper.generated_at,
    },
    score: {
      id: score.id,
      totalQuestions: score.total_questions,
      correctCount: score.correct_count,
      scorePercentage: score.score_percentage,
      timeSpentSeconds: score.time_spent_seconds,
      completedAt: score.completed_at,
    },
    timeAnalysis: {
      totalSeconds,
      avgPerQuestion,
      mcCount: mcQuestions.length,
      tfCount: tfQuestions.length,
      fillCount: fillQuestions.length,
      shortCount: shortQuestions.length,
    },
    knowledgeResults,
    questions: questionDetails,
  })
}
