import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { getKnowledgeByIds, KnowledgeChunk } from '@/lib/knowledgeBase'
import { checkUsageLimit } from '@/lib/usageLimits'

// POST /api/diagnosis/generate
// Creates a diagnosis paper and generates questions for selected knowledge points
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
    knowledgePointIds,  // array of unit codes like ['M3_01', 'M3_02'] (without L suffix)
    deliveryMode = 'online',
    childId,
  } = body

  if (!subject || !grade || !knowledgePointIds || knowledgePointIds.length === 0) {
    return NextResponse.json({ error: '缺少必要參數：subject, grade, knowledgePointIds' }, { status: 400 })
  }

  // Step 1: Fetch knowledge chunks for selected knowledge points
  // knowledgePointIds are base codes (e.g. 'M3_01'), we need L1+L2 for each
  let knowledgeChunks: KnowledgeChunk[] = []

  if (subject === '數學科') {
    // Fetch from Supabase: get L1 and L2 for each selected knowledge point
    // unit field contains codes like 'M3_01_L1', 'M3_01_L2'
    const unitPatterns = knowledgePointIds.flatMap((id: string) => [`${id}_L1`, `${id}_L2`])

    const { data: mathChunks, error: mathError } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', '數學科')
      .eq('year', grade)
      .in('unit', unitPatterns)
      .order('unit')

    if (mathError) {
      console.error('[diagnosis/generate] Math knowledge fetch error:', mathError.message)
      return NextResponse.json({ error: '無法讀取數學科知識點' }, { status: 500 })
    }

    if (!mathChunks || mathChunks.length === 0) {
      return NextResponse.json({ error: '找不到指定的數學科知識點' }, { status: 400 })
    }

    knowledgeChunks = mathChunks.map(row => ({
      id: row.unit, // use unit code as id for diagnosis tracking
      subject: row.subject,
      year: row.year,
      topic: row.topic || '數',
      unit: row.unit,
      knowledge_point: row.knowledge_point,
      learning_objective: row.learning_objective,
      level: row.level,
      applicable_question_types: row.applicable_question_types || ['mc', 'tf'],
      source: row.source || '香港教育局《小學數學科課程指引》',
    }))
  } else {
    // 常識科: use static knowledge base, get L1+L2 for each selected point
    const allChunks = getKnowledgeByIds(
      knowledgePointIds.flatMap((id: string) => [`${id}_L1`, `${id}_L2`])
    )
    knowledgeChunks = allChunks.length > 0 ? allChunks : getKnowledgeByIds(knowledgePointIds)
  }

  // Step 2: Calculate total questions (3 per knowledge point base code)
  const totalQuestions = knowledgePointIds.length * 3

  // Step 3: Create paper record with mode='diagnosis', source='diagnosis'
  const { data: paper, error: paperError } = await supabaseAdmin
    .from('papers')
    .insert({
      parent_id: session.parentId,
      child_id: childId || null,
      subject,
      topic: subject === '數學科' ? '診斷測驗' : '診斷測驗',
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
    console.error('[diagnosis/generate] Paper insert error:', paperError?.message)
    return NextResponse.json({ error: '建立診斷卷失敗' }, { status: 500 })
  }

  // Step 4: Generate questions (mc + tf, mixed L1/L2, 3 per knowledge point)
  const generated = await generateQuestions({
    knowledgeChunks,
    questionTypes: ['mc', 'tf'],
    totalQuestions,
    difficulty: 1, // mixed L1/L2 handled by prompt
  })

  // Step 5: Insert questions with knowledge_point_id tracking
  // Map each question back to its knowledge point base code
  const questionsPerPoint = Math.ceil(totalQuestions / knowledgePointIds.length)
  const inserts = generated.map((q, idx) => {
    const pointIndex = Math.floor(idx / questionsPerPoint)
    const baseCode = knowledgePointIds[pointIndex] || knowledgePointIds[knowledgePointIds.length - 1]
    return {
      paper_id: paper.id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      knowledge_point_id: baseCode,
    }
  })

  const { error: insertError } = await supabaseAdmin.from('questions').insert(inserts)
  if (insertError) {
    // If knowledge_point_id column doesn't exist yet, retry without it
    console.error('[diagnosis/generate] Insert with knowledge_point_id failed:', insertError.message)
    const insertsWithoutKp = inserts.map(({ knowledge_point_id: _kp, ...rest }) => rest)
    const { error: retryError } = await supabaseAdmin.from('questions').insert(insertsWithoutKp)
    if (retryError) {
      return NextResponse.json({ error: '題目生成失敗' }, { status: 500 })
    }
  }

  // Step 6: Update paper status to 'generated'
  await supabaseAdmin
    .from('papers')
    .update({ status: 'generated' })
    .eq('id', paper.id)

  return NextResponse.json({
    success: true,
    paperId: paper.id,
    totalQuestions: generated.length,
    knowledgePointCount: knowledgePointIds.length,
  })
}
