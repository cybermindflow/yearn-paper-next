import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/diagnosis/[score_id]
// Returns structured diagnosis report: mastery per knowledge point
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ score_id: string }> }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { score_id } = await params

  // Fetch score record
  const { data: score, error: scoreError } = await supabaseAdmin
    .from('scores')
    .select(`
      *,
      papers(id, subject, topic, unit, mode, generated_at, page_count, question_types, delivery_mode)
    `)
    .eq('id', score_id)
    .single()

  if (scoreError || !score) {
    return NextResponse.json({ error: '找不到診斷記錄' }, { status: 404 })
  }

  // Verify ownership via paper
  const paper = score.papers as {
    id: string; subject: string; topic: string; unit: string
    mode: string; generated_at: string; delivery_mode: string
  } | null

  if (!paper) return NextResponse.json({ error: '找不到對應試卷' }, { status: 404 })

  // Verify the paper belongs to this parent
  const { data: paperCheck } = await supabaseAdmin
    .from('papers')
    .select('id')
    .eq('id', paper.id)
    .eq('parent_id', session.parentId)
    .single()

  if (!paperCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all questions for this paper
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('paper_id', paper.id)
    .order('question_number')

  if (questionsError || !questions) {
    return NextResponse.json({ error: '無法讀取題目記錄' }, { status: 500 })
  }

  // Group questions by knowledge_point_id
  const pointMap: Record<string, {
    knowledgePointId: string
    total: number
    correct: number
    questions: typeof questions
  }> = {}

  for (const q of questions) {
    const kpId = (q as { knowledge_point_id?: string }).knowledge_point_id || 'unknown'
    if (!pointMap[kpId]) {
      pointMap[kpId] = { knowledgePointId: kpId, total: 0, correct: 0, questions: [] }
    }
    pointMap[kpId].total++
    if (q.is_correct) pointMap[kpId].correct++
    pointMap[kpId].questions.push(q)
  }

  // Determine mastery level for each knowledge point
  // ≥80% = mastered (green), 50-79% = unstable (yellow), <50% = not mastered (red)
  const knowledgePointResults = Object.values(pointMap).map(kp => {
    const accuracy = kp.total > 0 ? (kp.correct / kp.total) * 100 : 0
    let mastery: 'mastered' | 'unstable' | 'weak'
    let masteryLabel: string
    let masteryEmoji: string
    if (accuracy >= 80) {
      mastery = 'mastered'; masteryLabel = '已掌握'; masteryEmoji = '🟢'
    } else if (accuracy >= 50) {
      mastery = 'unstable'; masteryLabel = '不太穩'; masteryEmoji = '🟡'
    } else {
      mastery = 'weak'; masteryLabel = '未掌握'; masteryEmoji = '🔴'
    }
    return {
      knowledgePointId: kp.knowledgePointId,
      total: kp.total,
      correct: kp.correct,
      accuracy: Math.round(accuracy),
      mastery,
      masteryLabel,
      masteryEmoji,
    }
  })

  // Summary counts
  const masteredCount = knowledgePointResults.filter(r => r.mastery === 'mastered').length
  const unstableCount = knowledgePointResults.filter(r => r.mastery === 'unstable').length
  const weakCount = knowledgePointResults.filter(r => r.mastery === 'weak').length

  // Weak points (for one-click practice generation)
  const weakPointIds = knowledgePointResults
    .filter(r => r.mastery === 'weak' || r.mastery === 'unstable')
    .map(r => r.knowledgePointId)

  return NextResponse.json({
    score: {
      id: score.id,
      totalQuestions: score.total_questions,
      correctCount: score.correct_count,
      scorePercentage: score.score_percentage,
      completedAt: score.completed_at,
    },
    paper: {
      id: paper.id,
      subject: paper.subject,
      unit: paper.unit,
      generatedAt: paper.generated_at,
      deliveryMode: paper.delivery_mode,
    },
    summary: {
      masteredCount,
      unstableCount,
      weakCount,
      totalPoints: knowledgePointResults.length,
      masteredPercentage: knowledgePointResults.length > 0
        ? Math.round((masteredCount / knowledgePointResults.length) * 100)
        : 0,
    },
    knowledgePointResults,
    weakPointIds,
  })
}
