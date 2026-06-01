import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { getKnowledgeByIds, KnowledgeChunk } from '@/lib/knowledgeBase'

// POST /api/diagnosis/generate-batch
// Generates questions for a SINGLE BATCH of knowledge points (max 3)
// and appends them to an existing paper.
// This avoids Vercel's 10s function timeout by splitting 15 KPs into 5 batches.
//
// Request body:
//   paperId: string          - existing paper to append questions to
//   subject: string          - '數學科' | '常識科'
//   grade: string            - 'P3'
//   knowledgePointIds: string[] - base codes for THIS BATCH (max 3)
//   batchIndex: number       - 0-based batch index (for question numbering offset)
//   questionsPerPoint: number - questions per knowledge point (default 3)
//
// Response:
//   { success, questionsAdded, nextQuestionNumber }

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    paperId,
    subject,
    grade,
    knowledgePointIds,
    batchIndex = 0,
    questionsPerPoint = 3,
  } = body

  if (!paperId || !subject || !grade || !knowledgePointIds || knowledgePointIds.length === 0) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
  }

  // Verify paper belongs to this parent
  const { data: paper, error: paperError } = await supabaseAdmin
    .from('papers')
    .select('id, parent_id, mode')
    .eq('id', paperId)
    .single()

  if (paperError || !paper) {
    return NextResponse.json({ error: '找不到診斷卷' }, { status: 404 })
  }
  if (paper.parent_id !== session.parentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch knowledge chunks for this batch
  let knowledgeChunks: KnowledgeChunk[] = []

  if (subject === '數學科') {
    const unitPatterns = knowledgePointIds.flatMap((id: string) => [`${id}_L1`, `${id}_L2`])

    const { data: mathChunks, error: mathError } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', '數學科')
      .eq('year', grade)
      .in('unit', unitPatterns)
      .order('unit')

    if (mathError || !mathChunks || mathChunks.length === 0) {
      console.error('[generate-batch] Math knowledge fetch error:', mathError?.message)
      return NextResponse.json({ error: '無法讀取數學科知識點' }, { status: 500 })
    }

    knowledgeChunks = mathChunks.map(row => ({
      id: row.unit,
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
    const allChunks = getKnowledgeByIds(
      knowledgePointIds.flatMap((id: string) => [`${id}_L1`, `${id}_L2`])
    )
    knowledgeChunks = allChunks.length > 0 ? allChunks : getKnowledgeByIds(knowledgePointIds)
  }

  // Calculate question number offset for this batch
  const questionOffset = batchIndex * knowledgePointIds.length * questionsPerPoint
  const totalForBatch = knowledgePointIds.length * questionsPerPoint

  // Generate questions for this batch
  const generated = await generateQuestions({
    knowledgeChunks,
    questionTypes: ['mc', 'tf'],
    totalQuestions: totalForBatch,
    difficulty: 1,
  })

  // Map questions to knowledge points
  const questionsPerPointActual = Math.ceil(totalForBatch / knowledgePointIds.length)
  const inserts = generated.map((q, idx) => {
    const pointIndex = Math.floor(idx / questionsPerPointActual)
    const baseCode = knowledgePointIds[pointIndex] || knowledgePointIds[knowledgePointIds.length - 1]
    return {
      paper_id: paperId,
      question_number: questionOffset + q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      knowledge_point_id: baseCode,
    }
  })

  // Insert questions (with fallback if knowledge_point_id column doesn't exist)
  const { error: insertError } = await supabaseAdmin.from('questions').insert(inserts)
  if (insertError) {
    console.error('[generate-batch] Insert with knowledge_point_id failed:', insertError.message)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const insertsWithoutKp = inserts.map(({ knowledge_point_id: _kp, ...rest }) => rest)
    const { error: retryError } = await supabaseAdmin.from('questions').insert(insertsWithoutKp)
    if (retryError) {
      console.error('[generate-batch] Retry insert failed:', retryError.message)
      return NextResponse.json({ error: `批次 ${batchIndex} 題目插入失敗` }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    questionsAdded: generated.length,
    nextQuestionNumber: questionOffset + generated.length + 1,
    batchIndex,
  })
}
